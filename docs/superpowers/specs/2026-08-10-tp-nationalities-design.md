# TP-Nationalities · Amtliche Staatsangehörigkeits-Daten

Bindet die **amtliche DESTATIS-Staatsangehörigkeitstabelle** (Statistisches Bundesamt) als
gebündelte Datenquelle ein, damit das Nationalitäts-Feld (Combobox) echte, amtliche Werte
nutzt statt eines freien Text-Inputs. Vorschalt-TP vor TP-D.

## Kontext & verifizierte Machbarkeit

Quelle: xrepository, Kennung
`urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit`.
Der Download-Link trägt ein festes Datum; es gibt **keinen** `/latest`-Alias — aber ein
`GET …/staatsangehoerigkeit/gueltigeVersion` (datumslose Kennung) liefert XML mit
`<dat:version>YYYY-MM-DD</dat:version>`. Daraus baut das Skript die aktuelle Download-URL.
**Vollständig verifiziert** (Node `fetch` + Regex, ohne XML-Dependency): Version `2026-08-05`
ermittelt, 211 Einträge geladen, Deutschland = `{code:"000", name:"Deutschland",
adjective:"deutsch"}`.

Datenstruktur der Quelle: `daten` = Array von Zeilen; Spalten (Auszug): `0` DESTATIS-Schlüssel,
`1` Suchbegriff (Landesname), `2` **Staatsangehörigkeit (Adjektiv)**, `7/8` ISO-3/ISO-2.

## Leitentscheidungen

- **Build-Transform pro Deployment** → schlanke `data/nationalities.json` ins Repo (gebündelt wie
  medications.json). Kein Laufzeit-Fetch (Offline/Datenschutz der BtM-PWA).
- **Version automatisch** über `gueltigeVersion` (kein fest verdrahtetes Datum) → jedes Deployment
  zieht die aktuell gültige Liste; die Version wird in `_meta` mitgeschrieben (Nachvollziehbarkeit
  + „gibt es eine neue?"-Vergleich).
- **Feld-Wert = Adjektiv** (Spalte „Staatsangehörigkeit", z. B. „deutsch") — passt zum amtlichen
  Formularfeld und zum bisherigen Default „deutsch". Combobox sucht nach Land **und** Adjektiv.

## Architektur / Dateien

```
scripts/fetch-nationalities.mjs   NEU — Version ermitteln, DESTATIS-JSON laden, transformieren, schreiben
data/nationalities.json           NEU (generiert, committet) — { _meta, list: [{code,name,adjective}] }
package.json                      Script "fetch:nationalities"
js/repositories/NationalityRepository.js  NEU — findAll()/search(term)
js/repositories/NationalityRepository.test.js
test/nationalities-data.test.js   Datei-Integrität
docs/arc42/architecture.md        ADR + §5/§8 Ergänzung
```

### `scripts/fetch-nationalities.mjs`

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
  .filter((r) => r[2])                         // nur Zeilen mit Adjektiv
  .map((r) => ({ code: r[0], name: r[1], adjective: r[2] }))
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

const out = {
  _meta: { version, source: 'DESTATIS/Statistisches Bundesamt (xrepository)', count: list.length },
  list,
};
writeFileSync(resolve(__dirname, '..', 'data', 'nationalities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`nationalities.json geschrieben: ${list.length} Einträge (Version ${version}).`);
```

### `js/repositories/NationalityRepository.js`

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

### Nutzung (Schnittstelle für TP-D)

- Die Combobox im Nationalitäts-Feld nutzt `NationalityRepository.search(term)` und mappt jeden
  Treffer auf `{ value: adjective, label: `${name} (${adjective})` }` (Anzeige Land+Adjektiv,
  gespeichert das Adjektiv). Default bleibt „deutsch".
- `app.js` importiert `nationalities.json` (wie medications.json) und erzeugt das Repository.
- **TP-D** wird entsprechend angepasst: Nationalitäts-Feld = Combobox statt Plain-Input (das im
  TP-D-Spec als „bleibt input" markierte Feld wird hier ermöglicht; TP-D-Plan referenziert das).

## Fehlerbehandlung & Randfälle

- **Skript:** wirft klar, wenn Version nicht ermittelbar oder Download fehlschlägt (kein stilles
  Weiterlaufen mit leerer Liste). Läuft nur bei Bedarf/Deployment, nicht zur Laufzeit.
- **Repository:** leere/fehlende Liste → `findAll()` = `[]`, `search` = `[]` (kein Wurf).
- **Combobox-Konsum (TP-D):** falls das Repository leer wäre, fällt das Feld auf Freitext zurück
  (Combobox mit leerer Optionsliste erlaubt weiterhin Eingabe).

## Tests (Pflicht)

- **`test/nationalities-data.test.js`** (Datei-Integrität, importiert `data/nationalities.json`):
  - `list.length >= 200`.
  - enthält Deutschland: ein Eintrag mit `code === '000'`, `adjective === 'deutsch'`.
  - jeder Eintrag hat nicht-leere `code`, `name`, `adjective`.
  - `_meta.version` ist gesetzt (String).
- **`NationalityRepository.test.js`** (unit):
  - `findAll()` liefert die Liste.
  - `search('afghan')` enthält Afghanistan (über Adjektiv `afghanisch`).
  - `search('Deutsch')` enthält Deutschland (über Name/Adjektiv), case-insensitiv.
  - `search('')` liefert die ersten `limit` Einträge; `limit` wird respektiert.
  - leeres Repository (`new NationalityRepository()`) → `[]`, kein Wurf.
- **Bestehende Tests** (257) bleiben grün.

## ARC42 (Pflicht)

- **§5 Bausteinsicht:** `NationalityRepository`, Daten `nationalities.json` ergänzen.
- **§9 ADR-006:** Amtliche DESTATIS-Staatsangehörigkeitstabelle (Statistisches Bundesamt,
  xrepository) als gebündelte Datenquelle; Build-Transform (`scripts/fetch-nationalities.mjs`)
  ermittelt die gültige Version automatisch über `gueltigeVersion` (kein fest verdrahtetes Datum),
  extrahiert `{code, name, adjective}`; gespeichert wird das Adjektiv (Formularfeld
  „Staatsangehörigkeit"). Kein Laufzeit-Fetch (Offline/Datensparsamkeit).

## Definition of Done

- `scripts/fetch-nationalities.mjs` + `npm run fetch:nationalities`; generierte
  `data/nationalities.json` (≥ 200 Einträge, mit `_meta.version`) committet.
- `NationalityRepository` + Tests; Daten-Integritätstest; alle grün; 257 bestehende grün.
- `npm run build` kompiliert (JSON gebündelt).
- ARC42/ADR ergänzt.

## Später

- TP-D nutzt die Combobox mit dieser Datenquelle (Nationalitäts-Feld).
- Optionaler CI-Check „neue DESTATIS-Version verfügbar?" (Vergleich `gueltigeVersion` gegen
  `_meta.version`) — nicht Teil dieses TP, aber durch `_meta.version` vorbereitet.
