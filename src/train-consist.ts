import { TRACK, trainPose } from './train-path.ts';

export type Point = { x: number; y: number };
export const CARS = [
  { length: 165, wheelbase: 104, width: 86, artWidth: 198 },
  { length: 142, wheelbase: 90, width: 84, artWidth: 180 },
  { length: 142, wheelbase: 90, width: 84, artWidth: 180 },
] as const;
export const COUPLER_LENGTH = 20;
const FLATTEN = TRACK.ry / TRACK.rx;
const HITCH_HEIGHT = 9;
const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
export function project(point: Point, height = 0): Point {
  return { x: TRACK.cx + point.x, y: TRACK.cy + point.y * FLATTEN - height };
}
export function vehiclePose(distance: number, index: number) {
  const model = CARS[index]!;
  const rail = trainPose(distance);
  const angle = Math.atan2((rail.y - TRACK.cy) / TRACK.ry, (rail.x - TRACK.cx) / TRACK.rx);
  // Both bogies sit on the rail; the rigid chassis spans the chord between them.
  const halfAngle = Math.asin(model.wheelbase * rail.scale / (2 * TRACK.rx));
  const frontAxle = { x: TRACK.rx * Math.cos(angle - halfAngle), y: TRACK.rx * Math.sin(angle - halfAngle) };
  const rearAxle = { x: TRACK.rx * Math.cos(angle + halfAngle), y: TRACK.rx * Math.sin(angle + halfAngle) };
  const centre = { x: (frontAxle.x + rearAxle.x) / 2, y: (frontAxle.y + rearAxle.y) / 2 };
  const forward = { x: Math.sin(angle), y: -Math.cos(angle) };
  const halfLength = model.length * rail.scale / 2;
  const front = { x: centre.x + forward.x * halfLength, y: centre.y + forward.y * halfLength };
  const rear = { x: centre.x - forward.x * halfLength, y: centre.y - forward.y * halfLength };
  const heading = Math.atan2(forward.y, forward.x);
  const direction = ((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8;
  const position = project(centre);
  return {
    distance, index, centre, forward, front, rear, scale: rail.scale, direction,
    position, frontAxle: project(frontAxle), rearAxle: project(rearAxle),
    frontHitch: project(front, HITCH_HEIGHT * rail.scale),
    rearHitch: project(rear, HITCH_HEIGHT * rail.scale),
    z: Math.round(position.y),
  };
}
export type VehiclePose = ReturnType<typeof vehiclePose>;

export function consistPose(headDistance: number): VehiclePose[] {
  const cars = [vehiclePose(headDistance, 0)];
  for (let index = 1; index < CARS.length; index++) {
    const leader = cars[index - 1]!;
    let low = 0;
    let high = 400;
    // Solve in ground-plane distance, not pixel gap or a delayed animation clock.
    // Choosing the behind-the-leader root prevents overtaking/overlapping bodies.
    for (let iteration = 0; iteration < 34; iteration++) {
      const offset = (low + high) / 2;
      const follower = vehiclePose(leader.distance - offset, index);
      const gap = subtract(leader.rear, follower.front);
      const meanForward = { x: leader.forward.x + follower.forward.x, y: leader.forward.y + follower.forward.y };
      const signedGap = Math.sign(dot(gap, meanForward)) * Math.hypot(gap.x, gap.y);
      const wanted = COUPLER_LENGTH * (leader.scale + follower.scale) / 2;
      if (signedGap < wanted) low = offset;
      else high = offset;
    }
    cars.push(vehiclePose(leader.distance - (low + high) / 2, index));
  }
  return cars;
}
