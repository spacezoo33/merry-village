import atlasUrl from './assets/train-directions.png';

type Frame = { crop: [number, number, number, number]; anchor: [number, number] };
// Pixel bounds isolate each vehicle. Anchors are the midpoint of both bogies,
// not the lowest/frontmost visible wheel (which drifts off the rail in end views).
const engines: Frame[] = [
  { crop: [35, 40, 322, 292], anchor: [190, 283] },
  { crop: [365, 35, 265, 300], anchor: [473, 276] },
  { crop: [695, 30, 160, 305], anchor: [775, 280] },
  { crop: [960, 30, 270, 305], anchor: [1110, 270] },
  { crop: [10, 345, 330, 280], anchor: [180, 595] },
  { crop: [345, 340, 290, 290], anchor: [480, 574] },
  { crop: [695, 340, 160, 280], anchor: [773, 580] },
  { crop: [950, 340, 290, 290], anchor: [1105, 575] },
];
const wagons: Frame[] = [
  { crop: [30, 655, 305, 265], anchor: [182, 888] },
  { crop: [345, 650, 290, 275], anchor: [475, 880] },
  { crop: [695, 650, 175, 275], anchor: [780, 875] },
  { crop: [950, 655, 285, 275], anchor: [1117, 880] },
  { crop: [30, 945, 310, 255], anchor: [183, 1170] },
  { crop: [345, 935, 300, 275], anchor: [481, 1166] },
  { crop: [695, 935, 175, 280], anchor: [781, 1160] },
  { crop: [950, 940, 290, 275], anchor: [1102, 1161] },
];
export function frameMarkup(engine: boolean, direction: number): string {
  const { crop: [x, y, width, height], anchor: [ax, ay] } = (engine ? engines : wagons)[direction]!;
  // Normalize roof height across views; never rotate an upright sprite in screen space.
  const referenceRise = engine ? 220 : 180;
  const vertical = referenceRise / (ay - y);
  return `<svg viewBox="0 0 360 360" width="360" height="360" aria-hidden="true"><g transform="translate(180 290) scale(1 ${vertical}) translate(-180 -290)"><svg x="${180 - ax + x}" y="${290 - ay + y}" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" overflow="hidden"><image href="${atlasUrl}" width="1254" height="1254"/></svg></g></svg>`;
}
export function trainMarkup(): string {
  const chassis = [0, 1, 2].map(i => `<svg class="train-chassis" data-train-chassis="${i}" viewBox="0 0 1000 1200" aria-hidden="true"><path class="chassis-outline"/><path class="chassis-metal"/></svg>`).join('');
  const couplers = [0, 1].map(i => `<svg class="train-coupler" data-train-coupler="${i}" viewBox="0 0 1000 1200" aria-hidden="true"><path class="coupler-outline"/><path class="coupler-metal"/><circle r="2.8"/><circle r="2.8"/></svg>`).join('');
  const vehicles = [true, false, false].map((engine, i) => `<div class="train-unit ${engine ? 'locomotive' : 'wagon'}" data-train-car="${i}" role="img" aria-label="${engine ? '운행 기관차' : `선물 객차 ${i}`}"><div class="train-body"><div class="train-frame active">${frameMarkup(engine, 0)}</div><div class="train-frame">${frameMarkup(engine, 0)}</div></div></div>`).join('');
  return chassis + couplers + vehicles;
}
