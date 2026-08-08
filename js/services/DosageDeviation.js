// Erkennt Abweichungen von einer durchgaengigen, taeglichen Einnahme ueber die Reisedauer.
// Reine Funktion; eine Quelle der Wahrheit fuer App-Hinweis und PDF-Anmerkungen.

function plusOneDay(iso) {
    const d = new Date(iso);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
}

export function detectDeviations(blocks, travelData) {
    const hints = [];
    if (!blocks || blocks.length === 0) return hints;

    // 1) Nicht-taegliche Einnahme je Block.
    for (const b of blocks) {
        const wd = b.weekdays;
        if (wd && wd.length > 0 && wd.length < 7) {
            hints.push(`Einnahme nur an ${wd.join(', ')}`);
        }
    }

    // 2) Luecken zur Reisedauer (Start nach Reisebeginn, Ende vor Reiseende, Luecke zwischen Bloecken).
    const sorted = [...blocks].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    let gap = false;
    if (travelData?.start && sorted[0].startDate > travelData.start) gap = true;
    if (travelData?.end && sorted[sorted.length - 1].endDate < travelData.end) gap = true;
    for (let i = 1; i < sorted.length; i++) {
        if (plusOneDay(sorted[i - 1].endDate) < sorted[i].startDate) gap = true;
    }
    if (gap) hints.push('An einzelnen Reisetagen ist keine Einnahme vorgesehen.');

    return hints;
}
