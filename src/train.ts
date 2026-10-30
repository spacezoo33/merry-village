import { TrainClock } from './train-clock';
import { CAR_SPACING, trainPose } from './train-path';
import { frameMarkup } from './train-art';

export type TrainStatus = { running: boolean; reduced: boolean; wanted: boolean };
export function createTrainRide(stage: HTMLElement, onState: (state: TrainStatus) => void) {
  const clock = new TrainClock();
  const cars = [...stage.querySelectorAll<HTMLElement>('[data-train-car]')];
  const frames = cars.map((car) => [...car.querySelectorAll<HTMLElement>('.train-frame')]);
  const directions = [-1, -1, -1];
  const activeFrame = [0, 0, 0];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let width = stage.clientWidth;
  let request = 0;
  let destroyed = false;
  function render(): void {
    for (const [i, car] of cars.entries()) {
      const pose = trainPose(clock.distance - i * CAR_SPACING);
      car.style.transform = `translate3d(${pose.x * width / 1000}px,${pose.y * width / 1000}px,0) scale(${pose.scale})`;
      car.style.zIndex = String(pose.z);
      if (directions[i] !== pose.direction) {
        const next = 1 - activeFrame[i]!;
        frames[i]![next]!.innerHTML = frameMarkup(i === 0, pose.direction);
        frames[i]![next]!.classList.add('active');
        frames[i]![activeFrame[i]!]!.classList.remove('active');
        activeFrame[i] = next;
        directions[i] = pose.direction;
        car.dataset.direction = String(pose.direction);
      }
    }
  }
  function tick(time: number): void {
    request = 0;
    if (destroyed || !clock.active) return;
    clock.tick(time);
    render();
    request = requestAnimationFrame(tick);
  }
  function sync(): void {
    if (request) cancelAnimationFrame(request);
    request = 0;
    render();
    onState({ running: clock.active, reduced: clock.reduced, wanted: clock.wanted });
    if (clock.active && !destroyed) request = requestAnimationFrame(tick);
  }
  function visibility(): void {
    clock.setHidden(document.hidden);
    stage.closest('#app')?.classList.toggle('ambient-paused', document.hidden);
    sync();
  }
  function preference(): void { clock.setReduced(media.matches); sync(); }
  function resize(): void { width = stage.clientWidth; render(); }
  function pagehide(): void { clock.setHidden(true); sync(); }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(stage);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', visibility);
  if (typeof media.addEventListener === 'function') media.addEventListener('change', preference);
  else media.addListener(preference);
  clock.setHidden(document.hidden);
  clock.setReduced(media.matches);
  sync();
  return {
    toggle(): void { if (!clock.reduced) clock.setWanted(!clock.wanted); sync(); },
    destroy(): void {
      destroyed = true;
      if (request) cancelAnimationFrame(request);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', visibility);
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', preference);
      else media.removeListener(preference);
    },
  };
}
