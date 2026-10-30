import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAR_SPACING, LAP_MS, TRACK, TRACK_LENGTH, trainPose } from '../src/train-path.ts';
import { TrainClock } from '../src/train-clock.ts';

test('all three wheel anchors follow the measured ellipse through the loop seam', () => {
  const headings = new Set();
  let minGap = Infinity;
  for (let i = 0; i <= 2048; i++) {
    const distance = i / 2048 * TRACK_LENGTH;
    const cars = [0, 1, 2].map(car => trainPose(distance - car * CAR_SPACING));
    for (const p of cars) {
      assert.ok(Math.abs(((p.x - TRACK.cx) / TRACK.rx) ** 2 + ((p.y - TRACK.cy) / TRACK.ry) ** 2 - 1) < 1e-10);
      assert.ok(p.scale >= .72 && p.scale <= 1);
      assert.ok(p.x >= 100 && p.x <= 900);
      assert.equal(p.z, p.depth < .5 ? 2 : 11);
      headings.add(p.direction);
    }
    for (let car = 1; car < 3; car++) {
      minGap = Math.min(minGap, Math.hypot(cars[car].x - cars[car - 1].x, cars[car].y - cars[car - 1].y));
    }
  }
  assert.equal(headings.size, 8);
  assert.ok(minGap > 120, `Wheelbase anchors too close: ${minGap}`);
  const before = trainPose(TRACK_LENGTH - .001), after = trainPose(.001);
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < .003);
});

test('arc-length lookup maintains consistent speed on straight and curved track sections', () => {
  const steps = Array.from({ length: 1000 }, (_, i) => {
    const a = trainPose(i / 1000 * TRACK_LENGTH), b = trainPose((i + 1) / 1000 * TRACK_LENGTH);
    return Math.hypot(b.x - a.x, b.y - a.y);
  });
  assert.ok(Math.max(...steps) / Math.min(...steps) < 1.002);
});

test('one lap takes 14 seconds and pause/resume preserves position without a catch-up jump', () => {
  const clock = new TrainClock();
  clock.tick(0); clock.tick(LAP_MS);
  const initial = trainPose(TRACK_LENGTH * .75), afterLap = trainPose(clock.distance);
  assert.ok(Math.hypot(initial.x - afterLap.x, initial.y - afterLap.y) < 1e-8);
  clock.setWanted(false);
  const distance = clock.distance;
  clock.tick(99_000); assert.equal(clock.distance, distance);
  clock.setWanted(true); clock.tick(150_000); assert.equal(clock.distance, distance);
  clock.tick(150_100); assert.ok(clock.distance > distance);
});

test('background/reduced-motion gates preserve user pause intent and exclude blocked time', () => {
  const clock = new TrainClock();
  clock.tick(0); clock.tick(100);
  const start = clock.distance;
  clock.setHidden(true); clock.tick(5000); assert.equal(clock.distance, start);
  clock.setHidden(false); clock.tick(8000); assert.equal(clock.distance, start);
  clock.setReduced(true); clock.tick(9000); assert.equal(clock.active, false);
  clock.setReduced(false); clock.tick(15000); assert.equal(clock.distance, start);
  clock.setWanted(false); clock.setHidden(true); clock.setHidden(false);
  assert.equal(clock.active, false);
  assert.equal(clock.distance, start);
});
