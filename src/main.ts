import './style.css';
import { createTrainRide } from './train';
import { icon, type Decoration } from './icons';
import { scene, artwork, type Asset } from './scene';

const decorations: { id: Decoration; label: string; particle: string; asset: Asset }[] = [
  { id: 'train', label: '기차', particle: '를', asset: 'train' },
  { id: 'tree', label: '트리', particle: '를', asset: 'tree' },
  { id: 'santa', label: '산타', particle: '를', asset: 'santa' },
  { id: 'snowman', label: '눈사람', particle: '을', asset: 'snowman' },
  { id: 'village', label: '마을', particle: '을', asset: 'cottage' },
];
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="app-header"><span class="header-star" aria-hidden="true">✦</span><p class="eyebrow">A LITTLE CHRISTMAS MAGIC</p><h1>메리빌리지</h1><div class="brand-ribbon">MERRY VILLAGE</div><p class="subtitle">나만의 작은 크리스마스 마을</p></header>
  <section class="music-box" aria-label="크리스마스 오르골">
    <div class="controls" role="group" aria-label="오르골 설정">
      <button class="control" id="music-toggle" type="button" aria-label="음악 재생 준비 중" aria-describedby="music-note"><span class="control-disc">${icon('music')}</span><span>음악</span></button>
      <button class="control" id="snow-toggle" type="button" aria-label="눈 내리기" aria-pressed="true"><span class="control-disc">${icon('snow')}</span><span>눈 내리기</span></button>
      <button class="control" id="night-toggle" type="button" aria-label="밤 분위기" aria-pressed="false"><span class="control-disc">${icon('moon')}</span><span>낮 / 밤</span></button>
    </div>
    <div class="scene-wrap">${scene()}<div class="snowfall" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--y:${(i * 23) % 96}%;--delay:-${i * .73}s;--duration:${8 + (i % 5)}s;--size:${2 + (i % 3)}px"></i>`).join('')}</div></div>
  </section>
  <section class="decoration-section" aria-label="마을 꾸미기"><div class="decoration-menu" role="group" aria-label="강조할 장식품 선택">${decorations.map(({ id, label, asset }) => `<button class="decoration-button" type="button" data-select="${id}" aria-pressed="${id === 'tree'}"><span class="menu-art">${artwork(asset, true)}</span><span class="decoration-label">${label}</span>${id === 'train' ? '<span class="train-status">운행 중</span>' : ''}</button>`).join('')}</div><p class="selection-note" aria-live="polite" id="selection-note"></p></section>
  <p id="music-note" class="music-note" role="status">음악과 장식품 바꾸기는 준비 중이에요.</p>`;

let snow = true;
let night = false;
document.querySelector<HTMLButtonElement>('#music-toggle')!.addEventListener('click', () => {
  document.querySelector('#music-note')!.textContent = '음악 재생은 아직 준비 중이에요. 잠시만 기다려 주세요.';
});
const snowButton = document.querySelector<HTMLButtonElement>('#snow-toggle')!;
snowButton.addEventListener('click', () => {
  snow = !snow;
  snowButton.setAttribute('aria-pressed', String(snow));
  app.classList.toggle('snow-off', !snow);
});
const nightButton = document.querySelector<HTMLButtonElement>('#night-toggle')!;
nightButton.addEventListener('click', () => {
  night = !night;
  nightButton.setAttribute('aria-pressed', String(night));
  nightButton.querySelector('.control-disc')!.innerHTML = icon(night ? 'sun' : 'moon');
  app.classList.toggle('night', night);
  document.documentElement.classList.toggle('night-theme', night);
});
function selectDecoration(id: Decoration): void {
  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-select]')) {
    button.setAttribute('aria-pressed', String(button.dataset.select === id));
  }
  for (const ornament of app.querySelectorAll<HTMLElement>('[data-ornament]')) {
    ornament.classList.toggle('selected', ornament.dataset.ornament === id);
  }
  app.classList.toggle('train-selected', id === 'train');
  const item = decorations.find((item) => item.id === id)!;
  document.querySelector('#selection-note')!.textContent = `${item.label}${item.particle} 선택했어요 · 장식품 바꾸기는 곧 만나요`;
}
for (const button of app.querySelectorAll<HTMLButtonElement>('[data-select]')) {
  button.addEventListener('click', () => {
    selectDecoration(button.dataset.select as Decoration);
    if (button.dataset.select === 'train') ride.toggle();
  });
}
selectDecoration('tree');

const trainButton = app.querySelector<HTMLButtonElement>('[data-select="train"]')!;
const ride = createTrainRide(app.querySelector<HTMLElement>('.miniature-stage')!, ({ running, reduced }) => {
  const status = reduced ? '모션 줄임' : running ? '운행 중' : '일시정지';
  trainButton.dataset.running = String(running);
  trainButton.querySelector('.train-status')!.textContent = status;
  trainButton.setAttribute('aria-label', `기차 · ${status} · ${reduced ? '움직임 줄이기 설정으로 정지' : running ? '누르면 일시정지' : '누르면 다시 운행'}`);
  if (trainButton.getAttribute('aria-pressed') === 'true') {
    document.querySelector('#selection-note')!.textContent = reduced ? '움직임 줄이기 설정으로 기차가 정지되어 있어요.' : running ? '기차가 마을을 여행하고 있어요 · 누르면 잠시 쉬어요' : '기차가 쉬고 있어요 · 다시 누르면 이어서 출발해요';
  }
});
if (import.meta.hot) import.meta.hot.dispose(() => ride.destroy());
