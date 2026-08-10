# TP-Nationalities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bindet die amtliche DESTATIS-Staatsangehörigkeitstabelle als gebündelte `data/nationalities.json` ein und stellt ein `NationalityRepository` bereit, das die Nationalitäts-Combobox speist.

**Architecture:** Ein Build-Skript (`scripts/fetch-nationalities.mjs`) ermittelt via `gueltigeVersion`-Endpoint automatisch die aktuelle DESTATIS-Version, lädt die JSON, transformiert sie zu `{_meta, list:[{code,name,adjective}]}` und schreibt `data/nationalities.json`. `NationalityRepository` (findAll/search) kapselt den Zugriff. Kein Laufzeit-Fetch — die Liste ist gebündelt.

**Tech Stack:** Vanilla JS (ES-Module), Node `fetch` (Skript), Vitest, Webpack (JSON-Import).

---

## Datei-Struktur

**Neu:**
```
scripts/fetch-nationalities.mjs           Build-Transform (Version ermitteln → JSON → transformieren)
data/nationalities.json                   generiert, committet ({_meta,list})
js/repositories/NationalityRepository.js  findAll()/search(term, limit)
js/repositories/NationalityRepository.test.js
test/nationalities-data.test.js           Datei-Integrität
```
**Modifiziert:**
```
package.json                              Script "fetch:nationalities"
docs/arc42/architecture.md                §5 + ADR-006
```

**Konventionen:** `npm test` = `vitest run`; Test-Globs `test/**` + `js/**`. Reine Daten/Logik,
kein DOM/`innerHTML`. Die App-Verdrahtung (app.js/Combobox) ist bewusst **TP-D** (dieses TP
liefert nur Daten + Repository).

---

## Task 1: Fetch-Skript + generierte data/nationalities.json

**Files:** Create `scripts/fetch-nationalities.mjs`, `data/nationalities.json`; Modify `package.json`

- [ ] **Step 1: Skript schreiben** — `scripts/fetch-nationalities.mjs`:
```js
// Lädt die amtliche DESTATIS-Staatsangehörigkeitstabelle (Statistisches Bundesamt,
// xrepository) und schreibt data/nationalities.json. Ermittelt automatisch die aktuell
// gültige Version über den gueltigeVersion-Endpoint (kein fest verdrahtetes Datum).
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.xrepository.de/api/xrepository/urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit';

const gv = await (await fetch(`${BASE}/gueltigeVersion`)).text();
const version = (gv.match(/<dat:version>([^<]+)<\/dat:version>/) || [])[1];
if (!version) throw new Error('Konnte gültige Version nicht ermitteln');

const url = `https://www.xrepository.de/api/xrepository/urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit_${version}/download/DESTATIS_Staatsangeh_rigkeit_${version}.json`;
const doc = await (await fetch(url)).json();

const list = doc.daten
  .filter((r) => r[2])
  .map((r) => ({ code: r[0], name: r[1], adjective: r[2] }))
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

const out = {
  _meta: { version, source: 'DESTATIS/Statistisches Bundesamt (xrepository)', count: list.length },
  list,
};
writeFileSync(resolve(__dirname, '..', 'data', 'nationalities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`nationalities.json geschrieben: ${list.length} Einträge (Version ${version}).`);
```

- [ ] **Step 2: package.json-Script ergänzen** — unter `"scripts"` hinzufügen:
```json
"fetch:nationalities": "node scripts/fetch-nationalities.mjs"
```

- [ ] **Step 3: Skript ausführen** (benötigt Netz)
Run: `npm run fetch:nationalities`
Expected: Ausgabe „nationalities.json geschrieben: <n> Einträge (Version <YYYY-MM-DD>)." mit n ≥ 200.
Falls kein Netz verfügbar (Sandbox): STOP und melde BLOCKED mit dem Grund — die Datei muss aus dem
Netz erzeugt werden; NICHT von Hand eine Ersatzliste schreiben.

- [ ] **Step 4: Ergebnis prüfen**
Run: `node -e "const d=require('./data/nationalities.json'); console.log('count', d.list.length, '| version', d._meta.version); const de=d.list.find(x=>x.code==='000'); console.log('DE', JSON.stringify(de));"`
Expected: `count` ≥ 200, `version` gesetzt, `DE {"code":"000","name":"Deutschland","adjective":"deutsch"}`.

- [ ] **Step 5: Commit**
```bash
git add scripts/fetch-nationalities.mjs data/nationalities.json package.json
git commit -m "TP-Nationalities: DESTATIS-Fetch-Skript + generierte nationalities.json"
```

---

## Task 2: Daten-Integritätstest

**Files:** Create `test/nationalities-data.test.js`

- [ ] **Step 1: Write the failing test** — `test/nationalities-data.test.js`:
```js
import { describe, it, expect } from 'vitest';
import data from '../data/nationalities.json';

describe('nationalities.json', () => {
  it('enthält mindestens 200 Einträge', () => {
    expect(Array.isArray(data.list)).toBe(true);
    expect(data.list.length).toBeGreaterThanOrEqual(200);
  });
  it('enthält Deutschland (code 000, adjective deutsch)', () => {
    const de = data.list.find((n) => n.code === '000');
    expect(de).toBeTruthy();
    expect(de.adjective).toBe('deutsch');
    expect(de.name).toBe('Deutschland');
  });
  it('jeder Eintrag hat nicht-leere code/name/adjective', () => {
    for (const n of data.list) {
      expect(String(n.code || '').length).toBeGreaterThan(0);
      expect(String(n.name || '').length).toBeGreaterThan(0);
      expect(String(n.adjective || '').length).toBeGreaterThan(0);
    }
  });
  it('_meta.version ist gesetzt', () => {
    expect(typeof data._meta.version).toBe('string');
    expect(data._meta.version.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify** — `npx vitest run test/nationalities-data.test.js`
Expected: PASS (4 Tests), da `data/nationalities.json` aus Task 1 existiert. (Falls FAIL wegen
fehlender Datei → Task 1 nicht abgeschlossen.)

- [ ] **Step 3: Commit**
```bash
git add test/nationalities-data.test.js
git commit -m "TP-Nationalities: Daten-Integritätstest"
```

---

## Task 3: NationalityRepository

**Files:** Create `js/repositories/NationalityRepository.js`, `js/repositories/NationalityRepository.test.js`

- [ ] **Step 1: Write the failing test** — `js/repositories/NationalityRepository.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { NationalityRepository } from './NationalityRepository.js';

const data = {
  _meta: { version: '2026-08-05' },
  list: [
    { code: '000', name: 'Deutschland', adjective: 'deutsch' },
    { code: '423', name: 'Afghanistan', adjective: 'afghanisch' },
    { code: '287', name: 'Ägypten', adjective: 'ägyptisch' },
  ],
};

describe('NationalityRepository', () => {
  it('findAll liefert die Liste', () => {
    expect(new NationalityRepository(data).findAll().length).toBe(3);
  });
  it('search findet über das Adjektiv (afghan → Afghanistan)', () => {
    const r = new NationalityRepository(data).search('afghan');
    expect(r.some((n) => n.name === 'Afghanistan')).toBe(true);
  });
  it('search findet über den Namen, case-insensitiv (deutsch → Deutschland)', () => {
    const r = new NationalityRepository(data).search('DEUTSCH');
    expect(r.some((n) => n.code === '000')).toBe(true);
  });
  it('search("") liefert bis zu limit Einträge', () => {
    expect(new NationalityRepository(data).search('', 2).length).toBe(2);
  });
  it('leeres Repository → [] ohne Wurf', () => {
    const r = new NationalityRepository();
    expect(r.findAll()).toEqual([]);
    expect(r.search('x')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run js/repositories/NationalityRepository.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `js/repositories/NationalityRepository.js`:**
```js
// Kapselt den Zugriff auf die amtliche Staatsangehörigkeits-Liste (nationalities.json).
export class NationalityRepository {
  constructor(data) {
    this.list = (data && data.list) || [];
  }

  findAll() {
    return this.list;
  }

  // Sucht case-insensitiv in Landesname UND Adjektiv; max. limit Treffer.
  search(term, limit = 8) {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return this.list.slice(0, limit);
    return this.list
      .filter((n) => n.name.toLowerCase().includes(q) || n.adjective.toLowerCase().includes(q))
      .slice(0, limit);
  }
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run js/repositories/NationalityRepository.test.js` → PASS (5 Tests).

- [ ] **Step 5: Commit**
```bash
git add js/repositories/NationalityRepository.js js/repositories/NationalityRepository.test.js
git commit -m "TP-Nationalities: NationalityRepository (findAll/search)"
```

---

## Task 4: ARC42 / ADR

**Files:** Modify `docs/arc42/architecture.md`

- [ ] **Step 1: §5 Bausteinsicht ergänzen** — die Repositories-Zeile erweitern. Suche
```markdown
- Repositories: MedicationRepository, SubstanceRepository
```
und ersetze durch
```markdown
- Repositories: MedicationRepository, SubstanceRepository, NationalityRepository
```
und die Daten-Zeile
```markdown
- Daten: medications.json, substances.json
```
durch
```markdown
- Daten: medications.json, substances.json, nationalities.json (amtliche DESTATIS-Liste)
```

- [ ] **Step 2: ADR-006 in §9 ergänzen** — nach ADR-005 anfügen:
```markdown
- ADR-006: Staatsangehörigkeiten aus der amtlichen DESTATIS-Tabelle (Statistisches Bundesamt,
  xrepository) als gebündelte data/nationalities.json. Build-Transform
  (scripts/fetch-nationalities.mjs) ermittelt die gültige Version automatisch über den
  gueltigeVersion-Endpoint (kein fest verdrahtetes Datum) und extrahiert {code, name, adjective};
  im Formularfeld „Staatsangehörigkeit" wird das Adjektiv gespeichert (z.B. „deutsch").
  Kein Laufzeit-Fetch (Offline/Datensparsamkeit). NationalityRepository (findAll/search) speist
  die Combobox (Verdrahtung in TP-D). Neue Versionen erkennbar über _meta.version vs. gueltigeVersion.
```

- [ ] **Step 3: Commit**
```bash
git add docs/arc42/architecture.md
git commit -m "TP-Nationalities: ARC42 §5 + ADR-006 (amtliche DESTATIS-Quelle)"
```

---

## Task 5: Gesamtabnahme

- [ ] **Step 1: Unit-Tests** — `npm test` → 257 bestehende + neu (nationalities-data 4, Repository 5) grün.
- [ ] **Step 2: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert (JSON importierbar; erst in TP-D genutzt, hier reicht dass der Build nicht bricht).
- [ ] **Step 3: DoD-Check**
  - [ ] `data/nationalities.json` (≥ 200 Einträge, `_meta.version`) committet; Fetch-Skript + Script-Eintrag.
  - [ ] NationalityRepository + Tests grün; Daten-Integritätstest grün.
  - [ ] ARC42 §5 + ADR-006 ergänzt.

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** Fetch-Skript + JSON (T1), Daten-Integrität (T2), Repository (T3), ARC42/ADR
  (T4), Abnahme (T5). Die Combobox-Verdrahtung ist bewusst TP-D (Spec so festgelegt).
- **Netz-Abhängigkeit:** Task 1 braucht Netz; explizite BLOCKED-Anweisung, falls Sandbox offline
  ist (keine handgeschriebene Ersatzliste). Pipeline wurde vorab verifiziert (211 Einträge,
  Version 2026-08-05, DE 000/deutsch).
- **Signatur-Konsistenz:** `NationalityRepository(data).findAll()/search(term, limit)`; Datenform
  `{_meta:{version}, list:[{code,name,adjective}]}` durchgängig in Skript, Tests, Repository.
