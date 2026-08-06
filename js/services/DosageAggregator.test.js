import { describe, it, expect } from 'vitest';
import { DosageAggregator } from './DosageAggregator.js';

const blocks = [
    { startDate: '2026-08-10', endDate: '2026-08-11', morning: 1, noon: 0, evening: 0, night: 0 },
    { startDate: '2026-08-12', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
    { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
];

describe('DosageAggregator', () => {
    it('summiert Gesamtwirkstoffmenge ueber alle Bloecke', () => {
        // Block1: 2 Tage * 1 = 2 ; Block2: 2 Tage * 2 = 4 ; Block3: 11 Tage * 3 = 33
        // Einheiten gesamt = 39, * 36mg = 1404 mg
        expect(DosageAggregator.totalSubstance(blocks, 36)).toBe(1404);
    });
    it('berechnet Reichdauer = erster Start bis letztes Ende (inkl.)', () => {
        expect(DosageAggregator.reachDurationDays(blocks)).toBe(15);
    });
    it('baut kompakte Gebrauchsanweisungs-Kette bei mehreren Bloecken', () => {
        expect(DosageAggregator.instructionChain(blocks)).toBe('1-0-0 -> 1-0-1 -> 2-0-1');
    });
    it('einzelner Block: schlichte Notation ohne Kette', () => {
        expect(DosageAggregator.instructionChain([blocks[1]])).toBe('1-0-1');
    });
    it('ausfuehrliches Schema mit Datumsangaben fuer Anmerkungen', () => {
        expect(DosageAggregator.detailedSchedule(blocks))
            .toBe('10.08.-11.08.: 1-0-0 | 12.08.-13.08.: 1-0-1 | 14.08.-24.08.: 2-0-1');
    });
});
