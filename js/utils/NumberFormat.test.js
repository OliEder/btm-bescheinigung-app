import { describe, it, expect } from 'vitest';
import { formatNumber } from './NumberFormat.js';

describe('formatNumber', () => {
    it('ganze Zahl ohne Nachkommastellen', () => {
        expect(formatNumber(20)).toBe('20');
        expect(formatNumber(0)).toBe('0');
    });
    it('Dezimalkomma, keine ueberfluessigen Nullen', () => {
        expect(formatNumber(10.5)).toBe('10,5');
        expect(formatNumber(0.25)).toBe('0,25');
        expect(formatNumber(10.75)).toBe('10,75');
    });
    it('rundet kaufmaennisch auf 2 Nachkommastellen', () => {
        expect(formatNumber(10.005)).toBe('10,01');
        expect(formatNumber(1.999)).toBe('2');
    });
    it('behandelt String-Eingaben und Ungueltiges', () => {
        expect(formatNumber('0.5')).toBe('0,5');
        expect(formatNumber(null)).toBe('0');
        expect(formatNumber(undefined)).toBe('0');
    });
});
