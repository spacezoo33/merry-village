export const LIGHT_PATTERNS = [
  {
    id: "all",
    name: "전체 점멸",
    description: "전구가 함께 천천히 숨 쉬듯 켜져요",
  },
  {
    id: "alternate",
    name: "교차 점멸",
    description: "빨강·금색·초록 그룹이 번갈아 빛나요",
  },
  {
    id: "random",
    name: "랜덤 점멸",
    description: "각 전구가 서로 다른 리듬으로 반짝여요",
  },
  {
    id: "gentle",
    name: "은은한 반짝임",
    description: "따뜻한 빛을 유지하며 잔잔하게 반짝여요",
  },
] as const;
export type LightPattern = (typeof LIGHT_PATTERNS)[number]["id"];
/** Slow continuous functions: no hard transitions, randomness is deterministic/no flicker. */
export function lightLevel(
  pattern: LightPattern,
  time: number,
  index: number,
  reduced = false,
): number {
  if (reduced) return 0.78;
  const smooth = (phase: number) => (1 + Math.sin(phase)) / 2;
  if (pattern === "all") return 0.04 + 0.96 * smooth((time * Math.PI) / 3);
  if (pattern === "alternate")
    return (
      0.08 +
      0.92 * smooth((time * Math.PI) / 3 + ((index % 3) * Math.PI * 2) / 3)
    );
  if (pattern === "random")
    return (
      0.12 +
      0.88 * smooth(time * (0.67 + (index % 7) * 0.037) + index * 2.3999) ** 2
    );
  return 0.65 + 0.35 * smooth(time * 0.65 + index * 2.3999);
}
