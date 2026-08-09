import { describe, it, expect } from 'vitest';
import { detectDeviations } from './DosageDeviation.js';

const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('detectDeviations', () => {
    it('nicht-taeglich -> Hinweis mit Wochentagen', () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /Mo, Di, So/.test(t))).toBe(true);
    });
    it('spaeterer Start als Reisebeginn -> Luecken-Hinweis', () => {
        const blocks = [{ startDate: '2026-08-12', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /keine Einnahme/i.test(t))).toBe(true);
    });
    it('Luecke zwischen Bloecken -> Hinweis', () => {
        const blocks = [
            { startDate: '2026-08-10', endDate: '2026-08-12', morning: 1, noon: 0, evening: 0, night: 0 },
            { startDate: '2026-08-15', endDate: '2026-08-24', morning: 1, noon: 0, evening: 0, night: 0 },
        ];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /keine Einnahme/i.test(t))).toBe(true);
    });
    it('volle taegliche Abdeckung -> keine Hinweise', () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        expect(detectDeviations(blocks, travel)).toEqual([]);
    });
});
