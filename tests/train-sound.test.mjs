import { test } from "node:test";
import assert from "node:assert/strict";
import { TrainSound } from "../src/train-sound.ts";
import { disposeAudio, audioContext } from "../src/audio-engine.ts";
const wait = () => new Promise((r) => setTimeout(r, 0));
const parameter = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
});
class FakeContext {
  currentTime = 0;
  state = "suspended";
  destination = {};
  oscillators = [];
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  createGain() {
    return { gain: parameter(), connect() {}, disconnect() {} };
  }
  createBiquadFilter() {
    return { frequency: parameter(), connect() {}, disconnect() {} };
  }
  createBuffer(channels, length, rate) {
    assert.equal(channels, 1);
    const data = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => data };
  }
  createBufferSource() {
    return {
      connect() {},
      disconnect() {},
      start() {},
      stop() {
        this.onended?.();
      },
    };
  }
  createOscillator() {
    const node = {
      frequency: parameter(),
      connect() {},
      disconnect() {},
      start(at) {
        this.startAt = at;
      },
      stop(at) {
        this.stopAt = at;
      },
    };
    this.oscillators.push(node);
    return node;
  }
}
test("train pause freezes its own horn clock while the shared music/device clock keeps advancing", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  const sound = new TrainSound(() => {});
  try {
    sound.setRunning(true);
    await wait();
    const c = audioContext();
    assert.equal(sound.diagnostics.running, true);
    c.currentTime = 27.1;
    assert.equal(sound.diagnostics.horns, 1);
    sound.setRunning(false);
    const paused = sound.diagnostics;
    c.currentTime += 100;
    assert.equal(sound.diagnostics.horns, 1);
    assert.equal(sound.diagnostics.puffs, paused.puffs);
    assert.equal(sound.diagnostics.untilHorn, paused.untilHorn);
    const previous = c.oscillators.length;
    sound.setRunning(true);
    await wait();
    const starts = c.oscillators.slice(previous).map((n) => n.startAt);
    assert.ok(starts.length >= 3);
    assert.ok(Math.abs(starts[0] - 156) < 1e-8);
    c.currentTime = 155.9;
    assert.equal(sound.diagnostics.horns, 1);
    c.currentTime = 156.1;
    assert.equal(sound.diagnostics.horns, 2);
    assert.equal(c.state, "running");
    sound.setRunning(false);
    assert.equal(c.state, "running", "train stop must not pause music/device");
  } finally {
    sound.destroy();
    disposeAudio();
    globalThis.AudioContext = original;
  }
});
