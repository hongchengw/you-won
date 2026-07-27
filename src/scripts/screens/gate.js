// Holy gate scene. SPEC.md section 5.3.
//
// The payoff, and the only part of the app that is not making a joke. Eight
// loops of degradation resolve into white light, a parting gate, a swelling
// chord, and the three lines the visitor has been fighting for. Then it hard
// cuts back to a pristine loop 1 and never mentions it again.
//
// It is played completely straight. The moment it winks, the joke dies, so
// there is no counter, no easter egg, and nothing here that remembers.
//
// The scene is a timeline of class flips: JS only decides *when*, gate.css
// owns every pixel of *what*, and every timer is registered for teardown so
// navigating away mid-scene leaves nothing behind.

import { reset } from '../state.js';
import { registerCleanup } from '../cleanup.js';
import { renderMuteToggle } from './mute.js';

// SPEC section 5.3, verbatim.
export const GATE_BEATS = [
  'VERIFICATION COMPLETE',
  'YOU HAVE BEEN VERIFIED',
  'PLEASE PROCEED TO CLAIM YOUR PRIZE'
];

// Milliseconds from mount. The bloom runs from 0 in CSS; everything else is
// scheduled off this table so the scene and its tests read the same clock.
export const GATE_TIMING = {
  pad: 1500,
  beats: [2500, 3800, 5000],
  cut: 6000
};

const RAY_COUNT = 14;
const MOTE_COUNT = 18;

// God rays and gold motes. Positions and delays are baked in as custom
// properties once and the motion is pure CSS, so nothing here needs a timer.
function gateLight() {
  const light = document.createElement('div');
  light.className = 'gate-light';
  light.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < RAY_COUNT; index += 1) {
    const ray = document.createElement('i');
    ray.className = 'gate-ray';
    ray.style.setProperty('--a', `${(index * 360) / RAY_COUNT}deg`);
    ray.style.setProperty('--w', `${8 + (index % 3) * 7}px`);
    ray.style.setProperty('--delay', `${(index % 5) * 0.3}s`);
    light.append(ray);
  }

  for (let index = 0; index < MOTE_COUNT; index += 1) {
    const mote = document.createElement('i');
    mote.className = 'gate-mote';
    mote.style.setProperty('--x', `${(index * 41) % 100}%`);
    mote.style.setProperty('--size', `${3 + (index % 4)}px`);
    mote.style.setProperty('--dur', `${5 + (index % 5)}s`);
    mote.style.setProperty('--delay', `-${(index % 7) * 0.8}s`);
    light.append(mote);
  }

  return light;
}

// Two ornate panels that materialise against the white and part. The filigree
// is drawn with pseudo-elements in gate.css, so a door is an empty element.
function gateDoors() {
  const doors = document.createElement('div');
  doors.className = 'gate-doors';
  doors.setAttribute('aria-hidden', 'true');

  ['left', 'right'].forEach((side) => {
    const door = document.createElement('div');
    door.className = `gate-door gate-door-${side}`;
    doors.append(door);
  });

  return doors;
}

// The three lines share one grid cell so each fades in over the one before it.
// They are announced together as a live region: this is the app's one sincere
// message and a screen reader should get it.
function gateText() {
  const text = document.createElement('div');
  text.className = 'gate-text';
  text.setAttribute('role', 'status');

  const beats = GATE_BEATS.map((line, index) => {
    const beat = document.createElement('p');
    beat.className = 'gate-beat';
    beat.style.setProperty('--i', String(index));
    beat.textContent = line;
    text.append(beat);
    return beat;
  });

  return { text, beats };
}

export function renderGate(root, state, deps) {
  const doc = root.ownerDocument || document;

  const screen = document.createElement('div');
  screen.className = 'screen screen-gate';

  const bloom = document.createElement('div');
  bloom.className = 'gate-bloom';
  bloom.setAttribute('aria-hidden', 'true');

  const { text, beats } = gateText();
  screen.append(bloom, gateDoors(), gateLight(), text, renderMuteToggle(state, deps));
  root.replaceChildren(screen);

  // Freezes the chaos: gate.css pauses every leftover fx animation and hides
  // the overlays and the mascot for as long as this class is on the body.
  doc.body.classList.add('gate-scene');

  // Beat one of the audio: the sour melody stops dead before the white hits.
  deps.audio.stopMusic();

  const timers = [];
  const at = (delay, action) => timers.push(setTimeout(action, delay));

  at(GATE_TIMING.pad, () => {
    screen.classList.add('gate-open');
    deps.audio.holyPad();
  });

  GATE_TIMING.beats.forEach((delay, index) => {
    at(delay, () => beats[index].classList.add('gate-beat-on'));
  });

  // The cut. No fade, no transition: the body class comes off and the router
  // paints a pristine loop 1 in the same frame.
  at(GATE_TIMING.cut, () => {
    doc.body.classList.remove('gate-scene');
    deps.dispatch(reset);
  });

  registerCleanup(() => {
    timers.forEach(clearTimeout);
    doc.body.classList.remove('gate-scene');
  });

  return screen;
}
