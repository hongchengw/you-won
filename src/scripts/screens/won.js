// You Won screen. SPEC.md section 5.1.
// The sincere one. At level 1 this has to read as a real, sweet prize page.
// All decoration is CSS animation, so nothing leaks when the screen unmounts.

import { claim, MAX_LEVEL } from '../state.js';

// One absurd prize per loop, escalating. SPEC.md section 5.1.
export const PRIZES = [
  'A 2024 SUPER YACHT',
  'ONE (1) FREE SANDWICH',
  'A LIFETIME SUPPLY OF WEDNESDAYS',
  'THE ENTIRE MOON',
  'A SLIGHTLY USED HELICOPTER',
  'YOUR NEIGHBOUR’S DOG (LEGALLY)',
  'ONE MILLION IMAGINARY DOLLARS',
  'EVERYTHING. LITERALLY EVERYTHING.'
];

export function prizeFor(level) {
  const clamped = Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_LEVEL);
  return PRIZES[clamped - 1];
}

const CONFETTI_COUNT = 40;
const BALLOON_TINTS = ['pink', 'mint', 'lavender', 'lemon', 'sky'];

// Claiming both advances the state machine and records that the AudioContext
// now exists, so a later reset() can keep the running engine.
const claimAndStart = (state) => ({ ...claim(state), audioStarted: true });

// Fake bubble type: one span per letter so CSS can nudge each one. The
// element's textContent stays the plain word.
function bubbleWord(text, className) {
  const word = document.createElement('span');
  word.className = `bubble ${className}`;

  [...text].forEach((character, index) => {
    const letter = document.createElement('span');
    letter.className = 'bubble-letter';
    letter.style.setProperty('--i', String(index));
    letter.textContent = character;
    word.append(letter);
  });

  return word;
}

// Confetti and balloons. Positions and offsets are baked in as custom
// properties once; the motion itself is pure CSS, never a JS timer.
// Delays are negative so every loop is already mid-flight on first paint.
function wonDecoration() {
  const decor = document.createElement('div');
  decor.className = 'decor';
  decor.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < CONFETTI_COUNT; index += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${(index * 97) % 100}%`);
    piece.style.setProperty('--y', `${4 + ((index * 37) % 88)}%`);
    piece.style.setProperty('--delay', `-${(index % 15) * 0.5}s`);
    piece.style.setProperty('--spin', `${index % 2 ? 1 : -1}`);
    decor.append(piece);
  }

  BALLOON_TINTS.forEach((tint, index) => {
    const balloon = document.createElement('i');
    balloon.className = `balloon balloon-${tint}`;
    balloon.style.setProperty('--x', `${8 + index * 21}%`);
    balloon.style.setProperty('--delay', `-${index * 3.6}s`);
    decor.append(balloon);
  });

  return decor;
}

function wonCard(state, deps) {
  const card = document.createElement('main');
  card.className = 'won-card';

  const ribbon = document.createElement('p');
  ribbon.className = 'won-ribbon';
  ribbon.textContent = '✨ OFFICIAL WINNER NOTICE ✨';

  const headline = document.createElement('h1');
  headline.className = 'won-headline';
  headline.append(
    bubbleWord('CONGRATULATIONS', 'bubble-congrats'),
    bubbleWord('YOU WON!!', 'bubble-won')
  );

  const label = document.createElement('p');
  label.className = 'won-label';
  label.textContent = 'You are today’s lucky winner of';

  const prize = document.createElement('p');
  prize.className = 'won-prize';
  prize.textContent = prizeFor(state.level);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'claim-button';
  button.dataset.action = 'claim';
  button.textContent = 'CLAIM PRIZE \u{1F381}';
  button.addEventListener('click', () => {
    if (!deps.audio.isStarted()) deps.audio.start();
    deps.audio.blip();
    deps.dispatch(claimAndStart);
  });

  const fineprint = document.createElement('p');
  fineprint.className = 'won-fineprint';
  fineprint.textContent = 'No purchase necessary. One quick verification and it is yours!';

  card.append(ribbon, headline, label, prize, button, fineprint);
  return card;
}

export function renderWon(root, state, deps) {
  const screen = document.createElement('div');
  screen.className = 'screen screen-won';

  screen.append(wonDecoration(), wonCard(state, deps));
  root.replaceChildren(screen);
  return screen;
}
