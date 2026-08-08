// Einheitliche deutsche Zahlenformatierung: Dezimalkomma, bis zu 2 Nachkommastellen,
// keine ueberfluessigen Nullen. Eine Quelle der Wahrheit fuer alle Mengenangaben.

export function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    // Auf 2 Nachkommastellen runden, dann ueberfluessige Nullen entfernen.
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    let s = rounded.toFixed(2);         // z.B. "10.50"
    s = s.replace(/\.?0+$/, '');         // "10.5" / "20"
    return s.replace('.', ',');          // deutsches Komma
}
