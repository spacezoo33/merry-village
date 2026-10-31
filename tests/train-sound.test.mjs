import { test } from "node:test";
import assert from "node:assert/strict";
import { TrainSound } from "../src/train-sound.ts";
import { disposeAudio, audioContext } from "../src/audio-engine.ts";
import { wait, FakeContext } from "./helpers/audio.mjs";
import { hornDelay } from "../src/train-sound.ts";
test("horn delays use fresh random values bounded to 20–50 seconds", () => {
  assert.equal(
    hornDelay(() => 0),
    20,
  );
  assert.equal(
    hornDelay(() => 1),
    50,
  );
  assert.equal(
    hornDelay(() => 0.5),
    35,
  );
  const values = new Set(Array.from({ length: 30 }, () => hornDelay()));
  assert.ok(values.size > 25);
  assert.ok([...values].every((x) => x >= 20 && x <= 50));
});
test("stop cancels scheduled horns; restart draws a fresh interval without stopping music", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  let sample = 0;
  const sound = new TrainSound(
    () => {},
    () => sample,
  );
  try {
    sound.setRunning(true);
    await wait();
    const c = audioContext();
    assert.equal(sound.diagnostics.running, true);
    assert.equal(sound.diagnostics.untilHorn, 20);
    const scheduled = c.oscillators.slice();
    c.currentTime = 21;
    assert.equal(sound.diagnostics.horns, 1);
    sound.setRunning(false);
    assert.ok(scheduled.every((n) => n.stopAt === c.currentTime));
    const paused = sound.diagnostics;
    c.currentTime += 100;
    assert.equal(sound.diagnostics.puffs, paused.puffs);
    assert.equal(sound.diagnostics.horns, 1);
    assert.equal(sound.diagnostics.untilHorn, 0);
    sample = 0.9;
    const previous = c.oscillators.length;
    sound.setRunning(true);
    await wait();
    assert.equal(sound.diagnostics.untilHorn, 47);
    assert.ok(
      c.oscillators
        .slice(previous)
        .every((n) => n.startAt >= c.currentTime + 47),
    );
    sound.setRunning(false);
    assert.equal(c.state, "running");
  } finally {
    sound.destroy();
    disposeAudio();
    globalThis.AudioContext = original;
  }
});
