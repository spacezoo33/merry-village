// Run against the local Vite server; no ad rewards are simulated.
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.VALIDATION_URL ?? 'http://127.0.0.1:5177';
const output = process.env.VALIDATION_DIR ?? '/tmp/merry-mobile';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [], errors = [];
try {
  for (const [width, height] of [[320, 640], [375, 812], [430, 932], [430, 640]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.buffer?.duration > 20) window.currentMusicSource = this;
        return start.apply(this, args);
      };
    });
    await page.goto(base);
    await page.locator('#scene-host .actor-stage[data-ready="true"]').waitFor();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('#scene-host').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('.scene-controls button, .bottom-nav button, .now-playing button')];
      if (document.documentElement.scrollWidth > innerWidth) throw Error('horizontal page scroll');
      if (stage.x < -.1 || stage.right > innerWidth + .1 || stage.bottom > innerHeight) throw Error('village clipped');
      if (buttons.some(b => { const r = b.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; })) throw Error('touch target below 44px');
      return { stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height }, pageHeight: document.documentElement.scrollHeight };
    });
    await page.screenshot({ path: `${output}/${width}-${height}-main.png` });
    const first = await page.locator('#song-name').textContent();
    await page.locator('[data-action="previous"]').click();
    if (await page.locator('#song-name').textContent() !== '오 베들레헴 작은 골') throw Error('previous wrap');
    await page.locator('[data-action="next"]').click();
    if (await page.locator('#song-name').textContent() !== first) throw Error('next wrap');
    if (!await page.evaluate(() => window.currentMusicSource?.loop)) throw Error('selected song is not looping');
    for (const id of ['palace', 'gingerbread', 'aurora-lake', 'observatory']) {
      await page.locator('.bottom-nav [data-action="villages"]').click();
      const cards = page.locator('.village-card');
      if (await cards.count() !== 7) throw Error('wrong catalog');
      const grid = await page.locator('.village-grid').evaluate(g => getComputedStyle(g).gridTemplateColumns);
      if (grid.split(' ').length !== 1) throw Error('mobile cards are not single column');
      if (id === 'palace') await page.screenshot({ path: `${output}/${width}-${height}-cards.png` });
      await page.locator(`.village-card[data-village="${id}"]`).click();
      await page.locator('#scene-host .actor-stage[data-ready="true"]').waitFor();
      if (await page.locator('#app').getAttribute('data-preview') !== 'true') throw Error('locked selection was granted');
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('merry-village:v2')));
      if (state.village !== 'cozy' || Object.keys(state.villagePasses).length) throw Error('preview wrote entitlement');
      if (await page.locator('#song-name').textContent() !== first) throw Error('village changed song');
      await page.screenshot({ path: `${output}/${width}-${height}-${id}.png` });
      await page.locator('#preview-unlock').click();
      if (!await page.locator('[data-action="reward"]').isDisabled()) throw Error('web preview can play rewarded ad');
      await page.locator('[data-action="close"]').click();
    }
    // Three night previews still work and keep village receipts empty.
    await page.locator('[data-action="nights"]').click();
    if (await page.locator('.night-theme-card').count() !== 3) throw Error('night effects changed');
    await page.locator('[data-effect="aurora"]').click();
    if (await page.locator('#app').getAttribute('data-effect') !== 'none') throw Error('unearned night applied');
    await page.locator('[data-action="close"]').click();
    await page.locator('.bottom-nav [data-action="villages"]').click();
    await page.locator('.village-card[data-village="cozy"]').click();
    await page.locator('#snow-toggle').click();
    if (!await page.locator('#app').evaluate(a => a.classList.contains('snow-off'))) throw Error('snow OFF');
    await page.locator('#snow-toggle').click();
    const count = await page.locator('.hero .snowfall i').count();
    if (count !== 139) throw Error(`snow count ${count}`);
    results.push({ width, height, ...layout, snowParticles: count, songLoop: true, fourLockedPreviews: true });
    await page.close();
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }
