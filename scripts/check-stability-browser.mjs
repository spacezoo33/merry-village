import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
// Optional real Chromium regression. Supply an externally installed playwright-core
// module path and run the repository's Vite dev server; no application test hooks.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
);
const output = process.env.BROWSER_OUTPUT ?? "/tmp/merry-stability";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(15000);
const errors = [],
  report = { tracks: [], villages: [], patterns: [], errors };
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const click = (selector) => page.locator(selector).click();
const close = () => click("#sheet [data-action=close]");
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("merry-village:v2")));
const audio = () =>
  page.evaluate(async () =>
    (await import("/src/audio-engine.ts")).audioDiagnostics(),
  );
try {
  await page.goto(process.env.PREVIEW_URL ?? "http://127.0.0.1:5173/");
  await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
  assert.equal(await page.locator("#graphics-status").textContent(), "");
  assert.equal(await page.locator(".bottom-nav button").count(), 4);
  assert.equal(await page.locator("#preview-ribbon").count(), 0);
  assert.equal(
    await page.locator("#lights-toggle").getAttribute("aria-label"),
    "조명",
  );
  assert.equal(await page.locator("#lights-label").textContent(), "조명");
  await click("#motion-toggle"); // isolate actual music output
  await click(".bottom-nav [data-action=music]");
  assert.equal(await page.locator("[data-track]:disabled").count(), 0);
  for (const id of ["snow", "starlight", "waltz", "lullaby", "letter"]) {
    await click(`[data-track=${id}]`);
    let peakRms = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(200);
      const metrics = await audio();
      assert.equal(metrics.state, "running");
      assert.equal(metrics.stems.bells, undefined);
      peakRms = Math.max(peakRms, metrics.stems.music.rms);
      assert.ok(metrics.stems.train.rms < 0.0001);
      assert.ok(metrics.mix.peak < 0.99);
    }
    assert.ok(peakRms > 0.003, `${id} must actually output music`);
    report.tracks.push({ id, peakRms });
  }
  console.log("PASS live audio output for five tracks");
  await close();
  await click("[data-action=previous]");
  assert.equal((await saved()).track, "lullaby");
  await click("[data-action=next]");
  assert.equal((await saved()).track, "letter");
  await click(".now-playing [data-action=play]");
  await page.waitForTimeout(150);
  assert.ok((await audio()).stems.music.rms < 0.0001);
  await click(".now-playing [data-action=play]");
  const seekEnd = async () =>
    page.locator("#progress").evaluate((el) => {
      el.value = String(Number(el.max) - 0.1);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await seekEnd();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("merry-village:v2")).track === "snow",
  );
  await click(".bottom-nav [data-action=music]");
  await click("[data-action=repeat]");
  await close();
  await seekEnd();
  await page.waitForTimeout(700);
  assert.equal((await saved()).track, "snow");
  assert.equal((await saved()).repeat, true);
  await click(".now-playing [data-action=play]");
  // Main snow is paused and hidden for every menu; thumbnail scenes contain none.
  await click(".bottom-nav [data-action=villages]");
  assert.equal(await page.locator("#sheet .snowfall").count(), 0);
  assert.equal(
    await page
      .locator(".hero .snowfall")
      .first()
      .evaluate((el) => getComputedStyle(el).visibility),
    "hidden",
  );
  const snow = (await saved()).snow;
  await close();
  assert.equal((await saved()).snow, snow);
  assert.equal(
    await page
      .locator(".hero .snowfall")
      .first()
      .evaluate((el) => getComputedStyle(el).visibility),
    "visible",
  );
  for (const expected of ["off", "all", "alternate", "random", "gentle"]) {
    await click("#lights-toggle");
    assert.equal(
      await page.locator("#lights-toggle").getAttribute("data-pattern"),
      expected,
    );
    assert.equal(await page.locator("#lights-label").textContent(), "조명");
    assert.equal(await page.locator("#sheet").evaluate((el) => el.open), false);
    report.patterns.push(expected);
  }
  console.log("PASS player controls, repeat, snow isolation and light cycle");
  for (const id of [
    "cozy",
    "forest",
    "chapel",
    "workshop",
    "palace",
    "gingerbread",
  ]) {
    await click(".bottom-nav [data-action=villages]");
    await click(`button[data-village=${id}]`);
    await page.waitForFunction(
      (id) => document.querySelector("#app").dataset.village === id,
      id,
    );
    await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
    assert.equal(
      await page.locator("#lights-toggle").getAttribute("data-pattern"),
      "gentle",
    );
    assert.ok(
      (await page.locator("#scene-host .decor-bulb.window").count()) >= 10,
    );
    assert.ok(
      (await page.locator("#scene-host .decor-bulb.lamp").count()) >= 4,
    );
    console.log("Checking village", id);
    await page.screenshot({ path: `${output}/${id}-mobile.png` });
    report.villages.push(id);
  }
  console.log("PASS six village renders");
  await click(".bottom-nav [data-action=nights]");
  assert.equal(await page.locator(".night-card").count(), 3);
  await close();
  for (const effect of ["aurora", "shooting", "wishes"]) {
    await click(".bottom-nav [data-action=nights]");
    await click(`button[data-effect=${effect}]`);
    assert.equal(
      await page.locator("#app").getAttribute("data-effect"),
      effect,
    );
  }
  await click(".bottom-nav [data-action=nights]");
  await click("button[data-effect=none]");
  assert.equal(await page.locator("#app").getAttribute("data-effect"), "none");
  // Return to free content for a real PNG download (no fabricated ad entitlement).
  await click(".bottom-nav [data-action=villages]");
  await click("button[data-village=cozy]");
  await click(".bottom-nav [data-action=photo]");
  await page.waitForSelector("[data-action=save-photo]:not([disabled])");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    click("[data-action=save-photo]"),
  ]);
  await download.saveAs(`${output}/photo.png`);
  await close();
  await page.reload();
  await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
  assert.equal(
    await page.locator("#lights-toggle").getAttribute("data-pattern"),
    "gentle",
  );
  if (process.env.CHECK_TRAIN_AUDIO === "true") {
    // Reload resets document activation; unlock with a genuine user click first.
    if (
      (await page
        .locator(".now-playing [data-action=play]")
        .getAttribute("aria-label")) === "음악 재생"
    ) {
      await click(".now-playing [data-action=play]");
      await page.waitForTimeout(150);
    }
    await click(".now-playing [data-action=play]");
    await page.evaluate(async () => {
      const { TrainSound } = await import("/src/train-sound.ts");
      window.trainProbe = new TrainSound(() => {});
      window.trainProbe.setRunning(true);
    });
    await page.waitForTimeout(900);
    const delay = await page.evaluate(
      () => window.trainProbe.diagnostics.untilHorn,
    );
    assert.ok(delay > 18 && delay <= 50);
    let trainRms = 0;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(120);
      trainRms = Math.max(trainRms, (await audio()).stems.train.rms);
    }
    assert.ok(
      trainRms > 0.001,
      "the chuff loop must produce non-silent pulses",
    );
    let hornRms = 0;
    for (let i = 0; i < 510 && hornRms < 0.0001; i++) {
      await page.waitForTimeout(100);
      hornRms = Math.max(hornRms, (await audio()).stems.horn.rms);
    }
    assert.ok(
      hornRms > 0.0001,
      "a scheduled horn must actually reach the audio bus",
    );
    await page.evaluate(() => window.trainProbe.setRunning(false));
    await page.waitForTimeout(200);
    const stopped = await audio();
    assert.ok(
      stopped.stems.train.rms < 0.0001 && stopped.stems.horn.rms < 0.0001,
    );
    await page.evaluate(() => window.trainProbe.setRunning(true));
    await page.waitForTimeout(50);
    const fresh = await page.evaluate(
      () => window.trainProbe.diagnostics.untilHorn,
    );
    assert.ok(fresh >= 19.8 && fresh <= 50 && fresh !== delay);
    await page.evaluate(() => window.trainProbe.destroy());
    report.trainAudio = { delay, fresh, trainRms, hornRms, stopped: true };
    console.log("PASS live train audio, random horn and cancellation");
  }
  // Deterministic WebGL fixtures use the same scene and Actors class as the app.
  // Freeze exact times for high/low lights and progressive portal frames in all villages.
  await page.evaluate(async () => {
    const [{ Actors }, { scene }] = await Promise.all([
      import("/src/actors.ts"),
      import("/src/scene.ts"),
    ]);
    window.fixture = { Actors, scene, actor: null };
  });
  for (const id of report.villages) {
    console.log("Checking deterministic lighting/tunnel fixtures", id);
    await page.evaluate(async (id) => {
      const f = window.fixture;
      f.actor?.destroy();
      document.querySelector("#scene-host").innerHTML = f.scene(id, false);
      f.actor = new f.Actors(
        document.querySelector("#scene-host .actor-stage"),
        id,
      );
      await f.actor.ready;
      f.actor.update({
        motion: false,
        lights: true,
        gold: false,
        hidden: true,
        pattern: "all",
      });
      document.querySelector("#app").classList.add("snow-off");
      f.actor.elapsed = 0.65 + ((2.15 - 0.85) * 18) / (Math.PI * 2);
    }, id);
    for (const [pattern, on] of [
      ["all", true],
      ["alternate", true],
      ["random", true],
      ["gentle", true],
      ["gentle", false],
    ]) {
      const levels = await page.evaluate(
        ({ pattern, on }) => {
          const a = window.fixture.actor;
          a.settings = {
            motion: false,
            lights: on,
            gold: false,
            hidden: true,
            pattern,
          };
          return [1.5, 4.5].map((t) => {
            a.lightTime = t;
            a.draw();
            return {
              star: a.bulbs[0].material.emissiveIntensity,
              window: Number(
                document
                  .querySelector("#scene-host .window")
                  .style.getPropertyValue("--intensity"),
              ),
              lamp: Number(
                document
                  .querySelector("#scene-host .lamp")
                  .style.getPropertyValue("--intensity"),
              ),
            };
          });
        },
        { pattern, on },
      );
      if (!on) assert.ok(Object.values(levels[0]).every((v) => v === 0));
      else if (pattern === "all")
        assert.ok(levels[0].star - levels[1].star > 2);
    }
    for (const [name, angle] of [
      ["entry-1", 2.3],
      ["entry-2", 2.47],
      ["entry-3", 2.64],
      ["entry-4", 2.81],
      ["exit-1", 6.58],
      ["exit-2", 6.75],
      ["exit-3", 6.92],
      ["exit-4", 7.09],
    ]) {
      await page.evaluate((angle) => {
        const a = window.fixture.actor;
        a.settings.lights = true;
        a.settings.pattern = "gentle";
        a.lightTime = 2;
        a.elapsed = 0.65 + ((angle - 0.85) * 18) / (Math.PI * 2);
        a.draw();
      }, angle);
      await page
        .locator(".hero")
        .screenshot({ path: `${output}/${id}-${name}.png` });
    }
    await page.evaluate(() => window.fixture.actor.destroy());
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
