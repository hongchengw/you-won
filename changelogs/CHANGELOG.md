# Changelog

Newest entries at the top. Times are EDT.

## T06 — Degrading mascot

**2026-07-26 7:22 PM EDT**

- Added `tests/mascot.test.js` (20 tests) covering `mascotStateFor(1)` being exactly `{ visible: false }`, visibility on levels 2 through 8, the mood progression sweet (2-3), snark (4-5), broken (6-7), corrupt (8), each state carrying its own pool, purity and out-of-range clamping, four non-empty pools with no line shared between moods, glitch characters in every corrupt line and none in any sweet line, no em-dashes anywhere in the pools, `mascotMessage` wrapping around its pool and returning an empty string at level 1, `renderMascot` rendering nothing at level 1 and a `.mascot` node from level 2, the body parts the chaos flags target being present, the spoken line always coming from the current mood pool, re-rendering replacing rather than stacking so only one mascot is ever in the DOM, the mascot disappearing when the level drops back to 1, `aria-hidden` on the widget, and a stylesheet audit that `.mascot` carries `pointer-events: none` and nothing re-enables them.
- Added `src/scripts/mascot.js` with `MASCOT_MESSAGES`, the pure `mascotStateFor(level)` and `mascotMessage(level, beat)`, and `renderMascot(root, level)`. Four pools of eight lines each: sincere encouragement, then passive-aggression, then a mascot reporting its own condition in lower case, then struck-through zalgo, block characters, fullwidth text and replacement characters. A module level beat counter walks the pool, so the mascot says something new on every claim, every rejection, and every loop.
- Added `src/styles/mascot.css`: a CSS-drawn blob with a gradient body, a tuft, two eyes with glints, hidden brows, blush ovals, and a mouth built from the bottom half of a ring, plus a speech bubble with a tail. Degradation is keyed off the chaos flags only, never off the level: `fx-eyeDrift` slows one eye's transition so it lags behind the other, `fx-mascotSnark` brings the brows in, kills the glint, drains the colour and flattens the smile, `fx-mascotInvert` flips the mouth and sags the body, and `fx-mascotCorrupt` detaches the eyes and mouth into stepped jitter and hue-rotates the body.
- Changed the reserved `fx-mascotInvert` hook in `chaos.css` from `rotate: 180deg` to `transform: scaleY(-1)`, which is why no part of the mascot drawing uses `transform` for its own positioning.
- Mounted the mascot from the router in `main.js` rather than from a screen, so it is persistent chrome and follows the visitor from You Won into the CAPTCHA shell that lands in T07.
- Held to the hard rule from SPEC section 4: the whole widget is `pointer-events: none` and sits in the bottom left corner, clear of the CLAIM button, the mute toggle, and the coming skip link. Below 560px the bubble stacks above the blob and both shrink and hug the left edge, and below 520px of height the bubble is dropped entirely so the corner can never crowd the card.
- Reduced motion keeps every stage of the decline and only stops the twitching: the corrupt mascot holds a static broken pose instead of jittering.
- Rebuilt `dist/index.html`, still a single file with zero external references. Screenshotted the built page in headless Chrome at levels 1 through 8 at 390px and 1200px in both motion modes: no mascot at all on loop 1, a beaming blob on loop 2, drifting eyes on loop 3, brows and a flat mouth on loop 4, a frown on loop 6, and a green detached mess on loop 8, with the card and the controls unobstructed at every step.

## T05 — Web Audio engine

**2026-07-26 7:08 PM EDT**

- Added `tests/audio.test.js` (15 tests) driven by an injected fake `AudioContext` constructor that records every context, oscillator, gain, filter and param automation. Covers `createAudio()` constructing nothing and `isStarted()` being false before the first click, `start()` building exactly one context however often it is called, the melody firing more notes per second at level 8 than at level 1, the peak detune growing with the level, mute ramping the master gain to 0 and unmute restoring it, mute holding at 0 at level 8 with SFX firing, `isMuted()` tracking the last `setMuted`, `blip`/`buzz`/`holyPad`/`stopMusic`/`setLevel` being safe no-ops before `start()`, `buzz()` using a sawtooth in a lower band than the `blip()` sine, `holyPad()` killing the melody before the pad voices come in and no melody note arriving afterwards, `stopMusic()` silencing the loop while leaving the context open and running, monotonic `tempoFor`/`detuneFor` across levels 1-8 with clamping, and the router pushing `setLevel(state.level)` on every render.
- Replaced the `src/scripts/audio.js` stub with the real engine. One master gain feeds the destination and a music bus feeds the master, so mute has a single honest knob and SFX stay audible after the melody stops.
- Melody: a 16 note toy phrase in C major over `MELODY_ROOT` C5, one throwaway oscillator plus gain envelope per note, rescheduled with `setTimeout` at `tempoFor(level)`. `tempoFor` runs 0.26s per note at level 1 down to 0.106s at level 8, and `detuneFor` runs 0 cents at level 1 up to 84 cents at level 8 applied through a fixed per-note shape so the tune wobbles sharp and flat rather than transposing. The wave switches from triangle to square at level 4, so it goes from music box to cheap broken toy.
- SFX: `blip()` is a short 880Hz sine pluck on button presses, `buzz()` is a harsh 110Hz sawtooth burst for rejections, both routed past the music bus straight into the master.
- `holyPad()` stops the melody first, then swells a four voice C major chord on alternating sine and triangle oscillators with a 1.6s attack and a 6.5s release, ready for the T10 gate scene. `stopMusic()` only clears the loop timer and never touches the context, so nothing has to be rebuilt afterwards.
- Mute rides a 60ms linear ramp on the master gain and never calls `suspend()`, so SFX timing stays sane and unmuting is instant. It works identically at every level including 8.
- Wired `deps.audio.setLevel(state.level)` into the router in `main.js` right after `applyChaos`, so the music sours in step with the visuals, and left `buzz()` on the shared `deps.audio` for the T07 CAPTCHA shell.
- Total output stays conservative: master gain 0.16 with per voice envelopes below that. The app is already annoying.
- Rebuilt `dist/index.html`, still a single file with zero external references. Smoke tested the built bundle with a stubbed constructor: zero AudioContexts on load, exactly one after the CLAIM click, and the melody scheduling notes immediately afterwards.

## T04 — Chaos engine, levels 1-8

**2026-07-26 7:01 PM EDT**

- Added `tests/chaos.test.js` (33 tests) covering `flagsFor(1)` being empty, the exact per-level flag sets from SPEC section 4, cumulativeness across every level, purity, out-of-range clamping, the `MOTION_FLAGS` list, `applyChaos` setting `body.dataset.chaos` and one `fx-<flag>` class per active flag, stale class removal when the level drops, unrelated body classes being left alone, the clean body at level 1 after level 8, reduced motion withholding every motion flag while keeping typography, colour, backwards text, popups, glitch and the mascot flags, teardown of the trail layer, popups and overlays with no leaked intervals or listeners, `fx-dodge` moving a control exactly once and still firing its click, and a stylesheet audit that every flag has rules and every decorative overlay carries `pointer-events: none`.
- Added `src/scripts/chaos.js` with `LEVEL_FLAGS`, `MOTION_FLAGS`, `flagsFor(level)` and `applyChaos(doc, level, opts)`. Reduced motion comes from `matchMedia` and is overridable via `opts.reducedMotion` for tests. Flags that need JS register a start function returning its own teardown, so the sparkle trail, the fake popups, the dodge listener, and the glitch and strobe overlays all stop the moment their flag goes away.
- Added the JS helpers: a throttled pointer trail that spawns self-deleting sparkles into an inert layer, six rotating fake junk popups on an interval capped at four on screen and parked in the left and right margins, and a dodge handler that nudges an interactive element once by a small bounded offset and then never touches it again.
- Filled in `src/styles/chaos.css`, one block per flag: tilt, saturate, Comic Sans, cursor trail, shake, neon palette override, backwards small print, popups, hypercolor grade with a hue drift, glitch RGB split plus scanlines and a rolling tear, dodge, strobe, invert pulse, spin drift, overdrive through a single `--fx-speed` knob, and reserved hooks for the T06 mascot flags.
- Wired `applyChaos` into the router in `main.js` so every state change applies the chaos for `state.level` before the screen renders, and no screen has to know that chaos exists.
- Held to the hard rule from SPEC section 4: every decorative layer is `pointer-events: none`, popups sit under the mute toggle and dismiss on either button, the spin drift pulls the corner controls inboard so no swing pushes them off an edge, and dodging always lets the second approach through.
- Rebuilt `dist/index.html`, still a single file with zero external references. Smoke tested the built page in headless Chrome at levels 1 through 8 in both motion modes: the escalation reads sweet, slightly off, Comic Sans, shaking neon, backwards with popups, glitching, strobing and drifting, then full overdrive, with the controls visible and clickable at every step.

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
