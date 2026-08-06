import { describe, it, expect } from 'vitest';
import medications from '../../data/medications.json';
import { MedicationRepository } from './MedicationRepository.js';

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
