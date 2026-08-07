# BtM-Formular-Feinschliff (TP0) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das amtliche BtM-Formular formatgerecht befüllen (Konzentration mit Bezugsmenge, Gesamtmenge mit Stückzahl, „keine" bei leeren Anmerkungen) und dabei eine einheitliche deutsche Zahlenformatierung einziehen, die spätere Bruchteil-Dosierungen (½/¼) korrekt darstellt.

**Architecture:** Zwei neue reine Util-Module (`NumberFormat`, `DosageForm`) kapseln Formatierung und Bezugseinheit als je eine Quelle der Wahrheit. `DosageAggregator` bekommt `totalUnits()`. `PdfFormFiller` und `MedicationPlanBuilder` nutzen diese Helfer statt eigener Ad-hoc-Logik. Reine Funktionen, TDD, keine Datenmodell-/Asset-Änderung.

**Tech Stack:** JavaScript (ES-Module), Vitest, pdf-lib (nur lesend im Test).

---

## Konventionen
- Vitest, Test neben dem Code als `<name>.test.js`.
- Jeder Task: Failing Test zuerst, dann Implementierung, dann grün, dann Commit.
- Commit-Prefix: `feat:`/`refactor:`/`test:`/`docs:`. Commit-Trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Datei-Struktur
- **Neu:** `js/utils/NumberFormat.js` (+ Test) — `formatNumber(value)`.
- **Neu:** `js/utils/DosageForm.js` (+ Test) — `formUnit(form) -> {singular, plural}`.
- **Ändern:** `js/services/DosageAggregator.js` — `totalUnits()`, Notation 4-Slot + `formatNumber`.
- **Ändern:** `js/services/PdfFormFiller.js` — Konzentration/Gesamtmenge/Anmerkungen.
- **Ändern:** `js/services/MedicationPlanBuilder.js` — `unitForForm` auf `DosageForm`, Mengen über `formatNumber`.
- **Ändern:** `docs/arc42/architecture.md`.

---

## Task 1: NumberFormat-Util

**Files:**
- Create: `js/utils/NumberFormat.js`
- Test: `js/utils/NumberFormat.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/NumberFormat.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { formatNumber } from './NumberFormat.js';

describe('formatNumber', () => {
    it('ganze Zahl ohne Nachkommastellen', () => {
        expect(formatNumber(20)).toBe('20');
        expect(formatNumber(0)).toBe('0');
    });
    it('Dezimalkomma, keine ueberfluessigen Nullen', () => {
        expect(formatNumber(10.5)).toBe('10,5');
        expect(formatNumber(0.25)).toBe('0,25');
        expect(formatNumber(10.75)).toBe('10,75');
    });
    it('rundet kaufmaennisch auf 2 Nachkommastellen', () => {
        expect(formatNumber(10.005)).toBe('10,01');
        expect(formatNumber(1.999)).toBe('2');
    });
    it('behandelt String-Eingaben und Ungueltiges', () => {
        expect(formatNumber('0.5')).toBe('0,5');
        expect(formatNumber(null)).toBe('0');
        expect(formatNumber(undefined)).toBe('0');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/NumberFormat.test.js`
Expected: FAIL — `Cannot find module './NumberFormat.js'`.

- [ ] **Step 3: Implementierung schreiben**

Create `js/utils/NumberFormat.js`:

```javascript
// Einheitliche deutsche Zahlenformatierung: Dezimalkomma, bis zu 2 Nachkommastellen,
// keine ueberfluessigen Nullen. Eine Quelle der Wahrheit fuer alle Mengenangaben.

export function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    // Auf 2 Nachkommastellen runden, dann ueberfluessige Nullen entfernen.
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    let s = rounded.toFixed(2);        // z.B. "10.50"
    s = s.replace(/\.?0+$/, '');        // "10.5" / "20"
    return s.replace('.', ',');         // deutsches Komma
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/NumberFormat.test.js`
Expected: PASS — 4 Testfaelle gruen.

- [ ] **Step 5: Commit**

```bash
git add js/utils/NumberFormat.js js/utils/NumberFormat.test.js
git commit -m "feat: NumberFormat-Util (Komma, bis 2 Nachkommastellen)"
```

---

## Task 2: DosageForm-Util (Bezugseinheit)

**Files:**
- Create: `js/utils/DosageForm.js`
- Test: `js/utils/DosageForm.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/DosageForm.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { formUnit } from './DosageForm.js';

describe('formUnit', () => {
    it('Kapsel/Retardkapsel', () => {
        expect(formUnit('Kapsel')).toEqual({ singular: 'Kapsel', plural: 'Kapseln' });
        expect(formUnit('Retardkapsel')).toEqual({ singular: 'Kapsel', plural: 'Kapseln' });
    });
    it('Tablette/Retardtablette', () => {
        expect(formUnit('Tablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
        expect(formUnit('Retardtablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
    });
    it('Tropfen/Saft -> ml', () => {
        expect(formUnit('Tropfen')).toEqual({ singular: 'ml', plural: 'ml' });
        expect(formUnit('Lösung')).toEqual({ singular: 'ml', plural: 'ml' });
    });
    it('Fallback fuer Unbekanntes', () => {
        expect(formUnit('Zäpfchen')).toEqual({ singular: 'Einheit', plural: 'Einheiten' });
        expect(formUnit('')).toEqual({ singular: 'Einheit', plural: 'Einheiten' });
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/DosageForm.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementierung schreiben**

Create `js/utils/DosageForm.js`:

```javascript
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
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/DosageForm.test.js`
Expected: PASS — 4 Testfaelle gruen.

- [ ] **Step 5: Commit**

```bash
git add js/utils/DosageForm.js js/utils/DosageForm.test.js
git commit -m "feat: DosageForm-Util (Bezugseinheit aus Darreichungsform)"
```

---

## Task 3: DosageAggregator — totalUnits + dezimale 4-Slot-Notation

**Files:**
- Modify: `js/services/DosageAggregator.js`
- Test: `js/services/DosageAggregator.test.js` (bestehende Datei erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/services/DosageAggregator.test.js`:

```javascript
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
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: FAIL — `totalUnits` undefiniert; Notation liefert `0.5-0-0.5` (Punkt, 3 Slots).

- [ ] **Step 3: Implementierung anpassen**

Modify `js/services/DosageAggregator.js`. Oben ergaenzen:

```javascript
import { DateHelper } from '../utils/DateHelper.js';
import { formatNumber } from '../utils/NumberFormat.js';
```

`notation()` (Zeile 14-17) ersetzen durch dezimale 4-Slot-Notation:

```javascript
function notation(block) {
    return [block.morning, block.noon, block.evening, block.night]
        .map((v) => formatNumber(v || 0))
        .join('-');
}
```

`totalSubstance` und eine neue `totalUnits`-Methode im Export-Objekt. Ersetze den
`totalSubstance`-Block durch:

```javascript
    /** Σ über alle Bloecke (Tage_i * Tagesdosis_i). */
    totalUnits(blocks) {
        return blocks.reduce((sum, b) => sum + blockDays(b) * dailyDose(b), 0);
    },

    /** Gesamtwirkstoffmenge = totalUnits * concentrationValue, auf 2 NK gerundet. */
    totalSubstance(blocks, concentrationValue) {
        const raw = this.totalUnits(blocks) * concentrationValue;
        return Math.round((raw + Number.EPSILON) * 100) / 100;
    },
```

(Hinweis: `totalSubstance` rundet jetzt auf 2 Nachkommastellen statt auf ganze Zahl,
damit Bruchteil-Dosen korrekte mg-Summen ergeben.)

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: PASS — neue und bestehende Aggregations-Tests gruen. Falls ein bestehender
Notation-Test `1-0-1` erwartet: er wird zu `1-0-1-0` (4-Slot) — den erwarteten Wert
in diesem Test auf die 4-Slot-Form aktualisieren.

- [ ] **Step 5: Commit**

```bash
git add js/services/DosageAggregator.js js/services/DosageAggregator.test.js
git commit -m "feat: DosageAggregator.totalUnits + dezimale 4-Slot-Notation"
```

---

## Task 4: PdfFormFiller — Konzentration, Gesamtmenge, Anmerkungen

**Files:**
- Modify: `js/services/PdfFormFiller.js` (Zeile 60-66, buildInstruction Zeile 17-29)
- Test: `js/services/PdfFormFiller.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/services/PdfFormFiller.test.js` (innerhalb der bestehenden Datei, die
`templateBytes`, `patient`, `doctor`, `travel`, `medication`, `blocks` bereits definiert):

```javascript
describe('fillCertificate — Formatkorrekturen (TP0)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };

    it('Konzentration als Wert Einheit/Bezugsmenge', async () => {
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('WirkstoffKonzentration')).toBe('36 mg/Retardtablette');
    });

    it('Gesamtmenge mit Stueckzahl und Plural', async () => {
        // blocks: 4 Tage*(1+1)=8 + 11 Tage*(2+1)=33 => 41 Stueck; 41*36=1476 mg
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Gesamtwirkstoffmenge')).toBe('1476 mg, entspricht 41 Retardtabletten');
    });

    it('Einzelstueck -> Singular', async () => {
        const oneDay = [{ startDate: '2026-08-10', endDate: '2026-08-10',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks: oneDay });
        expect(g('Gesamtwirkstoffmenge')).toBe('36 mg, entspricht 1 Retardtablette');
    });

    it('Bruchteil -> Dezimalkomma in Stueckzahl', async () => {
        const half = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 0.5, noon: 0, evening: 0, night: 0 }]; // 10 Tage*0.5=5 Stueck
        const g = await read({ patient, doctor, travel, medication, blocks: half });
        expect(g('Gesamtwirkstoffmenge')).toContain('entspricht 5 Retardtabletten');
    });

    it('leere Anmerkungen -> "keine"', async () => {
        const oneBlock = [{ startDate: '2026-08-10', endDate: '2026-08-13',
            morning: 1, noon: 0, evening: 1, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks: oneBlock });
        expect(g('Anmerkungen')).toBe('keine');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: FAIL — Konzentration ist `36mg`, Gesamtmenge ohne „entspricht", Anmerkungen leer.

- [ ] **Step 3: Implementierung anpassen**

Modify `js/services/PdfFormFiller.js`. Oben ergaenzen:

```javascript
import { formatNumber } from '../utils/NumberFormat.js';
import { formUnit } from '../utils/DosageForm.js';
```

`buildInstruction` (Zeile 17-29): leere Anmerkungen auf `keine` setzen. Ersetze die
`return`-Zweige:

```javascript
function buildInstruction(blocks) {
    if (blocks.length <= 1) {
        return {
            gebrauchsanweisung: blocks[0] ? DosageAggregator.instructionChain(blocks) : '',
            anmerkungen: 'keine',
        };
    }
    const chain = DosageAggregator.instructionChain(blocks);
    const detailed = DosageAggregator.detailedSchedule(blocks);
    const gebrauchsanweisung = chain.length > 40 ? 's. Anmerkungen' : chain;
    return { gebrauchsanweisung, anmerkungen: detailed || 'keine' };
}
```

Konzentration + Gesamtmenge (Zeile 60-66) ersetzen:

```javascript
    setField(form, 'WirkstoffKonzentration',
        `${formatNumber(medication.concentrationValue)} ${medication.concentrationUnit}/${formUnit(medication.darreichungsform).singular}`);
    const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks);
    setField(form, 'Gebrauchsanweisung', gebrauchsanweisung);
    setField(form, 'Anmerkungen', anmerkungen);
    const stueck = DosageAggregator.totalUnits(blocks);
    const einheit = stueck === 1 ? formUnit(medication.darreichungsform).singular
                                 : formUnit(medication.darreichungsform).plural;
    setField(form, 'Gesamtwirkstoffmenge',
        `${formatNumber(DosageAggregator.totalSubstance(blocks, medication.concentrationValue))} ${medication.concentrationUnit}, entspricht ${formatNumber(stueck)} ${einheit}`);
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: PASS — neue TP0-Tests gruen. Bestehender Test, der `Gesamtwirkstoffmenge`
`1476` per `toContain` prueft, bleibt gruen (Wert enthaelt weiterhin `1476`).

- [ ] **Step 5: Commit**

```bash
git add js/services/PdfFormFiller.js js/services/PdfFormFiller.test.js
git commit -m "feat: BtM-Formular Konzentration/Gesamtmenge/Anmerkungen formatgerecht"
```

---

## Task 5: MedicationPlanBuilder auf zentrale Helfer umstellen

**Files:**
- Modify: `js/services/MedicationPlanBuilder.js`
- Test: `js/services/MedicationPlanBuilder.test.js` (erweitern)

- [ ] **Step 1: Failing Test ergaenzen**

Append to `js/services/MedicationPlanBuilder.test.js`:

```javascript
describe('MedicationPlanBuilder — Format (TP0)', () => {
    it('formatiert Bruchteil-Dosen mit Komma und Einheit', () => {
        const m = [{ id: 'x', handelsname: 'Test', wirkstoff: 'W',
            darreichungsform: 'Tablette', concentrationValue: 10, concentrationUnit: 'mg' }];
        const s = { x: [{ startDate: '2026-08-10', endDate: '2026-08-12',
            morning: 0.5, noon: 0, evening: 0, night: 0 }] };
        const rows = buildMedicationPlanRows(m, s);
        expect(rows[0].morgens).toBe('0,5');
        expect(rows[0].einheit).toBe('Stück');
    });
});
```

(Hinweis: Die BMP-Einheit-Spalte bleibt fachlich „Stück"; die Zaehl-Einheit fuer die
Formular-Gesamtmenge kommt aus `formUnit`. Der Test prueft nur die Komma-Formatierung
der Dosis.)

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/MedicationPlanBuilder.test.js`
Expected: FAIL — `morgens` ist `'0.5'` (Punkt) statt `'0,5'`.

- [ ] **Step 3: Implementierung anpassen**

Modify `js/services/MedicationPlanBuilder.js`. Oben ergaenzen:

```javascript
import { formatNumber } from '../utils/NumberFormat.js';
```

In `buildMedicationPlanRows` die Dosis-Felder ueber `formatNumber` ausgeben. Ersetze
die vier `String(b.morning ?? 0)`-artigen Zuweisungen im Block-Zweig durch:

```javascript
                morgens: formatNumber(b.morning ?? 0),
                mittags: formatNumber(b.noon ?? 0),
                abends: formatNumber(b.evening ?? 0),
                nachts: formatNumber(b.night ?? 0),
```

`unitForForm` (Zeile 15) bleibt fachlich fuer die BMP-„Einheit"-Spalte („Stück") und
wird nicht ersetzt — die Zaehl-Einheit (Kapseln/Tabletten) betrifft nur das amtliche
Formular (Task 4). Kein weiterer Umbau noetig.

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/MedicationPlanBuilder.test.js`
Expected: PASS. Falls ein bestehender Test die Notation `1-0-1` erwartet, auf `1-0-1-0`
bzw. den formatierten Wert anpassen.

- [ ] **Step 5: Commit**

```bash
git add js/services/MedicationPlanBuilder.js js/services/MedicationPlanBuilder.test.js
git commit -m "refactor: Medikationsplan-Dosen ueber formatNumber (Dezimalkomma)"
```

---

## Task 6: arc42 + Gesamtverifikation

**Files:**
- Modify: `docs/arc42/architecture.md`

- [ ] **Step 1: arc42 ergaenzen**

Modify `docs/arc42/architecture.md`, Abschnitt „5. Bausteinsicht" bei Utils ergaenzen:

```markdown
  - NumberFormat (deutsche Zahlenformatierung, bis 2 Nachkommastellen)
  - DosageForm (Bezugseinheit aus Darreichungsform)
```

Und in „8. Querschnittliche Konzepte" ergaenzen:

```markdown
- Mengen/Dosen: einheitlich über formatNumber() (Dezimalkomma). Formular-Konzentration
  als „Wert Einheit/Bezugsmenge", Gesamtmenge als „X mg, entspricht Y <Form>",
  leere Anmerkungen als „keine".
```

- [ ] **Step 2: Volle Testsuite**

Run: `npm test`
Expected: alle Test-Dateien gruen (inkl. NumberFormat, DosageForm, erweiterte
Aggregator-/Filler-/Plan-Tests).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Bundle sauber, keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add docs/arc42/architecture.md
git commit -m "docs: arc42 um NumberFormat/DosageForm + Formularbefuellung"
```

---

## Self-Review (Plan ↔ Spec)

- **A. Bezugseinheit** -> Task 2 (`formUnit`), genutzt in Task 4. ✓
- **A2. Zahlenformatierung** -> Task 1 (`formatNumber`), genutzt in Task 3/4/5. ✓
- **B. Stückzahl-Aggregation** -> Task 3 (`totalUnits`, `totalSubstance` DRY). ✓
- **C. Konzentration/Gesamtmenge/Anmerkungen** -> Task 4. ✓
- **Notation dezimal 4-Slot** -> Task 3. ✓
- **Medikationsplan-Mengen** -> Task 5. ✓
- **arc42** -> Task 6. ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Code-Step zeigt konkreten Code + erwartete
Ausgabe.

**Typ-/Namenskonsistenz:** `formatNumber`, `formUnit(...).singular/.plural`,
`totalUnits`, `totalSubstance` durchgaengig gleich verwendet.

**Bekannte Anpassung:** die Notation wechselt von 3-Slot (`1-0-1`) auf 4-Slot dezimal
(`1-0-1-0`). Bestehende Tests, die die alte Notation erwarten, werden in Task 3/5 auf
die neue Form aktualisiert (im jeweiligen Step vermerkt).
