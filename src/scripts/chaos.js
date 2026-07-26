// Chaos engine. SPEC.md section 4.
// Everything keys off `body[data-chaos]` and one `fx-<flag>` class per active
// flag, so a screen degrades without ever knowing chaos exists.
//
// Hard rule from the spec: at every level, in both motion modes, interactive
// elements stay visible, hit-testable, and clickable. Every decoration added
// here is `pointer-events: none`, and `dodge` moves a control exactly once
// before letting the click through.

import { MAX_LEVEL } from './state.js';

// Each level's own new flags. The union from 1 through L is what actually runs.
export const LEVEL_FLAGS = {
  1: [],
  2: ['mascot', 'tilt', 'saturate'],
  3: ['comicSans', 'eyeDrift', 'cursorTrail'],
  4: ['shake', 'neon', 'mascotSnark'],
  5: ['backwards', 'popups', 'hypercolor'],
  6: ['glitch', 'dodge', 'mascotInvert'],
  7: ['strobe', 'invert', 'spin'],
  8: ['overdrive', 'trails', 'mascotCorrupt']
};

// Withheld when the OS asks for reduced motion. Colour, typography, backwards
// text, popups, the glitch overlay, and the mascot all survive, so the joke
// still lands and the app stays completable.
export const MOTION_FLAGS = [
  'shake', 'spin', 'strobe', 'invert', 'dodge', 'cursorTrail', 'trails', 'overdrive'
];

const ALL_FLAGS = Object.values(LEVEL_FLAGS).flat();

const clampLevel = (level) => Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_LEVEL);

// Cumulative: every flag from level 1 through `level`, in level order.
export function flagsFor(level) {
  const top = clampLevel(level);
  const flags = [];
  for (let step = 1; step <= top; step += 1) flags.push(...LEVEL_FLAGS[step]);
  return flags;
}

function prefersReducedMotion(doc) {
  const view = doc.defaultView;
  if (!view || typeof view.matchMedia !== 'function') return false;
  return view.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// --- Live effects ----------------------------------------------------------
// A flag that needs JS registers a start function returning its own teardown.
// `syncEffects` starts and stops them so nothing outlives its flag: no orphan
// intervals, no orphan listeners, no orphan nodes.

const running = new Map();

function syncEffect(name, active, startEffect) {
  if (active && !running.has(name)) running.set(name, startEffect());
  if (!active && running.has(name)) {
    running.get(name)();
    running.delete(name);
  }
}

// --- Cursor trail ----------------------------------------------------------

const TRAIL_SPARKLES = ['✨', '💖', '⭐', '🌈', '🍬'];
const TRAIL_LIFETIME = 750;

// One sparkle per pointer sample, throttled so a fast flick does not carpet the
// page. At level 8 `fx-trails` thickens it via CSS, read live off the body.
function startTrail(doc) {
  const layer = doc.createElement('div');
  layer.className = 'fx-trail-layer';
  layer.setAttribute('aria-hidden', 'true');
  doc.body.append(layer);

  const timers = new Set();
  let last = 0;
  let index = 0;

  const onMove = (event) => {
    const heavy = doc.body.classList.contains('fx-trails');
    const now = Date.now();
    if (now - last < (heavy ? 16 : 45)) return;
    last = now;

    const dot = doc.createElement('span');
    dot.className = 'fx-trail-dot';
    dot.textContent = TRAIL_SPARKLES[index % TRAIL_SPARKLES.length];
    dot.style.left = `${event.clientX || 0}px`;
    dot.style.top = `${event.clientY || 0}px`;
    dot.style.setProperty('--fx-drift', `${((index * 37) % 40) - 20}px`);
    index += 1;
    layer.append(dot);

    const timer = setTimeout(() => {
      dot.remove();
      timers.delete(timer);
    }, TRAIL_LIFETIME);
    timers.add(timer);
  };

  doc.addEventListener('pointermove', onMove);

  return () => {
    doc.removeEventListener('pointermove', onMove);
    timers.forEach(clearTimeout);
    timers.clear();
    layer.remove();
  };
}

// --- Fake popups -----------------------------------------------------------

const POPUP_ADS = [
  { title: 'CONGRATULATIONS', body: 'You are the 1,000,000th visitor!', cta: 'CLAIM AGAIN' },
  { title: 'SYSTEM NOTICE', body: 'Your prize is 98% verified. Do not close this window.', cta: 'OK' },
  { title: 'HOT SINGLE PRIZES', body: 'Prizes in your area want to meet you.', cta: 'VIEW' },
  { title: 'WARNING', body: 'Suspicious human activity detected on this device.', cta: 'IGNORE' },
  { title: 'FREE DOWNLOAD', body: 'Install PrizeToolbar™ to speed up your winnings.', cta: 'INSTALL' },
  { title: 'ARE YOU THERE?', body: 'The prize is getting impatient.', cta: 'SORRY' }
];

const POPUP_INTERVAL = 4200;
const POPUP_LIMIT = 4;

// The layer itself is pointer-transparent; only the popup cards take clicks,
// so a stack of these can never bury the skip link.
function startPopups(doc) {
  const layer = doc.createElement('div');
  layer.className = 'fx-popup-layer';
  doc.body.append(layer);

  let index = 0;

  const spawn = () => {
    if (layer.children.length >= POPUP_LIMIT) return;
    layer.append(buildPopup(doc, POPUP_ADS[index % POPUP_ADS.length], index));
    index += 1;
  };

  spawn();
  const timer = setInterval(spawn, POPUP_INTERVAL);

  return () => {
    clearInterval(timer);
    layer.remove();
  };
}

function buildPopup(doc, ad, index) {
  const popup = doc.createElement('div');
  popup.className = 'fx-popup';
  // Biased to the left and right margins: the centre of the screen belongs to
  // the card and the skip link, and popups must never park on top of them.
  const side = index % 2 ? 64 : 4;
  popup.style.setProperty('--fx-popup-x', `${side + ((index * 7) % 10)}%`);
  popup.style.setProperty('--fx-popup-y', `${8 + ((index * 23) % 62)}%`);
  popup.style.setProperty('--fx-popup-tilt', `${((index % 5) - 2) * 2.5}deg`);

  const bar = doc.createElement('div');
  bar.className = 'fx-popup-bar';

  const title = doc.createElement('span');
  title.className = 'fx-popup-title';
  title.textContent = ad.title;

  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'fx-popup-close';
  close.dataset.action = 'dismiss-popup';
  close.setAttribute('aria-label', `Dismiss ${ad.title}`);
  close.textContent = '×';
  close.addEventListener('click', () => popup.remove());

  const body = doc.createElement('p');
  body.className = 'fx-popup-body';
  body.textContent = ad.body;

  const cta = doc.createElement('button');
  cta.type = 'button';
  cta.className = 'fx-popup-cta';
  cta.dataset.action = 'dismiss-popup';
  cta.textContent = ad.cta;
  cta.addEventListener('click', () => popup.remove());

  bar.append(title, close);
  popup.append(bar, body, cta);
  return popup;
}

// --- Decorative overlays ---------------------------------------------------

// Pure decoration: styled entirely in chaos.css and always pointer-transparent,
// so nothing here can ever swallow a click.
function startOverlay(doc, className) {
  const node = doc.createElement('div');
  node.className = className;
  node.setAttribute('aria-hidden', 'true');
  doc.body.append(node);
  return () => node.remove();
}

// --- Dodging controls ------------------------------------------------------

const DODGE_TARGETS = 'button, a[href], [data-action], input, select';

// A control jumps aside the first time the pointer reaches it, then gives up.
// The offset is small and stays on screen, so the second approach always wins.
function startDodge(doc) {
  const onOver = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const control = target.closest(DODGE_TARGETS);
    if (!control || control.dataset.fxDodged) return;

    const seed = doc.querySelectorAll('[data-fx-dodged]').length;
    control.dataset.fxDodged = 'true';
    control.style.setProperty('--fx-dodge-x', `${(seed % 2 ? -1 : 1) * 42}px`);
    control.style.setProperty('--fx-dodge-y', `${(seed % 3) * 14 - 14}px`);
    control.classList.add('fx-dodged');
  };

  doc.addEventListener('pointerover', onOver, true);

  return () => {
    doc.removeEventListener('pointerover', onOver, true);
    doc.querySelectorAll('.fx-dodged').forEach((node) => {
      node.classList.remove('fx-dodged');
      node.style.removeProperty('--fx-dodge-x');
      node.style.removeProperty('--fx-dodge-y');
      delete node.dataset.fxDodged;
    });
  };
}

// --- Entry point -----------------------------------------------------------

export function applyChaos(doc, level, options = {}) {
  const target = clampLevel(level);
  const reduced = options.reducedMotion === undefined
    ? prefersReducedMotion(doc)
    : Boolean(options.reducedMotion);

  const active = flagsFor(target).filter((flag) => !(reduced && MOTION_FLAGS.includes(flag)));
  const body = doc.body;

  body.dataset.chaos = String(target);
  ALL_FLAGS.forEach((flag) => body.classList.toggle(`fx-${flag}`, active.includes(flag)));

  syncEffect('trail', active.includes('cursorTrail') || active.includes('trails'), () => startTrail(doc));
  syncEffect('popups', active.includes('popups'), () => startPopups(doc));
  syncEffect('dodge', active.includes('dodge'), () => startDodge(doc));
  syncEffect('glitchOverlay', active.includes('glitch'), () => startOverlay(doc, 'fx-glitch-overlay'));
  syncEffect('strobeOverlay', active.includes('strobe'), () => startOverlay(doc, 'fx-strobe-overlay'));

  return active;
}
