# T05 — Web Audio engine

**Spec:** SPEC.md §7

## Goal

Oscillator-only audio that starts on the first click, sours as the level climbs, and can genuinely be muted.

## Failing tests first

`tests/audio.test.js` — inject a fake `AudioContextCtor` recording constructor calls, node creation, and gain values.

- `createAudio()` does **not** construct an AudioContext; `isStarted()` is false
- `start()` constructs exactly one AudioContext; calling `start()` again does not construct a second
- `setLevel(n)` for 1..8 produces a monotonically faster tempo and increasing detune magnitude
- `setMuted(true)` drives the master gain to 0; `setMuted(false)` restores it
- `isMuted()` reflects the last `setMuted` call
- `blip()` and `buzz()` are no-ops before `start()` and do not throw
- `buzz()` is audibly distinct from `blip()` (different waveform or frequency band — assert on the recorded node config)
- `holyPad()` stops the chaos music first, then starts the pad
- `stopMusic()` leaves the context alive but silences the loop

## Implement

`src/scripts/audio.js` — `createAudio({ AudioContextCtor = globalThis.AudioContext })`.

- Master gain → destination. Mute drives master gain with a short ramp, never `suspend()`, so SFX timing stays sane.
- Melody: a short note array played on a scheduled loop with `setTimeout` or lookahead scheduling. Square or triangle wave. `setLevel` adjusts tempo multiplier and per-note detune cents.
  - Level 1: in tune, gentle, sweet — it should sound like a toy.
  - Level 8: fast, heavily detuned, sour.
- `blip()`: short high sine pluck on button press.
- `buzz()`: harsh low sawtooth burst on rejection.
- `holyPad()`: stop the melody, then a slow-attack major chord on stacked sine/triangle oscillators with a long release.
- Guard everything behind `isStarted()` so nothing throws before the first click.

Keep total gain conservative. This is already annoying; it does not need to be loud.

## Acceptance

- `npm test` green
- No AudioContext warning in the console on page load
- Melody starts on the first CLAIM click and clearly degrades by level 8
- Mute works at every level, including 8
