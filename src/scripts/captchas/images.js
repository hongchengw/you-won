// CAPTCHA 2: images. SPEC.md section 6, row 2.
//
// Nine blurred thumbnails, three of which are a low wide mass with two dark
// round shapes under it. That is a car. It is obviously a car. Select them.

import { blobGrid, BLOB_SHAPES } from './blobs.js';

export default {
  id: 'images',
  title: 'Image Verification',
  instruction: 'Select all images containing a car.',

  render(root, ctx) {
    const grid = blobGrid({ seed: ctx.level * 17 + 3, shapes: BLOB_SHAPES });
    root.append(grid);
    ctx.cleanup(() => grid.replaceChildren());
  },

  // Always false. None of them contain a car. None of them contain anything.
  verify() {
    return false;
  }
};
