import { TrainClock } from './train-clock';
import { CARS, consistPose } from './train-consist';
import { frameMarkup } from './train-art';

export type TrainStatus = { running: boolean; reduced: boolean; wanted: boolean };
export function createTrainRide(stage: HTMLElement, onState: (state: TrainStatus) => void) {
  const clock = new TrainClock();
  const cars = [...stage.querySelectorAll<HTMLElement>('[data-train-car]')];
  const frames = cars.map((car) => [...car.querySelectorAll<HTMLElement>('.train-frame')]);
  const chassis = [...stage.querySelectorAll<SVGElement>('[data-train-chassis]')];
  const couplers = [...stage.querySelectorAll<SVGElement>('[data-train-coupler]')];
  cars.forEach((car, i) => { car.style.width = `${CARS[i]!.artWidth / 10}%`; });
  const directions = [-1, -1, -1];
  const activeFrame = [0, 0, 0];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let width = stage.clientWidth;
  let request = 0;
  let destroyed = false;
  function render(): void {
    const poses = consistPose(clock.distance);
    for (const [i, car] of cars.entries()) {
      const pose = poses[i]!;
      car.style.transform = `translate3d(${pose.position.x * width / 1000}px,${pose.position.y * width / 1000}px,0) scale(${pose.scale})`;
      car.style.zIndex = String(pose.z);
      const mount = `M${pose.rearHitch.x},${pose.rearHitch.y}L${pose.frontHitch.x},${pose.frontHitch.y}`;
      chassis[i]!.style.zIndex = String(pose.z);
      for (const path of chassis[i]!.querySelectorAll('path')) path.setAttribute('d', mount);
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
    for (const [i, coupler] of couplers.entries()) {
      const a = poses[i]!.rearHitch, b = poses[i + 1]!.frontHitch;
      coupler.style.zIndex = String(Math.round((poses[i]!.position.y + poses[i + 1]!.position.y) / 2));
      for (const path of coupler.querySelectorAll('path')) path.setAttribute('d', `M${a.x},${a.y}L${b.x},${b.y}`);
      const circles = coupler.querySelectorAll('circle');
      circles[0]!.setAttribute('cx', String(a.x)); circles[0]!.setAttribute('cy', String(a.y));
      circles[1]!.setAttribute('cx', String(b.x)); circles[1]!.setAttribute('cy', String(b.y));
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
