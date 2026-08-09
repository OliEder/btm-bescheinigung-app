// Kleine DOM-Fabrik ohne dynamisches HTML: baut Knoten per createElement/textContent,
// escaped Nutzereingaben von Natur aus und respektiert den PreToolUse-Hook.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null) continue;
    if (key === 'class' || key === 'className') {
      node.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'on' && typeof value === 'object') {
      for (const [ev, handler] of Object.entries(value)) node.addEventListener(ev, handler);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function on(node, event, handler) {
  node.addEventListener(event, handler);
  return () => node.removeEventListener(event, handler);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function text(node, value) {
  node.textContent = value == null ? '' : String(value);
}
