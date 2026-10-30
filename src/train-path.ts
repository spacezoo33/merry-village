/** Measured rail centreline, in stage-width / 1000 units. */
export const TRACK = { cx: 500, cy: 744, rx: 392, ry: 132 } as const;
export const LAP_MS = 14_000;
// The photographed ellipse is a circle on the ground plane. Parameterizing its
// ground distance avoids changing physical carriage gaps as the rail foreshortens.
export const TRACK_LENGTH = Math.PI * 2 * TRACK.rx;
export function wrapDistance(distance: number): number {
  return ((distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
}
export function trainPose(distance: number) {
  const angle = -wrapDistance(distance) / TRACK.rx;
  const depth = (Math.sin(angle) + 1) / 2;
  const heading = Math.atan2(-Math.cos(angle), Math.sin(angle));
  const direction = ((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8;
  return {
    x: TRACK.cx + TRACK.rx * Math.cos(angle),
    y: TRACK.cy + TRACK.ry * Math.sin(angle),
    scale: .72 + depth * .28,
    direction,
    depth,
  };
}
