# T13 — A skip link players can find

**Spec:** SPEC.md §5.2 (skip link), §4 (hard rule)

## Goal

The exit is currently a whisper: `0.68rem` grey-on-white at 85% opacity. That was deliberate, so it would read as an admission of defeat rather than a button, and it is why players do not find it. Make it bold and high contrast at every level.

The app already knows how to do this. From level 4, `body.fx-neon .captcha-skip` flips the link to dark ink on a white chip so it can survive strobe, invert and spin. Promote that treatment to the base rule and delete the override: one prominent look at every level, instead of a whisper that becomes legible only once the card goes dark. Dark ink on white clears roughly 13:1 against the light card at levels 1 to 3 and stays high contrast on the dark card later, so a single treatment covers the whole run.

This makes the gauntlet easier to leave, which is the point. It also softens the original joke slightly, which is accepted.

## Failing tests first

`tests/captcha-shell.test.js` — a `describe('captcha.css')` block reading the stylesheet source, following the precedent in `tests/chaos.test.js` and `tests/mascot.test.js`.

- the base `.captcha-skip` rule carries `font-weight: 700`, the dark `#26313d` ink, and a background
- its font size is at least `0.8rem`
- nothing leaves it resting below full strength: the fade-in keyframe ends at `opacity: 1` and the reduced-motion static value is `1`. The keyframe's `0%` is exempt, it is the fade
- `captcha.css` carries no level-keyed contrast override for the link any more, so the single treatment cannot quietly regress into two

Keep the existing behavioural tests passing untouched: the link is still hidden below the threshold, still reveals on the rejection that earns it, still shows the failure notice and dispatches `skip()`.

## Implement

All in `src/styles/captcha.css`.

Base `.captcha-skip` rule:

- `font-size` `0.68rem` to `0.82rem`, and add `font-weight: 700`. Keep it smaller than VERIFY so it does not compete for the primary action, but legible at a glance
- `color` `#8d99a5` to `#26313d`, and add `background: #fff` and `box-shadow: 0 0 0 1px #26313d`. All three values come from the `fx-neon` rule being retired
- `padding` `8px 10px` to `9px 14px`, `border-radius` `3px` to `6px`, so it reads as a chip without shrinking the hit area
- keep `text-decoration: underline` and add `text-underline-offset: 3px` so the underline still reads inside the chip. The chip and the weight do the contrast work; the underline keeps the link affordance
- rewrite the block comment, which currently explains the low contrast as deliberate. That is no longer the design

`:hover` currently sets `color: #46535f`, which would now *lower* contrast against the base. Invert it: hold the text at `#26313d` and tint the chip instead, around `#eef3f8`.

Opacity in two places, so the link never settles below full strength: the `captcha-skip-in` keyframe's `100%`, and the reduced-motion static value. Both `0.85` to `1`.

Delete `body.fx-neon .captcha-skip` and fold its reasoning into the base comment. It existed to guarantee the exit stays legible from level 4 on; the base now guarantees it everywhere. This is safe: no test asserts that rule, and the "block for every flag" check in `tests/chaos.test.js` reads `chaos.css`, where `body.fx-neon` keeps its own block.

Leave alone, because the §4 hard rule depends on them: the `fx-dodge` drift animation, `.captcha-skip[hidden]`, the reduced-motion `animation: none`, and the padding that is the hit area.

`SPEC.md` §5.2 describes the link as "small, low-contrast". That is the one place the old look is specified. It becomes a small but bold, high-contrast chip, legible at every level, with a note that the level-4 contrast bump is no longer needed because the base carries it.

## Acceptance

- `npm test` green
- The link is legible at a glance at levels 1, 4 and 8, in both motion modes, screenshotted from the built `dist/index.html`
- The §4 hard rule still holds with the larger chip: at 1440px, 768px and 390px, in both motion modes, the link is on screen and `elementFromPoint` at its centre returns the link itself. Chrome will not open a window under 500px on Windows, so run 390px inside a 390px iframe. The audit harness from T11 already probes exactly this
- `node build/build.js` rerun and `dist/index.html` committed with the source

## Commit

Log the task in `changelogs/CHANGELOG.md` as a new top entry with the date and time in EDT. Then commit locally using the **git-commit-formatter** skill, and push to `origin/main`.
