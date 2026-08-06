# BtM-Reisebescheinigung PWA

Progressive Web App zur Erzeugung von Reise-Bescheinigungen für Betäubungsmittel
nach Art. 75 des Schengener Durchführungsübereinkommens. Die Ausgabe erfolgt durch
direktes Befüllen des amtlichen BfArM-017-Formulars (kein optischer Nachbau).

## Architektur

Vanilla-JS-MVC, gebündelt mit Webpack (ES-Module). Ausführliche Architekturdoku:
`docs/arc42/architecture.md`.

- **Models:** Patient, Doctor, Medication, MedicationInstance (Snapshot), DosageScheme, DataStore
- **Repositories:** MedicationRepository (liest `data/medications.json`, FHIR-Medication-Format)
- **Services:** PdfFormFiller (pdf-lib), DosageAggregator, Migration
- **Utils:** Sanitize (XSS-Escaping), Obfuscate, Validator, DateHelper
- **Views/Controllers:** pro Domäne (Patient/Doctor/Medication/Travel/Certificate/Data)

## Entwicklung

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # webpack-dev-server auf http://localhost:8080
npm run build        # Produktions-Bundle nach dist/
npm test             # Vitest (Unit-Tests)
npm run test:watch   # Vitest im Watch-Modus
```

## Datenhaltung & Datenschutz

- **Kein dauerhaftes localStorage.** Während der Sitzung Autosave in `sessionStorage`
  (leicht obfuskiert, kein Krypto) — der Browser leert es beim Schließen des Tabs.
- **Export/Import:** über „Daten exportieren“ wird eine obfuskierte `.btmdat`-Datei
  heruntergeladen (Nutzerhoheit über den Ablageort). Import lädt sie wieder ein.
- **Migration:** Alt-Daten aus `localStorage['btm-app-data']` werden beim ersten
  Start einmalig übernommen (UUIDs, getrennte Konzentrationsfelder), danach zum
  Export aufgefordert und der Alt-Key gelöscht.
- Keine PII-Logs, XSS-Escaping aller Modelldaten, stabile UUID-IDs.

## Amtliches PDF-Formular

Die Datei `assets/reise-scheng-formular.pdf` ist das echte BfArM-017-Formular.
Sie wurde einmalig vorverarbeitet (`scripts/preprocess-form.mjs`): zwei zusammengesetzte
Feldpaare wurden zu `Staatsangehoerigkeit` bzw. `Wohnanschrift` gemergt und die Widgets
für `form.flatten()` repariert (32 Felder). Der `PdfFormFiller` befüllt die Felder und
flattet das Formular; Signatur-/Behördenfelder bleiben leer (per Hand/vor Ort).

Eindosierungs-/Titrationsschemata (mehrere Dosierblöcke) werden aggregiert:
Gebrauchsanweisung als kompakte Kette, Anmerkungen mit Datumsschema,
Gesamtwirkstoffmenge als Summe über alle Blöcke.

## Dateistruktur (Auszug)

```
btm-bescheinigung-app/
├── webpack.config.js
├── vitest.config.js
├── src/index.template.html      # HTML-Template für html-webpack-plugin
├── data/medications.json        # FHIR-Medication-Flatfile
├── assets/reise-scheng-formular.pdf
├── scripts/preprocess-form.mjs  # Einmalige Formular-Vorverarbeitung
├── docs/arc42/architecture.md
└── js/
    ├── app.js                   # Entry-Point
    ├── config.js
    ├── models/                  # Patient, Doctor, Medication, MedicationInstance, DataStore
    ├── repositories/            # MedicationRepository
    ├── services/                # PdfFormFiller, DosageAggregator, Migration
    ├── views/ · controllers/
    └── utils/                   # Sanitize, Obfuscate, Validator, DateHelper
```
