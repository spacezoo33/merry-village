import { TRAIN_LAP_SECONDS } from "./train-timing.ts";
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
  treeX?: number;
  treeScale?: number;
  portalCentres?: [[number, number], [number, number]];
};
export const RAIL_PROFILES: Record<VillageId, RailProfile> = {
  cozy: {
    left: [130, 345],
    right: [390, 345],
    front: [260, 379],
    height: 512,
    treeFoot: 288,
    scale: 1,
    lap: TRAIN_LAP_SECONDS,
  },
  forest: {
    left: [127, 345],
    right: [387, 345],
    front: [257, 380],
    height: 512,
    treeFoot: 288,
    scale: 0.98,
    lap: TRAIN_LAP_SECONDS,
  },
  chapel: {
    left: [127, 344],
    right: [387, 344],
    front: [257, 379],
    height: 512,
    treeFoot: 288,
    scale: 1,
    lap: TRAIN_LAP_SECONDS,
  },
  "palace": { left: [113, 327], right: [397, 327], front: [256, 362], height: 512, treeFoot: 275, scale: .98, lap: TRAIN_LAP_SECONDS, treeX: 325, treeScale: .72, portalCentres: [[110, 302], [402, 302]] },
  "gingerbread": { left: [111, 327], right: [398, 327], front: [256, 365], height: 512, treeFoot: 282, scale: .98, lap: TRAIN_LAP_SECONDS, treeX: 256, treeScale: 0.8, portalCentres: [[110, 302], [402, 302]] },
  "aurora-lake": { left: [111, 327], right: [398, 327], front: [256, 364], height: 512, treeFoot: 292, scale: .98, lap: TRAIN_LAP_SECONDS, treeX: 256, treeScale: 0.68, portalCentres: [[110, 302], [402, 302]] },
  "observatory": { left: [112, 327], right: [397, 327], front: [256, 364], height: 512, treeFoot: 286, scale: .98, lap: TRAIN_LAP_SECONDS, treeX: 245, treeScale: 0.76, portalCentres: [[110, 302], [402, 302]] },
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
