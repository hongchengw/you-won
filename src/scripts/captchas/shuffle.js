// Deterministic shuffling for the selection challenges. SPEC.md section 6.
//
// The grids have to look freshly generated for every level without being
// genuinely random: a fixed seed keeps a level's layout stable across the
// re-render that follows each rejection, so the board does not reshuffle
// itself out from under the visitor mid-attempt.

// Lehmer generator. Small, pure, and good enough for arranging emoji.
export function captchaShuffle(items, seed) {
  const out = [...items];
  let state = ((Math.trunc(seed) || 1) * 7919) % 2147483647 || 7919;

  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };

  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const held = out[index];
    out[index] = out[swap];
    out[swap] = held;
  }

  return out;
}
