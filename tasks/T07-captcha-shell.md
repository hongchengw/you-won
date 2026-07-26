# T07 — CAPTCHA shell and skip link

**Spec:** SPEC.md §5.2, §6

## Goal

The frame every challenge lives in: fake verification card, escalating rejections, and the skip link that is the only way forward.

## Failing tests first

`tests/captcha-shell.test.js`:
- `rejectionFor(n)` returns the exact SPEC §5.2 strings for n=1..6
- `rejectionFor(n)` for n≥7 returns the `Incorrect. (attempt N)` form with the right N
- the shell renders the module's title, instruction, a VERIFY button, and an error region
- clicking VERIFY calls the module's `verify()`, and since it returns false, dispatches `fail()`
- after each rejection the error region shows the message for the current fail count
- the skip link is absent or hidden while `fails < 6`
- at `fails === 6` the skip link is present and visible
- clicking skip shows `VERIFICATION FAILED — returning to prize claim` then dispatches `skip()`
- the shell calls `ctx.cleanup` handlers when the screen is torn down (timers and listeners must not leak between captchas)
- rejection triggers `audio.buzz()` (injected stub)

## Implement

`src/scripts/screens/captcha.js`:

- `rejectionFor(fails)` — pure, exported, tested.
- `renderCaptcha(root, state, deps)` — looks up the module by `captchaFor(state)`, builds the card, calls `module.render(body, ctx)`.
- `ctx` is `{ level, fails, reject(), cleanup(fn) }`. `reject()` runs `verify()`'s failure path: dispatch `fail()`, buzz, update the error region.
- Maintain a cleanup registry; the router calls it before swapping screens.

`src/scripts/captchas/index.js` — id → module registry, so T08 and T09 just add entries.

Card styling in `screens.css`: a deliberately over-official verification panel with a fake logo, a "SECURITY CHECK" header, and fine print. It should look like a real CAPTCHA widget dropped into a children's party, which is funnier than making it match the pastel theme.

Skip link: small, low contrast, bottom-right of the card, fades in. Under `fx-dodge` it may drift, but per SPEC §4 it must always stay visible and clickable.

## Acceptance

- `npm test` green
- With a stub module registered, six VERIFY clicks produce the escalating messages and then reveal the skip link
- Skip returns to the You Won screen one level higher
