import { describe, it, expect } from 'vitest';
import medications from '../../data/medications.json';
import { MedicationRepository } from '../repositories/MedicationRepository.js';
import { MedicationController } from './MedicationController.js';

function makeController() {
    const model = { data: { selectedMedications: [], dosageSchemes: {} }, save() {} };
    const view = { updateSelectedMedications() {} };
    return new MedicationController(model, view, new MedicationRepository(medications));
}

describe('MedicationController Auswahl-Flow', () => {
    it('liefert Familien-Vorschlaege fuer Autocomplete', () => {
        const ctrl = makeController();
        expect(ctrl.suggest('concer').some((s) => s.productFamily === 'Concerta')).toBe(true);
    });

    it('listet waehlbare Staerken einer Familie', () => {
        const ctrl = makeController();
        expect(ctrl.strengthsFor('Concerta').map((s) => s.concentrationValue).sort((a, b) => a - b))
            .toEqual([18, 27, 36, 54]);
    });

    it('erzeugt eine MedicationInstance-Snapshot aus refId', () => {
        const ctrl = makeController();
        const inst = ctrl.addFromRepository('concerta-36mg');
        expect(inst.isCustom).toBe(false);
        expect(inst.handelsname).toBe('Concerta');
        expect(inst.concentrationValue).toBe(36);
    });

    it('erzeugt eine Custom-Instanz bei manueller Eingabe', () => {
        const ctrl = makeController();
        const inst = ctrl.addCustom({ handelsname: 'Eigen', wirkstoff: 'X',
            darreichungsform: 'Tablette', concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.isCustom).toBe(true);
    });
});
