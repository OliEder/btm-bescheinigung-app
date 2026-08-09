import { describe, it, expect } from 'vitest';
import { TravelController } from './TravelController.js';
import { roundToQuarter } from '../utils/DosageRound.js';

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

describe('TravelController.updateScheme — Bruchteile + weekdays', () => {
    function setInputs(medId, idx, vals) {
        document.body.innerHTML = '';
        const mk = (id, value) => { const el = document.createElement('input'); el.id = id; el.value = value; document.body.appendChild(el); };
        const sid = `${medId}-${idx}`;
        mk(`scheme-start-${sid}`, vals.start || '2026-08-10');
        mk(`scheme-end-${sid}`, vals.end || '2026-08-24');
        mk(`dose-morning-${sid}`, vals.morning ?? '0');
        mk(`dose-noon-${sid}`, vals.noon ?? '0');
        mk(`dose-evening-${sid}`, vals.evening ?? '0');
        mk(`dose-night-${sid}`, vals.night ?? '0');
        mk(`reason-note-${sid}`, '');
        const toggle = document.createElement('input'); toggle.type = 'checkbox';
        toggle.id = `weekday-toggle-${sid}`; toggle.checked = !!vals.toggle; document.body.appendChild(toggle);
        for (const wd of ['Mo','Di','Mi','Do','Fr','Sa','So']) {
            const cb = document.createElement('input'); cb.type = 'checkbox';
            cb.className = `weekday-cb-${sid}`; cb.value = wd;
            cb.checked = vals.weekdays ? vals.weekdays.includes(wd) : true;
            document.body.appendChild(cb);
        }
    }
    function makeModel() {
        return { data: { travelData: { start: '2026-08-10', end: '2026-08-24' },
            selectedMedications: [{ id: 'm1', reasonSuggestions: [] }], dosageSchemes: {} },
            save() {}, updateDosageScheme(medId, idx, scheme) { (this.data.dosageSchemes[medId] ||= [])[idx] = scheme; } };
    }
    const view2 = { updateDosageSchemes() {} };

    it('rundet Dosis weich auf 0,25', () => {
        const model = makeModel();
        setInputs('m1', 0, { morning: '0.3' });
        new TravelController(model, view2).updateScheme('m1', 0);
        expect(model.data.dosageSchemes.m1[0].morning).toBe(0.25);
    });
    it('weekdays nur bei Toggle an UND Teilmenge', () => {
        const model = makeModel();
        setInputs('m1', 0, { toggle: true, weekdays: ['Mo', 'Di', 'So'] });
        new TravelController(model, view2).updateScheme('m1', 0);
        expect(model.data.dosageSchemes.m1[0].weekdays).toEqual(['Mo', 'Di', 'So']);
    });
    it('Toggle aus -> weekdays leer/nicht gesetzt', () => {
        const model = makeModel();
        setInputs('m1', 0, { toggle: false, weekdays: ['Mo'] });
        new TravelController(model, view2).updateScheme('m1', 0);
        const wd = model.data.dosageSchemes.m1[0].weekdays;
        expect(wd === undefined || wd.length === 0).toBe(true);
    });
});
