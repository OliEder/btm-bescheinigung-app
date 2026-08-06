# Medikamenten-Stammdaten, offizielles PDF-Formular & Security-Hardening — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die BtM-Reisebescheinigungs-PWA auf ein ES-Module-/Webpack-Build umstellen, kritische Security-Findings (XSS, PII-Logging, unsichere IDs) beheben, ein FHIR-angelehntes Medikamenten-Stammdatenmodell mit Autocomplete + Staerke-Dropdown einfuehren und statt des jsPDF-Nachbaus das amtliche BfArM-017-Formular per `pdf-lib` direkt befuellen.

**Architecture:** Vanilla-JS-MVC bleibt erhalten, wird aber von globalen `<script>`-Tags auf ES-Module + Webpack-Bundle migriert. Persistenz wechselt von dauerhaftem `localStorage` zu Session-Autosave (`sessionStorage`, leicht obfuskiert) plus explizitem Datei-Export/-Import. Ein `MedicationRepository` kapselt den Zugriff auf eine gebuendelte `medications.json` (FHIR-`Medication`-Format). Die PDF-Erzeugung laedt das amtliche AcroForm-PDF und befuellt/flattet dessen Textfelder.

**Tech Stack:** JavaScript (ES2022-Module), Webpack 5, pdf-lib, Vitest + jsdom (neu aufzubauende Test-Infrastruktur), arc42 (Markdown-Doku).

---

## Konventionen (fuer alle Tasks)

- **Sprache:** Code-Kommentare und Doku auf Deutsch (bestehender Stil), Bezeichner auf Englisch/gemischt (bestehender Stil).
- **Tests:** Vitest. Test-Dateien liegen neben dem Code als `<name>.test.js` oder unter `test/`. Jeder Task, der Logik aendert, hat zuerst einen Failing Test (TDD).
- **Commits:** Nach jedem Task committen. Conventional-Commit-Prefix (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- **arc42:** `docs/arc42/architecture.md` wird in Task 0 angelegt und in den betroffenen Tasks fortgeschrieben (Pflichtbestandteil laut Projektvorgabe).
- **Escaping-Regel:** Nach Task 5 gilt: Modelldaten NIE per String-Interpolation in gerendertes Markup. Immer `escapeHtml()` fuer Textinhalte, `element.dataset.*` fuer Attribute.

## Datei-Struktur (Ueberblick)

**Neu:** `webpack.config.js`, `vitest.config.js`, `src/index.template.html`, `js/utils/Sanitize.js`, `js/utils/Obfuscate.js`, `js/repositories/MedicationRepository.js`, `data/medications.json`, `js/models/MedicationInstance.js`, `js/services/PdfFormFiller.js`, `js/services/DosageAggregator.js`, `js/services/Migration.js`, `assets/reise-scheng-formular.pdf`, `docs/arc42/architecture.md`.

**Wesentlich geaendert:** `js/models/DataStore.js` (sessionStorage, UUIDs, kein PII-Log), `js/models/Medication.js` (concentrationValue/Unit), alle `*View.js` (Escaping + dataset), alle Controller (ES-Module, UUIDs), `js/app.js` (Entry-Point, Start-Screen, Migration), `js/controllers/PDFController.js` (PdfFormFiller).

**Entfernt (am Ende):** `js/utils/PDFGenerator.js`, jsPDF-CDN-Tag, `jspdf`-Dependency.

---

## Task 0: arc42-Grundgeruest & Build-Vorbereitung

**Files:**
- Create: `docs/arc42/architecture.md`

- [ ] **Step 1: arc42-Kurzdoku anlegen**

Create `docs/arc42/architecture.md`:

```markdown
# arc42 — BtM-Reisebescheinigung

## 1. Einfuehrung und Ziele
PWA zur Erzeugung von Reise-Bescheinigungen fuer Betaeubungsmittel nach Art. 75 SDUE.
Ausgabe = amtliches BfArM-017-Formular (befuellt, geflattet). Keine Server-Komponente,
alle Daten bleiben lokal beim Nutzer.

## 2. Randbedingungen
- Rein clientseitig (Browser), offline-faehig (PWA).
- Keine dauerhafte Speicherung von PII im Browser (nur Session + Nutzer-Export).
- Amtliches Formular darf inhaltlich nicht veraendert werden (nur Felder befuellen).

## 3. Kontextabgrenzung
Nutzer (Arzt/Praxispersonal) <-> App <-> (lokale Export-Datei, Drucker/Behoerde).
Keine externen Online-Dienste (PZN-API bewusst zurueckgestellt).

## 4. Loesungsstrategie
Vanilla-JS-MVC, Webpack-Bundle, ES-Module. pdf-lib zum Befuellen des AcroForm-PDF.
FHIR-angelehnte Flatfile-Medikamenten-DB hinter einem Repository-Interface.

## 5. Bausteinsicht
- Models: Patient, Doctor, Medication, MedicationInstance, DosageScheme, DataStore
- Repositories: MedicationRepository
- Services: PdfFormFiller, DosageAggregator, Migration
- Utils: Sanitize, Obfuscate, Validator, DateHelper
- Views / Controllers: pro Domaene

## 6. Laufzeitsicht
- Start: Auswahl "Neu anfangen" / "Datei importieren" (+ ggf. Migration).
- Erfassung Patient/Arzt/Medikament/Reise -> Autosave in sessionStorage (obfuskiert).
- "Bescheinigung erzeugen" -> PdfFormFiller befuellt + flattet das amtliche PDF.
- "Exportieren" -> obfuskierte JSON-Datei zum Download.

## 7. Verteilungssicht
Statisches Bundle in `dist/`, auslieferbar ueber beliebigen Static-Host / lokal.

## 8. Querschnittliche Konzepte
- Security: XSS-Escaping (Sanitize), keine PII-Logs, UUIDs, obfuskierte Persistenz.
- Persistenz: sessionStorage (fluechtig) + Datei-Export (Nutzerhoheit).
- Test: Vitest + jsdom.

## 9. Architekturentscheidungen
- ADR-001: pdf-lib statt jsPDF-Nachbau (amtliches Formular direkt befuellen).
- ADR-002: sessionStorage + Export statt dauerhaftem localStorage (Datensparsamkeit).
- ADR-003: FHIR-Medication-Flatfile hinter Repository (spaetere PZN-API austauschbar).

## 10. Qualitaetsanforderungen
Datensparsamkeit, XSS-Freiheit, korrekte Wirkstoffmengen-Aggregation, amtstreue PDF-Ausgabe.

## 11. Risiken und technische Schulden
- Obfuskierung != Verschluesselung (bewusst, s. Scope).
- Keine vollstaendige PZN-Datenbank (lizenzpflichtig).

## 12. Glossar
- BtM: Betaeubungsmittel. SDUE: Schengener Durchfuehrungsuebereinkommen.
- AcroForm: PDF-Formularfelder. Snapshot: kopierte Medikamentenwerte bei Erfassung.
```

- [ ] **Step 2: Commit**

```bash
git add docs/arc42/architecture.md
git commit -m "docs: arc42-Grundgeruest fuer Security/PDF-Umbau"
```

---

## Task 1: Test-Infrastruktur (Vitest) aufsetzen

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `test/smoke.test.js`

- [ ] **Step 1: Vitest + jsdom installieren**

Run:
```bash
npm install -D vitest@^2 jsdom@^25 @vitest/coverage-v8@^2
```
Expected: Installation ohne Fehler, devDependencies um vitest/jsdom/coverage ergaenzt.

- [ ] **Step 2: test-Script in package.json ergaenzen**

Modify `package.json` scripts (start/build/dev behalten):

```json
"scripts": {
    "start": "live-server",
    "build": "webpack --mode production",
    "dev": "webpack-dev-server --mode development",
    "test": "vitest run",
    "test:watch": "vitest"
}
```

- [ ] **Step 3: vitest.config.js anlegen**

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['test/**/*.test.js', 'js/**/*.test.js'],
    },
});
```

- [ ] **Step 4: Smoke-Test schreiben (Failing)**

Create `test/smoke.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Test-Infrastruktur', () => {
    it('fuehrt Tests aus und hat jsdom (document verfuegbar)', () => {
        const el = document.createElement('div');
        el.textContent = 'ok';
        expect(el.textContent).toBe('ok');
    });
});
```

- [ ] **Step 5: Tests ausfuehren**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js test/smoke.test.js
git commit -m "test: Vitest + jsdom Test-Infrastruktur aufsetzen"
```

---

## Task 2: Sanitize-Helper (escapeHtml + setDataset)

**Files:**
- Create: `js/utils/Sanitize.js`
- Test: `js/utils/Sanitize.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/Sanitize.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { escapeHtml, setDataset } from './Sanitize.js';

describe('escapeHtml', () => {
    it('escaped HTML-Sonderzeichen', () => {
        expect(escapeHtml('<script>alert(1)</script>'))
            .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
    it('escaped Anfuehrungszeichen und Ampersand', () => {
        expect(escapeHtml(`a & "b" 'c'`)).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
    });
    it('wandelt null/undefined/Zahl in String', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('setDataset', () => {
    it('setzt data-Attribute ohne HTML-Injection', () => {
        const el = document.createElement('button');
        setDataset(el, { id: '1"><img src=x>', schemeIndex: 3 });
        expect(el.dataset.id).toBe('1"><img src=x>');
        expect(el.dataset.schemeIndex).toBe('3');
        expect(el.querySelector('img')).toBeNull();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/Sanitize.test.js`
Expected: FAIL — `Cannot find module './Sanitize.js'`.

- [ ] **Step 3: Implementierung schreiben**

Create `js/utils/Sanitize.js`:

```javascript
// Zentrale XSS-Absicherung: Textinhalte escapen, Attribute ueber die DOM-API setzen.

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escaped HTML-Sonderzeichen fuer sichere Interpolation in gerendertes Markup.
 * null/undefined -> "", andere Typen werden zu String konvertiert.
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Setzt data-* Attribute sicher ueber element.dataset (keine String-Interpolation).
 */
export function setDataset(element, data) {
    Object.entries(data).forEach(([key, val]) => {
        element.dataset[key] = String(val);
    });
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/Sanitize.test.js`
Expected: PASS — 5 Assertions gruen.

- [ ] **Step 5: Commit**

```bash
git add js/utils/Sanitize.js js/utils/Sanitize.test.js
git commit -m "feat: Sanitize-Helper (escapeHtml + setDataset) gegen XSS"
```

---

## Task 3: Obfuscate-Helper fuer Persistenz

**Files:**
- Create: `js/utils/Obfuscate.js`
- Test: `js/utils/Obfuscate.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/Obfuscate.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { obfuscate, deobfuscate } from './Obfuscate.js';

describe('Obfuscate', () => {
    it('round-trip stellt das Original wieder her', () => {
        const original = JSON.stringify({ a: 1, name: 'Mueller', list: [1, 2, 3] });
        const packed = obfuscate(original);
        expect(packed).not.toBe(original);
        expect(deobfuscate(packed)).toBe(original);
    });
    it('behandelt Unicode korrekt', () => {
        const original = 'Strasse 5, Auto, Attache';
        expect(deobfuscate(obfuscate(original))).toBe(original);
    });
    it('deobfuscate wirft bei nicht dekodierbarem Input', () => {
        expect(() => deobfuscate('%%%kein-base64%%%')).toThrow();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/Obfuscate.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementierung schreiben**

Create `js/utils/Obfuscate.js`:

```javascript
// Leichte Obfuskierung (KEIN Krypto): Unicode-sicheres Base64 + Byte-Shift.
// Nur Sichtschutz gegen zufaelliges Auslesen von sessionStorage/Export-Datei.

const SHIFT = 7;

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode((b + SHIFT) & 0xff); });
    return btoa(binary);
}

function base64ToUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = (binary.charCodeAt(i) - SHIFT) & 0xff;
    }
    return new TextDecoder().decode(bytes);
}

export function obfuscate(plainString) {
    return utf8ToBase64(plainString);
}

export function deobfuscate(packedString) {
    return base64ToUtf8(packedString);
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/Obfuscate.test.js`
Expected: PASS — 3 Assertions gruen.

- [ ] **Step 5: arc42 fortschreiben (Persistenzkonzept)**

Modify `docs/arc42/architecture.md`, Abschnitt "8. Querschnittliche Konzepte", Persistenz-Zeile ersetzen durch:

```markdown
- Persistenz: sessionStorage (fluechtig, obfuskiert via Obfuscate.js = Base64+Shift,
  kein Krypto) + Datei-Export im gleichen Format (Nutzerhoheit ueber Ablageort).
```

- [ ] **Step 6: Commit**

```bash
git add js/utils/Obfuscate.js js/utils/Obfuscate.test.js docs/arc42/architecture.md
git commit -m "feat: Obfuscate-Helper (Base64+Shift) fuer Session/Export"
```

---

## Task 4: Medication-Modell auf concentrationValue/Unit umstellen

**Files:**
- Modify: `js/models/Medication.js` (Konstruktor `:2-14`, Getter `:25-35`, validate `:57-61`, toJSON `:91-105`, Export `:363-366`)
- Test: `js/models/Medication.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/models/Medication.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { Medication } from './Medication.js';

describe('Medication concentration Felder', () => {
    it('nimmt getrennte Felder concentrationValue/concentrationUnit an', () => {
        const m = new Medication({ name: 'Concerta', form: 'Retardtablette',
            substance: 'Methylphenidat', concentrationValue: 36, concentrationUnit: 'mg' });
        expect(m.concentrationValue).toBe(36);
        expect(m.concentrationUnit).toBe('mg');
    });
    it('leitet Value/Unit aus altem concentration-String ab (Migration)', () => {
        const m = new Medication({ name: 'Ritalin', form: 'Tablette',
            substance: 'Methylphenidat', concentration: '10mg' });
        expect(m.concentrationValue).toBe(10);
        expect(m.concentrationUnit).toBe('mg');
    });
    it('concentration-Getter liefert kombinierte Anzeige', () => {
        const m = new Medication({ concentrationValue: 36, concentrationUnit: 'mg' });
        expect(m.concentration).toBe('36mg');
    });
    it('validate() ist gueltig bei positivem Value und Unit', () => {
        const m = new Medication({ name: 'X', form: 'Tablette', substance: 'Y',
            concentrationValue: 20, concentrationUnit: 'mg' });
        expect(m.validate().isValid).toBe(true);
    });
    it('validate() meldet Fehler bei fehlender Konzentration', () => {
        const m = new Medication({ name: 'X', form: 'Tablette', substance: 'Y',
            concentrationValue: 0, concentrationUnit: '' });
        expect(m.validate().isValid).toBe(false);
    });
});

describe('DosageScheme', () => {
    it('bleibt benannter Export mit dailyDose/notation', async () => {
        const mod = await import('./Medication.js');
        expect(mod.DosageScheme).toBeDefined();
        const d = new mod.DosageScheme({ morning: 1, noon: 0, evening: 1, night: 0 });
        expect(d.dailyDose).toBe(2);
        expect(d.notation).toBe('1-0-1');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: FAIL — `Medication` (noch) kein ES-Export; `concentrationValue` ist read-only Getter.

- [ ] **Step 3: Konstruktor umbauen (getrennte Felder, rueckwaertskompatibel)**

Modify `js/models/Medication.js` Konstruktor (`:2-14`), die concentration-Zeile ersetzen durch:

```javascript
        if (data.concentrationValue !== undefined || data.concentrationUnit !== undefined) {
            this.concentrationValue = Number(data.concentrationValue) || 0;
            this.concentrationUnit = data.concentrationUnit || '';
        } else if (data.concentration) {
            const numMatch = String(data.concentration).match(/(\d+(?:\.\d+)?)/);
            const unitMatch = String(data.concentration).match(/\d+(?:\.\d+)?(.*)/);
            this.concentrationValue = numMatch ? parseFloat(numMatch[1]) : 0;
            this.concentrationUnit = unitMatch ? unitMatch[1].trim() : '';
        } else {
            this.concentrationValue = 0;
            this.concentrationUnit = '';
        }
```

- [ ] **Step 4: Getter ersetzen**

Ersetze die beiden Getter `concentrationValue` (`:25-29`) und `concentrationUnit` (`:31-35`) durch einen kombinierten `concentration`-Getter:

```javascript
    get concentration() {
        return `${this.concentrationValue}${this.concentrationUnit}`;
    }
```

- [ ] **Step 5: validate() anpassen**

Ersetze den Konzentrations-Block in `validate()` (`:57-61`) durch:

```javascript
        if (!this.concentrationValue || this.concentrationValue <= 0) {
            errors.push('Konzentration (Wert) ist erforderlich');
        }
        if (!this.concentrationUnit) {
            errors.push('Konzentration (Einheit) ist erforderlich');
        }
```

- [ ] **Step 6: toJSON() + Export anpassen**

Ersetze in `toJSON()` (`:91-105`) die `concentration`-Zeile durch:

```javascript
            concentrationValue: this.concentrationValue,
            concentrationUnit: this.concentrationUnit,
```

Ersetze das CommonJS-Export-Ende (`:363-366`) durch:

```javascript
export { Medication, DosageScheme };
```

- [ ] **Step 7: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/Medication.test.js`
Expected: PASS — alle Assertions gruen.

- [ ] **Step 8: Commit**

```bash
git add js/models/Medication.js js/models/Medication.test.js
git commit -m "refactor: Medication mit concentrationValue/Unit + ES-Module"
```

---

## Task 5: XSS-Fixes in allen Views (escapeHtml + dataset)

> Escaping-Regel gilt ab hier. Views werden auf ES-Import umgestellt (Import von Sanitize.js). Vollstaendige Modul-Verdrahtung: Task 11. Ziel hier: keine un-escapten Modelldaten in gerendertem Markup, keine data-Attribute per String-Interpolation.

**Files:**
- Modify: `js/views/DataManagementView.js` (`:68-74`, `:104-108`, `:147-151`)
- Modify: `js/views/MedicationView.js` (`:100-111`, `:143-150`)
- Modify: `js/views/TravelView.js` (`:81`, `:104`, `:114-145`)
- Modify: `js/views/CertificateView.js` (`:65`, `:86`)
- Test: `test/views-escaping.test.js`

- [ ] **Step 1: Failing/Regressions-Test schreiben**

Create `test/views-escaping.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../js/utils/Sanitize.js';

describe('View-Escaping (Regressionsschutz)', () => {
    it('escapeHtml neutralisiert Namen mit Markup', () => {
        const evil = 'Mue<img src=x onerror=alert(1)>ller';
        const container = document.createElement('div');
        const span = document.createElement('span');
        span.innerHTML = escapeHtml(evil);
        container.appendChild(span);
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toBe(evil);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll bestehen)**

Run: `npx vitest run test/views-escaping.test.js`
Expected: PASS. (Sichert `escapeHtml`-Verhalten; die eigentliche View-Arbeit ist manueller Umbau, abgedeckt vom App-Smoke in Task 12/15.)

- [ ] **Step 3: DataManagementView.js absichern**

Modify `js/views/DataManagementView.js`. Oben ergaenzen:

```javascript
import { escapeHtml, setDataset } from '../utils/Sanitize.js';
```

Patienten-Zeile (`:66-76`): alle Modellwerte in `escapeHtml(...)` wickeln; `data-id` nach dem Rendern per `setDataset(btn, { id: patient.id })` setzen statt interpolieren. Muster:

```javascript
        row.innerHTML = `
            <div class="entry-name">${escapeHtml(patient.firstname)} ${escapeHtml(patient.lastname)}</div>
            <div class="entry-meta">${escapeHtml(new Date(patient.birthdate).toLocaleDateString('de-DE'))}</div>
            <button class="btn-edit">Bearbeiten</button>
            <button class="btn-delete">Loeschen</button>`;
        setDataset(row.querySelector('.btn-edit'), { id: patient.id });
        setDataset(row.querySelector('.btn-delete'), { id: patient.id });
```

Analog Aerzte (`:104-108`) und Links (`:147-151`): Modellwerte escapen, `data-id`/`data-patient-id`/`data-doctor-id` per `setDataset` (Keys: `id`, `patientId`, `doctorId`).

- [ ] **Step 4: MedicationView.js absichern**

Modify `js/views/MedicationView.js`. Oben `import { escapeHtml, setDataset } from '../utils/Sanitize.js';`. Bereiche `:100-111`, `:143-150`: `med.name`/`med.substance`/`med.form`/`med.concentration` escapen. Auswahl-Buttons statt `data-*`-Interpolation:

```javascript
        setDataset(btn, {
            name: med.name,
            substance: med.substance,
            concentration: med.concentration,
        });
```

Listeneintraege: `setDataset(el, { id: med.id })`.

- [ ] **Step 5: TravelView.js absichern**

Modify `js/views/TravelView.js`. Oben `import { escapeHtml, setDataset } from '../utils/Sanitize.js';`. Ueberschrift (`:81`): `${escapeHtml(med.name)} ${escapeHtml(med.concentration)}`. `data-med-id`/`data-scheme-index` (`:104`, `:114-145`) per `setDataset(el, { medId: medicationId, schemeIndex })`. IDs bleiben Strings (kein parseInt).

- [ ] **Step 6: CertificateView.js absichern**

Modify `js/views/CertificateView.js`. Oben `import { escapeHtml, setDataset } from '../utils/Sanitize.js';`. `:65`: `${escapeHtml(pdfInfo.medication.name)} ${escapeHtml(pdfInfo.medication.concentration)}`. `:86`: `setDataset(el, { index })`.

- [ ] **Step 7: Alle Tests ausfuehren**

Run: `npm test`
Expected: PASS — keine Regression.

- [ ] **Step 8: arc42 fortschreiben**

Modify `docs/arc42/architecture.md`, Abschnitt "8", unter Security ergaenzen:

```markdown
  - XSS: Alle Modelldaten laufen durch escapeHtml(); data-Attribute via setDataset()
    (element.dataset), nie per String-Interpolation.
```

- [ ] **Step 9: Commit**

```bash
git add js/views/ test/views-escaping.test.js docs/arc42/architecture.md
git commit -m "fix: XSS-Escaping in allen Views (escapeHtml + dataset)"
```

---

## Task 6: DataStore — UUIDs, PII-Logging entfernen, sessionStorage + Obfuskierung

**Files:**
- Modify: `js/models/DataStore.js` (IDs `:39`, `:88`, `:137`; PII-Log `:303`; Key `:301`; save/load)
- Modify: `js/app.js` (PII-Log `:101`)
- Test: `js/models/DataStore.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/models/DataStore.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore } from './DataStore.js';

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

describe('DataStore Persistenz', () => {
    it('vergibt UUID-Strings fuer neue Patienten (kein Date.now)', () => {
        const store = new DataStore();
        const p = store.addPatient({ firstname: 'A', lastname: 'B' });
        expect(typeof p.id).toBe('string');
        expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('speichert obfuskiert in sessionStorage (kein Klartext-JSON)', () => {
        const store = new DataStore();
        store.addPatient({ firstname: 'Mueller', lastname: 'Geheim' });
        store.save();
        const raw = sessionStorage.getItem('btm-session-data');
        expect(raw).toBeTruthy();
        expect(raw).not.toContain('Geheim');
    });

    it('laedt zuvor gespeicherte Daten aus sessionStorage zurueck', () => {
        const store = new DataStore();
        store.addPatient({ firstname: 'Test', lastname: 'Person' });
        store.save();
        const store2 = new DataStore();
        store2.load();
        expect(store2.data.patients).toHaveLength(1);
        expect(store2.data.patients[0].lastname).toBe('Person');
    });

    it('loggt keine PII beim Speichern', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const store = new DataStore();
        store.addPatient({ firstname: 'Geheim', lastname: 'PII' });
        store.save();
        const loggedPII = spy.mock.calls.some((args) =>
            JSON.stringify(args).includes('Geheim'));
        expect(loggedPII).toBe(false);
        spy.mockRestore();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/DataStore.test.js`
Expected: FAIL — kein ES-Export / localStorage-Key btm-app-data / numerische IDs.

- [ ] **Step 3: Imports + ID-Vergabe umstellen**

Modify `js/models/DataStore.js`. Oben ergaenzen:

```javascript
import { obfuscate, deobfuscate } from '../utils/Obfuscate.js';
```

ID-Vergabe ersetzen — `:39` (Patienten), `:88` (Aerzte), `:137` (Medikamente, `Date.now() + Math.random()`) jeweils durch:

```javascript
        id: crypto.randomUUID(),
```

- [ ] **Step 4: save()/load() umstellen**

`save()` (Bereich `:299-305`) ersetzen durch:

```javascript
    save() {
        const packed = obfuscate(JSON.stringify(this.data));
        sessionStorage.setItem('btm-session-data', packed);
        // Kein Logging von PII.
    }
```

`load()` (bestehende Lademethode finden) ersetzen durch:

```javascript
    load() {
        const packed = sessionStorage.getItem('btm-session-data');
        if (!packed) return false;
        try {
            this.data = JSON.parse(deobfuscate(packed));
            return true;
        } catch (e) {
            console.warn('Session-Daten konnten nicht gelesen werden.');
            return false;
        }
    }
```

Am Dateiende benannten Export ergaenzen (falls noch global):

```javascript
export { DataStore };
```

- [ ] **Step 5: PII-Log in app.js entfernen**

Modify `js/app.js:101`. `console.log('Data updated:', data);` ersetzen durch:

```javascript
        // PII nicht loggen.
```

- [ ] **Step 6: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/DataStore.test.js`
Expected: PASS — 4 Assertions gruen.

- [ ] **Step 7: arc42 ADR-002 + Commit**

Modify `docs/arc42/architecture.md`, ADR-002:

```markdown
- ADR-002: sessionStorage-Key `btm-session-data` (obfuskiert) ersetzt dauerhaftes
  localStorage `btm-app-data`. Alte Daten werden einmalig migriert (Migration.js).
```

```bash
git add js/models/DataStore.js js/app.js js/models/DataStore.test.js docs/arc42/architecture.md
git commit -m "fix: UUIDs, kein PII-Logging, sessionStorage+Obfuskierung im DataStore"
```

---

## Task 7: Validator/DateHelper konsolidieren (getDaysBetween als einzige Quelle)

**Files:**
- Modify: `js/utils/Validator.js` (`:111-135`, doppelte Datumsdifferenz `:126`)
- Modify: `js/utils/DateHelper.js` (ES-Export)
- Test: `js/utils/DateHelper.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/utils/DateHelper.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { DateHelper } from './DateHelper.js';

describe('DateHelper.getDaysBetween', () => {
    it('inkludiert Start- und Enddatum', () => {
        expect(DateHelper.getDaysBetween('2026-08-10', '2026-08-12')).toBe(3);
    });
    it('liefert 1 fuer gleichen Tag', () => {
        expect(DateHelper.getDaysBetween('2026-08-10', '2026-08-10')).toBe(1);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/DateHelper.test.js`
Expected: FAIL — `DateHelper` kein ES-Export.

- [ ] **Step 3: DateHelper.js exportieren**

Modify `js/utils/DateHelper.js`. Am Dateiende ergaenzen (Methoden unveraendert):

```javascript
export { DateHelper };
```

- [ ] **Step 4: Doppelte Berechnung in Validator.js entfernen**

Modify `js/utils/Validator.js`. Oben `import { DateHelper } from './DateHelper.js';`. In `validateTravelData` (`:111-135`) die eigene Differenzberechnung (`:126`) ersetzen durch:

```javascript
        const duration = DateHelper.getDaysBetween(data.start, data.end);
```

Am Dateiende `export { Validator };`.

- [ ] **Step 5: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/DateHelper.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/utils/Validator.js js/utils/DateHelper.js js/utils/DateHelper.test.js
git commit -m "refactor: Datumsdifferenz nur noch ueber DateHelper.getDaysBetween"
```

---

## Task 8: Medikamenten-Flatfile-DB + MedicationRepository + MedicationInstance

**Files:**
- Create: `data/medications.json`
- Create: `js/repositories/MedicationRepository.js`
- Create: `js/models/MedicationInstance.js`
- Test: `js/repositories/MedicationRepository.test.js`, `js/models/MedicationInstance.test.js`

- [ ] **Step 1: medications.json aus Seed-Daten erzeugen**

Create `data/medications.json` — eine FHIR-`Medication`-Resource pro Wirkstaerke. Muster (fuer alle Eintraege fortsetzen):

```json
[
  {
    "resourceType": "Medication",
    "id": "ritalin-5mg",
    "productFamily": "Ritalin",
    "code": { "coding": [{ "system": "http://www.whocc.no/atc", "code": "N06BA04" }], "text": "Ritalin 5 mg Tablette" },
    "form": { "text": "Tablette" },
    "btmCategory": "BTM",
    "ingredient": [{ "itemCodeableConcept": { "text": "Methylphenidat" }, "strength": { "numerator": { "value": 5, "unit": "mg" }, "denominator": { "value": 1, "unit": "Tablette" } } }]
  }
]
```

Vollstaendig zu erzeugen (ATC: Methylphenidat N06BA04, Lisdexamfetamin N06BA12, Dexamfetamin N06BA02, Atomoxetin N06BA09, Guanfacin C02AC02; `id` = `<kebab-name>-<value><unit>`; `denominator.unit` = Form-Einheit):

- Ritalin (Tablette, Methylphenidat): 5, 10, 20 mg
- Ritalin Adult (Kapsel, Methylphenidat): 10, 20, 30, 40, 60 mg
- Ritalin LA (Retardkapsel, Methylphenidat): 10, 20, 30, 40 mg
- Medikinet (Tablette, Methylphenidat): 5, 10, 20 mg
- Medikinet adult (Retardkapsel, Methylphenidat): 5, 10, 20, 30, 40, 50, 60 mg
- Concerta (Retardtablette, Methylphenidat): 18, 27, 36, 54 mg
- Equasym (Tablette, Methylphenidat): 5, 10, 20 mg
- Equasym Retard (Retardkapsel, Methylphenidat): 10, 20, 30 mg
- Kinecteen (Retardtablette, Methylphenidat): 18, 27, 36, 54 mg
- Elvanse (Kapsel, Lisdexamfetamin): 20, 30, 40, 50, 60, 70 mg
- Elvanse Adult (Kapsel, Lisdexamfetamin): 30, 50, 70 mg
- Attentin (Tablette, Dexamfetamin): 5, 10, 20 mg
- Strattera (Kapsel, Atomoxetin, btmCategory "Nicht-BTM"): 10, 18, 25, 40, 60, 80, 100 mg
- Intuniv (Retardtablette, Guanfacin, btmCategory "Nicht-BTM"): 1, 2, 3, 4 mg

- [ ] **Step 2: Failing Test fuer MedicationRepository schreiben**

Create `js/repositories/MedicationRepository.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import medications from '../../data/medications.json';
import { MedicationRepository } from './MedicationRepository.js';

const repo = new MedicationRepository(medications);

describe('MedicationRepository', () => {
    it('findAll liefert alle Resources', () => {
        expect(repo.findAll().length).toBeGreaterThan(30);
    });
    it('findById findet per FHIR-id', () => {
        expect(repo.findById('concerta-36mg')?.productFamily).toBe('Concerta');
    });
    it('search gruppiert nach productFamily (Kinecteen mit 4 Staerken)', () => {
        const families = repo.search('kinecteen');
        expect(families).toHaveLength(1);
        expect(families[0].productFamily).toBe('Kinecteen');
        expect(families[0].strengths.map((s) => s.concentrationValue).sort((a, b) => a - b))
            .toEqual([18, 27, 36, 54]);
    });
    it('search ist case-insensitiv und matcht Wirkstoff', () => {
        expect(repo.search('methylphenidat').length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 3: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/repositories/MedicationRepository.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 4: MedicationRepository implementieren**

Create `js/repositories/MedicationRepository.js`:

```javascript
// Kapselt den Zugriff auf die Medikamenten-Flatfile (FHIR-Medication).
// Interface: findAll(), findById(id), search(query).

export class MedicationRepository {
    constructor(resources) {
        this.resources = resources || [];
    }

    findAll() {
        return this.resources;
    }

    findById(id) {
        return this.resources.find((r) => r.id === id) || null;
    }

    search(query) {
        const q = String(query).toLowerCase().trim();
        const matches = this.resources.filter((r) => {
            const substance = r.ingredient?.[0]?.itemCodeableConcept?.text || '';
            return (
                (r.productFamily || '').toLowerCase().includes(q) ||
                (r.code?.text || '').toLowerCase().includes(q) ||
                substance.toLowerCase().includes(q)
            );
        });
        return this._groupByFamily(matches);
    }

    _groupByFamily(resources) {
        const map = new Map();
        resources.forEach((r) => {
            const key = r.productFamily || r.code?.text || r.id;
            const strength = r.ingredient?.[0]?.strength?.numerator || {};
            if (!map.has(key)) {
                map.set(key, {
                    productFamily: r.productFamily || key,
                    form: r.form?.text || '',
                    substance: r.ingredient?.[0]?.itemCodeableConcept?.text || '',
                    strengths: [],
                });
            }
            map.get(key).strengths.push({
                refId: r.id,
                concentrationValue: strength.value ?? 0,
                concentrationUnit: strength.unit ?? '',
                btmCategory: r.btmCategory || 'BTM',
            });
        });
        return Array.from(map.values());
    }
}
```

- [ ] **Step 5: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/repositories/MedicationRepository.test.js`
Expected: PASS.

- [ ] **Step 6: Failing Test fuer MedicationInstance schreiben**

Create `js/models/MedicationInstance.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { MedicationInstance } from './MedicationInstance.js';

describe('MedicationInstance (Snapshot)', () => {
    it('erzeugt Snapshot aus FHIR-Resource + Staerke', () => {
        const inst = MedicationInstance.fromRepository(
            { id: 'concerta-36mg', productFamily: 'Concerta',
              form: { text: 'Retardtablette' },
              ingredient: [{ itemCodeableConcept: { text: 'Methylphenidat' },
                             strength: { numerator: { value: 36, unit: 'mg' } } }] });
        expect(inst.medicationRefId).toBe('concerta-36mg');
        expect(inst.isCustom).toBe(false);
        expect(inst.handelsname).toBe('Concerta');
        expect(inst.wirkstoff).toBe('Methylphenidat');
        expect(inst.darreichungsform).toBe('Retardtablette');
        expect(inst.concentrationValue).toBe(36);
        expect(inst.concentrationUnit).toBe('mg');
        expect(typeof inst.id).toBe('string');
    });

    it('erzeugt Custom-Instanz (isCustom, kein refId)', () => {
        const inst = MedicationInstance.custom({ handelsname: 'Eigenpraeparat',
            wirkstoff: 'X', darreichungsform: 'Tablette',
            concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.isCustom).toBe(true);
        expect(inst.medicationRefId).toBeNull();
        expect(inst.validate().isValid).toBe(true);
    });

    it('validate meldet Fehler bei fehlenden Pflichtfeldern', () => {
        const inst = MedicationInstance.custom({ handelsname: '' });
        expect(inst.validate().isValid).toBe(false);
    });
});
```

- [ ] **Step 7: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/models/MedicationInstance.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 8: MedicationInstance implementieren**

Create `js/models/MedicationInstance.js`:

```javascript
// Snapshot-Instanz eines Medikaments (Werte werden beim Hinzufuegen kopiert,
// nicht live aus der DB referenziert).

export class MedicationInstance {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.medicationRefId = data.medicationRefId ?? null;
        this.isCustom = data.isCustom ?? false;
        this.handelsname = data.handelsname || '';
        this.wirkstoff = data.wirkstoff || '';
        this.darreichungsform = data.darreichungsform || '';
        this.concentrationValue = Number(data.concentrationValue) || 0;
        this.concentrationUnit = data.concentrationUnit || '';
    }

    static fromRepository(resource) {
        const strength = resource.ingredient?.[0]?.strength?.numerator || {};
        return new MedicationInstance({
            medicationRefId: resource.id,
            isCustom: false,
            handelsname: resource.productFamily || resource.code?.text || '',
            wirkstoff: resource.ingredient?.[0]?.itemCodeableConcept?.text || '',
            darreichungsform: resource.form?.text || '',
            concentrationValue: strength.value ?? 0,
            concentrationUnit: strength.unit ?? '',
        });
    }

    static custom(data) {
        return new MedicationInstance({ ...data, isCustom: true, medicationRefId: null });
    }

    validate() {
        const errors = [];
        if (!this.handelsname) errors.push('Handelsname ist erforderlich');
        if (!this.wirkstoff) errors.push('Wirkstoff ist erforderlich');
        if (!this.darreichungsform) errors.push('Darreichungsform ist erforderlich');
        if (!this.concentrationValue || this.concentrationValue <= 0)
            errors.push('Konzentration (Wert) ist erforderlich');
        if (!this.concentrationUnit) errors.push('Konzentration (Einheit) ist erforderlich');
        return { isValid: errors.length === 0, errors };
    }

    get concentration() {
        return `${this.concentrationValue}${this.concentrationUnit}`;
    }

    toJSON() {
        return {
            id: this.id,
            medicationRefId: this.medicationRefId,
            isCustom: this.isCustom,
            handelsname: this.handelsname,
            wirkstoff: this.wirkstoff,
            darreichungsform: this.darreichungsform,
            concentrationValue: this.concentrationValue,
            concentrationUnit: this.concentrationUnit,
        };
    }
}
```

- [ ] **Step 9: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/models/MedicationInstance.test.js`
Expected: PASS.

- [ ] **Step 10: arc42 ADR-003 + Commit**

Modify `docs/arc42/architecture.md`, ADR-003:

```markdown
- ADR-003: data/medications.json (FHIR-Medication, 1 Resource pro Staerke) hinter
  MedicationRepository (findAll/findById/search). productFamily = UI-Gruppierung
  (nicht-FHIR). MedicationInstance = Snapshot bei Erfassung.
```

```bash
git add data/medications.json js/repositories/ js/models/MedicationInstance.js js/models/MedicationInstance.test.js docs/arc42/architecture.md
git commit -m "feat: FHIR-Medication-Flatfile + MedicationRepository + MedicationInstance"
```

---

## Task 9: DosageAggregator (Gesamtmenge, Reichdauer, Gebrauchsanweisungs-Kette)

**Files:**
- Create: `js/services/DosageAggregator.js`
- Test: `js/services/DosageAggregator.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/services/DosageAggregator.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { DosageAggregator } from './DosageAggregator.js';

const blocks = [
    { startDate: '2026-08-10', endDate: '2026-08-11', morning: 1, noon: 0, evening: 0, night: 0 },
    { startDate: '2026-08-12', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
    { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
];

describe('DosageAggregator', () => {
    it('summiert Gesamtwirkstoffmenge ueber alle Bloecke', () => {
        // Block1: 2 Tage * 1 = 2 ; Block2: 2 Tage * 2 = 4 ; Block3: 11 Tage * 3 = 33
        // Einheiten gesamt = 39, * 36mg = 1404 mg
        expect(DosageAggregator.totalSubstance(blocks, 36)).toBe(1404);
    });
    it('berechnet Reichdauer = erster Start bis letztes Ende (inkl.)', () => {
        expect(DosageAggregator.reachDurationDays(blocks)).toBe(15);
    });
    it('baut kompakte Gebrauchsanweisungs-Kette bei mehreren Bloecken', () => {
        expect(DosageAggregator.instructionChain(blocks)).toBe('1-0-0 -> 1-0-1 -> 2-0-1');
    });
    it('einzelner Block: schlichte Notation ohne Kette', () => {
        expect(DosageAggregator.instructionChain([blocks[1]])).toBe('1-0-1');
    });
    it('ausfuehrliches Schema mit Datumsangaben fuer Anmerkungen', () => {
        expect(DosageAggregator.detailedSchedule(blocks))
            .toBe('10.08.-11.08.: 1-0-0 | 12.08.-13.08.: 1-0-1 | 14.08.-24.08.: 2-0-1');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: DosageAggregator implementieren**

Create `js/services/DosageAggregator.js`:

```javascript
import { DateHelper } from '../utils/DateHelper.js';

// Aggregiert mehrere Dosierbloecke (Titrations-/Eindosierungsschema) fuer die
// einzeiligen Felder des amtlichen Formulars.

function dailyDose(block) {
    return (block.morning || 0) + (block.noon || 0) + (block.evening || 0) + (block.night || 0);
}

function blockDays(block) {
    return DateHelper.getDaysBetween(block.startDate, block.endDate);
}

function notation(block) {
    const base = `${block.morning || 0}-${block.noon || 0}-${block.evening || 0}`;
    return (block.night || 0) > 0 ? `${base}-${block.night}` : base;
}

function ddmm(dateStr) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.`;
}

export const DosageAggregator = {
    totalSubstance(blocks, concentrationValue) {
        const units = blocks.reduce((sum, b) => sum + blockDays(b) * dailyDose(b), 0);
        return Math.round(units * concentrationValue);
    },

    reachDurationDays(blocks) {
        if (blocks.length === 0) return 0;
        return DateHelper.getDaysBetween(blocks[0].startDate, blocks[blocks.length - 1].endDate);
    },

    instructionChain(blocks) {
        return blocks.map(notation).join(' -> ');
    },

    detailedSchedule(blocks) {
        return blocks
            .map((b) => `${ddmm(b.startDate)}-${ddmm(b.endDate)}: ${notation(b)}`)
            .join(' | ');
    },
};
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/DosageAggregator.test.js`
Expected: PASS — 5 Assertions gruen.

- [ ] **Step 5: Commit**

```bash
git add js/services/DosageAggregator.js js/services/DosageAggregator.test.js
git commit -m "feat: DosageAggregator (Gesamtmenge, Reichdauer, Gebrauchsanweisungs-Kette)"
```

---

## Task 10: Amtliches PDF-Formular vorverarbeiten + PdfFormFiller

> **Voraussetzung:** Die Original-Datei des amtlichen BfArM-017-Formulars muss unter `assets/reise-scheng-formular.pdf` vorliegen (vom Nutzer bereitgestellt). Die Vorverarbeitung merged die zwei zusammengesetzten Feldpaare zu Einzelfeldern.

**Files:**
- Create: `scripts/preprocess-form.mjs`
- Create: `js/services/PdfFormFiller.js`
- Test: `js/services/PdfFormFiller.test.js`
- Asset: `assets/reise-scheng-formular.pdf`

- [ ] **Step 1: pdf-lib installieren**

Run: `npm install pdf-lib@^1.17`
Expected: `pdf-lib` in dependencies.

- [ ] **Step 2: Formularfelder inspizieren + Merge-Skript anlegen**

Create `scripts/preprocess-form.mjs`:

```javascript
// Einmaliges Skript: inspiziert/bereinigt das amtliche AcroForm-PDF.
// Merged zusammengesetzte Feldpaare (Staatsangehoer+gkeit, Wohnanschr+ft).
// Aufruf: node scripts/preprocess-form.mjs [--inspect]
import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const SRC = 'assets/reise-scheng-formular.pdf';

async function inspect() {
    const doc = await PDFDocument.load(readFileSync(SRC));
    const fields = doc.getForm().getFields();
    fields.forEach((f) => console.log(`${f.constructor.name}: "${f.getName()}"`));
    console.log(`\n${fields.length} Felder.`);
}

function mergePair(form, doc, leftName, rightName, targetName) {
    const left = form.getTextField(leftName);
    const right = form.getTextField(rightName);
    const [lw] = left.acroField.getWidgets();
    const [rw] = right.acroField.getWidgets();
    const lr = lw.getRectangle();
    const rr = rw.getRectangle();
    lw.setRectangle({ x: lr.x, y: lr.y, width: (rr.x + rr.width) - lr.x, height: lr.height });
    form.removeField(right);
    left.acroField.dict.set(form.doc.context.obj('T'), form.doc.context.obj(targetName));
}

async function preprocess() {
    const doc = await PDFDocument.load(readFileSync(SRC));
    const form = doc.getForm();
    mergePair(form, doc, 'Staatsangehör', 'gkeit', 'Staatsangehoerigkeit');
    mergePair(form, doc, 'Wohnanschr', 'ft', 'Wohnanschrift');
    writeFileSync(SRC, await doc.save());
    console.log('Bereinigte Version gespeichert.');
}

const mode = process.argv.includes('--inspect') ? inspect : preprocess;
mode().catch((e) => { console.error(e); process.exit(1); });
```

Run: `node scripts/preprocess-form.mjs --inspect`
Expected: Feldliste inkl. Teilfelder + Zielfelder (`Name`, `Vorname`, `Name_2`, `Vorname_2`, `Handelsbezeichnung...` etc.). **Notiere die exakten Feldnamen** — sie steuern das Mapping in Step 5.

- [ ] **Step 3: Merge ausfuehren**

Run:
```bash
node scripts/preprocess-form.mjs
node scripts/preprocess-form.mjs --inspect
```
Expected: Nach dem Merge zeigt die Inspektion `Staatsangehoerigkeit`/`Wohnanschrift` statt der vier Teilfelder (laut Spec 32 benannte Felder + 1 unbenanntes Stoerfeld).

- [ ] **Step 4: Failing Test fuer PdfFormFiller schreiben**

Create `js/services/PdfFormFiller.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { fillCertificate } from './PdfFormFiller.js';

const templateBytes = readFileSync('assets/reise-scheng-formular.pdf');

const patient = { lastname: 'Muster', firstname: 'Max', passport: 'C01X00T47',
    birthplace: 'Berlin', birthdate: '1990-05-01', nationality: 'deutsch',
    gender: 'maennlich', street: 'Hauptstr. 1', zip: '10115', city: 'Berlin' };
const doctor = { title: 'Dr. med.', lastname: 'Aerztin', firstname: 'Anna',
    phone: '030-1234', address: 'Praxisweg 2, 10117 Berlin' };
const travel = { start: '2026-08-10', end: '2026-08-24', duration: 15 };
const medication = { handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
    darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg' };
const blocks = [
    { startDate: '2026-08-10', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
    { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
];

describe('fillCertificate', () => {
    it('befuellt Patient/Arzt/Medikament und flattet das Formular', async () => {
        const bytes = await fillCertificate(templateBytes, { patient, doctor, travel, medication, blocks });
        const out = await PDFDocument.load(bytes);
        expect(out.getForm().getFields().length).toBe(0);
        expect(bytes.byteLength).toBeGreaterThan(1000);
    });

    it('laesst Signatur-/Behoerdenfelder leer (Variante flatten:false)', async () => {
        const bytes = await fillCertificate(templateBytes,
            { patient, doctor, travel, medication, blocks, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        const get = (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
        expect(get('Name_2')).toBe('Muster');
        expect(get('Datum')).toBe('');
        expect(get('Unterschrift des Arztes')).toBe('');
    });
});
```

- [ ] **Step 5: PdfFormFiller implementieren**

> Verwende die in Step 2 notierten **realen** Feldnamen; passe abweichende Namen an.

Create `js/services/PdfFormFiller.js`:

```javascript
import { PDFDocument } from 'pdf-lib';
import { DateHelper } from '../utils/DateHelper.js';
import { DosageAggregator } from './DosageAggregator.js';

// Befuellt das amtliche BfArM-017-Formular und flattet es.
// Signatur-/Behoerdenfelder bleiben bewusst leer.

function setField(form, name, value) {
    try {
        form.getTextField(name).setText(String(value ?? ''));
    } catch {
        // Feld existiert nicht in dieser Variante — ueberspringen.
    }
}

function buildInstruction(blocks) {
    if (blocks.length <= 1) {
        return { gebrauchsanweisung: blocks[0] ? DosageAggregator.instructionChain(blocks) : '', anmerkungen: '' };
    }
    const chain = DosageAggregator.instructionChain(blocks);
    const detailed = DosageAggregator.detailedSchedule(blocks);
    const gebrauchsanweisung = chain.length > 40 ? 's. Anmerkungen' : chain;
    return { gebrauchsanweisung, anmerkungen: detailed };
}

export async function fillCertificate(templateBytes, data) {
    const { patient, doctor, travel, medication, blocks = [], flatten = true } = data;
    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();

    // A - Arzt
    setField(form, 'Name', doctor.lastname);
    setField(form, 'Vorname', doctor.firstname);
    setField(form, 'Telefon', doctor.phone);
    setField(form, 'Anschrift', doctor.address);

    // B - Patient
    setField(form, 'Name_2', patient.lastname);
    setField(form, 'Vorname_2', patient.firstname);
    setField(form, 'Nr. des Passes oder Personalausweises', patient.passport);
    setField(form, 'Geburtsort', patient.birthplace);
    setField(form, 'Geburtsdatum', DateHelper.formatDate(patient.birthdate));
    setField(form, 'Staatsangehoerigkeit', patient.nationality);
    setField(form, 'Geschlecht', patient.gender);
    setField(form, 'Wohnanschrift', `${patient.street}, ${patient.zip} ${patient.city}`);
    setField(form, 'Dauer der Reise in Tagen', travel.duration);
    setField(form, 'Gueltigkeitsdauer der Erlaubnis von/bis',
        `${DateHelper.formatDate(travel.start)} - ${DateHelper.formatDate(travel.end)}`);

    // C - Arzneimittel
    setField(form, 'Handelsbezeichnung des Arzneimittels', medication.handelsname);
    setField(form, 'Darreichungsform', medication.darreichungsform);
    setField(form, 'Internationale Bezeichnung des Wirkstoffs', medication.wirkstoff);
    setField(form, 'WirkstoffKonzentration',
        `${medication.concentrationValue}${medication.concentrationUnit}`);
    const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks);
    setField(form, 'Gebrauchsanweisung', gebrauchsanweisung);
    setField(form, 'Anmerkungen', anmerkungen);
    setField(form, 'Gesamtwirkstoffmenge',
        `${DosageAggregator.totalSubstance(blocks, medication.concentrationValue)} ${medication.concentrationUnit}`);
    setField(form, 'Reichdauer der Verschreibung',
        `${DosageAggregator.reachDurationDays(blocks)} Tage`);

    if (flatten) form.flatten();
    return doc.save();
}
```

- [ ] **Step 6: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/PdfFormFiller.test.js`
Expected: PASS. (Falls ein Feldname-Assertion fehlschlaegt: realen Feldnamen im Mapping korrigieren, erneut ausfuehren.)

- [ ] **Step 7: arc42 ADR-001 + Commit**

Modify `docs/arc42/architecture.md`, ADR-001:

```markdown
- ADR-001: pdf-lib befuellt das amtliche BfArM-017-Formular (AcroForm) und flattet es.
  Einmalige Vorverarbeitung (scripts/preprocess-form.mjs) merged zusammengesetzte
  Feldpaare (Staatsangehoerigkeit, Wohnanschrift). Signatur-/Behoerdenfelder bleiben leer.
```

```bash
git add scripts/preprocess-form.mjs js/services/PdfFormFiller.js js/services/PdfFormFiller.test.js assets/reise-scheng-formular.pdf package.json package-lock.json docs/arc42/architecture.md
git commit -m "feat: amtliches PDF-Formular vorverarbeiten + PdfFormFiller (pdf-lib)"
```

---

## Task 11: Webpack-Build + ES-Module-Verdrahtung + Asset-Einbindung

> Ab hier laeuft die App ueber das Bundle. Verbleibende globale Dateien (uebrige Controller, Patient/Doctor, restliche Views, config.js, PDFController) werden auf import/export gebracht und ueber app.js verdrahtet.

**Files:**
- Create: `webpack.config.js`, `src/index.template.html`
- Modify: `js/app.js` (Entry-Point, Imports), verbleibende `js/**/*.js` ohne ES-Export, `index.html`

- [ ] **Step 1: HTML-Template ableiten**

Create `src/index.template.html`: Kopie von `index.html`, aber OHNE die `<script>`-Tags (Zeilen ~37-57) und OHNE den jsPDF-CDN-`<script>` (Zeile ~10). `html-webpack-plugin` injiziert das Bundle. `<link>` auf `css/styles.css` entfernen (CSS via import gebundelt).

- [ ] **Step 2: webpack.config.js anlegen**

Create `webpack.config.js`:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './js/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
        clean: true,
    },
    module: {
        rules: [
            { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
            { test: /\.pdf$/i, type: 'asset/resource' },
        ],
    },
    plugins: [new HtmlWebpackPlugin({ template: 'src/index.template.html' })],
    resolve: { extensions: ['.js'] },
    devServer: { static: path.resolve(__dirname, 'dist'), port: 8080, open: true },
};
```

- [ ] **Step 3: Verbleibende Module auf ES-Syntax bringen**

Modify je Datei ohne ES-Export (`js/config.js`, `js/models/Patient.js`, `js/models/Doctor.js`, alle noch nicht umgebauten `js/controllers/*.js` und `js/views/*.js`): am Dateiende den globalen Export durch benannten ES-Export ersetzen, z.B. `export { Patient };`, und Abhaengigkeiten oben per `import` einziehen statt Verlass auf globale Ladereihenfolge, z.B.:

```javascript
import { DataStore } from '../models/DataStore.js';
import { escapeHtml, setDataset } from '../utils/Sanitize.js';
```

- [ ] **Step 4: app.js als Entry-Point verdrahten**

Modify `js/app.js`: CSS + Top-Level-Module importieren, `BTMApp` instanziieren:

```javascript
import '../css/styles.css';
import medications from '../data/medications.json';
import { DataStore } from './models/DataStore.js';
import { MedicationRepository } from './repositories/MedicationRepository.js';
// ... weitere Controller/Views nach Bedarf

const medicationRepository = new MedicationRepository(medications);

document.addEventListener('DOMContentLoaded', () => {
    const app = new BTMApp({ medicationRepository });
    app.init();
});
```

`BTMApp`-Konstruktor so anpassen, dass er `medicationRepository` entgegennimmt und an `MedicationController`/`MedicationView` weiterreicht.

- [ ] **Step 5: Produktions-Build**

Run: `npm run build`
Expected: `dist/` enthaelt `index.html` + `bundle.<hash>.js` + PDF-Asset, ohne Build-Fehler. Keine jsPDF-CDN-Verweise.

- [ ] **Step 6: Dev-Smoke (manuell)**

Run: `npm run dev`
Expected: dev-server auf `http://localhost:8080`, App laedt ohne Konsolenfehler, Start-Screen (Task 12) bzw. UI erscheint.

- [ ] **Step 7: arc42 Verteilungssicht + Commit**

Modify `docs/arc42/architecture.md`, Abschnitt "7":

```markdown
Webpack-Bundle (js/app.js Entry) -> dist/ (bundle.<hash>.js + index.html + PDF-Asset).
Kein CDN mehr (jsPDF entfernt), damit kein SRI/CSP-Luecken-Risiko.
```

```bash
git add webpack.config.js src/index.template.html js/ index.html docs/arc42/architecture.md
git commit -m "feat: Webpack-Build, ES-Module-Verdrahtung, Assets gebundelt (kein CDN)"
```

---

## Task 12: Start-Screen (Neu/Import), Export, beforeunload, Migration

**Files:**
- Modify: `js/app.js` (Start-Screen, Migration-Trigger, beforeunload, Export)
- Modify: `js/controllers/DataController.js` / `js/views/DataManagementView.js` (Export/Import primaerer Einstieg)
- Create: `js/services/Migration.js`
- Test: `js/services/Migration.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/services/Migration.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacyData, hasLegacyData, LEGACY_KEY } from './Migration.js';

beforeEach(() => { localStorage.clear(); });

describe('Migration aus localStorage["btm-app-data"]', () => {
    it('erkennt Alt-Daten', () => {
        expect(hasLegacyData()).toBe(false);
        localStorage.setItem(LEGACY_KEY, JSON.stringify({ patients: [] }));
        expect(hasLegacyData()).toBe(true);
    });

    it('migriert Patienten auf UUIDs und splittet concentration-String', () => {
        localStorage.setItem(LEGACY_KEY, JSON.stringify({
            patients: [{ id: 1712345678900, firstname: 'A', lastname: 'B' }],
            medications: [{ id: 999, name: 'Ritalin', form: 'Tablette',
                substance: 'Methylphenidat', concentration: '10mg' }],
            doctors: [], selectedMedications: [], dosageSchemes: {},
        }));
        const migrated = migrateLegacyData();
        expect(migrated.patients[0].id).toMatch(/^[0-9a-f-]{36}$/);
        const med = migrated.medications[0];
        expect(med.concentrationValue).toBe(10);
        expect(med.concentrationUnit).toBe('mg');
        expect(med.isCustom).toBe(true);
        expect(med.medicationRefId).toBeNull();
    });

    it('loescht den Alt-Key nach erfolgreicher Migration', () => {
        localStorage.setItem(LEGACY_KEY, JSON.stringify({ patients: [], medications: [], doctors: [] }));
        migrateLegacyData();
        expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/services/Migration.test.js`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Migration implementieren**

Create `js/services/Migration.js`:

```javascript
// Einmalige Migration der Alt-Daten aus localStorage['btm-app-data']:
// UUIDs vergeben, concentration-String splitten, Alt-Medikamente als isCustom
// markieren, danach Alt-Key loeschen.

export const LEGACY_KEY = 'btm-app-data';

export function hasLegacyData() {
    return localStorage.getItem(LEGACY_KEY) !== null;
}

function splitConcentration(str) {
    const numMatch = String(str || '').match(/(\d+(?:\.\d+)?)/);
    const unitMatch = String(str || '').match(/\d+(?:\.\d+)?(.*)/);
    return {
        concentrationValue: numMatch ? parseFloat(numMatch[1]) : 0,
        concentrationUnit: unitMatch ? unitMatch[1].trim() : '',
    };
}

export function migrateLegacyData() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);

    const remap = (entity) => ({ ...entity, id: crypto.randomUUID() });

    const patients = (old.patients || []).map(remap);
    const doctors = (old.doctors || []).map(remap);
    const medications = (old.medications || []).map((m) => {
        const { concentrationValue, concentrationUnit } = splitConcentration(m.concentration);
        return { ...remap(m), concentrationValue, concentrationUnit, isCustom: true, medicationRefId: null };
    });

    localStorage.removeItem(LEGACY_KEY);

    return {
        patients,
        doctors,
        medications,
        selectedMedications: old.selectedMedications || [],
        patientDoctorLinks: old.patientDoctorLinks || [],
        currentPatient: null,
        currentDoctor: null,
        travelData: old.travelData || null,
        dosageSchemes: old.dosageSchemes || {},
    };
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/services/Migration.test.js`
Expected: PASS — 3 Assertions gruen.

- [ ] **Step 5: Start-Screen + Export + beforeunload in app.js verdrahten**

Modify `js/app.js`. Oben ergaenzen:

```javascript
import { obfuscate, deobfuscate } from './utils/Obfuscate.js';
import { hasLegacyData, migrateLegacyData } from './services/Migration.js';
```

In `init()` ergaenzen (Muster — an bestehende Struktur anpassen):

```javascript
    init() {
        if (hasLegacyData()) {
            this.store.data = migrateLegacyData();
            this.store.save();
            this.hasUnsavedChanges = true;
            this.showToast('Alte Daten uebernommen. Bitte jetzt "Exportieren", um sie zu sichern.');
        } else if (this.store.load()) {
            // laufende Session automatisch fortsetzen
        } else {
            this.showStartScreen(); // Buttons: "Neu anfangen" / "Datei importieren"
        }

        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    exportData() {
        const packed = obfuscate(JSON.stringify(this.store.data));
        const blob = new Blob([packed], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'btm-bescheinigung-export.btmdat';
        a.click();
        URL.revokeObjectURL(url);
        this.hasUnsavedChanges = false;
    }
```

`showStartScreen()` (zwei Buttons) und Import ergaenzen: eingelesene Datei per `deobfuscate` entpacken und in `store.data` laden.

- [ ] **Step 6: Build + Migration-Smoke**

Run: `npm run build && npm test`
Expected: Build ok, alle Unit-Tests gruen.

Manuell (`npm run dev`): In DevTools `localStorage.setItem('btm-app-data', JSON.stringify({patients:[{id:1,firstname:"A",lastname:"B"}],medications:[],doctors:[]}))`, neu laden -> Migrations-Hinweis; `btm-app-data` danach weg, `btm-session-data` vorhanden.

- [ ] **Step 7: arc42 Laufzeitsicht + Commit**

Modify `docs/arc42/architecture.md`, Abschnitt "6":

```markdown
- Erststart nach Update: Alt-localStorage erkannt -> Migration.js (UUIDs, concentration
  splitten, isCustom) -> Session laden -> Export-Aufforderung -> Alt-Key geloescht.
```

```bash
git add js/app.js js/services/Migration.js js/services/Migration.test.js js/controllers/DataController.js js/views/DataManagementView.js docs/arc42/architecture.md
git commit -m "feat: Start-Screen (Neu/Import), obfuskierter Export, beforeunload, Migration"
```

---

## Task 13: Medikamenten-UI-Flow (Autocomplete + Staerke-Dropdown)

**Files:**
- Modify: `js/views/MedicationView.js`, `js/controllers/MedicationController.js`
- Test: `js/controllers/MedicationController.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/controllers/MedicationController.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import medications from '../../data/medications.json';
import { MedicationRepository } from '../repositories/MedicationRepository.js';
import { MedicationController } from './MedicationController.js';

function makeController() {
    const store = { data: { selectedMedications: [] }, save() {} };
    return new MedicationController(store, new MedicationRepository(medications));
}

describe('MedicationController Auswahl-Flow', () => {
    it('liefert Familien-Vorschlaege fuer Autocomplete', () => {
        const ctrl = makeController();
        expect(ctrl.suggest('concer').some((s) => s.productFamily === 'Concerta')).toBe(true);
    });

    it('listet waehlbare Staerken einer Familie', () => {
        const ctrl = makeController();
        expect(ctrl.strengthsFor('Concerta').map((s) => s.concentrationValue).sort((a, b) => a - b))
            .toEqual([18, 27, 36, 54]);
    });

    it('erzeugt eine MedicationInstance-Snapshot aus refId', () => {
        const ctrl = makeController();
        const inst = ctrl.addFromRepository('concerta-36mg');
        expect(inst.isCustom).toBe(false);
        expect(inst.handelsname).toBe('Concerta');
        expect(inst.concentrationValue).toBe(36);
    });

    it('erzeugt eine Custom-Instanz bei manueller Eingabe', () => {
        const ctrl = makeController();
        const inst = ctrl.addCustom({ handelsname: 'Eigen', wirkstoff: 'X',
            darreichungsform: 'Tablette', concentrationValue: 5, concentrationUnit: 'mg' });
        expect(inst.isCustom).toBe(true);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/controllers/MedicationController.test.js`
Expected: FAIL — Controller nimmt kein Repository / hat keine suggest/strengthsFor/addFromRepository/addCustom.

- [ ] **Step 3: MedicationController erweitern**

Modify `js/controllers/MedicationController.js`. Oben `import { MedicationInstance } from '../models/MedicationInstance.js';`. Konstruktor + Methoden:

```javascript
    constructor(store, repository) {
        this.store = store;
        this.repository = repository;
        // ... bestehende View-Verdrahtung
    }

    suggest(query) {
        return this.repository.search(query);
    }

    strengthsFor(productFamily) {
        const [family] = this.repository.search(productFamily)
            .filter((f) => f.productFamily.toLowerCase() === productFamily.toLowerCase());
        return family ? family.strengths : [];
    }

    addFromRepository(refId) {
        const resource = this.repository.findById(refId);
        const inst = MedicationInstance.fromRepository(resource);
        this.store.data.selectedMedications.push(inst.toJSON());
        this.store.save();
        return inst;
    }

    addCustom(fields) {
        const inst = MedicationInstance.custom(fields);
        const result = inst.validate();
        if (!result.isValid) return { errors: result.errors };
        this.store.data.selectedMedications.push(inst.toJSON());
        this.store.save();
        return inst;
    }
```

- [ ] **Step 4: MedicationView auf Autocomplete + Dropdown umbauen**

Modify `js/views/MedicationView.js`: Eingabefeld "Handelsname" (Autocomplete, ruft `controller.suggest()`); bei Familienauswahl das Staerke-`<select>` aus `controller.strengthsFor()` fuellen (Option-Value = refId, Textinhalt via `escapeHtml`, Werte per `setDataset`). "Manuell hinzufuegen" ruft `controller.addCustom()`. Kein kombiniertes Freitextfeld mehr.

- [ ] **Step 5: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/controllers/MedicationController.test.js`
Expected: PASS — 4 Assertions gruen.

- [ ] **Step 6: Build + UI-Smoke + Commit**

Run: `npm run build && npm test`
Expected: Build ok, alle Tests gruen.

Manuell (`npm run dev`): "Concer" tippen -> Vorschlag "Concerta" -> Dropdown 18/27/36/54 mg -> Auswahl fuegt Instanz hinzu.

```bash
git add js/views/MedicationView.js js/controllers/MedicationController.js js/controllers/MedicationController.test.js
git commit -m "feat: Medikamenten-Flow (Autocomplete Handelsname + Staerke-Dropdown)"
```

---

## Task 14: PDFController auf PdfFormFiller umstellen, jsPDF entfernen

**Files:**
- Modify: `js/controllers/PDFController.js`, `js/views/CertificateView.js`
- Delete: `js/utils/PDFGenerator.js`
- Modify: `package.json` (jspdf entfernen)
- Test: `js/controllers/PDFController.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/controllers/PDFController.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildCertificateBytes } from './PDFController.js';

const templateBytes = readFileSync('assets/reise-scheng-formular.pdf');

describe('PDFController.buildCertificateBytes', () => {
    it('erzeugt eine geflattete PDF aus Session-Daten', async () => {
        const session = {
            currentPatient: { lastname: 'Muster', firstname: 'Max', passport: 'C01X00T47',
                birthplace: 'Berlin', birthdate: '1990-05-01', nationality: 'deutsch',
                gender: 'maennlich', street: 'Hauptstr. 1', zip: '10115', city: 'Berlin' },
            currentDoctor: { title: 'Dr. med.', lastname: 'Aerztin', firstname: 'Anna',
                phone: '030-1234', address: 'Praxisweg 2, 10117 Berlin' },
            travelData: { start: '2026-08-10', end: '2026-08-24', duration: 15 },
            selectedMedications: [{ handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
                darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg',
                id: 'm1' }],
            dosageSchemes: { m1: [
                { startDate: '2026-08-10', endDate: '2026-08-24', morning: 1, noon: 0, evening: 1, night: 0 },
            ] },
        };
        const bytes = await buildCertificateBytes(templateBytes, session, 'm1');
        const out = await PDFDocument.load(bytes);
        expect(out.getForm().getFields().length).toBe(0);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/controllers/PDFController.test.js`
Expected: FAIL — `buildCertificateBytes` existiert nicht.

- [ ] **Step 3: PDFController umbauen**

Modify `js/controllers/PDFController.js`. jsPDF/PDFGenerator entfernen, `fillCertificate` verdrahten:

```javascript
import { fillCertificate } from '../services/PdfFormFiller.js';
import templateUrl from '../../assets/reise-scheng-formular.pdf';

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

export class PDFController {
    constructor(store) {
        this.store = store;
    }

    async generateFor(medicationId) {
        const templateBytes = await fetch(templateUrl).then((r) => r.arrayBuffer());
        return buildCertificateBytes(templateBytes, this.store.data, medicationId);
    }
}
```

- [ ] **Step 4: CertificateView auf Byte-Download umstellen**

Modify `js/views/CertificateView.js`: "PDF erzeugen" ruft `controller.generateFor(medId)` und laedt die Bytes als Blob (`application/pdf`) herunter. Anzeigen weiterhin `escapeHtml`, IDs per `setDataset`.

- [ ] **Step 5: jsPDF entfernen**

Run:
```bash
git rm js/utils/PDFGenerator.js
npm uninstall jspdf
```
Modify `package.json`: sicherstellen, dass `jspdf` aus dependencies weg ist.

- [ ] **Step 6: Test + Build**

Run: `npm test && npm run build`
Expected: alle Unit-Tests gruen, Build ohne jsPDF/PDFGenerator.

- [ ] **Step 7: Grep-Verifikation**

Run: `grep -rn "jsPDF\|jspdf\|PDFGenerator" js/ src/ index.html`
Expected: keine Treffer.

- [ ] **Step 8: arc42 + Commit**

Modify `docs/arc42/architecture.md`, Abschnitt "11": jsPDF-Altlast als erledigt vermerken.

```bash
git add js/controllers/PDFController.js js/controllers/PDFController.test.js js/views/CertificateView.js package.json package-lock.json docs/arc42/architecture.md
git commit -m "feat: PDFController nutzt amtliches Formular; jsPDF entfernt"
```

---

## Task 15: End-to-End-Verifikation & Abschluss

**Files:**
- Modify: `readme.md`, `docs/arc42/architecture.md`

- [ ] **Step 1: Volle Testsuite**

Run: `npm test`
Expected: alle Test-Dateien gruen (Sanitize, Obfuscate, Medication, DataStore, DateHelper, MedicationRepository, MedicationInstance, DosageAggregator, PdfFormFiller, Migration, MedicationController, PDFController, views-escaping, smoke).

- [ ] **Step 2: Produktions-Build**

Run: `npm run build`
Expected: `dist/` sauber, keine Warnungen zu fehlenden Modulen/Assets.

- [ ] **Step 3: Manueller E2E-Durchlauf (Browser)**

Run: `npm run dev`, dann:
1. Start-Screen -> "Neu anfangen".
2. Patient + Arzt anlegen (Sonderzeichen im Namen, z.B. `<b>Test`), speichern -> kein Markup ausgefuehrt (XSS-Check).
3. Medikament: Autocomplete "Concerta" + Staerke 36 mg.
4. Reise + mehrere Dosierbloecke (Titration).
5. "Bescheinigung erzeugen" -> PDF-Download; im PDF: Patient/Arzt/Medikament befuellt, Gebrauchsanweisung als Kette, Anmerkungen mit Datumsschema, Gesamtwirkstoffmenge = Summe, Signatur-/Behoerdenfelder leer.
6. "Exportieren" -> `.btmdat`; Tab schliessen; neu oeffnen -> Start-Screen; "Datei importieren" -> Daten wieder da.

Expected: alle Schritte wie beschrieben; Konsole ohne PII-Logs und ohne Fehler.

- [ ] **Step 4: readme.md aktualisieren**

Modify `readme.md`: "Entwicklung" (`npm run dev`), "Build" (`npm run build`), "Tests" (`npm test`), Hinweis auf `assets/reise-scheng-formular.pdf` und Session-/Export-Modell. jsPDF-Erwaehnungen entfernen.

- [ ] **Step 5: arc42 Abschluss-Review**

Modify `docs/arc42/architecture.md`: alle Abschnitte gegen Ist-Stand pruefen; offene Punkte (weitere Medikamente, PZN-API) in Abschnitt "11" festhalten.

- [ ] **Step 6: Abschluss-Commit**

```bash
git add readme.md docs/arc42/architecture.md
git commit -m "docs: readme + arc42 Abschluss-Review fuer Security/PDF-Umbau"
```

---

## Self-Review (Abgleich Plan <-> Spec)

**Spec-Abdeckung:**
- A. Architektur & Build -> Task 1 (Vitest), Task 11 (Webpack/ES-Module/Assets/kein CDN), Task 14 (jsPDF raus).
- B.1 XSS-Escaping -> Task 2 (Sanitize) + Task 5 (Views).
- B.2 PII-Logging entfernen -> Task 6 (DataStore `:303`, app.js `:101`).
- B.3 Stabile UUIDs -> Task 6 + Task 8/12 (crypto.randomUUID).
- B.4 Persistenzmodell -> Task 3 (Obfuscate) + Task 6 (Session) + Task 12 (Screen/Export/beforeunload).
- B.5 Einmalige Migration -> Task 12 (Migration.js, isCustom, Alt-Key loeschen).
- B.6 Validator/DateHelper aufraeumen -> Task 7.
- C. Medikamenten-Stammdaten -> Task 4 (Felder) + Task 8 (JSON/Repo/Instance) + Task 13 (UI-Flow).
- D. Offizielles PDF -> Task 9 (Aggregation) + Task 10 (Vorverarbeitung/Filler) + Task 14 (Controller).
- Migrationsstrategie -> Task 12.
- Offene Punkte (Test-Strategie) -> ueber alle Tasks (Vitest, TDD); weitere Medikamente -> arc42-Risiken/readme.

**Typ-/Namenskonsistenz:** concentrationValue/concentrationUnit, medicationRefId, isCustom, productFamily, strengths[].refId, getDaysBetween, fillCertificate, buildCertificateBytes, obfuscate/deobfuscate, escapeHtml/setDataset, migrateLegacyData/hasLegacyData/LEGACY_KEY — durchgaengig gleich.

**Placeholder-Scan:** keine TBD/TODO/"handle edge cases"-Steps; jeder Code-Step enthaelt konkreten Code oder Befehle mit erwarteter Ausgabe. Manuelle Browser-Smokes sind als solche markiert (nicht in jsdom automatisierbar).

**Bekannte Abhaengigkeit vom realen Asset:** Task 10 setzt die amtliche PDF-Datei voraus; die exakten AcroForm-Feldnamen werden in Step 2 inspiziert und ggf. im Mapping korrigiert (im Task ausgewiesen).
