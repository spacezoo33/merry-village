import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
);
const output = process.env.BROWSER_OUTPUT ?? "/tmp/merry-release-qa";
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
page.setDefaultTimeout(20000);
const report = {
  tracks: [],
  villages: [],
  modes: [],
  errors: [],
  limits: [
    "Synthetic visibility events verify web handlers, not native Toss lifecycle",
    "No real ad playback/reward or native photo save",
    "No human speaker listening",
  ],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") report.errors.push(m.text());
});
const click = (s) => page.locator(s).click();
const close = () => click("#sheet [data-action=close]");
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("merry-village:v2")));
const audio = () =>
  page.evaluate(async () =>
    (await import("/src/audio-engine.ts")).audioDiagnostics(),
  );
const sound = () =>
  page.evaluate(() =>
    JSON.parse(document.querySelector("#app").dataset.soundDiagnostics),
  );
async function until(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await page.waitForTimeout(100);
  }
  throw new Error("Condition timed out");
}
try {
  await page.goto(process.env.PREVIEW_URL ?? "http://127.0.0.1:5175/");
  await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
  if (process.env.BROWSER_PHASE !== "fixtures") {
    assert.equal(await page.locator("#graphics-status").textContent(), "");
    assert.equal(await page.locator(".bottom-nav button").count(), 4);
    assert.equal(await page.locator("#lights-label").textContent(), "조명");
    await click("#motion-toggle");
    await click(".bottom-nav [data-action=music]");
    const ids = ["snow", "starlight", "waltz", "holy-night", "bethlehem"];
    const names = [
      "고요한 밤",
      "징글벨",
      "기쁘다 구주 오셨네",
      "거룩한 밤",
      "오 베들레헴 작은 골",
    ];
    assert.deepEqual(
      await page.locator(".track-row strong").allTextContents(),
      names,
    );
    for (let n = 0; n < ids.length; n++) {
      await click(`[data-track="${ids[n]}"]`);
      let rms = 0;
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(160);
        const a = await audio();
        assert.equal(a.state, "running");
        assert.equal(a.stems.bells, undefined);
        assert.ok(a.mix.peak < 0.99);
        rms = Math.max(rms, a.stems.music.rms);
      }
      assert.ok(rms > 0.003, `${ids[n]} must output actual music`);
      assert.equal(await page.locator("#song-name").textContent(), names[n]);
      report.tracks.push({ id: ids[n], name: names[n], rms });
    }
    await close();
    await click("[data-action=previous]");
    assert.equal((await saved()).track, "holy-night");
    await click("[data-action=next]");
    assert.equal((await saved()).track, "bethlehem");
    await click(".now-playing [data-action=play]");
    await page.waitForTimeout(150);
    assert.ok((await audio()).stems.music.rms < 0.0001);
    await click(".now-playing [data-action=play]");
    // Exercise the actual browser visibility listener without a production test hook.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await until(async () => (await audio()).state === "suspended");
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await until(async () => (await audio()).state === "running");
    const seekEnd = () =>
      page.locator("#progress").evaluate((el) => {
        el.value = String(Number(el.max) - 0.1);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    await seekEnd();
    await until(async () => (await saved()).track === "snow");
    await click(".bottom-nav [data-action=music]");
    await click("[data-action=repeat]");
    await close();
    await seekEnd();
    await page.waitForTimeout(650);
    assert.equal((await saved()).track, "snow");
    assert.equal((await saved()).repeat, true);
    await click(".now-playing [data-action=play]");
    console.log(
      "PASS five live music outputs, transport, loop/advance and web visibility",
    );
    await click("#snow-toggle");
    assert.equal((await saved()).snow, false);
    await click(".bottom-nav [data-action=villages]");
    assert.equal(await page.locator("#sheet .snowfall").count(), 0);
    await close();
    assert.equal((await saved()).snow, false);
    await click("#snow-toggle");
    assert.equal((await saved()).snow, true);
    await click(".bottom-nav [data-action=villages]");
    assert.equal(
      await page
        .locator(".hero .snowfall")
        .first()
        .evaluate((e) => getComputedStyle(e).visibility),
      "hidden",
    );
    await close();
    assert.equal(
      await page
        .locator(".hero .snowfall")
        .first()
        .evaluate((e) => getComputedStyle(e).visibility),
      "visible",
    );
    for (const expected of ["all", "alternate", "random", "gentle", "all"]) {
      await click("#lights-toggle");
      assert.equal(
        await page.locator("#lights-toggle").getAttribute("data-pattern"),
        expected,
      );
      assert.equal(await page.locator("#lights-label").textContent(), "조명");
      assert.equal(await page.locator("#sheet").evaluate((e) => e.open), false);
      report.modes.push(expected);
    }
    // Seed a different village through the UI so the first tested engine starts a new journey too.
    await click(".bottom-nav [data-action=villages]");
    await click("button[data-village=forest]");
    // All six real app instances cross the visible centre, never a clock-only schedule.
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
      await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
      assert.equal(await page.locator("#app").getAttribute("data-village"), id);
      assert.equal(
        await page.locator("#lights-toggle").getAttribute("data-pattern"),
        "all",
      );
      assert.equal(await page.locator("#scene-host .window").count(), 0);
      assert.equal(await page.locator("#scene-host .tunnel").count(), 2);
      const baseline = (await sound()).horns;
      await click("#motion-toggle");
      await until(async () => (await sound()).horns > baseline, 24000);
      const first = (await sound()).horns;
      assert.equal(first, baseline + 1);
      const angle = Number(
        await page
          .locator("#scene-host .actor-stage")
          .getAttribute("data-train-angle"),
      );
      assert.ok(
        Math.abs((angle % (Math.PI * 2)) - Math.PI / 2) < 0.55,
        `${id} horn must follow front centre`,
      );
      let hornRms = 0,
        trainRms = 0;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(70);
        const a = await audio();
        hornRms = Math.max(hornRms, a.stems.horn.rms);
        trainRms = Math.max(trainRms, a.stems.train.rms);
      }
      assert.ok(hornRms > 0.0001 && trainRms > 0.001);
      if (id === "cozy") {
        // Reach the hidden rear-centre crossing; no extra horn may be emitted there.
        await until(
          async () =>
            Number(
              await page
                .locator("#scene-host .actor-stage")
                .getAttribute("data-elapsed"),
            ) > 12,
          20000,
        );
        assert.equal((await sound()).horns, first);
      }
      await click("#motion-toggle");
      await page.waitForTimeout(150);
      const stopped = await audio();
      assert.ok(
        stopped.stems.train.rms < 0.0001 && stopped.stems.horn.rms < 0.0001,
      );
      await page.screenshot({ path: `${output}/${id}.png`, fullPage: true });
      report.villages.push({ id, angle, hornRms, trainRms });
      console.log("PASS real centre horn and stopped audio", id);
    }
    await click(".bottom-nav [data-action=nights]");
    assert.equal(await page.locator(".night-card").count(), 3);
    await page.keyboard.press("Escape");
    await until(
      async () => !(await page.locator("#sheet").evaluate((e) => e.open)),
    );
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
      "all",
    );
  } else {
    await click("#motion-toggle");
    report.villages = [
      "cozy",
      "forest",
      "chapel",
      "workshop",
      "palace",
      "gingerbread",
    ].map((id) => ({ id }));
  }
  report.phase = process.env.BROWSER_PHASE ?? "full";
  // Actual shader/DOM fixtures: only four requested targets, fixed windows, moving LED projection.
  await page.evaluate(async () => {
    const [{ Actors }, { scene }] = await Promise.all([
      import("/src/actors.ts"),
      import("/src/scene.ts"),
    ]);
    window.f = { Actors, scene, actor: null };
  });
  for (const id of report.villages.map((v) => v.id)) {
    await page.evaluate(async (id) => {
      const f = window.f;
      f.actor?.destroy();
      document.querySelector("#scene-host").innerHTML = f.scene(id, false);
      f.actor = new f.Actors(
        document.querySelector("#scene-host .actor-stage"),
        id,
      );
      await f.actor.ready;
      f.actor.update({
        motion: false,
        hidden: true,
        gold: false,
        pattern: "all",
      });
      document.querySelector("#app").classList.add("snow-off");
    }, id);
    for (const [label, t] of [
      ["on", 0],
      ["dim", 1],
    ]) {
      await page.evaluate((t) => {
        const a = window.f.actor;
        a.lightTime = t;
        a.draw();
      }, t);
      const levels = await page
        .locator("#scene-host .decor-bulb")
        .evaluateAll((els) =>
          els.map((e) => Number(e.style.getPropertyValue("--intensity"))),
        );
      assert.ok(levels.every((x) => x === (label === "on" ? 1 : 0)));
      await page
        .locator(".hero")
        .screenshot({ path: `${output}/${id}-lights-${label}.png` });
    }
    await page.evaluate(() => {
      const a = window.f.actor;
      a.settings.pattern = "alternate";
      a.lightTime = 1;
      a.elapsed = 0;
      a.draw();
      window.beforeLeds = [...a.ledWeights];
      a.elapsed = 9;
      a.draw();
      if (
        JSON.stringify(window.beforeLeds) === JSON.stringify([...a.ledWeights])
      )
        throw Error("Rotating tree LEDs must track projected screen position");
    });
    await page.evaluate(() => window.f.actor.destroy());
    console.log("PASS lighting fixtures", id);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForSelector("#scene-host .actor-stage[data-ready=true]");
  if (!(await saved()).motion) await click("#motion-toggle");
  assert.equal((await saved()).motion, true);
  assert.equal(
    await page.locator("#scene-host .actor-stage").getAttribute("data-reduced"),
    "true",
  );
  const before = await page
    .locator("#scene-host .actor-stage")
    .getAttribute("data-elapsed");
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator("#scene-host .actor-stage").getAttribute("data-elapsed"),
    before,
  );
  assert.equal((await sound()).running, false);
  assert.deepEqual(report.errors, []);
  report.completed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  try {
    report.lastActor = await page
      .locator("#scene-host .actor-stage")
      .evaluate((e) => ({ ...e.dataset }));
    report.lastSound = await sound();
  } catch {}
  await writeFile(
    `${output}/${process.env.BROWSER_PHASE === "fixtures" ? "fixtures-report" : "report"}.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
