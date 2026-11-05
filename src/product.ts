import cozy from "./assets/villages/cozy.webp";
import forest from "./assets/villages/forest.webp";
import chapel from "./assets/villages/chapel.webp";
import palace from "./assets/villages/palace.webp";
import gingerbread from "./assets/villages/gingerbread.webp";
import lake from "./assets/villages/aurora-lake.webp";
import observatory from "./assets/villages/observatory.webp";
import cozyThumb from "./assets/villages/cozy-thumb.webp";
import forestThumb from "./assets/villages/forest-thumb.webp";
import chapelThumb from "./assets/villages/chapel-thumb.webp";
import palaceThumb from "./assets/villages/palace-thumb.webp";
import gingerbreadThumb from "./assets/villages/gingerbread-thumb.webp";
import lakeThumb from "./assets/villages/aurora-lake-thumb.webp";
import observatoryThumb from "./assets/villages/observatory-thumb.webp";
import type { VillageId } from "./catalog";
const images: Record<VillageId, string> = { cozy, forest, chapel, palace, gingerbread, "aurora-lake": lake, observatory };
const thumbs: Record<VillageId, string> = { cozy: cozyThumb, forest: forestThumb, chapel: chapelThumb, palace: palaceThumb, gingerbread: gingerbreadThumb, "aurora-lake": lakeThumb, observatory: observatoryThumb };
export const productSource = (id: VillageId) => images[id];
export function productImage(id: VillageId): string {
  return `<img class="product-plate" src="${images[id]}" width="627" height="627" alt="" decoding="async" />`;
}
export function productThumbnail(id: VillageId): string {
  return `<img src="${thumbs[id]}" width="384" height="384" alt="" loading="lazy" decoding="async" />`;
}
