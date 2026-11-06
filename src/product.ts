import bell from "./assets/basic/christmas-bell-house.webp";
import snowman from "./assets/basic/snowman-forest-house.webp";
import bellThumb from "./assets/basic/christmas-bell-house-thumb.webp";
import snowmanThumb from "./assets/basic/snowman-forest-house-thumb.webp";
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
import { isBasicVillage, type SelectionId } from "./catalog";
import { basicMaskSource } from "./basic-art";
const images: Record<SelectionId, string> = { "christmas-bell-house": bell, "snowman-forest-house": snowman, cozy, forest, chapel, palace, gingerbread, "aurora-lake": lake, observatory };
const thumbs: Record<SelectionId, string> = { "christmas-bell-house": bellThumb, "snowman-forest-house": snowmanThumb, cozy: cozyThumb, forest: forestThumb, chapel: chapelThumb, palace: palaceThumb, gingerbread: gingerbreadThumb, "aurora-lake": lakeThumb, observatory: observatoryThumb };
export const productSource = (id: SelectionId) => images[id];
export function productImage(id: SelectionId): string {
  const mask = isBasicVillage(id) ? ` style="mask-image:url('${basicMaskSource(id)}');mask-mode:alpha"` : "";
  return `<img${mask} class="product-plate" src="${images[id]}" width="627" height="627" alt="" decoding="async" />`;
}
export function productThumbnail(id: SelectionId): string {
  return `<img src="${thumbs[id]}" width="384" height="384" alt="" loading="lazy" decoding="async" />`;
}

/** Decode before swapping the selected scene, so slow image loads never leave a blank miniature. */
export async function preloadProduct(id: SelectionId): Promise<void> {
  const image = new Image();
  image.src = productSource(id);
  await image.decode();
}
