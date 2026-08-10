import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { DataStore } from '../js/models/DataStore.js';
import { buildCertificateBytes } from '../js/controllers/PDFController.js';

// Regression: gespeicherte selectedMedications im Alt-Vokabular (name/form/
// substance/concentration) müssen nach dem Laden vollständig ins BtM-Formular
// gelangen (Felder Handelsbezeichnung/Darreichungsform/Wirkstoff). Vgl. Bug:
// geladene Medikamente erzeugten leere Felder (13/14/15).
const tpl = () => new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));

const OLD_EXPORT = JSON.stringify({
  patients: [], doctors: [], medications: [],
  selectedMedications: [{
    id: 1755696350085.935, name: 'Ritalin Adult', form: 'Kapsel',
    substance: 'Methylphenidat', concentration: '10mg', btmCategory: 'BTM',
  }],
  currentPatient: { firstname: 'Max', lastname: 'Mustermann', birthdate: '1990-01-01',
    passport: 'X1', birthplace: 'Berlin', nationality: 'deutsch', gender: 'maennlich',
    street: 'Weg 1', zip: '10115', city: 'Berlin' },
  currentDoctor: { title: 'Dr. med.', firstname: 'Erika', lastname: 'Schmidt', address: 'Klinikweg 2' },
  travelData: { start: '2026-08-10', end: '2026-08-24', duration: 15 },
  dosageSchemes: { '1755696350085.935': [
    { startDate: '2026-08-10', endDate: '2026-08-24', morning: 1, noon: 0, evening: 0, night: 0 },
  ] },
  patientDoctorLinks: [], version: '1.0.0',
});

describe('Geladene Alt-Medikamente im BtM-Formular', () => {
  it('hydriert selectedMedications mit Bescheinigungs-Feldern', () => {
    const store = new DataStore();
    expect(store.importData(OLD_EXPORT)).toBe(true);
    const med = store.data.selectedMedications[0];
    expect(med.handelsname).toBe('Ritalin Adult');
    expect(med.wirkstoff).toBe('Methylphenidat');
    expect(med.darreichungsform).toBe('Kapsel');
    expect(med.concentrationValue).toBe(10);
    expect(med.concentrationUnit).toBe('mg');
  });

  it('befüllt Handelsbezeichnung/Darreichungsform/Wirkstoff im Formular (flatten:false)', async () => {
    const store = new DataStore();
    store.importData(OLD_EXPORT);
    const s = store.data;
    const med = s.selectedMedications[0];
    const { fillCertificate } = await import('../js/services/PdfFormFiller.js');
    const bytes = await fillCertificate(tpl(), {
      patient: s.currentPatient, doctor: s.currentDoctor, travel: s.travelData,
      medication: med, blocks: s.dosageSchemes[med.id] || [], flatten: false,
    });
    const form = (await PDFDocument.load(bytes)).getForm();
    const get = (n) => form.getTextField(n).getText() || '';
    expect(get('Handelsbezeichnung oder Sonderzubereitung')).toBe('Ritalin Adult');
    expect(get('Darreichungsform')).toBe('Kapsel');
    expect(get('Internationale Bezeichnung des Wirkstoffs')).toBe('Methylphenidat');
  });

  it('generiert ein geflattetes PDF (buildCertificateBytes) ohne Formularfelder', async () => {
    const store = new DataStore();
    store.importData(OLD_EXPORT);
    const med = store.data.selectedMedications[0];
    const bytes = await buildCertificateBytes(tpl(), store.data, med.id);
    const out = await PDFDocument.load(bytes);
    expect(out.getForm().getFields().length).toBe(0); // geflattet
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
