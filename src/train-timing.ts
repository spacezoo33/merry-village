export const TRAIN_LAP_SECONDS = 13;
export const CHUFFS_PER_LAP = 64;
export const CHUFF_SECONDS = TRAIN_LAP_SECONDS / CHUFFS_PER_LAP;
/** Same frozen journey time as the engine; no sound/frame drift after a stop. */
export function chuffOffset(journeySeconds: number) {
  return Math.max(0, journeySeconds - 0.65) % (4 * CHUFF_SECONDS);
}

export const WHISTLE_EVERY_LAPS = 6;
/** Progress is the unwrapped route angle since departure, not an audio/wall timer. */
export function journeyLap(progressRadians: number) {
  return Math.floor(Math.max(0, progressRadians) / (Math.PI * 2) + 1e-10) + 1;
}
