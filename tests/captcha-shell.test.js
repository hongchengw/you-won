import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderCaptcha,
  rejectionFor,
  SKIP_MESSAGE
} from '../src/scripts/screens/captcha.js';
import { runCleanup } from '../src/scripts/cleanup.js';
import { CAPTCHA_MODULES } from '../src/scripts/captchas/index.js';
import { createRouter } from '../src/scripts/main.js';
import { createStore } from '../src/scripts/store.js';
import { createState, CAPTCHA_ORDER, SKIP_THRESHOLD, MAX_LEVEL } from '../src/scripts/state.js';

// SPEC.md section 5.2, verbatim. The shell must not improvise this copy.
const SPEC_REJECTIONS = [
  'Incorrect. Please try again.',
  'Incorrect. Please focus.',
  "Still incorrect. Are you sure you're human?",
  "Hmm. That's not it either.",
  'Are you even trying?',
  'Verification confidence: 0%. This is going badly.'
];

function stubAudio() {
  const calls = { blip: 0, buzz: 0, setLevel: [] };
  return {
    calls,
    start() {},
    setLevel(level) {
      calls.setLevel.push(level);
    },
    setMuted() {},
    isStarted: () => true,
    isMuted: () => false,
    blip() {
      calls.blip += 1;
    },
    buzz() {
      calls.buzz += 1;
    },
    holyPad() {},
    stopMusic() {}
  };
}

// A challenge module standing in for the real eight. It records everything the
// shell hands it, so the contract in SPEC section 6 can be asserted directly.
function stubModule(overrides = {}) {
  const calls = { render: 0, verify: 0, cleanup: 0, contexts: [] };

  const module = {
    id: 'stub',
    title: 'Stub Verification',
    instruction: 'Do the impossible thing.',
    calls,
    render(root, ctx) {
      calls.render += 1;
      calls.contexts.push(ctx);
      ctx.cleanup(() => {
        calls.cleanup += 1;
      });
      const marker = document.createElement('p');
      marker.className = 'stub-body';
      marker.textContent = 'stub body';
      root.append(marker);
    },
    verify() {
      calls.verify += 1;
      return false;
    },
    ...overrides
  };

  return module;
}

function mount(overrides = {}, module = stubModule()) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);

  const store = createStore({ ...createState(), screen: 'captcha', ...overrides });
  const audio = stubAudio();
  const captchas = Object.fromEntries(CAPTCHA_ORDER.map((id) => [id, module]));
  const deps = { dispatch: store.dispatch, audio, captchas };

  store.subscribe((state) => {
    runCleanup();
    if (state.screen === 'captcha') renderCaptcha(root, state, deps);
  });
  renderCaptcha(root, store.getState(), deps);

  return { root, store, audio, deps, module };
}

const verifyButton = (root) => root.querySelector('[data-action="verify"]');
const skipButton = (root) => root.querySelector('[data-action="skip"]');
const errorRegion = (root) => root.querySelector('.captcha-error');

const isHidden = (node) => node === null || node.hidden === true;

describe('rejectionFor', () => {
  it('returns the exact SPEC 5.2 strings for 1 through 6', () => {
    SPEC_REJECTIONS.forEach((message, index) => {
      expect(rejectionFor(index + 1)).toBe(message);
    });
  });

  it('falls back to the attempt form from 7 onwards', () => {
    expect(rejectionFor(7)).toBe('Incorrect. (attempt 7)');
    expect(rejectionFor(8)).toBe('Incorrect. (attempt 8)');
    expect(rejectionFor(42)).toBe('Incorrect. (attempt 42)');
  });

  it('says nothing before the first rejection', () => {
    expect(rejectionFor(0)).toBe('');
  });

  it('is pure', () => {
    expect(rejectionFor(3)).toBe(rejectionFor(3));
  });
});

describe('renderCaptcha', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    runCleanup();
  });

  it('renders the module title, instruction, a VERIFY button and an error region', () => {
    const { root, module } = mount();
    expect(root.textContent).toContain(module.title);
    expect(root.textContent).toContain(module.instruction);
    expect(verifyButton(root)).not.toBeNull();
    expect(verifyButton(root).textContent.toUpperCase()).toContain('VERIFY');
    expect(errorRegion(root)).not.toBeNull();
  });

  it('renders the official security chrome', () => {
    const { root } = mount();
    expect(root.textContent.toUpperCase()).toContain('SECURITY CHECK');
    expect(root.querySelector('.captcha-logo')).not.toBeNull();
    expect(root.querySelector('.captcha-fineprint')).not.toBeNull();
  });

  it('mounts the module body and hands it the SPEC section 6 context', () => {
    const { root, module } = mount({ level: 3, fails: 2 });
    expect(root.querySelector('.stub-body')).not.toBeNull();
    const ctx = module.calls.contexts.at(-1);
    expect(ctx.level).toBe(3);
    expect(ctx.fails).toBe(2);
    expect(typeof ctx.reject).toBe('function');
    expect(typeof ctx.cleanup).toBe('function');
  });

  it('picks the module for the current level', () => {
    const perId = Object.fromEntries(CAPTCHA_ORDER.map((id) => [id, stubModule({ title: id })]));
    const root = document.createElement('div');
    const store = createStore({ ...createState(), screen: 'captcha', level: 5 });
    renderCaptcha(root, store.getState(), {
      dispatch: store.dispatch,
      audio: stubAudio(),
      captchas: perId
    });
    expect(root.textContent).toContain('puzzle');
  });

  it('calls verify() on VERIFY and dispatches fail() because it is false', () => {
    const { root, store, module } = mount();
    verifyButton(root).click();
    expect(module.calls.verify).toBe(1);
    expect(store.getState().fails).toBe(1);
    expect(store.getState().screen).toBe('captcha');
  });

  it('buzzes on every rejection', () => {
    const { root, audio } = mount();
    verifyButton(root).click();
    expect(audio.calls.buzz).toBe(1);
    verifyButton(root).click();
    expect(audio.calls.buzz).toBe(2);
  });

  it('shows the message for the current fail count after each rejection', () => {
    const { root } = mount();
    SPEC_REJECTIONS.forEach((message) => {
      verifyButton(root).click();
      expect(errorRegion(root).textContent).toBe(message);
    });
    verifyButton(root).click();
    expect(errorRegion(root).textContent).toBe('Incorrect. (attempt 7)');
  });

  it('shows no error before the first attempt', () => {
    const { root } = mount();
    expect(errorRegion(root).textContent).toBe('');
  });

  it('hides the skip link while fails is below the threshold', () => {
    for (let fails = 0; fails < SKIP_THRESHOLD; fails += 1) {
      const { root } = mount({ fails });
      expect(isHidden(skipButton(root)), `fails=${fails}`).toBe(true);
    }
  });

  it('reveals the skip link at the threshold and above', () => {
    for (const fails of [SKIP_THRESHOLD, SKIP_THRESHOLD + 1, 20]) {
      const { root } = mount({ fails });
      const link = skipButton(root);
      expect(link, `fails=${fails}`).not.toBeNull();
      expect(link.hidden, `fails=${fails}`).toBe(false);
      expect(link.textContent).toContain('skip verification');
    }
  });

  it('reveals the skip link after six live rejections', () => {
    const { root } = mount();
    for (let attempt = 0; attempt < SKIP_THRESHOLD; attempt += 1) {
      expect(isHidden(skipButton(root))).toBe(true);
      verifyButton(root).click();
    }
    expect(skipButton(root).hidden).toBe(false);
  });

  it('shows the failure notice and then dispatches skip()', () => {
    vi.useFakeTimers();
    try {
      const { root, store } = mount({ fails: SKIP_THRESHOLD, level: 2 });
      skipButton(root).click();
      expect(errorRegion(root).textContent).toBe(SKIP_MESSAGE);
      expect(store.getState().screen).toBe('captcha');

      vi.runAllTimers();
      expect(store.getState().screen).toBe('won');
      expect(store.getState().level).toBe(3);
      expect(store.getState().fails).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the gate when skipping the last level', () => {
    vi.useFakeTimers();
    try {
      const { root, store } = mount({ fails: SKIP_THRESHOLD, level: MAX_LEVEL });
      skipButton(root).click();
      vi.runAllTimers();
      expect(store.getState().screen).toBe('gate');
    } finally {
      vi.useRealTimers();
    }
  });

  it('replaces previous content instead of appending', () => {
    const { root, store, deps } = mount();
    renderCaptcha(root, store.getState(), deps);
    expect(root.querySelectorAll('[data-action="verify"]').length).toBe(1);
  });

  it('renders the persistent mute toggle', () => {
    const { root } = mount();
    expect(root.querySelector('[data-action="mute"]')).not.toBeNull();
  });
});

describe('cleanup registry', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    runCleanup();
  });

  it('runs registered handlers exactly once and forgets them', () => {
    const { module } = mount();
    expect(module.calls.cleanup).toBe(0);
    runCleanup();
    expect(module.calls.cleanup).toBe(1);
    runCleanup();
    expect(module.calls.cleanup).toBe(1);
  });

  it('runs cleanup before the router swaps screens', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);

    const module = stubModule();
    const store = createStore({ ...createState(), screen: 'captcha', fails: SKIP_THRESHOLD });
    const captchas = Object.fromEntries(CAPTCHA_ORDER.map((id) => [id, module]));
    createRouter(root, store, { dispatch: store.dispatch, audio: stubAudio(), captchas });

    expect(module.calls.render).toBe(1);
    expect(module.calls.cleanup).toBe(0);

    store.dispatch((state) => ({ ...state, screen: 'won' }));
    expect(module.calls.cleanup).toBe(1);
  });

  it('does not leak module timers across rejections', () => {
    vi.useFakeTimers();
    try {
      const ticks = { count: 0 };
      const module = stubModule({
        render(root, ctx) {
          this.calls.render += 1;
          this.calls.contexts.push(ctx);
          const timer = setInterval(() => {
            ticks.count += 1;
          }, 100);
          ctx.cleanup(() => clearInterval(timer));
        }
      });

      const { root } = mount({}, module);
      vi.advanceTimersByTime(300);
      expect(ticks.count).toBe(3);

      verifyButton(root).click();
      vi.advanceTimersByTime(300);

      // Six, not nine: the first render's interval was cleared before the
      // rejection re-mounted the module.
      expect(ticks.count).toBe(6);
      expect(module.calls.render).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('captcha registry', () => {
  it('has a module for every id in CAPTCHA_ORDER', () => {
    CAPTCHA_ORDER.forEach((id) => {
      expect(CAPTCHA_MODULES[id], id).toBeTruthy();
      expect(typeof CAPTCHA_MODULES[id].render).toBe('function');
      expect(typeof CAPTCHA_MODULES[id].verify).toBe('function');
    });
  });

  it('never lets anyone pass: verify() is false for all 8', () => {
    CAPTCHA_ORDER.forEach((id) => {
      expect(CAPTCHA_MODULES[id].verify(), id).toBe(false);
    });
  });
});
