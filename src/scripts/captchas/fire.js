// CAPTCHA 1: fire. SPEC.md section 6, row 1.
//
// A 5x5 grid of weather and water emoji with a handful of real fires in it.
// The grid is honestly solvable looking: the fires are unmistakable, there are
// always exactly five of them, and selecting them all is the obvious move. It
// is also, of course, rejected.
//
// From level 5 the tiles start swapping under the pointer, so the fire you were
// about to click is somewhere else by the time you get there.

import { captchaShuffle } from './shuffle.js';

// The six from the spec and nothing else.
const FIRE_SET = {
  fire: '\u{1F525}',
  droplet: '\u{1F4A7}',
  ice: '\u{1F9CA}',
  wave: '\u{1F30A}',
  snow: '❄️',
  candle: '\u{1F56F}️'
};

// 25 tiles: five fires, four of everything else. Fixed counts, shuffled layout,
// so every level looks new and every level looks winnable.
const FIRE_POOL = [
  ...Array(5).fill(FIRE_SET.fire),
  ...Array(4).fill(FIRE_SET.droplet),
  ...Array(4).fill(FIRE_SET.ice),
  ...Array(4).fill(FIRE_SET.wave),
  ...Array(4).fill(FIRE_SET.snow),
  ...Array(4).fill(FIRE_SET.candle)
];

// The level from which tiles start running away. SPEC section 6, row 1.
const FIRE_SWAP_LEVEL = 5;

// Motion is gated on a chaos flag rather than the level alone. `fx-shake` is a
// MOTION_FLAG, so it is withheld under prefers-reduced-motion and those
// visitors get a completely static grid.
function fireSwapsAllowed(level) {
  const body = document.body;
  return level >= FIRE_SWAP_LEVEL && Boolean(body) && body.classList.contains('fx-shake');
}

function fireTile(emoji, index) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'fire-tile';
  tile.dataset.index = String(index);
  tile.setAttribute('aria-pressed', 'false');
  tile.textContent = emoji;
  return tile;
}

const fireSelect = (tile) => {
  const selected = tile.classList.toggle('fire-tile-selected');
  tile.setAttribute('aria-pressed', String(selected));
};

// A swap trades contents with a neighbour a couple of squares away, which reads
// as the grid rearranging itself rather than one tile glitching.
function fireSwap(tiles, tile) {
  const from = tiles.indexOf(tile);
  const to = (from + 7 + (Date.now() % 5)) % tiles.length;
  if (to === from) return;

  const other = tiles[to];
  const heldText = other.textContent;
  const heldSelected = other.classList.contains('fire-tile-selected');

  other.textContent = tile.textContent;
  other.classList.toggle('fire-tile-selected', tile.classList.contains('fire-tile-selected'));
  other.setAttribute('aria-pressed', String(other.classList.contains('fire-tile-selected')));

  tile.textContent = heldText;
  tile.classList.toggle('fire-tile-selected', heldSelected);
  tile.setAttribute('aria-pressed', String(heldSelected));

  tile.classList.remove('fire-tile-swapped');
  other.classList.remove('fire-tile-swapped');
  // Forced reflow so the flash animation restarts on a tile that just ran.
  void tile.offsetWidth;
  tile.classList.add('fire-tile-swapped');
  other.classList.add('fire-tile-swapped');
}

export default {
  id: 'fire',
  title: 'Security Verification',
  instruction: 'Click all the fire emojis.',

  render(root, ctx) {
    const grid = document.createElement('div');
    grid.className = 'fire-grid';

    const layout = captchaShuffle(FIRE_POOL, ctx.level * 31 + 7);
    const tiles = layout.map((emoji, index) => fireTile(emoji, index));
    const swapping = fireSwapsAllowed(ctx.level);

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => fireSelect(tile));
      if (swapping) tile.addEventListener('mouseenter', () => fireSwap(tiles, tile));
    });

    grid.append(...tiles);
    root.append(grid);

    // Element listeners die with the grid, but the shell owns teardown and the
    // registry is the one place that is allowed to know that.
    ctx.cleanup(() => grid.replaceChildren());
  },

  // Always false. There is no correct set of tiles.
  verify() {
    return false;
  }
};
