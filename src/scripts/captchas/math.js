// CAPTCHA 3: math. SPEC.md section 6, row 3.
//
// Delivered with a completely straight face: a big friendly sum, four fat
// pastel buttons, and not one of the answers is a number that helps. The
// options move after every attempt, so the one you just ruled out is somewhere
// else and you have to read all four again.

// SPEC section 6, row 3, verbatim and in this order.
const MATH_ANSWERS = ['purple', 'Thursday', 'sadness', '22'];

// Fixed permutations rather than a random shuffle: the layout has to change on
// every single attempt, and rolling dice can repeat itself.
const MATH_ORDERS = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [3, 2, 1, 0],
  [1, 3, 0, 2],
  [0, 3, 1, 2],
  [2, 1, 0, 3],
  [3, 0, 2, 1]
];

export function mathOrderFor(fails) {
  const count = Math.max(Math.trunc(fails) || 0, 0);
  return MATH_ORDERS[count % MATH_ORDERS.length].map((index) => MATH_ANSWERS[index]);
}

function mathOption(label) {
  const option = document.createElement('button');
  option.type = 'button';
  option.className = 'math-option';
  option.setAttribute('aria-pressed', 'false');
  option.textContent = label;
  return option;
}

export default {
  id: 'math',
  title: 'Human Verification',
  instruction: "Prove you're human: solve this.",

  render(root, ctx) {
    const panel = document.createElement('div');
    panel.className = 'math-panel';

    const prompt = document.createElement('p');
    prompt.className = 'math-prompt';
    prompt.textContent = '2 + 2 =';

    const options = document.createElement('div');
    options.className = 'math-options';

    const buttons = mathOrderFor(ctx.fails).map(mathOption);

    // One answer at a time, like any well behaved multiple choice question.
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((other) => {
          const chosen = other === button;
          other.classList.toggle('math-option-selected', chosen);
          other.setAttribute('aria-pressed', String(chosen));
        });
      });
    });

    options.append(...buttons);
    panel.append(prompt, options);
    root.append(panel);

    ctx.cleanup(() => panel.replaceChildren());
  },

  // Always false. Especially for 22.
  verify() {
    return false;
  }
};
