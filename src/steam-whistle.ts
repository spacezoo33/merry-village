/** Two breath-shaped steam calls, synthesized locally; no external recording. */
export const WHISTLE_SECONDS = 2.65;
export function scheduleSteamWhistle(
  c: BaseAudioContext,
  destination: AudioNode,
  at: number,
) {
  const voices: AudioScheduledSourceNode[] = [];
  const breath = c.createBuffer(1, 5512, 22050);
  const samples = breath.getChannelData(0);
  let seed = 7141;
  for (let i = 0; i < samples.length; i++) {
    seed = seed * 16807 % 2147483647;
    samples[i] = seed / 2147483647 * 2 - 1;
  }
  // A major steam-whistle chord with a little beating and upper pipe harmonics.
  for (const [offset, length] of [[0, 0.42], [0.58, 2.07]]) {
    for (const [hz, amplitude] of [[523.25, .14], [659.25, .105], [783.99, .085], [1048.5, .035], [1320.5, .025]]) {
      const pipe = c.createOscillator(), envelope = c.createGain();
      pipe.type = "sine";
      pipe.frequency.setValueAtTime(hz! * .96, at + offset!);
      pipe.frequency.linearRampToValueAtTime(hz!, at + offset! + .09);
      pipe.frequency.linearRampToValueAtTime(hz! * .98, at + offset! + length!);
      const begin = at + offset!, end = begin + length!;
      envelope.gain.setValueAtTime(0, begin);
      envelope.gain.linearRampToValueAtTime(amplitude!, begin + .045);
      envelope.gain.setValueAtTime(amplitude! * .9, Math.max(begin + .08, end - .22));
      envelope.gain.exponentialRampToValueAtTime(.0001, end);
      pipe.connect(envelope);
      envelope.connect(destination);
      pipe.start(begin);
      pipe.stop(end + .02);
      pipe.onended = () => { pipe.disconnect(); envelope.disconnect(); };
      voices.push(pipe);
    }
    const steam = c.createBufferSource(), filter = c.createBiquadFilter(), air = c.createGain();
    steam.buffer = breath; steam.loop = true;
    filter.type = "bandpass"; filter.frequency.value = 1700;
    const begin = at + offset!, end = begin + length!;
    air.gain.setValueAtTime(0, begin);
    air.gain.linearRampToValueAtTime(.025, begin + .04);
    air.gain.setValueAtTime(.018, Math.max(begin + .08, end - .2));
    air.gain.exponentialRampToValueAtTime(.0001, end);
    steam.connect(filter); filter.connect(air); air.connect(destination);
    steam.start(begin); steam.stop(end + .02);
    steam.onended = () => { steam.disconnect(); filter.disconnect(); air.disconnect(); };
    voices.push(steam);
  }
  return voices;
}
