import { el } from '../dom.js';
import { icon } from '../Icon.js';

export function select({ options = [], value, id, name, onChange, placeholder, ...attrs } = {}) {
  const optionEls = [];
  if (placeholder != null) optionEls.push(el('option', { value: '' }, [String(placeholder)]));
  for (const o of options) optionEls.push(el('option', { value: o.value }, [String(o.label)]));
  const selectEl = el('select', { class: 'rb-select', ...(id ? { id } : {}), ...(name ? { name } : {}), ...attrs }, optionEls);
  if (value != null) selectEl.value = String(value);
  if (onChange) selectEl.addEventListener('change', onChange);
  const chevron = el('span', { class: 'rb-select__chevron' }, [icon('chevron-down', { size: 16, color: 'var(--color-ink-500)' })]);
  return el('div', { class: 'rb-select-wrap' }, [selectEl, chevron]);
}
