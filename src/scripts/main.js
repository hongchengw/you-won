// Entry point. Owns the store and the router. SPEC.md section 2 and 5.

import { createState } from './state.js';
import { createStore } from './store.js';
import { createAudio } from './audio.js';
import { applyChaos } from './chaos.js';
import { renderMascot } from './mascot.js';
import { renderWon } from './screens/won.js';
import { runCleanup } from './cleanup.js';
import { renderCaptcha } from './screens/captcha.js';
import { renderGate } from './screens/gate.js';

const SCREENS = {
  won: renderWon,
  captcha: renderCaptcha,
  gate: renderGate
};

// The router is deliberately dumb: apply the chaos for the level, read
// state.screen, call the matching renderer, nothing else. `deps` carries
// everything a screen may not build for itself, so tests can inject stubs.
// Chaos runs first so a screen renders straight into the right body classes,
// and no screen ever has to know that chaos exists. The audio level is pushed
// the same way, so the music sours in step with the visuals. The mascot is
// persistent chrome rather than a screen, so it is mounted after whichever
// screen just rendered and follows the visitor from You Won into the CAPTCHA.
// The cleanup registry is drained first: challenge modules and the gate scene
// park their timers and pointer listeners there, and none of them may survive
// the swap.
export function createRouter(root, store, deps) {
  const render = (state) => {
    runCleanup();
    applyChaos(root.ownerDocument || document, state.level);
    deps.audio.setLevel(state.level);
    const screen = SCREENS[state.screen](root, state, deps);
    renderMascot(root, state.level);
    return screen;
  };
  const unsubscribe = store.subscribe(render);
  render(store.getState());
  return unsubscribe;
}

export function start(root, options = {}) {
  const audio = options.audio || createAudio();
  const store = createStore(createState());
  createRouter(root, store, { dispatch: store.dispatch, audio });
  return store;
}

const app = document.getElementById('app');
if (app) start(app);
