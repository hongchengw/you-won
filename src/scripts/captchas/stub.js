// Stand-in challenge. SPEC.md section 6.
//
// The shell needs something to mount so the app is playable end to end before
// the real eight land in T08 and T09. It is deliberately the dullest possible
// CAPTCHA: one checkbox that never satisfies anybody.

export default {
  id: 'stub',
  title: 'Security Verification',
  instruction: 'Confirm that you are not a robot.',

  render(root, ctx) {
    const box = document.createElement('label');
    box.className = 'stub-check';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'stub-check-input';

    const text = document.createElement('span');
    text.className = 'stub-check-label';
    text.textContent = "I'm not a robot";

    // Ticking the box is not an answer, it is just another rejection.
    input.addEventListener('change', () => {
      if (input.checked) ctx.reject();
    });

    box.append(input, text);
    root.append(box);
  },

  // Always false. There is no correct answer to any of the eight.
  verify() {
    return false;
  }
};
