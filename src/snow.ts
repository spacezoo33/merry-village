export function snowLayer(depth: "back" | "mid" | "front"): string {
  const count = depth === "back" ? 16 : depth === "mid" ? 16 : 12;
  return `<div class="snowfall snow-${depth}" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<i style="--x:${(i * 37 + (depth === "front" ? 17 : 5)) % 100}%;--y:${(i * 23) % 96}%;--delay:-${i * 0.91}s;--duration:${(depth === "back" ? 19 : depth === "mid" ? 13 : 8) + (i % 5)}s;--size:${(depth === "back" ? 2 : depth === "mid" ? 4 : 7) + (i % 3)}px;--drift:${i % 2 ? 14 : -16}px"></i>`).join("")}</div>`;
}
