import { describe, it, expect } from 'vitest';
import { DoctorView } from '../js/views/DoctorView.js';

function mount() {
  const view = new DoctorView();
  document.body.replaceChildren(view.render());
  return view;
}

describe('DoctorView (Node-Factory)', () => {
  it('render() liefert Node mit allen Feld-IDs', () => {
    mount();
    for (const id of ['doctor-title','doctor-lastname','doctor-firstname','doctor-phone','doctor-address']) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(document.getElementById('doctor-form')).not.toBeNull();
  });
  it('kein Speichern-Button; Laden/Suchen/Verknüpfen vorhanden', () => {
    mount();
    expect([...document.querySelectorAll('button')].some((b) => /speichern/i.test(b.textContent))).toBe(false);
    expect(document.getElementById('load-doctor-btn')).not.toBeNull();
    expect(document.getElementById('search-doctor-btn')).not.toBeNull();
    expect(document.getElementById('link-patient-doctor-btn')).not.toBeNull();
  });
  it('nur title trägt "(optional)"; keine Label mit *', () => {
    mount();
    expect(document.body.textContent).toContain('(optional)');
    const labels = [...document.querySelectorAll('.rb-field__label')].map((l) => l.textContent);
    expect(labels.every((t) => !t.includes('*'))).toBe(true);
  });
  it('getFormData/populateForm über IDs', () => {
    const view = mount();
    view.populateForm({ title: 'Prof.', lastname: 'Schmidt', firstname: 'E', phone: '030', address: 'Weg 2' });
    expect(view.getFormData().lastname).toBe('Schmidt');
    expect(view.getFormData().title).toBe('Prof.');
  });
  it('showMissing markiert Felder', () => {
    const view = mount();
    view.showMissing(['address']);
    expect(document.body.textContent).toContain('Pflichtfeld');
  });
});
