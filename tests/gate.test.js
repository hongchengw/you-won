import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderGate, GATE_BEATS, GATE_TIMING } from '../src/scripts/screens/gate.js';
import { createRouter } from '../src/scripts/main.js';
import { createStore } from '../src/scripts/store.js';
import { createState, skip, MAX_LEVEL } from '../src/scripts/state.js';
import { repoPath } from './helpers/paths.js';

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
  const padSeconds = [];
  return {
    order,
    padSeconds,
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
    startMusic() {
      order.push('startMusic');
    },
    holyPad(seconds) {
      order.push('holyPad');
      padSeconds.push(seconds);
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

  it('holds the whole scene up to the last millisecond before the cut', () => {
    const { root, store } = mountScene();

    vi.advanceTimersByTime(GATE_TIMING.cut - 1);

    expect(root.querySelector('.screen-gate')).toBeTruthy();
    expect(store.getState().screen).toBe('gate');
    expect(document.body.classList.contains('gate-scene')).toBe(true);
    expect(beatsOn(root)).toEqual(SPEC_BEATS);

    vi.advanceTimersByTime(1);

    expect(root.querySelector('.screen-gate')).toBeNull();
    expect(store.getState().screen).toBe('won');
  });

  it('hands the melody back on the way out', () => {
    const { store, audio } = mountScene();
    // Puts the reset itself in the same sequence, so the restart can be placed
    // against it rather than merely counted.
    store.subscribe((state) => {
      if (state.screen === 'won' && state.level === 1) audio.order.push('reset');
    });

    vi.advanceTimersByTime(GATE_TIMING.cut - 1);
    expect(audio.order).toEqual(['stopMusic', 'holyPad']);

    vi.advanceTimersByTime(1);

    // The whole arc of the scene's audio: chaos music out, chord in, then loop
    // 1's sweet in-tune melody back with everything else the reset brings.
    expect(audio.order).toEqual(['stopMusic', 'holyPad', 'reset', 'startMusic']);
    expect(store.getState()).toMatchObject({ screen: 'won', level: 1 });
  });

  it('gives the last line about six seconds to land', () => {
    expect(GATE_TIMING.cut - GATE_TIMING.beats.at(-1)).toBeGreaterThanOrEqual(6000);
  });

  it('asks the audio for a chord that lasts until the cut', () => {
    const { audio } = mountScene();

    vi.advanceTimersByTime(GATE_TIMING.pad);

    expect(audio.padSeconds).toEqual([(GATE_TIMING.cut - GATE_TIMING.pad) / 1000]);
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

// The scene is a timeline split across two files: gate.js decides when, gate.css
// decides what. Only the stylesheet source can say whether the doors are still
// travelling at the cut, so these read it the way chaos.test.js and
// mascot.test.js read theirs.
describe('gate.css', () => {
  const css = readFileSync(repoPath('src', 'styles', 'gate.css'), 'utf8');

  // From `.gate-open` landing to the cut. Everything below is measured against it.
  const SCENE_SECONDS = (GATE_TIMING.cut - GATE_TIMING.pad) / 1000;

  // Sum every duration in a declaration, so delay and duration both count and
  // a reordered animation shorthand cannot quietly pass.
  const seconds = (text) =>
    [...text.matchAll(/([\d.]+)s\b/g)].reduce((total, [, value]) => total + Number(value), 0);

  const declaration = (selector, source) => {
    const at = source.indexOf(`${selector} {`);
    expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
    return source.slice(at, source.indexOf('}', at));
  };

  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  it('keeps the doors still parting at the moment of the cut', () => {
    ['left', 'right'].forEach((side) => {
      const rule = declaration(`.gate-open .gate-door-${side}`, css);
      const part = rule.split(',').find((piece) => piece.includes(`gate-part-${side}`));
      expect(part, `no gate-part-${side} animation`).toBeTruthy();
      expect(seconds(part), `gate-part-${side}`).toBeGreaterThan(SCENE_SECONDS);
    });
  });

  it('keeps the glow moving through the whole scene in reduced motion', () => {
    // Nothing may move a pixel here, but a dead frame for most of the scene
    // reads as a crash. Opacity is not what the media query protects against.
    const rule = declaration('.gate-open .gate-light', reduced);
    expect(seconds(rule)).toBeGreaterThanOrEqual(SCENE_SECONDS);
  });
});
