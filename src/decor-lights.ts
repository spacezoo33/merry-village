import { drawGoldenGlow } from "./golden-glow.ts";
import { RAIL_PROFILES } from "./rail-profiles.ts";
import type { VillageId } from "./catalog.ts";
import { extraLightLevel, type LightPattern } from "./lighting.ts";
export type DecorBulb = {
  x: number;
  y: number;
  color: string;
  kind?: "lamp" | "accent";
  w?: number;
  h?: number;
  radius?: number;
  strength?: number;
};
// Bulb centres measured separately in each original atlas cell; bottom cells start at y=519.
// Forest roof window is excluded; palace includes the two inner standing lamps.
export const ARCHITECTURE: Record<
  VillageId,
  { lamps: number[][]; windows: number[][] }
> = {
  cozy: {
    lamps: [
      [60, 199],
      [77, 260],
      [447, 213],
      [459, 266],
      [115, 359],
      [370, 371],
      [431, 360],
    ],
    windows: [
      [96, 211, 6, 13],
      [128, 209, 9, 14],
      [170, 208, 8, 15],
      [199, 207, 7, 14],
      [226, 204, 7, 14],
      [271, 170, 7, 18],
      [272, 101, 10, 15],
      [317, 202, 8, 13],
      [355, 206, 10, 14],
      [404, 208, 10, 12],
      [406, 181, 6, 9],
      [398, 249, 10, 10],
      [271, 232, 8, 17],
    ],
  },
  forest: {
    lamps: [
      [57, 206],
      [71, 264],
      [451, 266],
      [122, 362],
      [370, 372],
      [425, 360],
    ],
    windows: [
      [109, 209, 6, 12],
      [144, 208, 6, 11],
      [166, 208, 6, 12],
      [160, 177, 7, 9],
      [235, 176, 7, 12],
      [265, 172, 7, 14],
      [293, 175, 7, 12],
      [263, 150, 7, 8],
      [226, 229, 6, 12],
      [286, 230, 7, 12],
      [365, 209, 6, 11],
      [442, 218, 6, 10],
      [365, 246, 6, 12],
      [438, 247, 6, 11],
    ],
  },
  chapel: {
    lamps: [
      [54, 207],
      [70, 264],
      [462, 222],
      [443, 267],
      [117, 363],
      [367, 372],
    ],
    windows: [
      [108, 205, 6, 11],
      [112, 177, 6, 8],
      [155, 203, 6, 12],
      [193, 198, 5, 13],
      [214, 197, 5, 13],
      [263, 167, 12, 20],
      [330, 173, 6, 15],
      [327, 115, 5, 12],
      [369, 197, 5, 14],
      [414, 208, 6, 11],
    ],
  },
  "palace": { lamps: [[83, 235], [550, 235], [131, 421], [500, 422], [279, 216], [354, 216]].map(([x, y]) => [x! * 512 / 627, y! * 512 / 627]), windows: [] },
  "gingerbread": { lamps: [[73, 232], [252, 210], [383, 207], [555, 233], [131, 420], [501, 419]].map(([x, y]) => [x! * 512 / 627, y! * 512 / 627]), windows: [] },
  "aurora-lake": { lamps: [[130, 422], [500, 422], [274, 159], [305, 153], [335, 149], [380, 159]].map(([x, y]) => [x! * 512 / 627, y! * 512 / 627]), windows: [] },
  "observatory": { lamps: [[131, 422], [500, 422], [69, 240], [158, 235]].map(([x, y]) => [x! * 512 / 627, y! * 512 / 627]), windows: [] },
};
export function architecturalBulbs(id: VillageId): DecorBulb[] {
  return [
    ...ARCHITECTURE[id].lamps.map(([x, y]) => ({
      x: x!,
      y: y!,
      w: 5,
      h: 7,
      kind: "lamp" as const,
      color: "#ffe2a1",
    })),
  ];
}

/** Exterior decorations only; no points inside either tunnel mouth. */
const SPECIAL_ACCENTS: Partial<Record<VillageId, number[][]>> = {"palace": [[175, 61], [253, 43], [314, 19], [385, 45], [458, 64], [192, 269], [439, 269], [271, 295], [314, 306], [358, 295], [246, 228], [385, 228]], "gingerbread": [[48, 198], [575, 199], [256, 191], [383, 192], [443, 286], [472, 301], [496, 283], [315, 28], [465, 141], [86, 206], [122, 204], [318, 157], [435, 195], [502, 193]], "aurora-lake": [[127, 122], [440, 53], [267, 246], [384, 246], [290, 168], [353, 167], [46, 278], [580, 276], [95, 443], [538, 442], [307, 175], [336, 175]], "observatory": [[315, 27], [214, 72], [415, 80], [269, 43], [374, 49], [455, 232], [483, 239], [513, 240], [541, 234], [567, 226], [508, 171], [180, 429], [450, 429]]};
export function decorBulbs(id: VillageId): DecorBulb[] {
  return (SPECIAL_ACCENTS[id] ?? []).map(([x, y], i) => ({
    x: x! * 512 / 627, y: y! * 512 / 627, color: "#ffe2a1", kind: "accent",
    w: i % 3 === 0 ? 3.8 : 2.5, h: i % 3 === 0 ? 3.8 : 2.5,
    radius: i % 3 === 0 ? 16 : 10, strength: i % 3 === 0 ? .95 : .7,
  }));
}
export function decorMarkup(id: VillageId) {
  const height = RAIL_PROFILES[id].height;
  return [...decorBulbs(id), ...architecturalBulbs(id)]
    .map(
      (p) =>
        `<i class="decor-bulb ${p.kind ?? "garland"}" data-strength="${p.strength ?? 1}" style="--light-w:${((p.w ?? 2.56) / 512) * 100}%;--light-h:${((p.h ?? 2.56) / height) * 100}%;left:${(p.x / 512) * 100}%;top:${(p.y / height) * 100}%;--bulb-color:${p.color}"><span class="bulb-emitter"></span><span class="bulb-flare"></span></i>`,
    )
    .join("");
}
export function drawDecorLights(
  c: CanvasRenderingContext2D,
  id: VillageId,
  pattern: LightPattern,
  time: number,
  gold: boolean,
  width: number,
  top: number,
) {
  const scale = width / 512,
    height = RAIL_PROFILES[id].height;
  [...decorBulbs(id), ...architecturalBulbs(id)].forEach((p, i) => {
    const x = p.x * scale,
      y = top + (p.y / height) * width,
      level = extraLightLevel(
        pattern,
        time,
        i + 100,
        matchMedia("(prefers-reduced-motion: reduce)").matches,
        p.x / 512,
      );
    // Always draw the small warm source; OFF never covers the original atlas in black.
    c.save();
    c.fillStyle = "#fff0b2";
    c.shadowColor = "#ffcd75";
    c.shadowBlur = scale * 2;
    c.beginPath(); c.ellipse(x, y, scale * 1.15, scale * 1.7, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    drawGoldenGlow(c, x, y, scale * (p.radius ?? (gold ? 24 : 21)), level * (p.strength ?? 1));
  });
}
