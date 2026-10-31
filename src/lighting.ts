export const LIGHT_PATTERNS = [
  {
    id: "all",
    name: "전체 동시 점멸",
    description: "1초마다 네 조명 그룹이 함께 켜지고 꺼져요",
  },
  {
    id: "alternate",
    name: "좌우 순차 점멸",
    description: "0.5초마다 화면 왼쪽에서 오른쪽으로 이동해요",
  },
  {
    id: "random",
    name: "불규칙 랜덤 점멸",
    description: "0.5초마다 개별 조명이 불규칙하게 반짝여요",
  },
  {
    id: "gentle",
    name: "은은한 동시 밝기 변화",
    description: "2.8초 주기로 모든 조명이 함께 밝아져요",
  },
] as const;
export type LightPattern = (typeof LIGHT_PATTERNS)[number]["id"];
/** screenX is the current projected position, including the rotating tree's LEDs. */
export function lightLevel(
  pattern: LightPattern,
  time: number,
  index: number,
  reduced = false,
  screenX = 0.5,
) {
  if (reduced) return 0.78;
  const t = Math.max(0, time);
  if (pattern === "all") return Math.floor(t) % 2 === 0 ? 1 : 0;
  const slot = Math.floor(t / 0.5);
  if (pattern === "alternate") {
    const position = Math.min(
      7,
      Math.floor(Math.max(0, Math.min(1, screenX)) * 8),
    );
    return Math.abs(position - (slot % 8)) <= 1 ? 1 : 0;
  }
  if (pattern === "random") {
    // One anchor in every eight emitters stays on; the rest get a fresh slot hash.
    const hash = Math.sin((index + 1) * 127.1 + slot * 311.7) * 43758.5453;
    return index % 8 === slot % 8 || hash - Math.floor(hash) > 0.38 ? 1 : 0;
  }
  return 0.28 + (0.72 * (1 - Math.cos((t * Math.PI * 2) / 2.8))) / 2;
}
export function nextLighting(state: { lightPattern: LightPattern }) {
  const i = LIGHT_PATTERNS.findIndex((p) => p.id === state.lightPattern);
  return { lightPattern: LIGHT_PATTERNS[(i + 1) % LIGHT_PATTERNS.length]!.id };
}
export function lightLabel(state: { lightPattern: LightPattern }) {
  return LIGHT_PATTERNS.find((p) => p.id === state.lightPattern)!.name;
}
