import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';
import substances from '../data/substances.json';

const ALLOWED_UNITS = ['mg', 'µg', 'µg/h'];

describe('Datenintegritaet substances/medications', () => {
    it('jede substanceId einer Resource existiert in substances.json', () => {
        for (const m of meds) {
            expect(substances[m.substanceId], `${m.id} -> ${m.substanceId}`).toBeTruthy();
        }
    });
    it('jede Staerke hat value>0 und eine erlaubte Einheit', () => {
        for (const m of meds) {
            const num = m.ingredient?.[0]?.strength?.numerator;
            expect(num?.value, m.id).toBeGreaterThan(0);
            expect(ALLOWED_UNITS, m.id).toContain(num?.unit);
        }
    });
    it('Tilidin-retard ist ausgenommen mit Hinweis', () => {
        const t = meds.find((m) => m.substanceId === 'tilidin-naloxon');
        expect(t.btmStatus).toBe('ausgenommen');
        expect(t.btmHinweis).toBeTruthy();
    });
});
