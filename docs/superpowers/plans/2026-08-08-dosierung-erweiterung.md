# Dosierungs-Erweiterung (Bruchteile, nicht-täglich, Reisedauer-Abweichung) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bruchteil-Dosen (0,25er), nicht-tägliche Einnahme (Wochentags-Muster je Block) und automatische Reisedauer-Abweichungs-Hinweise ermöglichen; die Mengen-/Reichdauer-Berechnung amtstreu auf tatsächliche Einnahmetage umstellen.

**Architecture:** Neue reine Utils `DosageRound` (0,25-Rundung) und `Weekdays` (countIntakeDays/intakeDaySet). `DosageScheme` bekommt optional `weekdays` (nur bei Abweichung gespeichert). `DosageAggregator` zählt Einnahmetage statt Kalendertage; `reachDurationDays` = eindeutige Einnahmetage. Neuer `DosageDeviation`-Service (eine Quelle der Wahrheit für App + PDF-Anmerkungen). TravelView/Controller: step=0,25 + Wochentags-Toggle + App-Hinweis, additiv.

**Tech Stack:** JavaScript (ES-Module), Vitest, jsdom, pdf-lib (nur lesend im Test).

---

## Konventionen
- Vitest; Test neben dem Code oder bestehende Testdatei erweitern.
- Jeder Task: Failing Test zuerst → Implementierung → grün → Commit.
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Escaping (Bestand): `escapeHtml` für Modelldaten; IDs bleiben Strings.
- TravelView enthält `innerHTML` — Edit/Write-Tools werden ggf. von einem PreToolUse-Hook blockiert.
  Dann die Datei per Shell (Python-Replace / Here-Doc) schreiben, danach `node --check`.
- Additive View-Änderungen (paralleles Redesign-Teilprojekt) — keine Umstrukturierung.

## Datei-Struktur
- **Neu:** `js/utils/DosageRound.js` (+Test) — `roundToQuarter`.
- **Neu:** `js/utils/Weekdays.js` (+Test) — `WEEKDAYS`, `isActiveWeekday`, `countIntakeDays`, `intakeDaySet`.
- **Neu:** `js/services/DosageDeviation.js` (+Test) — `detectDeviations`.
- **Ändern:** `js/models/Medication.js` — DosageScheme `weekdays`/`isDaily`/`toJSON`.
- **Ändern:** `js/services/DosageAggregator.js` — blockDays/reachDurationDays/notation.
- **Ändern:** `js/services/PdfFormFiller.js` — buildInstruction(blocks, travel) + Abweichungen.
- **Ändern:** `js/views/TravelView.js` + `js/controllers/TravelController.js` — UI + Auslese.
- **Ändern:** `docs/arc42/architecture.md`.

---

## Task 1: DosageRound-Util (0,25-Rundung)

**Files:**
- Create: `js/utils/DosageRound.js`
- Test: `js/utils/DosageRound.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/DosageRound.test.js`:

```javascript
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
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/DosageRound.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementierung**

Create `js/utils/DosageRound.js`:

```javascript
// Weiche Rundung einer Einzeldosis auf das naechste 0,25-Vielfache.
// Nicht-numerisch oder negativ -> 0.

export function roundToQuarter(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 4) / 4;
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/DosageRound.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/utils/DosageRound.js js/utils/DosageRound.test.js
git commit -m "feat: DosageRound-Util (weiche 0,25-Rundung)"
```

---

## Task 2: Weekdays-Util (Einnahmetage)

**Files:**
- Create: `js/utils/Weekdays.js`
- Test: `js/utils/Weekdays.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/Weekdays.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { WEEKDAYS, isActiveWeekday, countIntakeDays, intakeDaySet } from './Weekdays.js';

describe('Weekdays', () => {
    it('WEEKDAYS Mo..So', () => {
        expect(WEEKDAYS).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    });
    it('isActiveWeekday: leer = taeglich', () => {
        expect(isActiveWeekday('2026-08-10', [])).toBe(true); // Montag
        expect(isActiveWeekday('2026-08-10', ['Mo'])).toBe(true);
        expect(isActiveWeekday('2026-08-11', ['Mo'])).toBe(false); // Dienstag
    });
    it('countIntakeDays: taeglich (leer) = alle Kalendertage inkl.', () => {
        // 2026-08-10 (Mo) .. 2026-08-23 (So) = 14 Tage
        expect(countIntakeDays('2026-08-10', '2026-08-23', [])).toBe(14);
    });
    it('countIntakeDays: Mo,Di,So ueber 2 Kalenderwochen = 6', () => {
        expect(countIntakeDays('2026-08-10', '2026-08-23', ['Mo', 'Di', 'So'])).toBe(6);
    });
    it('countIntakeDays: alle 7 = alle Tage', () => {
        expect(countIntakeDays('2026-08-10', '2026-08-16', WEEKDAYS)).toBe(7);
    });
    it('intakeDaySet: taeglicher Block ueber 10 Tage -> size 10', () => {
        const b = [{ startDate: '2026-08-10', endDate: '2026-08-19', weekdays: [] }];
        expect(intakeDaySet(b).size).toBe(10);
    });
    it('intakeDaySet: ueberschneidende Bloecke zaehlen gemeinsamen Tag einmal', () => {
        const b = [
            { startDate: '2026-08-10', endDate: '2026-08-12', weekdays: [] },
            { startDate: '2026-08-12', endDate: '2026-08-13', weekdays: [] },
        ];
        expect(intakeDaySet(b).size).toBe(4); // 10,11,12,13
    });
    it('intakeDaySet: nicht-taeglicher Block', () => {
        const b = [{ startDate: '2026-08-10', endDate: '2026-08-23', weekdays: ['Mo', 'Di', 'So'] }];
        expect(intakeDaySet(b).size).toBe(6);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/Weekdays.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementierung**

Create `js/utils/Weekdays.js`:

```javascript
// Wochentags-Logik fuer nicht-taegliche Einnahme.
// weekdays: Array aus WEEKDAYS-Kuerzeln; leer = taegliche Einnahme.

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// JS getDay(): So=0, Mo=1, ... Sa=6  ->  WEEKDAYS-Kuerzel.
function kuerzel(date) {
    const d = new Date(date);
    const map = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return map[d.getDay()];
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
        cur.setDate(cur.getDate() + 1);
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
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/Weekdays.test.js`
Expected: PASS — 8 Assertions gruen.

- [ ] **Step 5: Commit**

```bash
git add js/utils/Weekdays.js js/utils/Weekdays.test.js
git commit -m "feat: Weekdays-Util (Einnahmetage zaehlen, intakeDaySet)"
```

---

## Task 3: DosageScheme — weekdays + isDaily

**Files:**
- Modify: `js/models/Medication.js` (DosageScheme Konstruktor + toJSON)
- Test: `js/models/Medication.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/models/Medication.test.js`:

```javascript
describe('DosageScheme weekdays (nicht-taeglich)', () => {
    it('nimmt weekdays an; Default leer', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).weekdays).toEqual([]);
        expect(new DosageScheme({ weekdays: ['Mo', 'Di'] }).weekdays).toEqual(['Mo', 'Di']);
    });
    it('isDaily: leer oder alle 7 -> true; Teilmenge -> false', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).isDaily).toBe(true);
        expect(new DosageScheme({ weekdays: ['Mo','Di','Mi','Do','Fr','Sa','So'] }).isDaily).toBe(true);
        expect(new DosageScheme({ weekdays: ['Mo','Di','So'] }).isDaily).toBe(false);
    });
    it('toJSON: weekdays weglassen bei taeglich, ausgeben bei Teilmenge', async () => {
        const { DosageScheme } = await import('./Medication.js');
        expect(new DosageScheme({}).toJSON()).not.toHaveProperty('weekdays');
        expect(new DosageScheme({ weekdays: ['Mo','Di','So'] }).toJSON().weekdays).toEqual(['Mo','Di','So']);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: FAIL — weekdays/isDaily fehlen.

- [ ] **Step 3: Implementierung**

Modify `js/models/Medication.js`, DosageScheme. Im Konstruktor nach `this.reasonNote = ...` ergaenzen:

```javascript
        this.weekdays = Array.isArray(data.weekdays) ? data.weekdays : [];
```

Nach dem `dailyDose`-Getter (oder passender Stelle) einen Getter ergaenzen:

```javascript
    get isDaily() {
        return this.weekdays.length === 0 || this.weekdays.length === 7;
    }
```

In `toJSON()` NACH dem Erstellen des Objekts `weekdays` nur bei Nicht-Taeglich anhaengen.
Ersetze die `toJSON()`-Methode durch:

```javascript
    toJSON() {
        const json = {
            medicationId: this.medicationId,
            startDate: this.startDate,
            endDate: this.endDate,
            morning: this.morning,
            noon: this.noon,
            evening: this.evening,
            night: this.night,
            reasonLabel: this.reasonLabel,
            reasonIcd10: this.reasonIcd10,
            reasonNote: this.reasonNote,
        };
        if (!this.isDaily) json.weekdays = this.weekdays;
        return json;
    }
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: PASS.

- [ ] **Step 5: Volle Suite**

Run: `npm test`
Expected: alle gruen.

- [ ] **Step 6: Commit**

```bash
git add js/models/Medication.js js/models/Medication.test.js
git commit -m "feat: DosageScheme weekdays + isDaily (toJSON nur bei Abweichung)"
```

---

## Task 4: DosageAggregator — Einnahmetage + Reichdauer + Wochentags-Notation

**Files:**
- Modify: `js/services/DosageAggregator.js`
- Test: `js/services/DosageAggregator.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/services/DosageAggregator.test.js`:

```javascript
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
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: FAIL — blockDays zaehlt Kalendertage; reachDurationDays = Kalenderspanne; keine Wochentags-Notation.

- [ ] **Step 3: Implementierung**

Modify `js/services/DosageAggregator.js`. Oben ergaenzen:

```javascript
import { countIntakeDays, intakeDaySet } from '../utils/Weekdays.js';
```

`blockDays(block)` ersetzen durch (zaehlt Einnahmetage):

```javascript
function blockDays(block) {
    return countIntakeDays(block.startDate, block.endDate, block.weekdays);
}
```

`notation(block)` ersetzen durch (Wochentags-Praefix bei Teilmenge):

```javascript
function notation(block) {
    const doses = [block.morning, block.noon, block.evening, block.night]
        .map((v) => formatNumber(v || 0))
        .join('-');
    const wd = block.weekdays;
    if (wd && wd.length > 0 && wd.length < 7) return `${wd.join(',')}: ${doses}`;
    return doses;
}
```

`reachDurationDays(blocks)` ersetzen durch (eindeutige Einnahmetage):

```javascript
    /** Reichdauer = Anzahl eindeutiger Kalendertage mit mindestens einer Einnahme. */
    reachDurationDays(blocks) {
        return intakeDaySet(blocks).size;
    },
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: PASS — neue + bestehende Tests. Falls ein bestehender reachDurationDays-Test die alte
Kalenderspanne-Semantik erwartete (z.B. 15 fuer 3 lueckenlose Bloecke): bei lueckenlosen taeglichen
Bloecken liefert intakeDaySet dieselbe Zahl (Gesamttage), pruefen und ggf. den erwarteten Wert
auf die tatsaechlichen eindeutigen Einnahmetage aktualisieren.

- [ ] **Step 5: Volle Suite**

Run: `npm test`
Expected: alle gruen (PdfFormFiller nutzt reachDurationDays — bei taeglichen Testdaten unveraendert).

- [ ] **Step 6: Commit**

```bash
git add js/services/DosageAggregator.js js/services/DosageAggregator.test.js
git commit -m "feat: Aggregator zaehlt Einnahmetage; Reichdauer=eindeutige Einnahmetage; Wochentags-Notation"
```

---

## Task 5: DosageDeviation-Service (Abweichungs-Hinweise)

**Files:**
- Create: `js/services/DosageDeviation.js`
- Test: `js/services/DosageDeviation.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/services/DosageDeviation.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { detectDeviations } from './DosageDeviation.js';

const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('detectDeviations', () => {
    it('nicht-taeglich -> Hinweis mit Wochentagen', () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /Mo, Di, So/.test(t))).toBe(true);
    });
    it('spaeterer Start als Reisebeginn -> Luecken-Hinweis', () => {
        const blocks = [{ startDate: '2026-08-12', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /keine Einnahme/i.test(t))).toBe(true);
    });
    it('Luecke zwischen Bloecken -> Hinweis', () => {
        const blocks = [
            { startDate: '2026-08-10', endDate: '2026-08-12', morning: 1, noon: 0, evening: 0, night: 0 },
            { startDate: '2026-08-15', endDate: '2026-08-24', morning: 1, noon: 0, evening: 0, night: 0 },
        ];
        const d = detectDeviations(blocks, travel);
        expect(d.some((t) => /keine Einnahme/i.test(t))).toBe(true);
    });
    it('volle taegliche Abdeckung -> keine Hinweise', () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        expect(detectDeviations(blocks, travel)).toEqual([]);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/DosageDeviation.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementierung**

Create `js/services/DosageDeviation.js`:

```javascript
import { DateHelper } from '../utils/DateHelper.js';

// Erkennt Abweichungen von einer durchgaengigen, taeglichen Einnahme ueber die Reisedauer.
// Reine Funktion; eine Quelle der Wahrheit fuer App-Hinweis und PDF-Anmerkungen.

function plusOneDay(iso) {
    const d = new Date(iso);
    d.setDate(d.getDate() + 1);
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
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/DosageDeviation.test.js`
Expected: PASS — 4 Assertions gruen.

- [ ] **Step 5: Commit**

```bash
git add js/services/DosageDeviation.js js/services/DosageDeviation.test.js
git commit -m "feat: DosageDeviation-Service (nicht-taeglich + Luecken-Hinweise)"
```

---

## Task 6: PdfFormFiller — Abweichungs-Hinweise in Anmerkungen

**Files:**
- Modify: `js/services/PdfFormFiller.js` (buildInstruction + fillCertificate reicht travel durch)
- Test: `js/services/PdfFormFiller.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/services/PdfFormFiller.test.js`:

```javascript
describe('fillCertificate — Reisedauer-Abweichung in Anmerkungen (TP2)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };
    it('nicht-taeglich -> Hinweis in Anmerkungen', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toMatch(/Mo, Di, So/);
    });
    it('Abweichung + reasonNote kombiniert', async () => {
        const blocks = [{ startDate: '2026-08-12', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonNote: 'Titration' }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        const anm = g('Anmerkungen');
        expect(anm).toContain('Titration');
        expect(anm).toMatch(/keine Einnahme/i);
    });
    it('ohne Abweichung/Note/Titration -> keine', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toBe('keine');
    });
});
```

(Hinweis: `travel` in dieser Testdatei ist `{ start: '2026-08-10', end: '2026-08-24', duration: 15 }`.)

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: FAIL — Abweichungs-Hinweise fehlen in Anmerkungen.

- [ ] **Step 3: Implementierung**

Modify `js/services/PdfFormFiller.js`. Oben ergaenzen:

```javascript
import { detectDeviations } from './DosageDeviation.js';
```

`buildInstruction(blocks)` auf `buildInstruction(blocks, travelData)` erweitern; die Abweichungs-
Hinweise zwischen Titrationsschema und reasonNotes einfuegen:

```javascript
function buildInstruction(blocks, travelData) {
    const notes = [...new Set(blocks.map((b) => (b.reasonNote || '').trim()).filter(Boolean))];
    const deviations = detectDeviations(blocks, travelData);
    const extra = [...deviations, ...notes].join(' | ');
    const append = (base) => {
        const merged = [base, extra].filter((s) => s && s !== 'keine').join(' | ');
        return merged || 'keine';
    };
    if (blocks.length <= 1) {
        const chain = blocks[0] ? DosageAggregator.instructionChain(blocks) : '';
        return { gebrauchsanweisung: chain, anmerkungen: append('') };
    }
    const chain = DosageAggregator.instructionChain(blocks);
    const detailed = DosageAggregator.detailedSchedule(blocks);
    const gebrauchsanweisung = chain.length > 40 ? 's. Anmerkungen' : chain;
    return { gebrauchsanweisung, anmerkungen: append(detailed) };
}
```

Im `fillCertificate` den Aufruf anpassen (travelData durchreichen). Aktuell:
`const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks);`
ersetzen durch:

```javascript
    const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks, travel);
```

(`travel` ist bereits aus `data` destrukturiert.)

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: PASS — neue + bestehende Tests (bestehende taegliche Faelle liefern keine Abweichung,
also unveraendert „keine"/Titration).

- [ ] **Step 5: Volle Suite**

Run: `npm test`
Expected: alle gruen.

- [ ] **Step 6: Commit**

```bash
git add js/services/PdfFormFiller.js js/services/PdfFormFiller.test.js
git commit -m "feat: Reisedauer-Abweichungs-Hinweise in BtM-Anmerkungen"
```

---

## Task 7: TravelView + TravelController — Bruchteile, Wochentage, App-Hinweis

**Files:**
- Modify: `js/controllers/TravelController.js` (updateScheme: roundToQuarter + weekdays)
- Modify: `js/views/TravelView.js` (step=0,25, Wochentags-Toggle, App-Hinweis)
- Test: `js/controllers/TravelController.test.js` (erweitern), `test/travelview-weekdays.test.js` (neu)

- [ ] **Step 1: Failing Test (Controller) ergaenzen**

Append to `js/controllers/TravelController.test.js` (nutzt das vorhandene `makeModel`/`view`-Muster
der Datei; falls dort kein DOM aufgebaut wird, hier eine jsdom-Umgebung nutzen):

```javascript
import { roundToQuarter } from '../utils/DosageRound.js';

describe('TravelController.updateScheme — Bruchteile + weekdays', () => {
    function setInputs(medId, idx, vals) {
        document.body.innerHTML = '';
        const mk = (id, value) => { const el = document.createElement('input'); el.id = id; el.value = value; document.body.appendChild(el); };
        const sid = `${medId}-${idx}`;
        mk(`scheme-start-${sid}`, vals.start || '2026-08-10');
        mk(`scheme-end-${sid}`, vals.end || '2026-08-24');
        mk(`dose-morning-${sid}`, vals.morning ?? '0');
        mk(`dose-noon-${sid}`, vals.noon ?? '0');
        mk(`dose-evening-${sid}`, vals.evening ?? '0');
        mk(`dose-night-${sid}`, vals.night ?? '0');
        mk(`reason-note-${sid}`, '');
        // weekday-Toggle + Checkboxen
        const toggle = document.createElement('input'); toggle.type = 'checkbox';
        toggle.id = `weekday-toggle-${sid}`; toggle.checked = !!vals.toggle; document.body.appendChild(toggle);
        for (const wd of ['Mo','Di','Mi','Do','Fr','Sa','So']) {
            const cb = document.createElement('input'); cb.type = 'checkbox';
            cb.className = `weekday-cb-${sid}`; cb.value = wd;
            cb.checked = vals.weekdays ? vals.weekdays.includes(wd) : true;
            document.body.appendChild(cb);
        }
    }
    function makeModel() {
        return { data: { travelData: { start: '2026-08-10', end: '2026-08-24' },
            selectedMedications: [{ id: 'm1', reasonSuggestions: [] }], dosageSchemes: {} },
            save() {}, updateDosageScheme(medId, idx, scheme) { (this.data.dosageSchemes[medId] ||= [])[idx] = scheme; } };
    }
    const view = { updateDosageSchemes() {} };

    it('rundet Dosis weich auf 0,25', () => {
        const model = makeModel();
        setInputs('m1', 0, { morning: '0.3' });
        new TravelController(model, view).updateScheme('m1', 0);
        expect(model.data.dosageSchemes.m1[0].morning).toBe(0.25);
    });
    it('weekdays nur bei Toggle an UND Teilmenge', () => {
        const model = makeModel();
        setInputs('m1', 0, { toggle: true, weekdays: ['Mo', 'Di', 'So'] });
        new TravelController(model, view).updateScheme('m1', 0);
        expect(model.data.dosageSchemes.m1[0].weekdays).toEqual(['Mo', 'Di', 'So']);
    });
    it('Toggle aus -> weekdays leer/nicht gesetzt', () => {
        const model = makeModel();
        setInputs('m1', 0, { toggle: false, weekdays: ['Mo'] });
        new TravelController(model, view).updateScheme('m1', 0);
        const wd = model.data.dosageSchemes.m1[0].weekdays;
        expect(wd === undefined || wd.length === 0).toBe(true);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/controllers/TravelController.test.js`
Expected: FAIL — Dosis nicht gerundet; weekdays nicht ausgelesen.

- [ ] **Step 3: TravelController.updateScheme erweitern**

Modify `js/controllers/TravelController.js`. Oben ergaenzen:

```javascript
import { roundToQuarter } from '../utils/DosageRound.js';
import { WEEKDAYS } from '../utils/Weekdays.js';
```

In `updateScheme` die vier Dosis-Zeilen durch `roundToQuarter(val(...))` ersetzen und weekdays
auslesen. Nach dem Auslesen der reason-Felder und VOR dem `scheme`-Objekt ergaenzen:

```javascript
        const toggle = document.getElementById(`weekday-toggle-${schemeId}`);
        let weekdays = [];
        if (toggle && toggle.checked) {
            const checked = [...document.querySelectorAll(`.weekday-cb-${schemeId}`)]
                .filter((cb) => cb.checked).map((cb) => cb.value);
            // Reihenfolge kanonisch; nur speichern, wenn Teilmenge (<7 und >0).
            const ordered = WEEKDAYS.filter((w) => checked.includes(w));
            if (ordered.length > 0 && ordered.length < 7) weekdays = ordered;
        }
```

Die Dosis-Felder im `scheme`-Objekt:

```javascript
            morning: roundToQuarter(val(`dose-morning-${schemeId}`)),
            noon: roundToQuarter(val(`dose-noon-${schemeId}`)),
            evening: roundToQuarter(val(`dose-evening-${schemeId}`)),
            night: roundToQuarter(val(`dose-night-${schemeId}`)),
```

und `weekdays` ins `scheme`-Objekt aufnehmen (nur wenn nicht leer):

```javascript
        if (weekdays.length > 0) scheme.weekdays = weekdays;
```

(Setze diese Zeile NACH der `const scheme = {...}`-Deklaration und VOR
`this.model.updateDosageScheme(...)`.)

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/controllers/TravelController.test.js`
Expected: PASS.

- [ ] **Step 5: Failing Test (View) schreiben**

Create `test/travelview-weekdays.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { TravelView } from '../js/views/TravelView.js';

beforeEach(() => { document.body.innerHTML = '<div id="dosage-schemes"></div>'; window.app = { controllers: { travel: { updateScheme() {} } } }; });

const med = { id: 'm1', handelsname: 'Concerta', concentration: '36mg', reasonSuggestions: [] };
const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('TravelView — Bruchteile + Wochentage', () => {
    it('Dosis-Felder haben step=0.25', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24', morning: 0.5, noon: 0, evening: 0, night: 0 }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        const inp = document.getElementById('dose-morning-m1-0');
        expect(inp.getAttribute('step')).toBe('0.25');
    });
    it('rendert Wochentags-Toggle und 7 Checkboxen', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24', morning: 1, noon: 0, evening: 0, night: 0 }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        expect(document.getElementById('weekday-toggle-m1-0')).toBeTruthy();
        expect(document.querySelectorAll('.weekday-cb-m1-0')).toHaveLength(7);
    });
    it('zeigt App-Abweichungshinweis bei nicht-taeglicher Einnahme', () => {
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }] };
        new TravelView().updateDosageSchemes([med], travel, schemes);
        expect(document.querySelector('#dosage-schemes').textContent).toMatch(/Mo, Di, So/);
    });
});
```

- [ ] **Step 6: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run test/travelview-weekdays.test.js`
Expected: FAIL — kein step=0.25/Toggle/Hinweis.

- [ ] **Step 7: TravelView erweitern (via Shell wegen innerHTML-Hook)**

Modify `js/views/TravelView.js`:

1. Oben Import ergaenzen: `import { WEEKDAYS } from '../utils/Weekdays.js';` und
   `import { detectDeviations } from '../services/DosageDeviation.js';`
2. Die vier Dosis-`<input type="number" min="0" max="10" ...>` um `step="0.25"` ergaenzen.
3. In `renderDosageSchemeInput`, VOR dem `${schemeIndex > 0 ? ...}`-Block (bzw. nach `${reasonBlock}`),
   einen Wochentags-Block einfuegen. Baue ihn mit escaptem `sid`/`mid`:

```javascript
        const wd = existingScheme?.weekdays || [];
        const nichtTaeglich = wd.length > 0 && wd.length < 7;
        const cbs = WEEKDAYS.map((w) =>
            `<label class="weekday-label"><input type="checkbox" class="weekday-cb-${sid}" value="${w}"${(!nichtTaeglich || wd.includes(w)) ? ' checked' : ''} data-med-id="${mid}" data-scheme-index="${schemeIndex}"> ${w}</label>`).join('');
        const weekdayBlock = `
            <div class="weekday-group">
                <label><input type="checkbox" id="weekday-toggle-${sid}" class="weekday-toggle"${nichtTaeglich ? ' checked' : ''} data-med-id="${mid}" data-scheme-index="${schemeIndex}"> Nicht täglich einnehmen</label>
                <div class="weekday-days" id="weekday-days-${sid}" style="${nichtTaeglich ? '' : 'display:none;'}">${cbs}</div>
            </div>`;
```

   und `${weekdayBlock}` an der genannten Stelle ins Template einfuegen.

4. In `updateDosageSchemes`, NACH dem `container.innerHTML = ...map(...)`-Block und VOR
   `this.bindSchemeEvents()`, je Medikament einen Abweichungs-Hinweis anhaengen. Da die Hinweise
   pro Medikament aus dessen Bloecken kommen, ergaenze innerhalb des `.map(med => {...})` am Ende
   des zurueckgegebenen Medikament-Markups einen Platzhalter-Container
   `<div class="deviation-hint" id="deviation-${escapeHtml(med.id)}"></div>` und fuelle ihn nach dem
   Rendern:

```javascript
        selectedMedications.forEach((med) => {
            const el = document.getElementById(`deviation-${med.id}`);
            if (!el) return;
            const hints = detectDeviations(dosageSchemes[med.id] || [], travelData);
            el.textContent = hints.length ? `ℹ️ ${hints.join(' | ')}` : '';
        });
```

   (Einfuegen direkt vor `this.bindSchemeEvents();`.)

5. In `bindSchemeEvents()` den Toggle verdrahten (Checkboxen ein-/ausblenden + updateScheme):

```javascript
        document.querySelectorAll('.weekday-toggle').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                const days = document.getElementById(`weekday-days-${medId}-${schemeIndex}`);
                if (days) days.style.display = e.currentTarget.checked ? '' : 'none';
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });
        document.querySelectorAll('[class^="weekday-cb-"]').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });
```

   Nach jeder Shell-Aenderung: `node --check js/views/TravelView.js`.

- [ ] **Step 8: Test ausfuehren (soll bestehen)**

Run: `npx vitest run test/travelview-weekdays.test.js`
Expected: PASS.

- [ ] **Step 9: Volle Suite + Build**

Run: `npm test && npm run build`
Expected: alle gruen, Bundle sauber.

- [ ] **Step 10: arc42 + Commit**

Modify `docs/arc42/architecture.md`, Abschnitt „8. Querschnittliche Konzepte" ergaenzen:

```markdown
- Dosierung: Bruchteile (DosageRound, 0,25-Schritte), nicht-tägliche Einnahme (weekdays je Block,
  nur bei Abweichung gespeichert). Reisedauer = Tage im Ausland; Reichdauer = eindeutige Einnahmetage
  (Weekdays.intakeDaySet); Gesamtmenge = Σ(Einnahmetage × Dosis) × Wirkstoff. Abweichungs-Hinweise
  (DosageDeviation) in App + BtM-Anmerkungen.
```

```bash
git add js/controllers/TravelController.js js/controllers/TravelController.test.js js/views/TravelView.js test/travelview-weekdays.test.js docs/arc42/architecture.md
git commit -m "feat: Bruchteil-Eingabe (step 0,25) + Wochentags-UI + App-Abweichungshinweis"
```

---

## Self-Review (Plan ↔ Spec)

- **A. DosageRound** → Task 1. **Weekdays (countIntakeDays/intakeDaySet/isActiveWeekday)** → Task 2.
- **A. DosageScheme weekdays/isDaily/toJSON** → Task 3.
- **B. Aggregation: blockDays=Einnahmetage, reachDurationDays=intakeDaySet.size, Wochentags-Notation** → Task 4.
- **C. DosageDeviation.detectDeviations (nicht-täglich + Lücke)** → Task 5.
- **E. PdfFormFiller: Abweichungen in Anmerkungen, travelData durchgereicht** → Task 6.
- **D. UI: step=0,25, Wochentags-Toggle, App-Hinweis; updateScheme roundToQuarter + weekdays nur bei Abweichung** → Task 7.
- **Medikationsplan-Notation mit Wochentags-Präfix** → Task 4 (notation wird auch vom Plan genutzt).
- **arc42** → Task 7 Step 10.

**Placeholder-Scan:** keine TBD/TODO; jeder Code-Step zeigt konkreten Code + erwartete Ausgabe.

**Typ-/Namenskonsistenz:** `roundToQuarter`, `WEEKDAYS`/`isActiveWeekday`/`countIntakeDays`/`intakeDaySet`,
`weekdays`/`isDaily`, `detectDeviations(blocks, travelData)`, `reachDurationDays(blocks)`,
`weekday-toggle-<sid>`/`weekday-cb-<sid>`/`weekday-days-<sid>`/`deviation-<medId>` durchgaengig gleich.

**Bekannte Kopplung:** TravelView-IDs (`weekday-toggle-<sid>` etc.) und TravelController-Auslese
verwenden dasselbe Format `<medId>-<idx>` — in Task 7 identisch spezifiziert.

**Regressionshinweis:** Task 4 aendert die Semantik von `reachDurationDays`. Bestehende PdfFormFiller-
Tests nutzen taegliche, lueckenlose Bloecke -> Reichdauer bleibt = Gesamttage; kein Bruch erwartet.
Falls ein Aggregator-Bestandstest die alte „erster Start bis letztes Ende"-Zahl fest erwartet,
in Task 4 Step 4 auf die eindeutigen Einnahmetage aktualisieren.
