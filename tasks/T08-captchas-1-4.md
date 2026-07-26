# T08 — CAPTCHAs 1-4: fire, images, math, robot

**Spec:** SPEC.md §6 (rows 1-4)

## Goal

The four selection-based challenges. All of them are unwinnable. None of them should look unwinnable.

## Failing tests first

`tests/captchas-1-4.test.js`:
- each of the 4 modules exports `id`, `title`, `instruction`, `render`, `verify`
- **`verify()` returns `false` for all 4** — assert with no selection, one selection, all selections, and every single-tile selection individually
- `fire`: renders a 5×5 grid of exactly 25 tiles; the emoji set is drawn only from 🔥💧🧊🌊❄️🕯️; at least one fire is present so it looks solvable; clicking a tile toggles a selected class
- `images`: renders 9 tiles; every tile carries the blur treatment class; no tile is labelled as a car anywhere in the DOM
- `math`: renders the prompt `2 + 2 =` and exactly the options `purple`, `Thursday`, `sadness`, `22`; selecting an option then verifying rejects; options are reshuffled after each attempt (order differs from the previous render across repeated attempts)
- `robot`: renders 9 tiles, subjects drawn from 🧑 🌳 🚗 🍕 🐕, and 🤖 appears nowhere in the DOM
- no module registers a timer or global listener without passing it to `ctx.cleanup`

## Implement

`src/scripts/captchas/fire.js`, `images.js`, `math.js`, `robot.js`, registered in `captchas/index.js`.

- **fire** — 5×5 emoji grid, chunky rounded tiles, selection ring on click. At level ≥5, tiles swap positions on `mouseenter` (guard behind the chaos flag so reduced-motion users get a static grid).
- **images** — 3×3 of `radial-gradient` blobs, each a different hue, all under `filter: blur(6px) saturate(1.6)`. Genuinely ambiguous shapes. The comedy is that a few *almost* look like a car.
- **math** — big friendly `2 + 2 =` with four fat pastel option buttons. Reshuffle on every attempt so the answer they just ruled out moves.
- **robot** — same blob treatment as `images` but with a faint emoji subject layered over each. Absolutely no robot.

Every one of them uses `ctx.reject()` and nothing else. Do not implement any success path — there isn't one.

## Acceptance

- `npm test` green
- Playing levels 1-4 in the browser, each challenge looks legitimately solvable and rejects everything
- No console errors when moving between captchas (cleanup is working)
