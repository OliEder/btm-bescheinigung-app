import { el } from '../dom.js';
import { icon } from '../Icon.js';

export function input({ value, type = 'text', error = false, valid = false,
  id, name, placeholder, onInput, onBlur, ...attrs } = {}) {
  const showIcon = !!(error || valid);
  const cls = ['rb-input'];
  if (showIcon) cls.push('rb-input--has-icon');
  if (error) cls.push('rb-input--error');
  const inputEl = el('input', {
    class: cls.join(' '), type,
    ...(id ? { id } : {}), ...(name ? { name } : {}), ...(placeholder ? { placeholder } : {}), ...attrs,
  });
  if (value != null) inputEl.value = String(value);
  if (onInput) inputEl.addEventListener('input', onInput);
  if (onBlur) inputEl.addEventListener('blur', onBlur);
  const children = [inputEl];
  if (showIcon) {
    children.push(el('span', { class: 'rb-input__icon' }, [
      icon(error ? 'alert-circle' : 'check-circle', { size: 18, color: error ? 'var(--color-danger-600)' : 'var(--color-success-600)' }),
    ]));
  }
  return el('div', { class: 'rb-input-wrap' }, children);
}
