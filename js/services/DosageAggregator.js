import { formatNumber } from '../utils/NumberFormat.js';
import { countIntakeDays, intakeDaySet } from '../utils/Weekdays.js';

// Aggregiert mehrere Dosierbloecke (Titrations-/Eindosierungsschema) fuer die
// einzeiligen Felder des amtlichen Formulars.

function dailyDose(block) {
    return (block.morning || 0) + (block.noon || 0) + (block.evening || 0) + (block.night || 0);
}

function blockDays(block) {
    return countIntakeDays(block.startDate, block.endDate, block.weekdays);
}

function notation(block) {
    // Immer 4 Slots (morgens-mittags-abends-nachts), dezimal mit Komma.
    const doses = [block.morning, block.noon, block.evening, block.night]
        .map((v) => formatNumber(v || 0))
        .join('-');
    const wd = block.weekdays;
    if (wd && wd.length > 0 && wd.length < 7) return `${wd.join(',')}: ${doses}`;
    return doses;
}

function ddmm(dateStr) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.`;
}

export const DosageAggregator = {
    /** Σ über alle Bloecke (Tage_i * Tagesdosis_i). */
    totalUnits(blocks) {
        return blocks.reduce((sum, b) => sum + blockDays(b) * dailyDose(b), 0);
    },

    /** Gesamtwirkstoffmenge = totalUnits * concentrationValue, auf 2 NK gerundet. */
    totalSubstance(blocks, concentrationValue) {
        const raw = this.totalUnits(blocks) * concentrationValue;
        return Math.round((raw + Number.EPSILON) * 100) / 100;
    },

    /** Reichdauer = Anzahl eindeutiger Kalendertage mit mindestens einer Einnahme. */
    reachDurationDays(blocks) {
        return intakeDaySet(blocks).size;
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
