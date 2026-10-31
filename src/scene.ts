/** Local atlas cells are independent replaceable scene objects, not a composed background. */
import atlasUrl from './assets/miniature-atlas.png';

export type Asset = 'base' | 'cottage' | 'church' | 'tree' | 'santa' | 'snowman' | 'reindeer' | 'train' | 'pine';
const labels: Record<Asset, string> = {
  base: '원목 오르골 받침대와 원형 철로', cottage: '눈 덮인 크리스마스 집',
  church: '따뜻한 불빛의 작은 교회', tree: '선물과 조명이 달린 크리스마스트리',
  santa: '손을 흔드는 산타', snowman: '빨간 목도리를 한 눈사람',
  reindeer: '루돌프', train: '선물을 실은 미니 기차', pine: '눈 덮인 작은 소나무',
};
// Viewports crop the generated atlas in the browser without modifying the original artwork.
const regions: Record<Asset, [number, number, number, number]> = {
  base: [0, 90, 460, 320], cottage: [460, 30, 425, 435],
  church: [920, 0, 334, 475], tree: [0, 405, 410, 470],
  santa: [465, 470, 350, 400], snowman: [885, 475, 350, 395],
  reindeer: [40, 875, 285, 375], train: [340, 885, 640, 365],
  pine: [980, 875, 274, 379],
};
export function artwork(asset: Asset, decorative = false): string {
  const [x, y, width, height] = regions[asset];
  return `<svg class="sprite asset-${asset}" viewBox="${x} ${y} ${width} ${height}" width="${width}" height="${height}" ${decorative ? 'aria-hidden="true"' : `role="img" aria-label="${labels[asset]}"`}><image href="${atlasUrl}" width="1254" height="1254"/></svg>`;
}
function sprite(asset: Asset, position: string, selectable?: string): string {
  return `<div class="scene-object ${position}${selectable ? ' ornament' : ''}"${selectable ? ` data-ornament="${selectable}"` : ''}>${artwork(asset)}</div>`;
}
export function scene(): string {
  return `<div class="miniature-stage" role="group" aria-label="메리빌리지 크리스마스 미니어처 오르골">
    <div class="stage-halo" aria-hidden="true"></div>
    ${sprite('base', 'object-base')}
    <div class="village-buildings ornament" data-ornament="village">
      ${sprite('church', 'object-church')}
      ${sprite('cottage', 'object-house-back')}
      ${sprite('cottage', 'object-house-left')}
      ${sprite('cottage', 'object-house-right')}
    </div>
    ${sprite('pine', 'object-pine-back')}
    ${sprite('pine', 'object-pine-left')}
    ${sprite('pine', 'object-pine-right')}
    ${sprite('tree', 'object-tree', 'tree')}
    ${sprite('reindeer', 'object-reindeer')}
    ${sprite('santa', 'object-santa', 'santa')}
    ${sprite('snowman', 'object-snowman', 'snowman')}
    ${sprite('train', 'object-train', 'train')}
    <div class="tree-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  </div>`;
}
