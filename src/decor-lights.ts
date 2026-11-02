import { drawGoldenGlow } from "./golden-glow.ts";
import { RAIL_PROFILES } from "./rail-profiles.ts";
import type { VillageId } from "./catalog.ts";
import { extraLightLevel, type LightPattern } from "./lighting.ts";
export type DecorBulb = {
  x: number;
  y: number;
  color: string;
  kind?: "lamp";
  w?: number;
  h?: number;
};
// Coordinates measured in each source atlas cell (bottom cells start at y=519).
export const ARCHITECTURE: Record<
  VillageId,
  { lamps: number[][]; windows: number[][] }
> = {
  cozy: {
    lamps: [
      [60, 199],
      [77, 260],
      [448, 213],
      [461, 268],
      [114, 360],
      [369, 371],
      [431, 362],
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
      [449, 219],
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
      [53, 206],
      [70, 264],
      [443, 221],
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
  workshop: {
    lamps: [
      [62, 163],
      [76, 218],
      [447, 169],
      [447, 220],
      [121, 319],
      [396, 319],
    ],
    windows: [
      [110, 160, 6, 12],
      [152, 137, 7, 12],
      [159, 168, 7, 12],
      [185, 169, 6, 12],
      [244, 179, 9, 16],
      [243, 107, 11, 14],
      [294, 161, 7, 12],
      [336, 162, 8, 13],
      [335, 179, 8, 14],
      [398, 156, 7, 12],
      [400, 183, 8, 12],
    ],
  },
  palace: {
    lamps: [
      [62, 164],
      [65, 216],
      [446, 164],
      [432, 215],
    ],
    windows: [
      [108, 156, 6, 12],
      [137, 166, 6, 10],
      [164, 116, 5, 11],
      [160, 145, 5, 11],
      [204, 158, 5, 13],
      [234, 159, 5, 13],
      [259, 115, 8, 14],
      [259, 168, 8, 14],
      [259, 81, 6, 8],
      [281, 147, 6, 12],
      [305, 160, 6, 13],
      [319, 116, 5, 10],
      [356, 155, 6, 12],
      [370, 114, 5, 12],
      [392, 158, 6, 11],
    ],
  },
  gingerbread: {
    lamps: [
      [57, 158],
      [73, 216],
      [447, 169],
      [447, 220],
      [118, 318],
      [393, 319],
    ],
    windows: [
      [109, 163, 7, 11],
      [144, 158, 7, 11],
      [157, 140, 6, 9],
      [180, 157, 7, 11],
      [212, 155, 7, 13],
      [237, 155, 7, 13],
      [253, 142, 7, 12],
      [283, 143, 7, 12],
      [270, 119, 8, 10],
      [265, 190, 7, 12],
      [327, 164, 7, 11],
      [342, 135, 6, 9],
      [379, 162, 7, 12],
      [411, 174, 6, 11],
    ],
  },
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

/** No synthetic lights in either tunnel, including the former arch garlands. */
export function decorBulbs(_id: VillageId): DecorBulb[] { return []; }
export function decorMarkup(id: VillageId) {
  const height = RAIL_PROFILES[id].height;
  return [...decorBulbs(id), ...architecturalBulbs(id)]
    .map(
      (p) =>
        `<i class="decor-bulb ${p.kind ?? "garland"}" style="--light-w:${((p.w ?? 2.56) / 512) * 100}%;--light-h:${((p.h ?? 2.56) / height) * 100}%;left:${(p.x / 512) * 100}%;top:${(p.y / height) * 100}%;--bulb-color:${p.color}"><span class="bulb-emitter"></span><span class="bulb-flare"></span></i>`,
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
    drawGoldenGlow(c, x, y, scale * (gold ? 24 : 21), level);
  });
}
