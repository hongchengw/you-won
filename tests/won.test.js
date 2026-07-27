import { describe, it, expect, beforeEach } from 'vitest';
import { renderWon, prizeFor } from '../src/scripts/screens/won.js';
import { mountMuteToggle } from '../src/scripts/screens/mute.js';
import { createStore } from '../src/scripts/store.js';
import { createState, MAX_LEVEL } from '../src/scripts/state.js';

// A hand-rolled audio stub: the real engine arrives in T05, and the screen only
// ever needs to know whether it has been started and whether it is muted.
function stubAudio() {
  let started = false;
  let muted = false;
  const calls = { start: 0, setMuted: [], blip: 0 };

  return {
    calls,
    start() {
      calls.start += 1;
      started = true;
    },
    setLevel() {},
    setMuted(value) {
      calls.setMuted.push(value);
      muted = Boolean(value);
    },
    isStarted: () => started,
    isMuted: () => muted,
    blip() {
      calls.blip += 1;
    },
    buzz() {},
    holyPad() {},
    stopMusic() {}
  };
}

function mount(overrides = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);

  const store = createStore({ ...createState(), ...overrides });
  const audio = stubAudio();
  const deps = { dispatch: store.dispatch, audio };

  store.subscribe((state) => {
    if (state.screen === 'won') renderWon(root, state, deps);
  });
  renderWon(root, store.getState(), deps);

  return { root, store, audio, deps };
}

const claimButton = (root) => root.querySelector('[data-action="claim"]');
const muteButton = () => document.querySelector('[data-action="mute"]');

describe('renderWon', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders the CONGRATULATIONS / YOU WON headline', () => {
    const { root } = mount();
    const text = root.textContent.toUpperCase();
    expect(text).toContain('CONGRATULATIONS');
    expect(text).toContain('YOU WON');
  });

  it('renders a CLAIM PRIZE button', () => {
    const { root } = mount();
    const button = claimButton(root);
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent.toUpperCase()).toContain('CLAIM PRIZE');
  });

  it('names the prize for the current level', () => {
    const { root } = mount({ level: 3 });
    expect(root.textContent).toContain(prizeFor(3));
  });

  it('moves to the captcha screen when CLAIM is clicked', () => {
    const { root, store } = mount();
    claimButton(root).click();
    expect(store.getState().screen).toBe('captcha');
    expect(store.getState().fails).toBe(0);
  });

  it('starts audio exactly once across repeated claims', () => {
    const { root, store, audio, deps } = mount();
    claimButton(root).click();
    expect(audio.calls.start).toBe(1);
    expect(audio.isStarted()).toBe(true);
    expect(store.getState().audioStarted).toBe(true);

    renderWon(root, { ...createState(), audioStarted: true }, deps);
    claimButton(root).click();
    expect(audio.calls.start).toBe(1);
  });

  it('renders confetti and balloon decoration nodes', () => {
    const { root } = mount();
    expect(root.querySelectorAll('.confetti-piece').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.balloon').length).toBeGreaterThan(0);
  });

  it('sits under a mute toggle that flips muted in state', () => {
    const { root, store, audio, deps } = mount();
    // Persistent chrome, mounted by the router rather than by the screen.
    mountMuteToggle(root, store.getState(), deps);
    store.subscribe((state) => mountMuteToggle(root, state, deps));

    const button = muteButton();
    expect(button).not.toBeNull();
    expect(root.contains(button)).toBe(false);
    expect(store.getState().muted).toBe(false);

    button.click();
    expect(store.getState().muted).toBe(true);
    expect(audio.isMuted()).toBe(true);

    muteButton().click();
    expect(store.getState().muted).toBe(false);
    expect(audio.isMuted()).toBe(false);
  });

  it('replaces previous content instead of appending', () => {
    const { root, store, deps } = mount();
    renderWon(root, store.getState(), deps);
    expect(root.querySelectorAll('[data-action="claim"]').length).toBe(1);
  });
});

describe('prizeFor', () => {
  it('defines a prize for all 8 levels', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(typeof prizeFor(level)).toBe('string');
      expect(prizeFor(level).length).toBeGreaterThan(0);
    }
  });

  it('returns a different prize per level', () => {
    const prizes = [];
    for (let level = 1; level <= MAX_LEVEL; level += 1) prizes.push(prizeFor(level));
    expect(new Set(prizes).size).toBe(MAX_LEVEL);
  });

  it('is pure: the same level always returns the same string', () => {
    expect(prizeFor(1)).toBe(prizeFor(1));
    expect(prizeFor(MAX_LEVEL)).toBe(prizeFor(MAX_LEVEL));
  });

  it('stays in range for out-of-bounds levels', () => {
    expect(typeof prizeFor(0)).toBe('string');
    expect(typeof prizeFor(99)).toBe('string');
  });
});
