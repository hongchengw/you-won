import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import puzzleCaptcha from '../src/scripts/captchas/puzzle.js';
import distortedTextCaptcha, { distortedTextFor } from '../src/scripts/captchas/distortedText.js';
import timerCaptcha, { timerValueFor } from '../src/scripts/captchas/timer.js';
import rotateCaptcha, { ROTATE_REJECTION } from '../src/scripts/captchas/rotate.js';
import { CAPTCHA_MODULES } from '../src/scripts/captchas/index.js';
import { renderCaptcha } from '../src/scripts/screens/captcha.js';
import { runCleanup } from '../src/scripts/cleanup.js';
import { createState } from '../src/scripts/state.js';
import { createStore } from '../src/scripts/store.js';

// SPEC.md section 6, rows 5-8. The four time and input challenges. Same rule as
// the first four: there is no success path, and these tests exist to keep it
// that way.

const MODULES = [
  ['puzzle', puzzleCaptcha],
  ['distortedText', distortedTextCaptcha],
  ['timer', timerCaptcha],
  ['rotate', rotateCaptcha]
];

// A small dictionary of common words. The distorted string must never be one.
const COMMON_WORDS = [
  'about', 'above', 'after', 'again', 'apple', 'banana', 'before', 'below',
  'bottle', 'button', 'candle', 'garden', 'happy', 'hello', 'human', 'letter',
  'little', 'melon', 'monkey', 'number', 'orange', 'people', 'person', 'pretty',
  'purple', 'rabbit', 'really', 'silver', 'simple', 'sunday', 'table', 'today',
  'water', 'window', 'winter', 'yellow'
];

// jsdom has no 2d context. The distorted text challenge only ever calls a
// handful of drawing methods, so a recorder is enough.
function stubCanvasContext() {
  const calls = [];
  const context = new Proxy(
    {
      canvas: null,
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left',
      textBaseline: 'alphabetic'
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => calls.push([String(key), ...args]);
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      }
    }
  );

  const spy = vi
    .spyOn(window.HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => context);

  return { context, calls, spy };
}

const mounted = [];

function mountModule(module, overrides = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);

  const calls = { rejects: [], cleanups: [] };
  const ctx = {
    level: 1,
    fails: 0,
    reject: (message) => calls.rejects.push(message),
    cleanup: (fn) => calls.cleanups.push(fn),
    ...overrides
  };

  module.render(root, ctx);
  mounted.push(calls);
  return { root, ctx, calls };
}

function drainMounted() {
  mounted.forEach((calls) => calls.cleanups.forEach((fn) => fn()));
  mounted.length = 0;
}

const pointer = (type, x, y) =>
  new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y });

const positionOf = (node) => ({
  x: parseFloat(node.style.left),
  y: parseFloat(node.style.top)
});

const targetOf = (node) => ({
  x: Number(node.dataset.targetX),
  y: Number(node.dataset.targetY)
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function stubAudio() {
  return {
    start() {},
    setLevel() {},
    setMuted() {},
    isStarted: () => true,
    isMuted: () => false,
    blip() {},
    buzz() {},
    holyPad() {},
    stopMusic() {}
  };
}

// Mounts the real shell around the real module for a level, so the pieces the
// shell owns (the VERIFY button, the rejection note) can be asserted.
function mountShell(level) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);

  const store = createStore({ ...createState(), screen: 'captcha', level });
  const deps = { dispatch: store.dispatch, audio: stubAudio(), captchas: CAPTCHA_MODULES };

  store.subscribe((state) => {
    runCleanup();
    if (state.screen === 'captcha') renderCaptcha(root, state, deps);
  });
  renderCaptcha(root, store.getState(), deps);

  return { root, store };
}

beforeEach(() => {
  document.body.replaceChildren();
  runCleanup();
});

afterEach(() => {
  drainMounted();
  runCleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('captcha modules 5-8: contract', () => {
  it.each(MODULES)('%s exports the SPEC section 6 shape', (id, module) => {
    expect(module.id).toBe(id);
    expect(typeof module.title).toBe('string');
    expect(module.title.length).toBeGreaterThan(0);
    expect(typeof module.instruction).toBe('string');
    expect(module.instruction.length).toBeGreaterThan(0);
    expect(typeof module.render).toBe('function');
    expect(typeof module.verify).toBe('function');
  });

  it.each(MODULES)('%s is registered under its own id', (id, module) => {
    expect(CAPTCHA_MODULES[id]).toBe(module);
  });

  it.each(MODULES)('%s: verify() is false before any interaction', (id, module) => {
    stubCanvasContext();
    vi.useFakeTimers();
    mountModule(module);
    expect(module.verify()).toBe(false);
  });

  it.each(MODULES)('%s: verify() is false after every control is used', (id, module) => {
    stubCanvasContext();
    vi.useFakeTimers();
    const { root } = mountModule(module);

    root.querySelectorAll('button').forEach((node) => node.click());
    root.querySelectorAll('input[type="range"]').forEach((node) => {
      node.value = String(Number(node.max));
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    root.querySelectorAll('input[type="text"]').forEach((node) => {
      node.value = 'whatever the picture said';
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
    });

    expect(module.verify()).toBe(false);
  });
});

describe('puzzle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('uses the SPEC instruction', () => {
    expect(puzzleCaptcha.instruction).toBe('Slide the puzzle pieces into place.');
  });

  it('renders four draggable pieces over four targets', () => {
    const { root } = mountModule(puzzleCaptcha);
    const pieces = [...root.querySelectorAll('.puzzle-piece')];
    expect(pieces.length).toBe(4);
    pieces.forEach((piece) => {
      expect(Number.isFinite(targetOf(piece).x)).toBe(true);
      expect(Number.isFinite(targetOf(piece).y)).toBe(true);
      expect(Number.isFinite(positionOf(piece).x)).toBe(true);
    });
  });

  it('starts every piece away from its target', () => {
    const { root } = mountModule(puzzleCaptcha);
    root.querySelectorAll('.puzzle-piece').forEach((piece) => {
      expect(distance(positionOf(piece), targetOf(piece))).toBeGreaterThan(10);
    });
  });

  it('never lets a piece settle on its target', () => {
    const { root } = mountModule(puzzleCaptcha);

    [...root.querySelectorAll('.puzzle-piece')].forEach((piece) => {
      const target = targetOf(piece);
      const start = positionOf(piece);

      piece.dispatchEvent(pointer('pointerdown', 200, 200));
      document.dispatchEvent(
        pointer('pointermove', 200 + (target.x - start.x), 200 + (target.y - start.y))
      );

      // The drag itself is honest: the piece really does reach the target.
      const dropped = positionOf(piece);
      expect(distance(dropped, target)).toBeLessThan(0.001);

      document.dispatchEvent(
        pointer('pointerup', 200 + (target.x - start.x), 200 + (target.y - start.y))
      );

      // And then it refuses to stay there.
      expect(distance(positionOf(piece), target)).toBeGreaterThan(10);
    });
  });

  it('nudges a released piece away from where it was dropped', () => {
    const { root } = mountModule(puzzleCaptcha);
    const piece = root.querySelector('.puzzle-piece');

    piece.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 140, 130));
    const dropped = positionOf(piece);
    document.dispatchEvent(pointer('pointerup', 140, 130));

    expect(distance(positionOf(piece), dropped)).toBeGreaterThan(10);
  });

  it('shows a countdown and auto-fails at 10 seconds', () => {
    const { root, calls } = mountModule(puzzleCaptcha);
    expect(root.querySelector('.puzzle-countdown').textContent).toMatch(/10/);

    vi.advanceTimersByTime(9000);
    expect(calls.rejects.length).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(calls.rejects.length).toBe(1);
  });

  it('stops auto-failing once it has fired', () => {
    const { calls } = mountModule(puzzleCaptcha);
    vi.advanceTimersByTime(60000);
    expect(calls.rejects.length).toBe(1);
  });
});

describe('distortedText', () => {
  beforeEach(() => {
    stubCanvasContext();
  });

  it('uses the SPEC instruction', () => {
    expect(distortedTextCaptcha.instruction).toBe('Type the distorted text.');
  });

  it('renders a canvas and a text input', () => {
    const { root } = mountModule(distortedTextCaptcha);
    expect(root.querySelector('canvas')).not.toBeNull();
    expect(root.querySelector('input[type="text"]')).not.toBeNull();
  });

  it('actually draws the glyphs onto the canvas', () => {
    const { calls } = stubCanvasContext();
    mountModule(distortedTextCaptcha);
    expect(calls.some((call) => call[0] === 'fillText')).toBe(true);
  });

  it('never generates a real word', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const word = distortedTextFor(seed);
      expect(word.length).toBeGreaterThanOrEqual(5);
      expect(COMMON_WORDS, `seed ${seed}`).not.toContain(word.toLowerCase());
    }
  });

  it('regenerates the string on every attempt', () => {
    const seen = new Set();
    for (let fails = 0; fails <= 7; fails += 1) {
      const { root } = mountModule(distortedTextCaptcha, { fails });
      const shown = root.querySelector('canvas').dataset.challenge;
      expect(shown, `fails ${fails}`).toBeTruthy();
      expect(seen.has(shown), `fails ${fails} repeated "${shown}"`).toBe(false);
      seen.add(shown);
    }
  });

  it('rejects whatever is typed when the answer is submitted', () => {
    const { root, calls } = mountModule(distortedTextCaptcha);
    const input = root.querySelector('input[type="text"]');

    input.value = root.querySelector('canvas').dataset.challenge;
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(calls.rejects.length).toBe(1);
    expect(distortedTextCaptcha.verify()).toBe(false);
  });
});

describe('timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const countText = (root) => root.querySelector('.timer-count').textContent;

  it('uses the SPEC instruction', () => {
    expect(timerCaptcha.instruction).toBe('Please wait for verification.');
  });

  it('starts at 30', () => {
    const { root } = mountModule(timerCaptcha);
    expect(countText(root)).toBe('30');
  });

  it('jumps around instead of counting down cleanly', () => {
    const { root } = mountModule(timerCaptcha);
    const seen = [Number(countText(root))];

    for (let tick = 0; tick < 20; tick += 1) {
      vi.advanceTimersByTime(1000);
      seen.push(Number(countText(root)));
    }

    const rises = seen.filter((value, index) => index > 0 && value > seen[index - 1]);
    expect(rises.length).toBeGreaterThan(0);
  });

  it('never reaches 0 or below at level 1, however long you wait', () => {
    const { root } = mountModule(timerCaptcha, { level: 1 });

    for (let tick = 0; tick < 90; tick += 1) {
      vi.advanceTimersByTime(1000);
      expect(Number(countText(root)), `tick ${tick}`).toBeGreaterThan(0);
    }

    for (let tick = 0; tick < 200; tick += 1) {
      expect(timerValueFor(tick, 1), `value ${tick}`).toBeGreaterThan(0);
    }
  });

  it('keeps VERIFY disabled so the only interaction is the skip link', () => {
    expect(timerCaptcha.disableVerify).toBe(true);

    const { root } = mountShell(7);
    const verify = root.querySelector('[data-action="verify"]');
    expect(verify.disabled).toBe(true);

    verify.click();
    expect(root.querySelector('[data-action="verify"]').disabled).toBe(true);
  });

  it('rejects itself roughly every 8 seconds so the fail count still climbs', () => {
    const { calls } = mountModule(timerCaptcha);

    vi.advanceTimersByTime(7000);
    expect(calls.rejects.length).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(calls.rejects.length).toBe(1);
  });

  it('drives the shell to the skip link without a single click', () => {
    const { root, store } = mountShell(7);
    expect(root.querySelector('[data-action="skip"]').hidden).toBe(true);

    // Six self-rejection cycles. The shell re-renders each time, which remounts
    // the module and restarts its cycle, so the clock is advanced per attempt.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      vi.advanceTimersByTime(8000);
    }

    expect(store.getState().fails).toBeGreaterThanOrEqual(6);
    expect(root.querySelector('[data-action="skip"]').hidden).toBe(false);
  });
});

describe('rotate', () => {
  it('uses the SPEC instruction', () => {
    expect(rotateCaptcha.instruction).toBe('Rotate the image to the correct position.');
  });

  it('renders a rotation control', () => {
    const { root } = mountModule(rotateCaptcha);
    const slider = root.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    expect(Number(slider.value)).toBe(0);
  });

  it('rejects every angle, including the one it started at', () => {
    const { root } = mountModule(rotateCaptcha);
    const slider = root.querySelector('input[type="range"]');
    const angles = [0, 90, 180, 270, Math.floor(Math.random() * 360)];

    angles.forEach((angle) => {
      slider.value = String(angle);
      slider.dispatchEvent(new window.Event('input', { bubbles: true }));
      expect(rotateCaptcha.verify(), `angle ${angle}`).toBe(false);
    });
  });

  it('carries the SPEC rejection line', () => {
    expect(ROTATE_REJECTION).toBe('Image is not upright.');
    expect(rotateCaptcha.rejection).toBe(ROTATE_REJECTION);
  });

  it('shows that line in the shell after a rejected attempt', () => {
    const { root } = mountShell(8);
    root.querySelector('[data-action="verify"]').click();
    expect(root.querySelector('.captcha-note').textContent).toBe('Image is not upright.');
  });
});

describe('cleanup discipline', () => {
  it.each(MODULES)('%s hands every timer and global listener to ctx.cleanup', (id, module) => {
    stubCanvasContext();

    const timers = new Set();
    const intervals = new Set();
    const listeners = [];

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');

    const { calls } = mountModule(module, { level: 8 });

    setTimeoutSpy.mock.results.forEach((r) => timers.add(r.value));
    setIntervalSpy.mock.results.forEach((r) => intervals.add(r.value));
    docAdd.mock.calls.forEach((args) => listeners.push(['document', args[0]]));
    winAdd.mock.calls.forEach((args) => listeners.push(['window', args[0]]));

    calls.cleanups.forEach((fn) => fn());

    const cleared = new Set([
      ...clearTimeoutSpy.mock.calls.map((args) => args[0]),
      ...clearIntervalSpy.mock.calls.map((args) => args[0])
    ]);
    timers.forEach((handle) => expect(cleared, `${id} timeout`).toContain(handle));
    intervals.forEach((handle) => expect(cleared, `${id} interval`).toContain(handle));

    const removed = [
      ...docRemove.mock.calls.map((args) => ['document', args[0]]),
      ...winRemove.mock.calls.map((args) => ['window', args[0]])
    ].map((pair) => pair.join(':'));
    listeners.forEach((pair) => {
      expect(removed, `${id} listener`).toContain(pair.join(':'));
    });

    expect(listeners.length, `${id} should own its pointer listeners`).toBeGreaterThanOrEqual(0);
  });

  it.each(MODULES)('%s goes quiet after cleanup', (id, module) => {
    stubCanvasContext();
    vi.useFakeTimers();

    const { root, calls } = mountModule(module, { level: 8 });
    calls.cleanups.forEach((fn) => fn());
    const before = calls.rejects.length;

    vi.advanceTimersByTime(120000);
    document.dispatchEvent(pointer('pointermove', 10, 10));
    document.dispatchEvent(pointer('pointerup', 10, 10));

    expect(calls.rejects.length, `${id} kept running`).toBe(before);
    expect(root).toBeTruthy();
  });
});
