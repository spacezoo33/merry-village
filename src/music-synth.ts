import type { TRACKS } from "./catalog.ts";
export type Score = (typeof TRACKS)[number];
/** Newly synthesised independent stems; no third-party recording or modern arrangement. */
export function synthMusic(score: Score, rate = 22050) {
  if (!score.available || !score.score)
    throw new Error("음원 권리 확인 전에는 합성하지 않습니다.");
  const duration =
    (score.score
      .split(" ")
      .reduce((sum, token) => sum + Number(token.split(":")[1]), 0) *
      60) /
    score.bpm;
  const data = new Float32Array(Math.ceil(duration * rate)),
    bells = new Float32Array(data.length);
  // Fresh stereo-like bell overtones, low accompaniment and sparse small chimes.
  // Every voice has an attack/release; peak normalisation prevents track-to-track jumps.
  const add = (
    midi: number,
    at: number,
    length: number,
    level: number,
    kind: "bell" | "soft" = "bell",
    target: Float32Array = data,
  ) => {
    const hz = 440 * 2 ** ((midi - 69) / 12),
      start = Math.floor(at * rate),
      n = Math.min(Math.floor((length + 1.4) * rate), target.length - start);
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
      target[start + i]! += wave * attack * release * level;
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
  for (let bar = 0; bar * score.meter * beat < duration; bar++) {
    const root = score.root + progression[bar % 8]!,
      base = bar * score.meter * beat;
    add(root - 12, base, beat * 1.2, 0.052, "soft");
    for (let step = 1; step < score.meter; step++) {
      const note = [root + 4, root + 7][(step - 1) % 2]!;
      add(note, base + step * beat, beat, 0.023, "soft");
    }
    if (base < duration) {
      add(root + 24, base, 0.65, 0.13, "bell", bells);
      if (bar % 2 === 0 && base + beat * 1.5 < duration)
        add(root + 31, base + beat * 1.5, 0.55, 0.085, "bell", bells);
    }
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

  for (let i = 0; i < bells.length; i++) {
    const fade = Math.min(
      1,
      i / (rate * 0.012),
      (bells.length - i) / (rate * 0.08),
    );
    bells[i]! *= fade;
  }
  return { music: data, bells, duration, rate };
}
