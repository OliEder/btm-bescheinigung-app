import { describe, it, expect } from 'vitest';
import { badge } from './Badge.js';

describe('badge()', () => {
  it('rendert span mit Ton-Klasse und Text', () => {
    const b = badge({ tone: 'success', text: 'BtM' });
    expect(b.tagName).toBe('SPAN');
    expect(b.classList.contains('rb-badge')).toBe(true);
    expect(b.classList.contains('rb-badge--success')).toBe(true);
    expect(b.textContent).toBe('BtM');
  });
  it('unbekannter Ton → neutral', () => {
    expect(badge({ tone: 'xx', text: 'a' }).classList.contains('rb-badge--neutral')).toBe(true);
  });
  it('Text wird als Text gesetzt (kein HTML)', () => {
    const b = badge({ tone: 'neutral', text: '<b>x</b>' });
    expect(b.querySelector('b')).toBeNull();
    expect(b.textContent).toBe('<b>x</b>');
  });
});
