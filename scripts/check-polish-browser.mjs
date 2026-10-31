import assert from "node:assert/strict";
import { writeFile, readFile, readdir, mkdir } from "node:fs/promises";
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
  if (v.method === "Runtime.consoleAPICalled" && v.params.type === "error")
    errors.push(v.params.args.map((a) => a.value ?? a.description));
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

// Dedicated local-only playback/visual regression. Records the actual final browser bus.
async function until(expression, label) {
  for (let i = 0; i < 90; i++) {
    try {
      if (await evaluate(expression)) return;
    } catch (e) {
      if (!/navigated|destroyed/i.test(String(e))) throw e;
    }
    await pause(150);
  }
  throw Error("Timed out " + label);
}
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__taps=[];window.__buffers=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...args){const result=connect.apply(this,args);if(args[0]===this.context.destination&&this.context.createMediaStreamDestination){const tap=this.context.createMediaStreamDestination();connect.call(this,tap);window.__taps.push(tap);}return result;};const create=BaseAudioContext.prototype.createBufferSource;BaseAudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node);node.start=(...args)=>{if(node.buffer)window.__buffers.push(node.buffer);return start(...args);};return node;};`,
});
await mkdir("/tmp/merry-polish-downloads", { recursive: true });
await call("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: "/tmp/merry-polish-downloads",
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
await pause(1800);
try {
  await evaluate(`localStorage.clear();location.reload()`);
} catch (e) {
  if (!/navigated|destroyed/i.test(String(e))) throw e;
}
await until(
  `document.querySelector('#scene-host .actor-stage')?.dataset.ready==='true'`,
  "assets",
);
assert.equal((await data()).pattern, "gentle");
assert.equal(
  await evaluate(`document.querySelectorAll('.scene-controls button').length`),
  3,
);
assert.equal(
  await evaluate(
    `document.querySelectorAll('.lighting-sheet,button[data-pattern],[data-action=light-power]').length`,
  ),
  0,
);
assert.equal(
  await evaluate(`document.querySelectorAll('.hero .snowfall i').length`),
  74,
);
assert.equal(
  await evaluate(
    `document.querySelectorAll('#scene-host .bulb-emitter').length`,
  ),
  88,
);
if (
  !(await evaluate(
    `document.querySelector('#music-status').textContent.includes('연주')`,
  ))
)
  await click('[data-action="play"]');
await until(
  `JSON.parse(document.querySelector('#app').dataset.audioMetrics)?.stems?.train.rms>0.001`,
  "actual train output",
);
await evaluate(
  `window.__record={chunks:[]};const r=window.__record; r.recorder=new MediaRecorder(window.__taps[0].stream,{mimeType:'audio/webm;codecs=opus'});r.recorder.ondataavailable=e=>{if(e.data.size)r.chunks.push(e.data)};r.recorder.start(1000);`,
);
const mixes = {};
await click('.bottom-nav [data-action="music"]');
assert.equal(
  await evaluate(`document.querySelector('[data-track=lullaby]').disabled`),
  true,
);
for (const track of ["snow", "starlight", "waltz", "letter"]) {
  await click(`button[data-track="${track}"]`);
  await until(
    `document.querySelector('#music-status').textContent.includes('연주')`,
    "music " + track,
  );
  const readings = [];
  for (let i = 0; i < 25; i++) {
    await pause(280);
    readings.push(
      await evaluate(
        `JSON.parse(document.querySelector('#app').dataset.audioMetrics)`,
      ),
    );
  }
  const energy = (name) =>
    Math.sqrt(
      readings.reduce((sum, r) => sum + r.stems[name].rms ** 2, 0) /
        readings.length,
    );
  const summary = {
    musicRms: energy("music"),
    bellRms: energy("bells"),
    trainRms: energy("train"),
    peak: Math.max(...readings.map((r) => r.mix.peak)),
  };
  assert.ok(
    summary.musicRms > 0.002 &&
      summary.bellRms > 0.002 &&
      summary.trainRms > 0.002,
  );
  assert.ok(summary.bellRms / summary.musicRms > 0.13);
  assert.ok(summary.trainRms / summary.musicRms > 0.15);
  assert.ok(summary.peak < 0.96);
  mixes[track] = summary;
  console.log("live mix", track, summary);
}
await evaluate(
  `(()=>{const s=document.querySelector('#volume');s.value='1';s.dispatchEvent(new Event('input',{bubbles:true}));})()`,
);
await pause(7000);
const full = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.audioMetrics)`,
);
assert.ok(full.mix.peak < 0.96);
mixes.fullVolume = full;
const recording = await evaluate(
  `new Promise(resolve=>{const r=window.__record;r.recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(r.chunks,{type:'audio/webm'}));};r.recorder.stop();})`,
);
await writeFile(
  "/tmp/merry-polish-live-mix.webm",
  Buffer.from(recording, "base64"),
);
await writeFile(
  "/tmp/merry-polish-live-metrics.json",
  JSON.stringify(mixes, null, 2),
);
const comparison = await evaluate(
  `(async()=>{const rate=22050,newBuffer=window.__buffers.find(b=>b.duration>1&&b.duration<1.15);const old=new Float32Array(Math.round(rate*1.16));let seed=12345,last=0;for(let i=0;i<old.length;i++){seed=seed*16807%2147483647;last=.62*last+.38*(seed/2147483647*2-1);const phase=(i/rate)%.29,envelope=Math.min(1,phase/.024)*Math.exp(-phase*18);old[i]=last*(.038*envelope+.0028);}for(let i=0;i<128;i++){const f=i/128;old[old.length-128+i]=old[old.length-128+i]*(1-f)+old[0]*f;}async function render(data,gain){const c=new OfflineAudioContext(1,rate*6,rate),b=c.createBuffer(1,data.length,rate);b.copyToChannel(data,0);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;s.loop=true;f.type='lowpass';f.frequency.value=1400;g.gain.value=gain;s.connect(f);f.connect(g);g.connect(c.destination);s.start();const r=(await c.startRendering()).getChannelData(0);return Math.sqrt(r.reduce((a,v)=>a+v*v,0)/r.length);}const before=await render(old,.55),after=await render(newBuffer.getChannelData(0),.75*.9);return{beforeRms:before,afterRms:after,increaseDb:20*Math.log10(after/before)};})()`,
);
assert.ok(comparison.increaseDb > 12);
console.log("rendered train before/after", comparison);
await writeFile(
  "/tmp/merry-polish-train-comparison.json",
  JSON.stringify(comparison, null, 2),
);
await click('[data-action="close"]');
await click('[data-action="play"]');
await pause(350);
const muted = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.audioMetrics)`,
);
assert.ok(muted.stems.music.rms < 0.0001 && muted.stems.bells.rms < 0.0001);
assert.ok(muted.stems.train.rms > 0.001);
await click("#motion-toggle");
await pause(400);
const stopped = await data();
const stoppedSound = await evaluate(
  `JSON.parse(document.querySelector('#app').dataset.audioMetrics)`,
);
assert.ok(
  stoppedSound.stems.train.rms < 0.0001 && stoppedSound.stems.horn.rms < 0.0001,
);
await pause(700);
assert.equal((await data()).elapsed, stopped.elapsed);
await click("#snow-toggle");
// From default gentle: OFF -> all -> alternate -> random -> gentle -> OFF.
for (const state of ["off", "all", "alternate", "random", "gentle", "off"]) {
  await click("#lights-toggle");
  assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  const actual = await evaluate(
    `document.querySelector('#app').classList.contains('lights-off')?'off':document.querySelector('#scene-host .actor-stage').dataset.pattern`,
  );
  assert.equal(actual, state);
  if (state === "all") {
    await until(
      `JSON.parse(document.querySelector('#scene-host .actor-stage').dataset.bulbLevels).every(v=>v>2.4)`,
      "all bright",
    );
    await shot("polish-all-on");
    await until(
      `JSON.parse(document.querySelector('#scene-host .actor-stage').dataset.bulbLevels).every(v=>v<.03)`,
      "all dark",
    );
    await shot("polish-all-dark");
  } else {
    await pause(500);
    await shot("polish-" + state);
  }
  console.log("lighting", state, await data());
}
await click("#lights-toggle");
await click("#lights-toggle");
await click("#lights-toggle"); // random, preserved in all villages
await click("#motion-toggle");
await click("#snow-toggle");
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
  await until(
    `document.querySelector('#scene-host .actor-stage')?.dataset.ready==='true'`,
    "village " + id,
  );
  assert.equal(
    await evaluate(`document.querySelector('#app').dataset.village`),
    id,
  );
  assert.equal((await data()).pattern, "random");
  const laps = Number(process.env.RAIL_LAPS ?? 0);
  if (laps > 0) {
    const start = Number((await data()).elapsed);
    while (Number((await data()).elapsed) - start < 18 * laps) await pause(700);
    console.log("real rail laps", id, laps);
  }
  await pause(2200);
  await shot("polish-" + id);
  console.log("village preserved", id);
}
for (const width of [320, 430, 1440]) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height: width === 1440 ? 1000 : 812,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await pause(300);
  assert.equal(
    await evaluate("document.documentElement.scrollWidth>innerWidth"),
    false,
  );
  await shot("polish-" + width);
}
await call("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
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
await until(`!!document.querySelector('.photo-preview img')`, "PNG");
await click('[data-action="save-photo"]');
let downloaded;
for (let attempt = 0; attempt < 100; attempt++) {
  const files = await readdir("/tmp/merry-polish-downloads");
  const name = files.find((n) => n.endsWith(".png"));
  if (name) {
    const bytes = await readFile("/tmp/merry-polish-downloads/" + name);
    if (bytes.length > 24) {
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(bytes.readUInt32BE(16), 1200);
      assert.equal(bytes.readUInt32BE(20), 1560);
      downloaded = name;
      break;
    }
  }
  await pause(150);
}
assert.ok(downloaded, "actual PNG file must finish downloading");
console.log("actual PNG download", downloaded);
await click('[data-action="close"]');
// Fresh page, then real CPU pressure; density must react, not just an unused helper.
await call("Page.reload");
await until(
  `document.querySelector('#scene-host .actor-stage')?.dataset.ready==='true'`,
  "reload",
);
assert.equal((await data()).pattern, "random");
await call("Emulation.setCPUThrottlingRate", { rate: 6 });
await pause(8500);
const quality = await evaluate(
  `document.querySelector('#app').dataset.snowQuality`,
);
assert.ok(["medium", "low"].includes(quality));
const visibleSnow = await evaluate(
  `Array.from(document.querySelectorAll('.hero .snowfall i')).filter(e=>getComputedStyle(e).display!=='none').length`,
);
assert.equal(visibleSnow, quality === "low" ? 44 : 56);
console.log(
  "adaptive density under real browser pressure",
  quality,
  visibleSnow,
);
await call("Emulation.setCPUThrottlingRate", { rate: 1 });
await call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await pause(250);
const reduced = await data();
await pause(500);
assert.equal((await data()).elapsed, reduced.elapsed);
await call("Emulation.setEmulatedMedia", { features: [] });
assert.equal(errors.length, 0, JSON.stringify(errors));
console.log(
  "PASS final polish: actual recorded/metered four cleared tracks; pending track blocked; cycle and pixels; 74 flakes/adaptive load; six villages; PNG; special nights preserved",
);
ws.close();
