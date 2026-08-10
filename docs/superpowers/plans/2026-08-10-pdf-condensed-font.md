# PDF Condensed-Schrift + kontrolliertes Font-Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bettet Fira Sans Condensed (OFL, self-hosted) in alle BtM-Formularfelder ein und ersetzt reines Auto-Scaling durch kontrolliertes Sizing (Standard 11 pt je Feld, Feld-weise Reduktion bis 7 pt, dann Auto 0).

**Architecture:** Neue reine Funktion `fitFontSize(font, text, fieldWidth)` misst Textbreite (pdf-lib `font.widthOfTextAtSize`) gegen Feldbreite und liefert 11 / [7..11] / 0. `fillCertificate(templateBytes, data, fontBytes?)` bettet bei übergebenen `fontBytes` Fira via fontkit ein und lässt `setField` je Feld die passende Größe setzen; ohne `fontBytes` bleibt das bisherige Verhalten (Abwärtskompatibilität). `PDFController` lädt die `.ttf` wie das Template und reicht die Bytes durch.

**Tech Stack:** Vanilla JS (ES-Module), pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, Vitest, Webpack (asset/resource).

---

## Datei-Struktur

**Neu:**
```
js/services/PdfFieldFont.js       fitFontSize(font, text, fieldWidth, opts) + STD_SIZE/MIN_SIZE
js/services/PdfFieldFont.test.js
assets/fonts/FiraSansCondensed-Regular.ttf   (bereits im Working Tree)
assets/fonts/FiraSansCondensed-OFL.txt       (bereits im Working Tree)
```
**Modifiziert:**
```
webpack.config.js                 .ttf-Regel (asset/resource)
js/services/PdfFormFiller.js      fontBytes-Param, fontkit-Embed, setField nutzt fitFontSize
js/services/PdfFormFiller.test.js Größen-/Font-Tests
js/controllers/PDFController.js    Fira laden (wie Template) + durchreichen
docs/arc42/architecture.md        §8/§9 „PDF-Schrift"
package.json/package-lock.json    @pdf-lib/fontkit (bereits ergänzt)
```

**Konventionen:** `npm test` = `vitest run`; Test-Globs `test/**/*.test.js` + `js/**/*.test.js`.
Keine dynamische HTML-Injektion (reine PDF-Logik). Font/OFL sind bereits im Working Tree.

---

## Task 1: fitFontSize — reine Mess-/Entscheidungsfunktion

**Files:** Create `js/services/PdfFieldFont.js`, `js/services/PdfFieldFont.test.js`

- [ ] **Step 1: Write the failing test** — `js/services/PdfFieldFont.test.js`:
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fitFontSize, STD_SIZE, MIN_SIZE } from './PdfFieldFont.js';

let font;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

describe('fitFontSize', () => {
  it('kurzer Text in breitem Feld → Standardgröße 11', () => {
    expect(fitFontSize(font, 'Meier', 200)).toBe(STD_SIZE);
    expect(STD_SIZE).toBe(11);
  });
  it('leerer Text → Standardgröße', () => {
    expect(fitFontSize(font, '', 40)).toBe(STD_SIZE);
  });
  it('Text der bei 11 nicht passt, aber schrumpfbar → zwischen MIN und STD, < 11', () => {
    // Feld schmal genug, dass 11pt nicht passt, aber >=7pt schon
    const size = fitFontSize(font, 'Dr. med. Mustermann', 90);
    expect(size).toBeLessThan(STD_SIZE);
    expect(size).toBeGreaterThanOrEqual(MIN_SIZE);
  });
  it('Text der auch bei MIN nicht passt → 0 (Auto)', () => {
    expect(fitFontSize(font, 'Prof. Dr. med. Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen', 60)).toBe(0);
  });
  it('respektiert die Grenzen (nie größer als STD, nie zwischen 0 und MIN)', () => {
    const size = fitFontSize(font, 'Testwert mittel', 100);
    expect(size === 0 || (size >= MIN_SIZE && size <= STD_SIZE)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run js/services/PdfFieldFont.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `js/services/PdfFieldFont.js`:**
```js
// Reine Mess-/Entscheidungsfunktion fuer die Feld-Schriftgroesse.
// Standard 11pt; passt der Text nicht, in 0,5-Schritten bis MIN (7pt) reduzieren;
// passt auch MIN nicht, 0 zurueckgeben (pdf-lib Auto-Sizing als Notnagel).
// font: pdf-lib PDFFont (muss widthOfTextAtSize(text, size) bereitstellen).

export const STD_SIZE = 11;
export const MIN_SIZE = 7;

export function fitFontSize(font, text, fieldWidth, { std = STD_SIZE, min = MIN_SIZE, padding = 4 } = {}) {
  const value = String(text ?? '');
  if (value === '') return std;
  const avail = fieldWidth - padding;
  if (avail <= 0) return 0;
  if (font.widthOfTextAtSize(value, std) <= avail) return std;
  for (let s = std - 0.5; s >= min; s -= 0.5) {
    if (font.widthOfTextAtSize(value, s) <= avail) return s;
  }
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run js/services/PdfFieldFont.test.js` → PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add js/services/PdfFieldFont.js js/services/PdfFieldFont.test.js
git commit -m "PDF: fitFontSize — kontrolliertes Feld-Sizing (11 -> 7 -> Auto)"
```

---

## Task 2: Webpack .ttf-Regel

**Files:** Modify `webpack.config.js`

- [ ] **Step 1: .ttf als Asset registrieren** — in `webpack.config.js` in der `module.rules`-Liste nach der `.pdf`-Zeile ergänzen:
```js
            { test: /\.ttf$/i, type: 'asset/resource' },
```
Kontext: aktuell existiert `{ test: /\.pdf$/i, type: 'asset/resource' }`. Die neue Zeile direkt darunter einfügen.

- [ ] **Step 2: Build prüfen (Regel bricht nichts)** — `npx webpack --mode production 2>&1 | tail -5`
Expected: kompiliert ohne Fehler (die Regel wird erst genutzt, wenn PDFController die .ttf importiert — Task 4).

- [ ] **Step 3: Commit**
```bash
git add webpack.config.js
git commit -m "PDF: webpack .ttf asset/resource-Regel (für Font-Import)"
```

---

## Task 3: PdfFormFiller — Fira einbetten + kontrolliertes Sizing

**Files:** Modify `js/services/PdfFormFiller.js`, `js/services/PdfFormFiller.test.js`

- [ ] **Step 1: Write the failing test** — an `js/services/PdfFormFiller.test.js` anhängen:
```js
import { fitFontSize } from './PdfFieldFont.js'; // sicherstellen, dass Modul existiert

describe('fillCertificate — Fira Condensed + Sizing', () => {
    const tpl = () => new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));
    const firaBytes = new Uint8Array(readFileSync('assets/fonts/FiraSansCondensed-Regular.ttf'));
    const base = { patient, doctor, travel, medication, blocks, flatten: false };

    const readField = async (data, fieldName) => {
        const bytes = await fillCertificate(tpl(), data, firaBytes);
        const form = (await (await import('pdf-lib')).PDFDocument.load(bytes)).getForm();
        const field = form.getTextField(fieldName);
        return { text: field.getText() || '', da: field.acroField.getDefaultAppearance() };
    };

    it('bettet Fira Condensed ein (Default Appearance referenziert die Schrift)', async () => {
        const { da } = await readField(base, 'Name');
        expect(da).toMatch(/FiraSansCondensed/);
    });
    it('kurzer Wert → Standardgröße 11pt', async () => {
        const shortDoc = { ...doctor, title: '', lastname: 'Meier' };
        const { text, da } = await readField({ ...base, doctor: shortDoc }, 'Name');
        expect(text).toBe('Meier');
        expect(da).toMatch(/\b11 Tf\b/);
    });
    it('sehr langer Wert → schrumpft (< 11) oder Auto (0), Wert bleibt vollständig gesetzt', async () => {
        const longDoc = { ...doctor, title: 'Prof. Dr. med.', lastname: 'Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen' };
        const { text, da } = await readField({ ...base, doctor: longDoc }, 'Name');
        expect(text).toBe('Prof. Dr. med. Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen');
        const size = Number((da.match(/\/\S+\s+([\d.]+)\s+Tf/) || [])[1]);
        expect(size).toBeLessThan(11); // 0 (Auto) oder eine reduzierte Groesse
    });
    it('ohne fontBytes: bisheriges Verhalten (kein Wurf, Feld gesetzt)', async () => {
        const bytes = await fillCertificate(tpl(), base); // kein 3. Argument
        const form = (await (await import('pdf-lib')).PDFDocument.load(bytes)).getForm();
        expect(form.getTextField('Name').getText()).toBe('Dr. med. Aerztin');
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run js/services/PdfFormFiller.test.js` → FAIL (fontBytes ignoriert, keine Fira-Appearance).

- [ ] **Step 3: Implement** — Änderungen in `js/services/PdfFormFiller.js`:

  (a) Oben ergänzen (nach den bestehenden Imports):
```js
import fontkit from '@pdf-lib/fontkit';
import { fitFontSize } from './PdfFieldFont.js';
```

  (b) `setField` erweitern — die aktuelle Funktion
```js
function setField(form, name, value) {
    try {
        const field = form.getTextField(name);
        field.setText(String(value ?? ''));
        // Auto-Groesse: lange Werte (z.B. Titel + langer Nachname, Wohnanschrift)
        // schrumpfen, um ins Feld zu passen, statt beim Flatten abgeschnitten zu
        // werden. setFontSize(0) = pdf-lib-Auto-Sizing.
        field.setFontSize(0);
    } catch {
        // Feld existiert nicht in dieser Formularvariante — ueberspringen.
    }
}
```
  ersetzen durch:
```js
function setField(form, name, value, font) {
    try {
        const field = form.getTextField(name);
        const text = String(value ?? '');
        field.setText(text);
        if (font) {
            // Kontrolliertes Sizing: Standard 11pt, sonst bis 7pt, sonst Auto (0).
            let width = 0;
            try { width = field.acroField.getWidgets()[0].getRectangle().width; } catch { width = 0; }
            const size = width > 0 ? fitFontSize(font, text, width) : 0;
            field.setFontSize(size);
            field.updateAppearances(font);
        } else {
            // Abwaertskompatibel: bisheriges reines Auto-Sizing (Standardschrift).
            field.setFontSize(0);
        }
    } catch {
        // Feld existiert nicht in dieser Formularvariante — ueberspringen.
    }
}
```

  (c) `fillCertificate`-Signatur + Font-Embedding. Die aktuelle Zeile
```js
export async function fillCertificate(templateBytes, data) {
    const { patient, doctor, travel, medication, blocks = [], flatten = true } = data;
    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();
```
  ersetzen durch:
```js
export async function fillCertificate(templateBytes, data, fontBytes) {
    const { patient, doctor, travel, medication, blocks = [], flatten = true } = data;
    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();

    // Optionale Condensed-Schrift: einbetten und an setField weiterreichen.
    let font = null;
    if (fontBytes) {
        doc.registerFontkit(fontkit);
        font = await doc.embedFont(fontBytes, { subset: true });
    }
```

  (d) ALLE `setField(form, ...)`-Aufrufe in `fillCertificate` um `font` als letztes Argument ergänzen. Das betrifft jeden Aufruf, z.B.:
```js
    setField(form, 'Name', [doctor.title, doctor.lastname].filter(Boolean).join(' ').trim(), font);
    setField(form, 'Vorname', doctor.firstname, font);
    setField(form, 'Telefon', doctor.phone, font);
    setField(form, 'Anschrift', doctor.address, font);
    setField(form, 'Name_2', patient.lastname, font);
    setField(form, 'Vorname_2', patient.firstname, font);
    setField(form, 'Nr des Passes oder eines', patient.passport, font);
    setField(form, 'Geburtsort', patient.birthplace, font);
    setField(form, 'Geburtsdatum', DateHelper.formatDate(patient.birthdate), font);
    setField(form, 'Staatsangehoerigkeit', patient.nationality, font);
    setField(form, 'Geschlecht', patient.gender, font);
    setField(form, 'Wohnanschrift', `${patient.street}, ${patient.zip} ${patient.city}`, font);
    setField(form, 'Dauer der Reise in Tagen', travel.duration, font);
    setField(form, 'Gültigkeitsdauer der Erlaubnis vonbis max 30 Tage', `${DateHelper.formatDate(travel.start)} - ${DateHelper.formatDate(travel.end)}`, font);
    setField(form, 'Handelsbezeichnung oder Sonderzubereitung', medication.handelsname, font);
    setField(form, 'Darreichungsform', medication.darreichungsform, font);
    setField(form, 'Internationale Bezeichnung des Wirkstoffs', medication.wirkstoff, font);
```
  Ebenso die restlichen `setField`-Aufrufe (WirkstoffKonzentration, Gebrauchsanweisung, Anmerkungen, Gesamtwirkstoffmenge, Reichdauer …) jeweils um `, font` ergänzen. **Kein `setField`-Aufruf ohne das `font`-Argument.**

  (e) Vor dem Flatten globalen Appearance-Sync ergänzen. Die aktuelle Endsequenz
```js
    if (flatten) form.flatten();
    return doc.save();
```
  ersetzen durch:
```js
    if (font) form.updateFieldAppearances(font);
    if (flatten) form.flatten();
    return doc.save();
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run js/services/PdfFormFiller.test.js` → alle grün (inkl. der bestehenden Titel-/Vokabular-/Format-Tests). Falls ein Bestandstest eine feste `Tf`-Größe erwartete, die jetzt 11 statt 12/5 ist: den Erwartungswert an das neue kontrollierte Sizing anpassen (Testwert ist kurz → 11), NICHT die Produktionslogik.

- [ ] **Step 5: Commit**
```bash
git add js/services/PdfFormFiller.js js/services/PdfFormFiller.test.js
git commit -m "PDF: Fira Condensed einbetten + kontrolliertes Feld-Sizing (11/7/Auto)"
```

---

## Task 4: PDFController — Fira laden und durchreichen

**Files:** Modify `js/controllers/PDFController.js`

Kontext: `PDFController` importiert `templateUrl` und cached `_templateBytes` via `_loadTemplate()`. Analog wird die Fira-`.ttf` geladen und an `buildCertificateBytes`/`fillCertificate` weitergereicht.

- [ ] **Step 1: Font-Import + Loader ergänzen** — in `js/controllers/PDFController.js`:

  (a) Import oben ergänzen (nach `import templateUrl ...`):
```js
import fontUrl from '../../assets/fonts/FiraSansCondensed-Regular.ttf';
```

  (b) `buildCertificateBytes` um einen optionalen `fontBytes`-Parameter erweitern. Die aktuelle Funktion
```js
export async function buildCertificateBytes(templateBytes, session, medicationId) {
    const medication = session.selectedMedications.find((m) => m.id === medicationId);
    const blocks = session.dosageSchemes[medicationId] || [];
    return fillCertificate(templateBytes, {
        patient: session.currentPatient,
        doctor: session.currentDoctor,
        travel: session.travelData,
        medication,
        blocks,
    });
}
```
  ersetzen durch:
```js
export async function buildCertificateBytes(templateBytes, session, medicationId, fontBytes) {
    const medication = session.selectedMedications.find((m) => m.id === medicationId);
    const blocks = session.dosageSchemes[medicationId] || [];
    return fillCertificate(templateBytes, {
        patient: session.currentPatient,
        doctor: session.currentDoctor,
        travel: session.travelData,
        medication,
        blocks,
    }, fontBytes);
}
```

  (c) Font-Loader in der Klasse ergänzen (neben `_loadTemplate`), und im Konstruktor `this._fontBytes = null;` (dort, wo `this._templateBytes = null;` steht):
```js
    async _loadFont() {
        if (this._fontBytes) return this._fontBytes;
        const res = await fetch(fontUrl);
        this._fontBytes = new Uint8Array(await res.arrayBuffer());
        return this._fontBytes;
    }
```

  (d) In `generatePDFs()` die Font-Bytes laden und durchreichen. Die aktuelle Schleifen-Vorbereitung
```js
        const templateBytes = await this._loadTemplate();
        this.generatedPDFs = [];
```
  ersetzen durch:
```js
        const templateBytes = await this._loadTemplate();
        const fontBytes = await this._loadFont();
        this.generatedPDFs = [];
```
  und den Aufruf
```js
            const bytes = await buildCertificateBytes(templateBytes, this.model.data, med.id);
```
  ersetzen durch:
```js
            const bytes = await buildCertificateBytes(templateBytes, this.model.data, med.id, fontBytes);
```

- [ ] **Step 2: Bestehenden PDFController-Test prüfen** — `npx vitest run js/controllers/PDFController.test.js`
Expected: grün. Der bestehende Test ruft `buildCertificateBytes` ohne `fontBytes` auf → Abwärtskompatibilität (kein 4. Argument) greift, Verhalten unverändert.

- [ ] **Step 3: Build prüfen** — `npx webpack --mode production 2>&1 | tail -5`
Expected: kompiliert; die `.ttf` wird jetzt als Asset emittiert (Regel aus Task 2).

- [ ] **Step 4: Commit**
```bash
git add js/controllers/PDFController.js
git commit -m "PDF: PDFController lädt Fira Condensed und reicht sie an fillCertificate"
```

---

## Task 5: Font-Assets + OFL committen

**Files:** `assets/fonts/FiraSansCondensed-Regular.ttf`, `assets/fonts/FiraSansCondensed-OFL.txt`

- [ ] **Step 1: Prüfen, dass die Dateien vorhanden und nicht gitignored sind** — Run:
```bash
git check-ignore assets/fonts/FiraSansCondensed-Regular.ttf || echo "trackbar"
ls -la assets/fonts/FiraSansCondensed-Regular.ttf assets/fonts/FiraSansCondensed-OFL.txt
```
Expected: „trackbar"; beide Dateien existieren (TTF ~449 KB, OFL ~4 KB).

- [ ] **Step 2: Commit**
```bash
git add assets/fonts/FiraSansCondensed-Regular.ttf assets/fonts/FiraSansCondensed-OFL.txt
git commit -m "PDF: Fira Sans Condensed (OFL) self-hosted als Asset"
```

> Hinweis: Die `@pdf-lib/fontkit`-Dependency wurde bereits mit dem Spec-Commit hinzugefügt.

---

## Task 6: ARC42

**Files:** Modify `docs/arc42/architecture.md`

- [ ] **Step 1: §8 (Querschnittliche Konzepte) ergänzen** — nach dem bestehenden „Mengen/Dosen"-Punkt einen Punkt anfügen:
```markdown
- PDF-Schrift: Formularfelder nutzen Fira Sans Condensed (SIL OFL, self-hosted unter
  assets/fonts/, via @pdf-lib/fontkit eingebettet). Kontrolliertes Sizing (PdfFieldFont.fitFontSize):
  Standard 11 pt je Feld; passt der Wert nicht, wird das Feld bis 7 pt reduziert, sonst pdf-lib-
  Auto-Sizing (0). Condensed + Auto-Sizing verhindern abgeschnittene lange Werte. fillCertificate
  nimmt die Font-Bytes als optionalen Parameter (ohne → Standardschrift/Auto, abwärtskompatibel).
  Offen (Nice-to-have): global koordiniertes Sizing (eine gemeinsame Größe für alle Felder).
```

- [ ] **Step 2: Commit**
```bash
git add docs/arc42/architecture.md
git commit -m "PDF: ARC42 um Condensed-Schrift + Sizing ergänzt"
```

---

## Task 7: Gesamtabnahme

- [ ] **Step 1: Unit-Tests** — `npm test` → 244 bestehende + neu (PdfFieldFont 5, PdfFormFiller +4) grün.
- [ ] **Step 2: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert, `.ttf` als Asset emittiert.
- [ ] **Step 3: End-to-End-Sichtprüfung (optional, falls pdftotext vorhanden)** — ein Zertifikat mit Fira erzeugen und via `pdftotext` prüfen, dass lange Werte vollständig erscheinen (kein Abschnitt). Andernfalls genügt der PdfFormFiller-Test (langer Name → Wert vollständig gesetzt, Größe < 11).
- [ ] **Step 4: DoD-Check**
  - [ ] Fira + OFL im Repo, als Asset gebündelt, in alle Formularfelder eingebettet.
  - [ ] `fitFontSize` (11/7/0) + Tests; `setField` nutzt es; `fillCertificate(templateBytes, data, fontBytes?)`.
  - [ ] Alle Tests grün; Build kompiliert.
  - [ ] ARC42 ergänzt.

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** fitFontSize (T1), webpack .ttf (T2), Embed+Sizing in Filler (T3), Controller-
  Durchreichung (T4), Assets/OFL (T5), ARC42 (T6), Abnahme (T7). Global-Sizing bewusst NICHT
  enthalten (späteres Nice-to-have, im Spec + ARC42 notiert).
- **Signatur-Konsistenz:** `fitFontSize(font, text, fieldWidth, opts)`, `STD_SIZE=11`, `MIN_SIZE=7`;
  `setField(form, name, value, font)`; `fillCertificate(templateBytes, data, fontBytes)`;
  `buildCertificateBytes(templateBytes, session, medicationId, fontBytes)` — durchgängig gleich.
- **Abwärtskompatibilität:** ohne `fontBytes`/`font` bleibt das bisherige Verhalten (bestehende
  Tests + PDFController.test ohne 4. Argument bleiben grün).
- **Kein `setField` ohne font-Argument** in `fillCertificate` (sonst Standardschrift statt Fira).
- **Reihenfolge:** Werte+Größe je Feld → `updateFieldAppearances(font)` → flatten (Spike-bestätigt).
