# You Won!

...or did you? Find out today.

A prize page that is delighted to see you. There is one quick verification
first. It will not go well.

**This is a joke.** Nobody wins anything, no CAPTCHA in it can be solved, and
that is the entire point. It is a single self-contained HTML file with no
tracking, no network requests and no data collection of any kind. Nothing you
click leaves the page.

**It makes noise.** The first CLAIM PRIZE click starts a little music-box melody
that gets worse the longer you stay. There is a mute button in the top right
corner on every screen and it genuinely works at every level. Turn your volume
down before you show this to a room.

## Try it yourself

```bash
npm install
npm run build
```

Then open `dist/index.html` directly in your browser: double-click it, or drag it
into a window. It runs from `file://` with no server and no network access.

A copy of `dist/index.html` is committed, so you can also just open that.

## Run the tests

```bash
npm test
```

## How to escape

Fail the same verification six times and a small `skip verification` link
appears. It always appears, it is always clickable, and it takes you back to the
prize. Eight times.

If you have a `prefers-reduced-motion` setting turned on, the app respects it:
no shaking, spinning, strobing or inverting, and it stays completable. The rest
of the joke is intact.

## What is in here

| Path | What it is |
|---|---|
| `SPEC.md` | The design document everything was built from |
| `tasks/` | The eleven tasks it was built in, in order |
| `changelogs/CHANGELOG.md` | What each task actually changed |
| `src/` | Source: ES modules and plain CSS, no framework |
| `build/build.js` | Inlines all of it into one file |
| `dist/index.html` | That one file |
| `tests/` | Vitest, jsdom |

No dependencies ship in the build. There are no web fonts, no images and no
audio files: every graphic is CSS, canvas or an emoji, and every sound is a Web
Audio oscillator.
