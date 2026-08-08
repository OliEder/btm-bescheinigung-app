# Grund & ICD im Medikationsplan (UI) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro Dosierblock einen Grund (Indikation aus kuratierten Vorschlägen oder Freitext) und eine optionale Freitext-Begründung erfassen; Grund + ICD-10-GM im Medikationsplan anzeigen, die Freitext-Begründung zusätzlich im BtM-Anmerkungen-Feld.

**Architecture:** `reasonSuggestions` werden beim Hinzufügen in die `MedicationInstance` gesnapshottet. `DosageScheme` bekommt `reasonLabel`/`reasonIcd10`/`reasonNote` (letzteres ersetzt das tote `notes`). Die TravelView rendert je Block ein Grund-Dropdown + Freitextfelder; `TravelController` füllt neue Blöcke vom Vorblock vor und liest die Felder aus. `MedicationPlanBuilder` und `PdfFormFiller` geben Grund bzw. Freitext aus.

**Tech Stack:** JavaScript (ES-Module), Vitest, pdf-lib (nur lesend im Test), jsdom.

---

## Konventionen
- Vitest, Test neben dem Code als `<name>.test.js` bzw. bestehende Testdateien erweitern.
- Jeder Task: Failing Test zuerst, dann Implementierung, dann grün, dann Commit.
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Escaping-Regel (Bestand): Modelldaten via `escapeHtml`, Attribute via `setDataset`, IDs bleiben Strings.
- View-Dateien enthalten `innerHTML` — falls ein Edit-Tool das blockiert, die Datei per Shell
  (Here-Doc/Python-Replace) schreiben; danach `node --check <datei>`.

## Datei-Struktur
- **Ändern:** `js/models/MedicationInstance.js` — `reasonSuggestions`-Snapshot.
- **Ändern:** `js/models/Medication.js` — `DosageScheme`: notes→reasonNote + reasonLabel/reasonIcd10.
- **Ändern:** `js/controllers/TravelController.js` — Vorausfüllen + updateScheme-Auslese.
- **Ändern:** `js/views/TravelView.js` — Grund-UI je Block.
- **Ändern:** `js/services/MedicationPlanBuilder.js` — grund-Spalte + reasonNote in hinweise.
- **Ändern:** `js/services/PdfFormFiller.js` — reasonNote in Anmerkungen.
- **Ändern:** `docs/arc42/architecture.md`.

---

## Task 1: MedicationInstance — reasonSuggestions-Snapshot

**Files:**
- Modify: `js/models/MedicationInstance.js`
- Test: `js/models/MedicationInstance.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/models/MedicationInstance.test.js`:

```javascript
describe('MedicationInstance reasonSuggestions (Grund/ICD)', () => {
    it('uebernimmt reasonSuggestions aus der Resource', () => {
        const inst = MedicationInstance.fromRepository({
            id: 'x', productFamily: 'Concerta', form: { text: 'Retardtablette' },
            ingredient: [{ itemCodeableConcept: { text: 'Methylphenidat' },
                strength: { numerator: { value: 36, unit: 'mg' } } }],
            reasonSuggestions: [{ label: 'ADHS (mit Hyperaktivität)', icd10: 'F90.0', icd11: '6A05.1' }],
        });
        expect(inst.reasonSuggestions).toHaveLength(1);
        expect(inst.reasonSuggestions[0].icd10).toBe('F90.0');
    });
    it('leere Liste ohne reasonSuggestions', () => {
        const inst = MedicationInstance.fromRepository({ id: 'y', productFamily: 'X',
            form: { text: 'Tablette' }, ingredient: [{ itemCodeableConcept: { text: 'W' },
                strength: { numerator: { value: 5, unit: 'mg' } } }] });
        expect(inst.reasonSuggestions).toEqual([]);
    });
    it('custom-Instanz hat leere reasonSuggestions', () => {
        const inst = MedicationInstance.custom({ handelsname: 'Eigen', wirkstoff: 'X',
            darreichungsform: 'Tablette', concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.reasonSuggestions).toEqual([]);
    });
    it('toJSON enthaelt reasonSuggestions', () => {
        const inst = new MedicationInstance({ handelsname: 'A', wirkstoff: 'B',
            darreichungsform: 'Tablette', concentrationValue: 1, concentrationUnit: 'mg',
            reasonSuggestions: [{ label: 'L', icd10: 'X', icd11: 'Y' }] });
        expect(inst.toJSON().reasonSuggestions).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/MedicationInstance.test.js`
Expected: FAIL — `reasonSuggestions` ist undefined.

- [ ] **Step 3: Implementierung**

Modify `js/models/MedicationInstance.js`.

Im Konstruktor (nach `concentrationUnit`) ergaenzen:

```javascript
        this.reasonSuggestions = Array.isArray(data.reasonSuggestions) ? data.reasonSuggestions : [];
```

In `fromRepository` das neue Feld durchreichen (in das an `new MedicationInstance({...})`
uebergebene Objekt aufnehmen):

```javascript
            reasonSuggestions: resource.reasonSuggestions || [],
```

In `toJSON()` ergaenzen (nach `concentrationUnit`):

```javascript
            reasonSuggestions: this.reasonSuggestions,
```

(`custom(data)` braucht keine Aenderung — ohne `reasonSuggestions` im data wird der
Konstruktor-Default `[]` verwendet.)

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/MedicationInstance.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/models/MedicationInstance.js js/models/MedicationInstance.test.js
git commit -m "feat: MedicationInstance snapshottet reasonSuggestions"
```

---

## Task 2: DosageScheme — notes→reasonNote + reasonLabel/reasonIcd10

**Files:**
- Modify: `js/models/Medication.js` (DosageScheme Konstruktor `:266-275`, toJSON `:340-351`)
- Test: `js/models/Medication.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/models/Medication.test.js`:

```javascript
describe('DosageScheme Grund/ICD-Felder', () => {
    it('nimmt reasonLabel/reasonIcd10/reasonNote an', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const d = new DosageScheme({ reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: 'Dosis erhöht' });
        expect(d.reasonLabel).toBe('ADHS');
        expect(d.reasonIcd10).toBe('F90.0');
        expect(d.reasonNote).toBe('Dosis erhöht');
    });
    it('liest Alt-Feld notes als reasonNote (Rueckwaertskompat.)', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const d = new DosageScheme({ notes: 'alt' });
        expect(d.reasonNote).toBe('alt');
    });
    it('toJSON enthaelt reason-Felder und kein notes', async () => {
        const { DosageScheme } = await import('./Medication.js');
        const j = new DosageScheme({ reasonLabel: 'X', reasonIcd10: 'Y', reasonNote: 'Z' }).toJSON();
        expect(j).toMatchObject({ reasonLabel: 'X', reasonIcd10: 'Y', reasonNote: 'Z' });
        expect(j).not.toHaveProperty('notes');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: FAIL — reason-Felder undefined; toJSON hat `notes`.

- [ ] **Step 3: Implementierung**

Modify `js/models/Medication.js`. Konstruktor-Zeile `this.notes = data.notes || '';` (`:274`)
ersetzen durch:

```javascript
        this.reasonLabel = data.reasonLabel || '';
        this.reasonIcd10 = data.reasonIcd10 || '';
        this.reasonNote = data.reasonNote ?? data.notes ?? '';
```

toJSON (`:340-351`): die Zeile `notes: this.notes` ersetzen durch:

```javascript
            reasonLabel: this.reasonLabel,
            reasonIcd10: this.reasonIcd10,
            reasonNote: this.reasonNote
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: PASS.

- [ ] **Step 5: Volle Suite**

Run: `npm test`
Expected: alle gruen (kein bestehender Test las `scheme.notes`).

- [ ] **Step 6: Commit**

```bash
git add js/models/Medication.js js/models/Medication.test.js
git commit -m "feat: DosageScheme reasonLabel/reasonIcd10/reasonNote (notes umbenannt)"
```

---

## Task 3: TravelController — Vorausfüllen + updateScheme-Auslese

**Files:**
- Modify: `js/controllers/TravelController.js` (addDosageScheme `:73-101`, updateScheme `:114-125`)
- Test: `js/controllers/TravelController.test.js` (neu)

- [ ] **Step 1: Failing Test schreiben**

Create `js/controllers/TravelController.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { TravelController } from './TravelController.js';

function makeModel(selectedMeds, schemes = {}) {
    return {
        data: {
            travelData: { start: '2026-08-10', end: '2026-08-24' },
            selectedMedications: selectedMeds,
            dosageSchemes: schemes,
        },
        save() {},
        updateDosageScheme(medId, idx, scheme) {
            (this.data.dosageSchemes[medId] ||= [])[idx] = scheme;
        },
    };
}
const view = { updateDosageSchemes() {} };

describe('TravelController.addDosageScheme — Vorausfuellen Grund', () => {
    it('erster Block: Grund aus erstem reasonSuggestion der Instanz', () => {
        const model = makeModel([{ id: 'm1', reasonSuggestions: [
            { label: 'ADHS', icd10: 'F90.0', icd11: '6A05.1' }] }]);
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        const block = model.data.dosageSchemes.m1[0];
        expect(block.reasonLabel).toBe('ADHS');
        expect(block.reasonIcd10).toBe('F90.0');
    });
    it('Folgeblock: Grund vom Vorblock, reasonNote leer', () => {
        const model = makeModel(
            [{ id: 'm1', reasonSuggestions: [{ label: 'ADHS', icd10: 'F90.0' }] }],
            { m1: [{ startDate: '2026-08-10', endDate: '2026-08-12',
                reasonLabel: 'Eigen', reasonIcd10: '', reasonNote: 'x' }] });
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        const block = model.data.dosageSchemes.m1[1];
        expect(block.reasonLabel).toBe('Eigen');
        expect(block.reasonIcd10).toBe('');
        expect(block.reasonNote).toBe('');
    });
    it('ohne reasonSuggestions: Grund leer', () => {
        const model = makeModel([{ id: 'm1', reasonSuggestions: [] }]);
        const ctrl = new TravelController(model, view);
        ctrl.addDosageScheme('m1');
        expect(model.data.dosageSchemes.m1[0].reasonLabel).toBe('');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/controllers/TravelController.test.js`
Expected: FAIL — neue Bloecke tragen keine reason-Felder.

- [ ] **Step 3: addDosageScheme anpassen**

Modify `js/controllers/TravelController.js`. Den `schemes.push({...})`-Block (`:84-91`)
ersetzen durch (Grund vom Vorblock oder erstem Suggestion):

```javascript
        let reasonLabel = '';
        let reasonIcd10 = '';
        if (schemes.length > 0) {
            const prev = schemes[schemes.length - 1];
            reasonLabel = prev.reasonLabel || '';
            reasonIcd10 = prev.reasonIcd10 || '';
        } else {
            const inst = this.model.data.selectedMedications.find((m) => m.id === medicationId);
            const first = inst?.reasonSuggestions?.[0];
            if (first) { reasonLabel = first.label; reasonIcd10 = first.icd10; }
        }

        schemes.push({
            startDate: startDate,
            endDate: this.model.data.travelData.end,
            morning: 0,
            noon: 0,
            evening: 0,
            night: 0,
            reasonLabel,
            reasonIcd10,
            reasonNote: '',
        });
```

- [ ] **Step 4: updateScheme anpassen (Grund-Felder auslesen)**

Modify `updateScheme` (`:114-125`). Den `scheme`-Objektaufbau ersetzen durch (Grund-Felder
aus den DOM-Elementen, die die View in Task 4 rendert; defensiv mit optionalem Zugriff):

```javascript
    updateScheme(medicationId, schemeIndex) {
        const schemeId = `${medicationId}-${schemeIndex}`;
        const val = (id) => document.getElementById(id)?.value ?? '';
        const reasonSelect = document.getElementById(`reason-select-${schemeId}`);
        const reasonSelectVal = reasonSelect ? reasonSelect.value : 'none';
        const suggestions = (this.model.data.selectedMedications
            .find((m) => m.id === medicationId)?.reasonSuggestions) || [];

        let reasonLabel = '';
        let reasonIcd10 = '';
        if (reasonSelectVal === 'custom') {
            reasonLabel = val(`reason-custom-${schemeId}`);
        } else if (reasonSelectVal !== 'none' && reasonSelectVal !== '') {
            const s = suggestions[Number(reasonSelectVal)];
            if (s) { reasonLabel = s.label; reasonIcd10 = s.icd10; }
        }

        const scheme = {
            startDate: val(`scheme-start-${schemeId}`),
            endDate: val(`scheme-end-${schemeId}`),
            morning: parseInt(val(`dose-morning-${schemeId}`)) || 0,
            noon: parseInt(val(`dose-noon-${schemeId}`)) || 0,
            evening: parseInt(val(`dose-evening-${schemeId}`)) || 0,
            night: parseInt(val(`dose-night-${schemeId}`)) || 0,
            reasonLabel,
            reasonIcd10,
            reasonNote: val(`reason-note-${schemeId}`),
        };

        this.model.updateDosageScheme(medicationId, schemeIndex, scheme);
```

(Falls nach dieser Zeile weiterer Code in `updateScheme` stand — z.B. ein `view.update...`
Aufruf —, unveraendert lassen.)

- [ ] **Step 5: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/controllers/TravelController.test.js`
Expected: PASS — 3 Tests gruen.

- [ ] **Step 6: Commit**

```bash
git add js/controllers/TravelController.js js/controllers/TravelController.test.js
git commit -m "feat: Grund vorausfuellen (Vorblock/erster Vorschlag) + updateScheme-Auslese"
```

---

## Task 4: TravelView — Grund-UI je Dosierblock

**Files:**
- Modify: `js/views/TravelView.js` (renderDosageSchemeInput, bindSchemeEvents)
- Test: `test/travelview-reason.test.js` (neu)

- [ ] **Step 1: Failing Test schreiben**

Create `test/travelview-reason.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { TravelView } from '../js/views/TravelView.js';

beforeEach(() => { document.body.innerHTML = '<div id="dosage-schemes"></div>'; });

const med = { id: 'm1', handelsname: 'Concerta', concentration: '36mg',
    reasonSuggestions: [{ label: 'ADHS', icd10: 'F90.0', icd11: '6A05.1' }] };
const travel = { start: '2026-08-10', end: '2026-08-24' };

describe('TravelView Grund-UI', () => {
    it('rendert ein Grund-Dropdown mit Vorschlag + kein Grund + Anderer Grund', () => {
        const view = new TravelView();
        window.app = { controllers: { travel: {} } };
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: '' }] };
        view.updateDosageSchemes([med], travel, schemes);
        const select = document.getElementById('reason-select-m1-0');
        expect(select).toBeTruthy();
        const opts = [...select.options].map((o) => o.textContent);
        expect(opts).toContain('ADHS');
        expect(opts.some((t) => /kein Grund/i.test(t))).toBe(true);
        expect(opts.some((t) => /Anderer Grund/i.test(t))).toBe(true);
    });
    it('escaped boesartige reasonSuggestion-Labels', () => {
        const view = new TravelView();
        window.app = { controllers: { travel: {} } };
        const evilMed = { ...med, reasonSuggestions: [{ label: '<img src=x onerror=alert(1)>', icd10: 'X' }] };
        const schemes = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonLabel: '', reasonIcd10: '', reasonNote: '' }] };
        view.updateDosageSchemes([evilMed], travel, schemes);
        expect(document.querySelector('#dosage-schemes img')).toBeNull();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run test/travelview-reason.test.js`
Expected: FAIL — kein `reason-select-*` im DOM.

- [ ] **Step 3: renderDosageSchemeInput erweitern**

Modify `js/views/TravelView.js`. `renderDosageSchemeInput(medicationId, schemeIndex, ...)`
bekommt Zugriff auf die Instanz/Suggestions. Da die Methode aktuell nur `(medicationId,
schemeIndex, startDate, endDate, existingScheme)` erhaelt, wird die Suggestions-Liste über
die in `updateDosageSchemes` verfuegbare Medikamentenliste hereingereicht. Vorgehen:

In `updateDosageSchemes(selectedMedications, travelData, dosageSchemes)` beim Rendern jedes
Medikaments die `reasonSuggestions` des `med` an `renderDosageSchemeInput` weitergeben
(zusaetzliches Argument), z.B.:

```javascript
this.renderDosageSchemeInput(med.id, index, scheme.startDate, scheme.endDate, scheme, med.reasonSuggestions || [])
```

und in der Signatur von `renderDosageSchemeInput` `suggestions = []` ergaenzen.

Innerhalb `renderDosageSchemeInput`, VOR dem `${schemeIndex > 0 ? ...}`-Block (Schema
entfernen), den Grund-Block einfuegen. Baue die Options-HTML sicher auf:

```javascript
        const sid = escapeHtml(schemeId);
        const mid = escapeHtml(medicationId);
        const selLabel = existingScheme?.reasonLabel || '';
        const selIcd = existingScheme?.reasonIcd10 || '';
        const matchIdx = suggestions.findIndex((s) => s.label === selLabel && (s.icd10 || '') === (selIcd || ''));
        const selectedVal = selLabel === '' ? 'none' : (matchIdx >= 0 ? String(matchIdx) : 'custom');
        const options = suggestions.map((s, i) =>
            `<option value="${i}"${selectedVal === String(i) ? ' selected' : ''}>${escapeHtml(s.label)}</option>`).join('');
        const noneSel = selectedVal === 'none' ? ' selected' : '';
        const customSel = selectedVal === 'custom' ? ' selected' : '';
        const customStyle = selectedVal === 'custom' ? '' : 'display:none;';
        const reasonBlock = `
            <div class="reason-group">
                <label>Grund</label>
                <select id="reason-select-${sid}" class="reason-select" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    ${options}
                    <option value="custom"${customSel}>Anderer Grund…</option>
                    <option value="none"${noneSel}>— kein Grund —</option>
                </select>
                <input type="text" id="reason-custom-${sid}" class="reason-custom" placeholder="Eigener Grund"
                       style="${customStyle}" value="${escapeHtml(selectedVal === 'custom' ? selLabel : '')}"
                       data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                <input type="text" id="reason-note-${sid}" class="reason-note" placeholder="Anmerkung zur Dosierung"
                       value="${escapeHtml(existingScheme?.reasonNote || '')}"
                       data-med-id="${mid}" data-scheme-index="${schemeIndex}">
            </div>`;
```

und `${reasonBlock}` an der passenden Stelle im zurueckgegebenen Template einfuegen
(vor dem „Schema entfernen"-Button).

- [ ] **Step 4: bindSchemeEvents erweitern**

Modify `bindSchemeEvents()` in `js/views/TravelView.js`. Zusaetzlich zu den bestehenden
Dosis-/Datum-Listenern die Grund-Elemente verdrahten:

```javascript
        document.querySelectorAll('.reason-select').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                // Freitextfeld ein-/ausblenden.
                const sid = `${medId}-${schemeIndex}`;
                const custom = document.getElementById(`reason-custom-${sid}`);
                if (custom) custom.style.display = e.currentTarget.value === 'custom' ? '' : 'none';
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });
        document.querySelectorAll('.reason-custom, .reason-note').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });
```

- [ ] **Step 5: Test ausfuehren (soll bestehen)**

Run: `npx vitest run test/travelview-reason.test.js`
Expected: PASS — Dropdown vorhanden, Optionen korrekt, kein Markup-Inject.

- [ ] **Step 6: Volle Suite + Build**

Run: `npm test && npm run build`
Expected: alle gruen, Bundle sauber.

- [ ] **Step 7: Commit**

```bash
git add js/views/TravelView.js test/travelview-reason.test.js
git commit -m "feat: Grund-UI je Dosierblock (Dropdown + Eigen-Grund + Anmerkung)"
```

---

## Task 5: PDF-Ausgabe — Medikationsplan-Grund + BtM-Anmerkungen

**Files:**
- Modify: `js/services/MedicationPlanBuilder.js` (buildMedicationPlanRows: grund/hinweise)
- Modify: `js/services/PdfFormFiller.js` (buildInstruction)
- Test: `js/services/MedicationPlanBuilder.test.js`, `js/services/PdfFormFiller.test.js` (erweitern)

- [ ] **Step 1: Failing Tests (MedicationPlanBuilder) ergaenzen**

Append to `js/services/MedicationPlanBuilder.test.js`:

```javascript
describe('MedicationPlanBuilder — Grund/ICD (Grund/ICD-UI)', () => {
    const meds = [{ id: 'm1', handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
        darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg' }];
    it('grund = Label (ICD10)', () => {
        const s = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-12',
            morning: 1, noon: 0, evening: 0, night: 0,
            reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: '' }] };
        const rows = buildMedicationPlanRows(meds, s);
        expect(rows[0].grund).toBe('ADHS (F90.0)');
    });
    it('grund = nur Label ohne ICD; leer ohne Grund', () => {
        const s = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-12',
            morning: 1, noon: 0, evening: 0, night: 0,
            reasonLabel: 'Eigen', reasonIcd10: '', reasonNote: '' }] };
        expect(buildMedicationPlanRows(meds, s)[0].grund).toBe('Eigen');
        const s2 = { m1: [{ startDate: '2026-08-10', endDate: '2026-08-12',
            morning: 1, noon: 0, evening: 0, night: 0 }] };
        expect(buildMedicationPlanRows(meds, s2)[0].grund).toBe('');
    });
    it('reasonNote wird an hinweise angehaengt', () => {
        // zwei Bloecke -> multi -> zeitraum vorhanden; reasonNote per " · " angehaengt
        const s = { m1: [
            { startDate: '2026-08-10', endDate: '2026-08-12', morning: 1, noon: 0, evening: 0, night: 0, reasonNote: 'Start' },
            { startDate: '2026-08-13', endDate: '2026-08-24', morning: 2, noon: 0, evening: 0, night: 0, reasonNote: 'erhöht' },
        ] };
        const rows = buildMedicationPlanRows(meds, s);
        expect(rows[0].hinweise).toContain('Start');
        expect(rows[0].hinweise).toMatch(/·/);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/MedicationPlanBuilder.test.js`
Expected: FAIL — grund ist '' , hinweise ohne reasonNote.

- [ ] **Step 3: MedicationPlanBuilder anpassen**

Modify `js/services/MedicationPlanBuilder.js` in `buildMedicationPlanRows`. In beiden
Push-Stellen (leerer-Bloecke-Zweig UND Block-Schleife) `grund`/`hinweise` berechnen.

Helper oben in der Datei ergaenzen:

```javascript
function grundText(b) {
    const label = b.reasonLabel || '';
    if (!label) return '';
    return b.reasonIcd10 ? `${label} (${b.reasonIcd10})` : label;
}
function hinweisText(zeitraum, b) {
    const note = b.reasonNote || '';
    if (zeitraum && note) return `${zeitraum} · ${note}`;
    return zeitraum || note;
}
```

Im Block-Zweig (`for (const b of blocks)`): die Zeilen `einheit: ..., hinweise: zeitraum,
grund: ''` ersetzen durch:

```javascript
                einheit: unitForForm(form),
                hinweise: hinweisText(zeitraum, b),
                grund: grundText(b),
```

Im leeren-Bloecke-Zweig (`blocks.length === 0`): `hinweise: '', grund: ''` bleiben leer
(kein Block, kein Grund) — unveraendert lassen.

- [ ] **Step 4: Test (Plan) ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/MedicationPlanBuilder.test.js`
Expected: PASS.

- [ ] **Step 5: Failing Tests (PdfFormFiller) ergaenzen**

Append to `js/services/PdfFormFiller.test.js`:

```javascript
describe('fillCertificate — reasonNote in Anmerkungen (Grund/ICD-UI)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };
    it('reasonNote landet in Anmerkungen, ICD/Label nicht', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 1, night: 0,
            reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: 'Titration' }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toContain('Titration');
        expect(g('Anmerkungen')).not.toContain('F90.0');
        expect(g('Anmerkungen')).not.toContain('ADHS');
    });
    it('ohne reasonNote und ohne Titration -> keine', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-13',
            morning: 1, noon: 0, evening: 1, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toBe('keine');
    });
});
```

- [ ] **Step 6: Test (Filler) ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: FAIL — reasonNote steht nicht in Anmerkungen.

- [ ] **Step 7: PdfFormFiller.buildInstruction anpassen**

Modify `js/services/PdfFormFiller.js`. `buildInstruction(blocks)` (`:19-31`) so aendern,
dass reasonNotes gesammelt und an die Anmerkung angehaengt werden:

```javascript
function buildInstruction(blocks) {
    const notes = [...new Set(blocks.map((b) => (b.reasonNote || '').trim()).filter(Boolean))];
    const notesText = notes.join(' | ');
    const append = (base) => {
        const merged = [base, notesText].filter((s) => s && s !== 'keine').join(' | ');
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

(Bei einem einzelnen Block ohne reasonNote → `append('')` = `'keine'`. Bei Titration wird
`detailed` mit den notes per ` | ` verbunden.)

- [ ] **Step 8: Test (Filler) ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: PASS.

- [ ] **Step 9: Volle Suite + Build**

Run: `npm test && npm run build`
Expected: alle gruen, Bundle sauber.

- [ ] **Step 10: arc42 + Commit**

Modify `docs/arc42/architecture.md`, Abschnitt „6. Laufzeitsicht" oder „8. Querschnittliche
Konzepte" ergaenzen:

```markdown
- Grund/ICD: reasonSuggestions (Stammdaten) -> Snapshot in MedicationInstance -> Grund-Dropdown
  je Dosierblock -> reasonLabel/reasonIcd10/reasonNote im DosageScheme. Anzeige: Medikationsplan
  Grund-Spalte „Label (ICD-10-GM)", reasonNote in Hinweise. BtM-Formular: nur reasonNote in
  Anmerkungen (nie ICD/Diagnose).
```

```bash
git add js/services/MedicationPlanBuilder.js js/services/MedicationPlanBuilder.test.js js/services/PdfFormFiller.js js/services/PdfFormFiller.test.js docs/arc42/architecture.md
git commit -m "feat: Grund/ICD im Medikationsplan + reasonNote in BtM-Anmerkungen"
```

---

## Self-Review (Plan ↔ Spec)

- **A. MedicationInstance reasonSuggestions** → Task 1. ✓
- **A. DosageScheme notes→reasonNote + reasonLabel/reasonIcd10** → Task 2. ✓
- **B. Vorausfüllen (Vorblock/erster Vorschlag)** → Task 3 (addDosageScheme). ✓
- **C. UI Dropdown + Eigen-Grund + Anmerkung + updateScheme-Auslese** → Task 3 (updateScheme) + Task 4 (View). ✓
- **D. Medikationsplan Grund-Spalte + reasonNote in hinweise** → Task 5. ✓
- **E. BtM-Formular reasonNote in Anmerkungen, nie ICD/Label** → Task 5. ✓
- **Sicherheit (escapeHtml/setDataset, IDs Strings)** → Task 4 (View, inkl. XSS-Test). ✓
- **arc42** → Task 5 Step 10. ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Code-Step zeigt konkreten Code + erwartete Ausgabe.

**Typ-/Namenskonsistenz:** `reasonLabel`/`reasonIcd10`/`reasonNote`, `reasonSuggestions`
(`{label, icd10, icd11}`), `reason-select-<id>`/`reason-custom-<id>`/`reason-note-<id>`,
`grundText`/`hinweisText`/`buildInstruction` durchgaengig gleich.

**Bekannte Kopplung:** Task 4 (View rendert `reason-select-*`) und Task 3 (updateScheme liest
`reason-select-*`) muessen dieselben Element-IDs verwenden — Format `reason-select-${medId}-${idx}`,
`reason-custom-${…}`, `reason-note-${…}`. In beiden Tasks identisch spezifiziert.
