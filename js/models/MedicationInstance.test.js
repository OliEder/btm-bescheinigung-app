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
