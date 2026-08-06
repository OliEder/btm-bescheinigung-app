import { describe, it, expect } from 'vitest';
import { DateHelper } from './DateHelper.js';

describe('DateHelper.getDaysBetween', () => {
    it('inkludiert Start- und Enddatum', () => {
        expect(DateHelper.getDaysBetween('2026-08-10', '2026-08-12')).toBe(3);
    });
    it('liefert 1 fuer gleichen Tag', () => {
        expect(DateHelper.getDaysBetween('2026-08-10', '2026-08-10')).toBe(1);
    });
});
