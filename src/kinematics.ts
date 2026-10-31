/** Real circular track in ground space; camera projection produces the visible ellipse. */
export const RADIUS = 0.96;
export const TUNNEL_Z = 0.49;
export const TRACK_START = Math.asin(TUNNEL_Z / RADIUS);
export const TRAIN_SECONDS = 18;
export const TREE_SECONDS = 37;
export const CAR_LENGTHS = [0.34, 0.3, 0.3] as const;
export const COUPLER_LENGTH = 0.035;
export type Pose = {
  x: number;
  z: number;
  yaw: number;
  front: { x: number; z: number };
  rear: { x: number; z: number };
  angle: number;
};
const point = (angle: number) => ({
  x: RADIUS * Math.cos(angle),
  z: RADIUS * Math.sin(angle),
});
export function pose(angle: number, length: number): Pose {
  const p = point(angle),
    tangent = { x: -Math.sin(angle), z: Math.cos(angle) };
  return {
    ...p,
    angle,
    yaw: -angle - Math.PI / 2,
    front: {
      x: p.x + (tangent.x * length) / 2,
      z: p.z + (tangent.z * length) / 2,
    },
    rear: {
      x: p.x - (tangent.x * length) / 2,
      z: p.z - (tangent.z * length) / 2,
    },
  };
}
export function consist(angle: number): Pose[] {
  const cars = [pose(angle, CAR_LENGTHS[0])];
  for (let i = 1; i < CAR_LENGTHS.length; i++) {
    const lead = cars[i - 1]!;
    let low = (CAR_LENGTHS[i - 1]! + CAR_LENGTHS[i]!) / (2 * RADIUS),
      high = low + 0.2;
    for (let k = 0; k < 40; k++) {
      const d = (low + high) / 2,
        p = pose(lead.angle - d, CAR_LENGTHS[i]!);
      if (
        Math.hypot(lead.rear.x - p.front.x, lead.rear.z - p.front.z) >
        COUPLER_LENGTH
      )
        high = d;
      else low = d;
    }
    cars.push(pose(lead.angle - (low + high) / 2, CAR_LENGTHS[i]!));
  }
  return cars;
}
