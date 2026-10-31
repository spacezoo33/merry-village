import assert from "node:assert/strict";
import { test } from "node:test";
import { VILLAGES, NIGHTS, TRACKS } from "../src/catalog.ts";
import { villageObjects } from "../src/layouts.ts";
import {
  defaults,
  parsePreferences,
  PASS_MS,
  passForReward,
  hasPass,
  reconcileAccess,
  validPass,
} from "../src/state.ts";
import { watchReward } from "../src/ad-session.ts";

test("legacy layouts remain recoverable; catalog provides three free and three special villages with distinct carols", () => {
  assert.equal(VILLAGES.filter((v) => !v.premium).length, 3);
  assert.equal(VILLAGES.filter((v) => v.premium).length, 3);
  const layouts = VILLAGES.map((v) => villageObjects(v.id));
  assert.equal(new Set(layouts.map((l) => JSON.stringify(l))).size, 6);
  for (const layout of layouts) {
    assert.equal(layout[0].asset, "base");
    assert.ok(layout.length >= 7);
    for (const o of layout) {
      assert.ok(o.x >= 0 && o.width > 0 && o.x + o.width <= 1005);
      assert.ok(o.y >= 0);
    }
  }
  assert.ok(villageObjects("workshop").some((o) => o.asset === "workshop"));
  assert.ok(villageObjects("palace").some((o) => o.asset === "palace"));
  assert.ok(
    villageObjects("gingerbread").some((o) => o.asset === "gingerbread"),
  );
  assert.equal(NIGHTS.length, 3);
  assert.equal(TRACKS.length, 5);
  assert.equal(TRACKS.filter((t) => t.available).length, 4);
  assert.equal(
    new Set(TRACKS.filter((t) => t.available).map((t) => t.notes.join(",")))
      .size,
    4,
  );
  for (const track of TRACKS.filter((t) => t.available)) {
    assert.ok(track.notes.some((n) => n > 0));
    assert.ok(track.notes.length >= 32);
  }
});
test("preferences handle corrupt/unavailable data, invalid identifiers and unsafe volume", () => {
  assert.deepEqual(parsePreferences("{bad"), defaults());
  assert.deepEqual(parsePreferences("null"), defaults());
  const p = parsePreferences(
    JSON.stringify({
      village: "fake",
      track: "fake",
      volume: 99,
      snow: false,
      night: true,
      effect: "aurora",
      pass: { source: "rewarded", grantedAt: 1, expiresAt: 2 },
    }),
  );
  assert.equal(p.village, "cozy");
  assert.equal(p.track, "snow");
  assert.equal(p.volume, 1);
  assert.equal(p.snow, false);
  assert.equal(p.night, true);
  assert.equal(p.pass, null);
});
test("only earned rewards issue an exact seven-day receipt; expiry revokes premium selections", () => {
  const now = 1_800_000_000_000;
  assert.equal(passForReward(now, false), null);
  const pass = passForReward(now, true);
  assert.equal(pass.expiresAt - now, PASS_MS);
  assert.equal(hasPass(pass, now), true);
  assert.equal(hasPass(pass, now + PASS_MS - 1), true);
  assert.equal(hasPass(pass, now + PASS_MS), false);
  assert.equal(hasPass(pass, now - 1), false);
  assert.equal(validPass({ ...pass, expiresAt: now + PASS_MS + 1 }), null);
  const p = { ...defaults(), village: "palace", effect: "aurora", pass };
  assert.equal(reconcileAccess(p, now + 1), false);
  assert.equal(reconcileAccess(p, now + PASS_MS), true);
  assert.equal(p.village, "cozy");
  assert.equal(p.effect, null);
});
test("an impression, show, dismissal or ad failure alone never grants a pass", async () => {
  for (const events of [["other", "dismissed"], ["failedToShow"]]) {
    const result = await watchReward(
      {
        load: (loaded) => {
          loaded();
          return () => {};
        },
        show: (event) => {
          events.forEach((e) => event(e));
          return () => {};
        },
      },
      () => {},
      100,
    );
    assert.equal(result, false);
  }
  assert.equal(
    await watchReward(
      {
        load: (_, error) => {
          error();
          return () => {};
        },
        show: () => {
          throw Error("must not show");
        },
      },
      () => {},
      100,
    ),
    false,
  );
});
test("duplicate load and reward callbacks show one ad, clean up and settle once", async () => {
  let load,
    emit,
    shows = 0,
    cleaned = 0;
  const pending = watchReward(
    {
      load: (fn) => {
        load = fn;
        return () => cleaned++;
      },
      show: (fn) => {
        shows++;
        emit = fn;
        return () => cleaned++;
      },
    },
    () => {},
    100,
  );
  load();
  load();
  emit("userEarnedReward");
  emit("userEarnedReward");
  emit("dismissed");
  emit("dismissed");
  assert.equal(await pending, true);
  assert.equal(shows, 1);
  assert.equal(cleaned, 2);
});
test("an ad that never loads times out without a reward", async () => {
  assert.equal(
    await watchReward(
      { load: () => () => {}, show: () => () => {} },
      () => {},
      5,
    ),
    false,
  );
});
