// Stand-in body for screens that later tasks build for real.
// Renders nothing but the screen name so the router is testable today.

export function renderPlaceholder(root, name) {
  const node = document.createElement('p');
  node.className = `screen screen-${name}`;
  node.textContent = name;
  root.replaceChildren(node);
  return node;
}
