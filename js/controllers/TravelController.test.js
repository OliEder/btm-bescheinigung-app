import { describe, it, expect } from 'vitest';
import { TravelController } from './TravelController.js';

function makeModel(selectedMeds, schemes = {}) {
    return {
        data: {
            travelData: { start: '2026-08-10', end: '2026-08-24' },
            selectedMedications: selectedMeds,
            dosageSchemes: schemes,
        },
        save() {},
        updateDosageScheme(medId, idx, scheme) {
            (this.data.dosageSchemes[medId] ||= [])[idx] = scheme;
        },
    };
}
const view = { updateDosageSchemes() {} };

describe('TravelController.addDosageScheme — Vorausfuellen Grund', () => {
    it('erster Block: Grund aus erstem reasonSuggestion der Instanz', () => {
        const model = makeModel([{ id: 'm1', reasonSuggestions: [
            { label: 'ADHS', icd10: 'F90.0', icd11: '6A05.1' }] }]);
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        const block = model.data.dosageSchemes.m1[0];
        expect(block.reasonLabel).toBe('ADHS');
        expect(block.reasonIcd10).toBe('F90.0');
    });
    it('Folgeblock: Grund vom Vorblock, reasonNote leer', () => {
        const model = makeModel(
            [{ id: 'm1', reasonSuggestions: [{ label: 'ADHS', icd10: 'F90.0' }] }],
            { m1: [{ startDate: '2026-08-10', endDate: '2026-08-12',
                reasonLabel: 'Eigen', reasonIcd10: '', reasonNote: 'x' }] });
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        const block = model.data.dosageSchemes.m1[1];
        expect(block.reasonLabel).toBe('Eigen');
        expect(block.reasonIcd10).toBe('');
        expect(block.reasonNote).toBe('');
    });
    it('ohne reasonSuggestions: Grund leer', () => {
        const model = makeModel([{ id: 'm1', reasonSuggestions: [] }]);
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        expect(model.data.dosageSchemes.m1[0].reasonLabel).toBe('');
    });
});
