import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consist,
  RADIUS,
  COUPLER_LENGTH,
  CAR_LENGTHS,
  TRAIN_SECONDS,
  TREE_SECONDS,
} from "../src/kinematics.ts";
import { defaults, parsePreferences } from "../src/state.ts";
import { readFile } from "node:fs/promises";
test("connected carriages stay on one circular ground track and couplers attach through a complete circuit", () => {
  for (let k = 0; k <= 1440; k++) {
    const cars = consist((k / 1440) * Math.PI * 2);
    cars.forEach((p, i) => {
      assert.ok(Math.abs(Math.hypot(p.x, p.z) - RADIUS) < 1e-12);
      assert.ok(
        Math.abs(
          Math.hypot(p.front.x - p.rear.x, p.front.z - p.rear.z) -
            CAR_LENGTHS[i],
        ) < 1e-12,
      );
      assert.ok(Math.abs(Math.cos(p.yaw) + Math.sin(p.angle)) < 1e-12);
      if (i) {
        const lead = cars[i - 1];
        assert.ok(
          Math.abs(
            Math.hypot(lead.rear.x - p.front.x, lead.rear.z - p.front.z) -
              COUPLER_LENGTH,
          ) < 1e-9,
        );
        assert.ok(lead.angle - p.angle > 0);
        assert.ok(
          Math.hypot(lead.x - p.x, lead.z - p.z) >
            (CAR_LENGTHS[i - 1] + CAR_LENGTHS[i]) / 2,
        );
      }
    });
  }
  assert.ok(TRAIN_SECONDS >= 15 && TRAIN_SECONDS <= 20);
  assert.ok(TREE_SECONDS >= 30 && TREE_SECONDS <= 40);
});
test("new controls default to on and safely migrate old saved preferences", () => {
  for (const p of [defaults(), parsePreferences('{"night":false}')]) {
    assert.equal(p.motion, true);
    assert.equal(p.lights, true);
    assert.equal(p.snow, true);
  }
  const p = parsePreferences('{"motion":false,"lights":false}');
  assert.equal(p.motion, false);
  assert.equal(p.lights, false);
});
test("checked historical scores have public-domain declarations, not licensed third-party recordings", async () => {
  for (const file of ["silent-night", "joy-to-world", "hark-herald"])
    assert.match(
      await readFile(
        new URL(`../docs/music-sources/${file}.ly`, import.meta.url),
        "utf8",
      ),
      /copyright\s*=\s*"Public Domain"/,
    );
});

test("six calibrated railways meet their own atlas tunnel contact points and stay on the trackbed", async () => {
  const { RAIL_PROFILES, PORTAL_ANGLE, projectRail, railCalibration } =
    await import("../src/rail-profiles.ts");
  const profiles = Object.entries(RAIL_PROFILES);
  assert.equal(profiles.length, 6);
  for (const [id, p] of profiles) {
    const right = projectRail(id, PORTAL_ANGLE),
      left = projectRail(id, Math.PI - PORTAL_ANGLE),
      front = projectRail(id, Math.PI / 2);
    assert.ok(Math.abs(right.x - p.right[0]) < 1e-8);
    assert.ok(Math.abs(right.y - p.right[1]) < 1e-8);
    assert.ok(Math.abs(left.x - p.left[0]) < 1e-8);
    assert.ok(Math.abs(left.y - p.left[1]) < 1e-8);
    assert.ok(Math.abs(front.y - p.front[1]) < 1e-8);
    const c = railCalibration(id);
    assert.ok(c.elevation > 0.35 && c.elevation < 0.8);
    for (let i = 0; i < 720; i++) {
      const cars = consist((i / 720) * Math.PI * 4, c.scale);
      for (let j = 1; j < cars.length; j++)
        assert.ok(
          Math.abs(
            Math.hypot(
              cars[j - 1].rear.x - cars[j].front.x,
              cars[j - 1].rear.z - cars[j].front.z,
            ) -
              COUPLER_LENGTH * c.scale,
          ) < 1e-9,
        );
    }
  }
  assert.ok(RAIL_PROFILES.cozy.front[1] - RAIL_PROFILES.workshop.front[1] > 40);
});
test("four gentle lighting patterns are bounded, continuous, distinct and static under reduced motion", async () => {
  const { lightLevel, LIGHT_PATTERNS } = await import("../src/lighting.ts");
  assert.equal(LIGHT_PATTERNS.length, 4);
  for (const { id } of LIGHT_PATTERNS) {
    for (let i = 0; i < 9; i++)
      for (let t = 0; t < 25; t += 0.1) {
        const a = lightLevel(id, t, i),
          b = lightLevel(id, t + 0.01, i);
        assert.ok(a >= 0 && a <= 1);
        assert.ok(Math.abs(a - b) < 0.015);
        assert.equal(lightLevel(id, t, i, true), 0.78);
      }
  }
  assert.equal(lightLevel("all", 2, 0), lightLevel("all", 2, 5));
  assert.notEqual(lightLevel("alternate", 2, 0), lightLevel("alternate", 2, 1));
  assert.notEqual(lightLevel("random", 2, 0), lightLevel("random", 2, 1));
  assert.ok(lightLevel("gentle", 1, 8) >= 0.65);
  const p = parsePreferences('{"lightPattern":"alternate"}');
  assert.equal(p.lightPattern, "alternate");
  assert.equal(
    parsePreferences('{"lightPattern":"fake"}').lightPattern,
    "gentle",
  );
});
