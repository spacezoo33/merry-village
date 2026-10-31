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
    for (const id of ["snow", "starlight", "waltz", "lullaby", "letter"]) {
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
        ["snow", "starlight", "waltz", "lullaby", "letter"].indexOf(id) + 1,
      );
    }
    p.select("lullaby");
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
