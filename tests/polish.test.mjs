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
test("all five independent carols produce finite non-silent music without an extra bell stem", () => {
  assert.equal(TRACKS[3].name, "축하해요 크리스마스");
  assert.equal(TRACKS[4].name, "거룩한 밤");
  const fingerprints = new Set();
  for (const t of TRACKS) {
    assert.equal(t.available, true);
    const s = synthMusic(t);
    assert.equal(s.bells, undefined);
    assert.ok(Number.isFinite(s.duration) && s.duration > 20);
    let energy = 0,
      peak = 0;
    for (const sample of s.music) {
      assert.ok(Number.isFinite(sample));
      energy += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    assert.ok(Math.sqrt(energy / s.music.length) > 0.015);
    assert.ok(peak <= 0.361);
    fingerprints.add(t.score);
  }
  assert.equal(fingerprints.size, 5);
  assert.deepEqual(TRACKS[3].notes.slice(0, 7), [62, 67, 67, 69, 67, 66, 64]);
  assert.deepEqual(TRACKS[4].notes.slice(1, 6), [64, 64, 67, 67, 67]);
});

test("every village has measured windows, lamps and independent lighting groups", async () => {
  const { architecturalBulbs, decorBulbs } = await import(
    "../src/decor-lights.ts"
  );
  const { VILLAGES } = await import("../src/catalog.ts");
  const { lightLevel } = await import("../src/lighting.ts");
  for (const { id } of VILLAGES) {
    const bulbs = architecturalBulbs(id);
    assert.ok(bulbs.filter((b) => b.kind === "lamp").length >= 4);
    assert.ok(bulbs.filter((b) => b.kind === "window").length >= 10);
    for (const b of [...bulbs, ...decorBulbs(id)]) {
      assert.ok(b.x > 0 && b.x < 512 && b.y > 0 && b.y < 505);
      assert.equal(
        lightLevel("all", 2, 0, false, 0),
        lightLevel("all", 2, 11, false, b.group),
      );
    }
  }
  const levels = [0, 1, 2].map((group) =>
    lightLevel("alternate", 1, 0, false, group),
  );
  assert.ok(Math.max(...levels) - Math.min(...levels) > 0.8);
  const gentle = Array.from({ length: 60 }, (_, t) =>
    lightLevel("gentle", t / 2, 0),
  );
  assert.ok(Math.max(...gentle) - Math.min(...gentle) > 0.35);
});

test("portal masks preserve aperture interiors and reject stone at each village entrance", async () => {
  const { tunnelPortals, inPortal } = await import("../src/tunnel.ts");
  const { VILLAGES } = await import("../src/catalog.ts");
  for (const { id } of VILLAGES)
    for (const p of tunnelPortals(id)) {
      assert.ok(inPortal(id, p.x, p.y));
      assert.ok(inPortal(id, p.x, p.bottom));
      assert.ok(!inPortal(id, p.x, p.y - p.ry - 1));
      assert.ok(!inPortal(id, p.x + p.rx + 1, p.y));
      assert.ok(!inPortal(id, p.x, p.bottom + 1));
    }
});
