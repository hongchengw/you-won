import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAudio, tempoFor, detuneFor } from '../src/scripts/audio.js';
import { createRouter } from '../src/scripts/main.js';
import { createStore } from '../src/scripts/store.js';
import { createState, MAX_LEVEL } from '../src/scripts/state.js';

// --- Fake Web Audio -------------------------------------------------------
// Records everything the engine does so the tests can assert on node config
// without a real AudioContext. SPEC.md section 7 requires the constructor to
// be injectable exactly so this is possible.

function fakeParam(value, log, name) {
  const record = (kind, target, when) => log.push({ node: name, kind, target, when });
  return {
    get value() {
      return value;
    },
    set value(next) {
      value = next;
      record('set', next, null);
    },
    setValueAtTime(target, when) {
      value = target;
      record('setValueAtTime', target, when);
      return this;
    },
    linearRampToValueAtTime(target, when) {
      record('linearRampToValueAtTime', target, when);
      return this;
    },
    exponentialRampToValueAtTime(target, when) {
      record('exponentialRampToValueAtTime', target, when);
      return this;
    },
    setTargetAtTime(target, when) {
      record('setTargetAtTime', target, when);
      return this;
    },
    cancelScheduledValues() {
      return this;
    }
  };
}

function fakeContext(log) {
  const context = {
    currentTime: 0,
    state: 'running',
    closed: false,
    destination: { name: 'destination' },
    resume: () => {
      log.resumes += 1;
    },
    close: () => {
      context.closed = true;
      context.state = 'closed';
    },
    createOscillator() {
      const node = {
        kind: 'oscillator',
        type: 'sine',
        started: false,
        stopped: false,
        frequency: fakeParam(440, log.params, 'frequency'),
        detune: fakeParam(0, log.params, 'detune'),
        connect: () => node,
        disconnect: () => node,
        start: () => {
          node.started = true;
        },
        stop: () => {
          node.stopped = true;
        },
        addEventListener: () => {}
      };
      log.oscillators.push(node);
      return node;
    },
    createGain() {
      const node = {
        kind: 'gain',
        gain: fakeParam(1, log.params, `gain${log.gains.length}`),
        connect: () => node,
        disconnect: () => node
      };
      node.gain.owner = node;
      log.gains.push(node);
      return node;
    },
    createBiquadFilter() {
      const node = {
        kind: 'filter',
        type: 'lowpass',
        frequency: fakeParam(350, log.params, 'filterFrequency'),
        Q: fakeParam(1, log.params, 'filterQ'),
        connect: () => node,
        disconnect: () => node
      };
      log.filters.push(node);
      return node;
    }
  };
  return context;
}

function makeCtor() {
  const log = { contexts: [], oscillators: [], gains: [], filters: [], params: [], resumes: 0 };
  const Ctor = function FakeAudioContext() {
    const context = fakeContext(log);
    log.contexts.push(context);
    return context;
  };
  return { Ctor, log };
}

const setup = () => {
  const { Ctor, log } = makeCtor();
  return { audio: createAudio({ AudioContextCtor: Ctor }), log };
};

// The master gain is the first gain node the engine builds, since everything
// else has to route through it for mute to be honest.
const masterGain = (log) => log.gains[0];

describe('createAudio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not construct an AudioContext until start()', () => {
    const { audio, log } = setup();
    expect(log.contexts.length).toBe(0);
    expect(audio.isStarted()).toBe(false);
  });

  it('constructs exactly one AudioContext, however often start() is called', () => {
    const { audio, log } = setup();
    audio.start();
    expect(log.contexts.length).toBe(1);
    expect(audio.isStarted()).toBe(true);

    audio.start();
    audio.start();
    expect(log.contexts.length).toBe(1);
  });

  it('plays more notes per second as the level climbs', () => {
    const slow = setup();
    slow.audio.start();
    slow.audio.setLevel(1);
    vi.advanceTimersByTime(3000);
    const slowNotes = slow.log.oscillators.length;

    const fast = setup();
    fast.audio.start();
    fast.audio.setLevel(MAX_LEVEL);
    vi.advanceTimersByTime(3000);
    const fastNotes = fast.log.oscillators.length;

    expect(slowNotes).toBeGreaterThan(0);
    expect(fastNotes).toBeGreaterThan(slowNotes);
  });

  it('detunes the melody harder as the level climbs', () => {
    const worst = (log) =>
      Math.max(
        0,
        ...log.params
          .filter((entry) => entry.node === 'detune')
          .map((entry) => Math.abs(entry.target))
      );

    const sweet = setup();
    sweet.audio.start();
    sweet.audio.setLevel(1);
    vi.advanceTimersByTime(3000);

    const sour = setup();
    sour.audio.start();
    sour.audio.setLevel(MAX_LEVEL);
    vi.advanceTimersByTime(3000);

    expect(worst(sour.log)).toBeGreaterThan(worst(sweet.log));
  });

  it('drives the master gain to 0 on mute and restores it on unmute', () => {
    const { audio, log } = setup();
    audio.start();

    const before = masterGain(log).gain.value;
    expect(before).toBeGreaterThan(0);

    audio.setMuted(true);
    vi.advanceTimersByTime(200);
    const muteRamps = log.params.filter((entry) => entry.node === 'gain0');
    expect(muteRamps.at(-1).target).toBe(0);

    audio.setMuted(false);
    vi.advanceTimersByTime(200);
    expect(log.params.filter((entry) => entry.node === 'gain0').at(-1).target).toBe(before);
  });

  it('keeps the master gain at 0 while muted at the worst level', () => {
    const { audio, log } = setup();
    audio.start();
    audio.setMuted(true);
    audio.setLevel(MAX_LEVEL);
    vi.advanceTimersByTime(3000);
    audio.blip();
    audio.buzz();

    expect(log.params.filter((entry) => entry.node === 'gain0').at(-1).target).toBe(0);
  });

  it('reports the last setMuted call from isMuted()', () => {
    const { audio } = setup();
    expect(audio.isMuted()).toBe(false);
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    audio.setMuted(false);
    expect(audio.isMuted()).toBe(false);
  });

  it('treats blip() and buzz() as no-ops before start()', () => {
    const { audio, log } = setup();
    expect(() => {
      audio.blip();
      audio.buzz();
      audio.holyPad();
      audio.stopMusic();
      audio.setLevel(4);
    }).not.toThrow();
    expect(log.contexts.length).toBe(0);
    expect(audio.isStarted()).toBe(false);
  });

  it('gives buzz() a different waveform and frequency band from blip()', () => {
    const { audio, log } = setup();
    audio.start();
    audio.stopMusic();

    log.oscillators.length = 0;
    audio.blip();
    const blip = log.oscillators.at(-1);

    log.oscillators.length = 0;
    audio.buzz();
    const buzz = log.oscillators.at(-1);

    expect(blip.type).toBe('sine');
    expect(buzz.type).toBe('sawtooth');
    expect(buzz.frequency.value).toBeLessThan(blip.frequency.value);
  });

  it('stops the melody before starting the holy pad', () => {
    const { audio, log } = setup();
    audio.start();
    vi.advanceTimersByTime(2000);
    expect(log.oscillators.length).toBeGreaterThan(0);

    log.oscillators.length = 0;
    audio.holyPad();
    const padVoices = log.oscillators.length;
    expect(padVoices).toBeGreaterThanOrEqual(3);
    log.oscillators.forEach((voice) => {
      expect(['sine', 'triangle']).toContain(voice.type);
    });

    vi.advanceTimersByTime(3000);
    expect(log.oscillators.length).toBe(padVoices);
  });

  it('stopMusic() silences the loop but leaves the context alive', () => {
    const { audio, log } = setup();
    audio.start();
    vi.advanceTimersByTime(2000);
    expect(log.oscillators.length).toBeGreaterThan(0);

    audio.stopMusic();
    const settled = log.oscillators.length;
    vi.advanceTimersByTime(5000);

    expect(log.oscillators.length).toBe(settled);
    expect(audio.isStarted()).toBe(true);
    expect(log.contexts[0].closed).toBe(false);
    expect(log.contexts[0].state).toBe('running');
  });
});

describe('tempoFor and detuneFor', () => {
  it('gets monotonically faster from level 1 to 8', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(tempoFor(level)).toBeLessThan(tempoFor(level - 1));
    }
    expect(tempoFor(1)).toBeGreaterThan(0);
  });

  it('gets monotonically more detuned from level 1 to 8', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(detuneFor(level)).toBeGreaterThan(detuneFor(level - 1));
    }
    expect(detuneFor(1)).toBe(0);
  });

  it('clamps out-of-range levels', () => {
    expect(tempoFor(0)).toBe(tempoFor(1));
    expect(tempoFor(99)).toBe(tempoFor(MAX_LEVEL));
    expect(detuneFor(0)).toBe(detuneFor(1));
    expect(detuneFor(99)).toBe(detuneFor(MAX_LEVEL));
  });
});

describe('router audio wiring', () => {
  it('tells the audio engine the current level on every render', () => {
    const levels = [];
    const audio = {
      start() {},
      setLevel: (level) => levels.push(level),
      setMuted() {},
      isStarted: () => false,
      isMuted: () => false,
      blip() {},
      buzz() {},
      holyPad() {},
      stopMusic() {}
    };

    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const store = createStore(createState());
    createRouter(root, store, { dispatch: store.dispatch, audio });

    expect(levels).toEqual([1]);

    store.dispatch((state) => ({ ...state, level: 5 }));
    expect(levels).toEqual([1, 5]);
  });
});
