# Design: Medikamenten-Stammdaten, offizielles PDF-Formular & Security-Hardening

Datum: 2026-08-06

## Motivation

Ein Code-Review der bestehenden App (vanilla-JS MVC, PWA, generiert Bescheinigungen nach
Art. 75 Schengener Durchführungsabkommen) hat mehrere kritische Sicherheitslücken
aufgedeckt (Stored XSS über `innerHTML`, PII-Logging, unsichere ID-Vergabe) und
gleichzeitig zwei konzeptionelle Schwächen bestätigt:

1. Medikamente werden aktuell per Freitext-Name angelegt. Präparate mit mehreren
   Wirkstärken (z.B. Kinecteen 18/24/36/54mg) müssen als separate, ähnlich benannte
   Einträge gepflegt werden, was zu Dopplungen in Name und Wirkstoffmenge auf dem
   Medikationsplan führt.
2. Die App baut das Zertifikat mit jsPDF optisch nach, statt das echte, amtliche
   Formular (BfArM 017 (12.2000), Art. 75 SDÜ) zu verwenden.

Dieses Dokument bündelt die Behebung der Sicherheitsfunde mit einem neuen
Medikamenten-Stammdatenmodell und der Umstellung auf das offizielle, ausfüllbare
PDF-Formular.

## Scope

**In Scope:**
- Umstellung auf ES-Module + Webpack-Build
- XSS-Fixes, PII-Logging entfernen, stabile UUIDs
- Neues Persistenzmodell (sessionStorage + Export/Import statt dauerhaftem localStorage)
- Leichte Obfuskierung von sessionStorage-Cache und Exportdatei
- Migration bestehender Alt-Daten aus `localStorage['btm-app-data']`
- Medikamenten-Flatfile-DB im FHIR-`Medication`-Format
- Amtliches PDF-Formular direkt befüllen (pdf-lib) statt jsPDF-Nachbau
- Unterstützung für Eindosierungs-/Titrationsschemata (mehrere Dosierblöcke) in der
  PDF-Ausgabe

**Out of Scope (bewusst zurückgestellt):**
- Echte Passphrase-/Passkey-basierte Verschlüsselung
- Anbindung einer externen PZN-/Medikamenten-API (Architektur wird darauf vorbereitet,
  aber nicht implementiert)
- Cloud-Speicher-Integration für Exportdateien

## A. Architektur & Build

- Alle `js/**/*.js`-Dateien werden von globalen Scripts (`<script>`-Tag-Reihenfolge)
  auf ES-Module (`export`/`import`) umgestellt.
- `webpack.config.js` (neu) verdrahtet die bereits vorhandenen, aber ungenutzten
  devDependencies (`webpack`, `webpack-cli`, `webpack-dev-server`, `html-webpack-plugin`,
  `css-loader`, `style-loader`).
- `js/app.js` wird Entry-Point; `html-webpack-plugin` generiert `index.html` aus einem
  Template.
- `pdf-lib` wird als npm-Dependency installiert und gebundelt; `jsPDF` wird entfernt.
- Statische Assets (`data/medications.json`, `assets/reise-scheng-formular.pdf`) werden
  über Webpack-5-Asset-Module bzw. JSON-Import eingebunden, kein CDN mehr nötig
  (behebt den fehlenden SRI/CSP-Schutz aus dem Review).
- `npm run dev` → `webpack-dev-server`; `npm run build` → produktives Bundle in `dist/`.

## B. Sicherheit & Datenpersistenz

1. **XSS-Escaping:** zentraler `escapeHtml()`-Helper (`js/utils/Sanitize.js`), überall
   eingesetzt, wo Modelldaten in Templates interpoliert werden
   (`DataManagementView`, `MedicationView`, `TravelView`, `CertificateView`). Attribute
   (`data-id` etc.) werden über die DOM-API (`element.dataset`) statt String-Interpolation
   gesetzt.
2. **PII-Logging entfernen:** `console.log('Data saved:', this.data)` (DataStore.js)
   und vergleichbare Stellen (app.js) werden gestrichen bzw. auf Metadaten reduziert
   (z.B. nur Anzahl der Einträge).
3. **Stabile IDs:** `crypto.randomUUID()` statt `Date.now()`/`Date.now()+Math.random()`
   für alle Entities (Patient, Doctor, Medikamenten-Instanz, DosageScheme). String-IDs,
   Vergleich immer per `===`, kein `parseInt`/`parseFloat` mehr an Lookup-Stellen.
4. **Neues Persistenzmodell:**
   - Während der Sitzung: Autosave in `sessionStorage` (Crash-/Reload-Schutz),
     leicht obfuskiert (Base64 + einfache Transformation — kein echter Schlüssel,
     nur Sichtschutz gegen zufälliges Auslesen).
   - Explizite Aktion "Exportieren": lädt eine obfuskierte JSON-Datei herunter
     (gleiches Format wie der sessionStorage-Cache). Ablageort liegt beim Nutzer
     (lokal, eigener Cloud-Ordner etc.).
   - App-Start: Auswahl-Screen **"Neu anfangen"** oder **"Datei importieren"**
     (bestehende Import-Funktion aus `DataManagementView`/`DataController` wird
     primärer Einstiegspunkt statt Nebenfeature).
   - `sessionStorage` wird vom Browser selbst beim Schließen von Tab/Fenster
     automatisch geleert (WHATWG-Spezifikationsgarantie) — kein Verlass auf
     `beforeunload`/`unload`-Handler nötig.
   - `beforeunload`-Warnhinweis bei ungesicherten Änderungen seit letztem Export.
5. **Einmalige Migration:** beim ersten Start nach dem Update wird
   `localStorage['btm-app-data']` erkannt, automatisch in die neue Session geladen
   (IDs werden dabei auf UUIDs migriert), der Nutzer wird zum Export aufgefordert,
   danach wird der alte `localStorage`-Key gelöscht. Alte, frei angelegte Medikamente
   bleiben als `isCustom: true`-Einträge erhalten und werden nicht automatisch der
   neuen Flatfile-DB zugeordnet.
6. **`Validator.js`/`DateHelper.js` aufräumen:** totes/paralleles Validierungscode wird
   entfernt bzw. konsolidiert; eine Quelle der Wahrheit pro Concern
   (Modell-`validate()`-Methoden bleiben maßgeblich; doppelte Datumsdifferenz-Berechnung
   wird auf `DateHelper.getDaysBetween` vereinheitlicht).

## C. Medikamenten-Stammdaten

**`data/medications.json`** — kuratierte Flatfile-DB, an die HL7-FHIR-`Medication`-
Resource angelehnt (leichte Anlehnung, kein FHIR-Server, keine volle Validierung):

```json
{
  "resourceType": "Medication",
  "id": "concerta-36mg",
  "productFamily": "Concerta",
  "code": {
    "coding": [{ "system": "http://www.whocc.no/atc", "code": "N06BA04" }],
    "text": "Concerta 36 mg Retardtabletten"
  },
  "form": { "text": "Retardtablette" },
  "ingredient": [{
    "itemCodeableConcept": { "text": "Methylphenidat" },
    "strength": { "numerator": { "value": 36, "unit": "mg" }, "denominator": { "value": 1, "unit": "Tablette" } }
  }]
}
```

- Jede Wirkstärke ist eine **eigenständige Resource** (FHIR modelliert eine konkrete
  Stärke pro Medication, kein verschachteltes Stärken-Array).
- `productFamily` ist ein bewusstes, nicht-FHIR-konformes Zusatzfeld, nur für die
  Autocomplete-Gruppierung in der UI (z.B. "Kinecteen" mit 4 wählbaren Stärken),
  von FHIR-Konsumenten ignorierbar.
- `code.coding` kann optional einen PZN-Eintrag enthalten (`urn:ifa:pzn`), sobald
  bekannt — kein Pflichtfeld, da eine vollständige PZN-Datenbank (ABDA-Artikelstamm)
  lizenzpflichtig ist.
- Seed-Daten: die aktuelle `Medication.getMedicationDatabase()` (Ritalin, Medikinet,
  Concerta, Kinecteen, Elvanse, Attentin, Strattera, Intuniv) wird 1:1 in dieses
  Format überführt.
- **`MedicationRepository`-Interface** (`findAll()`, `findById()`, `search(query)`)
  kapselt den Zugriff. Aktuell liest es aus dem gebündelten JSON; ein späterer
  API-Adapter (z.B. echte PZN-Anbindung) müsste nur dasselbe Interface implementieren.

**Gespeicherte Medikamenten-Instanz** (Snapshot-Prinzip — Werte werden beim Hinzufügen
kopiert, nicht live aus der DB referenziert, damit spätere DB-Korrekturen bereits
ausgestellte Bescheinigungen nicht rückwirkend verändern):

```json
{
  "id": "3f2a9e6d-uuid",
  "medicationRefId": "concerta-36mg",
  "isCustom": false,
  "handelsname": "Concerta",
  "wirkstoff": "Methylphenidat",
  "darreichungsform": "Retardtablette",
  "concentrationValue": 36,
  "concentrationUnit": "mg"
}
```

- `Medication.concentration` (bisher String `"10mg"` mit Regex-Extraktion) wird auf
  echte getrennte Felder `concentrationValue`/`concentrationUnit` umgestellt.
- **Manuelle Eingabe bleibt möglich** (`isCustom: true`, `medicationRefId: null`),
  läuft durch dieselbe Validierung/Escaping wie DB-Einträge.
- UI-Flow: Handelsname tippen/filtern (Autocomplete) → Stärke aus Dropdown wählen.
  Damit gibt es keine Gelegenheit mehr, Name und Wirkstärke in einem Freitextfeld
  zusammenzubauen.

## D. Offizielles PDF-Formular befüllen

- **Bibliothek:** `pdf-lib`, lädt `assets/reise-scheng-formular.pdf` (echtes
  BfArM-017-Formular) und befüllt die AcroForm-Textfelder direkt.
- **Einmalige Formular-Vorverarbeitung** (an der Asset-Datei, nicht zur Laufzeit):
  zwei Feldpaare im Original sind aus je zwei nebeneinanderliegenden Widgets auf
  derselben Linie zusammengesetzt (Autoren-Artefakt): `Staatsangehör`+`gkeit` und
  `Wohnanschr`+`ft`. Diese werden zu je einem Feld über die volle Zeilenbreite
  gemergt (`Staatsangehoerigkeit`, `Wohnanschrift`) und die Ursprungsdatei durch die
  bereinigte 32-Felder-Version ersetzt. Ein nicht benanntes Störfeld (Fußzeile) bleibt
  unbefüllt.
- **Feld-Mapping:**

| Formular (Abschnitt) | Feld(er) | Quelle |
|---|---|---|
| A – Arzt | `Name`, `Vorname`, `Telefon`, `Anschrift` | Doctor |
| A – Arzt | `Stempel des Arztes`, `Datum`, `Unterschrift des Arztes` | **leer**, von Hand nach Ausdruck |
| B – Patient | `Name_2`, `Vorname_2` | Patient |
| B – Patient | `Nr. des Passes...` | Patient.passport |
| B – Patient | `Geburtsort`, `Geburtsdatum` | Patient |
| B – Patient | `Staatsangehoerigkeit`, `Geschlecht`, `Wohnanschrift` | Patient |
| B – Patient | `Dauer der Reise in Tagen` | Travel.duration |
| B – Patient | `Gültigkeitsdauer der Erlaubnis von/bis` | Travel.startDate–endDate |
| C – Arzneimittel | `Handelsbezeichnung...`, `Darreichungsform`, `Internationale Bezeichnung...Wirkstoffs`, `WirkstoffKonzentration` | Medication (Snapshot) |
| C – Arzneimittel | `Gebrauchsanweisung` | siehe Titrations-Logik unten |
| C – Arzneimittel | `Gesamtwirkstoffmenge` | Summe über alle Dosierblöcke, gerundet |
| C – Arzneimittel | `Reichdauer der Verschreibung...` | Gesamtspanne erster bis letzter Block |
| C – Arzneimittel | `Anmerkungen` | optional, siehe Titrations-Logik |
| D – Behörde | alle Felder | **leer**, wird vor Ort von der Behörde ausgefüllt |

- **Eindosierung/Titration:** `dosageSchemes[medicationId]` ist bereits ein Array
  mehrerer Zeitblöcke (`TravelController.addDosageScheme` verkettet automatisch).
  Das amtliche Formular hat nur ein einzeiliges `Gebrauchsanweisung`-Feld:
  - 1 Block: `Gebrauchsanweisung` = Notation (z.B. `1-0-1-0`).
  - Mehrere Blöcke: `Gebrauchsanweisung` = kompakte Kette (z.B.
    `1-0-0-0 -> 1-0-1-0 -> 2-0-1-0`), Schriftgröße automatisch verkleinert, damit sie
    in die Zeile passt. `Anmerkungen` bekommt das ausführliche Schema mit Datumsangaben
    (z.B. `10.-11.08.: 1-0-0-0 | 12.-13.08.: 1-0-1-0 | 14.-24.08.: 2-0-1-0`).
    Passt die Kurzform selbst mit Schriftverkleinerung nicht mehr lesbar in die Zeile,
    wird `Gebrauchsanweisung` auf `"s. Anmerkungen"` reduziert.
  - `Gesamtwirkstoffmenge` = Σ über alle Blöcke (`totalDose_i × concentrationValue`),
    nicht nur ein einzelner Block (behebt Review-Fund zur fehlenden Aggregation).
  - `Reichdauer der Verschreibung` = Tage von Start des ersten bis Ende des letzten
    Blocks.
- **Flatten:** nach dem Befüllen werden die Datenfelder per `form.flatten()`
  eingefroren (nicht mehr nachträglich in einem PDF-Viewer editierbar), bevor
  Arzt/Behörde physisch unterschreiben/stempeln.
- **Verifiziert:** ein Beispiel-Fill wurde end-to-end mit pdf-lib gegen das echte
  Formular getestet (Titrations-Fall über 3 Blöcke, korrekte Summenbildung,
  gemergte Felder funktionsfähig, alle Behörden-/Signaturfelder bleiben leer).

## Migrationsstrategie (zusammengefasst)

1. Beim ersten App-Start nach dem Update: `localStorage['btm-app-data']` erkennen.
2. Patienten/Ärzte/Medikamente in neues Schema überführen (neue UUIDs vergeben,
   `Medication.concentration`-String in `concentrationValue`/`concentrationUnit`
   aufsplitten, `isCustom: true` für alle bisherigen Freitext-Medikamente).
3. Daten in die neue Session laden, Nutzer zum Export auffordern.
4. Alten `localStorage`-Key löschen.

## Offene Punkte für die Implementierungsplanung

- Genaue Test-Strategie (Unit-Tests für `DosageScheme`-Aggregation, Migration,
  PDF-Feld-Mapping) — es existiert aktuell keine Test-Infrastruktur, wird als Teil
  der Umsetzung mit aufgebaut.
- Konkrete Liste weiterer Medikamente/Wirkstärken für `data/medications.json`
  über die bereits vorhandenen Seed-Daten hinaus.
