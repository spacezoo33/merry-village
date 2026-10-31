import atlas from "./assets/miniature-atlas.png";
import special from "./assets/special-buildings.png";
import background from "./assets/christmas-room.png";
import type { Asset } from "./layouts";
export { background };
export type ArtRegion = {
  src: string;
  size: [number, number];
  crop: [number, number, number, number];
};
const original = (crop: ArtRegion["crop"]): ArtRegion => ({
  src: atlas,
  size: [1254, 1254],
  crop,
});
const premium = (x: number): ArtRegion => ({
  src: special,
  size: [2172, 724],
  crop: [x, 0, 724, 724],
});
export const ART: Record<Asset, ArtRegion> = {
  base: original([0, 90, 460, 320]),
  cottage: original([460, 30, 425, 435]),
  church: original([920, 0, 334, 475]),
  tree: original([0, 405, 410, 470]),
  santa: original([465, 470, 350, 400]),
  snowman: original([885, 475, 350, 395]),
  reindeer: original([40, 875, 285, 375]),
  train: original([340, 885, 640, 365]),
  pine: original([980, 875, 274, 379]),
  workshop: premium(0),
  palace: premium(724),
  gingerbread: premium(1448),
};
export function artwork(asset: Asset): string {
  const {
    src,
    size,
    crop: [x, y, w, h],
  } = ART[asset];
  return `<svg class="sprite" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><image href="${src}" width="${size[0]}" height="${size[1]}"/></svg>`;
}
