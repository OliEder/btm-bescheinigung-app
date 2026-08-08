import { describe, it, expect } from 'vitest';
import { roundToQuarter } from './DosageRound.js';

describe('roundToQuarter', () => {
    it('rundet auf naechstes 0,25-Vielfaches', () => {
        expect(roundToQuarter(0.3)).toBe(0.25);
        expect(roundToQuarter(0.4)).toBe(0.5);
        expect(roundToQuarter(1.1)).toBe(1);
        expect(roundToQuarter(0.125)).toBe(0.25); // .5 rundet auf
    });
    it('ganze und exakte Viertel bleiben', () => {
        expect(roundToQuarter(2)).toBe(2);
        expect(roundToQuarter(0.75)).toBe(0.75);
        expect(roundToQuarter(0)).toBe(0);
    });
    it('negativ/ungueltig -> 0', () => {
        expect(roundToQuarter(-1)).toBe(0);
        expect(roundToQuarter('x')).toBe(0);
        expect(roundToQuarter(NaN)).toBe(0);
    });
});
