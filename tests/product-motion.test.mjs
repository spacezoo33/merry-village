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
  assert.equal(TRAIN_SECONDS, 13);
  assert.ok(TREE_SECONDS >= 30 && TREE_SECONDS <= 40);
});
test("new controls default to on and safely migrate old saved preferences", () => {
  for (const p of [defaults(), parsePreferences('{"night":false}')]) {
    assert.equal(p.motion, true);
    assert.equal(p.lights, undefined);
    assert.equal(p.snow, true);
  }
  const p = parsePreferences('{"motion":false,"lights":false}');
  assert.equal(p.motion, false);
  assert.equal(p.lights, undefined);
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

test("seven calibrated railways meet their own atlas tunnel contact points and stay on the trackbed", async () => {
  const { RAIL_PROFILES, PORTAL_ANGLE, projectRail, railCalibration } =
    await import("../src/rail-profiles.ts");
  const profiles = Object.entries(RAIL_PROFILES);
  assert.equal(profiles.length, 7);
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
  assert.notEqual(RAIL_PROFILES.cozy.front[1], RAIL_PROFILES.palace.front[1]);
});
test("four lighting modes honor timing, actual screen position and reduced-motion safety", async () => {
  const { lightLevel, LIGHT_PATTERNS } = await import("../src/lighting.ts");
  assert.equal(LIGHT_PATTERNS.length, 4);
  assert.equal(lightLevel("all", 0.99, 0), 1);
  assert.equal(lightLevel("all", 1, 0), 0);
  assert.equal(lightLevel("all", 2, 0), 1);
  assert.equal(lightLevel("alternate", 0, 3, false, 0.03), 1);
  assert.equal(lightLevel("alternate", 0, 0, false, 0.95), 0);
  assert.equal(lightLevel("alternate", 3.5, 0, false, 0.95), 1);
  assert.equal(lightLevel("alternate", 3.5, 3, false, 0.03), 0);
  const before = Array.from({ length: 75 }, (_, i) =>
    lightLevel("random", 0.49, i),
  );
  const after = Array.from({ length: 75 }, (_, i) =>
    lightLevel("random", 0.5, i),
  );
  assert.notDeepEqual(before, after);
  assert.ok(before.some(Boolean) && after.some(Boolean));
  for (const { id } of LIGHT_PATTERNS)
    for (let i = 0; i < 80; i++)
      for (let t = 0; t < 5; t += 0.13) {
        const v = lightLevel(id, t, i);
        assert.ok(v >= 0 && v <= 1);
        assert.equal(lightLevel(id, t, i, true), 0.78);
      }
  for (let t = 0; t < 3; t += 0.1) {
    assert.equal(lightLevel("gentle", t, 0), lightLevel("gentle", t, 12));
    assert.ok(
      Math.abs(lightLevel("gentle", t, 0) - lightLevel("gentle", t + 2.8, 0)) <
        1e-10,
    );
  }
  assert.equal(parsePreferences('{"lights":false}').lightPattern, "gentle");
});
