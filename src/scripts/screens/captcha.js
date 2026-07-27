// CAPTCHA shell. SPEC.md sections 5.2 and 6.
//
// The frame all eight challenges live in. It draws a self-important security
// widget, mounts the module for the current level into its body, and owns the
// two things a challenge is never allowed to own: the rejection copy and the
// skip link.
//
// Hard rule from SPEC section 4: the skip link stays visible, hit-testable and
// clickable at every level in both motion modes. Chaos may make it drift. It
// may never make it unreachable.

import { fail, skip, captchaFor, canSkip } from '../state.js';
import { CAPTCHA_MODULES } from '../captchas/index.js';
import { renderMuteToggle } from './mute.js';

// SPEC section 5.2, verbatim, indexed by `fails` after the increment.
export const REJECTIONS = [
  'Incorrect. Please try again.',
  'Incorrect. Please focus.',
  "Still incorrect. Are you sure you're human?",
  "Hmm. That's not it either.",
  'Are you even trying?',
  'Verification confidence: 0%. This is going badly.'
];

export const SKIP_MESSAGE = 'VERIFICATION FAILED — returning to prize claim';

// Long enough to read the notice, short enough not to feel like a hang.
export const SKIP_DELAY = 1100;

const FINE_PRINT =
  'Protected by VeriHuman™. This check confirms you are a person and not an ' +
  'automated system. Attempts are recorded. Verification may take several attempts.';

// Pure. Unit-tested against the exact strings in the spec.
export function rejectionFor(fails) {
  const count = Math.trunc(fails) || 0;
  if (count < 1) return '';
  if (count <= REJECTIONS.length) return REJECTIONS[count - 1];
  return `Incorrect. (attempt ${count})`;
}

// Officious nonsense that stays stable for a given level and attempt, so the
// widget looks like it is tracking something real.
export function sessionCode(level, fails) {
  const seed = (level * 7919 + fails * 104729) % 0xfffff;
  return `VH-${seed.toString(16).toUpperCase().padStart(5, '0')}`;
}

// --- Cleanup registry ------------------------------------------------------
// Challenge modules register teardown through `ctx.cleanup(fn)`. The router
// drains the registry before every render, so a module's timers and pointer
// listeners never outlive the screen that created them.

let cleanupHandlers = [];

const registerCleanup = (handler) => {
  if (typeof handler === 'function') cleanupHandlers.push(handler);
};

export function runCaptchaCleanup() {
  const handlers = cleanupHandlers;
  cleanupHandlers = [];
  handlers.forEach((handler) => handler());
}

// A rejection may carry its own line, for example the rotate challenge's
// "Image is not upright." It survives exactly one render and is then dropped.
let rejectionNote = '';

// --- Card ------------------------------------------------------------------

// The fake logo: a CSS shield with a tick, drawn in captcha.css.
function captchaChrome(state) {
  const bar = document.createElement('header');
  bar.className = 'captcha-titlebar';

  const logo = document.createElement('span');
  logo.className = 'captcha-logo';
  logo.setAttribute('aria-hidden', 'true');

  const brand = document.createElement('span');
  brand.className = 'captcha-brand';
  brand.textContent = 'VeriHuman™';

  const heading = document.createElement('h2');
  heading.className = 'captcha-heading';
  heading.textContent = 'SECURITY CHECK';

  const badge = document.createElement('span');
  badge.className = 'captcha-badge';
  badge.textContent = 'SECURE';

  bar.append(logo, brand, heading, badge);

  const meta = document.createElement('p');
  meta.className = 'captcha-meta';
  meta.textContent =
    `PROTOCOL v4.2.1 · SESSION ${sessionCode(state.level, state.fails)} · NODE EU-WEST-3B`;

  return [bar, meta];
}

function captchaCard(state, deps) {
  const modules = deps.captchas || CAPTCHA_MODULES;
  const id = captchaFor(state);
  const module = modules[id];

  const card = document.createElement('main');
  card.className = 'captcha-card';
  card.dataset.captcha = id;

  const title = document.createElement('p');
  title.className = 'captcha-title';
  title.textContent = module.title;

  const instruction = document.createElement('p');
  instruction.className = 'captcha-instruction';
  instruction.textContent = module.instruction;

  const body = document.createElement('div');
  body.className = 'captcha-body';

  const error = document.createElement('p');
  error.className = 'captcha-error';
  error.setAttribute('role', 'alert');
  error.textContent = rejectionFor(state.fails);

  const note = document.createElement('p');
  note.className = 'captcha-note';
  note.textContent = rejectionNote;
  rejectionNote = '';

  const actions = document.createElement('div');
  actions.className = 'captcha-actions';

  const attempts = document.createElement('span');
  attempts.className = 'captcha-attempts';
  attempts.textContent = `ATTEMPTS ${String(state.fails).padStart(2, '0')}`;

  const verify = document.createElement('button');
  verify.type = 'button';
  verify.className = 'captcha-verify';
  verify.dataset.action = 'verify';
  verify.textContent = 'VERIFY';
  // SPEC section 6, row 7: the timer challenge has no button to press. The
  // module declares it and the shell honours it; the module then rejects on its
  // own cycle so the skip link still arrives.
  if (module.disableVerify) verify.disabled = true;

  const fineprint = document.createElement('p');
  fineprint.className = 'captcha-fineprint';
  fineprint.textContent = FINE_PRINT;

  // Always in the DOM so the card never reflows when it appears, and simply
  // hidden until the sixth rejection earns it.
  const skipLink = document.createElement('button');
  skipLink.type = 'button';
  skipLink.className = 'captcha-skip';
  skipLink.dataset.action = 'skip';
  skipLink.textContent = 'skip verification →';
  skipLink.hidden = !canSkip(state);

  // The shell's failure path. Every challenge routes here, and it is the only
  // thing that ever moves `fails`.
  const reject = (message = '') => {
    rejectionNote = String(message || '');
    deps.audio.buzz();
    deps.dispatch(fail);
  };

  verify.addEventListener('click', () => {
    deps.audio.blip();
    if (module.verify()) return;
    // A module may carry a standing line for its rejections, for example the
    // rotate challenge's "Image is not upright."
    reject(module.rejection);
  });

  skipLink.addEventListener('click', () => {
    deps.audio.blip();
    error.textContent = SKIP_MESSAGE;
    error.classList.add('captcha-error-final');
    note.textContent = '';
    verify.disabled = true;
    skipLink.disabled = true;

    const timer = setTimeout(() => deps.dispatch(skip), SKIP_DELAY);
    registerCleanup(() => clearTimeout(timer));
  });

  actions.append(attempts, verify);
  card.append(...captchaChrome(state), title, instruction, body, error, note, actions, fineprint, skipLink);

  module.render(body, {
    level: state.level,
    fails: state.fails,
    reject,
    cleanup: registerCleanup
  });

  return card;
}

export function renderCaptcha(root, state, deps) {
  const screen = document.createElement('div');
  screen.className = 'screen screen-captcha';

  screen.append(captchaCard(state, deps), renderMuteToggle(state, deps));
  root.replaceChildren(screen);
  return screen;
}
