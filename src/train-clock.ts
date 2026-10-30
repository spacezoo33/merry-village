import { LAP_MS, TRACK_LENGTH } from './train-path.ts';

/** A single resumable timeline; blocked time never advances the train. */
export class TrainClock {
  wanted = true;
  hidden = false;
  reduced = false;
  elapsed = 0;
  private previous: number | null = null;
  get active(): boolean { return this.wanted && !this.hidden && !this.reduced; }
  get distance(): number { return TRACK_LENGTH * .75 + this.elapsed / LAP_MS * TRACK_LENGTH; }
  setWanted(value: boolean): void { this.wanted = value; this.previous = null; }
  setHidden(value: boolean): void { this.hidden = value; this.previous = null; }
  setReduced(value: boolean): void { this.reduced = value; this.previous = null; }
  tick(now: number): void {
    if (!this.active) { this.previous = null; return; }
    if (this.previous !== null) this.elapsed += Math.max(0, now - this.previous);
    this.previous = now;
  }
}
