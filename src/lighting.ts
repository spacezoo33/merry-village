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
  const plateau = (phase: number) => {
    const t = Math.max(0, Math.min(1, (Math.sin(phase) + 0.4) / 0.8));
    return t * t * (3 - 2 * t);
  };
  if (pattern === "all") return plateau((time * Math.PI) / 3);
  if (pattern === "alternate")
    return plateau((time * Math.PI) / 3 + ((index % 3) * Math.PI * 2) / 3);
  if (pattern === "random")
    return smooth(time * (0.85 + (index % 7) * 0.055) + index * 2.3999) ** 2.3;
  return index % 3 === 0
    ? 0.58 + 0.42 * smooth(time * 0.65 + index * 2.3999)
    : 0.82;
}

export function nextLighting(state: {
  lights: boolean;
  lightPattern: LightPattern;
}) {
  if (!state.lights)
    return { lights: true, lightPattern: "all" as LightPattern };
  const index = LIGHT_PATTERNS.findIndex((p) => p.id === state.lightPattern);
  return index === LIGHT_PATTERNS.length - 1
    ? { lights: false, lightPattern: state.lightPattern }
    : { lights: true, lightPattern: LIGHT_PATTERNS[index + 1]!.id };
}
export function lightLabel(state: {
  lights: boolean;
  lightPattern: LightPattern;
}) {
  return !state.lights
    ? "조명 OFF"
    : {
        all: "전체 점멸",
        alternate: "교차 점멸",
        random: "랜덤 점멸",
        gentle: "은은한 빛",
      }[state.lightPattern];
}
