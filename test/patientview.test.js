import { describe, it, expect } from 'vitest';
import { PatientView } from '../js/views/PatientView.js';

function mount() {
  const view = new PatientView();
  document.body.replaceChildren(view.render());
  return view;
}

describe('PatientView (Node-Factory)', () => {
  it('render() liefert Node mit allen Feld-IDs', () => {
    mount();
    for (const id of ['patient-lastname','patient-firstname','patient-passport','patient-birthplace',
      'patient-birthdate','patient-nationality','patient-gender','patient-street','patient-zip','patient-city']) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(document.getElementById('patient-form')).not.toBeNull();
  });
  it('kein Speichern-Button, aber Laden-Button', () => {
    mount();
    expect([...document.querySelectorAll('button')].some((b) => /speichern/i.test(b.textContent))).toBe(false);
    expect(document.getElementById('load-patient-btn')).not.toBeNull();
  });
  it('nur optionale Felder tragen "(optional)"; keine Label mit *', () => {
    mount();
    expect(document.body.textContent).toContain('(optional)');
    const labels = [...document.querySelectorAll('.rb-field__label')].map((l) => l.textContent);
    expect(labels.every((t) => !t.includes('*'))).toBe(true);
  });
  it('getFormData liest Feldwerte', () => {
    const view = mount();
    document.getElementById('patient-lastname').value = 'Muster';
    expect(view.getFormData().lastname).toBe('Muster');
  });
  it('showMissing markiert Felder (Pflichtfeld-Text erscheint)', () => {
    const view = mount();
    view.showMissing(['firstname']);
    expect(document.body.textContent).toContain('Pflichtfeld');
  });
});
