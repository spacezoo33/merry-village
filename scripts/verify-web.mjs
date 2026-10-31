import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const APP_NAME = 'merry-village';
export const forbiddenWebFile = (name) => /(^|\/)\.env(?:\.|$)|\.(?:ait|pem|key|p12|pfx)$/i.test(name);

export async function verifyWebBuild(root, expectedCommit) {
  const { default: config } = await import(pathToFileURL(join(root, 'apps-in-toss.config.ts')).href);
  assert.equal(config.appName, APP_NAME, 'Config appName mismatch');
  assert.equal(config.webBundleDir, 'dist', 'Unexpected web bundle directory');
  const dist = resolve(root, 'dist');
  const info = JSON.parse(await readFile(join(dist, 'build-info.json'), 'utf8'));
  assert.equal(info.appName, APP_NAME, 'Web appName mismatch');
  assert.equal(info.commit, expectedCommit, 'Stale web build: commit mismatch');
  const safeKeys = new Set(['appName', 'commit', 'runId', 'runNumber', 'runAttempt']);
  assert.ok(Object.keys(info).every(key => safeKeys.has(key)), 'Unexpected public build metadata');
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  assert.ok(html.trim().length > 0, 'Missing/empty web entry');
  assert.match(html, /<script\b[^>]*\bsrc\s*=\s*["'][^"']+\.js(?:[?#][^"']*)?["']/i, 'Missing JavaScript entry');
  assert.match(html, /<link\b[^>]*\bhref\s*=\s*["'][^"']+\.css(?:[?#][^"']*)?["']/i, 'Missing stylesheet');

  async function checkReference(url, from) {
    if (url.startsWith('data:') || url.startsWith('#')) return;
    assert.ok(!/^(?:[a-z]+:|\/)/i.test(url), `Web assets must use packaged relative URLs: ${url}`);
    const target = resolve(dirname(from), decodeURIComponent(url.split(/[?#]/)[0]));
    assert.ok(!relative(dist, target).startsWith('..'), 'Asset escapes web bundle');
    assert.ok((await stat(target)).isFile() && (await stat(target)).size > 0, `Missing/empty web asset: ${url}`);
  }
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    await checkReference(match[1], join(dist, 'index.html'));
  }
  let webBytes = 0, webFiles = 0;
  for (const file of await readdir(dist, { recursive: true, withFileTypes: true })) {
    assert.ok(!file.isSymbolicLink(), 'Symlinks are not valid web artifacts');
    if (!file.isFile()) continue;
    const absolute = join(file.parentPath, file.name);
    const name = relative(dist, absolute).replaceAll('\\', '/');
    assert.ok(!forbiddenWebFile(name), `Forbidden public artifact: ${name}`);
    webBytes += (await stat(absolute)).size;
    webFiles++;
    if (name.endsWith('.css')) {
      for (const match of (await readFile(absolute, 'utf8')).matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
        await checkReference(match[1], absolute);
      }
    }
  }
  return { ...info, webFiles, webBytes };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(process.env.GITHUB_SHA ?? commit, commit, 'Checkout commit mismatch');
  console.log(JSON.stringify(await verifyWebBuild(process.cwd(), commit), null, 2));
}
