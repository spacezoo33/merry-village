import { productImage } from "./product";
import { villageById, type VillageId } from "./catalog";
export function scene(id: VillageId): string {
  return `<div class="miniature-stage product-stage" role="img" aria-label="${villageById(id).name} 크리스마스 미니어처 오르골">${productImage(id)}<div class="actor-stage" aria-hidden="true"></div><div class="architectural-lights" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--lx:${[12, 20, 29, 38, 66, 76, 85, 91, 22, 78, 33, 62][i]}%;--ly:${[42, 46, 40, 45, 43, 45, 47, 42, 68, 69, 57, 58][i]}%;--phase:-${i * 0.7}s"></i>`).join("")}</div></div>`;
}
