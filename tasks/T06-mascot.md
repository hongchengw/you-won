# T06 — Degrading mascot

**Spec:** SPEC.md §4 (mascot flags), §5

## Goal

A CSS-drawn kawaii blob that shows up at loop 2 being sweet and encouraging, and is fully broken by loop 8. It is the emotional barometer of the descent.

## Failing tests first

`tests/mascot.test.js`:
- `mascotStateFor(1)` is `{ visible: false }` — the mascot does not exist on the pristine first loop
- `mascotStateFor(n)` for 2..8 is visible
- mood progresses `sweet` (2-3) → `snark` (4-5) → `broken` (6-7) → `corrupt` (8)
- each mood has its own non-empty message pool, and pools do not overlap between moods
- `renderMascot(root, level)` renders nothing at level 1 and a mascot node from level 2
- re-rendering replaces rather than stacks mascots (only ever one in the DOM)
- corrupt-mood messages contain glitch characters; sweet-mood messages do not

## Implement

`src/scripts/mascot.js` — `mascotStateFor(level)` (pure), `renderMascot(root, level)`, `MASCOT_MESSAGES` keyed by mood.

Message tone by mood:
- **sweet** — "You're doing great!" / "Almost there!" / "I believe in you!!"
- **snark** — "Still here I see." / "Most people finish this faster." / "It's not that hard."
- **broken** — "why are you still cliCKing" / "I can't feel my edges" / "the prize was never—"
- **corrupt** — heavily glitched, zalgo-ish or mojibake fragments

Draw the mascot in CSS: a rounded blob body, two eyes, a mouth, blush circles. Degradation is driven by the chaos flags rather than bespoke level checks:
- `fx-eyeDrift` — eyes translate apart, one lags behind
- `fx-mascotSnark` — eyebrows tilt, colors dull
- `fx-mascotInvert` — mouth arc flips to a frown via `scaleY(-1)`
- `fx-mascotCorrupt` — features detach and jitter, body hue-rotates

Speech bubble sits beside the blob. It must not cover the CLAIM button or the skip link — check this at 390px width too.

## Acceptance

- `npm test` green
- Stepping levels 1→8 in the browser shows a genuinely sad, funny decline
- Mascot never blocks an interactive element at any width
