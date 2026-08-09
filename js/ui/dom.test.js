import { describe, it, expect, vi } from 'vitest';
import { el, on, clear, text } from './dom.js';

describe('dom.el', () => {
  it('erzeugt Element mit Tag, Klasse und Attributen', () => {
    const node = el('button', { class: 'btn', type: 'button', 'aria-label': 'x' });
    expect(node.tagName).toBe('BUTTON');
    expect(node.className).toBe('btn');
    expect(node.getAttribute('type')).toBe('button');
    expect(node.getAttribute('aria-label')).toBe('x');
  });
  it('akzeptiert className-Alias und Style-Objekt', () => {
    const node = el('div', { className: 'a', style: { color: 'red', marginTop: '4px' } });
    expect(node.className).toBe('a');
    expect(node.style.color).toBe('red');
    expect(node.style.marginTop).toBe('4px');
  });
  it('hängt String-Kinder als textContent an (Escaping)', () => {
    const node = el('div', {}, ['<scr'+'ipt>alert(1)</scr'+'ipt>']);
    expect(node.childNodes.length).toBe(1);
    expect(node.querySelector('scr'+'ipt')).toBeNull();
    expect(node.textContent).toBe('<scr'+'ipt>alert(1)</scr'+'ipt>');
  });
  it('hängt Element-Kinder an', () => {
    const child = el('span', {}, ['hi']);
    const node = el('div', {}, [child]);
    expect(node.firstChild).toBe(child);
    expect(node.textContent).toBe('hi');
  });
  it('bindet Event-Handler über on{Event}', () => {
    const fn = vi.fn();
    const node = el('button', { onClick: fn });
    node.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('dom.on/clear/text', () => {
  it('on liefert funktionierende Abmelde-Funktion', () => {
    const fn = vi.fn();
    const node = el('button');
    const off = on(node, 'click', fn);
    node.click();
    off();
    node.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('clear entfernt alle Kinder', () => {
    const node = el('div', {}, [el('span'), el('span')]);
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });
  it('text setzt textContent', () => {
    const node = el('div');
    text(node, 'hallo');
    expect(node.textContent).toBe('hallo');
  });
});
