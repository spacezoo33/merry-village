import { synthMusic } from "./music-synth.ts";
import { audioContext, audioStem } from "./audio-engine.ts";
import { TRACKS, type TrackId } from "./catalog.ts";
export type MusicState = "playing" | "paused" | "blocked" | "unavailable";
/** In-house synthesis of documented public-domain carols. No downloaded recording. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<TrackId, AudioBuffer>();
  private repeat = false;
  private ended: () => void;
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
    ended: () => void = () => {},
  ) {
    this.ended = ended;
    this.track = TRACKS.some((t) => t.id === track && t.available)
      ? track
      : "snow";
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
          ? Math.max(0, this.context.currentTime - this.started)
          : 0)) %
      this.duration
    );
  }
  private buffer(): AudioBuffer {
    const cached = this.buffers.get(this.track);
    if (cached) return cached;
    const rendered = synthMusic(TRACKS.find((t) => t.id === this.track)!);
    const buffer = this.context!.createBuffer(
      1,
      rendered.music.length,
      rendered.rate,
    );
    buffer.copyToChannel(rendered.music, 0);
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
        this.gain.connect(audioStem("music"));
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
        source.loop = this.repeat;
        source.onended = () => {
          if (this.source !== source || this.repeat) return;
          this.source = null;
          source.disconnect();
          this.offset = 0;
          if (this.wanted && !this.hidden) this.ended();
        };
        source.connect(this.gain!);
        const at = this.context.currentTime + 0.025;
        source.start(at, this.offset % this.duration);
        this.source = source;
        this.started = at;
      }
      this.notify("playing");
    } catch {
      this.notify(this.context ? "blocked" : "unavailable");
    }
  }
  private stop() {
    this.offset = this.currentTime;
    if (this.source) {
      const source = this.source;
      this.source = null;
      source.stop();
      source.disconnect();
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
    if (!TRACKS.some((t) => t.id === track && t.available)) return;
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
  setRepeat(repeat: boolean) {
    this.repeat = repeat;
    if (this.source) this.source.loop = repeat;
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
