// The persistent mute toggle. SPEC.md section 5.1: present on every screen.
// Mute genuinely works at every level, so this is never part of the prank.
//
// It is mounted on the body rather than inside a screen, and that is not a
// detail. Chaos puts `filter` and animated `transform` on #app, either of which
// makes #app the containing block for `position: fixed` descendants. A toggle
// pinned to the corner from inside #app stops being pinned and scrolls off the
// top of the page with the card. Out here it stays where it was put.

// Local transition: the spec's state table owns `muted`, nothing else touches it.
export function toggleMute(state) {
  return { ...state, muted: !state.muted };
}

export function renderMuteToggle(state, deps) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute-toggle';
  button.dataset.action = 'mute';
  button.textContent = state.muted ? '🔇' : '🔊';
  button.setAttribute('aria-pressed', String(state.muted));
  button.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound');
  button.title = state.muted ? 'Sound off' : 'Sound on';

  button.addEventListener('click', () => {
    deps.audio.setMuted(!state.muted);
    deps.dispatch(toggleMute);
  });

  return button;
}

// Persistent chrome, like the mascot: the router mounts it after whichever
// screen it just rendered. Any previous toggle goes first, so there is only ever
// one and it always carries the current `muted` state.
export function mountMuteToggle(root, state, deps) {
  const doc = root.ownerDocument || document;
  doc.querySelectorAll('.mute-toggle').forEach((node) => node.remove());

  const button = renderMuteToggle(state, deps);
  doc.body.append(button);
  return button;
}
