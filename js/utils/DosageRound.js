// Weiche Rundung einer Einzeldosis auf das naechste 0,25-Vielfache.
// Nicht-numerisch oder negativ -> 0.

export function roundToQuarter(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 4) / 4;
}
