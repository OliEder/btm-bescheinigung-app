import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMedicationPlanRows, buildMedicationPlan } from './MedicationPlanBuilder.js';

const patient = { lastname: 'Muster', firstname: 'Max', birthdate: '1985-03-15' };
const doctor = { title: 'Dr. med.', lastname: 'Schmidt', firstname: 'Thomas',
    address: 'Bahnhofstr. 15, 90518 Altdorf' };
const meds = [
    { id: 'm1', handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
      darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg' },
];
const schemes = {
    m1: [
        { startDate: '2026-08-10', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
        { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
    ],
};

describe('buildMedicationPlanRows (§31a SGB V Spalten)', () => {
    const rows = buildMedicationPlanRows(meds, schemes);

    it('erzeugt eine Zeile pro Dosierblock (Titration)', () => {
        expect(rows).toHaveLength(2);
    });

    it('enthaelt die BMP-Pflichtangaben je Zeile', () => {
        const r = rows[0];
        expect(r.wirkstoff).toBe('Methylphenidat');
        expect(r.handelsname).toBe('Concerta');
        expect(r.staerke).toBe('36 mg');
        expect(r.form).toBe('Retardtablette');
        expect(r.morgens).toBe('1');
        expect(r.mittags).toBe('0');
        expect(r.abends).toBe('1');
        expect(r.nachts).toBe('0');
        expect(r.einheit).toBe('Stück');
    });

    it('vermerkt den Zeitraum im Hinweise-Feld bei mehreren Bloecken', () => {
        expect(rows[0].hinweise).toContain('10.08.');
        expect(rows[1].hinweise).toContain('24.08.');
    });
});

describe('buildMedicationPlan (PDF)', () => {
    it('erzeugt ein Querformat-PDF mit Inhalt', async () => {
        const bytes = await buildMedicationPlan({ patient, doctor, medications: meds,
            dosageSchemes: schemes, printDate: '2026-08-06' });
        const doc = await PDFDocument.load(bytes);
        const page = doc.getPage(0);
        const { width, height } = page.getSize();
        expect(width).toBeGreaterThan(height); // Querformat
        expect(bytes.byteLength).toBeGreaterThan(500);
    });
});
