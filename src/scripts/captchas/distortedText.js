// CAPTCHA 6: distorted text. SPEC.md section 6, row 6.
//
// The most convincing one, because it is exactly what a real CAPTCHA looks
// like: warped glyphs on a speckled plate, struck through with wavy lines, a
// reload button, and a box to type it into.
//
// The string is pronounceable and meaningless, so it feels readable and there
// is nothing to guess. And it is regenerated on every attempt, so whatever you
// squinted at last time is not on the screen any more.

// Consonants and vowels chosen for legibility: no letters that read as another
// letter once they are rotated and skewed.
const DISTORTED_HEADS = 'bdfghjkmnprstvz';
const DISTORTED_VOWELS = 'aeiou';
const DISTORTED_TAILS = 'bdgklmnprstxz';

// Head, vowel, tail, twice. Six glyphs is the sweet spot: long enough to look
// serious, short enough that nobody blames their own memory.
const DISTORTED_PATTERN = [DISTORTED_HEADS, DISTORTED_VOWELS, DISTORTED_TAILS];
export const DISTORTED_LENGTH = 6;

// The pattern can occasionally land on a real word. A real word would give the
// visitor something to hold on to, so those seeds roll again.
const DISTORTED_WORDS = [
  'basket', 'bottle', 'button', 'candle', 'danger', 'finger', 'garden',
  'hunter', 'kitten', 'listen', 'market', 'master', 'mister', 'mitten',
  'monkey', 'murder', 'number', 'orange', 'parted', 'person', 'pocket',
  'rabbit', 'rocket', 'salmon', 'silver', 'sister', 'sunset', 'target',
  'ticket', 'tunnel', 'velvet', 'winter'
];

// Canvas plate. Drawn at twice the display size so the glyphs stay crisp.
const DISTORTED_PLATE = { width: 264, height: 84, scale: 2 };

// Lehmer again, same generator the grids use, kept local so a seed always
// produces the same plate for a given attempt.
function distortedRandom(seed) {
  let state = ((Math.trunc(seed) || 1) * 7919) % 2147483647 || 7919;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

// Pure. Seed in, nonsense out. Never a word, never the same twice in a row.
export function distortedTextFor(seed) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = distortedRandom((Math.trunc(seed) || 0) + attempt * 613 + 1);
    let word = '';

    for (let index = 0; index < DISTORTED_LENGTH; index += 1) {
      const alphabet = DISTORTED_PATTERN[index % DISTORTED_PATTERN.length];
      const letter = alphabet[Math.floor(next() * alphabet.length)];
      // Mixed case, the way every real CAPTCHA does it.
      word += next() > 0.55 ? letter.toUpperCase() : letter;
    }

    if (!DISTORTED_WORDS.includes(word.toLowerCase())) return word;
  }

  return 'xqvtho';
}

// Paints the plate. Returns false when there is no 2d context, which is the
// case under jsdom unless a test stubs one in.
export function drawDistortedText(canvas, text, level) {
  const plate = canvas.getContext ? canvas.getContext('2d') : null;
  if (!plate) return false;

  const { width, height, scale } = DISTORTED_PLATE;
  const next = distortedRandom(text.length * 977 + text.charCodeAt(0) * 31 + level);

  plate.setTransform(scale, 0, 0, scale, 0, 0);
  plate.clearRect(0, 0, width, height);
  plate.fillStyle = '#f2f4f7';
  plate.fillRect(0, 0, width, height);

  // Speckle, so the plate looks scanned rather than drawn.
  for (let dot = 0; dot < 240; dot += 1) {
    plate.fillStyle = next() > 0.5 ? 'rgba(38, 49, 61, 0.16)' : 'rgba(28, 110, 196, 0.12)';
    plate.fillRect(next() * width, next() * height, 1.6, 1.6);
  }

  // Glyphs. Each one gets its own rotation, skew, size and baseline, which is
  // what makes it read as distorted rather than as a font.
  const step = (width - 34) / text.length;
  const wobble = level >= 5 ? 1.5 : 1;

  for (let index = 0; index < text.length; index += 1) {
    const size = 32 + next() * 12;
    const tilt = (next() - 0.5) * 0.62 * wobble;
    const skew = (next() - 0.5) * 0.44 * wobble;
    const lift = (next() - 0.5) * 16 * wobble;

    plate.save();
    plate.translate(20 + index * step + step / 2, height / 2 + lift);
    plate.rotate(tilt);
    plate.transform(1, 0, skew, 1, 0, 0);
    plate.font = `700 ${size}px "Trebuchet MS", Verdana, sans-serif`;
    plate.textAlign = 'center';
    plate.textBaseline = 'middle';
    plate.fillStyle = `hsl(${210 + next() * 40} 30% ${22 + next() * 16}%)`;
    plate.fillText(text[index], 0, 0);
    plate.restore();
  }

  // Strike-through waves, drawn over the glyphs like the real thing.
  for (let line = 0; line < 4; line += 1) {
    plate.beginPath();
    plate.strokeStyle = `hsl(${200 + next() * 60} 34% 42% / 0.55)`;
    plate.lineWidth = 1 + next() * 1.4;
    plate.moveTo(0, next() * height);
    plate.quadraticCurveTo(width * 0.35, next() * height, width * 0.62, next() * height);
    plate.quadraticCurveTo(width * 0.82, next() * height, width, next() * height);
    plate.stroke();
  }

  return true;
}

export default {
  id: 'distortedText',
  title: 'Text Verification',
  instruction: 'Type the distorted text.',

  render(root, ctx) {
    const panel = document.createElement('div');
    panel.className = 'distorted-panel';

    const plate = document.createElement('div');
    plate.className = 'distorted-plate';

    const canvas = document.createElement('canvas');
    canvas.className = 'distorted-canvas';
    canvas.width = DISTORTED_PLATE.width * DISTORTED_PLATE.scale;
    canvas.height = DISTORTED_PLATE.height * DISTORTED_PLATE.scale;
    canvas.setAttribute('aria-hidden', 'true');

    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.className = 'distorted-refresh';
    refresh.setAttribute('aria-label', 'Get a new challenge');
    refresh.textContent = '↻';

    const field = document.createElement('div');
    field.className = 'distorted-field';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'distorted-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Type the distorted text');
    input.placeholder = 'Enter the text above';

    const hint = document.createElement('p');
    hint.className = 'distorted-hint';
    hint.textContent = 'Case sensitive. Letters only.';

    // A fresh string per attempt, and a fresh one again on every reload click.
    let reloads = 0;
    const paint = () => {
      const text = distortedTextFor(ctx.level * 977 + ctx.fails * 61 + reloads * 7);
      canvas.dataset.challenge = text;
      drawDistortedText(canvas, text, ctx.level);
    };
    paint();

    refresh.addEventListener('click', () => {
      reloads += 1;
      input.value = '';
      paint();
    });

    // Enter submits, the way it does in every form on the internet. It is the
    // shell's failure path, exactly as if VERIFY had been pressed.
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.preventDefault) event.preventDefault();
      ctx.reject('That does not match the image.');
    });

    plate.append(canvas, refresh);
    field.append(input);
    panel.append(plate, field, hint);
    root.append(panel);

    ctx.cleanup(() => panel.replaceChildren());
  },

  // Always false. Not even the string that is genuinely on the screen.
  verify() {
    return false;
  }
};
