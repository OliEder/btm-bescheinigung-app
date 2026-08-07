import { DateHelper } from '../utils/DateHelper.js';

// Aggregiert mehrere Dosierbloecke (Titrations-/Eindosierungsschema) fuer die
// einzeiligen Felder des amtlichen Formulars.

function dailyDose(block) {
    return (block.morning || 0) + (block.noon || 0) + (block.evening || 0) + (block.night || 0);
}

function blockDays(block) {
    return DateHelper.getDaysBetween(block.startDate, block.endDate);
}

function notation(block) {
    const base = `${block.morning || 0}-${block.noon || 0}-${block.evening || 0}`;
    return (block.night || 0) > 0 ? `${base}-${block.night}` : base;
}

function ddmm(dateStr) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.`;
}

export const DosageAggregator = {
    /** Σ (Tage_i * Tagesdosis_i) * concentrationValue, gerundet. */
    totalSubstance(blocks, concentrationValue) {
        const units = blocks.reduce((sum, b) => sum + blockDays(b) * dailyDose(b), 0);
        return Math.round(units * concentrationValue);
    },

    /** Tage vom Start des ersten bis Ende des letzten Blocks (inkl.). */
    reachDurationDays(blocks) {
        if (blocks.length === 0) return 0;
        return DateHelper.getDaysBetween(blocks[0].startDate, blocks[blocks.length - 1].endDate);
    },

    /** Kompakte Kette der Notationen, z.B. "1-0-0 -> 1-0-1 -> 2-0-1". */
    instructionChain(blocks) {
        return blocks.map(notation).join(' -> ');
    },

    /** Ausfuehrliches Schema mit Datumsangaben fuer das Anmerkungen-Feld. */
    detailedSchedule(blocks) {
        return blocks
            .map((b) => `${ddmm(b.startDate)}-${ddmm(b.endDate)}: ${notation(b)}`)
            .join(' | ');
    },
};
