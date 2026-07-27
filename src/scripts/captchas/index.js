// The id to module registry. SPEC.md sections 2 and 6.
//
// The shell looks a module up by `captchaFor(state)`, so adding a real
// challenge is one import and one swapped entry here. Every id in
// CAPTCHA_ORDER must resolve. The stub is kept as the fallback for an id that
// does not exist, which is the only way `captchaModule` can miss.

import stubCaptcha from './stub.js';
import fireCaptcha from './fire.js';
import imagesCaptcha from './images.js';
import mathCaptcha from './math.js';
import robotCaptcha from './robot.js';
import puzzleCaptcha from './puzzle.js';
import distortedTextCaptcha from './distortedText.js';
import timerCaptcha from './timer.js';
import rotateCaptcha from './rotate.js';

export const CAPTCHA_MODULES = {
  fire: fireCaptcha,
  images: imagesCaptcha,
  math: mathCaptcha,
  robot: robotCaptcha,
  puzzle: puzzleCaptcha,
  distortedText: distortedTextCaptcha,
  timer: timerCaptcha,
  rotate: rotateCaptcha
};

export function captchaModule(id) {
  return CAPTCHA_MODULES[id] || stubCaptcha;
}
