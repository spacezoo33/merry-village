import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
// Optional browser regression, NOT part of daily build. Start Chromium with CDP :9222 and serve dist under the Pages path on :4180.
const tabs = await (await fetch("http://127.0.0.1:9222/json")).json();
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
await call("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: "/tmp/merry-product-downloads",
});
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
await pause(3000);
assert.equal(
  await evaluate(`document.querySelectorAll('.scene-controls button').length`),
  3,
);
assert.equal(
  await evaluate(
    `!!document.querySelector('#night-toggle,.app-header,.village-heading')`,
  ),
  false,
);
assert.equal(
  await evaluate(`document.querySelector('#graphics-status').textContent`),
  "",
);
await click("#motion-toggle");
const stopped = await data();
await pause(1200);
assert.equal((await data()).elapsed, stopped.elapsed);
assert.equal((await data()).treeAngle, stopped.treeAngle);
await click("#motion-toggle");
await pause(1100);
assert.ok(Number((await data()).elapsed) > Number(stopped.elapsed));
await click("#lights-toggle");
assert.equal(
  await evaluate(
    `document.querySelector('#app').classList.contains('lights-off')`,
  ),
  true,
);
await click("#snow-toggle");
assert.equal(
  await evaluate(
    `document.querySelector('#app').classList.contains('snow-off')`,
  ),
  true,
);
await click("#lights-toggle");
await click("#snow-toggle");
console.log("controls", await data());
await shot("home");
for (const width of [320, 430, 1440]) {
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
  "forest",
  "chapel",
  "workshop",
  "palace",
  "gingerbread",
  "cozy",
]) {
  await click('.bottom-nav [data-action="villages"]');
  await click(`[data-village="${id}"]`);
  await pause(400);
  assert.equal(
    await evaluate(`document.querySelector('#app').dataset.village`),
    id,
  );
  await shot(id);
  if (["workshop", "palace", "gingerbread"].includes(id))
    assert.equal(
      await evaluate(`document.querySelector('#preview-ribbon').hidden`),
      false,
    );
}
for (const id of ["aurora", "shooting", "wishes"]) {
  await click('.bottom-nav [data-action="nights"]');
  await click(`[data-effect="${id}"]`);
  await pause(500);
  assert.equal(
    await evaluate(`document.querySelector('#app').dataset.effect`),
    id,
  );
  await shot(id);
  await click('[data-action="exit-preview"]');
}
await click('.bottom-nav [data-action="music"]');
for (const id of ["snow", "starlight", "waltz", "lullaby", "letter"]) {
  await click(`[data-track="${id}"]`);
  await pause(500);
  assert.match(
    await evaluate(`document.querySelector('#music-status').textContent`),
    /연주/,
  );
}
await click('[data-action="close"]');
await click('[data-action="next"]');
assert.equal(
  await evaluate(`document.querySelector('#song-name').textContent`),
  "고요한 밤",
);
for (let k = 0; k < 30; k++) {
  if (
    await evaluate(
      `!document.querySelector('#music-time').textContent.startsWith('0:00')`,
    )
  )
    break;
  await pause(200);
}
assert.equal(
  await evaluate(
    `document.querySelector('#music-time').textContent.startsWith('0:00')`,
  ),
  false,
);
await click('[data-action="play"]');
assert.match(
  await evaluate(`document.querySelector('#music-status').textContent`),
  /쉬어/,
);
await click('.bottom-nav [data-action="photo"]');
for (let k = 0; k < 30; k++) {
  if (await evaluate(`!!document.querySelector('.photo-preview img')`)) break;
  await pause(300);
}
assert.equal(
  await evaluate(`!!document.querySelector('.photo-preview img')`),
  true,
);
await click('[data-action="save-photo"]');
await pause(500);
await click('[data-action="close"]');
const start = await data();
for (let i = 0; i < 10; i++) {
  await pause(4000);
  console.log("orbit", i, await data());
  if (i % 2 === 0) await shot(`orbit-${i}`);
}
const finish = await data();
assert.ok(
  Number(finish.elapsed) - Number(start.elapsed) > 37,
  "observed full tree rotation and >2 train laps",
);
await call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await pause(300);
const reduced = await data();
await pause(500);
assert.equal((await data()).elapsed, reduced.elapsed);
await shot("reduced");
await call("Emulation.setEmulatedMedia", { features: [] });
assert.equal(errors.length, 0, JSON.stringify(errors));
console.log(
  "PASS product browser checks, actual >37s running, resize, controls, six villages, three effects, five carols, PNG download, reduced motion",
);
ws.close();
