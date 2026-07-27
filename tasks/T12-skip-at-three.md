# T12 — Skip at three rejections

**Spec:** SPEC.md §5.2, §3 (`SKIP_THRESHOLD`, `canSkip`)

## Goal

Failing the same check over and over is the only route through this app and always was: every challenge's `verify()` returns `false` unconditionally, and the skip link is the sole exit. Make that route cost 3 rejections instead of 6.

The escalating rejection copy is indexed by the fail count, so a lower threshold silently strands half of it. Compress the table to 3 lines so the arc still lands, punchline included, at every level. The line a player is most likely to remember is the one they currently never see.

`SKIP_THRESHOLD` is read only by `canSkip()`, and `captcha.css` has no coupling to the count, so the mechanical change is one number. The work is in the copy and in the tests and prose that hardcode 6.

## Failing tests first

`tests/state.test.js`

- `SKIP_THRESHOLD` is `3`
- `canSkip()` is false below 3 fails and true at 3 and above, written in terms of `SKIP_THRESHOLD` rather than a literal, so it stops carrying the old number

`tests/captcha-shell.test.js`

- `rejectionFor(1..3)` returns the three new spec strings verbatim, in order
- `rejectionFor(4)` is `Incorrect. (attempt 4)`; 8 and 42 keep the same form
- the escalation runs out exactly when the skip link arrives: the copy table has exactly `SKIP_THRESHOLD` entries, `rejectionFor(SKIP_THRESHOLD)` is the last line, and `rejectionFor(SKIP_THRESHOLD + 1)` is the fallback. This is the guard that keeps the table and the threshold from drifting apart, and it makes any future threshold move spec-driven rather than a copy edit someone forgets
- the error region still shows the message for the current fail count after each rejection, and the skip link still reveals on the rejection that earns it

`tests/captchas-5-8.test.js`

- the timer challenge drives the shell to a visible skip link with no clicks in `SKIP_THRESHOLD` self-rejection cycles, derived from `SKIP_THRESHOLD` and `TIMER_ATTEMPT_TICKS` rather than the hardcoded 6 and 8000 it uses today

## Implement

`src/scripts/state.js` — `SKIP_THRESHOLD` from `6` to `3`. Nothing else in the module moves.

`src/scripts/screens/captcha.js` — `REJECTIONS` becomes exactly these three, verbatim and in this order:

```
1  Incorrect. Please try again.
2  Are you even trying?
3  Verification confidence: 0%. This is going badly.
4+ Incorrect. (attempt N)
```

Cut `Incorrect. Please focus.`, `Still incorrect. Are you sure you're human?` and `Hmm. That's not it either.` Leave `rejectionFor()` alone: it is driven by `REJECTIONS.length`, so the fallback moves to `fails >= 4` for free.

Stale comments to correct: `captcha.js` says the link is hidden "until the sixth rejection"; `src/scripts/captchas/timer.js` says the fail count "climbs to six" and "Six of those is the skip link". Leave the `6` in `timer.js`'s countdown-floor comment alone, it is a different number.

`SPEC.md` §5.2 — the mirrored `SKIP_THRESHOLD = 3`, the rejection table above, and the skip link paragraph's `fails < 6` / `fails >= 6`. Add the invariant the compression creates: the table has exactly `SKIP_THRESHOLD` entries, so the last line lands on the attempt that earns the link and the fallback begins one past it.

Wanted side effects, worth confirming rather than assuming: level 7 (`timer`, which has no VERIFY button and rejects itself every 8 seconds) now earns the link in about 24 seconds instead of 48, and level 5's puzzle floor drops from 60 seconds to 30.

Do not rewrite `tasks/T01` through `T11`. They are historical records of what was built at the time.

## Acceptance

- `npm test` green
- Three rejections reveal the skip link on all 8 levels in the built `dist/index.html`, with the copy in the new order and `Incorrect. (attempt 4)` after the third line
- Level 7 still reaches a visible, clickable skip link with no clicks at all, in about 24 seconds
- `node build/build.js` rerun and `dist/index.html` committed with the source

## Commit

Log the task in `changelogs/CHANGELOG.md` as a new top entry with the date and time in EDT. Then commit locally using the **git-commit-formatter** skill, and push to `origin/main`.
