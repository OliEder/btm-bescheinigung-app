import { describe, it, expect } from 'vitest';
import { alert } from './Alert.js';

describe('alert()', () => {
  it('info → role=status + info-Klasse + Icon', () => {
    const a = alert({ tone: 'info', children: 'Hinweis' });
    expect(a.classList.contains('rb-alert--info')).toBe(true);
    expect(a.getAttribute('role')).toBe('status');
    expect(a.querySelector('svg')).not.toBeNull();
    expect(a.textContent).toContain('Hinweis');
  });
  it('danger und warning → role=alert', () => {
    expect(alert({ tone: 'danger', children: 'x' }).getAttribute('role')).toBe('alert');
    expect(alert({ tone: 'warning', children: 'x' }).getAttribute('role')).toBe('alert');
  });
  it('unbekannter Ton → info', () => {
    expect(alert({ tone: 'zz', children: 'x' }).classList.contains('rb-alert--info')).toBe(true);
  });
  it('children als Node', () => {
    const strong = document.createElement('strong'); strong.textContent = 'wichtig';
    expect(alert({ tone: 'success', children: strong }).querySelector('strong')).toBe(strong);
  });
});
