# T15 — The melody comes back with the reset

**Spec:** SPEC.md §7 (audio), §3 (`reset`)

## Goal

**Bug.** After the first gate the app is silent forever. Every loop from then on has no music at all.

`loop()` runs only from `start()`, which is guarded by `isStarted()` and only ever fires on the first CLAIM. The gate calls `stopMusic()`, which clears the timer for good, and nothing anywhere restarts it. The reset brings back the confetti, the prize and the pristine card, and hands the player a dead soundtrack.

That contradicts SPEC §7, where the melody sours in step with the level, and it quietly undoes the best part of the reset: the sweet, in-tune, level 1 music returning as though nothing happened is the joke. A longer gate pad makes it worse, because the pad's own tail becomes the last music anyone ever hears.

Sequence this after T14 if both are in flight. They edit the same callback in the gate.

## Failing tests first

`tests/audio.test.js`

- `startMusic()` resumes the melody after `stopMusic()` has ended it: with fake timers, no notes are scheduled while stopped, and notes resume once it is called
- it is a no-op before `start()`, because there is no context to schedule against
- calling it twice does not stack a second loop, so the melody cannot end up playing at double speed
- the melody restarts at the top of its phrase, matching what a total reset means

`tests/gate.test.js`

- the gate restarts the melody after the cut: the stub records the call, and the order across the whole scene is `stopMusic`, then `holyPad`, then `startMusic`, with the restart landing after `reset()` is dispatched

`tests/integration.test.js`

- a second playthrough has music: after the gate completes and loop 1 is back, the melody is scheduling notes again

## Implement

`src/scripts/audio.js` — add `startMusic()` beside `stopMusic()`, as its mirror:

- no-op unless the context exists and the loop is actually stopped, so it is safe to call from anywhere and can never double up
- reset the melody step to 0, so loop 1 starts at the top of the phrase rather than halfway through whatever was playing when the gate cut it off
- then `loop()`

Add it to the returned API object next to `stopMusic`.

`src/scripts/screens/gate.js` — call it in the cut callback, immediately after `deps.dispatch(reset)`, so the music resets along with the chaos classes, the mascot and the prize. The pad's release tail overlapping the restarted melody is fine and intended: at level 1 the melody is sweet and in tune, so it blends into the chord rather than fighting it.

**Every audio stub in the tests needs the new method**, or the gate will call `undefined` from inside a timer callback and fail with a confusing error a long way from the cause. The stubs live in `tests/gate.test.js`, `tests/integration.test.js`, `tests/captcha-shell.test.js`, `tests/captchas-5-8.test.js` and `tests/won.test.js`. Only the first two reach the cut, but all five should match the real interface. Do this in the same commit.

`SPEC.md` §7 — record that the melody restarts on reset, so the next person reading the spec does not reintroduce the bug.

## Acceptance

- `npm test` green
- Driven in a browser against the built `dist/index.html`: play through to the gate, let it cut, and confirm the melody is running again on loop 1. Count scheduled oscillators over a few seconds with a recording `AudioContext` stub, the same approach used in T11 to prove audio starts only on the first CLAIM
- Exactly one `AudioContext` for the whole session, before and after the reset. The context survives; only the loop restarts
- Heard once unmuted: sweet, in-tune level 1 music back under a pristine card, with the pad's tail fading out over it
- `node build/build.js` rerun and `dist/index.html` committed with the source

## Commit

Log the task in `changelogs/CHANGELOG.md` as a new top entry with the date and time in EDT. Then commit locally using the **git-commit-formatter** skill, and push to `origin/main`.
