# T02 — State machine and router

**Spec:** SPEC.md §2, §3

## Goal

The pure state core that drives everything: 8 loops, one CAPTCHA each, skip-only advancement, total reset after the gate.

## Failing tests first

`tests/state.test.js`:
- `createState()` matches the initial shape in SPEC §3
- `claim()` moves `won → captcha` and zeroes `fails`; is a no-op from `captcha` and `gate`
- `fail()` increments `fails` and changes nothing else; is a no-op outside `captcha`
- `fail()` never changes `level` or `screen` — the whole point
- `skip()` below level 8 returns to `won`, increments `level`, zeroes `fails`
- `skip()` at level 8 goes to `gate` and leaves `level` at 8
- `canSkip()` is false below 6 fails, true at 6 and above
- `captchaFor()` returns the right id for all 8 levels, in `CAPTCHA_ORDER`
- `reset()` returns to the initial shape **but preserves `muted` and `audioStarted`**
- every transition is non-mutating: the input object is deep-equal to a snapshot taken before the call
- driving the full flow — claim/skip 8 times — visits all 8 captchas in order and lands on `gate`

`tests/store.test.js`:
- `subscribe()` fires on dispatch with the new state
- `unsubscribe` stops delivery

## Implement

`src/scripts/state.js` — the constants and pure transitions from SPEC §3. No DOM, no imports.

`src/scripts/store.js` — tiny observable: `createStore(initial)` → `{ getState, dispatch(fn), subscribe(cb) }` where `dispatch` takes a transition function and applies it.

`src/scripts/main.js` — router. Subscribes to the store, and on each state change renders the screen matching `state.screen` into `#app`. Screen renderers do not exist yet; import placeholders that render the screen name, so later tasks swap them in one by one. Keep the router dumb: read `screen`, call the matching renderer, nothing else.

## Acceptance

- `npm test` green
- Build succeeds; `dist/index.html` renders the placeholder for the `won` screen
