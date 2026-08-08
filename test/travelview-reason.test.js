import { describe, it, expect, beforeEach } from 'vitest';
import { TravelView } from '../js/views/TravelView.js';

beforeEach(() => { document.body.innerHTML = '<div id="dosage-schemes"></div>'; });

const med = { id: 'm1', handelsname: 'Concerta', concentration: '36mg',
    reasonSuggestions: [{ label: 'ADHS', icd10: 'F90.0', icd11: '6A05.1' }] };
const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('TravelView Grund-UI', () => {
    it('rendert ein Grund-Dropdown mit Vorschlag + kein Grund + Anderer Grund', () => {
        const view = new TravelView();
        window.app = { controllers: { travel: {} } };
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: '' }] };
        view.updateDosageSchemes([med], travel, schemes);
        const select = document.getElementById('reason-select-m1-0');
        expect(select).toBeTruthy();
        const opts = [...select.options].map((o) => o.textContent);
        expect(opts).toContain('ADHS');
        expect(opts.some((t) => /kein Grund/i.test(t))).toBe(true);
        expect(opts.some((t) => /Anderer Grund/i.test(t))).toBe(true);
    });
    it('escaped boesartige reasonSuggestion-Labels', () => {
        const view = new TravelView();
        window.app = { controllers: { travel: {} } };
        const evilMed = { ...med, reasonSuggestions: [{ label: '<img src=x onerror=alert(1)>', icd10: 'X' }] };
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonLabel: '', reasonIcd10: '', reasonNote: '' }] };
        view.updateDosageSchemes([evilMed], travel, schemes);
        expect(document.querySelector('#dosage-schemes img')).toBeNull();
    });
});
