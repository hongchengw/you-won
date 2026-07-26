// Shared blurry "photo" grid for the two image challenges. SPEC.md section 6,
// rows 2 and 4, and section 8: everything is CSS, canvas or emoji, so the
// photos are layered radial-gradients under a blur.
//
// The trick is that the shapes are not noise. Each tile is a plausible badly
// compressed thumbnail of *something*, and a few of them are very nearly a car
// seen from the side. Long enough staring and you will convince yourself.

import { captchaShuffle } from './shuffle.js';

// Shape recipes are drawn in captcha.css off `data-blob`. The names are
// deliberately non-committal: nothing in the DOM ever claims to be a subject.
export const BLOB_SHAPES = ['pod', 'pod', 'pod', 'plume', 'tower', 'dunes', 'orb', 'crest', 'ridge'];

// Scenery for the robot grid, where the emoji carries the subject instead.
export const BLOB_SCENERY = ['dunes', 'plume', 'ridge', 'orb', 'crest', 'tower', 'dunes', 'ridge', 'plume'];

function blobTile(shape, index, seed, subject) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'blob-tile blob-blurred';
  tile.dataset.index = String(index);
  tile.setAttribute('aria-pressed', 'false');
  tile.setAttribute('aria-label', `Image ${index + 1}`);

  const canvas = document.createElement('span');
  canvas.className = 'blob-canvas';
  canvas.dataset.blob = shape;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.setProperty('--blob-hue', String((index * 47 + seed * 19) % 360));
  canvas.style.setProperty('--blob-hue-b', String((index * 83 + seed * 31 + 40) % 360));
  canvas.style.setProperty('--blob-shift', `${((index * 13) % 24) - 12}%`);

  tile.append(canvas);

  if (subject) {
    const figure = document.createElement('span');
    figure.className = 'blob-subject';
    figure.setAttribute('aria-hidden', 'true');
    figure.textContent = subject;
    tile.append(figure);
  }

  const tick = document.createElement('span');
  tick.className = 'blob-check';
  tick.setAttribute('aria-hidden', 'true');
  tile.append(tick);

  tile.addEventListener('click', () => {
    const selected = tile.classList.toggle('blob-tile-selected');
    tile.setAttribute('aria-pressed', String(selected));
  });

  return tile;
}

// A 3x3 of blurred thumbnails. `subjects` is an optional list of emoji laid
// over the blobs, one per tile.
export function blobGrid({ seed, shapes, subjects = null }) {
  const grid = document.createElement('div');
  grid.className = 'blob-grid';

  const order = captchaShuffle(shapes, seed);
  const figures = subjects ? captchaShuffle(subjects, seed + 13) : null;

  order.forEach((shape, index) => {
    grid.append(blobTile(shape, index, seed, figures ? figures[index] : null));
  });

  return grid;
}
