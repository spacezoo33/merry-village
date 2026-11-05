import { test } from "node:test";
import assert from "node:assert/strict";
import { TrainSound } from "../src/train-sound.ts";
import { disposeAudio, audioContext, createAudioBus, STEM_GAIN } from "../src/audio-engine.ts";
import { TRAIN_LAP_SECONDS, journeyLap } from "../src/train-timing.ts";
import { RAIL_PROFILES, railCalibration, projectRail } from "../src/rail-profiles.ts";
import { wait, FakeContext } from "./helpers/audio.mjs";

test("only laps 6, 12 and 18 sound at visible camera-centre crossings in all seven villages", async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = FakeContext;
  try {
    assert.equal(TRAIN_LAP_SECONDS, 13);
    for (const id of Object.keys(RAIL_PROFILES)) {
      const sound = new TrainSound(() => {}), emitted = [];
      try {
        sound.setRunning(true); await wait();
        const c = railCalibration(id);
        for (let frame = 0; frame < 18 * 13 * 30; frame++) {
          const progress = frame / (13 * 30) * 2 * Math.PI, angle = .85 + progress;
          const journey = .65 + frame / 30, lap = journeyLap(progress);
          audioContext().currentTime = journey;
          const before = sound.diagnostics.horns;
          sound.updatePosition(journey, projectRail(id, angle).x / 512,
            c.radius * Math.sin(angle) >= c.tunnelZ, id, lap);
          if (sound.diagnostics.horns > before) emitted.push(lap);
        }
        assert.deepEqual(emitted, [6, 12, 18], id);
        const times = sound.diagnostics.hornTimes;
        for (let i = 1; i < times.length; i++) assert.ok(Math.abs(times[i] - times[i - 1] - 78) < .04);
      } finally { sound.destroy(); disposeAudio(); }
    }
  } finally { globalThis.AudioContext = original; }
});

test("OFF freezes eligibility; resume and village replacement preserve the lap and deduplication", async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = FakeContext;
  const sound = new TrainSound(() => {});
  const cross = (time, village, lap, visible = true) => {
    sound.updatePosition(time, .52, visible, village, lap);
    sound.updatePosition(time + .1, .49, visible, village, lap);
  };
  try {
    sound.setRunning(true); await wait();
    cross(2, "cozy", 1); cross(54, "cozy", 5);
    assert.equal(sound.diagnostics.horns, 0);
    sound.setRunning(false);
    cross(67, "cozy", 6); assert.equal(sound.diagnostics.horns, 0);
    sound.setRunning(true); await wait();
    cross(67, "cozy", 6); assert.equal(sound.diagnostics.horns, 1);
    cross(67.2, "cozy", 6); cross(67.4, "forest", 6);
    assert.equal(sound.diagnostics.horns, 1, "same lap must not replay on village replacement");
    cross(145, "forest", 12, false); assert.equal(sound.diagnostics.horns, 1);
    cross(223, "forest", 18); assert.equal(sound.diagnostics.horns, 2);
    sound.setRunning(false);
    assert.ok(audioContext().oscillators.every(n => n.stopAt === audioContext().currentTime));
  } finally { sound.destroy(); disposeAudio(); globalThis.AudioContext = original; }
});

test("route turns count from lap one; stem gain reductions preserve music and master", () => {
  assert.equal(journeyLap(0), 1);
  assert.equal(journeyLap(5 * Math.PI * 2), 6);
  assert.equal(journeyLap(17 * Math.PI * 2), 18);
  const bus = createAudioBus(new FakeContext());
  assert.deepEqual(STEM_GAIN, { music: 1, train: .75, horn: .49 });
  assert.equal(bus.inputs.music.gain.value, 1);
  assert.equal(bus.inputs.train.gain.value, .75);
  assert.equal(bus.inputs.horn.gain.value, .49);
  assert.equal(bus.output.gain.value, .9);
});
