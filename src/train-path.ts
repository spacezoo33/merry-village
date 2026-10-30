/** Track measured against the plinth atlas, in stage-width / 1000 units. */
export const TRACK = { cx: 500, cy: 744, rx: 392, ry: 132 } as const;
export const LAP_MS = 14_000;
export const CAR_SPACING = 185;
const TAU = Math.PI * 2;
const SAMPLES = 2048;
const distances = [0];
for (let i = 1; i <= SAMPLES; i++) {
  const a = (i - 1) / SAMPLES * TAU;
  const b = i / SAMPLES * TAU;
  distances.push(distances[i - 1]! + Math.hypot(
    TRACK.rx * (Math.cos(b) - Math.cos(a)),
    TRACK.ry * (Math.sin(b) - Math.sin(a)),
  ));
}
export const TRACK_LENGTH = distances[SAMPLES]!;
export function wrapDistance(distance: number): number {
  return ((distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
}
export function trainPose(distance: number) {
  const target = wrapDistance(distance);
  let low = 0;
  let high = SAMPLES;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (distances[middle]! <= target) low = middle;
    else high = middle;
  }
  const fraction = (target - distances[low]!) / (distances[high]! - distances[low]!);
  const angle = -(low + fraction) / SAMPLES * TAU;
  const depth = (Math.sin(angle) + 1) / 2;
  const heading = Math.atan2(-TRACK.ry * Math.cos(angle), TRACK.rx * Math.sin(angle));
  const direction = ((Math.round(heading / (TAU / 8)) % 8) + 8) % 8;
  return {
    x: TRACK.cx + TRACK.rx * Math.cos(angle),
    y: TRACK.cy + TRACK.ry * Math.sin(angle),
    scale: .72 + depth * .28,
    direction,
    depth,
    // Behind every building/tree at the rear; ahead of all ornaments at the front.
    z: Math.sin(angle) < 0 ? 2 : 11,
  };
}
