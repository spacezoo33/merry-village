import { synthMusic } from "./music-synth";
import { audioContext, audioStem } from "./audio-engine";
import { TRACKS, type TrackId } from "./catalog";
export type MusicState = "playing" | "paused" | "blocked" | "unavailable";
/** In-house synthesis of documented public-domain carols. No downloaded recording. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<
    TrackId,
    { music: AudioBuffer; bells: AudioBuffer }
  >();
  private bellSource: AudioBufferSourceNode | null = null;
  private bellGain: GainNode | null = null;
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
  private buffer(): { music: AudioBuffer; bells: AudioBuffer } {
    const cached = this.buffers.get(this.track);
    if (cached) return cached;
    const score = TRACKS.find((t) => t.id === this.track)!,
      rendered = synthMusic(score);
    const buffer = this.context!.createBuffer(
        1,
        rendered.music.length,
        rendered.rate,
      ),
      bells = this.context!.createBuffer(
        1,
        rendered.bells.length,
        rendered.rate,
      );
    buffer.copyToChannel(rendered.music, 0);
    bells.copyToChannel(rendered.bells, 0);
    if (this.buffers.size >= 2)
      this.buffers.delete(this.buffers.keys().next().value!);
    const pair = { music: buffer, bells };
    this.buffers.set(this.track, pair);
    return pair;
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
        this.bellGain = this.context.createGain();
        this.bellGain.gain.value = this.volume;
        this.bellGain.connect(audioStem("bells"));
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
        const buffers = this.buffer();
        source.buffer = buffers.music;
        source.loop = true;
        source.connect(this.gain!);
        const at = this.context.currentTime + 0.025;
        source.start(at, this.offset % this.duration);
        const bell = this.context.createBufferSource();
        bell.buffer = buffers.bells;
        bell.loop = true;
        bell.connect(this.bellGain!);
        bell.start(at, this.offset % this.duration);
        this.bellSource = bell;
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
    if (this.bellSource) {
      this.bellSource.stop();
      this.bellSource.disconnect();
      this.bellSource = null;
    }
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
  setVolume(v: number) {
    this.volume = v;
    this.bellGain?.gain.setTargetAtTime(v, this.context!.currentTime, 0.03);
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
    this.bellGain?.disconnect();
  }
}
