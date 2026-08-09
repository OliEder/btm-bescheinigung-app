import { describe, it, expect } from 'vitest';
import { openModal, confirmModal, chooseModal } from './Modal.js';

describe('openModal()', () => {
  it('hängt ein Overlay an document.body und close() entfernt es', () => {
    const { close } = openModal({ title: 'Titel', body: 'Text', actions: [] });
    const overlay = document.querySelector('.rb-modal__backdrop');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('.rb-modal').getAttribute('role')).toBe('dialog');
    expect(overlay.querySelector('.rb-modal').getAttribute('aria-modal')).toBe('true');
    close();
    expect(document.querySelector('.rb-modal__backdrop')).toBeNull();
  });
  it('Escape schließt (dismissible)', () => {
    openModal({ title: 'X', body: 'x' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.rb-modal__backdrop')).toBeNull();
  });
});
describe('confirmModal()', () => {
  it('resolved true beim Bestätigen', async () => {
    const p = confirmModal({ title: 'Löschen?', message: 'Sicher?' });
    document.querySelector('.rb-modal__actions .rb-btn--primary').click();
    await expect(p).resolves.toBe(true);
  });
  it('resolved false beim Abbrechen', async () => {
    const p = confirmModal({ title: 'Löschen?', message: 'Sicher?' });
    const buttons = document.querySelectorAll('.rb-modal__actions .rb-btn');
    buttons[0].click();
    await expect(p).resolves.toBe(false);
  });
});
describe('chooseModal()', () => {
  it('resolved das gewählte Item', async () => {
    const items = [{ id: 1, name: 'Meier' }, { id: 2, name: 'Schmidt' }];
    const p = chooseModal({ title: 'Patient laden', items, renderItem: (it) => it.name });
    const rows = document.querySelectorAll('.rb-modal__item');
    expect(rows.length).toBe(2);
    rows[1].click();
    await expect(p).resolves.toEqual({ id: 2, name: 'Schmidt' });
  });
  it('resolved null bei Abbruch (Escape)', async () => {
    const p = chooseModal({ title: 'x', items: [{ id: 1, name: 'a' }], renderItem: (it) => it.name });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(p).resolves.toBeNull();
  });
});
