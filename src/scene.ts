import { villageObjects } from "./layouts";
import { artwork } from "./art";
import { villageById, type VillageId } from "./catalog";
export function scene(id: VillageId): string {
  return `<div class="miniature-stage layout-${id}" role="img" aria-label="${villageById(id).name} 미니어처">${villageObjects(
    id,
  )
    .map(
      (o) =>
        `<div class="scene-object asset-${o.asset}" style="left:${o.x / 10}%;top:${o.y / 12}%;width:${o.width / 10}%;z-index:${o.depth}">${artwork(o.asset)}</div>`,
    )
    .join(
      "",
    )}<div class="tree-lights" aria-hidden="true">${"<i></i>".repeat(6)}</div></div>`;
}
