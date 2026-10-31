import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { forbiddenWebFile, verifyWebBuild } from '../scripts/verify-web.mjs';

async function fixture(t, appName = 'merry-village') {
  const root = await mkdtemp(join(tmpdir(), 'merry-web-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'dist', 'assets'), { recursive: true });
  await writeFile(join(root, 'apps-in-toss.config.ts'), `export default { appName: '${appName}', webBundleDir: 'dist' };`);
  const files = {
    'index.html': '<!doctype html><link rel="stylesheet" href="./assets/app.css"><script type="module" src="./assets/app.js"></script>',
    'build-info.json': JSON.stringify({ appName: 'merry-village', commit: 'current' }),
    'assets/app.js': 'console.log("Merry Village");',
    'assets/app.css': 'body { margin: 0; }',
  };
  for (const [name, data] of Object.entries(files)) await writeFile(join(root, 'dist', name), data);
  return root;
}

test('validates a complete web build without needing any release package', async t => {
  const result = await verifyWebBuild(await fixture(t), 'current');
  assert.equal(result.webFiles, 4);
  assert.ok(result.webBytes > 0);
});
test('rejects a stale source commit or incorrect console identifier', async t => {
  await assert.rejects(verifyWebBuild(await fixture(t), 'next'), /commit mismatch/);
  await assert.rejects(verifyWebBuild(await fixture(t, 'other-app'), 'current'), /Config appName mismatch/);
});
test('rejects missing JavaScript and empty HTML', async t => {
  const root = await fixture(t);
  await rm(join(root, 'dist', 'assets', 'app.js'));
  await assert.rejects(verifyWebBuild(root, 'current'), { code: 'ENOENT' });
  await writeFile(join(root, 'dist', 'index.html'), '');
  await assert.rejects(verifyWebBuild(root, 'current'), /empty web entry/);
});
test('rejects a missing locally packaged CSS image', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'dist', 'assets', 'app.css'), 'body { background:url(./missing.png); }');
  await assert.rejects(verifyWebBuild(root, 'current'), { code: 'ENOENT' });
});
test('rejects external or root-relative references that break the fixed Pages subpath', async t => {
  const root = await fixture(t);
  for (const ref of ['https://example.com/style.css', '/assets/style.css']) {
    await writeFile(join(root, 'dist', 'index.html'), `<link href="${ref}"><script src="./assets/app.js"></script>`);
    await assert.rejects(verifyWebBuild(root, 'current'), /packaged relative URLs/);
  }
});
test('rejects accidental public environment files or unexpected metadata', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'dist', '.env.example'), 'EXAMPLE=non-secret');
  await assert.rejects(verifyWebBuild(root, 'current'), /Forbidden public artifact/);
  await rm(join(root, 'dist', '.env.example'));
  await writeFile(join(root, 'dist', 'build-info.json'), JSON.stringify({ appName: 'merry-village', commit: 'current', environment: {} }));
  await assert.rejects(verifyWebBuild(root, 'current'), /Unexpected public build metadata/);
});
test('public artifacts exclude release packages and credential file formats', () => {
  for (const name of ['merry-village.ait', '.env.production', 'keys/client.pem', 'client.key', 'client.p12']) assert.equal(forbiddenWebFile(name), true);
  assert.equal(forbiddenWebFile('assets/christmas-room.png'), false);
});
