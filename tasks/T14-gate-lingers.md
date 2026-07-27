# T14 — The gate holds its last line

**Spec:** SPEC.md §5.3, §7 (holy pad)

## Goal

The payoff needs room. Hold the third text beat for about six seconds before the hard cut, so `PLEASE PROCEED TO CLAIM YOUR PRIZE` sits there long enough to mean something.

Moving the cut is one number. Two things break if that is all you move, and both would leave the scene worse than it is now:

1. **Silence.** `holyPad()`'s envelope is a 1.6s attack into a straight decay ending at 6.5s. Called at 1.5s, the chord is gone by 8.0s, so an 11 second scene ends in three seconds of dead air over the frozen final line. Nothing else plays during the gate.
2. **Frozen doors.** The parting animation ends at 5.9s and `forwards` pins the doors wide open. Today that is 100ms of stillness. At an 11 second cut it is five seconds of a still frame, which is exactly what the comment in the stylesheet promises will never happen.

The scene must still be moving and still be sounding when the cut takes it away. That is what makes the cut land.

## Failing tests first

`tests/gate.test.js` — fake timers.

- the scene holds up to the last millisecond: advance `cut - 1` and the gate is still up, `screen` is still `gate`, `body.gate-scene` is still on, all three beats are revealed. Advance one more and the cut happens. **No test pins the cut today**, so it could move anywhere and everything would stay green
- the last line gets about six seconds: `cut - beats.at(-1) >= 6000`. Pin the decision, not the number
- the scene asks the audio for a chord that lasts until the cut: the stub records the argument, which equals `(cut - pad) / 1000`
- a `describe('gate.css')` block reading the source, following `tests/chaos.test.js` and `tests/mascot.test.js`: the doors' delay plus duration exceeds `(cut - pad) / 1000`, and inside the reduced-motion block `.gate-open .gate-light` runs at least that long. Sum every `([\d.]+)s` in the matched declaration so a reordered shorthand does not break the test

`tests/audio.test.js` — the pad envelope has no coverage at all today, only voice count and oscillator type, so the sustain would ship unguarded. The existing `fakeParam` already logs every event as `{node, kind, target, when}`.

- the pad sustains at full level instead of decaying away: per pad gain the events are exactly `setValueAtTime(0, 0)`, `linearRampToValueAtTime(0.15, 1.6)`, `setValueAtTime(0.15, hold)`, `linearRampToValueAtTime(0, hold + 1.2)`. The middle event is the stage `shape()` cannot produce, so this fails against today's code for the right reason
- it still has level at the moment the gate cuts: import `GATE_TIMING`, call `holyPad((cut - pad) / 1000)`, and assert the release does not begin before `(cut - pad) / 1000`. This is the cross-module guard, so neither the cut nor the envelope can move without the other
- every pad oscillator outlives its own envelope: stop time at or after `hold + release`, so nobody can truncate the tail later with a stale `osc.stop`
- called bare, `holyPad()` still covers the current scene window, which keeps the default from rotting

## Implement

`src/scripts/screens/gate.js` — `GATE_TIMING.cut` from `6000` to `11000`. Keep `pad` and `beats` exactly as they are: the beats are well spaced already and all six seconds belong to the hold. Update the comment: the table is the only clock, and the audio length is derived from it rather than duplicated.

The scene tells the audio how long it needs, so the two can never drift:

```js
deps.audio.holyPad((GATE_TIMING.cut - GATE_TIMING.pad) / 1000);  // 9.5
```

`src/scripts/audio.js` — leave `shape()` exactly as it is. Attack-then-decay is right for a note, and blip, buzz and every melody note use it. Add a sibling inside `createAudio`, so no new top-level identifier enters the bundle:

```js
// Attack, hold at peak, then release. shape() has no sustain stage on purpose,
// which is right for a note and wrong for the gate pad: the scene decides how
// long the chord lasts, so `hold` is seconds from now and comes from the caller.
const swell = (param, peak, attack, hold, release) => {
  const at = now();
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setValueAtTime(peak, at + hold);
  param.linearRampToValueAtTime(0, at + hold + release);
};
```

`holyPad(seconds = PAD_HOLD)` uses it with `PAD_ATTACK = 1.6`, `PAD_RELEASE = 1.2` and `PAD_HOLD = 9.5`. Clamp `hold` to at least `PAD_ATTACK + 0.1` so the envelope events can never land out of order, and stop each oscillator at `hold + PAD_RELEASE`. Per voice that is 0 to 0.15 over 1.6s, flat until 9.5s, out by 10.7s: full level at the instant of the cut, ringing 1.2s into loop 1. The old pad already ran two seconds past the old cut, so the tail is not new behaviour.

`src/styles/gate.css` — the doors. Keep `gate-materialise 1s ease-out forwards`. The parting becomes a single 10s animation keeping its 1s delay, so on the scene clock it runs 2.5s to 12.5s and is still travelling when the cut lands at 11s.

The easing is the load-bearing part, not the duration. The current `cubic-bezier(0.7, 0, 0.3, 1)` decelerates to a standstill at its end, so merely stretching it satisfies the arithmetic and still hands back a near-frozen final second. Use a curve that is still moving at around 85% progress, for example `cubic-bezier(0.6, 0, 0.65, 0.55)`. One animation per property, not two stages, or they fight over `transform`.

Reduced motion, same file: the rays and motes are `animation: none` and the doors only materialise, so the scene would sit as a dead frame for nearly five seconds and read as a crash. The block already permits opacity work, and opacity is not what `prefers-reduced-motion` protects against. Replace the glow's fade-in with one opacity-only animation spanning the scene, so there is no two-animations-on-one-property override to reason about:

```css
.gate-open .gate-light { animation: gate-glow-hold 10s ease-in-out forwards; }
@keyframes gate-glow-hold {
  0% { opacity: 0; } 16% { opacity: 0.92; } 55% { opacity: 0.62; } 100% { opacity: 0.95; }
}
```

Nothing moves a pixel, and the 16% knee reproduces the 1.6s fade-in it replaces.

Update the prose carrying the old clock: the scene-length comments in `gate.js`, and in `gate.css` the header, the bloom and door sections, the parting comment that states the old 2.5s to 5.9s window, and the text section heading. `SPEC.md` §5.3 says "Roughly 6 seconds"; it becomes roughly 11, with the six-second hold, the doors still parting at the cut, and the pad sized from the scene clock. §7 gains the note that the pad sustains for a length the gate passes in.

Leave `changelogs/CHANGELOG.md`'s existing T10 entry alone. It is history and it was true when written.

## Acceptance

- `npm test` green
- Timed against the built `dist/index.html`: pad at 1.5s, beats at 2.5 / 3.8 / 5.0s, the third line still on screen at 10.5s, gone at 11.0s, pristine loop 1 behind it
- Screenshots at 6s, 8s and 10.5s in both motion modes, with consecutive frames differing. Frozen doors only show up as sameness, so this is the check that actually proves the easing
- Listened to once unmuted, all the way through: full-strength chord at the cut, a short tail, no dead air anywhere in the 9.5 seconds
- `node build/build.js` rerun and `dist/index.html` committed with the source

## Risks

- Four voices held at 0.15 for nearly eight seconds is more energy than the old decay. If it booms, drop `PAD_GAIN` from 0.6 to 0.5 rather than shortening the hold, which would put the dead air back
- The 1.2s tail crosses the cut on purpose. If it reads as a wink, shorten `PAD_RELEASE` to around 0.5 rather than ending the release before the cut
- Eleven seconds is a long time for someone who cannot click anything. Watch it once at real speed in both modes before calling it done

## Commit

Log the task in `changelogs/CHANGELOG.md` as a new top entry with the date and time in EDT. Then commit locally using the **git-commit-formatter** skill, and push to `origin/main`.
