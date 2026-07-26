# Changelog

Newest entries at the top. Times are EDT.

## T03 — Kawaii design system and You Won screen

**2026-07-26 6:44 PM EDT**

- Added `tests/won.test.js` covering the headline text, the CLAIM PRIZE button, the prize line for the current level, the claim transition to `screen: 'captcha'`, audio starting exactly once across repeated claims, the confetti and balloon decoration nodes, the mute toggle flipping `muted` in state and on the audio object, idempotent re-render, and `prizeFor` across all 8 levels plus out-of-range input.
- Replaced the `src/scripts/screens/won.js` placeholder with the real screen: `renderWon(root, state, deps)` builds the prize card, the CSS-only decoration, and the mute toggle, and exports `prizeFor(level)` with 8 escalating absurd prizes. Claiming starts audio on the first ever click, plays a blip, and dispatches a transition that runs `claim()` and records `audioStarted`.
- Added `src/scripts/screens/mute.js` with the `toggleMute` transition and the persistent corner toggle, shared by every screen from SPEC section 5.1.
- Added `src/scripts/audio.js` as a no-op stub with the final SPEC section 7 shape (`start`, `setLevel`, `setMuted`, `isStarted`, `isMuted`, `blip`, `buzz`, `holyPad`, `stopMusic`). It tracks `started` and `muted` only. T05 fills in the Web Audio internals.
- Wired an injectable `deps` object (`{ dispatch, audio }`) through `main.js` into every screen renderer, so tests can stub audio and later screens get the same handles.
- Filled in `src/styles/tokens.css` with the derived tints, radii, motion easing, and the layered `--outline-bubble` text-shadow ring that fakes bubble type without a web font.
- Filled in `src/styles/base.css`: pink to lavender to mint page gradient with a polka wash, centered screen layout, per-letter bubble headline with sticker-scatter rotation and a pop animation, the fat bouncy mint CLAIM button with gloss, hover lift, and active squish, and the round mute toggle.
- Filled in `src/styles/won.css`: the cream prize card with a white ring, sticker shadow, bow, and corner sparkle, the dashed prize plaque, and the CSS-only confetti and balloons. Decoration uses negative animation delays so every loop is already mid-flight on first paint, and reduced motion settles it into a static scatter rather than hiding it.
- Rebuilt `dist/index.html`, still a single file with zero external references. Verified in a headless browser at 390px, 1200px, and 1440px, and that clicking CLAIM in the built page reaches the captcha placeholder.

## T02 — State machine and router

**2026-07-26 6:31 PM EDT**

- Added `tests/state.test.js` covering the initial shape, every transition, the no-op guards, non-mutation of inputs, `canSkip` around the threshold, `captchaFor` across all 8 levels, and a full claim/skip playthrough that visits all 8 CAPTCHAs in order and lands on the gate.
- Added `tests/store.test.js` covering initial state, dispatch, subscriber notification with the new state, multiple subscribers, unsubscribe, and that the held state is never mutated.
- Added `src/scripts/state.js` with `CAPTCHA_ORDER`, `MAX_LEVEL`, `SKIP_THRESHOLD` and the pure transitions `createState`, `claim`, `fail`, `skip`, `reset`, `captchaFor`, `canSkip` from SPEC section 3. Every transition returns a new object and never mutates its input. `reset()` preserves `muted` and `audioStarted`.
- Added `src/scripts/store.js`, a tiny observable: `createStore(initial)` returns `getState`, `dispatch(transition)`, and `subscribe(cb)` which hands back an unsubscribe function.
- Added `src/scripts/screens/placeholder.js` plus `won.js`, `captcha.js`, and `gate.js` placeholder renderers that emit only the screen name, so T03, T07, and T10 can swap them in one at a time.
- Rewrote `src/scripts/main.js` as the router: it creates the store, subscribes, and on each state change calls the renderer matching `state.screen`. No other logic.
- Rebuilt `dist/index.html`, which now renders the `won` placeholder and still carries zero external references.

## T01 — Scaffolding, build pipeline, test harness

**2026-07-26 6:27 PM EDT**

- Added `package.json` (`you-won`, ESM, private) with `build`, `test`, and `test:watch` scripts, plus `vitest` and `jsdom` dev deps.
- Added `vitest.config.js` running the jsdom environment over `tests/**/*.test.js`.
- Added `tests/spec.test.js` guarding that `SPEC.md` exists and is non-empty.
- Added `tests/build.test.js` asserting the built file starts with `<!doctype html>`, mounts `#app`, carries no external `<link href>` or `<script src>` references, and inlines every stylesheet and every script module.
- Added `src/index.html` shell with `<!-- STYLES -->` and `<!-- SCRIPTS -->` placeholders and dev-time tags so the source tree also works when served directly.
- Added `src/styles/tokens.css` with the kawaii palette, radii, font stacks, and sticker shadow from SPEC section 8. Remaining stylesheets stubbed for later tasks.
- Added `src/scripts/main.js` placeholder that mounts a loading node into `#app`.
- Added `build/build.js`, a dependency-free bundler that concatenates the stylesheets, walks relative imports from `main.js` in topological order, strips import and export syntax into one shared module scope, fails loudly on duplicate top-level identifiers or unreachable modules, and writes a single self-contained `dist/index.html`.
- Added `AGENTS.md` documenting the workflow and `changelogs/CHANGELOG.md`.
