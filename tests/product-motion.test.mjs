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
test("five distinct carols have public-domain source declarations, not licensed third-party recordings", async () => {
  for (const file of [
    "silent-night",
    "first-noel",
    "midnight-clear",
    "greensleeves",
    "holly-ivy",
  ])
    assert.match(
      await readFile(
        new URL(`../docs/music-sources/${file}.ly`, import.meta.url),
        "utf8",
      ),
      /copyright\s*=\s*"Public Domain"/,
    );
});
