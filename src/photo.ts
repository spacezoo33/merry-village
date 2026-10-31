import { ART, background } from "./art";
import { villageObjects } from "./layouts";
import { villageById, type NightId, type VillageId } from "./catalog";
const images = new Map<string, Promise<HTMLImageElement>>();
function load(src: string): Promise<HTMLImageElement> {
  if (!images.has(src))
    images.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          images.delete(src);
          reject(new Error("사진에 사용할 이미지를 불러오지 못했어요."));
        };
        image.src = src;
      }),
    );
  return images.get(src)!;
}
export async function captureVillage(
  id: VillageId,
  night: boolean,
  snow: boolean,
  effect: NightId | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1560;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저는 사진 생성을 지원하지 않아요.");
  const objects = villageObjects(id);
  await Promise.all([
    load(background),
    ...objects.map((o) => load(ART[o.asset].src)),
  ]);
  const bg = await load(background),
    scale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
  ctx.drawImage(
    bg,
    (canvas.width - bg.width * scale) / 2,
    (canvas.height - bg.height * scale) / 2,
    bg.width * scale,
    bg.height * scale,
  );
  ctx.fillStyle = night ? "#071127a0" : "#28120960";
  ctx.fillRect(0, 0, 1200, 1560);
  if (effect === "aurora") {
    const gradient = ctx.createLinearGradient(150, 0, 1000, 700);
    gradient.addColorStop(0, "#57e6bf66");
    gradient.addColorStop(0.5, "#ad8ff17a");
    gradient.addColorStop(1, "#4ed9dc00");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.bezierCurveTo(400, 550, 600, 30, 1200, 300);
    ctx.lineTo(1200, 650);
    ctx.bezierCurveTo(600, 330, 300, 750, 0, 350);
    ctx.fill();
  }
  if (effect === "shooting") {
    for (let i = 0; i < 5; i++) {
      const x = 150 + i * 210,
        y = 140 + (i % 3) * 92;
      ctx.strokeStyle = "#fff2c8bb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 75, y + 40);
      ctx.stroke();
    }
  }
  if (effect === "wishes") {
    for (let i = 0; i < 16; i++) {
      const x = (i * 197) % 1200,
        y = 180 + ((i * 97) % 1000);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
      g.addColorStop(0, "#fff1b8cc");
      g.addColorStop(1, "#ef9b3000");
      ctx.fillStyle = g;
      ctx.fillRect(x - 20, y - 20, 40, 40);
    }
  }
  ctx.save();
  ctx.translate(60, 60);
  ctx.scale(1.08, 1.08);
  for (const object of objects) {
    const art = ART[object.asset],
      image = await load(art.src),
      [sx, sy, sw, sh] = art.crop;
    ctx.filter = night ? "brightness(.85) saturate(.94)" : "none";
    ctx.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      object.x,
      object.y,
      object.width,
      (object.width * sh) / sw,
    );
  }
  ctx.filter = "none";
  ctx.restore();
  if (snow) {
    ctx.fillStyle = "#fff8e5cc";
    for (let i = 0; i < 55; i++) {
      ctx.beginPath();
      ctx.arc(
        (i * 197 + 63) % 1200,
        180 + ((i * 137) % 1120),
        2 + (i % 3),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff1d0";
  ctx.shadowColor = "#32180d";
  ctx.shadowBlur = 8;
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("메리빌리지", 600, 96);
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(villageById(id).name, 600, 1450);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#ead4b3";
  ctx.fillText("MERRY VILLAGE  ·  나만의 작은 크리스마스", 600, 1495);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("사진 파일을 만들지 못했어요.")),
      "image/png",
    ),
  );
}
