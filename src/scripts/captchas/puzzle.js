// CAPTCHA 5: puzzle. SPEC.md section 6, row 5.
//
// Four pieces of one small picture, four dashed sockets, and a ghost of the
// finished image showing through the frame. It drags beautifully. The piece
// really does reach the socket, sits there for exactly as long as you hold the
// pointer down, and slides off the moment you let go.
//
// Ten seconds later the challenge fails on its own, which is just enough time
// to try it three times and start doubting your hands.

// Board geometry in CSS pixels. Everything is absolute inside the board, so the
// same numbers drive the layout, the drag maths and the clamping.
const PUZZLE_BOARD = { width: 300, height: 180 };
const PUZZLE_PIECE = 60;
const PUZZLE_FRAME = { left: 90, top: 30 };

// SPEC section 6 row 5: auto-fail at 10s.
export const PUZZLE_SECONDS = 10;

// The level from which the countdown starts lying. SPEC section 6 row 5.
const PUZZLE_UNRELIABLE_LEVEL = 5;

// Scattered starts, one per quadrant of the picture. Far enough from the frame
// that the board reads as "four pieces waiting to be assembled".
const PUZZLE_LAYOUT = [
  { column: 0, row: 0, start: { x: 8, y: 6 } },
  { column: 1, row: 0, start: { x: 230, y: 12 } },
  { column: 0, row: 1, start: { x: 12, y: 112 } },
  { column: 1, row: 1, start: { x: 228, y: 108 } }
];

// Candidate escape offsets, tried in order from a rotating start so no two
// releases behave the same way. The first one that lands clear of both the drop
// point and the socket wins.
const PUZZLE_ESCAPES = [
  { x: 34, y: -12 },
  { x: -30, y: 18 },
  { x: 16, y: 32 },
  { x: -24, y: -28 },
  { x: 38, y: 10 },
  { x: -36, y: -6 },
  { x: 8, y: -34 },
  { x: -14, y: 34 }
];

// How far a released piece has to end up from where it was dropped for the
// refusal to be unmistakable rather than look like a rendering wobble.
const PUZZLE_CLEARANCE = 14;

const puzzleGap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const puzzleTarget = (spot) => ({
  x: PUZZLE_FRAME.left + spot.column * PUZZLE_PIECE,
  y: PUZZLE_FRAME.top + spot.row * PUZZLE_PIECE
});

// Pieces stay on the board. Wandering off into the card would give the game
// away, and a piece nobody can reach is not funny, it is broken.
export function puzzleClamp(point) {
  const limit = (value, max) => Math.min(Math.max(value, 0), max);
  return {
    x: limit(point.x, PUZZLE_BOARD.width - PUZZLE_PIECE),
    y: limit(point.y, PUZZLE_BOARD.height - PUZZLE_PIECE)
  };
}

// Pure. Given where the piece was dropped and where it was supposed to go,
// returns where it actually ends up: clear of the socket, clear of the drop,
// and preferably further from the socket than it already was.
export function puzzleNudge(point, target, step) {
  const start = Math.abs(Math.trunc(step) || 0);
  const away = { x: point.x - target.x, y: point.y - target.y };
  const heading = away.x === 0 && away.y === 0 ? { x: 1, y: 0.4 } : away;

  const attempt = (outwardOnly) => {
    for (let index = 0; index < PUZZLE_ESCAPES.length; index += 1) {
      const escape = PUZZLE_ESCAPES[(start + index) % PUZZLE_ESCAPES.length];
      const outward = escape.x * heading.x + escape.y * heading.y >= 0;
      if (outwardOnly && !outward) continue;

      const moved = puzzleClamp({ x: point.x + escape.x, y: point.y + escape.y });
      if (puzzleGap(moved, point) > PUZZLE_CLEARANCE && puzzleGap(moved, target) > PUZZLE_CLEARANCE) {
        return moved;
      }
    }
    return null;
  };

  // Boxed into a corner with nowhere sensible to go. The opposite corner always
  // is somewhere, and it is a long way from the frame.
  return attempt(true) || attempt(false) || puzzleClamp({ x: PUZZLE_BOARD.width, y: 0 });
}

// SPEC section 6 row 5: the countdown gets unreliable at high chaos. The clock
// underneath it does not, so the auto-fail still lands at ten seconds.
export function puzzleCountdownText(remaining, level) {
  if (level >= PUZZLE_UNRELIABLE_LEVEL && remaining % 3 === 1) {
    return `${remaining + 4}`;
  }
  return `${remaining}`;
}

function puzzlePlace(piece, point) {
  piece.style.left = `${point.x}px`;
  piece.style.top = `${point.y}px`;
}

function puzzleBuildPiece(spot, index) {
  const piece = document.createElement('button');
  piece.type = 'button';
  piece.className = 'puzzle-piece';
  piece.dataset.index = String(index);
  piece.setAttribute('aria-label', `Puzzle piece ${index + 1}`);

  const target = puzzleTarget(spot);
  piece.dataset.targetX = String(target.x);
  piece.dataset.targetY = String(target.y);

  // The slice of the picture this piece carries, so the four of them really do
  // make one image.
  piece.style.setProperty('--piece-x', `${-spot.column * PUZZLE_PIECE}px`);
  piece.style.setProperty('--piece-y', `${-spot.row * PUZZLE_PIECE}px`);
  puzzlePlace(piece, spot.start);

  return { piece, target };
}

function puzzleBuildSlot(spot) {
  const slot = document.createElement('span');
  slot.className = 'puzzle-slot';
  slot.setAttribute('aria-hidden', 'true');

  const target = puzzleTarget(spot);
  slot.style.left = `${target.x}px`;
  slot.style.top = `${target.y}px`;
  return slot;
}

export default {
  id: 'puzzle',
  title: 'Assembly Verification',
  instruction: 'Slide the puzzle pieces into place.',

  render(root, ctx) {
    const stage = document.createElement('div');
    stage.className = 'puzzle-stage';

    const board = document.createElement('div');
    board.className = 'puzzle-board';

    // The finished picture, ghosted, exactly where the pieces belong.
    const frame = document.createElement('span');
    frame.className = 'puzzle-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.left = `${PUZZLE_FRAME.left}px`;
    frame.style.top = `${PUZZLE_FRAME.top}px`;
    board.append(frame);

    PUZZLE_LAYOUT.forEach((spot) => board.append(puzzleBuildSlot(spot)));

    const pieces = PUZZLE_LAYOUT.map((spot, index) => puzzleBuildPiece(spot, index));
    pieces.forEach((entry) => board.append(entry.piece));

    const countdown = document.createElement('p');
    countdown.className = 'puzzle-countdown';

    let remaining = PUZZLE_SECONDS;
    const paint = () => {
      countdown.textContent = `TIME REMAINING ${puzzleCountdownText(remaining, ctx.level)}s`;
    };
    paint();

    stage.append(board, countdown);
    root.append(stage);

    // --- Dragging ----------------------------------------------------------
    // Pointer events, so it works with a finger. Move and release listen on the
    // document rather than the piece, so a fast drag never loses the piece
    // halfway through the gesture.

    let held = null;
    let releases = 0;

    const onDown = (event, entry) => {
      if (event.button !== undefined && event.button > 0) return;
      if (event.preventDefault) event.preventDefault();

      held = {
        entry,
        pointerX: event.clientX,
        pointerY: event.clientY,
        origin: {
          x: parseFloat(entry.piece.style.left) || 0,
          y: parseFloat(entry.piece.style.top) || 0
        }
      };
      entry.piece.classList.add('puzzle-piece-held');
    };

    const onMove = (event) => {
      if (!held) return;
      puzzlePlace(
        held.entry.piece,
        puzzleClamp({
          x: held.origin.x + (event.clientX - held.pointerX),
          y: held.origin.y + (event.clientY - held.pointerY)
        })
      );
    };

    const onUp = () => {
      if (!held) return;
      const piece = held.entry.piece;
      const dropped = {
        x: parseFloat(piece.style.left) || 0,
        y: parseFloat(piece.style.top) || 0
      };

      // The whole joke in one line: it never stays where you put it.
      puzzlePlace(piece, puzzleNudge(dropped, held.entry.target, releases));
      releases += 1;

      piece.classList.remove('puzzle-piece-held');
      piece.classList.remove('puzzle-piece-slipped');
      // Forced reflow so the slip animation restarts on a piece that just ran.
      void piece.offsetWidth;
      piece.classList.add('puzzle-piece-slipped');
      held = null;
    };

    pieces.forEach((entry) => {
      entry.piece.addEventListener('pointerdown', (event) => onDown(event, entry));
    });
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    // --- Clock -------------------------------------------------------------

    const clock = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        paint();
        return;
      }
      clearInterval(clock);
      countdown.textContent = 'TIME REMAINING 0s';
      ctx.reject('Assembly not completed in time.');
    }, 1000);

    ctx.cleanup(() => {
      clearInterval(clock);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      held = null;
    });
  },

  // Always false. The pieces have never once been in place.
  verify() {
    return false;
  }
};
