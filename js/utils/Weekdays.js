// Wochentags-Logik fuer nicht-taegliche Einnahme.
// weekdays: Array aus WEEKDAYS-Kuerzeln; leer = taegliche Einnahme.

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// JS getDay(): So=0, Mo=1, ... Sa=6  ->  WEEKDAYS-Kuerzel.
function kuerzel(date) {
    const d = new Date(date);
    const map = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return map[d.getUTCDay()];
}

export function isActiveWeekday(date, weekdays) {
    if (!weekdays || weekdays.length === 0) return true;
    return weekdays.includes(kuerzel(date));
}

// Iteriert die Kalendertage [start..end] inkl. und ruft fn(isoDate) auf.
function eachDay(startDate, endDate, fn) {
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
        fn(cur.toISOString().split('T')[0]);
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
}

export function countIntakeDays(startDate, endDate, weekdays) {
    if (!startDate || !endDate) return 0;
    let n = 0;
    eachDay(startDate, endDate, (iso) => { if (isActiveWeekday(iso, weekdays)) n += 1; });
    return n;
}

export function intakeDaySet(blocks) {
    const set = new Set();
    for (const b of blocks || []) {
        eachDay(b.startDate, b.endDate, (iso) => {
            if (isActiveWeekday(iso, b.weekdays)) set.add(iso);
        });
    }
    return set;
}
