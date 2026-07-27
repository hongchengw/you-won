// The screen teardown registry. SPEC.md section 6.
//
// A screen or a CAPTCHA module parks its timers and listeners here through
// `registerCleanup`. The router drains the registry before every render, so
// nothing a screen started can outlive the screen itself.

let handlers = [];

export function registerCleanup(handler) {
  if (typeof handler === 'function') handlers.push(handler);
}

export function runCleanup() {
  const pending = handlers;
  handlers = [];
  pending.forEach((handler) => handler());
}
