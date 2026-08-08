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
    it('baut kompakte Gebrauchsanweisungs-Kette bei mehreren Bloecken (4-Slot)', () => {
        expect(DosageAggregator.instructionChain(blocks)).toBe('1-0-0-0 -> 1-0-1-0 -> 2-0-1-0');
    });
    it('einzelner Block: schlichte Notation ohne Kette (4-Slot)', () => {
        expect(DosageAggregator.instructionChain([blocks[1]])).toBe('1-0-1-0');
    });
    it('ausfuehrliches Schema mit Datumsangaben fuer Anmerkungen (4-Slot)', () => {
        expect(DosageAggregator.detailedSchedule(blocks))
            .toBe('10.08.-11.08.: 1-0-0-0 | 12.08.-13.08.: 1-0-1-0 | 14.08.-24.08.: 2-0-1-0');
    });
});

describe('DosageAggregator.totalUnits', () => {
    it('summiert Einnahme-Einheiten ueber alle Bloecke', () => {
        // Block1: 2 Tage * 1 = 2 ; Block2: 2 Tage * 2 = 4 ; Block3: 11 Tage * 3 = 33 => 39
        expect(DosageAggregator.totalUnits(blocks)).toBe(39);
    });
    it('unterstuetzt Bruchteil-Tagesdosen', () => {
        const frac = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 0.5, noon: 0, evening: 0.5, night: 0 }]; // 10 Tage * 1.0 = 10
        expect(DosageAggregator.totalUnits(frac)).toBe(10);
        const frac2 = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 0.5, noon: 0, evening: 0, night: 0 }]; // 10 Tage * 0.5 = 5
        expect(DosageAggregator.totalUnits(frac2)).toBe(5);
    });
});

describe('DosageAggregator Notation (dezimal, 4-Slot)', () => {
    it('schreibt Bruchteile mit Komma und immer 4 Slots', () => {
        const b = [{ startDate: '2026-08-10', endDate: '2026-08-11',
            morning: 0.5, noon: 0, evening: 0.5, night: 0 }];
        expect(DosageAggregator.instructionChain(b)).toBe('0,5-0-0,5-0');
    });
});

describe('DosageAggregator — nicht-taegliche Einnahme', () => {
    const block = { startDate: '2026-08-10', endDate: '2026-08-23',
        morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] };
    it('totalUnits zaehlt nur Einnahmetage (6)', () => {
        expect(DosageAggregator.totalUnits([block])).toBe(6);
    });
    it('totalSubstance = Einnahmetage * Dosis * Konzentration', () => {
        expect(DosageAggregator.totalSubstance([block], 36)).toBe(216);
    });
    it('reachDurationDays = eindeutige Einnahmetage (6), nicht Kalenderspanne', () => {
        expect(DosageAggregator.reachDurationDays([block])).toBe(6);
    });
    it('reachDurationDays taeglich lueckenlos = Kalendertage', () => {
        const daily = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        expect(DosageAggregator.reachDurationDays(daily)).toBe(10);
    });
    it('notation mit Wochentags-Praefix bei Teilmenge; ohne bei taeglich', () => {
        expect(DosageAggregator.instructionChain([block])).toBe('Mo,Di,So: 1-0-0-0');
        const daily = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 1, noon: 0, evening: 1, night: 0 }];
        expect(DosageAggregator.instructionChain(daily)).toBe('1-0-1-0');
    });
});
