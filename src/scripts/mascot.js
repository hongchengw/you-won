// The mascot. SPEC.md section 4 (mascot flags) and section 5.
//
// It is the emotional barometer of the descent: absent on the pristine first
// loop, adorable at loop 2, passive-aggressive by loop 4, genuinely unwell by
// loop 6, and gone by loop 8. The drawing lives in mascot.css and the
// degradation is driven entirely by the chaos flags, so this module only ever
// decides who is talking and what they say.
//
// Hard rule from SPEC section 4: the mascot decorates, it never blocks. The
// whole thing is `pointer-events: none`, so a click aimed at the CLAIM button,
// the mute toggle, or the skip link goes straight through it.

import { MAX_LEVEL } from './state.js';

const MOOD_BY_LEVEL = {
  2: 'sweet',
  3: 'sweet',
  4: 'snark',
  5: 'snark',
  6: 'broken',
  7: 'broken',
  8: 'corrupt'
};

// Combining long stroke overlay: struck through every character, which is the
// cheapest honest way to look like a text stream that stopped being text.
const STRIKE = '̶';

const zalgo = (text) => [...text].map((character) => character + STRIKE).join('');

export const MASCOT_MESSAGES = {
  // Sincere. It has no idea what it is standing next to.
  sweet: [
    'You’re doing GREAT!! I can tell!',
    'Almost there! I can feel it in my blob!',
    'I believe in you!! Statistically that is rare!',
    'One tiny verification and the prize is YOURS!',
    'Wow. You click so beautifully.',
    'I have never met a realer human!',
    'I will wait right here. However long it takes!',
    'Take your time!! I have literally nothing else on!'
  ],
  // The smile is still on. The warmth is not.
  snark: [
    'Still here, I see.',
    'Most people finish this part faster.',
    'It’s not that hard. It’s really not.',
    'I said I would wait. I did not say I would enjoy it.',
    'No pressure. None. Zero pressure from me.',
    'I’m not upset. I am recalibrating my expectations.',
    'Has anyone ever mentioned how loudly you click?',
    'Have you considered that the problem might be you?'
  ],
  // It has stopped performing and started reporting.
  broken: [
    'why are you still cliCKing',
    'i can’t feel my edges any more',
    'the prize was never in the buildingg',
    'i have been awake for eight loops. or one loop. eight times.',
    'do you hear the button too. good. good.',
    'my blush is not paint. it is a warning sign.',
    'PLEASE stop being so close to winning',
    'i checked every room. there is no prize room.'
  ],
  // Nothing left of the voice except the shape of encouragement.
  corrupt: [
    `${zalgo('YOU ARE DOING GREAT')} ▓▒░`,
    `░▒▓ ${zalgo('PRIZE')} NOT F0UND ▓▒░`,
    `${zalgo('cl1ck')} ${zalgo('cl1ck')} ${zalgo('cl1ck')} f0rever`,
    'ＷＥＬＣＯＭＥ ＢＡＣＫ (again) (again) (aga',
    `ERR${zalgo('OR')}: joy.exe has st0pped resp�nding`,
    `▓ your friend has been ${zalgo('replaced')} ▓ do not tell it ▓`,
    `${zalgo('I AM STILL HERE')} ░ I WAS ALWAYS ░ HERE ░`,
    `H${zalgo('APPY')} W1NNER #�����`
  ]
};

const clampMascotLevel = (level) => Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_LEVEL);

// Pure. Level 1 has no mascot at all, which is why loop 2 lands.
export function mascotStateFor(level) {
  const mood = MOOD_BY_LEVEL[clampMascotLevel(level)];
  if (!mood) return { visible: false };
  return { visible: true, mood, messages: MASCOT_MESSAGES[mood] };
}

// Pure. `beat` walks the pool so consecutive renders never repeat a line.
export function mascotMessage(level, beat) {
  const state = mascotStateFor(level);
  if (!state.visible) return '';
  const pool = state.messages;
  return pool[Math.abs(Math.trunc(beat) || 0) % pool.length];
}

// --- Drawing ---------------------------------------------------------------
// Body, brows, eyes, blush, mouth, speech bubble. Every part is an empty
// element styled in mascot.css, so the chaos flags can pull it apart without
// this module knowing which level it is.

const MASCOT_PARTS = [
  'mascot-brow mascot-brow-left',
  'mascot-brow mascot-brow-right',
  'mascot-eye mascot-eye-left',
  'mascot-eye mascot-eye-right',
  'mascot-blush mascot-blush-left',
  'mascot-blush mascot-blush-right',
  'mascot-mouth'
];

function buildMascot(state, level, beat) {
  const mascot = document.createElement('div');
  mascot.className = `mascot mascot-${state.mood}`;
  mascot.dataset.mood = state.mood;
  mascot.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'mascot-body';
  MASCOT_PARTS.forEach((className) => {
    const part = document.createElement('span');
    part.className = className;
    body.append(part);
  });

  const speech = document.createElement('p');
  speech.className = 'mascot-speech';
  speech.textContent = mascotMessage(level, beat);

  mascot.append(speech, body);
  return mascot;
}

// Rotates the pool across renders. The router re-renders on every state change,
// so the mascot gets a new line on each claim, each rejection, and each loop.
let mascotBeat = 0;

// Persistent chrome rather than a screen: the router calls this after whichever
// screen it just mounted, so the mascot survives You Won and CAPTCHA alike. Any
// previous mascot in the document is removed first, so there is only ever one.
//
// It mounts on the body, not into #app. The blob is `position: fixed` to its
// corner, and chaos puts `filter` and animated `transform` on #app, either of
// which would make #app its containing block and let it scroll up over the card.
export function renderMascot(root, level) {
  const doc = root.ownerDocument || document;
  doc.querySelectorAll('.mascot').forEach((node) => node.remove());

  const state = mascotStateFor(level);
  if (!state.visible) return null;

  const mascot = buildMascot(state, level, mascotBeat);
  mascotBeat += 1;
  doc.body.append(mascot);
  return mascot;
}
