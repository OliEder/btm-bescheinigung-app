import { describe, it, expect, beforeEach } from 'vitest';
import { TravelView } from '../js/views/TravelView.js';

beforeEach(() => { document.body.innerHTML = '<div id="dosage-schemes"></div>'; window.app = { controllers: { travel: { updateScheme() {} } } }; });

const med = { id: 'm1', handelsname: 'Concerta', concentration: '36mg', reasonSuggestions: [] };
const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('TravelView — Bruchteile + Wochentage', () => {
    it('Dosis-Felder haben step=0.25', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24', morning: 0.5, noon: 0, evening: 0, night: 0 }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        const inp = document.getElementById('dose-morning-m1-0');
        expect(inp.getAttribute('step')).toBe('0.25');
    });
    it('rendert Wochentags-Toggle und 7 Checkboxen', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24', morning: 1, noon: 0, evening: 0, night: 0 }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        expect(document.getElementById('weekday-toggle-m1-0')).toBeTruthy();
        expect(document.querySelectorAll('.weekday-cb-m1-0')).toHaveLength(7);
    });
    it('zeigt App-Abweichungshinweis bei nicht-taeglicher Einnahme', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        expect(document.querySelector('#dosage-schemes').textContent).toMatch(/Mo, Di, So/);
    });
});
