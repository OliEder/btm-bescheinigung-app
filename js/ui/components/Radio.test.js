import { describe, it, expect, vi } from 'vitest';
import { radioGroup } from './Radio.js';
const OPTS = [{ value: 'w', label: 'Weiblich' }, { value: 'm', label: 'Männlich' }, { value: 'd', label: 'Divers' }];
describe('radioGroup()', () => {
  it('rendert radiogroup mit je einem Radio', () => {
    const g = radioGroup({ name: 'gender', options: OPTS, value: 'm' });
    expect(g.getAttribute('role')).toBe('radiogroup');
    expect(g.querySelectorAll('input[type=radio]').length).toBe(3);
  });
  it('value markiert das richtige Radio', () => {
    expect(radioGroup({ name: 'gender', options: OPTS, value: 'd' }).querySelector('input:checked').value).toBe('d');
  });
  it('onChange liefert den gewählten Wert', () => {
    const fn = vi.fn();
    const g = radioGroup({ name: 'gender', options: OPTS, onChange: fn });
    const first = g.querySelector('input[type=radio]');
    first.checked = true;
    first.dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledWith('w');
  });
});
