// The id to module registry. SPEC.md sections 2 and 6.
//
// The shell looks a module up by `captchaFor(state)`, so adding a real
// challenge is one import and one swapped entry here. Every id in
// CAPTCHA_ORDER must resolve, which is why the unwritten ones still point at
// the stub. T08 filled in fire, images, math and robot; T09 fills in the rest.

import stubCaptcha from './stub.js';
import fireCaptcha from './fire.js';
import imagesCaptcha from './images.js';
import mathCaptcha from './math.js';
import robotCaptcha from './robot.js';

export const CAPTCHA_MODULES = {
  fire: fireCaptcha,
  images: imagesCaptcha,
  math: mathCaptcha,
  robot: robotCaptcha,
  puzzle: stubCaptcha,
  distortedText: stubCaptcha,
  timer: stubCaptcha,
  rotate: stubCaptcha
};

export function captchaModule(id) {
  return CAPTCHA_MODULES[id] || stubCaptcha;
}
