import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLighting } from "../src/lighting.ts";
import { SnowBudget, SNOW_COUNTS } from "../src/snow.ts";
import { TRACKS } from "../src/catalog.ts";
import { synthMusic } from "../src/music-synth.ts";
test("lighting has four modes, defaults gentle, and never cycles OFF", () => {
  let state = { lightPattern: "gentle" };
  const ids = [];
  for (let i = 0; i < 5; i++) {
    state = nextLighting(state);
    ids.push(state.lightPattern);
    assert.equal(state.lights, undefined);
  }
  assert.deepEqual(ids, ["all", "alternate", "random", "gentle", "all"]);
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
  assert.equal(TRACKS[3].name, "거룩한 밤");
  assert.equal(TRACKS[4].name, "오 베들레헴 작은 골");
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
  assert.deepEqual(TRACKS[3].notes.slice(1, 6), [64, 64, 67, 67, 67]);
  assert.deepEqual(
    TRACKS[4].notes.slice(0, 8),
    [69, 69, 69, 68, 69, 72, 70, 62],
  );
});

test("every village controls lamps only; windows and tunnel mouths have no modulation overlay", async () => {
  const { architecturalBulbs, decorBulbs } = await import(
    "../src/decor-lights.ts"
  );
  const { VILLAGES } = await import("../src/catalog.ts");
  const { lightLevel } = await import("../src/lighting.ts");
  for (const { id } of VILLAGES) {
    const bulbs = architecturalBulbs(id);
    assert.ok(bulbs.filter((b) => b.kind === "lamp").length >= 4);
    assert.ok(!bulbs.some((b) => b.kind === "window"));
    assert.deepEqual(decorBulbs(id), []);
    for (const b of [...bulbs, ...decorBulbs(id)]) {
      assert.ok(b.x > 0 && b.x < 512 && b.y > 0 && b.y < 505);
      assert.equal(
        lightLevel("all", 2, 0, false, 0),
        lightLevel("all", 2, 11, false, b.x / 512),
      );
    }
  }
  const levels = [0, 0.5, 1].map((x) =>
    lightLevel("alternate", 0, 0, false, x),
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

test("extra glare attacks quickly and fades to zero without changing the four source patterns", async () => {
  const { extraLightLevel, LIGHT_PATTERNS } = await import("../src/lighting.ts");
  assert.equal(extraLightLevel("all", 1.5, 0), 0);
  assert.equal(extraLightLevel("all", .5, 0), 1);
  assert.ok(extraLightLevel("all", 1.02, 0) > .5, "decay should retain a soft tail");
  assert.ok(extraLightLevel("all", 2.06, 0) > .75, "attack should be faster than decay");
  for (const { id } of LIGHT_PATTERNS) {
    for (let i = 0; i < 100; i++) {
      const level = extraLightLevel(id, i / 20, i, false, (i % 10) / 10);
      assert.ok(level >= 0 && level <= 1);
    }
    assert.equal(extraLightLevel(id, 2, 0, true), .35);
  }
});

test("powder snow shrinks every depth by 45% while preserving the 74-particle budget", async () => {
  const { snowSize, snowLayer } = await import("../src/snow.ts");
  for (const [depth, base] of [["back", 2], ["mid", 4], ["front", 7]]) {
    for (let i = 0; i < 3; i++) assert.equal(snowSize(depth, i), (base + i) * 1.75 * .55);
    assert.equal((snowLayer(depth).match(/<i /g) ?? []).length, SNOW_COUNTS.high[depth]);
  }
  assert.ok(snowSize("front", 0) > snowSize("mid", 0));
  assert.ok(snowSize("mid", 0) > snowSize("back", 0));
});
