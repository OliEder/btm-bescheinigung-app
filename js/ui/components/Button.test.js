import { describe, it, expect, vi } from 'vitest';
import { button } from './Button.js';

describe('button()', () => {
  it('rendert <button> mit Variant- und Size-Klasse + Label', () => {
    const b = button({ label: 'Speichern', variant: 'primary', size: 'md' });
    expect(b.tagName).toBe('BUTTON');
    expect(b.classList.contains('rb-btn')).toBe(true);
    expect(b.classList.contains('rb-btn--primary')).toBe(true);
    expect(b.classList.contains('rb-btn--md')).toBe(true);
    expect(b.textContent).toContain('Speichern');
    expect(b.getAttribute('type')).toBe('button');
  });
  it('unbekannte Variant → primary-Fallback', () => {
    expect(button({ label: 'x', variant: 'lila' }).classList.contains('rb-btn--primary')).toBe(true);
  });
  it('icon fügt ein SVG voran', () => {
    expect(button({ label: 'Laden', icon: 'folder-open' }).querySelector('svg')).not.toBeNull();
  });
  it('disabled setzt Attribut', () => {
    expect(button({ label: 'x', disabled: true }).disabled).toBe(true);
  });
  it('onClick feuert bei Klick', () => {
    const fn = vi.fn();
    button({ label: 'x', onClick: fn }).click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
