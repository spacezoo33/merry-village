import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TRACKS } from "../src/catalog.ts";
test("ST. LOUIS uses all 58 soprano pitch/duration events from the inspected Redner score", async () => {
  const source = await readFile(
    new URL("../docs/music-sources/st-louis.ly", import.meta.url),
    "utf8",
  );
  assert.match(source, /Lewis H\. Redner \(1830-1908\), 1868/);
  const melody = source.match(/Soprano =.*?\\key f \\major (.*?)\\bar/s)[1];
  let duration = 4,
    dotted = false;
  const events = [];
  for (const token of melody.split(/\s+/)) {
    const m = token.match(/^([a-gs])(is|es)?([',]*)(\d*)(\.)?$/);
    if (!m) continue;
    const [, note, acc, octave, length, dot] = m;
    if (length) {
      duration = Number(length);
      dotted = Boolean(dot);
    }
    const midi =
      note === "s"
        ? 0
        : 48 +
          { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[note] +
          12 *
            ((octave.match(/'/g) || []).length -
              (octave.match(/,/g) || []).length) +
          (acc === "is" ? 1 : acc === "es" ? -1 : 0);
    events.push(`${midi}:${(4 / duration) * (dotted ? 1.5 : 1)}`);
  }
  assert.equal(events.length, 58);
  assert.equal(TRACKS[4].id, "bethlehem");
  assert.equal(TRACKS[4].score, events.join(" "));
  assert.deepEqual(
    TRACKS.map((t) => t.name),
    [
      "고요한 밤",
      "징글벨",
      "기쁘다 구주 오셨네",
      "거룩한 밤",
      "오 베들레헴 작은 골",
    ],
  );
});
