import { TRACKS, type TrackId } from "./catalog";
export type MusicState = "playing" | "paused" | "blocked" | "unavailable";
/** Five original scores, rendered as soft music-box partials; no remote audio. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<OscillatorNode>();
  private cursor = 0;
  private next = 0;
  private track: TrackId;
  private wanted = true;
  private hidden = false;
  private volume: number;
  private generation = 0;
  state: MusicState = "paused";
  private changed: (state: MusicState) => void;
  constructor(
    track: TrackId,
    volume: number,
    changed: (state: MusicState) => void,
  ) {
    this.track = track;
    this.volume = volume;
    this.changed = changed;
  }
  private notify(state: MusicState): void {
    this.state = state;
    this.changed(state);
  }
  private ensure(): boolean {
    if (this.context) return true;
    try {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      this.gain.connect(compressor);
      compressor.connect(this.context.destination);
      return true;
    } catch {
      this.notify("unavailable");
      return false;
    }
  }
  private voice(midi: number, at: number, beats: number, bass = false): void {
    const ctx = this.context!;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (const [partial, level] of bass
      ? [
          [1, 0.07],
          [2, 0.015],
        ]
      : [
          [1, 0.2],
          [2, 0.035],
          [3, 0.012],
        ]) {
      const oscillator = ctx.createOscillator(),
        envelope = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency! * partial!;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(level!, at + 0.009);
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        at + Math.min(3, beats + 1.2),
      );
      oscillator.connect(envelope);
      envelope.connect(this.gain!);
      oscillator.start(at);
      oscillator.stop(at + Math.min(3, beats + 1.2) + 0.04);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
      };
    }
  }
  private schedule(): void {
    const ctx = this.context!;
    if (ctx.state !== "running" || this.hidden || !this.wanted) return;
    const score = TRACKS.find((t) => t.id === this.track)!;
    const beat = 60 / score.bpm;
    while (this.next < ctx.currentTime + 0.25) {
      const note = score.notes[this.cursor]!;
      const duration =
        score.id === "waltz"
          ? [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1][this.cursor % 8]!
          : this.cursor % 8 === 7
            ? 2
            : 1;
      if (note) this.voice(note, this.next, duration * beat);
      if (this.cursor % (score.id === "waltz" ? 4 : 8) === 0)
        this.voice(score.root - 12, this.next, 3 * beat, true);
      this.next += duration * beat;
      this.cursor = (this.cursor + 1) % score.notes.length;
    }
  }
  private clear(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* already ended */
      }
    }
    this.voices.clear();
  }
  async play(): Promise<void> {
    this.wanted = true;
    if (this.hidden || !this.ensure()) return;
    const generation = ++this.generation;
    try {
      // Some browsers leave resume pending until a gesture. Never claim playback then.
      await Promise.race([
        this.context!.resume(),
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
      if (generation !== this.generation || this.hidden || !this.wanted) return;
      if (this.context!.state !== "running") {
        this.notify("blocked");
        return;
      }
      if (!this.timer) {
        this.next = this.context!.currentTime + 0.04;
        this.schedule();
        this.timer = setInterval(() => this.schedule(), 80);
      }
      this.notify("playing");
    } catch {
      if (generation === this.generation) this.notify("blocked");
    }
  }
  pause(): void {
    this.wanted = false;
    this.generation++;
    this.clear();
    void this.context?.suspend();
    this.notify("paused");
  }
  toggle(): void {
    if (this.state === "playing") this.pause();
    else void this.play();
  }
  select(track: TrackId): void {
    this.track = track;
    this.cursor = 0;
    this.clear();
  }
  setVolume(volume: number): void {
    this.volume = volume;
    if (this.gain)
      this.gain.gain.setTargetAtTime(volume, this.context!.currentTime, 0.03);
  }
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) {
      this.generation++;
      this.clear();
      void this.context?.suspend();
      this.notify("paused");
    } else if (this.wanted) void this.play();
  }
  get isWanted(): boolean {
    return this.wanted;
  }
  destroy(): void {
    this.generation++;
    this.clear();
    void this.context?.close();
  }
}
