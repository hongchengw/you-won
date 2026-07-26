// CAPTCHA 4: robot. SPEC.md section 6, row 4.
//
// The same blurred thumbnails, now with a faint subject in each one: a person,
// a tree, a car, a pizza, a dog. The question is which one is the robot. There
// is no robot. There has never been a robot.

import { blobGrid, BLOB_SCENERY } from './blobs.js';

// The five from the spec. No sixth, at any level.
const ROBOT_SUBJECTS = ['\u{1F9D1}', '\u{1F333}', '\u{1F697}', '\u{1F355}', '\u{1F415}'];

// Nine tiles from five subjects, so a couple repeat and the grid looks like a
// real sampled dataset rather than a neat set.
const ROBOT_POOL = Array.from({ length: 9 }, (unused, index) => ROBOT_SUBJECTS[index % ROBOT_SUBJECTS.length]);

export default {
  id: 'robot',
  title: 'Subject Verification',
  instruction: 'Which one is the robot?',

  render(root, ctx) {
    const grid = blobGrid({
      seed: ctx.level * 23 + 11,
      shapes: BLOB_SCENERY,
      subjects: ROBOT_POOL
    });

    root.append(grid);
    ctx.cleanup(() => grid.replaceChildren());
  },

  // Always false. There is nothing here to be right about.
  verify() {
    return false;
  }
};
