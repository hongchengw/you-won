# T10 — Holy gate scene and total reset

**Spec:** SPEC.md §5.3, §3 (`reset`)

## Goal

The payoff. After 8 loops of degradation, absolution — a white light, a heavenly gate, swelling music, and the words they have been fighting for. Then it drops them back at the start with no acknowledgement whatsoever.

This scene must be played completely straight. The moment it winks at the audience, the joke dies.

## Failing tests first

`tests/gate.test.js` — fake timers.

- `skip()` at level 8 sets `screen: 'gate'`; at levels 1-7 it never does
- `renderGate` calls `audio.stopMusic()` then `audio.holyPad()` (injected stub), in that order
- the three text beats render in sequence as fake timers advance
- when the scene completes, `reset()` is dispatched: `screen: 'won'`, `level: 1`, `fails: 0`
- reset **preserves** `muted` and `audioStarted`
- after the scene, `body.dataset.chaos` is `"1"` and no `fx-*` classes remain on the body
- the scene registers cleanup so navigating away mid-scene cancels its pending timers

## Implement

`src/scripts/screens/gate.js` and `src/styles/gate.css`.

Sequence, roughly 6 seconds:

1. **0.0s** — chaos audio cuts, all `fx-*` animation freezes. A white radial overlay blooms from center, reaching pure white at ~1.5s.
2. **1.5s** — `holyPad()` swells in. Two ornate CSS doors materialize against the white and slowly part, revealing light. God rays sweep outward; slow gold particles drift upward.
3. **2.5s / 3.8s / 5.0s** — serif text beats, each fading in over the last:
   - `VERIFICATION COMPLETE`
   - `YOU HAVE BEEN VERIFIED`
   - `PLEASE PROCEED TO CLAIM YOUR PRIZE`
4. **~6.0s** — **hard cut**, no fade, to the pristine level-1 You Won screen.

Styling is the opposite of everything else in the app: a serif face, gold and white, wide letter-spacing, slow and reverent easing. No pastel, no Comic Sans, no shake.

Reduced motion: keep the fade and text beats, drop the god-ray sweep and particle motion.

The reset must be total. Chaos classes cleared, mascot gone, fresh confetti. No "TIMES WON" counter, no easter egg, nothing that suggests the app remembers.

## Acceptance

- `npm test` green
- Reaching the gate after 8 loops feels genuinely like a release, and the cut back to level 1 lands as a gut punch
- Devtools confirms a clean body after reset
