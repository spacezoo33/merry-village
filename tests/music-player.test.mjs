import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeContext } from "./helpers/audio.mjs";
import { MusicPlayer } from "../src/music.ts";
import { audioContext, disposeAudio } from "../src/audio-engine.ts";
test("all tracks play with one source; pause, seek, loop and real end callbacks remain independent", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeContext;
  let ended = 0;
  const p = new MusicPlayer(
    "snow",
    0.35,
    () => {},
    () => ended++,
  );
  try {
    for (const id of [
      "snow",
      "starlight",
      "waltz",
      "holy-night",
      "bethlehem",
    ]) {
      p.select(id);
      await p.play();
      assert.equal(p.state, "playing");
      const c = audioContext(),
        source = c.sources.at(-1);
      assert.ok(source.buffer.duration > 20);
      c.currentTime += 2;
      p.pause();
      assert.equal(p.state, "paused");
      assert.ok(p.currentTime >= 1.9);
      await p.play();
      p.setRepeat(true);
      assert.equal(c.sources.at(-1).loop, true);
      p.seek(p.duration - 0.1);
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(c.sources.at(-1).loop, true);
      p.setRepeat(false);
      const final = c.sources.at(-1);
      final.onended();
      assert.equal(
        ended,
        ["snow", "starlight", "waltz", "holy-night", "bethlehem"].indexOf(id) +
          1,
      );
    }
    p.select("holy-night");
    await p.play();
    p.setHidden(true);
    assert.equal(p.state, "paused");
    assert.equal(ended, 5);
    p.setHidden(false);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(p.state, "playing");
    p.setVolume(0);
    p.pause();
    assert.equal(ended, 5);
  } finally {
    p.destroy();
    disposeAudio();
    globalThis.AudioContext = original;
  }
});

test("all five selections loop by default and an end callback never advances a looping source", async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = FakeContext;
  let ended = 0;
  const p = new MusicPlayer("snow", .35, () => {}, () => ended++);
  try {
    for (const id of ["snow", "starlight", "waltz", "holy-night", "bethlehem"]) {
      p.select(id); await p.play();
      const source = audioContext().sources.at(-1);
      assert.equal(source.loop, true);
      source.onended();
      assert.equal(ended, 0);
      assert.equal(p.state, "playing");
    }
  } finally { p.destroy(); disposeAudio(); globalThis.AudioContext = original; }
});
