import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AppsInTossBundle } from '@apps-in-toss/ait-format';
import { APP_NAME, verifyWebBuild } from './verify-web.mjs';

// Used only by the explicitly requested final AIT release workflow.
export async function verifyBuild(root, expectedCommit) {
  const info = await verifyWebBuild(root, expectedCommit);
  const dist = join(root, 'dist');
  const artifactPath = join(root, `${APP_NAME}.ait`);
  const artifact = await readFile(artifactPath);
  assert.ok(artifact.length > 0, 'Empty AIT file');
  assert.equal(AppsInTossBundle.detect(artifact), AppsInTossBundle.Format.AIT, 'Invalid AIT format');
  const reader = AppsInTossBundle.reader(artifact);
  assert.equal(reader.appName, APP_NAME, 'AIT header appName mismatch');
  const bundle = JSON.parse(Buffer.from(await reader.readEntry('bundle.json')).toString('utf8'));
  assert.equal(bundle.config.appName, APP_NAME, 'AIT config appName mismatch');
  assert.equal(bundle.sdk.name, '@apps-in-toss/web-framework', 'Unexpected SDK');

  // Ensure the package contains exactly the web build just generated, byte for byte.
  const files = await readdir(dist, { recursive: true, withFileTypes: true });
  const names = [];
  for (const file of files.filter((file) => file.isFile())) {
    const absolute = join(file.parentPath, file.name);
    const relative = absolute.slice(dist.length + 1).replaceAll('\\', '/');
    const packed = Buffer.from(await reader.readEntry(`sources/${relative}`));
    assert.deepEqual(packed, await readFile(absolute), `AIT content mismatch: ${relative}`);
    names.push(`sources/${relative}`);
  }
  assert.deepEqual(reader.listEntries().filter((name) => name.startsWith('sources/')).sort(), names.sort());
  return { ...info, aitBytes: artifact.length, deploymentId: reader.deploymentId, webFiles: names.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(process.env.GITHUB_SHA ?? commit, commit, 'Checkout commit mismatch');
  console.log(JSON.stringify(await verifyBuild(process.cwd(), commit), null, 2));
}
