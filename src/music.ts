import { audioContext } from "./audio-engine";
import { TRACKS, type TrackId } from "./catalog";
export type MusicState = "playing" | "paused" | "blocked" | "unavailable";
/** In-house synthesis of documented public-domain carols. No downloaded recording. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<TrackId, AudioBuffer>();
  private offset = 0;
  private started = 0;
  private wanted = true;
  private hidden = false;
  private generation = 0;
  state: MusicState = "paused";
  private track: TrackId;
  private volume: number;
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
  private notify(s: MusicState) {
    this.state = s;
    this.changed(s);
  }
  get duration() {
    return (
      (TRACKS.find((t) => t.id === this.track)!
        .score.split(" ")
        .reduce((a, n) => a + Number(n.split(":")[1]), 0) *
        60) /
      TRACKS.find((t) => t.id === this.track)!.bpm
    );
  }
  get currentTime() {
    return (
      (this.offset +
        (this.source && this.context
          ? this.context.currentTime - this.started
          : 0)) %
      this.duration
    );
  }
  private buffer(): AudioBuffer {
    const cached = this.buffers.get(this.track);
    if (cached) return cached;
    const score = TRACKS.find((t) => t.id === this.track)!,
      rate = 22050,
      buffer = this.context!.createBuffer(
        1,
        Math.ceil(this.duration * rate),
        rate,
      ),
      data = buffer.getChannelData(0);
    // Fresh stereo-like bell overtones, low accompaniment and sparse small chimes.
    // Every voice has an attack/release; peak normalisation prevents track-to-track jumps.
    const add = (
      midi: number,
      at: number,
      length: number,
      level: number,
      kind: "bell" | "soft" = "bell",
    ) => {
      const hz = 440 * 2 ** ((midi - 69) / 12),
        start = Math.floor(at * rate),
        n = Math.min(Math.floor((length + 1.4) * rate), data.length - start);
      for (let i = 0; i < n; i++) {
        const t = i / rate,
          attack = Math.min(1, t / 0.009),
          release = Math.exp(
            -t / (kind === "bell" ? Math.min(1.05, length + 0.2) : 0.55),
          );
        const wave =
          kind === "bell"
            ? Math.sin(t * hz * Math.PI * 2) +
              0.28 * Math.sin(t * hz * 2.76 * Math.PI * 2) * Math.exp(-t * 2) +
              0.1 * Math.sin(t * hz * 5.4 * Math.PI * 2) * Math.exp(-t * 5)
            : Math.sin(t * hz * Math.PI * 2) +
              0.13 * Math.sin(t * hz * 4 * Math.PI);
        data[start + i]! += wave * attack * release * level;
      }
    };
    let at = 0;
    for (const token of score.score.split(" ")) {
      const [midi, beats] = token.split(":").map(Number) as [number, number],
        length = (beats * 60) / score.bpm;
      if (midi) add(midi, at, length, 0.21);
      at += length;
    }
    const beat = 60 / score.bpm;
    const progression = [0, 5, 0, 7, 0, 5, 7, 0];
    for (let bar = 0; bar * score.meter * beat < this.duration; bar++) {
      const root = score.root + progression[bar % 8]!,
        base = bar * score.meter * beat;
      add(root - 12, base, beat * 1.2, 0.052, "soft");
      for (let step = 1; step < score.meter; step++) {
        const note = [root + 4, root + 7][(step - 1) % 2]!;
        add(note, base + step * beat, beat, 0.023, "soft");
      }
      if (bar % 4 === 0 && base + beat / 2 < this.duration)
        add(root + 24, base + beat / 2, 0.7, 0.016);
    }
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v));
    const normalise = 0.36 / Math.max(peak, 0.001);
    for (let i = 0; i < data.length; i++) {
      const fade = Math.min(
        1,
        i / (rate * 0.025),
        (data.length - i) / (rate * 0.09),
      );
      data[i]! *= normalise * fade;
    }
    if (this.buffers.size >= 2)
      this.buffers.delete(this.buffers.keys().next().value!);
    this.buffers.set(this.track, buffer);
    return buffer;
  }
  async play() {
    this.wanted = true;
    if (this.hidden) return;
    const generation = ++this.generation;
    try {
      if (!this.context) {
        this.context = audioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.context.destination);
      }
      await Promise.race([
        this.context.resume(),
        new Promise((r) => setTimeout(r, 350)),
      ]);
      if (generation !== this.generation || this.hidden || !this.wanted) return;
      if (this.context.state !== "running") {
        this.notify("blocked");
        return;
      }
      if (!this.source) {
        const source = this.context.createBufferSource();
        source.buffer = this.buffer();
        source.loop = true;
        source.connect(this.gain!);
        source.start(0, this.offset % this.duration);
        this.source = source;
        this.started = this.context.currentTime;
      }
      this.notify("playing");
    } catch {
      this.notify(this.context ? "blocked" : "unavailable");
    }
  }
  private stop() {
    this.offset = this.currentTime;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }
  pause() {
    this.wanted = false;
    this.generation++;
    this.stop();
    this.notify("paused");
  }
  toggle() {
    if (this.state === "playing") this.pause();
    else void this.play();
  }
  select(track: TrackId) {
    this.generation++;
    this.stop();
    this.track = track;
    this.offset = 0;
    this.notify("paused");
  }
  seek(seconds: number) {
    const resume = this.wanted;
    this.generation++;
    this.stop();
    this.offset = Math.max(0, Math.min(this.duration - 0.01, seconds));
    if (resume) void this.play();
  }
  setVolume(v: number) {
    this.volume = v;
    this.gain?.gain.setTargetAtTime(v, this.context!.currentTime, 0.03);
  }
  setHidden(hidden: boolean) {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.generation++;
      this.stop();
      this.notify("paused");
    } else if (this.wanted) void this.play();
  }
  get isWanted() {
    return this.wanted;
  }
  destroy() {
    this.generation++;
    this.stop();
    this.buffers.clear();
    this.gain?.disconnect();
  }
}
