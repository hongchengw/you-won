// Entry point. Owns the store and the router. SPEC.md section 2 and 5.

import { createState } from './state.js';
import { createStore } from './store.js';
import { renderWon } from './screens/won.js';
import { renderCaptcha } from './screens/captcha.js';
import { renderGate } from './screens/gate.js';

const SCREENS = {
  won: renderWon,
  captcha: renderCaptcha,
  gate: renderGate
};

// The router is deliberately dumb: read state.screen, call the matching
// renderer, nothing else.
export function createRouter(root, store) {
  const render = (state) => SCREENS[state.screen](root, state, store);
  const unsubscribe = store.subscribe(render);
  render(store.getState());
  return unsubscribe;
}

export function start(root) {
  const store = createStore(createState());
  createRouter(root, store);
  return store;
}

const app = document.getElementById('app');
if (app) start(app);
