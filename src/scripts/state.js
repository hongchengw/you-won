// Pure state core. SPEC.md section 2 and 3.
// Every transition returns a new object and never mutates its input.
// No DOM, no imports.

export const CAPTCHA_ORDER = [
  'fire', 'images', 'math', 'robot',
  'puzzle', 'distortedText', 'timer', 'rotate'
];

export const MAX_LEVEL = 8;
export const SKIP_THRESHOLD = 3;

export function createState() {
  return {
    screen: 'won',
    level: 1,
    fails: 0,
    muted: false,
    audioStarted: false
  };
}

// CLAIM PRIZE. Only meaningful from the You Won screen.
export function claim(state) {
  if (state.screen !== 'won') return { ...state };
  return { ...state, screen: 'captcha', fails: 0 };
}

// A rejection. Counts up and nothing else, forever.
export function fail(state) {
  if (state.screen !== 'captcha') return { ...state };
  return { ...state, fails: state.fails + 1 };
}

// The only way out of a CAPTCHA. Level 8 opens the gate instead of looping.
export function skip(state) {
  if (state.screen !== 'captcha') return { ...state };
  if (state.level >= MAX_LEVEL) return { ...state, screen: 'gate' };
  return { ...state, screen: 'won', level: state.level + 1, fails: 0 };
}

// Back to a pristine loop 1. The mute choice and the live AudioContext survive.
export function reset(state) {
  return { ...createState(), muted: state.muted, audioStarted: state.audioStarted };
}

export function captchaFor(state) {
  return CAPTCHA_ORDER[state.level - 1];
}

export function canSkip(state) {
  return state.fails >= SKIP_THRESHOLD;
}
