import { describe, it, expect } from 'vitest';
import { WEEKDAYS, isActiveWeekday, countIntakeDays, intakeDaySet } from './Weekdays.js';

describe('Weekdays', () => {
    it('WEEKDAYS Mo..So', () => {
        expect(WEEKDAYS).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    });
    it('isActiveWeekday: leer = taeglich', () => {
        expect(isActiveWeekday('2026-08-10', [])).toBe(true); // Montag
        expect(isActiveWeekday('2026-08-10', ['Mo'])).toBe(true);
        expect(isActiveWeekday('2026-08-11', ['Mo'])).toBe(false); // Dienstag
    });
    it('countIntakeDays: taeglich (leer) = alle Kalendertage inkl.', () => {
        // 2026-08-10 (Mo) .. 2026-08-23 (So) = 14 Tage
        expect(countIntakeDays('2026-08-10', '2026-08-23', [])).toBe(14);
    });
    it('countIntakeDays: Mo,Di,So ueber 2 Kalenderwochen = 6', () => {
        expect(countIntakeDays('2026-08-10', '2026-08-23', ['Mo', 'Di', 'So'])).toBe(6);
    });
    it('countIntakeDays: alle 7 = alle Tage', () => {
        expect(countIntakeDays('2026-08-10', '2026-08-16', WEEKDAYS)).toBe(7);
    });
    it('intakeDaySet: taeglicher Block ueber 10 Tage -> size 10', () => {
        const b = [{ startDate: '2026-08-10', endDate: '2026-08-19', weekdays: [] }];
        expect(intakeDaySet(b).size).toBe(10);
    });
    it('intakeDaySet: ueberschneidende Bloecke zaehlen gemeinsamen Tag einmal', () => {
        const b = [
            { startDate: '2026-08-10', endDate: '2026-08-12', weekdays: [] },
            { startDate: '2026-08-12', endDate: '2026-08-13', weekdays: [] },
        ];
        expect(intakeDaySet(b).size).toBe(4); // 10,11,12,13
    });
    it('intakeDaySet: nicht-taeglicher Block', () => {
        const b = [{ startDate: '2026-08-10', endDate: '2026-08-23', weekdays: ['Mo', 'Di', 'So'] }];
        expect(intakeDaySet(b).size).toBe(6);
    });
});
