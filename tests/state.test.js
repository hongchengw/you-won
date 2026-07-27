import { describe, it, expect } from 'vitest';
import {
  CAPTCHA_ORDER,
  MAX_LEVEL,
  SKIP_THRESHOLD,
  createState,
  claim,
  fail,
  skip,
  reset,
  captchaFor,
  canSkip
} from '../src/scripts/state.js';

// Runs a transition and asserts it left its input untouched. SPEC section 3:
// every transition is pure and returns a new object.
const pure = (transition, input) => {
  const before = structuredClone(input);
  const next = transition(input);
  expect(input).toEqual(before);
  expect(next).not.toBe(input);
  return next;
};

const at = (patch) => ({ ...createState(), ...patch });

describe('constants', () => {
  it('lists the 8 captchas in flow order', () => {
    expect(CAPTCHA_ORDER).toEqual([
      'fire', 'images', 'math', 'robot',
      'puzzle', 'distortedText', 'timer', 'rotate'
    ]);
  });

  it('caps the gauntlet at 8 levels and 3 fails before skipping', () => {
    expect(MAX_LEVEL).toBe(8);
    expect(SKIP_THRESHOLD).toBe(3);
  });
});

describe('createState', () => {
  it('matches the initial shape', () => {
    expect(createState()).toEqual({
      screen: 'won',
      level: 1,
      fails: 0,
      muted: false,
      audioStarted: false
    });
  });

  it('returns a fresh object each call', () => {
    expect(createState()).not.toBe(createState());
  });
});

describe('claim', () => {
  it('moves won to captcha and zeroes fails', () => {
    const next = pure(claim, at({ fails: 3 }));
    expect(next.screen).toBe('captcha');
    expect(next.fails).toBe(0);
    expect(next.level).toBe(1);
  });

  it('is a no-op from captcha and gate', () => {
    const onCaptcha = at({ screen: 'captcha', fails: 4 });
    expect(pure(claim, onCaptcha)).toEqual(onCaptcha);

    const onGate = at({ screen: 'gate', level: 8 });
    expect(pure(claim, onGate)).toEqual(onGate);
  });
});

describe('fail', () => {
  it('increments fails and changes nothing else', () => {
    const next = pure(fail, at({ screen: 'captcha', level: 3, fails: 2 }));
    expect(next).toEqual(at({ screen: 'captcha', level: 3, fails: 3 }));
  });

  it('never changes level or screen', () => {
    let state = at({ screen: 'captcha', level: 5, fails: 0 });
    for (let i = 0; i < 20; i += 1) state = fail(state);
    expect(state.screen).toBe('captcha');
    expect(state.level).toBe(5);
    expect(state.fails).toBe(20);
  });

  it('is a no-op outside captcha', () => {
    const onWon = at({ fails: 2 });
    expect(pure(fail, onWon)).toEqual(onWon);

    const onGate = at({ screen: 'gate', level: 8, fails: 7 });
    expect(pure(fail, onGate)).toEqual(onGate);
  });
});

describe('skip', () => {
  it('below level 8 returns to won, increments level, zeroes fails', () => {
    const next = pure(skip, at({ screen: 'captcha', level: 3, fails: 9 }));
    expect(next).toEqual(at({ screen: 'won', level: 4, fails: 0 }));
  });

  it('at level 8 goes to gate and leaves level at 8', () => {
    const next = pure(skip, at({ screen: 'captcha', level: 8, fails: 6 }));
    expect(next.screen).toBe('gate');
    expect(next.level).toBe(8);
  });

  it('is a no-op outside captcha', () => {
    const onWon = at({ level: 2 });
    expect(pure(skip, onWon)).toEqual(onWon);

    const onGate = at({ screen: 'gate', level: 8 });
    expect(pure(skip, onGate)).toEqual(onGate);
  });
});

describe('canSkip', () => {
  it('is false below the threshold and true at the threshold and above', () => {
    for (let fails = 0; fails < SKIP_THRESHOLD; fails += 1) {
      expect(canSkip(at({ screen: 'captcha', fails }))).toBe(false);
    }
    expect(canSkip(at({ screen: 'captcha', fails: SKIP_THRESHOLD }))).toBe(true);
    expect(canSkip(at({ screen: 'captcha', fails: SKIP_THRESHOLD + 1 }))).toBe(true);
    expect(canSkip(at({ screen: 'captcha', fails: 99 }))).toBe(true);
  });
});

describe('captchaFor', () => {
  it('returns the right id for all 8 levels', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(captchaFor(at({ level }))).toBe(CAPTCHA_ORDER[level - 1]);
    }
  });
});

describe('reset', () => {
  it('returns to the initial shape but preserves muted and audioStarted', () => {
    const dirty = at({
      screen: 'gate',
      level: 8,
      fails: 12,
      muted: true,
      audioStarted: true
    });
    expect(pure(reset, dirty)).toEqual({
      screen: 'won',
      level: 1,
      fails: 0,
      muted: true,
      audioStarted: true
    });
  });

  it('carries an unmuted, unstarted state through untouched', () => {
    expect(reset(at({ screen: 'gate', level: 8, fails: 3 }))).toEqual(createState());
  });
});

describe('full flow', () => {
  it('visits all 8 captchas in order and lands on gate', () => {
    const seen = [];
    let state = createState();

    for (let i = 0; i < MAX_LEVEL; i += 1) {
      state = claim(state);
      expect(state.screen).toBe('captcha');
      seen.push(captchaFor(state));
      state = skip(state);
    }

    expect(seen).toEqual(CAPTCHA_ORDER);
    expect(state.screen).toBe('gate');
    expect(state.level).toBe(MAX_LEVEL);
    expect(reset(state)).toEqual(createState());
  });
});
