import atlas from "./assets/product-villages.png";
import { VILLAGES, type VillageId } from "./catalog";
export { atlas as productAtlas };
export function productCrop(id: VillageId): [number, number, number, number] {
  const i = VILLAGES.findIndex((v) => v.id === id);
  return [
    (i % 3) * 512,
    Math.floor(i / 3) * 512 + (i >= 3 ? 7 : 0),
    512,
    i >= 3 ? 505 : 512,
  ];
}
export function productImage(id: VillageId): string {
  const [x, y, w, h] = productCrop(id);
  return `<svg class="product-plate" preserveAspectRatio="none" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><image href="${atlas}" width="1536" height="1024"/></svg>`;
}
