import { describe, it, expect } from 'vitest';
import substances from '../data/substances.json';

describe('substances.json', () => {
    it('enthaelt ADHS- und Opioid-Wirkstoffe', () => {
        for (const id of ['methylphenidat', 'guanfacin', 'morphin', 'fentanyl',
            'tilidin-naloxon', 'buprenorphin', 'oxycodon-naloxon']) {
            expect(substances[id], id).toBeTruthy();
        }
    });
    it('Guanfacin traegt N06BA21 (ADHS-Kontext)', () => {
        expect(substances.guanfacin.atc).toContain('N06BA21');
    });
    it('jede Indikation hat label, icd10 und icd11', () => {
        for (const [id, s] of Object.entries(substances)) {
            expect(Array.isArray(s.indications), id).toBe(true);
            for (const ind of s.indications) {
                expect(ind.label, id).toBeTruthy();
                expect(ind.icd10, id).toBeTruthy();
                expect(ind.icd11, id).toBeTruthy();
            }
        }
    });
    it('jeder Wirkstoff hat name, atc-Liste und atcGroup', () => {
        for (const [id, s] of Object.entries(substances)) {
            expect(s.name, id).toBeTruthy();
            expect(Array.isArray(s.atc), id).toBe(true);
            expect(s.atcGroup, id).toBeTruthy();
        }
    });
});
