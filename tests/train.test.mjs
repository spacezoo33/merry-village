import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAP_MS, TRACK, TRACK_LENGTH, trainPose } from '../src/train-path.ts';
import { CARS, COUPLER_LENGTH, consistPose } from '../src/train-consist.ts';
import { TrainClock } from '../src/train-clock.ts';

function hull(p) {
  const model = CARS[p.index], half = model.length * p.scale / 2, width = model.width * p.scale / 2;
  const f = p.forward, n = { x: -f.y, y: f.x };
  return [-1, 1].flatMap(a => [-1, 1].map(b => ({ x: p.centre.x + a * f.x * half + b * n.x * width, y: p.centre.y + a * f.y * half + b * n.y * width })));
}
function separation(a, b) {
  const ah = hull(a), bh = hull(b);
  return Math.max(...[a.forward, { x: -a.forward.y, y: a.forward.x }, b.forward, { x: -b.forward.y, y: b.forward.x }].map(axis => {
    const aa = ah.map(v => v.x * axis.x + v.y * axis.y), bb = bh.map(v => v.x * axis.x + v.y * axis.y);
    return Math.max(Math.min(...aa) - Math.max(...bb), Math.min(...bb) - Math.max(...aa));
  }));
}

test('both bogies of every vehicle stay on the visible rail throughout a full lap', () => {
  const headings = new Set();
  for (let i = 0; i <= 1024; i++) {
    for (const p of consistPose(i / 1024 * TRACK_LENGTH)) {
      for (const axle of [p.frontAxle, p.rearAxle]) {
        assert.ok(Math.abs(((axle.x - TRACK.cx) / TRACK.rx) ** 2 + ((axle.y - TRACK.cy) / TRACK.ry) ** 2 - 1) < 1e-10);
      }
      assert.ok(p.scale >= .72 && p.scale <= 1);
      headings.add(p.direction);
      assert.equal(p.z, Math.round(p.position.y));
    }
  }
  assert.equal(headings.size, 8);
});

test('couplers keep their physical length and rigid car bodies never intersect, including both curves', () => {
  for (let i = 0; i <= 1024; i++) {
    const cars = consistPose(i / 1024 * TRACK_LENGTH);
    for (let car = 1; car < 3; car++) {
      const a = cars[car - 1], b = cars[car];
      const gap = Math.hypot(a.rear.x - b.front.x, a.rear.y - b.front.y);
      assert.ok(Math.abs(gap - COUPLER_LENGTH * (a.scale + b.scale) / 2) < 1e-6);
      assert.ok(a.distance > b.distance, 'follower overtook its leader');
      assert.ok(separation(a, b) > 1, 'car body overlap on a curve');
    }
  }
});

test('the chassis follows the projected tangent and every joint is continuous across the lap seam', () => {
  for (let i = 0; i < 100; i++) {
    const [p] = consistPose(i / 100 * TRACK_LENGTH);
    const a = p.frontAxle, b = p.rearAxle;
    const dx = a.x - b.x, dy = (a.y - b.y) * TRACK.rx / TRACK.ry;
    assert.ok(Math.abs(dx * p.forward.y - dy * p.forward.x) < 1e-8);
  }
  const before = consistPose(TRACK_LENGTH - .00001), after = consistPose(.00001);
  for (let car = 0; car < 3; car++) for (const key of ['position', 'frontHitch', 'rearHitch']) {
    assert.ok(Math.hypot(before[car][key].x - after[car][key].x, before[car][key].y - after[car][key].y) < .0001);
  }
  assert.deepEqual(trainPose(0), trainPose(TRACK_LENGTH));
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
