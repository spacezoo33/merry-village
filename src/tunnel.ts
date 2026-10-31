import { RAIL_PROFILES } from "./rail-profiles.ts";
import type { VillageId } from "./catalog.ts";
/** Mouth silhouettes measured in source-cell coordinates, including their dark recess.
 * The back clipping plane sits inside this recess, never at the front stone lip.
 */
export function tunnelPortals(id: VillageId) {
  const p = RAIL_PROFILES[id];
  return [p.left, p.right].map(([x, y]) => ({
    x,
    y: y - 12,
    rx: 23,
    ry: 25,
    bottom: y + 9,
  }));
}
export function inPortal(id: VillageId, x: number, y: number) {
  return tunnelPortals(id).some((p) => {
    const dx = (x - p.x) / p.rx,
      dy = (y - p.y) / p.ry;
    return (
      y <= p.bottom && Math.abs(dx) <= 1 && (dy >= 0 || dx * dx + dy * dy <= 1)
    );
  });
}
