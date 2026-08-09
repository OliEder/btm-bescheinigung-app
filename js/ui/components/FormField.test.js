import { describe, it, expect } from 'vitest';
import { formField } from './FormField.js';

describe('formField()', () => {
  it('rendert Label + Control', () => {
    const ctrl = document.createElement('input');
    const f = formField({ label: 'Nachname', htmlFor: 'ln', control: ctrl });
    const label = f.querySelector('.rb-field__label');
    expect(label.textContent).toContain('Nachname');
    expect(label.getAttribute('for')).toBe('ln');
    expect(f.contains(ctrl)).toBe(true);
  });
  it('optional zeigt (optional)', () => {
    const f = formField({ label: 'Titel', optional: true, control: document.createElement('input') });
    expect(f.querySelector('.rb-field__optional').textContent).toContain('optional');
  });
  it('error hat Vorrang vor hint', () => {
    const f = formField({ label: 'x', error: 'Pflichtfeld', hint: 'Tipp', control: document.createElement('input') });
    expect(f.querySelector('.rb-field__error').textContent).toBe('Pflichtfeld');
    expect(f.querySelector('.rb-field__hint')).toBeNull();
  });
  it('nur hint, kein error', () => {
    const f = formField({ label: 'x', hint: 'Tipp', control: document.createElement('input') });
    expect(f.querySelector('.rb-field__hint').textContent).toBe('Tipp');
    expect(f.querySelector('.rb-field__error')).toBeNull();
  });
});
