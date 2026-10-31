import { RAIL_PROFILES } from "./rail-profiles.ts";
import type { VillageId } from "./catalog.ts";
import { lightLevel, type LightPattern } from "./lighting.ts";
export type DecorBulb = { x: number; y: number; color: string };
/** Source-cell coordinates along eaves, the front garland and both masonry arches.
 * Windows and street-lamp centres are deliberately outside these paths.
 */
const EAVES: Record<VillageId, number[][][]> = {
  cozy: [
    [
      [92, 215],
      [124, 219],
      [160, 215],
    ],
    [
      [337, 214],
      [371, 219],
      [416, 211],
    ],
  ],
  forest: [
    [
      [96, 228],
      [130, 233],
      [167, 226],
    ],
    [
      [208, 190],
      [259, 196],
      [312, 190],
    ],
  ],
  chapel: [
    [
      [96, 224],
      [128, 227],
      [165, 221],
    ],
    [
      [348, 223],
      [382, 228],
      [417, 222],
    ],
  ],
  workshop: [
    [
      [98, 173],
      [134, 181],
      [171, 173],
    ],
    [
      [344, 175],
      [377, 184],
      [415, 176],
    ],
  ],
  palace: [
    [
      [199, 178],
      [252, 187],
      [305, 178],
    ],
    [
      [341, 185],
      [374, 190],
      [407, 184],
    ],
  ],
  gingerbread: [
    [
      [92, 181],
      [132, 188],
      [169, 181],
    ],
    [
      [343, 182],
      [379, 187],
      [417, 179],
    ],
  ],
};
function curve(a: number[], control: number[], b: number[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1),
      u = 1 - t;
    return {
      x: u * u * a[0]! + 2 * u * t * control[0]! + t * t * b[0]!,
      y: u * u * a[1]! + 2 * u * t * control[1]! + t * t * b[1]!,
    };
  });
}
export function decorBulbs(id: VillageId): DecorBulb[] {
  const p = RAIL_PROFILES[id],
    y = p.front[1],
    cx = p.front[0];
  const front = curve(
    [p.left[0] + 34, y - 61],
    [cx, y - 32],
    [p.right[0] - 36, y - 61],
    32,
  );
  const arches = [p.left, p.right].flatMap(([x, contact]) =>
    curve(
      [x - 24, contact - 24],
      [x, contact - 71],
      [x + 24, contact - 24],
      14,
    ),
  );
  const roofs = EAVES[id].flatMap(([a, c, b]) => curve(a!, c!, b!, 14));
  return [...front, ...arches, ...roofs].map((p, i) => ({
    ...p,
    color: ["#ffd48c", "#ff5136", "#8ad972"][i % 3]!,
  }));
}
export function decorMarkup(id: VillageId) {
  const height = RAIL_PROFILES[id].height;
  return decorBulbs(id)
    .map(
      (p) =>
        `<i class="decor-bulb" style="left:${(p.x / 512) * 100}%;top:${(p.y / height) * 100}%;--bulb-color:${p.color}"><span class="bulb-emitter"></span></i>`,
    )
    .join("");
}
export function drawDecorLights(
  c: CanvasRenderingContext2D,
  id: VillageId,
  pattern: LightPattern,
  time: number,
  on: boolean,
  gold: boolean,
  width: number,
  top: number,
) {
  const scale = width / 512,
    height = RAIL_PROFILES[id].height;
  decorBulbs(id).forEach((p, i) => {
    const x = p.x * scale,
      y = top + (p.y / height) * width,
      level = on
        ? lightLevel(
            pattern,
            time,
            i,
            matchMedia("(prefers-reduced-motion: reduce)").matches,
          )
        : 0;
    c.fillStyle = "#27351e";
    c.beginPath();
    c.arc(x, y, scale * 0.8, 0, Math.PI * 2);
    c.fill();
    if (!level) return;
    const r = scale * (gold ? 6 : 4),
      g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(
      0,
      p.color +
        Math.round(level * 190)
          .toString(16)
          .padStart(2, "0"),
    );
    g.addColorStop(1, p.color + "00");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
    c.globalAlpha = level;
    c.fillStyle = p.color;
    c.beginPath();
    c.arc(x, y, scale, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  });
}
