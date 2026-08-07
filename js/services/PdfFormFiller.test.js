import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { fillCertificate } from './PdfFormFiller.js';

const templateBytes = new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));

const patient = { lastname: 'Muster', firstname: 'Max', passport: 'C01X00T47',
    birthplace: 'Berlin', birthdate: '1990-05-01', nationality: 'deutsch',
    gender: 'maennlich', street: 'Hauptstr. 1', zip: '10115', city: 'Berlin' };
const doctor = { title: 'Dr. med.', lastname: 'Aerztin', firstname: 'Anna',
    phone: '030-1234', address: 'Praxisweg 2, 10117 Berlin' };
const travel = { start: '2026-08-10', end: '2026-08-24', duration: 15 };
const medication = { handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
    darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg' };
const blocks = [
    { startDate: '2026-08-10', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
    { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
];

describe('fillCertificate', () => {
    it('befuellt Patient/Arzt/Medikament und flattet das Formular', async () => {
        const bytes = await fillCertificate(templateBytes, { patient, doctor, travel, medication, blocks });
        const out = await PDFDocument.load(bytes);
        expect(out.getForm().getFields().length).toBe(0);
        expect(bytes.byteLength).toBeGreaterThan(1000);
    });

    it('befuellt Patient/Medikament, laesst Signatur-/Behoerdenfelder leer (flatten:false)', async () => {
        const bytes = await fillCertificate(templateBytes,
            { patient, doctor, travel, medication, blocks, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        const get = (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
        expect(get('Name_2')).toBe('Muster');
        expect(get('Staatsangehoerigkeit')).toBe('deutsch');
        expect(get('Handelsbezeichnung oder Sonderzubereitung')).toBe('Concerta');
        expect(get('Gesamtwirkstoffmenge')).toContain('1476');
        expect(get('Datum')).toBe('');
        expect(get('Unterschrift des Arztes')).toBe('');
        expect(get('Stempel der Behörde')).toBe('');
    });
});
