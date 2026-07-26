// Entry point. A placeholder mount until T02 wires the real store and router.

export function mount(root) {
  const node = document.createElement('p');
  node.className = 'loading';
  node.textContent = 'loading...';
  root.replaceChildren(node);
  return node;
}

const app = document.getElementById('app');
if (app) mount(app);
