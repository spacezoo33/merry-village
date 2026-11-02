import { test } from "node:test";
import assert from "node:assert/strict";
import { TrainSound } from "../src/train-sound.ts";
import { disposeAudio, audioContext } from "../src/audio-engine.ts";
import { wait, FakeContext } from "./helpers/audio.mjs";
test("horn follows visible front-centre crossings, not elapsed time, and deduplicates pause/village changes", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  const sound = new TrainSound(() => {});
  try {
    sound.setRunning(true);
    await wait();
    const c = audioContext();
    c.currentTime = 100;
    assert.equal(sound.diagnostics.horns, 0, "clock alone must never honk");
    sound.updatePosition(2, 0.55, true, "cozy");
    sound.updatePosition(2.8, 0.49, true, "cozy");
    assert.equal(sound.diagnostics.horns, 1);
    assert.equal(c.oscillators.length, 10);
    sound.updatePosition(2.8, 0.49, true, "cozy");
    sound.updatePosition(2.9, 0.48, true, "cozy");
    assert.equal(sound.diagnostics.horns, 1);
    sound.updatePosition(11, 0.52, false, "cozy");
    sound.updatePosition(11.5, 0.48, false, "cozy");
    assert.equal(sound.diagnostics.horns, 1);
    sound.setRunning(false);
    assert.ok(c.oscillators.every((n) => n.stopAt === c.currentTime));
    const puffs = sound.diagnostics.puffs;
    c.currentTime += 50;
    sound.updatePosition(20, 0.52, true, "cozy");
    sound.updatePosition(21, 0.48, true, "cozy");
    assert.equal(sound.diagnostics.horns, 1);
    assert.equal(sound.diagnostics.puffs, puffs);
    sound.setRunning(true);
    await wait();
    sound.updatePosition(21, 0.48, true, "cozy");
    assert.equal(
      sound.diagnostics.horns,
      1,
      "resume never replays a passed crossing",
    );
    sound.updatePosition(38, 0.48, true, "cozy");
    assert.equal(
      sound.diagnostics.horns,
      1,
      "a large time jump never catches up horns",
    );
    sound.updatePosition(38.1, 0.52, true, "cozy");
    sound.updatePosition(38.5, 0.48, true, "cozy");
    assert.equal(sound.diagnostics.horns, 2);
    sound.updatePosition(56, 0.52, true, "cozy");
    sound.updatePosition(56.5, 0.48, true, "cozy");
    assert.equal(sound.diagnostics.horns, 3);
    sound.updatePosition(0, 0.7, true, "forest");
    sound.updatePosition(2, 0.52, true, "forest");
    sound.updatePosition(2.8, 0.48, true, "forest");
    assert.equal(sound.diagnostics.horns, 4);
    sound.updatePosition(2.8, 0.48, true, "forest");
    assert.equal(sound.diagnostics.horns, 4);
    assert.equal(c.state, "running");
  } finally {
    sound.destroy();
    disposeAudio();
    globalThis.AudioContext = original;
  }
});

test("13-second journeys honk once per visible centre crossing in all six villages", async () => {
  const { RAIL_PROFILES, railCalibration, projectRail } = await import("../src/rail-profiles.ts");
  const { TRAIN_LAP_SECONDS } = await import("../src/train-timing.ts");
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  try {
    assert.equal(TRAIN_LAP_SECONDS, 13);
    for (const id of Object.keys(RAIL_PROFILES)) {
      const sound = new TrainSound(() => {});
      try {
        const calibration = railCalibration(id);
        assert.equal(calibration.lap, 13);
        sound.setRunning(true);
        await wait();
        for (let frame = 0; frame <= 13 * 3 * 60; frame++) {
          const journey = frame / 60;
          audioContext().currentTime = journey;
          const angle = .85 + Math.max(0, journey - .65) / calibration.lap * 2 * Math.PI;
          sound.updatePosition(journey, projectRail(id, angle).x / 512,
            calibration.radius * Math.sin(angle) >= calibration.tunnelZ, id);
        }
        assert.equal(sound.diagnostics.horns, 3, id);
        const times = sound.diagnostics.hornTimes;
        assert.ok(Math.abs(times[1] - times[0] - 13) < 1 / 60);
        assert.ok(Math.abs(times[2] - times[1] - 13) < 1 / 60);
      } finally { sound.destroy(); disposeAudio(); }
    }
  } finally { globalThis.AudioContext = original; }
});

test("a hidden-to-visible jump across centre never creates a late horn", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  const sound = new TrainSound(() => {});
  try {
    sound.setRunning(true); await wait();
    sound.updatePosition(2, .55, false, "cozy");
    sound.updatePosition(2.1, .49, true, "cozy");
    assert.equal(sound.diagnostics.horns, 0);
  } finally { sound.destroy(); disposeAudio(); globalThis.AudioContext = original; }
});
