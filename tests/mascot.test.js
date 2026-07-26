import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  mascotStateFor,
  mascotMessage,
  renderMascot,
  MASCOT_MESSAGES
} from '../src/scripts/mascot.js';
import { MAX_LEVEL } from '../src/scripts/state.js';
import { repoPath } from './helpers/paths.js';

// Combining marks (zalgo), block drawing characters, fullwidth Latin, and the
// replacement character. The corrupt pool is built out of these; the sweet pool
// must stay clean enough to be sincerely cute.
const GLITCH = /[̀-ͯ▀-▟！-～�]/;

const MOODS = ['sweet', 'snark', 'broken', 'corrupt'];

const MOOD_BY_LEVEL = {
  2: 'sweet',
  3: 'sweet',
  4: 'snark',
  5: 'snark',
  6: 'broken',
  7: 'broken',
  8: 'corrupt'
};

function mount() {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  return root;
}

describe('mascotStateFor', () => {
  it('is invisible on the pristine first loop', () => {
    expect(mascotStateFor(1)).toEqual({ visible: false });
  });

  it('is visible on every level from 2 to 8', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(mascotStateFor(level).visible, `level ${level}`).toBe(true);
    }
  });

  it('progresses sweet, snark, broken, corrupt', () => {
    for (const [level, mood] of Object.entries(MOOD_BY_LEVEL)) {
      expect(mascotStateFor(Number(level)).mood, `level ${level}`).toBe(mood);
    }
  });

  it('carries the message pool for its own mood', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      const state = mascotStateFor(level);
      expect(state.messages).toEqual(MASCOT_MESSAGES[state.mood]);
    }
  });

  it('is pure and clamps out-of-range levels', () => {
    expect(mascotStateFor(3)).toEqual(mascotStateFor(3));
    expect(mascotStateFor(0)).toEqual({ visible: false });
    expect(mascotStateFor(99).mood).toBe('corrupt');
  });
});

describe('MASCOT_MESSAGES', () => {
  it('gives every mood its own non-empty pool', () => {
    expect(Object.keys(MASCOT_MESSAGES).sort()).toEqual([...MOODS].sort());
    for (const mood of MOODS) {
      expect(Array.isArray(MASCOT_MESSAGES[mood]), mood).toBe(true);
      expect(MASCOT_MESSAGES[mood].length, mood).toBeGreaterThan(2);
      for (const line of MASCOT_MESSAGES[mood]) {
        expect(typeof line).toBe('string');
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('never repeats a line between moods', () => {
    const all = MOODS.flatMap((mood) => MASCOT_MESSAGES[mood]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('corrupts only the corrupt pool', () => {
    for (const line of MASCOT_MESSAGES.corrupt) {
      expect(GLITCH.test(line), `not glitched: ${line}`).toBe(true);
    }
    for (const line of MASCOT_MESSAGES.sweet) {
      expect(GLITCH.test(line), `sweet line is glitched: ${line}`).toBe(false);
    }
  });

  it('writes no em-dashes', () => {
    for (const mood of MOODS) {
      for (const line of MASCOT_MESSAGES[mood]) {
        expect(line.includes('—'), line).toBe(false);
      }
    }
  });
});

describe('mascotMessage', () => {
  it('picks from the pool for the level and wraps around', () => {
    const pool = MASCOT_MESSAGES.snark;
    expect(pool).toContain(mascotMessage(4, 0));
    expect(mascotMessage(4, 0)).toBe(mascotMessage(4, pool.length));
  });

  it('returns an empty string on level 1', () => {
    expect(mascotMessage(1, 0)).toBe('');
  });
});

describe('renderMascot', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders nothing at level 1', () => {
    const root = mount();
    expect(renderMascot(root, 1)).toBeNull();
    expect(document.querySelectorAll('.mascot').length).toBe(0);
  });

  it('renders a mascot from level 2', () => {
    const root = mount();
    const node = renderMascot(root, 2);
    expect(node).not.toBeNull();
    expect(node.classList.contains('mascot')).toBe(true);
    expect(root.querySelectorAll('.mascot').length).toBe(1);
  });

  it('draws the body parts the chaos flags degrade', () => {
    const root = mount();
    const node = renderMascot(root, 2);
    for (const part of [
      '.mascot-body',
      '.mascot-eye-left',
      '.mascot-eye-right',
      '.mascot-mouth',
      '.mascot-blush',
      '.mascot-speech'
    ]) {
      expect(node.querySelector(part), `missing ${part}`).not.toBeNull();
    }
  });

  it('speaks a line from the current mood pool', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      const root = mount();
      const node = renderMascot(root, level);
      const said = node.querySelector('.mascot-speech').textContent;
      expect(MASCOT_MESSAGES[mascotStateFor(level).mood], `level ${level}`).toContain(said);
    }
  });

  it('replaces rather than stacks mascots', () => {
    const root = mount();
    renderMascot(root, 2);
    renderMascot(root, 5);
    renderMascot(root, 8);
    expect(document.querySelectorAll('.mascot').length).toBe(1);
  });

  it('removes the mascot when the level drops back to 1', () => {
    const root = mount();
    renderMascot(root, 8);
    renderMascot(root, 1);
    expect(document.querySelectorAll('.mascot').length).toBe(0);
  });

  it('is decorative: hidden from assistive tech', () => {
    const root = mount();
    const node = renderMascot(root, 2);
    expect(node.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('mascot.css', () => {
  const css = readFileSync(repoPath('src', 'styles', 'mascot.css'), 'utf8');

  it('keeps the mascot out of the way of the pointer', () => {
    const block = css.slice(css.indexOf('.mascot {'));
    const rule = block.slice(0, block.indexOf('}'));
    expect(rule).toContain('pointer-events: none');
  });

  it('never covers a control with an opaque interactive layer', () => {
    expect(css).not.toMatch(/pointer-events:\s*auto/);
  });
});
