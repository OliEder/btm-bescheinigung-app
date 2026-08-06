import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildCertificateBytes } from './PDFController.js';

const templateBytes = new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));

describe('PDFController.buildCertificateBytes', () => {
    it('erzeugt eine geflattete PDF aus Session-Daten', async () => {
        const session = {
            currentPatient: { lastname: 'Muster', firstname: 'Max', passport: 'C01X00T47',
                birthplace: 'Berlin', birthdate: '1990-05-01', nationality: 'deutsch',
                gender: 'maennlich', street: 'Hauptstr. 1', zip: '10115', city: 'Berlin' },
            currentDoctor: { title: 'Dr. med.', lastname: 'Aerztin', firstname: 'Anna',
                phone: '030-1234', address: 'Praxisweg 2, 10117 Berlin' },
            travelData: { start: '2026-08-10', end: '2026-08-24', duration: 15 },
            selectedMedications: [{ handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
                darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg',
                id: 'm1' }],
            dosageSchemes: { m1: [
                { startDate: '2026-08-10', endDate: '2026-08-24', morning: 1, noon: 0, evening: 1, night: 0 },
            ] },
        };
        const bytes = await buildCertificateBytes(templateBytes, session, 'm1');
        const out = await PDFDocument.load(bytes);
        expect(out.getForm().getFields().length).toBe(0);
    });
});
