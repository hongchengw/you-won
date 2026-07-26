// The id to module registry. SPEC.md sections 2 and 6.
//
// The shell looks a module up by `captchaFor(state)`, so adding a real
// challenge is one import and one swapped entry here. Every id in
// CAPTCHA_ORDER must resolve, which is why they all point at the stub today.
// T08 fills in fire, images, math and robot; T09 fills in the rest.

import stubCaptcha from './stub.js';

export const CAPTCHA_MODULES = {
  fire: stubCaptcha,
  images: stubCaptcha,
  math: stubCaptcha,
  robot: stubCaptcha,
  puzzle: stubCaptcha,
  distortedText: stubCaptcha,
  timer: stubCaptcha,
  rotate: stubCaptcha
};

export function captchaModule(id) {
  return CAPTCHA_MODULES[id] || stubCaptcha;
}
