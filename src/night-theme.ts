import type { NightId } from "./catalog.ts";
/** Lightweight canvas equivalents of the live sky and snow reflection layers. */
export function drawNightSky(c: CanvasRenderingContext2D, effect: NightId | null, width: number, height: number) {
  if (!effect) return;
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, height * .75);
  sky.addColorStop(0, effect === "moonlight" ? "#071c49dc" : effect === "aurora" ? "#112c3bb0" : "#33210c99");
  sky.addColorStop(1, "#10172300"); c.fillStyle = sky; c.fillRect(0, 0, width, height);
  if (effect === "moonlight") {
    const x = width * .2, y = height * .09, r = width * .055;
    const halo = c.createRadialGradient(x, y, r * .3, x, y, r * 3.5);
    halo.addColorStop(0, "#e4f0ffaa"); halo.addColorStop(1, "#b4d8ff00");
    c.fillStyle = halo; c.fillRect(x - r * 3.5, y - r * 3.5, r * 7, r * 7);
    c.fillStyle = "#e4efff"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  } else if (effect === "shooting") {
    for (let i = 0; i < 48; i++) {
      const x = ((i * 197 + 37) % 997) / 997 * width, y = ((i * 127 + 21) % 613) / 613 * height * .7;
      c.fillStyle = i % 3 ? "#ffd98dbb" : "#fff5da"; c.beginPath();
      c.arc(x, y, width * (i % 3 ? .0015 : .0025), 0, Math.PI * 2); c.fill();
    }
  } else {
    for (const [color, shift] of [["#60eac449", 0], ["#a487e541", .12]] as const) {
      const g = c.createLinearGradient(0, 0, width, height * .4); g.addColorStop(0, "#6ad9ce00"); g.addColorStop(.5, color); g.addColorStop(1, "#9180dd00");
      c.fillStyle = g; c.beginPath(); c.moveTo(0, height * (.06 + shift));
      c.bezierCurveTo(width * .3, height * .4, width * .6, 0, width, height * (.13 + shift));
      c.lineTo(width, height * (.29 + shift)); c.bezierCurveTo(width * .55, height * .13, width * .35, height * .5, 0, height * (.2 + shift)); c.fill();
    }
  }
  c.restore();
}
export function drawNightReflection(c: CanvasRenderingContext2D, effect: NightId | null, width: number, top: number, height: number) {
  if (!effect) return;
  c.save(); c.globalCompositeOperation = "screen";
  const g = c.createLinearGradient(0, top, width, top + height);
  g.addColorStop(0, effect === "moonlight" ? "#689fdf12" : effect === "aurora" ? "#55bca710" : "#eeb95010");
  g.addColorStop(1, effect === "aurora" ? "#a07edd13" : "#aaccff00");
  c.fillStyle = g; c.fillRect(0, top, width, height); c.restore();
}
