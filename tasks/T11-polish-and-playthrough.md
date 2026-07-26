# T11 — Responsive pass, polish, full playthrough

**Spec:** SPEC.md §8 (responsive), §4 (hard rule), §9

## Goal

Make it hold together end to end at every width, and verify the whole 8-loop experience actually plays.

## Failing tests first

`tests/integration.test.js` — drive the real store and router in jsdom.

- a full scripted playthrough — claim, 6 fails, skip, ×8 — visits all 8 captchas in `CAPTCHA_ORDER` and reaches `screen: 'gate'`
- at every level, after 6 fails, a visible skip link exists in the DOM and is not `pointer-events: none`
- no captcha module leaves timers running after the screen changes
- `verify()` returns false for all 8 modules — one consolidated assertion over the registry, so a future module cannot accidentally be winnable
- after the gate completes, state and body are pristine and a second playthrough works identically

`tests/build.test.js` — extend:
- `dist/index.html` contains all 8 captcha modules
- still zero external references

## Implement

- Responsive pass at **390px, 768px, 1440px**. CAPTCHA grids reflow (5×5 stays square and shrinks; 3×3 stays 3 wide). Headline scales with `clamp()`. Mascot repositions so it never covers the CLAIM button or skip link on narrow screens. Nothing overflows horizontally at any width or chaos level — `overflow-x: hidden` on the body plus containment on the shake and spin transforms.
- Verify the §4 hard rule by hand at level 8 in both motion modes.
- `README.md` — what it is, how to run (`npm install`, `npm test`, `node build/build.js`, open `dist/index.html`), a note that it is a joke and a warning about the audio.
- Final copy pass on every user-facing string: prizes, rejections, mascot lines, fine print. This is a comedy app; the writing carries it. Cut anything that isn't funny.
- Confirm `dist/index.html` is committed and current.

## Manual playthrough checklist

1. Open `dist/index.html` from `file://` — no console errors, no network requests
2. Level 1 looks sincerely adorable
3. Audio starts on the first CLAIM click, not before
4. Each loop is visibly worse than the last
5. All 8 captchas reject everything
6. Skip link appears on the 6th fail every time and is always clickable, including level 8
7. Gate scene plays fully and the cut back to level 1 is clean
8. Mute works at every level
9. OS reduce-motion on: no shake, spin, strobe, or invert; still completable
10. Repeat at 390px

## Acceptance

- `npm test` green
- Every checklist item above passes
