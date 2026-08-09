import { describe, it, expect, vi } from 'vitest';
import { input } from './Input.js';

describe('input()', () => {
  it('rendert Wrapper mit <input> und Wert', () => {
    const w = input({ value: 'Meier', id: 'ln', name: 'lastname' });
    expect(w.classList.contains('rb-input-wrap')).toBe(true);
    const el = w.querySelector('input.rb-input');
    expect(el.value).toBe('Meier');
    expect(el.id).toBe('ln');
    expect(el.name).toBe('lastname');
  });
  it('valid → check-circle-Icon', () => {
    const w = input({ value: 'x', valid: true });
    expect(w.querySelector('.rb-input__icon svg')).not.toBeNull();
    expect(w.querySelector('input').classList.contains('rb-input--has-icon')).toBe(true);
  });
  it('error → Fehlerklasse + Icon', () => {
    const w = input({ value: '', error: true });
    expect(w.querySelector('input').classList.contains('rb-input--error')).toBe(true);
    expect(w.querySelector('.rb-input__icon svg')).not.toBeNull();
  });
  it('onInput und onBlur feuern', () => {
    const oi = vi.fn(); const ob = vi.fn();
    const w = input({ onInput: oi, onBlur: ob });
    const el = w.querySelector('input');
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    expect(oi).toHaveBeenCalledTimes(1);
    expect(ob).toHaveBeenCalledTimes(1);
  });
});
