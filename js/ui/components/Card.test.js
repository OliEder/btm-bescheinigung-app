import { describe, it, expect } from 'vitest';
import { card } from './Card.js';

describe('card()', () => {
  it('ohne title/actions: kein Kopf, nur Body', () => {
    const body = document.createElement('p'); body.textContent = 'Inhalt';
    const c = card({ children: body });
    expect(c.classList.contains('rb-card')).toBe(true);
    expect(c.querySelector('.rb-card__head')).toBeNull();
    expect(c.textContent).toContain('Inhalt');
  });
  it('mit title + meta rendert Kopf', () => {
    const c = card({ title: 'Elvanse', meta: '30 mg' });
    expect(c.querySelector('.rb-card__title').textContent).toBe('Elvanse');
    expect(c.querySelector('.rb-card__meta').textContent).toBe('30 mg');
  });
  it('actions werden rechts eingehängt', () => {
    const btn = document.createElement('button');
    expect(card({ title: 'x', actions: [btn] }).querySelector('.rb-card__actions').firstChild).toBe(btn);
  });
});
