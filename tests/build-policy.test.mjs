import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const root = new URL('../', import.meta.url);

test('default development build and tests cannot generate AIT fixtures or run release commands', async () => {
  const { scripts } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.equal(scripts.test, 'node --test tests/*.test.mjs');
  assert.equal(scripts.build, 'npm run typecheck && npm test && npm run build:web && npm run verify:web');
  assert.equal(scripts['verify:build'], 'npm run verify:web');
  for (const command of [scripts.build, scripts['build:web'], scripts['verify:web']]) assert.doesNotMatch(command, /\bait\b/i);
});
test('automatic workflow is web-only; release workflow has only a guarded manual trigger', async () => {
  const web = await readFile(new URL('.github/workflows/build.yml', root), 'utf8');
  assert.doesNotMatch(web, /build:ait|release:ait|verify:ait|test:ait|ait build|\.ait\b/);
  assert.match(web, /npm run build/);
  assert.match(web, /path: dist\//);
  const release = await readFile(new URL('.github/workflows/build-ait.yml', root), 'utf8');
  const triggers = release.slice(release.indexOf('\non:'), release.indexOf('\npermissions:'));
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /\b(push|pull_request|schedule|workflow_run|workflow_call):/);
  assert.match(release, /if: inputs\.confirm_release == true/);
  assert.match(release, /default: false/);
});
test('Pages publishing is opt-in and excludes pull requests', async () => {
  const web = await readFile(new URL('.github/workflows/build.yml', root), 'utf8');
  const guards = [...web.matchAll(/^\s+if: (.+)$/gm)].map(match => match[1]);
  assert.equal(guards.length, 2);
  for (const guard of guards) {
    assert.ok(guard.includes("vars.ENABLE_PAGES == 'true'"));
    assert.ok(guard.includes("github.ref == 'refs/heads/feat/elliptical-train-ride'"));
    assert.ok(guard.includes("github.event_name != 'pull_request'"));
  }
});
