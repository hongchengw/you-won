import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LEVEL_FLAGS,
  MOTION_FLAGS,
  flagsFor,
  applyChaos
} from '../src/scripts/chaos.js';
import { MAX_LEVEL } from '../src/scripts/state.js';
import { repoPath } from './helpers/paths.js';

// SPEC.md section 4, transcribed straight from the table. If this and
// LEVEL_FLAGS ever disagree, the spec wins and the code is a bug.
const SPEC_TABLE = {
  1: [],
  2: ['mascot', 'tilt', 'saturate'],
  3: ['comicSans', 'eyeDrift', 'cursorTrail'],
  4: ['shake', 'neon', 'mascotSnark'],
  5: ['backwards', 'popups', 'hypercolor'],
  6: ['glitch', 'dodge', 'mascotInvert'],
  7: ['strobe', 'invert', 'spin'],
  8: ['overdrive', 'trails', 'mascotCorrupt']
};

const bodyFlags = () =>
  [...document.body.classList]
    .filter((name) => name.startsWith('fx-'))
    .map((name) => name.slice(3))
    .sort();

const levels = () => Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('flagsFor', () => {
  it('is empty at level 1: loop 1 is pristine', () => {
    expect(flagsFor(1)).toEqual([]);
  });

  it('matches the SPEC section 4 table for each level own flags', () => {
    for (const level of levels()) {
      expect(LEVEL_FLAGS[level], `level ${level}`).toEqual(SPEC_TABLE[level]);
    }
  });

  it('is cumulative: every flag from a lower level survives', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      const previous = flagsFor(level - 1);
      const current = flagsFor(level);
      for (const flag of previous) {
        expect(current, `level ${level} lost ${flag}`).toContain(flag);
      }
      for (const flag of SPEC_TABLE[level]) {
        expect(current, `level ${level} missing ${flag}`).toContain(flag);
      }
      expect(current.length).toBe(previous.length + SPEC_TABLE[level].length);
    }
  });

  it('returns every flag in the table at level 8', () => {
    const all = Object.values(SPEC_TABLE).flat();
    expect(flagsFor(MAX_LEVEL).sort()).toEqual([...all].sort());
  });

  it('clamps out-of-range levels instead of throwing', () => {
    expect(flagsFor(0)).toEqual([]);
    expect(flagsFor(99)).toEqual(flagsFor(MAX_LEVEL));
  });

  it('is pure: the returned array can be mutated without effect', () => {
    const first = flagsFor(4);
    first.push('nonsense');
    expect(flagsFor(4)).not.toContain('nonsense');
  });
});

describe('MOTION_FLAGS', () => {
  it('lists exactly the flags SPEC section 4 withholds under reduced motion', () => {
    expect([...MOTION_FLAGS].sort()).toEqual(
      ['shake', 'spin', 'strobe', 'invert', 'dodge', 'cursorTrail', 'trails', 'overdrive'].sort()
    );
  });

  it('only names flags that actually exist in the table', () => {
    const all = Object.values(SPEC_TABLE).flat();
    for (const flag of MOTION_FLAGS) expect(all).toContain(flag);
  });
});

describe('applyChaos', () => {
  beforeEach(() => {
    document.body.className = '';
    delete document.body.dataset.chaos;
  });

  afterEach(() => {
    applyChaos(document, 1, { reducedMotion: false });
  });

  it('sets body.dataset.chaos to the level', () => {
    for (const level of levels()) {
      applyChaos(document, level, { reducedMotion: false });
      expect(document.body.dataset.chaos).toBe(String(level));
    }
  });

  it('adds one fx- class per active flag', () => {
    for (const level of levels()) {
      applyChaos(document, level, { reducedMotion: false });
      expect(bodyFlags()).toEqual([...flagsFor(level)].sort());
    }
  });

  it('removes flags that are no longer active when the level drops', () => {
    applyChaos(document, 8, { reducedMotion: false });
    applyChaos(document, 3, { reducedMotion: false });
    expect(bodyFlags()).toEqual([...flagsFor(3)].sort());
    expect(document.body.classList.contains('fx-glitch')).toBe(false);
    expect(document.body.classList.contains('fx-overdrive')).toBe(false);
  });

  it('leaves unrelated classes on the body alone', () => {
    document.body.classList.add('not-a-flag');
    applyChaos(document, 5, { reducedMotion: false });
    applyChaos(document, 1, { reducedMotion: false });
    expect(document.body.classList.contains('not-a-flag')).toBe(true);
  });

  it('returns the applied flags', () => {
    expect(applyChaos(document, 2, { reducedMotion: false })).toEqual(flagsFor(2));
  });

  it('leaves the body completely clean at level 1 after level 8', () => {
    applyChaos(document, 8, { reducedMotion: false });
    applyChaos(document, 1, { reducedMotion: false });
    expect(bodyFlags()).toEqual([]);
    expect(document.body.dataset.chaos).toBe('1');
    expect(document.querySelectorAll('.fx-popup').length).toBe(0);
    expect(document.querySelectorAll('.fx-trail-layer').length).toBe(0);
    expect(document.querySelectorAll('.fx-glitch-overlay').length).toBe(0);
    expect(document.querySelectorAll('.fx-strobe-overlay').length).toBe(0);
  });
});

describe('applyChaos under reduced motion', () => {
  beforeEach(() => {
    document.body.className = '';
    delete document.body.dataset.chaos;
  });

  afterEach(() => {
    applyChaos(document, 1, { reducedMotion: false });
  });

  it('withholds every motion flag at every level', () => {
    for (const level of levels()) {
      applyChaos(document, level, { reducedMotion: true });
      for (const flag of MOTION_FLAGS) {
        expect(bodyFlags(), `level ${level} applied ${flag}`).not.toContain(flag);
      }
    }
  });

  it('still applies the joke: typography, colour, backwards, popups, glitch', () => {
    applyChaos(document, 8, { reducedMotion: true });
    for (const flag of ['comicSans', 'saturate', 'neon', 'hypercolor', 'backwards', 'popups', 'glitch', 'tilt']) {
      expect(bodyFlags(), `missing ${flag}`).toContain(flag);
    }
  });

  it('still degrades the mascot', () => {
    applyChaos(document, 8, { reducedMotion: true });
    for (const flag of ['mascot', 'eyeDrift', 'mascotSnark', 'mascotInvert', 'mascotCorrupt']) {
      expect(bodyFlags(), `missing ${flag}`).toContain(flag);
    }
  });

  it('applies exactly the non-motion subset', () => {
    for (const level of levels()) {
      applyChaos(document, level, { reducedMotion: true });
      const expected = flagsFor(level).filter((flag) => !MOTION_FLAGS.includes(flag));
      expect(bodyFlags()).toEqual([...expected].sort());
    }
  });
});

describe('chaos side effects clean up after themselves', () => {
  beforeEach(() => {
    document.body.className = '';
    delete document.body.dataset.chaos;
  });

  afterEach(() => {
    applyChaos(document, 1, { reducedMotion: false });
  });

  it('adds the glitch and strobe overlays only with their flags', () => {
    applyChaos(document, 6, { reducedMotion: false });
    expect(document.querySelector('.fx-glitch-overlay')).not.toBeNull();
    expect(document.querySelector('.fx-strobe-overlay')).toBeNull();

    applyChaos(document, 7, { reducedMotion: false });
    expect(document.querySelector('.fx-strobe-overlay')).not.toBeNull();

    applyChaos(document, 7, { reducedMotion: true });
    expect(document.querySelector('.fx-strobe-overlay')).toBeNull();
    expect(document.querySelector('.fx-glitch-overlay')).not.toBeNull();
  });

  it('spawns a trail layer only while a trail flag is active', () => {
    applyChaos(document, 3, { reducedMotion: false });
    expect(document.querySelector('.fx-trail-layer')).not.toBeNull();

    applyChaos(document, 2, { reducedMotion: false });
    expect(document.querySelector('.fx-trail-layer')).toBeNull();
  });

  it('stops trailing once the flag is gone: no leaked pointer listener', () => {
    applyChaos(document, 3, { reducedMotion: false });
    document.dispatchEvent(new Event('pointermove'));
    applyChaos(document, 1, { reducedMotion: false });
    document.dispatchEvent(new Event('pointermove'));
    expect(document.querySelectorAll('.fx-trail-dot').length).toBe(0);
  });

  it('never spawns a trail layer under reduced motion', () => {
    applyChaos(document, 8, { reducedMotion: true });
    expect(document.querySelector('.fx-trail-layer')).toBeNull();
  });

  it('spawns dismissible popups only while the popups flag is active', () => {
    applyChaos(document, 5, { reducedMotion: false });
    const layer = document.querySelector('.fx-popup-layer');
    expect(layer).not.toBeNull();
    expect(layer.querySelectorAll('.fx-popup').length).toBeGreaterThan(0);

    const popup = layer.querySelector('.fx-popup');
    popup.querySelector('[data-action="dismiss-popup"]').click();
    expect(popup.isConnected).toBe(false);

    applyChaos(document, 4, { reducedMotion: false });
    expect(document.querySelector('.fx-popup-layer')).toBeNull();
    expect(document.querySelectorAll('.fx-popup').length).toBe(0);
  });

  it('keeps popups under reduced motion, since they are not a motion flag', () => {
    applyChaos(document, 5, { reducedMotion: true });
    expect(document.querySelector('.fx-popup-layer')).not.toBeNull();
  });

  it('leaves no timers or listeners behind after returning to level 1', () => {
    applyChaos(document, 8, { reducedMotion: false });
    applyChaos(document, 1, { reducedMotion: false });
    document.dispatchEvent(new Event('pointermove'));
    expect(document.querySelector('.fx-trail-layer')).toBeNull();
    expect(document.querySelector('.fx-popup-layer')).toBeNull();
  });
});

describe('fx-dodge lets the click through after dodging once', () => {
  let button;

  beforeEach(() => {
    document.body.className = '';
    delete document.body.dataset.chaos;
    button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'skip verification';
    document.body.append(button);
  });

  afterEach(() => {
    applyChaos(document, 1, { reducedMotion: false });
    button.remove();
  });

  it('moves an interactive element the first time the pointer reaches it', () => {
    applyChaos(document, 6, { reducedMotion: false });
    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(button.classList.contains('fx-dodged')).toBe(true);
  });

  it('does not dodge a second time, so the click always lands', () => {
    applyChaos(document, 6, { reducedMotion: false });
    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    const first = button.style.getPropertyValue('--fx-dodge-x');

    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(button.style.getPropertyValue('--fx-dodge-x')).toBe(first);
  });

  it('still fires the click handler after dodging', () => {
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks += 1;
    });

    applyChaos(document, 6, { reducedMotion: false });
    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    button.click();
    expect(clicks).toBe(1);
  });

  it('clears the dodge marks when the flag goes away', () => {
    applyChaos(document, 6, { reducedMotion: false });
    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    applyChaos(document, 1, { reducedMotion: false });
    expect(button.classList.contains('fx-dodged')).toBe(false);

    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(button.classList.contains('fx-dodged')).toBe(false);
  });

  it('never dodges under reduced motion', () => {
    applyChaos(document, 8, { reducedMotion: true });
    button.dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(button.classList.contains('fx-dodged')).toBe(false);
  });
});

describe('chaos.css', () => {
  const css = readFileSync(repoPath('src', 'styles', 'chaos.css'), 'utf8');

  it('defines a block for every flag in the table', () => {
    for (const flag of Object.values(SPEC_TABLE).flat()) {
      expect(css, `no rules for ${flag}`).toContain(`.fx-${flag}`);
    }
  });

  it('keeps every decorative overlay out of the way of the pointer', () => {
    const overlays = [
      '.fx-trail-layer',
      '.fx-trail-dot',
      '.fx-popup-layer',
      '.fx-glitch-overlay',
      '.fx-strobe-overlay'
    ];
    for (const selector of overlays) {
      const block = css.slice(css.indexOf(selector));
      const rule = block.slice(0, block.indexOf('}'));
      expect(rule, `${selector} must not eat pointer events`).toContain('pointer-events: none');
    }
  });

  it('never hides the skip link or the interactive controls', () => {
    expect(css).not.toMatch(/\.skip-link[^{]*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/button[^{]*\{[^}]*pointer-events:\s*none/);
  });
});
