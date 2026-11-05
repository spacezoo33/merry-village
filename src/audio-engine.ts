/** Shared device with separately metered stems and a final gentle headroom limiter. */
export const STEM_NAMES = ["music", "train", "horn"] as const;
export const STEM_GAIN = { music: 1, train: .75, horn: .49 } as const;
export type AudioStem = (typeof STEM_NAMES)[number];
let shared: AudioContext | null = null;
let bus: {
  inputs: Record<AudioStem, GainNode>;
  meters: Record<AudioStem, AnalyserNode>;
  master: AnalyserNode;
  output: GainNode;
} | null = null;
export function audioContext() {
  return (shared ??= new AudioContext());
}
export function createAudioBus(c: BaseAudioContext) {
  const output = c.createGain();
  output.gain.value = 0.9;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 3;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  const master = c.createAnalyser();
  master.fftSize = 2048;
  output.connect(limiter);
  limiter.connect(master);
  master.connect(c.destination);
  const inputs = {} as Record<AudioStem, GainNode>,
    meters = {} as Record<AudioStem, AnalyserNode>;
  for (const name of STEM_NAMES) {
    const input = c.createGain(),
      meter = c.createAnalyser();
    input.gain.value = STEM_GAIN[name];
    meter.fftSize = 2048;
    input.connect(meter);
    meter.connect(output);
    inputs[name] = input;
    meters[name] = meter;
  }
  return { inputs, meters, master, output };
}
export function audioStem(name: AudioStem) {
  return (bus ??= createAudioBus(audioContext())).inputs[name];
}
function reading(analyser: AnalyserNode) {
  const samples = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(samples);
  let peak = 0,
    sum = 0;
  for (const v of samples) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / samples.length) };
}
export function audioDiagnostics() {
  return bus
    ? {
        clock: shared!.currentTime,
        state: shared!.state,
        stems: Object.fromEntries(
          STEM_NAMES.map((n) => [n, reading(bus!.meters[n])]),
        ),
        mix: reading(bus.master),
      }
    : null;
}
export function setAudioHidden(hidden: boolean) {
  if (shared)
    void (hidden ? shared.suspend() : shared.resume()).catch(() => {});
}
export function disposeAudio() {
  void shared?.close();
  shared = null;
  bus = null;
}

/** Duck only accompaniment; user volume remains on MusicPlayer's own gain. */
export function duckForWhistle(inputs: Record<AudioStem, GainNode>, at: number, duration: number) {
  for (const [name, level] of [["music", .28], ["train", .38]] as const) {
    const gain = inputs[name].gain;
    gain.cancelScheduledValues(at);
    gain.setValueAtTime(STEM_GAIN[name], at);
    gain.linearRampToValueAtTime(STEM_GAIN[name] * level, at + .04);
    gain.setValueAtTime(STEM_GAIN[name] * level, at + duration);
    gain.linearRampToValueAtTime(STEM_GAIN[name], at + duration + .3);
  }
}
export function duckAccompaniment(duration: number) {
  const c = audioContext();
  bus ??= createAudioBus(c);
  duckForWhistle(bus.inputs, c.currentTime, duration);
}
export function releaseAccompaniment() {
  if (!bus || !shared) return;
  for (const name of ["music", "train"] as const) {
    const gain = bus.inputs[name].gain;
    gain.cancelScheduledValues(shared.currentTime);
    gain.setTargetAtTime(STEM_GAIN[name], shared.currentTime, .06);
  }
}
