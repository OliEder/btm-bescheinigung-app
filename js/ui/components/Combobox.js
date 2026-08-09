import { el, clear } from '../dom.js';

export function combobox({ options = [], value, onChange, placeholder } = {}) {
  let query = value || '';
  let open = false;
  let activeIndex = -1;

  const inputEl = el('input', {
    class: 'rb-combobox__input', role: 'combobox',
    'aria-expanded': 'false', 'aria-autocomplete': 'list',
    ...(placeholder ? { placeholder } : {}),
  });
  inputEl.value = query;

  const list = el('ul', { class: 'rb-combobox__list', role: 'listbox' });
  const wrap = el('div', { class: 'rb-combobox' }, [inputEl]);

  function filtered() {
    const q = query.trim().toLowerCase();
    const src = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return src.slice(0, 8);
  }
  function render() {
    const items = filtered();
    inputEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open || items.length === 0) { if (list.parentNode) list.remove(); return; }
    clear(list);
    items.forEach((opt, i) => {
      const li = el('li', {
        class: 'rb-combobox__option' + (i === activeIndex ? ' rb-combobox__option--active' : ''),
        role: 'option', 'aria-selected': i === activeIndex ? 'true' : 'false',
      }, [String(opt.label)]);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); select(opt); });
      li.addEventListener('mouseenter', () => { activeIndex = i; render(); });
      list.appendChild(li);
    });
    if (!list.parentNode) wrap.appendChild(list);
  }
  function select(opt) {
    query = opt.label; inputEl.value = opt.label; open = false; activeIndex = -1;
    render();
    if (onChange) onChange(opt.label);
  }
  inputEl.addEventListener('input', () => {
    query = inputEl.value; open = true; activeIndex = -1; render();
    if (onChange) onChange(inputEl.value);
  });
  inputEl.addEventListener('focus', () => { open = true; render(); });
  inputEl.addEventListener('keydown', (e) => {
    const items = filtered();
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { open = true; render(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && items[activeIndex]) select(items[activeIndex]); }
    else if (e.key === 'Escape') { open = false; render(); }
  });
  const onDocDown = (e) => { if (!wrap.contains(e.target)) { open = false; render(); } };
  document.addEventListener('mousedown', onDocDown);
  wrap.destroy = () => { document.removeEventListener('mousedown', onDocDown); };
  return wrap;
}
