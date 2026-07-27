// CAPTCHA 7: timer. SPEC.md section 6, row 7.
//
// A spinner, a progress bar and a big countdown, all of them working hard and
// none of them going anywhere. The number falls convincingly for a while, then
// quietly gains a few seconds back, and it never reaches zero.
//
// VERIFY is disabled here, which is the point: there is no button to fail on.
// So the challenge fails itself on a cycle instead, and the fail count still
// climbs to six and still earns the skip link. Without that this level would be
// a dead end, and a dead end is not a joke.

// The published countdown. Hand written rather than generated so the shape is
// obvious at a glance: a long believable slide, a small gift of a few seconds,
// then down again. The minimum is 6, so it never reaches zero at any tick.
export const TIMER_SEQUENCE = [
  30, 29, 28, 27, 31, 26, 25, 24, 23, 29, 22, 21, 20, 19, 25, 18,
  17, 16, 15, 22, 14, 13, 12, 11, 19, 10, 9, 8, 7, 17, 6, 28
];

// SPEC section 6 row 7: it goes negative and glitches at high chaos.
const TIMER_GLITCH_LEVEL = 7;

// The first few ticks of a cycle are always honest, whatever the level, so the
// clock reads 30 and falls convincingly before the wheels come off. The
// challenge lives at level 7, and starting it already broken would give the
// whole thing away.
const TIMER_GLITCH_FROM = 4;

// Fake readouts for the glitch levels. Never a plain number, so they read as a
// fault rather than as progress.
const TIMER_GLITCH_TEXT = ['--', 'NaN', '∞', '0x1F', '???'];

// One self-rejection every eight ticks. Six of those is the skip link.
export const TIMER_ATTEMPT_TICKS = 8;

const TIMER_STATUS = [
  'Contacting verification node...',
  'Analysing interaction patterns...',
  'Comparing against known humans...',
  'Awaiting confidence threshold...',
  'Re-queuing verification request...'
];

// Pure. The number on the clock at a given tick.
export function timerValueFor(tick, level) {
  const index = Math.abs(Math.trunc(tick) || 0) % TIMER_SEQUENCE.length;
  const value = TIMER_SEQUENCE[index];
  if (level < TIMER_GLITCH_LEVEL || index < TIMER_GLITCH_FROM) return value;

  // From here the two ends of the sequence fight each other, which is how the
  // clock ends up on the wrong side of zero. Exactly zero is the one answer it
  // is never allowed to give, so a dead heat goes hard negative instead.
  const drift = value - TIMER_SEQUENCE[(index * 5 + 3) % TIMER_SEQUENCE.length];
  return drift === 0 ? -value : drift;
}

// Pure. What actually gets printed, which at high chaos is not always a number.
export function timerDisplayFor(tick, level) {
  const index = Math.abs(Math.trunc(tick) || 0);
  if (level >= TIMER_GLITCH_LEVEL && index >= TIMER_GLITCH_FROM && index % 3 === 0) {
    return TIMER_GLITCH_TEXT[index % TIMER_GLITCH_TEXT.length];
  }
  return String(timerValueFor(index, level));
}

// The bar creeps up, resets just short of the end, and creeps up again.
export function timerProgressFor(tick) {
  const index = Math.abs(Math.trunc(tick) || 0) % 24;
  return 6 + index * 3.5;
}

export default {
  id: 'timer',
  title: 'Automated Verification',
  instruction: 'Please wait for verification.',

  // The shell reads this and leaves VERIFY disabled for the whole level.
  disableVerify: true,

  render(root, ctx) {
    const panel = document.createElement('div');
    panel.className = 'timer-panel';

    const dial = document.createElement('div');
    dial.className = 'timer-dial';

    const spinner = document.createElement('span');
    spinner.className = 'timer-spinner';
    spinner.setAttribute('aria-hidden', 'true');

    const count = document.createElement('span');
    count.className = 'timer-count';

    const unit = document.createElement('span');
    unit.className = 'timer-unit';
    unit.textContent = 'SECONDS REMAINING';

    dial.append(spinner, count, unit);

    const track = document.createElement('div');
    track.className = 'timer-track';

    const bar = document.createElement('span');
    bar.className = 'timer-bar';
    track.append(bar);

    const status = document.createElement('p');
    status.className = 'timer-status';

    const notice = document.createElement('p');
    notice.className = 'timer-notice';
    notice.textContent = 'Manual verification is unavailable during this check.';

    let tick = 0;
    const paint = () => {
      count.textContent = timerDisplayFor(tick, ctx.level);
      bar.style.width = `${timerProgressFor(tick)}%`;
      status.textContent = TIMER_STATUS[Math.floor(tick / 3) % TIMER_STATUS.length];
    };
    paint();

    panel.append(dial, track, status, notice);
    root.append(panel);

    const clock = setInterval(() => {
      tick += 1;
      paint();

      // The cycle that keeps this level from being a trap: the check reports
      // its own failure, the shell counts it, and the skip link still arrives.
      if (tick % TIMER_ATTEMPT_TICKS === 0) {
        ctx.reject('Automated verification did not complete. Retrying.');
      }
    }, 1000);

    ctx.cleanup(() => clearInterval(clock));
  },

  // Always false, and unreachable anyway: VERIFY never enables.
  verify() {
    return false;
  }
};
