# BtM-Stammdaten-Erweiterung — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Stammdaten-DB um Opioide erweitern und eine zentrale Wirkstoff-Tabelle (`substances.json`) einführen, aus der die Indikationen/ICD per stabilem `substanceId` an jede Medikamenten-Resource gejoint werden.

**Architecture:** Neue `data/substances.json` (Schlüssel `substanceId`, je Wirkstoff atc-Liste/atcGroup/indications mit icd10+icd11). Neues `SubstanceRepository`. `MedicationRepository` bekommt optional das SubstanceRepo und reichert Resources um `reasonSuggestions` an. Opioid-Präparate und die substanceId/btmStatus-Migration der 59 Alt-Resources werden über idempotente Node-Generatorskripte erzeugt (kein Hand-Editieren großer JSON-Blöcke).

**Tech Stack:** JavaScript (ES-Module), Vitest, Node-Generatorskripte.

---

## Konventionen
- Vitest, Test neben dem Code als `<name>.test.js`.
- Jeder Task: Failing Test zuerst, dann Implementierung, dann grün, dann Commit.
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- JSON-Datendateien werden über Skripte in `scripts/` erzeugt; Skripte bleiben im Repo
  (reproduzierbar), Ausgabe wird mitgetestet (Integritätstests).

## Datei-Struktur
- **Neu:** `data/substances.json` — zentrale Wirkstoff-Tabelle.
- **Neu:** `js/repositories/SubstanceRepository.js` (+ Test).
- **Neu:** `scripts/build-substances.mjs` — erzeugt substances.json aus einer Seed-Tabelle.
- **Neu:** `scripts/add-opioids.mjs` — hängt Opioid-Präparate an medications.json an.
- **Neu:** `scripts/migrate-medications-substanceid.mjs` — trägt substanceId/btmStatus nach, korrigiert Guanfacin-ATC.
- **Neu:** `test/data-integrity.test.js` — prüft Konsistenz substances/medications.
- **Ändern:** `js/utils/DosageForm.js` — Fallback „Einheit" → „Stück".
- **Ändern:** `js/repositories/MedicationRepository.js` — substanceId-Join.
- **Ändern:** `docs/arc42/architecture.md`.

---

## Task 1: SubstanceRepository

**Files:**
- Create: `js/repositories/SubstanceRepository.js`
- Test: `js/repositories/SubstanceRepository.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `js/repositories/SubstanceRepository.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { SubstanceRepository } from './SubstanceRepository.js';

const data = {
    morphin: {
        name: 'Morphin', atc: ['N02AA01'], atcGroup: 'N02AA Natürliche Opium-Alkaloide',
        indications: [
            { label: 'Starke chronische Schmerzen', icd10: 'R52.2', icd11: 'MG30.0' },
        ],
    },
};

describe('SubstanceRepository', () => {
    const repo = new SubstanceRepository(data);

    it('findById liefert den Wirkstoff-Eintrag', () => {
        expect(repo.findById('morphin').name).toBe('Morphin');
        expect(repo.findById('morphin').atc).toContain('N02AA01');
    });
    it('findById gibt null bei Unbekanntem', () => {
        expect(repo.findById('unbekannt')).toBeNull();
    });
    it('indicationsFor liefert Indikationen mit icd10 und icd11', () => {
        const ind = repo.indicationsFor('morphin');
        expect(ind).toHaveLength(1);
        expect(ind[0]).toMatchObject({ icd10: 'R52.2', icd11: 'MG30.0' });
    });
    it('indicationsFor gibt leeres Array bei Unbekanntem', () => {
        expect(repo.indicationsFor('unbekannt')).toEqual([]);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/repositories/SubstanceRepository.test.js`
Expected: FAIL — `Cannot find module './SubstanceRepository.js'`.

- [ ] **Step 3: Implementierung schreiben**

Create `js/repositories/SubstanceRepository.js`:

```javascript
// Kapselt den Zugriff auf die zentrale Wirkstoff-Tabelle (substances.json).
// Schluessel ist eine stabile substanceId (nicht der ATC, da ein Wirkstoff
// mehrere ATC-Codes haben kann).

export class SubstanceRepository {
    constructor(substances) {
        this.substances = substances || {};
    }

    findById(substanceId) {
        return this.substances[substanceId] || null;
    }

    indicationsFor(substanceId) {
        return this.substances[substanceId]?.indications || [];
    }
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/repositories/SubstanceRepository.test.js`
Expected: PASS — 4 Testfaelle gruen.

- [ ] **Step 5: Commit**

```bash
git add js/repositories/SubstanceRepository.js js/repositories/SubstanceRepository.test.js
git commit -m "feat: SubstanceRepository (Wirkstoff-Tabelle, Join per substanceId)"
```

---

## Task 2: substances.json erzeugen (Generatorskript)

**Files:**
- Create: `scripts/build-substances.mjs`
- Create: `data/substances.json` (Skript-Ausgabe)
- Test: `test/substances-data.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `test/substances-data.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import substances from '../data/substances.json';

describe('substances.json', () => {
    it('enthaelt ADHS- und Opioid-Wirkstoffe', () => {
        for (const id of ['methylphenidat', 'guanfacin', 'morphin', 'fentanyl',
            'tilidin-naloxon', 'buprenorphin', 'oxycodon-naloxon']) {
            expect(substances[id], id).toBeTruthy();
        }
    });
    it('Guanfacin traegt N06BA21 (ADHS-Kontext)', () => {
        expect(substances.guanfacin.atc).toContain('N06BA21');
    });
    it('jede Indikation hat label, icd10 und icd11', () => {
        for (const [id, s] of Object.entries(substances)) {
            expect(Array.isArray(s.indications), id).toBe(true);
            for (const ind of s.indications) {
                expect(ind.label, id).toBeTruthy();
                expect(ind.icd10, id).toBeTruthy();
                expect(ind.icd11, id).toBeTruthy();
            }
        }
    });
    it('jeder Wirkstoff hat name, atc-Liste und atcGroup', () => {
        for (const [id, s] of Object.entries(substances)) {
            expect(s.name, id).toBeTruthy();
            expect(Array.isArray(s.atc), id).toBe(true);
            expect(s.atcGroup, id).toBeTruthy();
        }
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run test/substances-data.test.js`
Expected: FAIL — `data/substances.json` existiert nicht.

- [ ] **Step 3: Generatorskript schreiben**

Create `scripts/build-substances.mjs`:

```javascript
// Erzeugt data/substances.json aus einer Seed-Tabelle. Idempotent.
// Aufruf: node scripts/build-substances.mjs
import { writeFileSync } from 'node:fs';

const ADHS = [
    { label: 'ADHS (mit Hyperaktivität)', icd10: 'F90.0', icd11: '6A05.1' },
    { label: 'ADHS mit Störung des Sozialverhaltens', icd10: 'F90.1', icd11: '6A05.2 + 6C90' },
    { label: 'ADS (Aufmerksamkeitsstörung ohne Hyperaktivität)', icd10: 'F98.8', icd11: '6A05.0' },
    { label: 'ADHS, nicht näher bezeichnet', icd10: 'F90.9', icd11: '6A05.Z' },
];
const chronisch = { label: 'Starke chronische Schmerzen', icd10: 'R52.2', icd11: 'MG30.0' };
const tumor = { label: 'Tumor-/Palliativschmerz', icd10: 'C80.9', icd11: 'MG30.10' };
const akut = { label: 'Akute starke Schmerzen', icd10: 'R52.0', icd11: 'MG31.Z' };
const durchbruch = { label: 'Durchbruchschmerz bei Tumor', icd10: 'R52.1', icd11: 'MG30.10' };

const NEURO = 'N06BA Zentral wirkende Sympathomimetika';
const AA = 'N02AA Natürliche Opium-Alkaloide';
const AB = 'N02AB Phenylpiperidin-Derivate';
const AX = 'N02AX Andere Opioide';
const AE = 'N02AE Oripavin-Derivate';

const substances = {
    methylphenidat: { name: 'Methylphenidat', atc: ['N06BA04'], atcGroup: NEURO, indications: ADHS },
    lisdexamfetamin: { name: 'Lisdexamfetamin', atc: ['N06BA12'], atcGroup: NEURO, indications: ADHS },
    dexamfetamin: { name: 'Dexamfetamin', atc: ['N06BA02'], atcGroup: NEURO, indications: ADHS },
    atomoxetin: { name: 'Atomoxetin', atc: ['N06BA09'], atcGroup: NEURO, indications: ADHS },
    guanfacin: { name: 'Guanfacin', atc: ['N06BA21', 'C02AC02'], atcGroup: NEURO, indications: ADHS },

    morphin: { name: 'Morphin', atc: ['N02AA01'], atcGroup: AA, indications: [chronisch, tumor, akut] },
    hydromorphon: { name: 'Hydromorphon', atc: ['N02AA03'], atcGroup: AA, indications: [chronisch, tumor] },
    oxycodon: { name: 'Oxycodon', atc: ['N02AA05'], atcGroup: AA, indications: [chronisch, tumor] },
    'oxycodon-naloxon': { name: 'Oxycodon + Naloxon', atc: ['N02AA55'], atcGroup: AA, indications: [chronisch, tumor] },
    fentanyl: { name: 'Fentanyl', atc: ['N02AB03'], atcGroup: AB, indications: [chronisch, tumor, durchbruch] },
    tapentadol: { name: 'Tapentadol', atc: ['N02AX06'], atcGroup: AX, indications: [chronisch, akut] },
    'tilidin-naloxon': { name: 'Tilidin + Naloxon', atc: ['N02AX51'], atcGroup: AX, indications: [chronisch, akut] },
    buprenorphin: { name: 'Buprenorphin', atc: ['N02AE01'], atcGroup: AE, indications: [chronisch, tumor] },
};

writeFileSync('data/substances.json', JSON.stringify(substances, null, 2) + '\n');
console.log(`${Object.keys(substances).length} Wirkstoffe geschrieben.`);
```

- [ ] **Step 4: Skript ausfuehren + Test bestehen**

Run: `node scripts/build-substances.mjs && npx vitest run test/substances-data.test.js`
Expected: „13 Wirkstoffe geschrieben." + PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-substances.mjs data/substances.json test/substances-data.test.js
git commit -m "feat: substances.json (Wirkstoff-Tabelle mit icd10+icd11, Opioide + ADHS)"
```

---

## Task 3: DosageForm-Fallback auf „Stück"

**Files:**
- Modify: `js/utils/DosageForm.js`
- Test: `js/utils/DosageForm.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/utils/DosageForm.test.js`:

```javascript
describe('formUnit — Sonderformen (Stammdaten-Erweiterung)', () => {
    it('transdermales Pflaster -> Stück', () => {
        expect(formUnit('transdermales Pflaster')).toEqual({ singular: 'Stück', plural: 'Stück' });
    });
    it('Buccaltablette/Sublingualtablette -> Tablette (enthält "tablette")', () => {
        expect(formUnit('Buccaltablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
        expect(formUnit('Sublingualtablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
    });
    it('unbekannte Form -> Stück (nicht mehr Einheit)', () => {
        expect(formUnit('Zäpfchen')).toEqual({ singular: 'Stück', plural: 'Stück' });
        expect(formUnit('')).toEqual({ singular: 'Stück', plural: 'Stück' });
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/utils/DosageForm.test.js`
Expected: FAIL — Fallback liefert `Einheit/Einheiten`; Pflaster liefert `Einheit/Einheiten`.

- [ ] **Step 3: Implementierung anpassen**

Modify `js/utils/DosageForm.js`. Pflaster-Zeile ergaenzen und Fallback aendern:

```javascript
export function formUnit(darreichungsform) {
    const f = String(darreichungsform || '').toLowerCase();
    if (f.includes('kapsel')) return { singular: 'Kapsel', plural: 'Kapseln' };
    if (f.includes('tablette')) return { singular: 'Tablette', plural: 'Tabletten' };
    if (f.includes('tropfen') || f.includes('saft') || f.includes('lösung') || f.includes('loesung')) {
        return { singular: 'ml', plural: 'ml' };
    }
    if (f.includes('pflaster')) return { singular: 'Stück', plural: 'Stück' };
    return { singular: 'Stück', plural: 'Stück' };
}
```

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/utils/DosageForm.test.js`
Expected: PASS. Falls ein bestehender Test „Einheit/Einheiten" erwartete, auf „Stück/Stück"
aktualisieren (der TP0-Test „Fallback fuer Unbekanntes" prueft `Zäpfchen`/`''`).

- [ ] **Step 5: Volle Suite (Regression PdfFormFiller/Plan)**

Run: `npm test`
Expected: alle gruen. Falls ein PdfFormFiller-Test durch die Fallback-Aenderung eine
Erwartung „Einheit" trug, auf „Stück" aktualisieren.

- [ ] **Step 6: Commit**

```bash
git add js/utils/DosageForm.js js/utils/DosageForm.test.js
git commit -m "refactor: DosageForm-Fallback und Pflaster -> Zaehl-Einheit Stueck"
```

---

## Task 4: Opioid-Präparate an medications.json anhängen

**Files:**
- Create: `scripts/add-opioids.mjs`
- Modify: `data/medications.json` (Skript-Ausgabe)
- Test: `test/opioids-data.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `test/opioids-data.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';

const byId = (id) => meds.find((m) => m.id === id);

describe('Opioid-Präparate in medications.json', () => {
    it('Morphin-Retardtablette 30 mg existiert mit substanceId + btmStatus', () => {
        const m = byId('mst-continus-30mg');
        expect(m).toBeTruthy();
        expect(m.substanceId).toBe('morphin');
        expect(m.form.text).toBe('Retardtablette');
        expect(m.btmStatus).toBe('btm');
        expect(m.ingredient[0].strength.numerator).toMatchObject({ value: 30, unit: 'mg' });
    });
    it('Fentanyl-Pflaster traegt Einheit µg/h und amtliche Form', () => {
        const m = byId('durogesic-25ugh');
        expect(m.form.text).toBe('transdermales Pflaster');
        expect(m.ingredient[0].strength.numerator.unit).toBe('µg/h');
        expect(m.substanceId).toBe('fentanyl');
    });
    it('Effentora-Buccaltablette traegt Einheit µg', () => {
        const m = byId('effentora-200ug');
        expect(m.form.text).toBe('Buccaltablette');
        expect(m.ingredient[0].strength.numerator.unit).toBe('µg');
    });
    it('Tilidin-retard ist btmStatus ausgenommen mit Hinweis', () => {
        const m = meds.find((x) => x.substanceId === 'tilidin-naloxon');
        expect(m.btmStatus).toBe('ausgenommen');
        expect(m.btmHinweis).toMatch(/ausgenommen/i);
        expect(m.btmCategory).toBe('Nicht-BTM');
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run test/opioids-data.test.js`
Expected: FAIL — die Opioid-Resources existieren nicht.

- [ ] **Step 3: Generatorskript schreiben**

Create `scripts/add-opioids.mjs`:

```javascript
// Haengt Opioid-Praeparate an data/medications.json an. Idempotent:
// entfernt vor dem Anhaengen alle Resources mit den hier erzeugten ids.
// Aufruf: node scripts/add-opioids.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ATC = {
    morphin: 'N02AA01', hydromorphon: 'N02AA03', oxycodon: 'N02AA05',
    'oxycodon-naloxon': 'N02AA55', fentanyl: 'N02AB03', tapentadol: 'N02AX06',
    'tilidin-naloxon': 'N02AX51', buprenorphin: 'N02AE01',
};

function slug(s) {
    return s.toLowerCase().replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m]))
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
// id-Slug fuer die Einheit: µg/h -> ugh, µg -> ug, mg -> mg
function unitSlug(unit) {
    return unit.replace('µ', 'u').replace('/', '');
}

// [productFamily, form.text, substanceId, wirkstoff, unit, btmStatus, btmHinweis?, [values]]
const P = [
    ['MST Continus', 'Retardtablette', 'morphin', 'Morphin', 'mg', 'btm', null, [10, 30, 60, 100, 200]],
    ['Sevredol', 'Tablette', 'morphin', 'Morphin', 'mg', 'btm', null, [10, 20]],
    ['Palladon', 'Retardkapsel', 'hydromorphon', 'Hydromorphon', 'mg', 'btm', null, [4, 8, 16, 24]],
    ['Jurnista', 'Retardtablette', 'hydromorphon', 'Hydromorphon', 'mg', 'btm', null, [4, 8, 16, 32, 64]],
    ['Oxygesic', 'Retardtablette', 'oxycodon', 'Oxycodon', 'mg', 'btm', null, [5, 10, 20, 40, 80]],
    ['Targin', 'Retardtablette', 'oxycodon-naloxon', 'Oxycodon + Naloxon', 'mg', 'btm', null, [5, 10, 20, 40]],
    ['Durogesic', 'transdermales Pflaster', 'fentanyl', 'Fentanyl', 'µg/h', 'btm', null, [12, 25, 50, 75, 100]],
    ['Effentora', 'Buccaltablette', 'fentanyl', 'Fentanyl', 'µg', 'btm', null, [100, 200, 400, 600, 800]],
    ['Palexia retard', 'Retardtablette', 'tapentadol', 'Tapentadol', 'mg', 'btm', null, [25, 50, 100, 150, 200, 250]],
    ['Valoron N retard', 'Retardtablette', 'tilidin-naloxon', 'Tilidin + Naloxon', 'mg', 'ausgenommen',
        'retardierte Form BtM-ausgenommen; nicht-retardierte Formen sind BtM-pflichtig', [50, 100, 150, 200]],
    ['Norspan', 'transdermales Pflaster', 'buprenorphin', 'Buprenorphin', 'µg/h', 'btm', null, [5, 10, 15, 20, 30, 40]],
    ['Temgesic', 'Sublingualtablette', 'buprenorphin', 'Buprenorphin', 'mg', 'btm', null, [0.2, 0.4]],
];

const out = [];
const newIds = new Set();
for (const [family, form, substanceId, wirkstoff, unit, btmStatus, btmHinweis, values] of P) {
    const denom = form.toLowerCase().includes('kapsel') ? 'Kapsel'
        : form.toLowerCase().includes('pflaster') ? 'Pflaster' : 'Tablette';
    for (const v of values) {
        const id = `${slug(family)}-${String(v).replace('.', '')}${unitSlug(unit)}`;
        newIds.add(id);
        const res = {
            resourceType: 'Medication',
            id,
            substanceId,
            productFamily: family,
            code: { coding: [{ system: 'http://www.whocc.no/atc', code: ATC[substanceId] }],
                text: `${family} ${v} ${unit} ${form}` },
            form: { text: form },
            btmStatus,
            btmCategory: btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM',
            ingredient: [{ itemCodeableConcept: { text: wirkstoff },
                strength: { numerator: { value: v, unit }, denominator: { value: 1, unit: denom } } }],
        };
        if (btmHinweis) res.btmHinweis = btmHinweis;
        out.push(res);
    }
}

const meds = JSON.parse(readFileSync('data/medications.json', 'utf8'));
const kept = meds.filter((m) => !newIds.has(m.id)); // idempotent
writeFileSync('data/medications.json', JSON.stringify([...kept, ...out], null, 2) + '\n');
console.log(`${out.length} Opioid-Resources angehaengt (gesamt ${kept.length + out.length}).`);
```

- [ ] **Step 4: Skript ausfuehren + Test bestehen**

Run: `node scripts/add-opioids.mjs && npx vitest run test/opioids-data.test.js`
Expected: Meldung mit Anzahl + PASS. (Erwartete Opioid-Resources: 52.)

- [ ] **Step 5: Commit**

```bash
git add scripts/add-opioids.mjs data/medications.json test/opioids-data.test.js
git commit -m "feat: Opioid-Praeparate in medications.json (substanceId, btmStatus, µg/µg-h)"
```

---

## Task 5: Migration der bestehenden ADHS-Resources

**Files:**
- Create: `scripts/migrate-medications-substanceid.mjs`
- Modify: `data/medications.json` (Skript-Ausgabe)
- Test: `test/medications-migration.test.js`

- [ ] **Step 1: Failing Test schreiben**

Create `test/medications-migration.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';

describe('Migration bestehender ADHS-Resources', () => {
    it('jede Resource hat substanceId und btmStatus', () => {
        for (const m of meds) {
            expect(m.substanceId, m.id).toBeTruthy();
            expect(['btm', 'ausgenommen', 'kein_btm'], m.id).toContain(m.btmStatus);
        }
    });
    it('Methylphenidat-Resource traegt substanceId methylphenidat', () => {
        const m = meds.find((x) => x.ingredient?.[0]?.itemCodeableConcept?.text === 'Methylphenidat');
        expect(m.substanceId).toBe('methylphenidat');
    });
    it('Guanfacin-Resource-ATC ist auf N06BA21 korrigiert', () => {
        const g = meds.find((x) => x.substanceId === 'guanfacin');
        expect(g.code.coding[0].code).toBe('N06BA21');
    });
    it('btmCategory bleibt aus btmStatus abgeleitet konsistent', () => {
        for (const m of meds) {
            const expected = m.btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM';
            expect(m.btmCategory, m.id).toBe(expected);
        }
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run test/medications-migration.test.js`
Expected: FAIL — bestehende ADHS-Resources haben kein `substanceId`/`btmStatus`;
Guanfacin-ATC ist noch C02AC02.

- [ ] **Step 3: Migrationsskript schreiben**

Create `scripts/migrate-medications-substanceid.mjs`:

```javascript
// Idempotente Migration bestehender Resources: substanceId + btmStatus nachtragen,
// Guanfacin-ATC auf N06BA21 korrigieren, btmCategory aus btmStatus ableiten.
// Resources, die bereits substanceId haben (Opioide), bleiben unveraendert.
// Aufruf: node scripts/migrate-medications-substanceid.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// Wirkstoffname -> substanceId (ADHS-Bestand)
const BY_SUBSTANCE = {
    Methylphenidat: 'methylphenidat',
    Lisdexamfetamin: 'lisdexamfetamin',
    Dexamfetamin: 'dexamfetamin',
    Atomoxetin: 'atomoxetin',
    Guanfacin: 'guanfacin',
};

const meds = JSON.parse(readFileSync('data/medications.json', 'utf8'));

for (const m of meds) {
    // substanceId nachtragen, falls fehlt (ADHS-Bestand).
    if (!m.substanceId) {
        const wirkstoff = m.ingredient?.[0]?.itemCodeableConcept?.text;
        if (BY_SUBSTANCE[wirkstoff]) m.substanceId = BY_SUBSTANCE[wirkstoff];
    }
    // Guanfacin-ATC korrigieren (nur Attribut, aber fachlich richtig).
    if (m.substanceId === 'guanfacin' && m.code?.coding?.[0]) {
        m.code.coding[0].code = 'N06BA21';
    }
    // btmStatus aus btmCategory ableiten, falls fehlt.
    if (!m.btmStatus) {
        m.btmStatus = m.btmCategory === 'BTM' ? 'btm' : 'kein_btm';
    }
    // btmCategory aus btmStatus konsistent halten.
    m.btmCategory = m.btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM';
}

writeFileSync('data/medications.json', JSON.stringify(meds, null, 2) + '\n');
const missing = meds.filter((m) => !m.substanceId).map((m) => m.id);
console.log(`Migriert. Ohne substanceId: ${missing.length ? missing.join(', ') : 'keine'}.`);
```

- [ ] **Step 4: Skript ausfuehren + Test bestehen**

Run: `node scripts/migrate-medications-substanceid.mjs && npx vitest run test/medications-migration.test.js`
Expected: „Ohne substanceId: keine." + PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-medications-substanceid.mjs data/medications.json test/medications-migration.test.js
git commit -m "feat: Migration Alt-Resources (substanceId, btmStatus, Guanfacin N06BA21)"
```

---

## Task 6: MedicationRepository — substanceId-Join

**Files:**
- Modify: `js/repositories/MedicationRepository.js`
- Test: `js/repositories/MedicationRepository.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergaenzen**

Append to `js/repositories/MedicationRepository.test.js`:

```javascript
import { SubstanceRepository } from './SubstanceRepository.js';
import substances from '../../data/substances.json';

describe('MedicationRepository — substanceId-Join (reasonSuggestions)', () => {
    const subRepo = new SubstanceRepository(substances);
    const repo = new MedicationRepository(medications, subRepo);

    it('Morphin-Resource bekommt reasonSuggestions mit R52.2', () => {
        const m = repo.findAll().find((r) => r.substanceId === 'morphin');
        const labels = m.reasonSuggestions.map((s) => s.icd10);
        expect(labels).toContain('R52.2');
    });
    it('ADHS-Resource bekommt die F90-Liste', () => {
        const m = repo.findAll().find((r) => r.substanceId === 'methylphenidat');
        expect(m.reasonSuggestions.map((s) => s.icd10)).toContain('F90.0');
    });
    it('ohne SubstanceRepo bleibt reasonSuggestions leer', () => {
        const bare = new MedicationRepository(medications);
        expect(bare.findAll()[0].reasonSuggestions).toEqual([]);
    });
    it('Resource ohne substanceId-Treffer -> leere Liste', () => {
        const repo2 = new MedicationRepository(
            [{ id: 'x', substanceId: 'gibtsnicht', ingredient: [], code: {}, form: {} }], subRepo);
        expect(repo2.findAll()[0].reasonSuggestions).toEqual([]);
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll fehlschlagen)**

Run: `npx vitest run js/repositories/MedicationRepository.test.js`
Expected: FAIL — Konstruktor nimmt kein 2. Argument; `reasonSuggestions` fehlt.

- [ ] **Step 3: Implementierung anpassen**

Modify `js/repositories/MedicationRepository.js`. Konstruktor um `substanceRepository`
erweitern und Resources beim Zugriff anreichern:

```javascript
export class MedicationRepository {
    constructor(resources, substanceRepository = null) {
        this.substanceRepository = substanceRepository;
        this.resources = (resources || []).map((r) => this._enrich(r));
    }

    _enrich(resource) {
        const reasonSuggestions = this.substanceRepository
            ? this.substanceRepository.indicationsFor(resource.substanceId)
            : [];
        return { ...resource, reasonSuggestions };
    }

    findAll() {
        return this.resources;
    }

    findById(id) {
        return this.resources.find((r) => r.id === id) || null;
    }
```

(Der Rest der Klasse — `search`, `_groupByFamily` — bleibt unveraendert.)

- [ ] **Step 4: Test ausfuehren (soll bestehen)**

Run: `npx vitest run js/repositories/MedicationRepository.test.js`
Expected: PASS — bestehende + neue Join-Tests gruen.

- [ ] **Step 5: Volle Suite**

Run: `npm test`
Expected: alle gruen (auch der MedicationController-Test, der das Repo ohne SubstanceRepo
nutzt — `reasonSuggestions` ist dort leer, kein Bruch).

- [ ] **Step 6: Commit**

```bash
git add js/repositories/MedicationRepository.js js/repositories/MedicationRepository.test.js
git commit -m "feat: MedicationRepository reichert Resources per substanceId-Join an"
```

---

## Task 7: Datenintegritaet + arc42 + app.js-Verdrahtung

**Files:**
- Create: `test/data-integrity.test.js`
- Modify: `js/app.js` (SubstanceRepository instanziieren und ans MedicationRepository geben)
- Modify: `docs/arc42/architecture.md`

- [ ] **Step 1: Integritaets-Test schreiben**

Create `test/data-integrity.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import meds from '../data/medications.json';
import substances from '../data/substances.json';

const ALLOWED_UNITS = ['mg', 'µg', 'µg/h'];

describe('Datenintegritaet substances/medications', () => {
    it('jede substanceId einer Resource existiert in substances.json', () => {
        for (const m of meds) {
            expect(substances[m.substanceId], `${m.id} -> ${m.substanceId}`).toBeTruthy();
        }
    });
    it('jede Staerke hat value>0 und eine erlaubte Einheit', () => {
        for (const m of meds) {
            const num = m.ingredient?.[0]?.strength?.numerator;
            expect(num?.value, m.id).toBeGreaterThan(0);
            expect(ALLOWED_UNITS, m.id).toContain(num?.unit);
        }
    });
    it('Tilidin-retard ist ausgenommen mit Hinweis', () => {
        const t = meds.find((m) => m.substanceId === 'tilidin-naloxon');
        expect(t.btmStatus).toBe('ausgenommen');
        expect(t.btmHinweis).toBeTruthy();
    });
});
```

- [ ] **Step 2: Test ausfuehren (soll bestehen)**

Run: `npx vitest run test/data-integrity.test.js`
Expected: PASS (Daten aus Task 2/4/5 sind bereits konsistent). Falls FAIL: die
beanstandete Resource im jeweiligen Generatorskript korrigieren und Skript erneut ausfuehren.

- [ ] **Step 3: app.js verdrahten**

Modify `js/app.js`. Oben ergaenzen:

```javascript
import substancesData from '../data/substances.json';
import { SubstanceRepository } from './repositories/SubstanceRepository.js';
```

Im Konstruktor die Repositories verbinden (bestehende `medicationRepository`-Zeile ersetzen):

```javascript
        this.substanceRepository = new SubstanceRepository(substancesData);
        this.medicationRepository = new MedicationRepository(medicationsData, this.substanceRepository);
```

- [ ] **Step 4: Build + volle Suite**

Run: `npm test && npm run build`
Expected: alle Tests gruen, Bundle sauber (substances.json wird mitgebundelt).

- [ ] **Step 5: arc42 ergaenzen**

Modify `docs/arc42/architecture.md`:
- Bausteinsicht: „Repositories: MedicationRepository, SubstanceRepository" und
  „Daten: medications.json, substances.json".
- Neuer ADR: „Indikationen zentral in substances.json, Join über stabile substanceId
  (nicht ATC — ein Wirkstoff kann mehrere ATC-Codes haben). ICD-10-GM + ICD-11 je Indikation."
- Risiken/Rechtsstand: „Cannabinoide seit 04/2024 kein BtM (MedCanG), daher zurückgestellt;
  Tilidin-retard BtM-ausgenommen (btmStatus). ATC-Quelle: WIdO; ICD-11: WHO MMS."

- [ ] **Step 6: Commit**

```bash
git add test/data-integrity.test.js js/app.js docs/arc42/architecture.md
git commit -m "feat: Datenintegritaets-Tests, SubstanceRepository in app.js verdrahtet, arc42"
```

---

## Self-Review (Plan ↔ Spec)

- **A. substances.json** (substanceId, atc-Liste, atcGroup, indications icd10+icd11) → Task 2. ✓
- **A1. ADHS-Wirkstoffe** (Guanfacin N06BA21) → Task 2 (Tabelle) + Task 5 (ATC-Korrektur Alt-Daten). ✓
- **A2. Opioid-Wirkstoffe** → Task 2. ✓
- **B. Opioid-Präparate** (form.text amtlich, µg/µg-h, id-Slug) → Task 4. ✓
- **C. Darreichungsform/Zähl-Einheit** (Fallback Stück, Pflaster) → Task 3. ✓
- **D. SubstanceRepository + Join** (reasonSuggestions) → Task 1 + Task 6. ✓
- **E. btmStatus dreiwertig + Ableitung** → Task 4 (neu) + Task 5 (Bestand). ✓
- **F. Migration 59 Alt-Resources** → Task 5. ✓
- **ICD-Anzeige nur ICD-10-GM** → out of scope (Grund/ICD-UI-TP), im Spec vermerkt; hier
  nur Datenhaltung beider Codes → Task 2. ✓
- **arc42** → Task 7. ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Code-/Daten-Step zeigt konkreten Inhalt +
erwartete Ausgabe. Generatorskripte sind vollständig ausformuliert.

**Typ-/Namenskonsistenz:** `substanceId`, `reasonSuggestions` (Array `{label, icd10, icd11}`),
`btmStatus`/`btmHinweis`/`btmCategory`, `SubstanceRepository.findById/indicationsFor`,
`MedicationRepository(resources, substanceRepository)` durchgängig gleich.

**Bekannte Abhängigkeit:** Task 6 importiert `data/substances.json` (aus Task 2) und der
MedicationRepository-Test importiert es ebenfalls — Reihenfolge Task 2 vor Task 6 einhalten.
