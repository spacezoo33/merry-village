import {
  NIGHTS,
  TRACKS,
  VILLAGES,
  type NightId,
  type TrackId,
  type VillageId,
} from "./catalog.ts";
export const PASS_MS = 7 * 24 * 60 * 60 * 1000;
export type Pass = { source: "rewarded"; grantedAt: number; expiresAt: number };
export type Preferences = {
  village: VillageId;
  track: TrackId;
  snow: boolean;
  motion: boolean;
  lights: boolean;
  night: boolean;
  effect: NightId | null;
  volume: number;
  pass: Pass | null;
};
export const defaults = (): Preferences => ({
  village: "cozy",
  track: "snow",
  snow: true,
  motion: true,
  lights: true,
  night: false,
  effect: null,
  volume: 0.35,
  pass: null,
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
    if (VILLAGES.some((v) => v.id === p.village)) result.village = p.village;
    if (TRACKS.some((t) => t.id === p.track)) result.track = p.track;
    if (NIGHTS.some((n) => n.id === p.effect)) result.effect = p.effect;
    if (typeof p.motion === "boolean") result.motion = p.motion;
    if (typeof p.lights === "boolean") result.lights = p.lights;
    if (typeof p.snow === "boolean") result.snow = p.snow;
    if (typeof p.night === "boolean") result.night = p.night;
    if (typeof p.volume === "number" && Number.isFinite(p.volume))
      result.volume = Math.min(1, Math.max(0, p.volume));
    result.pass = validPass(p.pass);
  } catch {
    /* Corrupt or inaccessible storage never prevents the app from opening. */
  }
  return result;
}
export function reconcileAccess(p: Preferences, now: number): boolean {
  if (hasPass(p.pass, now)) return false;
  let changed = false;
  if (VILLAGES.find((v) => v.id === p.village)?.premium) {
    p.village = "cozy";
    changed = true;
  }
  if (p.effect) {
    p.effect = null;
    changed = true;
  }
  return changed;
}
