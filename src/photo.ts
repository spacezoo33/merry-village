import { architecturalPoints } from "./rail-profiles";
import { lightLevel, type LightPattern } from "./lighting";
import background from "./assets/christmas-room.png";
import { productAtlas, productCrop } from "./product";
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
  lights: boolean,
  actors: HTMLCanvasElement | null,
  pattern: LightPattern = "gentle",
  lightingTime = 0,
): Promise<Blob> {
  const [bg, atlas] = await Promise.all([load(background), load(productAtlas)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1560;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("사진 저장을 지원하지 않아요.");
  c.drawImage(bg, 0, 0, 1200, 1560);
  c.fillStyle = "#1c0c0744";
  c.fillRect(0, 0, 1200, 1560);
  if (effect === "aurora") {
    const g = c.createLinearGradient(0, 80, 1200, 600);
    g.addColorStop(0, "#35e5a58c");
    g.addColorStop(0.5, "#ae74f28a");
    g.addColorStop(1, "#76e6cb00");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 100);
    c.bezierCurveTo(400, 520, 700, 40, 1200, 170);
    c.lineTo(1200, 450);
    c.bezierCurveTo(700, 270, 400, 760, 0, 330);
    c.fill();
  }
  const [sx, sy, sw, sh] = productCrop(id);
  c.drawImage(atlas, sx, sy, sw, sh, 0, 180, 1200, 1200);
  if (actors) c.drawImage(actors, 0, 180, 1200, 1200);
  if (lights) {
    for (let i = 0; i < 12; i++) {
      const point = architecturalPoints(id)[i]!,
        x = point.x * 12,
        y = 180 + point.y * 12;
      const g = c.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        effect === "wishes" ? 40 : 21,
      );
      const alpha = lightLevel(
        pattern,
        lightingTime,
        i,
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      g.addColorStop(0, `rgba(255,206,124,${alpha * 0.8})`);
      g.addColorStop(1, "#ffb94c00");
      c.fillStyle = g;
      c.fillRect(x - 40, y - 40, 80, 80);
    }
  }
  if (effect === "shooting") {
    for (let i = 0; i < 45; i++) {
      const x = (i * 197 + 30) % 1200,
        y = (i * 137 + 80) % 1300;
      c.fillStyle = i % 3 ? "#ffd48dba" : "#fff5db";
      c.beginPath();
      c.arc(x, y, i % 3 ? 2 : 3.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (snow) {
    c.fillStyle = "#fff9e2c2";
    for (let i = 0; i < 48; i++) {
      c.beginPath();
      c.arc(
        (i * 197 + 63) % 1200,
        (i * 137 + 37) % 1560,
        1.5 + (i % 3),
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG 생성 실패"))),
      "image/png",
    ),
  );
}
