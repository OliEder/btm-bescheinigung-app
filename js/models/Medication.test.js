import { describe, it, expect } from 'vitest';
import { Medication } from './Medication.js';

describe('Medication concentration Felder', () => {
    it('nimmt getrennte Felder concentrationValue/concentrationUnit an', () => {
        const m = new Medication({ name: 'Concerta', form: 'Retardtablette',
            substance: 'Methylphenidat', concentrationValue: 36, concentrationUnit: 'mg' });
        expect(m.concentrationValue).toBe(36);
        expect(m.concentrationUnit).toBe('mg');
    });
    it('leitet Value/Unit aus altem concentration-String ab (Migration)', () => {
        const m = new Medication({ name: 'Ritalin', form: 'Tablette',
            substance: 'Methylphenidat', concentration: '10mg' });
        expect(m.concentrationValue).toBe(10);
        expect(m.concentrationUnit).toBe('mg');
    });
    it('concentration-Getter liefert kombinierte Anzeige', () => {
        const m = new Medication({ concentrationValue: 36, concentrationUnit: 'mg' });
        expect(m.concentration).toBe('36mg');
    });
    it('validate() ist gueltig bei positivem Value und Unit', () => {
        const m = new Medication({ name: 'X', form: 'Tablette', substance: 'Y',
            concentrationValue: 20, concentrationUnit: 'mg' });
        expect(m.validate().isValid).toBe(true);
    });
    it('validate() meldet Fehler bei fehlender Konzentration', () => {
        const m = new Medication({ name: 'X', form: 'Tablette', substance: 'Y',
            concentrationValue: 0, concentrationUnit: '' });
        expect(m.validate().isValid).toBe(false);
    });
});

describe('DosageScheme', () => {
    it('bleibt benannter Export mit dailyDose/notation', async () => {
        const mod = await import('./Medication.js');
        expect(mod.DosageScheme).toBeDefined();
        const d = new mod.DosageScheme({ morning: 1, noon: 0, evening: 1, night: 0 });
        expect(d.dailyDose).toBe(2);
        expect(d.notation).toBe('1-0-1');
    });
});

describe('DosageScheme Grund/ICD-Felder', () => {
    it('nimmt reasonLabel/reasonIcd10/reasonNote an', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const d = new DosageScheme({ reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: 'Dosis erhöht' });
        expect(d.reasonLabel).toBe('ADHS');
        expect(d.reasonIcd10).toBe('F90.0');
        expect(d.reasonNote).toBe('Dosis erhöht');
    });
    it('liest Alt-Feld notes als reasonNote (Rueckwaertskompat.)', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const d = new DosageScheme({ notes: 'alt' });
        expect(d.reasonNote).toBe('alt');
    });
    it('toJSON enthaelt reason-Felder und kein notes', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const j = new DosageScheme({ reasonLabel: 'X', reasonIcd10: 'Y', reasonNote: 'Z' }).toJSON();
        expect(j).toMatchObject({ reasonLabel: 'X', reasonIcd10: 'Y', reasonNote: 'Z' });
        expect(j).not.toHaveProperty('notes');
    });
});

describe('DosageScheme weekdays (nicht-taeglich)', () => {
    it('nimmt weekdays an; Default leer', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).weekdays).toEqual([]);
        expect(new DosageScheme({ weekdays: ['Mo', 'Di'] }).weekdays).toEqual(['Mo', 'Di']);
    });
    it('isDaily: leer oder alle 7 -> true; Teilmenge -> false', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).isDaily).toBe(true);
        expect(new DosageScheme({ weekdays: ['Mo','Di','Mi','Do','Fr','Sa','So'] }).isDaily).toBe(true);
        expect(new DosageScheme({ weekdays: ['Mo','Di','So'] }).isDaily).toBe(false);
    });
    it('toJSON: weekdays weglassen bei taeglich, ausgeben bei Teilmenge', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).toJSON()).not.toHaveProperty('weekdays');
        expect(new DosageScheme({ weekdays: ['Mo','Di','So'] }).toJSON().weekdays).toEqual(['Mo','Di','So']);
    });
});
