import { architecturalPoints } from "./rail-profiles";
import { snowLayer } from "./snow";
import { productImage } from "./product";
import { villageById, type VillageId } from "./catalog";
export function scene(id: VillageId): string {
  return `<div class="miniature-stage product-stage" role="img" aria-label="${villageById(id).name} 크리스마스 미니어처 오르골">${productImage(id)}${snowLayer("mid")}<div class="actor-stage" aria-hidden="true"></div><div class="architectural-lights" aria-hidden="true">${architecturalPoints(
    id,
  )
    .map(
      (p, i) =>
        `<i style="--lx:${p.x}%;--ly:${p.y}%;--phase:-${i * 0.7}s"></i>`,
    )
    .join("")}</div></div>`;
}
