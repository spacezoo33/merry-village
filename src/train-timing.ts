export const TRAIN_LAP_SECONDS = 18;
export const CHUFFS_PER_LAP = 64;
export const CHUFF_SECONDS = TRAIN_LAP_SECONDS / CHUFFS_PER_LAP;
/** Same frozen journey time as the engine; no sound/frame drift after a stop. */
export function chuffOffset(journeySeconds: number) {
  return Math.max(0, journeySeconds - 0.65) % (4 * CHUFF_SECONDS);
}
