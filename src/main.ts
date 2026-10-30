import './style.css';
import { icon, type Decoration } from './icons';
import { scene } from './scene';

const decorations: { id: Decoration; label: string; particle: string }[] = [
  { id: 'train', label: '기차', particle: '를' },
  { id: 'tree', label: '트리', particle: '를' },
  { id: 'santa', label: '산타', particle: '를' },
  { id: 'snowman', label: '눈사람', particle: '을' },
  { id: 'village', label: '마을', particle: '을' },
];
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="app-header"><div class="wordmark"><span class="brand-mark" aria-hidden="true">${icon('tree')}</span>메리빌리지<span class="brand-dot">.</span></div><span class="edition">A LITTLE CHRISTMAS</span></header>
  <section class="music-box" aria-label="크리스마스 오르골">
    <div class="intro"><span class="eyebrow"><span></span> YOUR LITTLE WINTER WONDERLAND</span><h1>작은 마을에 찾아온<br>크리스마스</h1><p>가만히 바라봐도, 마음이 포근해지는 곳.</p></div>
    <div class="controls" role="group" aria-label="오르골 설정">
      <button class="control" id="music-toggle" type="button" aria-pressed="false" aria-describedby="music-note">${icon('music')}<span>음악 <b>끔</b></span></button>
      <button class="control" id="snow-toggle" type="button" aria-pressed="true">${icon('snow')}<span>눈 <b>켬</b></span></button>
      <button class="control" id="night-toggle" type="button" aria-pressed="false">${icon('sun')}<span>밤으로</span></button>
    </div>
    <div class="scene-wrap"><div class="sky-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>${scene()}<div class="snowfall" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--delay:-${i * .73}s;--duration:${7 + (i % 5)}s;--size:${2 + (i % 3)}px"></i>`).join('')}</div></div>
    <div class="scene-caption"><span class="caption-line"></span><span>작고 소중한 겨울 한 조각</span><span class="caption-line"></span></div>
    <p id="music-note" class="music-note">음악은 켜짐·꺼짐 표시만 지원해요. 재생은 준비 중이에요.</p>
  </section>
  <section class="decoration-section" aria-labelledby="decoration-title"><div class="section-heading"><h2 id="decoration-title">마을의 작은 친구들</h2><span>하나씩 만나보세요</span></div><div class="decoration-menu" role="group" aria-label="강조할 장식품 선택">${decorations.map(({ id, label }) => `<button class="decoration-button" type="button" data-select="${id}" aria-pressed="${id === 'tree'}"><span class="decoration-icon">${icon(id)}</span><span>${label}</span><i aria-hidden="true"></i></button>`).join('')}</div><p class="selection-note" aria-live="polite" id="selection-note"></p></section>
  <footer class="app-footer"><span>MERRY VILLAGE</span><span>작은 행복이 모이는 곳</span></footer>`;

let music = false;
let snow = true;
let night = false;
const musicButton = document.querySelector<HTMLButtonElement>('#music-toggle')!;
musicButton.addEventListener('click', () => {
  music = !music;
  musicButton.setAttribute('aria-pressed', String(music));
  musicButton.querySelector('b')!.textContent = music ? '켬' : '끔';
});
const snowButton = document.querySelector<HTMLButtonElement>('#snow-toggle')!;
snowButton.addEventListener('click', () => {
  snow = !snow;
  snowButton.setAttribute('aria-pressed', String(snow));
  snowButton.querySelector('b')!.textContent = snow ? '켬' : '끔';
  app.classList.toggle('snow-off', !snow);
});
const nightButton = document.querySelector<HTMLButtonElement>('#night-toggle')!;
nightButton.addEventListener('click', () => {
  night = !night;
  nightButton.setAttribute('aria-pressed', String(night));
  nightButton.innerHTML = `${icon(night ? 'moon' : 'sun')}<span>${night ? '낮으로' : '밤으로'}</span>`;
  app.classList.toggle('night', night);
  document.documentElement.classList.toggle('night-theme', night);
});

function selectDecoration(id: Decoration): void {
  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-select]')) {
    button.setAttribute('aria-pressed', String(button.dataset.select === id));
  }
  for (const ornament of app.querySelectorAll<SVGGElement>('[data-ornament]')) {
    ornament.classList.toggle('selected', ornament.dataset.ornament === id);
  }
  const item = decorations.find((item) => item.id === id)!;
  document.querySelector('#selection-note')!.textContent = `${item.label}${item.particle} 바라보고 있어요. 장식품 바꾸기는 곧 만나요.`;
}
for (const button of app.querySelectorAll<HTMLButtonElement>('[data-select]')) {
  button.addEventListener('click', () => selectDecoration(button.dataset.select as Decoration));
}
selectDecoration('tree');
