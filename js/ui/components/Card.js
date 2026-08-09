import { el } from '../dom.js';

export function card({ title, meta, actions, children } = {}) {
  const parts = [];
  if (title || (actions && actions.length)) {
    const left = el('div', {}, []);
    if (title) left.appendChild(el('h4', { class: 'rb-card__title' }, [String(title)]));
    if (meta) left.appendChild(el('p', { class: 'rb-card__meta' }, [String(meta)]));
    const head = el('div', { class: 'rb-card__head' }, [left]);
    if (actions && actions.length) head.appendChild(el('div', { class: 'rb-card__actions' }, actions));
    parts.push(head);
  }
  for (const c of [].concat(children || [])) {
    if (c == null) continue;
    parts.push(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el('div', { class: 'rb-card' }, parts);
}
