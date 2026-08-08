import { describe, it, expect } from 'vitest';
import { MedicationInstance } from './MedicationInstance.js';

describe('MedicationInstance (Snapshot)', () => {
    it('erzeugt Snapshot aus FHIR-Resource + Staerke', () => {
        const inst = MedicationInstance.fromRepository(
            { id: 'concerta-36mg', productFamily: 'Concerta',
              form: { text: 'Retardtablette' },
              ingredient: [{ itemCodeableConcept: { text: 'Methylphenidat' },
                             strength: { numerator: { value: 36, unit: 'mg' } } }] });
        expect(inst.medicationRefId).toBe('concerta-36mg');
        expect(inst.isCustom).toBe(false);
        expect(inst.handelsname).toBe('Concerta');
        expect(inst.wirkstoff).toBe('Methylphenidat');
        expect(inst.darreichungsform).toBe('Retardtablette');
        expect(inst.concentrationValue).toBe(36);
        expect(inst.concentrationUnit).toBe('mg');
        expect(typeof inst.id).toBe('string');
    });

    it('erzeugt Custom-Instanz (isCustom, kein refId)', () => {
        const inst = MedicationInstance.custom({ handelsname: 'Eigenpraeparat',
            wirkstoff: 'X', darreichungsform: 'Tablette',
            concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.isCustom).toBe(true);
        expect(inst.medicationRefId).toBeNull();
        expect(inst.validate().isValid).toBe(true);
    });

    it('validate meldet Fehler bei fehlenden Pflichtfeldern', () => {
        const inst = MedicationInstance.custom({ handelsname: '' });
        expect(inst.validate().isValid).toBe(false);
    });
});

describe('MedicationInstance reasonSuggestions (Grund/ICD)', () => {
    it('uebernimmt reasonSuggestions aus der Resource', () => {
        const inst = MedicationInstance.fromRepository({
            id: 'x', productFamily: 'Concerta', form: { text: 'Retardtablette' },
            ingredient: [{ itemCodeableConcept: { text: 'Methylphenidat' },
                strength: { numerator: { value: 36, unit: 'mg' } } }],
            reasonSuggestions: [{ label: 'ADHS (mit Hyperaktivität)', icd10: 'F90.0', icd11: '6A05.1' }],
        });
        expect(inst.reasonSuggestions).toHaveLength(1);
        expect(inst.reasonSuggestions[0].icd10).toBe('F90.0');
    });
    it('leere Liste ohne reasonSuggestions', () => {
        const inst = MedicationInstance.fromRepository({ id: 'y', productFamily: 'X',
            form: { text: 'Tablette' }, ingredient: [{ itemCodeableConcept: { text: 'W' },
                strength: { numerator: { value: 5, unit: 'mg' } } }] });
        expect(inst.reasonSuggestions).toEqual([]);
    });
    it('custom-Instanz hat leere reasonSuggestions', () => {
        const inst = MedicationInstance.custom({ handelsname: 'Eigen', wirkstoff: 'X',
            darreichungsform: 'Tablette', concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.reasonSuggestions).toEqual([]);
    });
    it('toJSON enthaelt reasonSuggestions', () => {
        const inst = new MedicationInstance({ handelsname: 'A', wirkstoff: 'B',
            darreichungsform: 'Tablette', concentrationValue: 1, concentrationUnit: 'mg',
            reasonSuggestions: [{ label: 'L', icd10: 'X', icd11: 'Y' }] });
        expect(inst.toJSON().reasonSuggestions).toHaveLength(1);
    });
});
