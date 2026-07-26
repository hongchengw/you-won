# SPEC — "You Won!"

**This document is the source of truth.** Any behavior change lands here first, then in code. If code and spec disagree, the spec wins and the code is a bug.

---

## 1. Product

A prank web app. The visitor lands on a genuinely adorable "CONGRATULATIONS YOU WON!!" page and is trapped in an unwinnable CAPTCHA gauntlet. The UI degrades from kawaii pastel candy into full sensory chaos across 8 loops. At the end, a fake-holy gate scene congratulates them, then silently returns them to a pristine loop 1 with no acknowledgement. The gaslighting is the joke.

**Design intent:** loop 1 must be sincerely cute and convincing. The comedy comes from the contrast, not from starting ugly.

---

## 2. Flow

```
WON(1) → fire         → WON(2) → images  → WON(3) → math
WON(4) → robot        → WON(5) → puzzle  → WON(6) → distortedText
WON(7) → timer        → WON(8) → rotate  → GATE → WON(1) pristine
```

The CAPTCHA shown at level `L` is `CAPTCHA_ORDER[L - 1]`. There is no separate captcha index.

**Every CAPTCHA rejects unconditionally.** There is no correct answer to any of them. The only way forward is the skip link, which is framed as a failure.

---

## 3. State

`src/scripts/state.js`. Pure transition functions returning new state objects; a thin store holds the current one and notifies subscribers.

```js
export const CAPTCHA_ORDER = [
  'fire', 'images', 'math', 'robot',
  'puzzle', 'distortedText', 'timer', 'rotate'
];
export const MAX_LEVEL = 8;
export const SKIP_THRESHOLD = 6;
```

**Shape**

| Field | Type | Initial | Meaning |
|---|---|---|---|
| `screen` | `'won' \| 'captcha' \| 'gate'` | `'won'` | Active screen |
| `level` | `1..8` | `1` | Loop number, drives chaos and captcha selection |
| `fails` | `number` | `0` | Rejections on the current CAPTCHA |
| `muted` | `boolean` | `false` | Audio mute |
| `audioStarted` | `boolean` | `false` | Whether the AudioContext has been created |

**Transitions** (all pure, all return a new object, none mutate the input)

| Function | Effect |
|---|---|
| `createState()` | Returns the initial shape above |
| `claim(s)` | `screen: 'captcha'`, `fails: 0`. No-op unless `screen === 'won'` |
| `fail(s)` | `fails: s.fails + 1`. No-op unless `screen === 'captcha'` |
| `skip(s)` | If `level < MAX_LEVEL`: `screen: 'won'`, `level: level + 1`, `fails: 0`. If `level === MAX_LEVEL`: `screen: 'gate'`. No-op unless `screen === 'captcha'` |
| `reset(s)` | Returns `createState()` but **preserves `muted` and `audioStarted`** — the user's mute choice must survive the reset, and the AudioContext is not torn down |
| `captchaFor(s)` | `CAPTCHA_ORDER[s.level - 1]` |
| `canSkip(s)` | `s.fails >= SKIP_THRESHOLD` |

`skip()` is the only path out of a CAPTCHA. `fail()` never advances anything.

---

## 4. Chaos engine

`src/scripts/chaos.js` + `src/styles/chaos.css`. Everything keys off `document.body`:

- `body.dataset.chaos = String(level)`
- one class per active flag, named `fx-<flag>`

**Flags are cumulative.** `flagsFor(level)` returns the union of every level's own flags from 1 through `level`.

| Level | Flags added | Visual result |
|---|---|---|
| 1 | *(none)* | Pristine kawaii. Confetti, floating balloons, bouncy mint CLAIM button |
| 2 | `mascot`, `tilt`, `saturate` | Mascot appears, sweet. Elements tilt slightly. Saturation +10% |
| 3 | `comicSans`, `eyeDrift`, `cursorTrail` | Comic Sans everywhere. Mascot's eyes drift apart. Sparkle cursor trail |
| 4 | `shake`, `neon`, `mascotSnark` | Whole page shakes. Neon accents bleed in. Mascot turns passive-aggressive |
| 5 | `backwards`, `popups`, `hypercolor` | Some labels render backwards. Fake dismissible popups. Colors cranked |
| 6 | `glitch`, `dodge`, `mascotInvert` | RGB-split + scanline overlay. Buttons dodge once before allowing the click. Mascot's smile inverts |
| 7 | `strobe`, `invert`, `spin` | Strobe flashes, periodic color inversion, slow viewport rotation drift |
| 8 | `overdrive`, `trails`, `mascotCorrupt` | Everything faster and louder. Cursor trails. Mascot text fully corrupted |

**Reduced motion.** When `matchMedia('(prefers-reduced-motion: reduce)')` matches, these flags are withheld:

```js
export const MOTION_FLAGS = ['shake', 'spin', 'strobe', 'invert', 'dodge', 'cursorTrail', 'trails', 'overdrive'];
```

Color, typography, backwards text, popups, glitch overlay, and mascot degradation all still apply. The app stays completable in both modes.

**Hard rule:** at every level, including 8, the skip link must remain visible, hit-testable, and clickable. Chaos may make it annoying to click. It may never make it impossible.

---

## 5. Screens

Single mount point `#app`. Each screen fully re-renders into it.

### 5.1 You Won (`screens/won.js`)

- Headline `CONGRATULATIONS` / `YOU WON!!` in bubble type
- Subline naming an absurd prize, varying by level (e.g. "A 2024 SUPER YACHT", "ONE (1) FREE SANDWICH", "THE ENTIRE MOON")
- Primary button: **CLAIM PRIZE 🎁** — dispatches `claim()`, starts audio on first ever click
- Confetti and floating balloons, CSS-only
- Persistent mute toggle in a corner, present on every screen

### 5.2 CAPTCHA (`screens/captcha.js`)

The shell around all 8 challenge modules. Renders a fake verification card: title bar, instruction line, the challenge body from the module, a VERIFY button, an error region, and the skip link.

**Escalating rejection copy**, indexed by `fails` after increment:

```
1  Incorrect. Please try again.
2  Incorrect. Please focus.
3  Still incorrect. Are you sure you're human?
4  Hmm. That's not it either.
5  Are you even trying?
6  Verification confidence: 0%. This is going badly.
7+ Incorrect. (attempt N)
```

`rejectionFor(fails)` is a pure function and is unit-tested.

**Skip link.** Hidden while `fails < 6`. At `fails >= 6` a small, low-contrast `skip verification →` link fades in. Clicking it shows `VERIFICATION FAILED — returning to prize claim`, then dispatches `skip()`. At high chaos it drifts around, subject to the hard rule in §4.

### 5.3 Gate (`screens/gate.js` + `gate.css`)

Reached only from `skip()` at level 8. Roughly 6 seconds, then a hard cut.

1. Chaos audio cuts. Effects freeze. A white overlay blooms from center over ~1.5s to pure white.
2. A swelling major-chord pad fades in. Ornate CSS double doors materialize and part, with light rays and drifting particles.
3. Serif text in sequence: `VERIFICATION COMPLETE` → `YOU HAVE BEEN VERIFIED` → `PLEASE PROCEED TO CLAIM YOUR PRIZE`
4. **Hard cut** — no transition — to a pristine You Won at level 1 via `reset()`. No counter, no wink, no acknowledgement that anything happened.

---

## 6. CAPTCHA module contract

Each file in `src/scripts/captchas/` default-exports:

```js
export default {
  id: 'fire',
  title: 'Security Verification',
  instruction: 'Click all the fire emojis.',
  render(root, ctx) { /* build DOM into root, wire interactions */ },
  verify() { return false }   // ALWAYS false. Asserted by test for all 8.
};
```

`ctx` provides `{ level, fails, reject(), cleanup(fn) }`. `reject()` runs the shell's fail path. `cleanup(fn)` registers teardown for timers and listeners so screen changes don't leak.

| # | id | Instruction | Behavior |
|---|---|---|---|
| 1 | `fire` | Click all the fire emojis. | 5×5 grid of 🔥💧🧊🌊❄️🕯️. Any selection rejected. At level ≥5, tiles swap positions on hover |
| 2 | `images` | Select all images containing a car. | 3×3 blurred `radial-gradient` blobs, nothing legible. Any selection rejected |
| 3 | `math` | Prove you're human: solve this. | Shows `2 + 2 =` with options `purple`, `Thursday`, `sadness`, `22`. All wrong. Options reshuffle after each attempt |
| 4 | `robot` | Which one is the robot? | 3×3 blurred blobs with faint emoji subjects (🧑 🌳 🚗 🍕 🐕). No robot exists |
| 5 | `puzzle` | Slide the puzzle pieces into place. | 4 pointer-draggable pieces. Never snap; each release nudges the piece away. Auto-fails at 10s; countdown unreliable at high chaos |
| 6 | `distortedText` | Type the distorted text. | Canvas-warped nonsense glyphs, free-text input. Always wrong. Regenerates every attempt |
| 7 | `timer` | Please wait for verification. | Counts down from 30 but jumps around (28 → 31 → 14 → 29…). VERIFY stays disabled; the count never reaches 0. Goes negative and glitches at high chaos |
| 8 | `rotate` | Rotate the image to the correct position. | An already-upright CSS-drawn image with a rotation slider. Every angle including 0° is rejected with `Image is not upright.` |

---

## 7. Audio

`src/scripts/audio.js`, Web Audio API, oscillators only, no audio files.

- **Lazy.** No `AudioContext` is constructed until the first CLAIM PRIZE click. `isStarted()` is false before that. This satisfies browser autoplay policy and is unit-tested with an injected constructor.
- **Background:** a short looping square/triangle "MIDI" melody. Tempo and detune scale with chaos level — sweet and in tune at level 1, fast and sour at level 8.
- **SFX:** click blip on button presses, harsh buzz on every rejection.
- **Gate:** chaos music stops; a swelling sine/triangle major-chord pad plays with a slow attack.
- **Mute genuinely works at every level.** This is not part of the prank. People run this at a desk.

API: `createAudio({ AudioContextCtor })` → `{ start, setLevel, setMuted, isStarted, isMuted, blip, buzz, holyPad, stopMusic }`.

---

## 8. Presentation

**Kawaii palette (level 1)** — defined as custom properties in `tokens.css`:

| Token | Value | Use |
|---|---|---|
| `--candy-pink` | `#ffb7d5` | Primary background gradient stop |
| `--candy-mint` | `#a8f0d8` | CLAIM button, accents |
| `--candy-lavender` | `#d9c2ff` | Secondary background stop |
| `--candy-lemon` | `#fff2a8` | Highlights, sparkles |
| `--candy-sky` | `#bde3ff` | Card fills |
| `--ink` | `#5b3a53` | Text, warm plum rather than black |

Chunky rounded corners (`--radius-blob: 32px`), sticker-style layered shadows, generous whitespace.

**Fonts.** No web fonts — the build must stay dependency-free and run from `file://`. The bubble look is faked with `system-ui, "Trebuchet MS", Verdana` plus layered `text-shadow` outlines and tight letter-spacing. Chaos levels swap to `"Comic Sans MS", cursive`.

**Imagery.** Everything is CSS, canvas, or emoji. Blurry "photos" are `radial-gradient` blobs under `filter: blur() saturate()`. The holy gate is CSS shapes. Distorted text is canvas-rendered.

**Responsive.** Usable at 390px, 768px, and 1440px. CAPTCHA grids reflow; nothing overflows the viewport horizontally.

---

## 9. Build and test

- Source lives in `src/` as ES modules plus separate CSS files.
- `node build/build.js` inlines all CSS and JS into `dist/index.html` — a single self-contained file with **no external `<link href>` or `<script src>` references** and no network requests. It must run correctly from `file://`.
- `npm test` runs Vitest with the jsdom environment. Web Audio and canvas are stubbed in tests.
- **Every feature gets a failing test before its implementation.**

---

## 10. Non-goals

- No URL state, no hash routing, no share feature. The address bar is left alone and every load starts fresh.
- No backend, no analytics, no external requests of any kind.
- No real prize, obviously.
