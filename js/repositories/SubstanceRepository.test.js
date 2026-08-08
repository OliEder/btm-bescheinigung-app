import { describe, it, expect } from 'vitest';
import { SubstanceRepository } from './SubstanceRepository.js';

const data = {
    morphin: {
        name: 'Morphin', atc: ['N02AA01'], atcGroup: 'N02AA Natürliche Opium-Alkaloide',
        indications: [
            { label: 'Starke chronische Schmerzen', icd10: 'R52.2', icd11: 'MG30.0' },
        ],
    },
};

describe('SubstanceRepository', () => {
    const repo = new SubstanceRepository(data);

    it('findById liefert den Wirkstoff-Eintrag', () => {
        expect(repo.findById('morphin').name).toBe('Morphin');
        expect(repo.findById('morphin').atc).toContain('N02AA01');
    });
    it('findById gibt null bei Unbekanntem', () => {
        expect(repo.findById('unbekannt')).toBeNull();
    });
    it('indicationsFor liefert Indikationen mit icd10 und icd11', () => {
        const ind = repo.indicationsFor('morphin');
        expect(ind).toHaveLength(1);
        expect(ind[0]).toMatchObject({ icd10: 'R52.2', icd11: 'MG30.0' });
    });
    it('indicationsFor gibt leeres Array bei Unbekanntem', () => {
        expect(repo.indicationsFor('unbekannt')).toEqual([]);
    });
});
