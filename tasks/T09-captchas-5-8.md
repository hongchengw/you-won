# T09 — CAPTCHAs 5-8: puzzle, distorted text, timer, rotate

**Spec:** SPEC.md §6 (rows 5-8)

## Goal

The four time- and input-based challenges. These are the ones that make people genuinely question reality.

## Failing tests first

`tests/captchas-5-8.test.js` — use fake timers, stub `canvas.getContext` where needed.

- all 4 modules export the full contract; **`verify()` returns `false` unconditionally** for each
- `puzzle`: renders 4 draggable pieces; after a simulated pointer drag-and-release, no piece sits at its target position (never snaps); advancing fake timers 10s triggers `ctx.reject()` automatically
- `puzzle`: releasing a piece nudges it away from where it was dropped — final position differs from the drop position
- `distortedText`: renders a canvas and a text input; the generated challenge string is not a real word from a small dictionary of common words; submitting any input rejects; the string regenerates on each attempt (two consecutive attempts produce different strings)
- `timer`: starts at 30; advancing fake timers shows values that are not monotonically decreasing (it jumps); **advancing 60+ seconds of fake time never yields 0 or less at any point in a level-1 run**; the VERIFY button stays disabled throughout
- `rotate`: renders a rotation control; `verify()` returns false at 0°, 90°, 180°, 270°, and a random angle; the rejection message is `Image is not upright.`
- all four register their timers and pointer listeners with `ctx.cleanup`, and advancing timers after cleanup produces no further calls

## Implement

`src/scripts/captchas/puzzle.js`, `distortedText.js`, `timer.js`, `rotate.js`, registered in `captchas/index.js`.

- **puzzle** — 4 absolutely-positioned pieces over a target outline. Pointer events for dragging (works on touch). On release, apply a small random offset away from the drop point so it visibly refuses to settle. 10s auto-fail with a visible countdown.
- **distortedText** — canvas-rendered nonsense (per-glyph rotation, skew, wobbling baseline, noise lines). Generate from a consonant/vowel mix that reads as pronounceable-but-meaningless. Regenerate every attempt so nothing they type is ever the string on screen anymore.
- **timer** — counts from 30, ticking roughly once a second but with random jumps up and down. Never reaches 0. VERIFY stays `disabled`. At level ≥7 it may go negative and render glitched values. The cruelty is that it looks like it is almost there.
- **rotate** — a CSS-drawn scene that is unambiguously already upright (a house with the roof on top works well). A slider or drag handle rotates it. Every angle is rejected, including leaving it untouched.

**Note on `timer`:** the VERIFY button being permanently disabled means the only interaction is the skip link. Make sure the skip link still appears — since the user cannot rack up fails on this one by clicking VERIFY, the timer module must call `ctx.reject()` itself on each failed "verification attempt" cycle (roughly every 8 seconds) so the fail count still climbs to 6.

## Acceptance

- `npm test` green
- Each challenge is maddening but the skip link always arrives
- No leaked timers: switching screens mid-countdown produces no console errors
