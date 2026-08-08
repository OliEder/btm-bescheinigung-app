import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';

describe('Migration bestehender ADHS-Resources', () => {
    it('jede Resource hat substanceId und btmStatus', () => {
        for (const m of meds) {
            expect(m.substanceId, m.id).toBeTruthy();
            expect(['btm', 'ausgenommen', 'kein_btm'], m.id).toContain(m.btmStatus);
        }
    });
    it('Methylphenidat-Resource traegt substanceId methylphenidat', () => {
        const m = meds.find((x) => x.ingredient?.[0]?.itemCodeableConcept?.text === 'Methylphenidat');
        expect(m.substanceId).toBe('methylphenidat');
    });
    it('Guanfacin-Resource-ATC ist auf N06BA21 korrigiert', () => {
        const g = meds.find((x) => x.substanceId === 'guanfacin');
        expect(g.code.coding[0].code).toBe('N06BA21');
    });
    it('btmCategory bleibt aus btmStatus abgeleitet konsistent', () => {
        for (const m of meds) {
            const expected = m.btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM';
            expect(m.btmCategory, m.id).toBe(expected);
        }
    });
});
