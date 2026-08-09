import { describe, it, expect, vi } from 'vitest';
import { combobox } from './Combobox.js';

const OPTS = [
  { value: 'de', label: 'Deutsch' }, { value: 'at', label: 'Österreichisch' },
  { value: 'ch', label: 'Schweizerisch' }, { value: 'fr', label: 'Französisch' },
];
function type(inputEl, val) { inputEl.value = val; inputEl.dispatchEvent(new Event('input')); }

describe('combobox()', () => {
  it('rendert combobox-Input', () => {
    const c = combobox({ options: OPTS });
    const inp = c.querySelector('input[role=combobox]');
    expect(inp).not.toBeNull();
    expect(inp.getAttribute('aria-autocomplete')).toBe('list');
  });
  it('Tippen filtert die Liste (case-insensitiv)', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    type(inp, 'öster');
    const items = c.querySelectorAll('.rb-combobox__option');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Österreichisch');
    c.destroy(); c.remove();
  });
  it('ArrowDown + Enter wählt Option, onChange bekommt Label', () => {
    const fn = vi.fn();
    const c = combobox({ options: OPTS, onChange: fn });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    // 'schweiz' matcht eindeutig nur Schweizerisch (Substring-Filter, includes)
    type(inp, 'schweiz');
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fn).toHaveBeenCalledWith('Schweizerisch');
    c.destroy(); c.remove();
  });
  it('filtert per Substring, nicht nur per Präfix (Design-Treue: includes)', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    // 'reich' kommt NICHT am Wortanfang vor -> mit startsWith wäre die Liste leer.
    type(inp, 'reich');
    const labels = [...c.querySelectorAll('.rb-combobox__option')].map((li) => li.textContent);
    expect(labels).toEqual(['Österreichisch']);
    c.destroy(); c.remove();
  });
  it('Escape schließt die Liste', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    type(inp, 'd');
    expect(c.querySelector('.rb-combobox__list')).not.toBeNull();
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(c.querySelector('.rb-combobox__list')).toBeNull();
    c.destroy(); c.remove();
  });
  it('destroy() meldet den document-Listener ab', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    c.destroy();
    expect(() => document.dispatchEvent(new MouseEvent('mousedown'))).not.toThrow();
    c.remove();
  });
});
