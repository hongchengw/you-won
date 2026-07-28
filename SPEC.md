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
export const SKIP_THRESHOLD = 3;
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
2  Are you even trying?
3  Verification confidence: 0%. This is going badly.
4+ Incorrect. (attempt N)
```

`rejectionFor(fails)` is a pure function and is unit-tested.

**Invariant.** The table has exactly `SKIP_THRESHOLD` entries. Its last line therefore lands on the rejection that earns the skip link, and the `Incorrect. (attempt N)` fallback begins one past it. Moving the threshold moves the table with it.

**Skip link.** Hidden while `fails < SKIP_THRESHOLD`. At `fails >= SKIP_THRESHOLD` a small but bold, high-contrast `skip verification →` chip fades in: dark ink on white, legible at a glance at every level and in both motion modes. It stays smaller than VERIFY so it never competes for the primary action. One treatment covers the whole run, so the old level-4 contrast bump is no longer needed. Clicking it shows `VERIFICATION FAILED — returning to prize claim`, then dispatches `skip()`. At high chaos it drifts around, subject to the hard rule in §4.

### 5.3 Gate (`screens/gate.js` + `gate.css`)

Reached only from `skip()` at level 8. Roughly 11 seconds, then a hard cut. The last line holds alone for about six of them, which is the payoff and the reason the scene exists. Nothing may finish inside that hold: the doors are still parting and the pad is still at full level when the cut lands, and the pad's length is derived from the scene clock rather than duplicated.

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

`ctx` provides `{ level, fails, reject(), cleanup(fn) }`. `reject(note)` runs the shell's fail path, with an optional extra line rendered for one render. `cleanup(fn)` registers teardown for timers and listeners so screen changes don't leak.

Two optional fields let a module tell the shell about itself:

| Field | Effect |
|---|---|
| `rejection` | A standing note passed to `reject()` whenever VERIFY is pressed. `rotate` uses it for `Image is not upright.` |
| `disableVerify` | The shell renders VERIFY permanently disabled. `timer` uses it, and therefore has to call `ctx.reject()` on its own cycle so `fails` still reaches `SKIP_THRESHOLD` |

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
- **Gate:** chaos music stops; a swelling sine/triangle major-chord pad plays with a slow attack. It sustains at full level for a length the gate passes in, so the scene never runs on into silence, and releases just past the cut.
- **The melody restarts on reset.** The gate stops it for good, so the cut calls `startMusic()` alongside `reset()` and loop 1 gets its sweet, in-tune music back from the top of the phrase. Without that every loop after the first plays in silence, which contradicts the level-scaled melody above and throws away the best part of the reset. The `AudioContext` is never rebuilt: only the loop restarts.
- **Mute genuinely works at every level.** This is not part of the prank. People run this at a desk.

API: `createAudio({ AudioContextCtor })` → `{ start, setLevel, setMuted, isStarted, isMuted, blip, buzz, holyPad, stopMusic, startMusic }`.

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
- The build **escapes `</script>` and `</style>` sequences** before inlining. Both blocks are pasted into an HTML context, where tokenisation ends at the first such sequence no matter what the JS or CSS thinks it is quoting, so one in a string or a comment would truncate the document.
- The build **normalises every newline to LF** before hashing or writing. The HTML parser rewrites CRLF and lone CR to LF before anything downstream sees the text, so a digest of the bytes on disk is not the digest a browser computes. Without this, a Windows checkout produces a built file whose own CSP refuses it. It also makes `dist/index.html` byte-identical on every platform, which a committed artifact has to be.
- The built file carries a **Content-Security-Policy meta tag generated by the build**: `default-src 'none'`, both inline blocks pinned by sha256, `base-uri 'none'`, `form-action 'none'`. **No `'unsafe-inline'`, no `'unsafe-eval'`, no `'unsafe-hashes'`.** This is the zero-network rule above stated to the browser rather than only to the test suite. A hash does not cover a style *attribute*, but the app has none: every style it writes goes through `element.style.setProperty` or a property setter, and the CSSOM is not governed by `style-src` at all, so pinning the stylesheet by hash costs the app nothing. A style attribute added later would be blocked, which is the right way for that to fail. Tests recompute both digests from the built file, normalising first the way the parser does, so the policy cannot drift from the bundle and cannot pass here while failing in a browser.
- The build requires **Node 22 or newer** (`node:fs` `globSync`), declared in `engines`.

**Hosting.** `vercel.json` builds with `npm run build`, serves `dist/`, and sends the headers a meta tag cannot express: `frame-ancestors 'none'` plus `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and the cross-origin isolation pair. The header policy deliberately carries *only* `frame-ancestors`, so it cannot intersect with the meta policy into something that blocks the app. `index.html` is the whole app, so it must revalidate rather than be cached.

---

## 10. Non-goals

- No URL state, no hash routing, no share feature. The address bar is left alone and every load starts fresh.
- No backend, no analytics, no external requests of any kind.
- No real prize, obviously.
