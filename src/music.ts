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
    let at = 0;
    for (const token of score.score.split(" ")) {
      const [midi, beats] = token.split(":").map(Number) as [number, number];
      const duration = (beats * 60) / score.bpm;
      if (midi) {
        const hz = 440 * 2 ** ((midi - 69) / 12),
          n = Math.min(
            Math.floor((duration + 0.8) * rate),
            data.length - Math.floor(at * rate),
          );
        for (let i = 0; i < n; i++) {
          const t = i / rate,
            env =
              Math.min(1, t / 0.008) *
              Math.exp(-t / Math.min(0.65, duration * 0.8));
          data[Math.floor(at * rate) + i]! +=
            (Math.sin(t * hz * Math.PI * 2) * 0.27 +
              Math.sin(t * hz * 4 * Math.PI) * 0.045 +
              Math.sin(t * hz * 6 * Math.PI) * 0.012) *
            env;
        }
      }
      at += duration;
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
        this.context = new AudioContext();
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
    void this.context?.suspend();
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
      void this.context?.suspend();
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
    void this.context?.close();
  }
}
