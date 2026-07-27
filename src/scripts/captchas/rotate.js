// CAPTCHA 8: rotate. SPEC.md section 6, row 8.
//
// A little house with the roof on top, the door on the ground, smoke going up
// and the sun in the sky. It is already upright. It could not be more upright.
// The slider starts at 0 degrees, so the correct answer is to do nothing, and
// doing nothing is rejected with "Image is not upright."
//
// This is the last challenge in the gauntlet, and it is the one people argue
// with out loud.

// SPEC section 6 row 8, verbatim. The shell renders it under the rejection.
export const ROTATE_REJECTION = 'Image is not upright.';

// Cardinal marks under the slider, so the control looks calibrated.
const ROTATE_MARKS = ['0°', '90°', '180°', '270°'];

// The scene, back to front. Each part is a positioned span styled in
// captcha.css: no images, no canvas, just shapes.
const ROTATE_PARTS = ['sun', 'cloud', 'ground', 'smoke', 'chimney', 'roof', 'wall', 'window', 'door'];

export default {
  id: 'rotate',
  title: 'Orientation Verification',
  instruction: 'Rotate the image to the correct position.',

  // Handed to the shell so the rejection carries the SPEC line.
  rejection: ROTATE_REJECTION,

  render(root, ctx) {
    const stage = document.createElement('div');
    stage.className = 'rotate-stage';

    const frame = document.createElement('div');
    frame.className = 'rotate-frame';

    const scene = document.createElement('div');
    scene.className = 'rotate-scene';
    scene.setAttribute('role', 'img');
    scene.setAttribute('aria-label', 'A house with a roof, a door and the sun');
    scene.style.setProperty('--rotate-angle', '0deg');

    ROTATE_PARTS.forEach((part) => {
      const node = document.createElement('span');
      node.className = `rotate-part rotate-${part}`;
      node.setAttribute('aria-hidden', 'true');
      scene.append(node);
    });

    frame.append(scene);

    const control = document.createElement('div');
    control.className = 'rotate-control';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'rotate-slider';
    slider.min = '0';
    slider.max = '359';
    slider.step = '1';
    slider.value = '0';
    slider.setAttribute('aria-label', 'Rotation in degrees');

    const readout = document.createElement('span');
    readout.className = 'rotate-readout';
    readout.textContent = '0°';

    const marks = document.createElement('div');
    marks.className = 'rotate-marks';
    marks.setAttribute('aria-hidden', 'true');
    ROTATE_MARKS.forEach((label) => {
      const mark = document.createElement('span');
      mark.textContent = label;
      marks.append(mark);
    });

    // The one control on the page that does exactly what it says it does.
    slider.addEventListener('input', () => {
      const angle = Number(slider.value) || 0;
      scene.style.setProperty('--rotate-angle', `${angle}deg`);
      readout.textContent = `${angle}°`;
    });

    control.append(slider, readout, marks);
    stage.append(frame, control);
    root.append(stage);

    ctx.cleanup(() => stage.replaceChildren());
  },

  // Always false. Including, and especially, at 0 degrees.
  verify() {
    return false;
  }
};
