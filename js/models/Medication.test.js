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
