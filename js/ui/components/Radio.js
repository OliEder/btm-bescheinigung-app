import { el } from '../dom.js';

export function radioGroup({ name, options = [], value, onChange } = {}) {
  const labels = options.map((opt) => {
    const radio = el('input', { type: 'radio', name, value: opt.value });
    if (value === opt.value) radio.checked = true;
    if (onChange) radio.addEventListener('change', () => onChange(opt.value));
    return el('label', { class: 'rb-radio' }, [radio, el('span', {}, [String(opt.label)])]);
  });
  return el('div', { class: 'rb-radio-group', role: 'radiogroup' }, labels);
}
