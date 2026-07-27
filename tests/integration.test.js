import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { repoPath } from './helpers/paths.js';
import { start } from '../src/scripts/main.js';
import { createStore } from '../src/scripts/store.js';
import { createState, claim, CAPTCHA_ORDER, MAX_LEVEL, SKIP_THRESHOLD } from '../src/scripts/state.js';
import { createRouter } from '../src/scripts/main.js';
import { CAPTCHA_MODULES } from '../src/scripts/captchas/index.js';
import { SKIP_DELAY } from '../src/scripts/screens/captcha.js';
import { GATE_TIMING } from '../src/scripts/screens/gate.js';
import { LEVEL_FLAGS } from '../src/scripts/chaos.js';

// The whole thing, end to end, through the real store, the real router, the
// real chaos engine and all eight real challenges. Every other suite proves one
// piece in isolation. This one proves the app is playable and, more to the
// point, that it stays unwinnable and never becomes unplayable.

const ALL_FX = Object.values(LEVEL_FLAGS).flat();

// jsdom has no 2d context and the distorted text challenge draws on one.
function stubCanvas() {
  const context = new Proxy(
    { canvas: null, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic' },
    {
      get: (target, key) => (key in target ? target[key] : () => {}),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      }
    }
  );
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
}

function stubAudio() {
  const calls = { start: 0, blip: 0, buzz: 0, holyPad: 0, stopMusic: 0, levels: [], muted: [] };
  let started = false;
  return {
    calls,
    start() {
      started = true;
      calls.start += 1;
    },
    setLevel(level) {
      calls.levels.push(level);
    },
    setMuted(value) {
      calls.muted.push(value);
    },
    isStarted: () => started,
    isMuted: () => false,
    blip() {
      calls.blip += 1;
    },
    buzz() {
      calls.buzz += 1;
    },
    holyPad() {
      calls.holyPad += 1;
    },
    stopMusic() {
      calls.stopMusic += 1;
    }
  };
}

function mountApp() {
  const root = document.createElement('div');
  root.id = 'app';
  document.body.replaceChildren(root);

  const audio = stubAudio();
  const store = start(root, { audio });
  return { root, store, audio };
}

const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// The skip link as the visitor meets it: in the DOM, not hidden, not disabled,
// and still taking clicks. SPEC section 4's hard rule in assertion form.
function expectUsableSkipLink(root, level) {
  const link = root.querySelector('[data-action="skip"]');
  expect(link, `level ${level}: no skip link`).toBeTruthy();
  expect(link.hidden, `level ${level}: skip link hidden`).toBe(false);
  expect(link.disabled, `level ${level}: skip link disabled`).toBe(false);
  expect(window.getComputedStyle(link).pointerEvents, `level ${level}`).not.toBe('none');
  expect(link.textContent.length, `level ${level}: skip link has no label`).toBeGreaterThan(0);
  return link;
}

// One rejection, whichever way this level allows. SPEC section 6, row 7: the
// timer challenge has no button to press and rejects on its own cycle instead,
// so the only honest way to drive a level is to take whichever path it offers.
function failOnce(root, store, level) {
  const before = store.getState().fails;
  const verify = root.querySelector('[data-action="verify"]');
  expect(verify, `level ${level}: no verify button`).toBeTruthy();

  if (!verify.disabled) {
    click(verify);
    expect(store.getState().fails, `level ${level}: verify did not reject`).toBe(before + 1);
    return;
  }

  // A self-rejecting level. Wait it out one second at a time.
  for (let second = 0; second < 40 && store.getState().fails === before; second += 1) {
    vi.advanceTimersByTime(1000);
  }
  expect(store.getState().fails, `level ${level}: never rejected itself`).toBe(before + 1);
}

// CLAIM, six rejections, then skip. Returns the id of the challenge that was
// actually mounted, so the caller can check the running order.
function playLevel(root, store) {
  const level = store.getState().level;

  click(root.querySelector('[data-action="claim"]'));
  expect(store.getState().screen, `level ${level}: claim did not open the check`).toBe('captcha');

  const card = root.querySelector('.captcha-card');
  expect(card, `level ${level}: no captcha card`).toBeTruthy();
  const id = card.dataset.captcha;

  // The link is not on offer before it is earned.
  expect(root.querySelector('[data-action="skip"]').hidden).toBe(true);

  for (let attempt = 0; attempt < SKIP_THRESHOLD; attempt += 1) failOnce(root, store, level);
  expect(store.getState().fails).toBe(SKIP_THRESHOLD);

  click(expectUsableSkipLink(root, level));
  vi.advanceTimersByTime(SKIP_DELAY);

  return id;
}

// Eight loops. Returns the challenges in the order they were mounted.
function playThrough(root, store) {
  const seen = [];
  for (let loop = 0; loop < MAX_LEVEL; loop += 1) seen.push(playLevel(root, store));
  return seen;
}

const fxClasses = () => [...document.body.classList].filter((name) => name.startsWith('fx-'));

beforeEach(() => {
  vi.useFakeTimers();
  stubCanvas();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.className = '';
  delete document.body.dataset.chaos;
  document.body.replaceChildren();
});

describe('a full playthrough', () => {
  it('visits all 8 challenges in CAPTCHA_ORDER and ends at the gate', () => {
    const { root, store } = mountApp();

    expect(store.getState()).toMatchObject({ screen: 'won', level: 1, fails: 0 });
    expect(playThrough(root, store)).toEqual(CAPTCHA_ORDER);
    expect(store.getState().screen).toBe('gate');
    expect(root.querySelector('.screen-gate')).toBeTruthy();
  });

  it('offers a usable skip link at every level after six rejections', () => {
    const { root, store } = mountApp();

    for (let loop = 0; loop < MAX_LEVEL; loop += 1) {
      const level = store.getState().level;
      click(root.querySelector('[data-action="claim"]'));
      for (let attempt = 0; attempt < SKIP_THRESHOLD; attempt += 1) failOnce(root, store, level);

      const link = expectUsableSkipLink(root, level);
      // Nothing chaos put on the page swallowed it: the link is still the
      // deepest node at its own position in the tree.
      expect(link.closest('[aria-hidden="true"]'), `level ${level}: skip link is hidden from AT`).toBeNull();

      click(link);
      vi.advanceTimersByTime(SKIP_DELAY);
    }

    expect(store.getState().screen).toBe('gate');
  });

  it('leaves no challenge timer running once the screen changes', () => {
    // A fresh app per level, so the only difference from the baseline is the
    // challenge that was mounted and then torn down.
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const root = document.createElement('div');
      document.body.replaceChildren(root);

      const store = createStore({ ...createState(), level });
      createRouter(root, store, { dispatch: store.dispatch, audio: stubAudio() });

      // Whatever chaos runs at this level is already ticking. It is allowed to.
      const baseline = vi.getTimerCount();

      store.dispatch(claim);
      expect(root.querySelector('.captcha-card').dataset.captcha).toBe(CAPTCHA_ORDER[level - 1]);

      store.dispatch((state) => ({ ...state, screen: 'won' }));
      expect(vi.getTimerCount(), `level ${level}: ${CAPTCHA_ORDER[level - 1]} left a timer behind`)
        .toBe(baseline);

      vi.clearAllTimers();
    }
  });
});

// Chaos puts `filter` on #app from level 2 (`fx-saturate`) and again at level 5
// (`fx-hypercolor`), and an animated `transform` at level 4 (`fx-shake`). Any of
// those makes #app the containing block for `position: fixed` descendants, so
// anything pinned to a viewport corner from inside #app stops being pinned and
// scrolls away with the page. The mute toggle is not allowed to do that: mute is
// never part of the prank. Neither is the mascot, which is supposed to sit in a
// corner rather than wander over the card.
describe('persistent chrome', () => {
  it('keeps the mute toggle out of the chaos-filtered subtree on every screen', () => {
    const { root, store } = mountApp();

    for (let loop = 0; loop < MAX_LEVEL; loop += 1) {
      const level = store.getState().level;

      for (const screen of ['won', 'captcha']) {
        if (screen === 'captcha') click(root.querySelector('[data-action="claim"]'));

        const toggles = document.querySelectorAll('[data-action="mute"]');
        expect(toggles.length, `level ${level} ${screen}: expected exactly one mute toggle`).toBe(1);
        expect(root.contains(toggles[0]), `level ${level} ${screen}: mute toggle is inside #app`).toBe(false);
        expect(document.body.contains(toggles[0])).toBe(true);
      }

      for (let attempt = 0; attempt < SKIP_THRESHOLD; attempt += 1) failOnce(root, store, level);
      click(root.querySelector('[data-action="skip"]'));
      vi.advanceTimersByTime(SKIP_DELAY);
    }

    // And on the gate, which is the one screen a visitor cannot click away from.
    expect(store.getState().screen).toBe('gate');
    const onGate = document.querySelectorAll('[data-action="mute"]');
    expect(onGate.length).toBe(1);
    expect(root.contains(onGate[0]), 'gate: mute toggle is inside #app').toBe(false);
  });

  it('keeps the mascot out of the chaos-filtered subtree', () => {
    const { root, store } = mountApp();

    click(root.querySelector('[data-action="claim"]'));
    for (let attempt = 0; attempt < SKIP_THRESHOLD; attempt += 1) failOnce(root, store, 1);
    click(root.querySelector('[data-action="skip"]'));
    vi.advanceTimersByTime(SKIP_DELAY);

    // Loop 2 is where the mascot first appears.
    expect(store.getState().level).toBe(2);
    const mascot = document.querySelector('.mascot');
    expect(mascot).toBeTruthy();
    expect(root.contains(mascot), 'mascot is inside #app').toBe(false);
    expect(document.body.contains(mascot)).toBe(true);
  });
});

// SPEC section 8: nothing overflows the viewport horizontally, at any width or
// chaos level. jsdom has no layout, so this cannot be measured here; it is
// verified in a real browser at 390px, 768px and 1440px in both motion modes.
// What is guarded here is the declaration the browser pass proved is necessary:
// `fx-spin` rotates and up-scales the whole screen past both edges by design,
// and with the clip removed the page scrolls sideways by 39px at level 7.
describe('the horizontal clip', () => {
  it('is declared on the root as well as the body', () => {
    const base = readFileSync(repoPath('src', 'styles', 'base.css'), 'utf8');
    const rule = base.match(/html,\s*\n\s*body\s*\{[\s\S]*?\}/);
    expect(rule, 'no html, body rule in base.css').toBeTruthy();
    expect(rule[0]).toMatch(/overflow-x:\s*(clip|hidden)/);
  });
});

describe('the registry', () => {
  it('has no winnable challenge in it', () => {
    const ids = Object.keys(CAPTCHA_MODULES);
    expect(ids).toEqual(expect.arrayContaining([...CAPTCHA_ORDER]));

    // Every module, fresh, and again after everything on it has been used.
    for (const id of ids) {
      const module = CAPTCHA_MODULES[id];
      expect(module.verify(), `${id} verified nothing`).toBe(false);

      const root = document.createElement('div');
      document.body.replaceChildren(root);
      const cleanups = [];
      module.render(root, { level: 1, fails: 0, reject: () => {}, cleanup: (fn) => cleanups.push(fn) });

      root.querySelectorAll('button, input, [data-action]').forEach((control) => {
        click(control);
        if (control.tagName === 'INPUT') control.value = 'anything at all';
      });
      expect(module.verify(), `${id} became winnable`).toBe(false);

      cleanups.forEach((fn) => fn());
    }
  });
});

describe('after the gate', () => {
  it('resets to a pristine app and plays identically a second time', () => {
    const { root, store, audio } = mountApp();

    expect(playThrough(root, store)).toEqual(CAPTCHA_ORDER);
    vi.advanceTimersByTime(GATE_TIMING.cut);

    // State: everything back to loop 1 except the two things that survive.
    expect(store.getState()).toEqual({
      screen: 'won',
      level: 1,
      fails: 0,
      muted: false,
      audioStarted: true
    });

    // Body: no chaos, no mascot, no leftover chaos layer of any kind.
    expect(document.body.dataset.chaos).toBe('1');
    expect(fxClasses()).toEqual([]);
    expect(document.querySelector('.mascot')).toBeNull();
    expect(document.querySelector('.fx-popup-layer')).toBeNull();
    expect(document.querySelector('.fx-trail-layer')).toBeNull();
    expect(document.querySelector('.fx-glitch-overlay')).toBeNull();
    expect(document.querySelector('.fx-strobe-overlay')).toBeNull();

    // Screen: the sincere one, with the first prize back on it.
    expect(root.querySelector('.won-card')).toBeTruthy();
    expect(root.querySelector('.won-prize').textContent).toBe('A 2024 SUPER YACHT');

    // Nothing anywhere admits this has happened before.
    expect(root.textContent).not.toMatch(/again|times won|loop|attempt/i);

    // And it does the whole thing again, the same way.
    const audioBefore = audio.calls.start;
    expect(playThrough(root, store)).toEqual(CAPTCHA_ORDER);
    expect(store.getState().screen).toBe('gate');
    // The AudioContext survived the reset, so it is never built twice.
    expect(audio.calls.start).toBe(audioBefore);
  });
});

describe('chaos over a playthrough', () => {
  it('adds every flag for the level and never leaves one behind', () => {
    const { root, store } = mountApp();

    expect(document.body.dataset.chaos).toBe('1');
    expect(fxClasses()).toEqual([]);

    for (let loop = 0; loop < MAX_LEVEL; loop += 1) {
      const level = store.getState().level;
      expect(document.body.dataset.chaos, `loop ${level}`).toBe(String(level));

      const live = fxClasses();
      for (let step = 1; step <= level; step += 1) {
        for (const flag of LEVEL_FLAGS[step]) {
          expect(live, `level ${level} is missing fx-${flag}`).toContain(`fx-${flag}`);
        }
      }
      // Nothing from a later level has arrived early.
      const earned = new Set(
        Array.from({ length: level }, (_, i) => LEVEL_FLAGS[i + 1]).flat().map((f) => `fx-${f}`)
      );
      for (const name of live) expect(earned, `fx- class ${name} arrived early`).toContain(name);
      expect(ALL_FX.length).toBeGreaterThan(live.length - 1);

      playLevel(root, store);
    }

    vi.advanceTimersByTime(GATE_TIMING.cut);
    expect(fxClasses()).toEqual([]);
  });
});
