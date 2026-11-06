import type { BasicVillageId } from "./catalog.ts";
import { drawGoldenGlow } from "./golden-glow.ts";
export type BasicPattern = "gentle" | "twinkle";
export const nextBasicPattern = (pattern: BasicPattern): BasicPattern => pattern === "gentle" ? "twinkle" : "gentle";
// Coordinates in the supplied 1199 × 1312 originals. Windows are deliberately excluded.
export const BASIC_LIGHTS: Record<BasicVillageId, readonly (readonly [number, number, number])[]> = {
  "christmas-bell-house": [[903,588,76],[280,563,58],[550,640,39],[710,641,39],[892,654,30],[866,687,30],[914,706,30],[864,745,30],[929,762,30],[901,789,28]],
  "snowman-forest-house": [[889,603,76],[487,574,50],[453,868,54],[875,663,30],[856,699,30],[920,724,30],[866,751,30],[927,786,30],[885,809,28]],
};
export function basicLevel(pattern: BasicPattern, time: number, index: number, reduced = false) {
  if (reduced) return .5;
  return pattern === "gentle"
    ? .25 + .65 * (1 - Math.cos(time * Math.PI * 2 / 2.8)) / 2
    : .14 + .86 * Math.pow((1 + Math.sin(time * 2.4 + index * 1.7)) / 2, 3);
}
export function drawBasicLights(c: CanvasRenderingContext2D, id: BasicVillageId, pattern: BasicPattern, time: number, left: number, top: number, width: number, height: number, reduced = false) {
  BASIC_LIGHTS[id].forEach(([x,y,r],i) => drawGoldenGlow(c, left + x / 1199 * width, top + y / 1312 * height, r / 1199 * width, basicLevel(pattern,time,i,reduced) * (i === 0 ? 1.3 : 1)));
  const reflections = id === "christmas-bell-house" ? [[280,850,85],[550,805,55],[710,805,55]] : [[487,804,65],[453,905,65]];
  c.save(); c.globalCompositeOperation = "screen";
  reflections.forEach(([x,y,r],i) => {
    const cx = left + x! / 1199 * width, cy = top + y! / 1312 * height, radius = r! / 1199 * width;
    c.save();c.translate(cx,cy);c.scale(1,.3);
    const glow = c.createRadialGradient(0,0,0,0,0,radius);
    glow.addColorStop(0,`rgba(255,206,115,${basicLevel(pattern,time,i+1,reduced)*.16})`);glow.addColorStop(1,"rgba(255,190,90,0)");
    c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
  });c.restore();
}
/** Only a selected basic village owns this small 2D overlay. No train or WebGL. */
export class BasicLights {
  private raf = 0;
  private start = performance.now();
  private last = 0;
  pattern: BasicPattern = "gentle";
  time = 0;
  private canvas: HTMLCanvasElement;
  private id: BasicVillageId;
  constructor(canvas: HTMLCanvasElement, id: BasicVillageId) { this.canvas = canvas; this.id = id; }
  update(pattern: BasicPattern, hidden: boolean, reduced: boolean) {
    this.pattern = pattern;
    cancelAnimationFrame(this.raf);
    if (hidden) return;
    const frame = (now: number) => {
      if (now - this.last >= 32 || reduced) {
        this.last = now;
        this.time = (now - this.start) / 1000;
        const bounds = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
        const w = Math.max(1, Math.round(bounds.width * dpr)), h = Math.max(1, Math.round(bounds.height * dpr));
        if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
        const c = this.canvas.getContext("2d");
        if (c) { c.clearRect(0,0,w,h); drawBasicLights(c,this.id,this.pattern,this.time,0,0,w,h,reduced); }
      }
      if (!reduced) this.raf = requestAnimationFrame(frame);
    };
    frame(performance.now());
  }
  destroy() { cancelAnimationFrame(this.raf); }
}
