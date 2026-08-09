import { describe, it, expect, vi } from 'vitest';
import { select } from './Select.js';
const OPTS = [{ value: 'm', label: 'Männlich' }, { value: 'w', label: 'Weiblich' }];
describe('select()', () => {
  it('rendert Wrapper, <select>, Optionen und chevron', () => {
    const w = select({ options: OPTS, value: 'w', id: 'g', name: 'gender' });
    expect(w.classList.contains('rb-select-wrap')).toBe(true);
    const s = w.querySelector('select.rb-select');
    expect(s.querySelectorAll('option').length).toBe(2);
    expect(s.value).toBe('w');
    expect(w.querySelector('.rb-select__chevron svg')).not.toBeNull();
  });
  it('placeholder erzeugt eine leere erste Option', () => {
    const w = select({ options: OPTS, placeholder: 'Bitte wählen' });
    const first = w.querySelector('select option');
    expect(first.value).toBe('');
    expect(first.textContent).toBe('Bitte wählen');
  });
  it('onChange feuert', () => {
    const fn = vi.fn();
    select({ options: OPTS, onChange: fn }).querySelector('select').dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('leere options → valides, leeres select', () => {
    expect(select({}).querySelectorAll('option').length).toBe(0);
  });
});
