import { describe, it, expect } from 'vitest';
import medications from '../../data/medications.json';
import { MedicationRepository } from './MedicationRepository.js';
import { SubstanceRepository } from './SubstanceRepository.js';
import substances from '../../data/substances.json';

const repo = new MedicationRepository(medications);

describe('MedicationRepository', () => {
    it('findAll liefert alle Resources', () => {
        expect(repo.findAll().length).toBeGreaterThan(30);
    });
    it('findById findet per FHIR-id', () => {
        expect(repo.findById('concerta-36mg')?.productFamily).toBe('Concerta');
    });
    it('search gruppiert nach productFamily (Kinecteen mit 4 Staerken)', () => {
        const families = repo.search('kinecteen');
        expect(families).toHaveLength(1);
        expect(families[0].productFamily).toBe('Kinecteen');
        expect(families[0].strengths.map((s) => s.concentrationValue).sort((a, b) => a - b))
            .toEqual([18, 27, 36, 54]);
    });
    it('search ist case-insensitiv und matcht Wirkstoff', () => {
        expect(repo.search('methylphenidat').length).toBeGreaterThan(0);
    });
});

describe('MedicationRepository — substanceId-Join (reasonSuggestions)', () => {
    const subRepo = new SubstanceRepository(substances);
    const repo = new MedicationRepository(medications, subRepo);

    it('Morphin-Resource bekommt reasonSuggestions mit R52.2', () => {
        const m = repo.findAll().find((r) => r.substanceId === 'morphin');
        const labels = m.reasonSuggestions.map((s) => s.icd10);
        expect(labels).toContain('R52.2');
    });
    it('ADHS-Resource bekommt die F90-Liste', () => {
        const m = repo.findAll().find((r) => r.substanceId === 'methylphenidat');
        expect(m.reasonSuggestions.map((s) => s.icd10)).toContain('F90.0');
    });
    it('ohne SubstanceRepo bleibt reasonSuggestions leer', () => {
        const bare = new MedicationRepository(medications);
        expect(bare.findAll()[0].reasonSuggestions).toEqual([]);
    });
    it('Resource ohne substanceId-Treffer -> leere Liste', () => {
        const repo2 = new MedicationRepository(
            [{ id: 'x', substanceId: 'gibtsnicht', ingredient: [], code: {}, form: {} }], subRepo);
        expect(repo2.findAll()[0].reasonSuggestions).toEqual([]);
    });
});
