// Audio engine. SPEC.md section 7. Web Audio, oscillators only, no files and
// no network. Nothing is constructed until the first CLAIM PRIZE click, so the
// page never trips the browser autoplay warning on load.
//
// Everything routes through one master gain, which is the only thing mute
// touches. Mute is never part of the prank: people run this at a desk.

const MAX_AUDIO_LEVEL = 8;

// Conservative on purpose. The app is already annoying.
const MASTER_GAIN = 0.16;
const NOTE_GAIN = 0.5;
const BLIP_GAIN = 0.45;
const BUZZ_GAIN = 0.4;
const PAD_GAIN = 0.6;
const MUTE_RAMP = 0.06;

// A sweet little toy phrase in C major, as semitone offsets from C5.
const MELODY = [0, 4, 7, 12, 9, 7, 4, 7, 5, 4, 2, 4, 0, 4, 7, 4];
const MELODY_ROOT = 523.25;

// Per-note detune shape. Multiplied by detuneFor(level), so level 1 is dead in
// tune and level 8 wobbles sharp and flat around every note.
const DETUNE_SHAPE = [0, 1, -0.6, 0.8, -1, 0.4, -0.8, 1, -0.5, 0.9, -1, 0.6, 0, -0.9, 1, -0.7];

const HOLY_CHORD = [261.63, 329.63, 392.0, 523.25];

const clampAudioLevel = (level) =>
  Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_AUDIO_LEVEL);

// Seconds per note. Sweet and unhurried at level 1, twitchy by level 8.
export function tempoFor(level) {
  return 0.26 - (clampAudioLevel(level) - 1) * 0.022;
}

// Peak detune in cents. Zero at level 1, and by level 8 the worst notes sit
// most of a semitone out, which is sour without losing the tune entirely.
export function detuneFor(level) {
  return (clampAudioLevel(level) - 1) * 12;
}

export function createAudio({ AudioContextCtor = globalThis.AudioContext } = {}) {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let level = 1;
  let muted = false;
  let timer = null;
  let step = 0;

  const isStarted = () => ctx !== null;
  const now = () => ctx.currentTime;

  // A one-shot voice: oscillator into its own gain envelope, then the given
  // bus. Nothing is reused, so nothing has to be cleaned up by hand.
  const voice = (type, frequency, detune, bus) => {
    const osc = ctx.createOscillator();
    const gate = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now());
    osc.detune.setValueAtTime(detune, now());
    osc.connect(gate);
    gate.connect(bus);

    return { osc, gate };
  };

  // Attack up to peak, then straight back down to silence. Linear ramps only,
  // so a target of 0 is always legal.
  const shape = (param, peak, attack, duration) => {
    const at = now();
    param.setValueAtTime(0, at);
    param.linearRampToValueAtTime(peak, at + attack);
    param.linearRampToValueAtTime(0, at + duration);
  };

  const playNote = () => {
    const index = step % MELODY.length;
    step += 1;

    const semitones = MELODY[index];
    const frequency = MELODY_ROOT * 2 ** (semitones / 12);
    const detune = DETUNE_SHAPE[index] * detuneFor(level);
    const duration = tempoFor(level) * 0.9;

    // Triangle reads as a music box; square reads as a cheap toy losing it.
    const { osc, gate } = voice(
      level >= 4 ? 'square' : 'triangle',
      frequency,
      detune,
      musicBus
    );

    shape(gate.gain, NOTE_GAIN, 0.01, duration);
    osc.start(now());
    osc.stop(now() + duration);
  };

  const loop = () => {
    playNote();
    timer = setTimeout(loop, tempoFor(level) * 1000);
  };

  const stopMusic = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const start = () => {
    if (isStarted()) return;

    ctx = new AudioContextCtor();
    if (typeof ctx.resume === 'function') ctx.resume();

    master = ctx.createGain();
    master.gain.setValueAtTime(muted ? 0 : MASTER_GAIN, now());
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.setValueAtTime(1, now());
    musicBus.connect(master);

    loop();
  };

  // Mute rides the master gain rather than suspend(), so SFX timing stays sane
  // and unmuting is instant.
  const setMuted = (value) => {
    muted = Boolean(value);
    if (!isStarted()) return;

    const target = muted ? 0 : MASTER_GAIN;
    master.gain.setValueAtTime(master.gain.value, now());
    master.gain.linearRampToValueAtTime(target, now() + MUTE_RAMP);
  };

  const blip = () => {
    if (!isStarted()) return;
    const { osc, gate } = voice('sine', 880, 0, master);
    shape(gate.gain, BLIP_GAIN, 0.005, 0.12);
    osc.start(now());
    osc.stop(now() + 0.12);
  };

  const buzz = () => {
    if (!isStarted()) return;
    const { osc, gate } = voice('sawtooth', 110, -14, master);
    shape(gate.gain, BUZZ_GAIN, 0.004, 0.28);
    osc.start(now());
    osc.stop(now() + 0.28);
  };

  // The gate scene: chaos music out, then a slow major chord swell in.
  const holyPad = () => {
    if (!isStarted()) return;
    stopMusic();

    HOLY_CHORD.forEach((frequency, index) => {
      const { osc, gate } = voice(index % 2 ? 'triangle' : 'sine', frequency, 0, master);
      shape(gate.gain, PAD_GAIN / HOLY_CHORD.length, 1.6, 6.5);
      osc.start(now());
      osc.stop(now() + 6.5);
    });
  };

  return {
    start,
    setLevel(value) {
      level = clampAudioLevel(value);
    },
    setMuted,
    isStarted,
    isMuted: () => muted,
    blip,
    buzz,
    holyPad,
    stopMusic
  };
}
