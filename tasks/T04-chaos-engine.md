# T04 — Chaos engine, levels 1-8

**Spec:** SPEC.md §4

## Goal

The escalation. Everything keys off `body[data-chaos]` and `fx-*` classes so any screen degrades without knowing chaos exists.

## Failing tests first

`tests/chaos.test.js`:
- `flagsFor(1)` is empty
- `flagsFor(n)` is cumulative — every flag from levels below `n` is still present at `n`
- each level's exact new flags match the SPEC §4 table
- `applyChaos(document, level)` sets `body.dataset.chaos` to the level and adds `fx-<flag>` for each active flag
- calling `applyChaos` with a lower level removes flags that are no longer active (no stale classes)
- with reduced motion on, no flag in `MOTION_FLAGS` is applied at any level 1-8
- with reduced motion on, non-motion flags such as `comicSans`, `backwards`, `popups`, `glitch`, and the mascot flags are still applied
- `applyChaos(document, 1)` after level 8 leaves the body completely clean — this is the post-gate reset path

## Implement

`src/scripts/chaos.js` — `LEVEL_FLAGS`, `MOTION_FLAGS`, `flagsFor(level)`, `applyChaos(doc, level, opts)`. Reduced motion is read from `matchMedia` but overridable via `opts.reducedMotion` for tests.

`src/styles/chaos.css` — one block per flag, all scoped under `body.fx-<flag>`:

- `tilt` slight rotations on cards and buttons
- `saturate` / `hypercolor` / `neon` progressive `filter` and palette overrides
- `comicSans` font-family override
- `shake` continuous small translate keyframe on the app container
- `backwards` `scaleX(-1)` on elements marked `[data-flip]`
- `glitch` RGB-split pseudo-elements plus scanline overlay
- `strobe` full-screen flashing overlay
- `invert` periodic `filter: invert()` pulse
- `spin` very slow rotation drift on the app container
- `overdrive` shortens every animation duration via a `--fx-speed` variable
- `trails` / `cursorTrail` styling hooks for the JS-spawned trail nodes

Cursor trails and fake popups need small JS helpers — put them in `chaos.js`, gated on the flag being active, and make sure they clean up when the flag goes away.

**Hard requirement, verify manually:** the skip link stays visible and clickable at level 8 in both motion modes. Nothing in this task may cover it with a full-screen overlay that eats pointer events — use `pointer-events: none` on all decorative overlays.

## Acceptance

- `npm test` green
- Manually stepping `applyChaos(document, n)` in the console for n=1..8 shows a clear, funny escalation
- OS reduce-motion on: no shake, spin, strobe, or invert; app still fully usable
