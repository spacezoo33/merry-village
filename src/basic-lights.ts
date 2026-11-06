import type { BasicVillageId } from "./catalog.ts";
import { drawGoldenGlow } from "./golden-glow.ts";
export type BasicPattern = "gentle" | "twinkle";
export const nextBasicPattern = (pattern: BasicPattern): BasicPattern => pattern === "gentle" ? "twinkle" : "gentle";
// Coordinates in the supplied 1199 × 1312 originals. Windows are deliberately excluded.
export const BASIC_LIGHTS: Record<BasicVillageId, readonly (readonly [number, number, number])[]> = {
  "christmas-bell-house": [[903,588,36],[280,563,29],[550,640,17],[710,641,17],[892,654,15],[866,687,14],[914,706,14],[864,745,14],[929,762,14],[901,789,13]],
  "snowman-forest-house": [[889,603,36],[487,574,23],[453,868,26],[875,663,15],[856,699,14],[920,724,14],[866,751,14],[927,786,14],[885,809,13]],
};
export function basicLevel(pattern: BasicPattern, time: number, index: number, reduced = false) {
  if (reduced) return .25;
  return pattern === "gentle"
    ? .12 + .38 * (1 - Math.cos(time * Math.PI * 2 / 3.4)) / 2
    : .08 + .62 * Math.pow((1 + Math.sin(time * 2.2 + index * 1.7)) / 2, 3);
}
export function drawBasicLights(c: CanvasRenderingContext2D, id: BasicVillageId, pattern: BasicPattern, time: number, left: number, top: number, width: number, height: number, reduced = false) {
  BASIC_LIGHTS[id].forEach(([x,y,r],i) => drawGoldenGlow(c, left + x / 1199 * width, top + y / 1312 * height, r / 1199 * width, basicLevel(pattern,time,i,reduced)));
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
