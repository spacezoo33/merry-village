import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLighting } from "../src/lighting.ts";
import { SnowBudget, SNOW_COUNTS } from "../src/snow.ts";
import { TRACKS } from "../src/catalog.ts";
import { synthMusic } from "../src/music-synth.ts";
test("lighting cycles all/alternate/random/gentle/off without losing the saved pattern", () => {
  let p = { lights: true, lightPattern: "gentle" };
  p = nextLighting(p);
  assert.equal(p.lights, false);
  const values = [];
  for (let i = 0; i < 5; i++) {
    p = nextLighting(p);
    values.push(p.lights ? p.lightPattern : "off");
  }
  assert.deepEqual(values, ["all", "alternate", "random", "gentle", "off"]);
});
test("74 larger snowflakes degrade after sustained frame pressure and recover without flapping", () => {
  assert.equal(
    Object.values(SNOW_COUNTS.high).reduce((a, b) => a + b),
    74,
  );
  const b = new SnowBudget();
  for (let i = 0; i < 210; i++) b.sample(16.7);
  assert.equal(b.quality, "high");
  for (let i = 0; i < 120; i++) b.sample(60);
  assert.equal(b.quality, "low");
  for (let i = 0; i < 200; i++) b.sample(16.7);
  assert.equal(b.quality, "low");
  for (let i = 0; i < 2200; i++) b.sample(16.7);
  assert.equal(b.quality, "high");
});
test("cleared carols have an independent audible bell stem; unresolved tune cannot be synthesised", () => {
  const pending = TRACKS.find((t) => !t.available);
  assert.equal(pending.name, "축하해요 크리스마스");
  assert.throws(() => synthMusic(pending), /권리/);
  assert.equal(TRACKS[4].name, "오 크리스마스 트리");
  for (const t of TRACKS.filter((t) => t.available)) {
    const s = synthMusic(t);
    assert.equal(s.music.length, s.bells.length);
    let music = 0,
      bells = 0,
      peak = 0;
    for (let i = 0; i < s.music.length; i++) {
      music += s.music[i] ** 2;
      bells += s.bells[i] ** 2;
      peak = Math.max(peak, Math.abs(s.music[i] + s.bells[i]));
    }
    assert.ok(
      bells / music > 0.015,
      "bells must be measurable in every cleared track",
    );
    assert.ok(peak < 0.7, "headroom before final mix");
  }
});
