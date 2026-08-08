import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';

const byId = (id) => meds.find((m) => m.id === id);

describe('Opioid-Präparate in medications.json', () => {
    it('Morphin-Retardtablette 30 mg existiert mit substanceId + btmStatus', () => {
        const m = byId('mst-continus-30mg');
        expect(m).toBeTruthy();
        expect(m.substanceId).toBe('morphin');
        expect(m.form.text).toBe('Retardtablette');
        expect(m.btmStatus).toBe('btm');
        expect(m.ingredient[0].strength.numerator).toMatchObject({ value: 30, unit: 'mg' });
    });
    it('Fentanyl-Pflaster traegt Einheit µg/h und amtliche Form', () => {
        const m = byId('durogesic-25ugh');
        expect(m.form.text).toBe('transdermales Pflaster');
        expect(m.ingredient[0].strength.numerator.unit).toBe('µg/h');
        expect(m.substanceId).toBe('fentanyl');
    });
    it('Effentora-Buccaltablette traegt Einheit µg', () => {
        const m = byId('effentora-200ug');
        expect(m.form.text).toBe('Buccaltablette');
        expect(m.ingredient[0].strength.numerator.unit).toBe('µg');
    });
    it('Tilidin-retard ist btmStatus ausgenommen mit Hinweis', () => {
        const m = meds.find((x) => x.substanceId === 'tilidin-naloxon');
        expect(m.btmStatus).toBe('ausgenommen');
        expect(m.btmHinweis).toMatch(/ausgenommen/i);
        expect(m.btmCategory).toBe('Nicht-BTM');
    });
});
