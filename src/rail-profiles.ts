import type { VillageId } from "./catalog.ts";
/** Landmarks measured in each original atlas viewport, NOT in CSS screen pixels.
 * Mouths are wheel/rail contact points below the arch; front is centre of the dark track bed.
 * The bottom row is 505px tall and its railway sits ~44px above the first row's railway.
 */
export type RailProfile = {
  left: [number, number];
  right: [number, number];
  front: [number, number];
  height: number;
  treeFoot: number;
  scale: number;
  lap: number;
};
export const RAIL_PROFILES: Record<VillageId, RailProfile> = {
  cozy: {
    left: [130, 345],
    right: [390, 345],
    front: [260, 379],
    height: 512,
    treeFoot: 288,
    scale: 1,
    lap: 18,
  },
  forest: {
    left: [127, 345],
    right: [387, 345],
    front: [257, 380],
    height: 512,
    treeFoot: 288,
    scale: 0.98,
    lap: 18,
  },
  chapel: {
    left: [127, 344],
    right: [387, 344],
    front: [257, 379],
    height: 512,
    treeFoot: 288,
    scale: 1,
    lap: 18,
  },
  workshop: {
    left: [130, 300],
    right: [390, 300],
    front: [260, 335],
    height: 505,
    treeFoot: 245,
    scale: 0.98,
    lap: 18,
  },
  palace: {
    left: [128, 298],
    right: [388, 298],
    front: [258, 333],
    height: 505,
    treeFoot: 243,
    scale: 0.98,
    lap: 18,
  },
  gingerbread: {
    left: [126, 300],
    right: [388, 300],
    front: [257, 335],
    height: 505,
    treeFoot: 245,
    scale: 0.98,
    lap: 18,
  },
};
export const PORTAL_ANGLE = 0.6;
export function railCalibration(id: VillageId) {
  const p = RAIL_PROFILES[id],
    r = 0.96;
  const rx = (p.right[0] - p.left[0]) / (2 * Math.cos(PORTAL_ANGLE));
  const ry =
    (p.front[1] - (p.left[1] + p.right[1]) / 2) / (1 - Math.sin(PORTAL_ANGLE));
  const spanX = (r * 512) / rx,
    spanY = spanX; // isotropic physical camera, actual stage is square
  const sinElevation = (ry * spanY) / (r * p.height),
    elevation = Math.asin(sinElevation);
  const cx = (p.left[0] + p.right[0]) / 2,
    cy = p.front[1] - ry;
  return {
    ...p,
    radius: r,
    spanX,
    spanY,
    elevation,
    top: (cy / p.height) * spanY,
    left: (-cx / 512) * spanX,
    tunnelZ: r * Math.sin(PORTAL_ANGLE),
    treeY:
      (((cy - p.treeFoot) / p.height) * spanY) / Math.cos(elevation) + 0.05,
  };
}
/** Project the very same 3D route used for wheels/rails into the atlas viewport. */
export function projectRail(id: VillageId, angle: number) {
  const p = railCalibration(id);
  return {
    x: ((p.radius * Math.cos(angle) - p.left) / p.spanX) * 512,
    y:
      ((p.top + p.radius * Math.sin(angle) * Math.sin(p.elevation)) / p.spanY) *
      p.height,
  };
}
export function architecturalPoints(id: VillageId) {
  const shift = RAIL_PROFILES[id].height === 505 ? -8 : 0;
  return [12, 20, 29, 38, 66, 76, 85, 91, 22, 78, 33, 62].map((x, i) => ({
    x,
    y: [42, 46, 40, 45, 43, 45, 47, 42, 68, 69, 57, 58][i]! + shift,
  }));
}
