import { audioContext } from "./audio-engine.ts";
/** Seamless in-house loop + horns queued on the AUDIO clock, independent of rendering. */
export class TrainSound {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loop: AudioBufferSourceNode | null = null;
  private loopStart = 0;
  private offset = 0;
  private active = 0;
  private voices = new Set<AudioScheduledSourceNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private wanted = false;
  private generation = 0;
  private plan: number[] = [];
  private scheduled = new Set<number>();
  private observed = new Set<number>();
  private history: number[] = [];
  private cursor = 0;
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
  private makeBuffer(c: AudioContext) {
    const rate = 22050,
      b = c.createBuffer(1, Math.round(rate * 1.16), rate),
      data = b.getChannelData(0);
    let seed = 12345,
      last = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      const white = (seed / 2147483647) * 2 - 1;
      last = 0.62 * last + 0.38 * white;
      const phase = (i / rate) % 0.29,
        envelope = Math.min(1, phase / 0.024) * Math.exp(-phase * 18);
      data[i] = last * (0.038 * envelope + 0.0028);
    }
    for (let i = 0; i < 128; i++) {
      const f = i / 128;
      data[data.length - 128 + i] =
        data[data.length - 128 + i]! * (1 - f) + data[0]! * f;
    }
    return b;
  }
  async unlock() {
    if (!this.wanted) return;
    const generation = ++this.generation;
    try {
      if (!this.context) {
        const c = (this.context = audioContext());
        this.output = c.createGain();
        this.output.gain.value = 0.55;
        this.output.connect(c.destination);
        this.buffer = this.makeBuffer(c);
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
        source.start(0, this.offset);
        this.loop = source;
        this.loopStart = c.currentTime;
        if (!this.plan.length) this.plan.push(this.active + 27);
        this.schedule();
        this.timer = setInterval(() => this.schedule(), 1000);
      }
      this.update("기차 소리 재생 중");
    } catch {
      this.update("기차 소리를 재생할 수 없어요");
    }
  }
  private get activeTime() {
    return (
      this.active + (this.loop ? this.context!.currentTime - this.loopStart : 0)
    );
  }
  private observe() {
    if (!this.loop) return;
    const now = this.activeTime;
    for (const at of this.plan)
      if (at <= now && !this.observed.has(at)) {
        this.observed.add(at);
        this.history.push(at);
      }
  }
  private schedule() {
    if (!this.context || !this.wanted) return;
    const now = this.activeTime;
    this.observe();
    while (this.plan.at(-1)! < now + 70) {
      const next = this.plan.at(-1)! + [29, 23, 34, 27][this.cursor++ % 4]!;
      this.plan.push(next);
    }
    for (const at of this.plan)
      if (at > now && !this.scheduled.has(at)) {
        this.horn(this.context.currentTime + at - now);
        this.scheduled.add(at);
      }
  }
  private horn(at: number) {
    const c = this.context!;
    for (const [hz, level] of [
      [440, 0.021],
      [554.37, 0.012],
      [659.25, 0.008],
    ]) {
      const source = c.createOscillator(),
        e = c.createGain();
      source.type = "sine";
      source.frequency.setValueAtTime(hz!, at);
      source.frequency.linearRampToValueAtTime(hz! * 0.985, at + 1.1);
      e.gain.setValueAtTime(0, at);
      e.gain.linearRampToValueAtTime(level!, at + 0.17);
      e.gain.setValueAtTime(level!, at + 0.65);
      e.gain.exponentialRampToValueAtTime(0.0001, at + 1.25);
      source.connect(e);
      e.connect(this.output!);
      source.start(at);
      source.stop(at + 1.3);
      this.voices.add(source);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        e.disconnect();
      };
    }
  }
  private stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const c = this.context;
    if (c) {
      this.observe();
      if (this.loop) {
        const dt = c.currentTime - this.loopStart;
        this.active += dt;
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
      this.scheduled.clear();
    }
    this.update("기차 소리 정지");
  }
  get diagnostics() {
    this.observe();
    const now = this.context?.currentTime ?? 0;
    return {
      running: !!this.loop && this.context?.state === "running",
      clock: now,
      puffs: Math.floor(
        (this.active + (this.loop ? now - this.loopStart : 0)) / 0.29,
      ),
      horns: this.history.length,
      hornTimes: this.history.slice(-12),
      untilHorn: Number(
        (
          (this.plan.find((t) => t > this.activeTime) ?? this.activeTime + 27) -
          this.activeTime
        ).toFixed(2),
      ),
    };
  }
  destroy() {
    this.wanted = false;
    this.stop();
    this.output?.disconnect();
  }
}
