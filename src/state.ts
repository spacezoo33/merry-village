import { LIGHT_PATTERNS, type LightPattern } from "./lighting.ts";
import {
  NIGHTS,
  TRACKS,
  VILLAGES, ALL_VILLAGES, BASIC_TRACK_IDS, isBasicVillage,
  type NightId,
  type TrackId,
  type VillageId, type SelectionId,
} from "./catalog.ts";
export const PASS_MS = 7 * 24 * 60 * 60 * 1000;
export type Pass = { source: "rewarded"; grantedAt: number; expiresAt: number };
export type Preferences = {
  village: SelectionId;
  track: TrackId;
  snow: boolean;
  repeat: boolean;
  motion: boolean;
  lightPattern: LightPattern;
  basicPattern: "gentle" | "twinkle";
  night: boolean;
  effect: NightId | null;
  volume: number;
  lastSeenTime: number;
  pass: Pass | null;
  nightPasses: Partial<Record<NightId, Pass>>;
  villagePasses: Partial<Record<VillageId, Pass>>;
};
export const defaults = (): Preferences => ({
  village: "christmas-bell-house",
  track: "snow",
  snow: true,
  repeat: true,
  motion: true,
  lightPattern: "gentle",
  basicPattern: "gentle",
  night: false,
  effect: null,
  volume: 0.35,
  lastSeenTime: 0,
  pass: null,
  villagePasses: {},
  nightPasses: {},
});
export function validPass(value: unknown): Pass | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<Pass>;
  return p.source === "rewarded" &&
    Number.isFinite(p.grantedAt) &&
    Number.isFinite(p.expiresAt) &&
    p.grantedAt! > 0 &&
    p.expiresAt! - p.grantedAt! === PASS_MS
    ? { source: "rewarded", grantedAt: p.grantedAt!, expiresAt: p.expiresAt! }
    : null;
}
export function hasPass(pass: Pass | null, now: number): boolean {
  return (
    !!pass && !!validPass(pass) && now >= pass.grantedAt && now < pass.expiresAt
  );
}
export function passForReward(now: number, earned: boolean): Pass | null {
  return earned && Number.isFinite(now) && now > 0
    ? { source: "rewarded", grantedAt: now, expiresAt: now + PASS_MS }
    : null;
}
export function parsePreferences(raw: string | null): Preferences {
  const result = defaults();
  try {
    const p = JSON.parse(raw ?? "{}");
    if (!p || typeof p !== "object") return result;
    if (ALL_VILLAGES.some((v) => v.id === p.village)) result.village = p.village;
    if (TRACKS.some((t) => t.id === p.track && t.available))
      result.track = p.track;
    else if (p.track === "lullaby" || p.track === "letter")
      result.track = "holy-night";
    if (NIGHTS.some((n) => n.id === p.effect)) result.effect = p.effect;
    else if (p.effect === "wishes") result.effect = "shooting";
    if (typeof p.motion === "boolean") result.motion = p.motion;
    if (LIGHT_PATTERNS.some((v) => v.id === p.lightPattern))
      result.lightPattern = p.lightPattern;
    if (p.basicPattern === "gentle" || p.basicPattern === "twinkle") result.basicPattern = p.basicPattern;
    // Every selected song always loops, including preferences saved with repeat OFF.
    if (typeof p.snow === "boolean") result.snow = p.snow;
    if (typeof p.night === "boolean") result.night = p.night;
    if (typeof p.volume === "number" && Number.isFinite(p.volume))
      result.volume = Math.min(1, Math.max(0, p.volume));
    if (Number.isFinite(p.lastSeenTime) && p.lastSeenTime > 0) result.lastSeenTime = p.lastSeenTime;
    result.pass = validPass(p.pass);
    for (const theme of NIGHTS) {
      const pass = validPass(p.nightPasses?.[theme.id]);
      if (pass) result.nightPasses[theme.id] = pass;
    }
    // Preserve only the already selected legacy night for its remaining duration.
    // Never turn a shared historical receipt into three newly issued rewards.
    if (p.nightPasses === undefined && result.effect && result.pass) result.nightPasses[result.effect] = result.pass;
    for (const v of VILLAGES.filter(v => v.premium)) {
      const pass = validPass(p.villagePasses?.[v.id]);
      if (pass) result.villagePasses[v.id] = pass;
    }
  } catch {
    /* Corrupt or inaccessible storage never prevents the app from opening. */
  }
  return result;
}
export function canUseVillage(p: Preferences, id: SelectionId, now: number): boolean {
  if (isBasicVillage(id)) return true;
  return VILLAGES.some(v => v.id === id) && hasPass(p.villagePasses[id] ?? null, now);
}
/** A reward is scoped to one village and never extends an active receipt. */
export function grantVillagePass(p: Preferences, id: SelectionId, now: number, earned: boolean): boolean {
  if (isBasicVillage(id) || !VILLAGES.find(v => v.id === id)?.premium || canUseVillage(p, id, now)) return false;
  const pass = passForReward(now, earned);
  if (!pass) return false;
  p.villagePasses[id] = pass;
  return true;
}
export function canUseNight(p: Preferences, id: NightId, now: number): boolean {
  return NIGHTS.some(n => n.id === id) && hasPass(p.nightPasses[id] ?? null, now);
}
export function grantNightPass(p: Preferences, id: NightId, now: number, earned: boolean): boolean {
  if (!NIGHTS.some(n => n.id === id) || canUseNight(p, id, now)) return false;
  const pass = passForReward(now, earned);
  if (!pass) return false;
  p.nightPasses[id] = pass;
  return true;
}
export function reconcileAccess(p: Preferences, now: number): boolean {
  let changed = false;
  if (!canUseVillage(p, p.village, now)) { p.village = "christmas-bell-house"; changed = true; }
  if (p.effect) { p.effect = null; changed = true; }
  if (isBasicVillage(p.village) && !BASIC_TRACK_IDS.includes(p.track)) { p.track = "snow"; changed = true; }
  return changed;
}
