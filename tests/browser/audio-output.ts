import { createAudioBus, duckForWhistle, audioContext, audioDiagnostics, disposeAudio } from "../../src/audio-engine.ts";
import { scheduleSteamWhistle, WHISTLE_SECONDS } from "../../src/steam-whistle.ts";
import { TrainSound, createChuffBuffer } from "../../src/train-sound.ts";
import { synthMusic } from "../../src/music-synth.ts";
import { TRACKS } from "../../src/catalog.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function metrics(data: Float32Array, from = 0, to = data.length) {
  from = Math.floor(from); to = Math.floor(to);
  let peak = 0, energy = 0;
  for (let i = from; i < to; i++) {
    assert(Number.isFinite(data[i]), `nonfinite output at ${i}/${data.length}: ${data[i]}`);
    peak = Math.max(peak, Math.abs(data[i]!)); energy += data[i]! ** 2;
  }
  return { rms: Math.sqrt(energy / (to - from)), peak };
}
export async function measureOfflineAudio() {
  const results: Record<string, ReturnType<typeof metrics>> = {};
  for (const rawMode of ["previous-horn", "horn", "train", "music", "mixed", "mixed-unducked", "baseline-horn", "baseline-train"]) {
    const mode = rawMode.replace("baseline-", "");
    const rate = 48000, c = new OfflineAudioContext(1, rate * 4, rate), bus = createAudioBus(c);
    if (rawMode.startsWith("baseline-")) { bus.inputs.horn.gain.value = 1; bus.inputs.train.gain.value = 1; }
    if (mode === "previous-horn") {
      // Reproduce the preceding commit's actual oscillator/gain graph as a diagnostic reference.
      for (const [hz, level] of [[440, .021 * .55], [554.37, .012 * .55], [659.25, .008 * .55]]) {
        const source = c.createOscillator(), gain = c.createGain(), at = .1;
        source.frequency.setValueAtTime(hz!, at);
        source.frequency.linearRampToValueAtTime(hz! * .985, at + 1.1);
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level!, at + .17);
        gain.gain.setValueAtTime(level!, at + .65);
        gain.gain.exponentialRampToValueAtTime(.0001, at + 1.25);
        source.connect(gain); gain.connect(bus.inputs.horn); source.start(at); source.stop(at + 1.3);
      }
    } else if (mode !== "train" && mode !== "music") scheduleSteamWhistle(c, bus.inputs.horn, .1);
    if (["train", "mixed", "mixed-unducked"].includes(mode)) {
      const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      source.buffer = createChuffBuffer(c); source.loop = true;
      filter.type = "lowpass"; filter.frequency.value = 1400; gain.gain.value = .75;
      source.connect(filter); filter.connect(gain); gain.connect(bus.inputs.train); source.start();
    }
    if (mode === "music" || mode.startsWith("mixed")) {
      const song = synthMusic(TRACKS[0]!), source = c.createBufferSource();
      const buffer = c.createBuffer(1, song.music.length, song.rate);
      buffer.copyToChannel(song.music, 0); source.buffer = buffer;
      source.connect(bus.inputs.music); source.start(); // worst-case music volume 100%
    }
    if (mode === "mixed") duckForWhistle(bus.inputs, .1, WHISTLE_SECONDS);
    const data = (await c.startRendering()).getChannelData(0);
    results[rawMode] = metrics(data, .1 * rate, 2.8 * rate);
    if (rawMode === "horn") {
      results.shortCall = metrics(data, .15 * rate, .4 * rate);
      results.breathGap = metrics(data, .55 * rate, .65 * rate);
      results.longCall = metrics(data, .8 * rate, 2.4 * rate);
      results.tail = metrics(data, 3.2 * rate, 3.8 * rate);
    }
  }
  assert(Math.abs(results.horn!.rms / results["baseline-horn"]!.rms - .7) < .0001, "horn gain must drop 30%");
  assert(Math.abs(results.train!.rms / results["baseline-train"]!.rms - .75) < .0001, "train gain must drop 25%");
  const advantageDb = 20 * Math.log10(results.horn!.rms / results.train!.rms);
  assert(advantageDb > 12, "whistle must exceed chuff RMS by 12 dB");
  assert(results.shortCall!.rms > .03 && results.longCall!.rms > .03, "both calls must sound");
  assert(results.breathGap!.rms < .001 && results.tail!.peak < .001, "breath gap / end must be quiet");
  assert(results.mixed!.peak < .95 && results.mixed!.rms > .05, "audible mixed signal with headroom");
  return { ...results, advantageDb };
}
/** Trigger the production crossing path, then meter its actual running audio graph. */
export async function measureLiveAudio() {
  disposeAudio();
  const sound = new TrainSound(() => {});
  try {
    sound.setRunning(true); await sound.unlock();
    assert(audioContext().state === "running", "touch must unlock AudioContext");
    sound.updatePosition(2, .52, true, "cozy", 6);
    sound.updatePosition(2.05, .49, true, "cozy", 6);
    assert(sound.diagnostics.horns === 1, "crossing must dispatch one whistle");
    const maxima = { hornRms: 0, hornPeak: 0, trainRms: 0, mixRms: 0, mixPeak: 0 };
    const until = performance.now() + 2900;
    while (performance.now() < until) {
      const d = audioDiagnostics()!;
      maxima.hornRms = Math.max(maxima.hornRms, d.stems.horn.rms);
      maxima.hornPeak = Math.max(maxima.hornPeak, d.stems.horn.peak);
      maxima.trainRms = Math.max(maxima.trainRms, d.stems.train.rms);
      maxima.mixRms = Math.max(maxima.mixRms, d.mix.rms);
      maxima.mixPeak = Math.max(maxima.mixPeak, d.mix.peak);
      await new Promise(r => setTimeout(r, 20));
    }
    assert(maxima.hornRms > .05 && maxima.mixRms > .05, "live whistle must reach the output bus");
    assert(maxima.mixPeak < .95, "live output must not clip");
    sound.setRunning(false);
    const horns = sound.diagnostics.horns;
    sound.updatePosition(3, .52, true, "cozy", 6); sound.updatePosition(3.1, .49, true, "cozy", 6);
    assert(sound.diagnostics.horns === horns, "OFF cannot honk");
    sound.setRunning(true); await sound.unlock();
    sound.updatePosition(145, .52, true, "cozy", 12); sound.updatePosition(145.05, .49, true, "cozy", 12);
    assert(sound.diagnostics.horns === horns + 1, "resume crossing must honk");
    await new Promise(r => setTimeout(r, 150));
    const resumedRms = audioDiagnostics()!.stems.horn.rms;
    assert(resumedRms > .03, "resume whistle must produce actual signal");
    sound.updatePosition(0, .7, true, "forest", 18);
    sound.updatePosition(2, .52, true, "forest", 18); sound.updatePosition(2.05, .49, true, "forest", 18);
    assert(sound.diagnostics.horns === horns + 2, "village change must honk again");
    await new Promise(r => setTimeout(r, 150));
    const villageRms = audioDiagnostics()!.stems.horn.rms;
    assert(villageRms > .03, "new-village whistle must produce actual signal");
    return { state: audioContext().state, ...maxima, resumedRms, villageRms, horns: sound.diagnostics.horns };
  } finally { sound.destroy(); disposeAudio(); }
}

/** Run on the real app after a trusted pointer gesture; observe natural train crossings. */
export async function measureAppAudio(seconds = 22) {
  const maxima = { hornRms: 0, trainRms: 0, musicRms: 0, mixRms: 0, mixPeak: 0 };
  const until = performance.now() + seconds * 1000;
  while (performance.now() < until) {
    const d = audioDiagnostics();
    if (d) {
      maxima.hornRms = Math.max(maxima.hornRms, d.stems.horn.rms);
      maxima.trainRms = Math.max(maxima.trainRms, d.stems.train.rms);
      maxima.musicRms = Math.max(maxima.musicRms, d.stems.music.rms);
      maxima.mixRms = Math.max(maxima.mixRms, d.mix.rms);
      maxima.mixPeak = Math.max(maxima.mixPeak, d.mix.peak);
    }
    await new Promise(r => setTimeout(r, 20));
  }
  const sound = JSON.parse(document.querySelector<HTMLElement>('#app')!.dataset.soundDiagnostics!);
  assert(sound.horns === 0 && maxima.hornRms === 0, "first five route laps must stay silent");
  assert(maxima.musicRms > .001 && maxima.trainRms > .001, "music and train must be mixed too");
  assert(maxima.mixRms > .005 && maxima.mixPeak < .95, "app output must be audible without clipping");
  return { ...maxima, state: audioDiagnostics()!.state, sound };
}
