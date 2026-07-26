import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fireCaptcha from '../src/scripts/captchas/fire.js';
import imagesCaptcha from '../src/scripts/captchas/images.js';
import mathCaptcha from '../src/scripts/captchas/math.js';
import robotCaptcha from '../src/scripts/captchas/robot.js';
import { CAPTCHA_MODULES } from '../src/scripts/captchas/index.js';

// SPEC.md section 6, rows 1-4. Every one of these is unwinnable, and the tests
// exist to keep it that way: there is no success path to regress into.

const MODULES = [
  ['fire', fireCaptcha],
  ['images', imagesCaptcha],
  ['math', mathCaptcha],
  ['robot', robotCaptcha]
];

// SPEC section 6 row 1, verbatim. Variation selectors included.
const FIRE_EMOJI = ['\u{1F525}', '\u{1F4A7}', '\u{1F9CA}', '\u{1F30A}', '❄️', '\u{1F56F}️'];
const FIRE = '\u{1F525}';

// SPEC section 6 row 4, verbatim.
const ROBOT_SUBJECTS = ['\u{1F9D1}', '\u{1F333}', '\u{1F697}', '\u{1F355}', '\u{1F415}'];
const ROBOT = '\u{1F916}';

const MATH_OPTIONS = ['purple', 'Thursday', 'sadness', '22'];

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
  return { root, ctx, calls };
}

const choices = (root) => [...root.querySelectorAll('button')];

const labels = (root) => choices(root).map((node) => node.textContent.trim());

describe('captcha modules 1-4: contract', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

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

  it.each(MODULES)('%s: verify() is false with no selection', (id, module) => {
    mountModule(module);
    expect(module.verify()).toBe(false);
  });

  it.each(MODULES)('%s: verify() is false with one selection', (id, module) => {
    const { root } = mountModule(module);
    choices(root)[0].click();
    expect(module.verify()).toBe(false);
  });

  it.each(MODULES)('%s: verify() is false with every choice selected', (id, module) => {
    const { root } = mountModule(module);
    choices(root).forEach((node) => node.click());
    expect(module.verify()).toBe(false);
  });

  it.each(MODULES)('%s: verify() is false for every single choice on its own', (id, module) => {
    const count = choices(mountModule(module).root).length;
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const { root } = mountModule(module);
      choices(root)[index].click();
      expect(module.verify(), `${id} choice ${index}`).toBe(false);
    }
  });
});

describe('fire', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('uses the SPEC instruction', () => {
    expect(fireCaptcha.instruction).toBe('Click all the fire emojis.');
  });

  it('renders a 5x5 grid of exactly 25 tiles', () => {
    const { root } = mountModule(fireCaptcha);
    expect(root.querySelectorAll('.fire-tile').length).toBe(25);
  });

  it('draws every tile from the six SPEC emoji', () => {
    const { root } = mountModule(fireCaptcha);
    labels(root).forEach((label) => {
      expect(FIRE_EMOJI, label).toContain(label);
    });
  });

  it('always contains fire, so it looks solvable', () => {
    for (let level = 1; level <= 8; level += 1) {
      const { root } = mountModule(fireCaptcha, { level });
      const fires = labels(root).filter((label) => label === FIRE).length;
      expect(fires, `level ${level}`).toBeGreaterThan(0);
    }
  });

  // SPEC section 6 row 1: from level 5 the tiles run away from the pointer.
  // The swap is gated on `fx-shake`, a MOTION_FLAG, so reduced motion keeps a
  // static grid.
  const hoverEveryTile = (root) => {
    root.querySelectorAll('.fire-tile').forEach((tile) => {
      tile.dispatchEvent(new window.MouseEvent('mouseenter'));
    });
    return labels(root).join('');
  };

  it('swaps tiles on hover from level 5 when the motion flag is live', () => {
    document.body.classList.add('fx-shake');
    const { root } = mountModule(fireCaptcha, { level: 5 });
    const before = labels(root).join('');
    expect(hoverEveryTile(root)).not.toBe(before);
    document.body.classList.remove('fx-shake');
  });

  it('holds still at level 5 when the motion flag is withheld', () => {
    const { root } = mountModule(fireCaptcha, { level: 5 });
    const before = labels(root).join('');
    expect(hoverEveryTile(root)).toBe(before);
  });

  it('holds still below level 5', () => {
    document.body.classList.add('fx-shake');
    const { root } = mountModule(fireCaptcha, { level: 4 });
    const before = labels(root).join('');
    expect(hoverEveryTile(root)).toBe(before);
    document.body.classList.remove('fx-shake');
  });

  it('toggles a selected class when a tile is clicked', () => {
    const { root } = mountModule(fireCaptcha);
    const tile = root.querySelector('.fire-tile');
    expect(tile.classList.contains('fire-tile-selected')).toBe(false);
    tile.click();
    expect(tile.classList.contains('fire-tile-selected')).toBe(true);
    tile.click();
    expect(tile.classList.contains('fire-tile-selected')).toBe(false);
  });
});

describe('images', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('uses the SPEC instruction', () => {
    expect(imagesCaptcha.instruction).toBe('Select all images containing a car.');
  });

  it('renders 9 tiles', () => {
    const { root } = mountModule(imagesCaptcha);
    expect(root.querySelectorAll('.blob-tile').length).toBe(9);
  });

  it('gives every tile the blur treatment class', () => {
    const { root } = mountModule(imagesCaptcha);
    root.querySelectorAll('.blob-tile').forEach((tile) => {
      expect(tile.classList.contains('blob-blurred')).toBe(true);
    });
  });

  it('never labels a tile as a car', () => {
    const { root } = mountModule(imagesCaptcha);
    expect(root.innerHTML).not.toMatch(/car/i);
  });
});

describe('math', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('uses the SPEC instruction', () => {
    expect(mathCaptcha.instruction).toBe("Prove you're human: solve this.");
  });

  it('renders the 2 + 2 = prompt', () => {
    const { root } = mountModule(mathCaptcha);
    expect(root.textContent).toContain('2 + 2 =');
  });

  it('offers exactly the four SPEC options', () => {
    const { root } = mountModule(mathCaptcha);
    expect([...labels(root)].sort()).toEqual([...MATH_OPTIONS].sort());
  });

  it('rejects after an option is selected and verified', () => {
    const { root, calls } = mountModule(mathCaptcha);
    choices(root)[0].click();
    expect(mathCaptcha.verify()).toBe(false);
    expect(calls.rejects.length).toBe(0);
  });

  it('reshuffles the options after each attempt', () => {
    let previous = null;
    for (let fails = 0; fails <= 6; fails += 1) {
      const { root } = mountModule(mathCaptcha, { fails });
      const order = labels(root).join('|');
      if (previous !== null) expect(order, `fails ${fails}`).not.toBe(previous);
      previous = order;
    }
  });
});

describe('robot', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('uses the SPEC instruction', () => {
    expect(robotCaptcha.instruction).toBe('Which one is the robot?');
  });

  it('renders 9 tiles', () => {
    const { root } = mountModule(robotCaptcha);
    expect(root.querySelectorAll('.blob-tile').length).toBe(9);
  });

  it('draws every subject from the five SPEC emoji', () => {
    const { root } = mountModule(robotCaptcha);
    const subjects = [...root.querySelectorAll('.blob-subject')];
    expect(subjects.length).toBe(9);
    subjects.forEach((node) => {
      expect(ROBOT_SUBJECTS, node.textContent).toContain(node.textContent.trim());
    });
  });

  it('contains no robot anywhere in the DOM', () => {
    for (let level = 1; level <= 8; level += 1) {
      const { root } = mountModule(robotCaptcha, { level });
      expect(root.innerHTML, `level ${level}`).not.toContain(ROBOT);
    }
  });
});

describe('cleanup discipline', () => {
  const spies = [];

  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    spies.length = 0;
    vi.useRealTimers();
  });

  it.each(MODULES)('%s hands every timer and global listener to ctx.cleanup', (id, module) => {
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
    spies.push(
      setTimeoutSpy, clearTimeoutSpy, setIntervalSpy, clearIntervalSpy,
      docAdd, docRemove, winAdd, winRemove
    );

    const { calls } = mountModule(module, { level: 8 });

    setTimeoutSpy.mock.results.forEach((r) => timers.add(r.value));
    setIntervalSpy.mock.results.forEach((r) => intervals.add(r.value));
    docAdd.mock.calls.forEach((args) => listeners.push(['document', args[0]]));
    winAdd.mock.calls.forEach((args) => listeners.push(['window', args[0]]));

    // Whatever the module started, running its registered teardown must stop.
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
  });
});
