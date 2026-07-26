# T03 — Kawaii design system and You Won screen

**Spec:** SPEC.md §5.1, §8

## Goal

The sincere version of the app. Loop 1 must look genuinely adorable and convincing — a real prize-claim page a child would love. The whole joke depends on this screen being cute, not ironic.

## Failing tests first

`tests/won.test.js`:
- `renderWon(root, state)` renders the `CONGRATULATIONS` and `YOU WON` headline text
- renders a CLAIM PRIZE button
- clicking CLAIM dispatches `claim()` — state moves to `screen: 'captcha'`
- clicking CLAIM starts audio exactly once (assert via an injected audio stub; second click does not call `start` again)
- renders confetti and balloon decoration nodes
- renders a mute toggle, and clicking it flips `muted` in state
- `prizeFor(level)` is pure and returns a different absurd prize string per level, all 8 defined

## Implement

`src/styles/tokens.css` — fill in the full palette from SPEC §8 plus `--radius-blob`, shadow tokens, and the bubble/Comic Sans font stacks as variables.

`src/styles/base.css` — page background as a soft pink → lavender → mint gradient, centered layout, the faked bubble headline (layered `text-shadow` outlines, tight letter-spacing, slight rotation per letter), sticker-style layered shadows, fat rounded mint CLAIM button with a gentle bounce animation and a squish on `:active`.

`src/styles/screens.css` — the You Won card, confetti, balloons.

`src/scripts/screens/won.js` — `renderWon(root, state, deps)` where `deps` carries the audio object and the store dispatch so tests can inject stubs. Include `prizeFor(level)` with 8 escalating absurd prizes.

Decoration should be pure CSS animation, not JS timers, so nothing leaks between screens.

## Acceptance

- `npm test` green
- Built page at level 1 looks like a sweet children's prize page — no chaos yet
- Clicking CLAIM starts the melody and moves to the captcha placeholder
- Mute toggle silences audio
