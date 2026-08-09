import { describe, it, expect } from 'vitest';
import { icon } from './Icon.js';
import { ICON_DATA } from './icon-data.js';

describe('icon()', () => {
  it('liefert ein span mit svg-Kind der gewünschten Größe', () => {
    const node = icon('user', { size: 18 });
    expect(node.tagName).toBe('SPAN');
    const svg = node.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
  });
  it('setzt die Wrapper-Farbe', () => {
    const node = icon('plane', { color: 'var(--color-primary-700)' });
    expect(node.style.color).toBe('var(--color-primary-700)');
  });
  it('mit label: role=img + aria-label', () => {
    const node = icon('info', { label: 'Hinweis' });
    expect(node.getAttribute('role')).toBe('img');
    expect(node.getAttribute('aria-label')).toBe('Hinweis');
  });
  it('ohne label: aria-hidden', () => {
    const node = icon('info');
    expect(node.getAttribute('aria-hidden')).toBe('true');
  });
  it('unbekannter Name: leeres span, kein Wurf', () => {
    const node = icon('gibtsnicht');
    expect(node.tagName).toBe('SPAN');
    expect(node.querySelector('svg')).toBeNull();
  });
  it('alle 25 Icons sind vorhanden', () => {
    expect(Object.keys(ICON_DATA).length).toBe(25);
    for (const name of ['alert-circle','arrow-left','arrow-right','check','check-circle','check-circle-2','chevron-down','circle-x','database','download','file-cog','file-text','folder-open','info','link','pill','plane','plus','save','search','stethoscope','trash-2','triangle-alert','upload','user']) {
      expect(ICON_DATA[name]).toBeTruthy();
    }
  });
});
