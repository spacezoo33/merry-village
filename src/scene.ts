import { decorMarkup } from "./decor-lights";
import { snowLayer } from "./snow";
import { productImage } from "./product";
import { villageById, isBasicVillage, type SelectionId } from "./catalog";
export function scene(id: SelectionId, snowfall = true): string {
  if (isBasicVillage(id)) return `<div class="miniature-stage basic-stage" role="img" aria-label="${villageById(id).name}">${productImage(id)}${snowfall ? snowLayer("mid") : ""}<canvas class="basic-lights" aria-hidden="true"></canvas></div>`;
  return `<div class="miniature-stage product-stage" role="img" aria-label="${villageById(id).name} 크리스마스 미니어처 오르골">${productImage(id)}${snowfall ? snowLayer("mid") : ""}<div class="actor-stage" aria-hidden="true"></div><div class="architectural-lights" aria-hidden="true">${decorMarkup(id)}</div></div>`;
}
