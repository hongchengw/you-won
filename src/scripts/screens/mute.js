// The persistent mute toggle. SPEC.md section 5.1: present on every screen.
// Mute genuinely works at every level, so this is never part of the prank.

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
