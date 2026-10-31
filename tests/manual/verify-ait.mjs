import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AppsInTossBundle } from '@apps-in-toss/ait-format';
import { verifyBuild } from '../../scripts/verify-build.mjs';

async function fixture(t, appName = 'merry-village') {
  const root = await mkdtemp(join(tmpdir(), 'merry-village-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'dist', 'assets'), { recursive: true });
  await writeFile(join(root, 'apps-in-toss.config.ts'),
    'export default { appName: "merry-village", webBundleDir: "dist" };');
  const files = {
    'index.html': '<!doctype html><link rel="stylesheet" href="./assets/main.css"><h1>메리빌리지</h1><script type="module" src="./assets/main.js"></script>',
    'assets/main.js': 'console.log("Merry Village");',
    'assets/main.css': 'body { margin: 0; }',
    'build-info.json': JSON.stringify({ appName: 'merry-village', commit: 'current' }),
  };
  const writer = AppsInTossBundle.writer({ appName });
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(root, 'dist', name), contents);
    writer.addFile(`sources/${name}`, Buffer.from(contents));
  }
  writer.addFile('bundle.json', Buffer.from(JSON.stringify({
    config: { appName }, sdk: { name: '@apps-in-toss/web-framework' },
  })));
  await writeFile(join(root, 'merry-village.ait'), await writer.toBuffer());
  return root;
}

test('accepts a readable official AIT containing the current web build', async (t) => {
  assert.ok((await verifyBuild(await fixture(t), 'current')).aitBytes > 0);
});
test('rejects a missing AIT instead of accepting only a web build', async (t) => {
  const root = await fixture(t);
  await rm(join(root, 'merry-village.ait'));
  await assert.rejects(verifyBuild(root, 'current'), { code: 'ENOENT' });
});
test('rejects an empty AIT', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'merry-village.ait'), '');
  await assert.rejects(verifyBuild(root, 'current'), /Empty AIT/);
});
test('rejects a different appName inside an otherwise valid AIT', async (t) => {
  await assert.rejects(verifyBuild(await fixture(t, 'another-app'), 'current'), /AIT header appName mismatch/);
});
test('rejects a stale commit and modified web output', async (t) => {
  const root = await fixture(t);
  await assert.rejects(verifyBuild(root, 'next-commit'), /Stale web build/);
  const html = await readFile(join(root, 'dist', 'index.html'), 'utf8');
  await writeFile(join(root, 'dist', 'index.html'), html + '<p>changed</p>');
  await assert.rejects(verifyBuild(root, 'current'), /AIT content mismatch/);
});
