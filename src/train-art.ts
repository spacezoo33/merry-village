import atlasUrl from './assets/train-directions.png';

type Frame = { crop: [number, number, number, number]; anchor: [number, number] };
// Pixel bounds isolate each vehicle. Anchors are the wheelbase contact centre.
const engines: Frame[] = [
  { crop: [35, 40, 322, 292], anchor: [190, 283] },
  { crop: [365, 35, 265, 300], anchor: [490, 288] },
  { crop: [695, 30, 160, 305], anchor: [775, 301] },
  { crop: [960, 30, 270, 305], anchor: [1093, 290] },
  { crop: [10, 345, 330, 280], anchor: [180, 595] },
  { crop: [345, 340, 290, 290], anchor: [487, 594] },
  { crop: [695, 340, 160, 280], anchor: [773, 600] },
  { crop: [950, 340, 290, 290], anchor: [1091, 594] },
];
const wagons: Frame[] = [
  { crop: [30, 655, 305, 265], anchor: [182, 888] },
  { crop: [345, 650, 290, 275], anchor: [490, 897] },
  { crop: [695, 650, 175, 275], anchor: [780, 901] },
  { crop: [950, 655, 285, 275], anchor: [1090, 899] },
  { crop: [30, 945, 310, 255], anchor: [183, 1170] },
  { crop: [345, 935, 300, 275], anchor: [494, 1183] },
  { crop: [695, 935, 175, 280], anchor: [781, 1190] },
  { crop: [950, 940, 290, 275], anchor: [1091, 1180] },
];
export function frameMarkup(engine: boolean, direction: number): string {
  const { crop: [x, y, width, height], anchor: [ax, ay] } = (engine ? engines : wagons)[direction]!;
  return `<svg viewBox="0 0 360 330" width="360" height="330" aria-hidden="true"><svg x="${180 - ax + x}" y="${290 - ay + y}" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" overflow="hidden"><image href="${atlasUrl}" width="1254" height="1254"/></svg></svg>`;
}
export function trainMarkup(): string {
  return [true, false, false].map((engine, i) => `<div class="train-unit ${engine ? 'locomotive' : 'wagon'}" data-train-car="${i}" role="img" aria-label="${engine ? '운행 기관차' : `선물 객차 ${i}`}"><div class="train-body"><div class="train-frame active">${frameMarkup(engine, 0)}</div><div class="train-frame">${frameMarkup(engine, 0)}</div></div></div>`).join('');
}
