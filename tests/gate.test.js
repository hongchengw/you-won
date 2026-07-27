import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderGate, GATE_BEATS, GATE_TIMING } from '../src/scripts/screens/gate.js';
import { createRouter } from '../src/scripts/main.js';
import { createStore } from '../src/scripts/store.js';
import { createState, skip, MAX_LEVEL } from '../src/scripts/state.js';

// SPEC.md section 5.3, verbatim. The scene must not improvise this copy.
const SPEC_BEATS = [
  'VERIFICATION COMPLETE',
  'YOU HAVE BEEN VERIFIED',
  'PLEASE PROCEED TO CLAIM YOUR PRIZE'
];

// Records the order of the two calls the scene owes the audio engine, because
// "chaos music out, then the pad swells in" is the whole gag of the transition.
function stubAudio() {
  const order = [];
  return {
    order,
    start() {},
    setLevel() {},
    setMuted() {},
    isStarted: () => true,
    isMuted: () => false,
    blip() {},
    buzz() {},
    stopMusic() {
      order.push('stopMusic');
    },
    holyPad() {
      order.push('holyPad');
    }
  };
}

// The full app path: router, chaos, mascot and all, parked on the gate at the
// end of loop 8. Anything less would not prove the body comes out clean.
function mountScene(overrides = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);

  const audio = stubAudio();
  const store = createStore({
    ...createState(),
    screen: 'gate',
    level: MAX_LEVEL,
    fails: 7,
    ...overrides
  });

  const unsubscribe = createRouter(root, store, { dispatch: store.dispatch, audio });
  return { root, store, audio, unsubscribe };
}

const beatsOn = (root) => [...root.querySelectorAll('.gate-beat-on')].map((n) => n.textContent);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.className = '';
  delete document.body.dataset.chaos;
  document.body.replaceChildren();
});

describe('reaching the gate', () => {
  it('only opens from skip() at the last level', () => {
    for (let level = 1; level < MAX_LEVEL; level += 1) {
      const next = skip({ ...createState(), screen: 'captcha', level, fails: 6 });
      expect(next.screen, `level ${level} must loop, not open the gate`).toBe('won');
    }

    const last = skip({ ...createState(), screen: 'captcha', level: MAX_LEVEL, fails: 6 });
    expect(last.screen).toBe('gate');
  });
});

describe('the gate scene', () => {
  it('renders the scene layers and the spec text, all hidden at first', () => {
    const root = document.createElement('div');
    const screen = renderGate(root, { ...createState(), screen: 'gate', level: MAX_LEVEL }, {
      dispatch() {},
      audio: stubAudio()
    });

    expect(screen.querySelector('.gate-bloom')).toBeTruthy();
    expect(screen.querySelectorAll('.gate-door').length).toBe(2);
    expect(GATE_BEATS).toEqual(SPEC_BEATS);
    expect([...screen.querySelectorAll('.gate-beat')].map((n) => n.textContent)).toEqual(SPEC_BEATS);
    expect(beatsOn(screen)).toEqual([]);
  });

  it('cuts the chaos music, then swells the holy pad in', () => {
    const { audio } = mountScene();

    expect(audio.order).toEqual(['stopMusic']);

    vi.advanceTimersByTime(GATE_TIMING.pad);
    expect(audio.order).toEqual(['stopMusic', 'holyPad']);
  });

  it('reveals the three text beats in sequence', () => {
    const { root } = mountScene();

    expect(beatsOn(root)).toEqual([]);

    vi.advanceTimersByTime(GATE_TIMING.beats[0]);
    expect(beatsOn(root)).toEqual(SPEC_BEATS.slice(0, 1));

    vi.advanceTimersByTime(GATE_TIMING.beats[1] - GATE_TIMING.beats[0]);
    expect(beatsOn(root)).toEqual(SPEC_BEATS.slice(0, 2));

    vi.advanceTimersByTime(GATE_TIMING.beats[2] - GATE_TIMING.beats[1]);
    expect(beatsOn(root)).toEqual(SPEC_BEATS);
  });

  it('hard cuts back to a pristine loop 1', () => {
    const { root, store } = mountScene();

    vi.advanceTimersByTime(GATE_TIMING.cut);

    expect(store.getState()).toMatchObject({ screen: 'won', level: 1, fails: 0 });
    expect(root.querySelector('.won-card')).toBeTruthy();
    expect(root.querySelector('.screen-gate')).toBeNull();
  });

  it('keeps the mute choice and the live AudioContext across the reset', () => {
    const { store } = mountScene({ muted: true, audioStarted: true });

    vi.advanceTimersByTime(GATE_TIMING.cut);

    expect(store.getState()).toEqual({
      screen: 'won',
      level: 1,
      fails: 0,
      muted: true,
      audioStarted: true
    });
  });

  it('leaves a clean body behind: chaos 1, no fx classes, no mascot', () => {
    mountScene();
    expect(document.body.dataset.chaos).toBe('8');

    vi.advanceTimersByTime(GATE_TIMING.cut);

    expect(document.body.dataset.chaos).toBe('1');
    expect([...document.body.classList].filter((name) => name.startsWith('fx-'))).toEqual([]);
    expect(document.querySelector('.mascot')).toBeNull();
  });

  it('cancels its pending timers when something navigates away mid-scene', () => {
    const { store, audio } = mountScene();

    vi.advanceTimersByTime(GATE_TIMING.pad - 1);
    store.dispatch((state) => ({ ...state, screen: 'won', level: 5 }));

    vi.advanceTimersByTime(GATE_TIMING.cut * 2);

    // reset() would have dragged this back to level 1.
    expect(store.getState()).toMatchObject({ screen: 'won', level: 5 });
    // The pad, the beats and the cut were all still pending. None of them fired.
    expect(audio.order).toEqual(['stopMusic']);
    expect(document.body.classList.contains('gate-scene')).toBe(false);
  });
});
