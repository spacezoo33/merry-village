import { drawNightSky, drawNightReflection } from "./night-theme.ts";
import { SNOW_COUNTS, snowSize, type SnowQuality } from "./snow";
import { drawDecorLights } from "./decor-lights";
import { type LightPattern } from "./lighting";
import background from "./assets/christmas-room.webp";
import { productSource } from "./product";
import type { NightId, VillageId } from "./catalog";
const images = new Map<string, Promise<HTMLImageElement>>();
async function load(src: string) {
  if (!images.has(src))
    images.set(
      src,
      new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => {
          images.delete(src);
          reject(new Error("이미지를 불러오지 못했어요"));
        };
        i.src = src;
      }),
    );
  return images.get(src)!;
}
/** UI-free photograph; copies the current actual WebGL pose rather than a stock train. */
export async function captureVillage(
  id: VillageId,
  _night: boolean,
  snow: boolean,
  effect: NightId | null,
  actors: HTMLCanvasElement | null,
  pattern: LightPattern = "gentle",
  lightingTime = 0,
): Promise<Blob> {
  for (const key of images.keys()) if (key !== background && key !== productSource(id)) images.delete(key);
  const [bg, atlas] = await Promise.all([load(background), load(productSource(id))]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1560;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("사진 저장을 지원하지 않아요.");
  const bgScale = Math.max(1200 / bg.width, 1560 / bg.height);
  c.drawImage(
    bg,
    (1200 - bg.width * bgScale) / 2,
    (1560 - bg.height * bgScale) / 2,
    bg.width * bgScale,
    bg.height * bgScale,
  );
  c.fillStyle = "#1c0c0744";
  c.fillRect(0, 0, 1200, 1560);
  drawNightSky(c, effect, 1200, 1560);
  const quality = (document.querySelector<HTMLElement>("#app")?.dataset
    .snowQuality ?? "high") as SnowQuality;
  const counts = SNOW_COUNTS[quality] ?? SNOW_COUNTS.high;
  const pixelScale =
    1200 / (document.querySelector<HTMLElement>(".hero")?.clientWidth ?? 375);
  const drawSnow = (depth: "back" | "mid" | "front") => {
    if (!snow) return;
    for (let i = 0; i < counts[depth]; i++) {
      const x = (i * 197 + (depth === "front" ? 113 : 31)) % 1200,
        y = (i * 137 + 41 + (depth === "mid" ? 173 : 0)) % 1560;
      const radius = snowSize(depth, i) / 2 * pixelScale;
      const g = c.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, depth === "back" ? "#fff9ed88" : "#fffbedcc");
      g.addColorStop(0.5, "#fff9ec77");
      g.addColorStop(1, "#fff9ec00");
      c.fillStyle = g;
      c.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
    }
  };
  drawSnow("back");
  c.drawImage(atlas, 0, 180, 1200, 1200);
  drawNightReflection(c, effect, 1200, 180, 1200);
  drawSnow("mid");
  if (actors) c.drawImage(actors, 0, 180, 1200, 1200);
  drawDecorLights(c, id, pattern, lightingTime, effect === "shooting", 1200, 180);
  drawSnow("front");
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG 생성 실패"))),
      "image/png",
    ),
  );
}
