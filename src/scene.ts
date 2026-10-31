import { decorMarkup } from "./decor-lights";
import { snowLayer } from "./snow";
import { productImage } from "./product";
import { villageById, type VillageId } from "./catalog";
export function scene(id: VillageId): string {
  return `<div class="miniature-stage product-stage" role="img" aria-label="${villageById(id).name} 크리스마스 미니어처 오르골">${productImage(id)}${snowLayer("mid")}<div class="actor-stage" aria-hidden="true"></div><div class="architectural-lights" aria-hidden="true">${decorMarkup(id)}</div></div>`;
}
