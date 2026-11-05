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
  canUseVillage,
  grantVillagePass,
  canUseNight,
  grantNightPass,
} from "../src/state.ts";
import { watchReward } from "../src/ad-session.ts";

test("legacy layouts remain recoverable; catalog provides three free and four special villages with distinct carols", () => {
  assert.equal(VILLAGES.filter((v) => !v.premium).length, 3);
  assert.equal(VILLAGES.filter((v) => v.premium).length, 4);
  const layouts = ["cozy", "forest", "chapel", "workshop", "palace", "gingerbread"].map(villageObjects);
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
  assert.equal(TRACKS.filter((t) => t.available).length, 5);
  assert.equal(
    new Set(TRACKS.filter((t) => t.available).map((t) => t.notes.join(",")))
      .size,
    5,
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
  const p = { ...defaults(), village: "palace", effect: "aurora", pass, nightPasses: { aurora: pass }, villagePasses: { palace: pass } };
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

test("a conflicting failure or missing dismissal never grants a reward even after an earned callback", async () => {
  for (const kind of ["failedToShow", "error", "timeout"]) {
    const result = await watchReward(
      {
        load: (loaded) => {
          loaded();
          return () => {};
        },
        show: (event, error) => {
          event("userEarnedReward");
          if (kind === "error") error();
          else if (kind === "failedToShow") event("failedToShow");
          return () => {};
        },
      },
      () => {},
      5,
    );
    assert.equal(result, false, kind);
  }
});
test("removed song IDs and old lighting OFF state migrate without restoring removed content", () => {
  for (const track of ["lullaby", "letter"])
    assert.equal(
      parsePreferences(JSON.stringify({ track })).track,
      "holy-night",
    );
  const state = parsePreferences('{"lights":false,"lightPattern":"gentle"}');
  assert.equal(state.lights, undefined);
  assert.equal(state.lightPattern, "gentle");
});


test("four village rewards are independent, cannot stack, and never unlock nights", () => {
  const p = defaults(), now = 1800000000000;
  const ids = VILLAGES.filter(v => v.premium).map(v => v.id);
  assert.deepEqual(ids, ["palace", "gingerbread", "aurora-lake", "observatory"]);
  for (const id of ids) assert.equal(canUseVillage(p, id, now), false);
  assert.equal(grantVillagePass(p, "palace", now, false), false);
  assert.deepEqual(p.villagePasses, {});
  assert.equal(grantVillagePass(p, "palace", now, true), true);
  assert.equal(canUseVillage(p, "gingerbread", now), false);
  assert.equal(hasPass(p.pass, now), false);
  const expiry = p.villagePasses.palace.expiresAt;
  assert.equal(grantVillagePass(p, "palace", now + 1, true), false);
  assert.equal(p.villagePasses.palace.expiresAt, expiry);
  for (const id of ids.slice(1)) assert.equal(grantVillagePass(p, id, now + 1000, true), true);
  assert.equal(canUseVillage(p, "palace", now + PASS_MS), false);
  assert.equal(canUseVillage(p, "gingerbread", now + PASS_MS), true);
  p.village = "palace";
  p.pass = passForReward(now + 1000, true); p.nightPasses.aurora = p.pass; p.effect = "aurora";
  reconcileAccess(p, now + PASS_MS);
  assert.equal(p.village, "cozy"); assert.equal(p.effect, "aurora");
  const restored = parsePreferences(JSON.stringify(p));
  assert.deepEqual(restored.villagePasses, p.villagePasses);
});
test("legacy global pass and repeat OFF migrate without granting four village rewards", () => {
  const now = 1800000000000;
  const p = parsePreferences(JSON.stringify({ village: "workshop", repeat: false, pass: passForReward(now, true) }));
  assert.equal(p.village, "cozy"); assert.equal(p.repeat, true);
  for (const v of VILLAGES.filter(v => v.premium)) assert.equal(canUseVillage(p, v.id, now), false);
  assert.equal(hasPass(p.pass, now), true);
});


test("three night receipts are independent from each other and all four village receipts", () => {
  const p = defaults(), now = 1800000000000;
  assert.deepEqual(NIGHTS.map(n => n.id), ["moonlight", "shooting", "aurora"]);
  for (const n of NIGHTS) assert.equal(canUseNight(p, n.id, now), false);
  assert.equal(grantNightPass(p, "moonlight", now, false), false);
  assert.deepEqual(p.nightPasses, {});
  assert.equal(grantNightPass(p, "moonlight", now, true), true);
  const receipt = { ...p.nightPasses.moonlight };
  assert.equal(grantNightPass(p, "moonlight", now + 1000, true), false);
  assert.deepEqual(p.nightPasses.moonlight, receipt);
  assert.equal(canUseNight(p, "shooting", now), false);
  assert.equal(canUseNight(p, "aurora", now), false);
  for (const v of VILLAGES.filter(v => v.premium)) assert.equal(canUseVillage(p, v.id, now), false);
  grantNightPass(p, "shooting", now + 1000, true);
  grantNightPass(p, "aurora", now + 2000, true);
  grantVillagePass(p, "palace", now + 2000, true);
  p.village = "palace"; p.effect = "moonlight";
  assert.equal(reconcileAccess(p, now + PASS_MS), true);
  assert.equal(p.effect, null); assert.equal(p.village, "palace");
  assert.equal(canUseNight(p, "shooting", now + PASS_MS), true);
  assert.equal(grantNightPass(p, "moonlight", now + PASS_MS, true), true);
  assert.equal(p.nightPasses.moonlight.expiresAt, now + 2 * PASS_MS);
});
test("legacy shared night receipt migrates only the selected theme without renewing it", () => {
  const now = 1800000000000, pass = passForReward(now, true);
  const p = parsePreferences(JSON.stringify({ pass, effect: "wishes" }));
  assert.equal(p.effect, "shooting");
  assert.deepEqual(p.nightPasses, { shooting: pass });
  assert.equal(canUseNight(p, "moonlight", now), false);
  assert.equal(canUseNight(p, "aurora", now), false);
  assert.deepEqual(parsePreferences(JSON.stringify(p)).nightPasses, p.nightPasses);
});
