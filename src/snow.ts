export const SNOW_COUNTS = {
  high: { back: 36, mid: 42, front: 33 },
  medium: { back: 27, mid: 33, front: 24 },
  low: { back: 21, mid: 27, front: 18 },
} as const;
export const SNOW_SIZE_SCALE = .55;
export function snowSize(depth: "back" | "mid" | "front", index: number) {
  return ((depth === "back" ? 2 : depth === "mid" ? 4 : 7) + index % 3) * 1.75 * SNOW_SIZE_SCALE;
}
export type SnowQuality = keyof typeof SNOW_COUNTS;
export function snowLayer(depth: "back" | "mid" | "front"): string {
  const count = SNOW_COUNTS.high[depth];
  return `<div class="snowfall snow-${depth}" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<i style="--x:${(i * 37 + (depth === "front" ? 17 : 5)) % 100}%;--y:${(i * 23) % 96}%;--delay:-${i * 0.91}s;--duration:${(depth === "back" ? 21 : depth === "mid" ? 17 : 13) + (i % 7)}s;--size:${snowSize(depth, i)}px;--drift:${i % 2 ? 12 : -14}px"></i>`).join("")}</div>`;
}
/** Hysteresis: drop after a sustained 3s budget violation, recover only after 15s. */
export class SnowBudget {
  quality: SnowQuality = "high";
  private elapsed = 0;
  private frames = 0;
  private stable = 0;
  sample(dt: number): SnowQuality {
    if (dt <= 0) return this.quality;
    dt = Math.min(dt, 1500);
    this.elapsed += dt;
    this.frames++;
    if (this.elapsed < 3000) return this.quality;
    const fps = (this.frames * 1000) / this.elapsed;
    if (fps < 18) {
      this.quality = "low";
      this.stable = 0;
    } else if (fps < 28) {
      if (this.quality === "high") this.quality = "medium";
      this.stable = 0;
    } else if (fps > 45) {
      this.stable += this.elapsed;
      if (this.stable >= 15000) {
        this.quality = this.quality === "low" ? "medium" : "high";
        this.stable = 0;
      }
    } else this.stable = 0;
    this.frames = 0;
    this.elapsed = 0;
    return this.quality;
  }
}
export function adaptSnow(app: HTMLElement) {
  const budget = new SnowBudget(),
    media = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0,
    last = 0;
  const sync = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (
      !document.hidden &&
      !media.matches &&
      !app.classList.contains("snow-off") &&
      !app.classList.contains("sheet-open")
    )
      raf = requestAnimationFrame(tick);
  };
  const tick = (time: number) => {
    if (last) {
      const quality = budget.sample(time - last);
      if (app.dataset.snowQuality !== quality)
        app.dataset.snowQuality = quality;
    }
    last = time;
    raf = requestAnimationFrame(tick);
  };
  app.dataset.snowQuality = "high";
  const observer = new MutationObserver(sync);
  observer.observe(app, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", sync);
  media.addEventListener("change", sync);
  sync();
  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
    media.removeEventListener("change", sync);
  };
}
