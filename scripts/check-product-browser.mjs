import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
// Optional browser regression, NOT part of daily build. Start Chromium with CDP :9222 and serve dist under the Pages path on :4180.
const fresh = await (
  await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })
).json();
const tabs = [fresh];
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const v = JSON.parse(data);
  if (v.id) {
    pending.get(v.id)?.(v);
    pending.delete(v.id);
  }
  if (v.method === "Runtime.exceptionThrown") errors.push(v.params);
  if (
    v.method === "Network.responseReceived" &&
    v.params.response.status >= 400
  )
    errors.push({
      url: v.params.response.url,
      status: v.params.response.status,
    });
});
async function call(method, params = {}) {
  const id = ++seq;
  const p = new Promise((r) => pending.set(id, r));
  ws.send(JSON.stringify({ id, method, params }));
  const v = await p;
  if (v.error) throw Error(JSON.stringify(v.error));
  return v.result;
}
async function evaluate(expression) {
  const v = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  assert.equal(
    v.exceptionDetails,
    undefined,
    JSON.stringify(v.exceptionDetails),
  );
  return v.result.value;
}
await call("Runtime.enable");
await call("Network.enable");
await call("Page.enable");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function click(selector) {
  const p = await evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  await call("Input.dispatchMouseEvent", {
    type: "mousePressed",
    ...p,
    button: "left",
    clickCount: 1,
  });
  await call("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    ...p,
    button: "left",
    clickCount: 1,
  });
}
async function shot(name) {
  const r = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(
    `/tmp/merry-product-${name}.png`,
    Buffer.from(r.data, "base64"),
  );
}
const data = () =>
  evaluate(`({...document.querySelector('#scene-host .actor-stage').dataset})`);

// Slow integration test: all six real villages run for at least two real laps each.
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__audioProbe=[];const original=BaseAudioContext.prototype.createBufferSource;BaseAudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start.bind(source);source.start=(...args)=>{if(source.buffer&&source.buffer.duration>10){const samples=source.buffer.getChannelData(0);let peak=0;for(let i=0;i<samples.length;i+=13)peak=Math.max(peak,Math.abs(samples[i]));window.__audioProbe.push({duration:source.buffer.duration,peak});}return start(...args);};return source;};`,
});
await call("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: "/tmp/merry-product-downloads",
});
await call("Emulation.setEmulatedMedia", { features: [] });
await call("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await call("Page.navigate", {
  url: process.env.PREVIEW_URL ?? "http://127.0.0.1:4180/merry-village/",
});
await pause(3000);
await evaluate(`localStorage.clear();location.reload()`);
async function waitFor(expression, label) {
  for (let k = 0; k < 60; k++) {
    try {
      if (await evaluate(expression)) return;
    } catch (error) {
      if (!/navigated|context.*destroyed/i.test(String(error))) throw error;
    }
    await pause(250);
  }
  throw Error("Timed out: " + label);
}
await waitFor(
  `document.querySelector('#scene-host .actor-stage')?.dataset.ready==='true'`,
  "fir texture",
);
assert.equal(
  await evaluate(`document.querySelectorAll('.scene-controls button').length`),
  3,
);
assert.equal(
  await evaluate(`!!document.querySelector('#night-toggle,.app-header')`),
  false,
);
await click("#motion-toggle");
const stopped = await data();
await pause(1000);
assert.equal((await data()).elapsed, stopped.elapsed);
await click("#motion-toggle");
await pause(900);
assert.ok(Number((await data()).elapsed) > Number(stopped.elapsed));
await waitFor(
  `document.querySelector('#app').dataset.sound==='기차 소리 재생 중'`,
  "actual train audio",
);
await click("#lights-toggle");
assert.equal(
  await evaluate(`document.querySelectorAll('button[data-pattern]').length`),
  4,
);
for (const id of ["all", "alternate", "random", "gentle"]) {
  await click(`button[data-pattern="${id}"]`);
  assert.equal((await data()).pattern, id);
  await pause(300);
  console.log("pattern", id, JSON.parse((await data()).bulbLevels));
}
await click('[data-action="light-power"]');
assert.equal(
  await evaluate(
    `document.querySelector('#app').classList.contains('lights-off')`,
  ),
  true,
);
assert.ok(JSON.parse((await data()).bulbLevels).every((v) => v === 0));
await click('[data-action="light-power"]');
await click('button[data-pattern="alternate"]');
await click('[data-action="close"]');
await click("#snow-toggle");
assert.equal(
  await evaluate(
    `document.querySelector('#app').classList.contains('snow-off')`,
  ),
  true,
);
await click("#snow-toggle");
assert.equal(
  await evaluate(`document.querySelectorAll('#scene-host .snow-mid i').length`),
  16,
);
for (const width of [320, 375, 430, 1440]) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height: width === 1440 ? 1000 : 812,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await pause(350);
  assert.equal(
    await evaluate(`document.documentElement.scrollWidth>innerWidth`),
    false,
  );
  await shot(String(width));
}
await call("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
for (const id of [
  "cozy",
  "forest",
  "chapel",
  "workshop",
  "palace",
  "gingerbread",
]) {
  await click('.bottom-nav [data-action="villages"]');
  await click(`button[data-village="${id}"]`);
  await waitFor(
    `document.querySelector('#scene-host .actor-stage')?.dataset.ready==='true'`,
    "village " + id,
  );
  assert.equal(
    await evaluate(`document.querySelector("#app").dataset.village`),
    id,
  );
  assert.equal((await data()).pattern, "alternate");
  const start = await data();
  const captured = new Set();
  for (let sample = 0; sample < 85; sample++) {
    await pause(700);
    const current = await data(),
      phase = Number(current.trainAngle) % (Math.PI * 2);
    if (!captured.has("front") && phase > 1.15 && phase < 1.95) {
      await shot(`${id}-front`);
      captured.add("front");
    }
    if (!captured.has("tunnel") && phase > 2.15 && phase < 2.7) {
      await shot(`${id}-tunnel`);
      captured.add("tunnel");
    }
    if (
      Number(current.elapsed) - Number(start.elapsed) > 37 &&
      captured.size === 2
    )
      break;
  }
  assert.equal(captured.size, 2, "visible front and tunnel captures " + id);
  const end = await data();
  assert.ok(
    Number(end.elapsed) - Number(start.elapsed) >= 36,
    "two actual laps " + id,
  );
  assert.ok(Number(end.treeAngle) > Number(start.treeAngle));
  console.log("two laps verified", id, {
    elapsed: Number(end.elapsed) - Number(start.elapsed),
    calibration: JSON.parse(end.village),
    sound: await evaluate(
      `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
    ),
  });
}
const sounds = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
);
assert.ok(sounds.horns >= 1);
assert.ok(sounds.puffs > 50);
for (let i = 1; i < sounds.hornTimes.length; i++) {
  const delta = sounds.hornTimes[i] - sounds.hornTimes[i - 1];
  assert.ok(delta >= 20 && delta <= 35.5, "horn interval " + delta);
}
await click("#motion-toggle");
await pause(500);
const off = await data(),
  offSound = await evaluate(
    `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
  );
await pause(1300);
assert.equal((await data()).elapsed, off.elapsed);
const later = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
);
assert.equal(later.puffs, offSound.puffs);
assert.equal(later.horns, offSound.horns);
assert.equal(later.running, false);
assert.match(
  await evaluate(`document.querySelector("#music-status").textContent`),
  /연주/,
);
await click("#motion-toggle");
await waitFor(
  `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics).running`,
  "sound resume",
);
await click('.bottom-nav [data-action="music"]');
for (const id of ["snow", "starlight", "waltz", "lullaby", "letter"]) {
  await click(`[data-track="${id}"]`);
  await waitFor(
    `document.querySelector('#music-status').textContent.includes('연주')`,
    "music " + id,
  );
}
await click('[data-action="close"]');
await click('[data-action="play"]');
assert.match(
  await evaluate(`document.querySelector('#music-status').textContent`),
  /쉬어/,
);
const fxBefore = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
);
await pause(1400);
assert.ok(
  (
    await evaluate(
      `JSON.parse(document.querySelector('#app').dataset.soundDiagnostics)`,
    )
  ).puffs > fxBefore.puffs,
);
const buffers = await evaluate("window.__audioProbe");
assert.ok(buffers.length >= 5);
assert.ok(buffers.every((b) => b.peak > 0.3 && b.peak <= 0.361));
assert.equal(new Set(buffers.map((b) => b.duration.toFixed(3))).size, 5);
console.log("actual non-silent normalised carol buffers", buffers);
for (const id of ["aurora", "shooting", "wishes"]) {
  await click('.bottom-nav [data-action="nights"]');
  await click(`[data-effect="${id}"]`);
  assert.equal(
    await evaluate(`document.querySelector('#app').dataset.effect`),
    id,
  );
  await click('[data-action="exit-preview"]');
}
await click('.bottom-nav [data-action="villages"]');
await click('button[data-village="cozy"]');
await click('.bottom-nav [data-action="photo"]');
await waitFor(`!!document.querySelector('.photo-preview img')`, "PNG");
await click('[data-action="save-photo"]');
await pause(400);
await click('[data-action="close"]');
await call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await pause(400);
const reduced = await data();
await pause(700);
assert.equal((await data()).elapsed, reduced.elapsed);
assert.equal(
  await evaluate(`document.querySelector('#app').dataset.sound`),
  "기차 소리 정지",
);
await call("Emulation.setEmulatedMedia", { features: [] });
await pause(400);
const target = await call("Target.createTarget", { url: "about:blank" });
await call("Target.activateTarget", { targetId: target.targetId });
await pause(500);
assert.equal(await evaluate("document.hidden"), true);
const hidden = await data();
await pause(700);
assert.equal((await data()).elapsed, hidden.elapsed);
assert.equal(
  await evaluate(`document.querySelector('#app').dataset.sound`),
  "기차 소리 정지",
);
await call("Target.closeTarget", { targetId: target.targetId });
await pause(700);
assert.ok(Number((await data()).elapsed) > Number(hidden.elapsed));
assert.equal(errors.length, 0, JSON.stringify(errors));
console.log(
  "PASS six villages x two actual laps, detailed assets, 4 light patterns, 3 snow layers, 5 real carol buffers, train chuffs/horns, stop/resume, reduced motion, background and PNG",
);
ws.close();
