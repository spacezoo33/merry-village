// Optional integration check; requires a running Vite server and externally installed Playwright.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/check-browser.mjs
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = process.env.VALIDATION_DIR ?? '/tmp/merry-validation';
const base = process.env.VALIDATION_URL ?? 'http://127.0.0.1:5174';
await mkdir(root, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 500 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/__validation', route => route.fulfill({
    contentType: 'text/html',
    body: '<link rel="stylesheet" href="/src/style.css"><body style="margin:0;background:#28190b"><button id="run">Audio test</button><div id="app" class="night" data-effect="none"><div id="fixture" style="width:430px"></div></div>',
  }));
  await page.goto(`${base}/__validation`);
  if (process.env.VALIDATION_SCOPE !== "app") await page.evaluate(async () => {
    const audio = await import('/tests/browser/audio-output.ts');
    window.offline = await audio.measureOfflineAudio();
    document.querySelector('#run').onclick = () => { window.live = audio.measureLiveAudio(); };
  });
  if (process.env.VALIDATION_SCOPE !== 'app') await page.click('#run');
  const audio = process.env.VALIDATION_SCOPE === "app" ? null : await page.evaluate(async () => ({ offline: window.offline, live: await window.live }));
  console.log('audio', JSON.stringify(audio));
  await page.evaluate(() => document.querySelector('#run').remove());
  const villages = [];
  for (const id of process.env.VALIDATION_SCOPE === 'app' ? [] : ['cozy', 'forest', 'chapel', 'workshop', 'palace', 'gingerbread']) {
    await page.evaluate(async id => {
      const { Actors } = await import('/src/actors.ts');
      const { scene } = await import('/src/scene.ts');
      document.querySelector('#fixture').innerHTML = scene(id, false);
      window.crossings = [];
      window.actor = new Actors(document.querySelector('.actor-stage'), id,
        (journey, x, visible) => window.crossings.push({ journey, x, visible }));
      await window.actor.ready;
      window.actor.update({ motion: false, hidden: true, gold: false, pattern: 'all' });
      cancelAnimationFrame(window.actor.raf);
    }, id);
    // Allow the ResizeObserver to size the renderer before deterministic snapshots.
    await page.waitForTimeout(60);
    const responsive = [];
    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 520 });
      await page.evaluate(width => { document.querySelector('#fixture').style.width = `${width}px`; }, width);
      await page.waitForTimeout(80);
      const alignment = await page.evaluate(async () => {
        const { architecturalBulbs } = await import('/src/decor-lights.ts');
        const { RAIL_PROFILES } = await import('/src/rail-profiles.ts');
        const { Matrix4, Vector3 } = await import('/node_modules/three/build/three.module.js');
        const a = window.actor, profile = RAIL_PROFILES[a.village];
        const stage = document.querySelector('.product-stage').getBoundingClientRect();
        const bulbs = [...document.querySelectorAll('.decor-bulb')];
        const points = architecturalBulbs(a.village);
        let error = 0;
        bulbs.forEach((b, i) => {
          const r = b.querySelector('.bulb-flare').getBoundingClientRect();
          error = Math.max(error, Math.abs((r.x + r.width / 2 - stage.x) - points[i].x / 512 * stage.width),
            Math.abs((r.y + r.height / 2 - stage.y) - points[i].y / profile.height * stage.height));
        });
        const star = a.tree.children.find(o => o.material === a.bulbs[0].material);
        for (const elapsed of [0, 9, 19, 31]) {
          a.elapsed = elapsed; a.draw(); a.tree.updateMatrixWorld(true);
          const centre = star.localToWorld(new Vector3(0, 0, .0125));
          const glow = a.starGlow.getWorldPosition(new Vector3());
          if (centre.distanceTo(glow) > 1e-9) throw Error('rotating star glare offset');
          for (let i = 0; i < 75; i++) {
            const matrix = new Matrix4(); a.diodeBodies.getMatrixAt(i, matrix);
            const body = new Vector3().setFromMatrixPosition(matrix).applyMatrix4(a.tree.matrixWorld);
            const glow = new Vector3().fromArray(a.ledPositions, i * 3).applyMatrix4(a.tree.matrixWorld);
            if (body.distanceTo(glow) > 1e-7) throw Error('rotating LED glare offset');
          }
        }
        if (error > .1 || bulbs.length !== points.length) throw Error(`lamp alignment ${error}`);
        return { lamps: bulbs.length, maxPixelError: error };
      });
      for (const [state, time] of [['off', 1.5], ['on', .5]]) {
        await page.evaluate(time => { window.actor.lightTime = time; window.actor.draw(); }, time);
        await page.screenshot({ path: `${root}/${id}-${width}-${state}.png` });
      }
      responsive.push({ width, ...alignment });
    }
    const states = [];
    for (const [name, time] of [['off', 1.5], ['on', .5]]) {
      const result = await page.evaluate(async ({ time }) => {
        const a = window.actor;
        a.lightTime = time; a.elapsed = 2; a.draw();
        const bulbs = [...document.querySelectorAll('.decor-bulb')];
        if (!bulbs.length || bulbs.some(b => !b.classList.contains('lamp'))) throw Error('non-lamp / tunnel light');
        const base = bulbs.map(b => getComputedStyle(b.querySelector('.bulb-emitter')).opacity);
        const extras = bulbs.map(b => Number(b.querySelector('.bulb-flare').style.opacity));
        if (base.some(v => v !== '1')) throw Error('base lamp became dark');
        if (a.bulbs[0].material.emissiveIntensity < .6) throw Error('star lost base gold');
        if (a.diodeBodies.material.emissiveIntensity < .5) throw Error('LED lost warm base');
        const { captureVillage } = await import('/src/photo.ts');
        const photo = await captureVillage(a.village, true, false, null, a.snapshot(), 'all', time);
        const bitmap = await createImageBitmap(photo), canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const c = canvas.getContext('2d'); c.drawImage(bitmap, 0, 0);
        const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
        let energy = 0; for (let i = 0; i < pixels.length; i += 4) energy += pixels[i] + pixels[i + 1] + pixels[i + 2];
        const bytes = new Uint8Array(await photo.arrayBuffer());
        return { base, extras, starEmission: a.bulbs[0].material.emissiveIntensity, energy, photo: Array.from(bytes) };
      }, { time });
      await writeFile(`${root}/${id}-${name}-photo.png`, Buffer.from(result.photo));
      delete result.photo;
      await page.screenshot({ path: `${root}/${id}-${name}.png` });
      states.push({ name, ...result });
    }
    if (!states[0].extras.every(v => v === 0) || !states[1].extras.every(v => v === 1)) throw Error('glare OFF/ON mismatch');
    if (!(states[1].energy > states[0].energy)) throw Error('photo has no additional ON light');
    // Exercise actual renderer callbacks with each village's real camera, including offset.
    const projection = await page.evaluate(async () => {
      const a = window.actor;
      const { projectRail } = await import('/src/rail-profiles.ts');
      a.settings.motion = true; a.settings.hidden = false;
      let visibleCrossings = 0, last = null, maxError = 0;
      for (let frame = 0; frame <= 13 * 3 * 30; frame++) {
        a.elapsed = frame / 30;
        // Avoid repeatedly drawing the expensive scene: intercept only the renderer render call.
        const render = a.renderer.render; a.renderer.render = () => {};
        a.draw(); a.renderer.render = render;
        const p = window.crossings.at(-1);
        const angle = .85 + Math.max(0, p.journey - .65) / 13 * 2 * Math.PI;
        maxError = Math.max(maxError, Math.abs(p.x - projectRail(a.village, angle).x / 512));
        if (last && last.visible && p.visible && last.x > .5 && p.x <= .5) visibleCrossings++;
        last = p;
      }
      a.destroy();
      if (visibleCrossings !== 3 || maxError > 1e-8) throw Error(`camera crossing mismatch ${visibleCrossings}/${maxError}`);
      return { visibleCrossings, maxError };
    });
    villages.push({ id, states, projection, responsive });
    console.log('village', id, JSON.stringify(projection));
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  const appPage = await browser.newPage({ viewport: { width: 320, height: 850 } });
  appPage.on('pageerror', e => errors.push(e.message));
  await appPage.goto(base);
  await appPage.locator('.actor-stage[data-ready="true"]').waitFor();
  await appPage.locator('body').click({ position: { x: 8, y: 8 } });
  const mainApp = await appPage.evaluate(async () => {
    const { measureAppAudio } = await import('/tests/browser/audio-output.ts');
    return measureAppAudio();
  });
  const beforeSwitch = Number(await appPage.locator('#scene-host .actor-stage').getAttribute('data-elapsed'));
  await appPage.locator('[data-action="villages"]').click();
  await appPage.locator('[data-village="forest"]').click();
  await appPage.locator('.actor-stage[data-ready="true"]').waitFor();
  const afterSwitch = Number(await appPage.locator('#scene-host .actor-stage').getAttribute('data-elapsed'));
  if (afterSwitch < beforeSwitch) throw Error('village switch reset journey');
  if (await appPage.locator('#sheet').evaluate(d => d.open)) await appPage.locator('[data-action="close"]').click();
  await appPage.locator('#motion-toggle').click();
  await appPage.waitForTimeout(100);
  const stopped = await appPage.locator('#scene-host .actor-stage').getAttribute('data-elapsed');
  await appPage.waitForTimeout(300);
  if (await appPage.locator('#scene-host .actor-stage').getAttribute('data-elapsed') !== stopped) throw Error('OFF advanced journey');
  await appPage.locator('#motion-toggle').click();
  await appPage.waitForTimeout(200);
  if (Number(await appPage.locator('#scene-host .actor-stage').getAttribute('data-elapsed')) < Number(stopped)) throw Error('resume reset journey');
  await appPage.locator('#snow-toggle').click();
  if (!await appPage.locator('#app').evaluate(a => a.classList.contains('snow-off'))) throw Error('snow OFF failed');
  await appPage.locator('#snow-toggle').click();
  if (await appPage.locator('#app').evaluate(a => a.classList.contains('snow-off'))) throw Error('snow ON failed');
  if (await appPage.locator('.hero .decor-bulb').count() !== 6) throw Error('old village lights remained');
  mainApp.switchProgress = { beforeSwitch, afterSwitch, stopped };
  if (errors.length) throw Error(JSON.stringify(errors));
  const results = { audio, mainApp, villages, errors };
  await writeFile(`${root}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: requested browser checks; ${root}/results.json`);
} finally { await browser.close(); }
