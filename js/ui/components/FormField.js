import { el } from '../dom.js';

export function formField({ label, htmlFor, optional = false, hint, error, control } = {}) {
  const labelChildren = [String(label ?? '')];
  if (optional) labelChildren.push(el('span', { class: 'rb-field__optional' }, [' (optional)']));
  const labelEl = el('label', { class: 'rb-field__label', ...(htmlFor ? { for: htmlFor } : {}) }, labelChildren);
  const parts = [labelEl];
  if (control) parts.push(control);
  if (error) parts.push(el('p', { class: 'rb-field__error' }, [String(error)]));
  else if (hint) parts.push(el('p', { class: 'rb-field__hint' }, [String(hint)]));
  return el('div', { class: 'rb-field' }, parts);
}
