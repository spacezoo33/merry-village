import {
  CHUFF_SECONDS,
  chuffOffset,
  TRAIN_LAP_SECONDS,
} from "./train-timing.ts";
import { scheduleSteamWhistle, WHISTLE_SECONDS } from "./steam-whistle.ts";
import { audioContext, audioStem, duckAccompaniment, releaseAccompaniment } from "./audio-engine.ts";
export function createChuffBuffer(c: BaseAudioContext) {
  const rate = 22050,
    b = c.createBuffer(1, Math.round(rate * CHUFF_SECONDS * 4), rate),
    data = b.getChannelData(0);
  let seed = 12345,
    last = 0;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    const white = (seed / 2147483647) * 2 - 1;
    last = 0.62 * last + 0.38 * white;
    const phase = (i / rate) % CHUFF_SECONDS,
      envelope = Math.min(1, phase / 0.024) * Math.exp(-phase * 18);
    data[i] = last * (0.2 * envelope + 0.009);
  }
  for (let i = 0; i < 128; i++) {
    const f = i / 128;
    data[data.length - 128 + i] =
      data[data.length - 128 + i]! * (1 - f) + data[0]! * f;
  }
  return b;
}

/** Seamless in-house loop + horns queued on the AUDIO clock, independent of rendering. */
export class TrainSound {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loop: AudioBufferSourceNode | null = null;
  private loopStart = 0;
  private offset = 0;
  private active = 0;
  private journey = 0;
  private voices = new Set<AudioScheduledSourceNode>();
  private wanted = false;
  private generation = 0;
  private previousPosition: {
    journey: number;
    x: number;
    visible: boolean;
  } | null = null;
  private lastPass = -1;
  private village = "";
  private history: number[] = [];
  private update: (status: string) => void;
  constructor(update: (status: string) => void) {
    this.update = update;
  }
  setRunning(running: boolean) {
    if (running === this.wanted) return;
    this.wanted = running;
    if (running) void this.unlock();
    else this.stop();
  }
  syncJourney(seconds: number) {
    if (!this.loop) {
      this.journey = seconds;
      this.offset = chuffOffset(seconds);
    }
  }
  async unlock() {
    if (!this.wanted) return;
    const generation = ++this.generation;
    try {
      if (!this.context) {
        const c = (this.context = audioContext());
        this.output = c.createGain();
        this.output.gain.value = 0.75;
        this.output.connect(audioStem("train"));
        this.buffer = createChuffBuffer(c);
      }
      const c = this.context;
      await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 350))]);
      if (generation !== this.generation || !this.wanted) return;
      if (c.state !== "running") {
        this.update("첫 터치 후 기차 소리가 켜져요");
        return;
      }
      if (!this.loop) {
        const source = c.createBufferSource(),
          filter = c.createBiquadFilter();
        source.buffer = this.buffer;
        source.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = 1400;
        source.connect(filter);
        filter.connect(this.output!);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
        };
        const startAt = c.currentTime + Math.max(0, 0.65 - this.journey);
        source.start(startAt, this.offset);
        this.loop = source;
        this.loopStart = startAt;
      }
      this.update("기차 소리 재생 중");
    } catch {
      this.update("기차 소리를 재생할 수 없어요");
    }
  }
  /** Called from the actual rendered engine pose. No horn timer or random schedule. */
  updatePosition(
    journey: number,
    x: number,
    visible: boolean,
    village: string,
  ) {
    if (village !== this.village) {
      this.village = village;
      this.previousPosition = null;
      this.lastPass = -1;
    }
    if (!this.wanted || !this.loop || this.context?.state !== "running") {
      this.previousPosition = null;
      return;
    }
    const previous = this.previousPosition;
    this.previousPosition = { journey, x, visible };
    if (
      !previous ||
      journey <= previous.journey ||
      journey - previous.journey > TRAIN_LAP_SECONDS / 2
    )
      return;
    const pass = Math.floor(Math.max(0, journey - 0.65) / TRAIN_LAP_SECONDS);
    if (
      visible && previous.visible &&
      previous.x > 0.5 && x <= 0.5 &&
      pass !== this.lastPass
    ) {
      this.lastPass = pass;
      this.horn(this.context.currentTime);
      this.history.push(this.context.currentTime);
      if (this.history.length > 100) this.history.shift();
    }
  }
  private horn(at: number) {
    duckAccompaniment(WHISTLE_SECONDS);
    for (const voice of scheduleSteamWhistle(this.context!, audioStem("horn"), at)) {
      this.voices.add(voice);
      const cleanup = voice.onended;
      voice.onended = (event) => {
        this.voices.delete(voice);
        cleanup?.call(voice, event);
      };
    }
  }

  private stop() {
    this.generation++;
    releaseAccompaniment();
    this.previousPosition = null;
    const c = this.context;
    if (c) {
      if (this.loop) {
        const dt = Math.max(0, c.currentTime - this.loopStart);
        this.active += dt;
        this.journey += dt;
        this.offset = (this.offset + dt) % this.buffer!.duration;
        this.loop.stop();
        this.loop = null;
      }
      for (const s of this.voices) {
        try {
          s.stop(c.currentTime);
        } catch {
          /* ended */
        }
      }
      this.voices.clear();
    }
    this.update("기차 소리 정지");
  }
  get diagnostics() {
    const now = this.context?.currentTime ?? 0;
    return {
      running: !!this.loop && this.context?.state === "running",
      clock: now,
      puffs: Math.floor(
        (this.active + (this.loop ? Math.max(0, now - this.loopStart) : 0)) /
          CHUFF_SECONDS,
      ),
      horns: this.history.length,
      hornTimes: this.history.slice(-12),
    };
  }
  destroy() {
    this.wanted = false;
    this.stop();
    this.output?.disconnect();
  }
}
