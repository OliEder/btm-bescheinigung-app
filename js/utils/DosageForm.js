// Leitet die Bezugseinheit (Zaehl-Einheit) aus der Darreichungsform ab.
// Eine Quelle der Wahrheit fuer PdfFormFiller und MedicationPlanBuilder.

export function formUnit(darreichungsform) {
    const f = String(darreichungsform || '').toLowerCase();
    if (f.includes('kapsel')) return { singular: 'Kapsel', plural: 'Kapseln' };
    if (f.includes('tablette')) return { singular: 'Tablette', plural: 'Tabletten' };
    if (f.includes('tropfen') || f.includes('saft') || f.includes('lösung') || f.includes('loesung')) {
        return { singular: 'ml', plural: 'ml' };
    }
    return { singular: 'Einheit', plural: 'Einheiten' };
}
