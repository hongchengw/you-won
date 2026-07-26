// Audio engine. Stub until T05 builds the real Web Audio version.
// SPEC.md section 7. The shape is final: only the internals change.
// Nothing here constructs an AudioContext, so the lazy-start rule holds.

export function createAudio() {
  let started = false;
  let muted = false;

  return {
    start() {
      started = true;
    },
    setLevel() {},
    setMuted(value) {
      muted = Boolean(value);
    },
    isStarted: () => started,
    isMuted: () => muted,
    blip() {},
    buzz() {},
    holyPad() {},
    stopMusic() {}
  };
}
