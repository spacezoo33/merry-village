/** One browser audio device; BGM and train retain separate sources/gains and controls. */
let shared: AudioContext | null = null;
export function audioContext() {
  return (shared ??= new AudioContext());
}
export function setAudioHidden(hidden: boolean) {
  if (shared)
    void (hidden ? shared.suspend() : shared.resume()).catch(() => {
      /* next gesture retries */
    });
}
export function disposeAudio() {
  void shared?.close();
  shared = null;
}
