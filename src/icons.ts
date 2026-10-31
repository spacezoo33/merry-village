export type Icon =
  | "village"
  | "music"
  | "night"
  | "camera"
  | "snow"
  | "sun"
  | "moon"
  | "play"
  | "pause"
  | "close"
  | "check"
  | "lock"
  | "download"
  | "star"
  | "aurora"
  | "lantern";
const paths: Record<Icon, string> = {
  village:
    '<path d="m2 11 6-5 6 5M4 10v11h8V10m1-3 4-4 5 5m-7 2v11h6V8M7 21v-6h3v6m7-9h2v3h-2"/>',
  music:
    '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  night:
    '<path d="M17 3a8 8 0 1 0 4 13 7 7 0 0 1-4-13Z"/><path d="m5 2 .7 2.3L8 5l-2.3.7L5 8l-.7-2.3L2 5l2.3-.7Z"/>',
  camera:
    '<path d="m8 5 1-2h6l1 2h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.7 14A9 9 0 0 1 10 3.3 9 9 0 1 0 20.7 14Z"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  aurora:
    '<path d="M2 15c4-15 5 12 10-3S17 9 22 4M2 20c4-15 5 12 10-3s5-3 10-8"/>',
  lantern: '<path d="M6 7q6-5 12 0v8q-6 5-12 0Zm2 13h8m-4-3v5M8 4h8"/>',
};
export const icon = (name: Icon) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
