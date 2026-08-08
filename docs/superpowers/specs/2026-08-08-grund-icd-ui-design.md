# Design: Grund & ICD im Medikationsplan (UI)

Datum: 2026-08-08

## Motivation

Die BtM-Stammdaten-Erweiterung liefert je Wirkstoff kuratierte Indikationen
(`reasonSuggestions` = [{label, icd10, icd11}]) an jede Medikamenten-Resource. Dieses
Teilprojekt bringt sie in die UI: Der Nutzer kann pro Dosierblock einen Grund
(Indikation) wählen und optional eine Freitext-Begründung (z.B. für eine
Dosisänderung) hinterlegen. Der Grund erscheint mit ICD-10-GM im Medikationsplan;
die Freitext-Begründung darf zusätzlich ins Anmerkungen-Feld des amtlichen BtM-Formulars.

## Scope

**In Scope:**
- Snapshot der `reasonSuggestions` in `MedicationInstance`.
- `DosageScheme`: totes `notes`-Feld → `reasonNote`; neue Felder `reasonLabel`, `reasonIcd10`.
- Vorausfüllen des Grundes beim Anlegen eines Dosierblocks (vom Vorblock, sonst erster Vorschlag).
- Grund-UI je Dosierblock in der TravelView (Dropdown + optionaler Eigen-Grund + Freitext).
- Medikationsplan: `Grund`-Spalte befüllen (Label + ICD-10-GM); `reasonNote` an `Hinweise` anhängen.
- BtM-Formular: `reasonNote` (nur Freitext) in `Anmerkungen`; nie ICD/Diagnose.
- Tests.

**Out of Scope:**
- ICD-11 in der Ausgabe (bleibt in den Stammdaten gespeichert, wird nicht gedruckt).
- Eigener ICD-Code bei „Anderer Grund…" (nur Label, kein ICD).
- Validierungspflicht (Grund ist empfohlen, nicht Pflicht).

## A. Datenmodell

**`MedicationInstance`** (`js/models/MedicationInstance.js`):
- Neues Feld `reasonSuggestions` (Array `{label, icd10, icd11}`, Default `[]`).
- `fromRepository(resource)`: übernimmt `resource.reasonSuggestions || []`.
- `custom(...)`: `reasonSuggestions: []`.
- `toJSON()` serialisiert `reasonSuggestions`.

**`DosageScheme`** (`js/models/Medication.js`):
- `notes` (tot, nur Konstruktor/toJSON, nirgends gelesen) wird zu `reasonNote` umbenannt.
- Neue Felder: `reasonLabel` (String, Default ''), `reasonIcd10` (String, Default '').
- Konstruktor akzeptiert `reasonLabel`/`reasonIcd10`/`reasonNote`; Rückwärtskompatibilität:
  falls Altdaten `notes` tragen, wird es als `reasonNote` übernommen (`data.reasonNote ?? data.notes ?? ''`).
- `toJSON()` gibt `reasonLabel`, `reasonIcd10`, `reasonNote` aus (kein `notes` mehr).
- `icd11` wird im DosageScheme NICHT gespeichert.

## B. Vorausfüllen (TravelController.addDosageScheme)

Beim Anlegen eines neuen Blocks für ein Medikament:
- Existiert ein Vorblock desselben Medikaments: `reasonLabel`/`reasonIcd10` daraus übernehmen,
  `reasonNote` leer.
- Erster Block: `reasonLabel`/`reasonIcd10` aus dem ERSTEN Eintrag der `reasonSuggestions`
  der zugehörigen `MedicationInstance` (falls vorhanden), sonst leer.

Die zugehörige Instanz wird über die `medicationId` in `selectedMedications` gefunden.

## C. UI in der TravelView (je Dosierblock)

Neuer Grund-Bereich unterhalb der Dosis-Eingaben, oberhalb „Schema entfernen":

1. **Grund-Dropdown** (`<select class="reason-select">`):
   - Optionen: je `reasonSuggestions`-Eintrag `<option>` mit `label` als Text und dem
     Suggestion-Index als Wert; plus zwei feste Optionen `"— kein Grund —"` (Wert `none`)
     und `"Anderer Grund…"` (Wert `custom`).
   - Vorbelegt: das Suggestion, dessen `label === reasonLabel` (sonst `custom` wenn
     `reasonLabel` gesetzt aber kein Match, sonst `none`).
   - `onchange`: bei Suggestion-Index → `reasonLabel`+`reasonIcd10` aus dem Suggestion;
     bei `none` → beide leeren; bei `custom` → `reasonIcd10` leeren, Freitextfeld einblenden.
2. **Eigen-Grund-Feld** (`<input class="reason-custom">`): nur sichtbar bei `custom`.
   Eingabe → `reasonLabel` (ICD bleibt leer).
3. **Anmerkung-Feld** (`<input class="reason-note">`, immer sichtbar): → `reasonNote`.

Verdrahtung analog zu den Dosis-Feldern: `data-med-id`/`data-scheme-index` per `setDataset`;
Änderungen rufen `TravelController.updateScheme(medId, schemeIndex)`, das die neuen Felder
mit ausliest. Alle angezeigten Werte via `escapeHtml`. IDs bleiben Strings.

`updateScheme` liest zusätzlich: `reasonLabel`, `reasonIcd10`, `reasonNote` (bei Dropdown
`none`/`custom` entsprechend gesetzt) und übergibt sie an `model.updateDosageScheme`.

## D. Medikationsplan (MedicationPlanBuilder)

Die vorhandene, bisher leere `grund`-Spalte je Zeile wird befüllt:
- `grund` = `reasonIcd10 ? "${reasonLabel} (${reasonIcd10})" : reasonLabel` (leer, wenn kein Grund).
- `hinweise`: bisher der Zeitraum bei Titration. `reasonNote` wird angehängt:
  vorhandener Hinweis + (falls reasonNote) `" · " + reasonNote`; ohne Zeitraum nur `reasonNote`.
- Nur ICD-10-GM (kein icd11).

## E. BtM-Formular (PdfFormFiller)

`buildInstruction(blocks)` wird erweitert: die `reasonNote`-Texte aller Blöcke (nicht leer,
dedupliziert, in Reihenfolge) werden gesammelt. Ergebnis:
- Bisherige Anmerkung (Titrationsschema oder ''/'keine') + die gesammelten reasonNotes,
  getrennt durch `" | "`.
- Sind Titrationsschema UND reasonNotes leer → `"keine"` (unverändert).
- ICD/Diagnose/reasonLabel kommen NIE ins Formular — ausschließlich `reasonNote`.

## Datenfluss (Ende-zu-Ende)

reasonSuggestions (Stammdaten/Resource) → Snapshot in MedicationInstance → Dropdown TravelView
→ reasonLabel/reasonIcd10/reasonNote im DosageScheme → Medikationsplan (Grund-Spalte, ICD-10;
reasonNote in Hinweise) + BtM-Anmerkungen (nur reasonNote).

## Testfälle

- **MedicationInstance:** `fromRepository` mit `reasonSuggestions` → übernommen; ohne → `[]`;
  `custom` → `[]`; `toJSON` enthält `reasonSuggestions`.
- **DosageScheme:** `notes`-Altwert wird als `reasonNote` gelesen; `reasonLabel`/`reasonIcd10`/
  `reasonNote` in Konstruktor + toJSON; kein `notes` mehr in toJSON.
- **addDosageScheme:** erster Block bekommt reasonLabel/Icd10 aus erstem Suggestion der Instanz;
  Folgeblock übernimmt reasonLabel/Icd10 vom Vorblock, reasonNote leer; ohne Suggestions → leer.
- **MedicationPlanBuilder:** grund = „Label (F90.0)"; ohne ICD nur Label; ohne Grund leer;
  reasonNote wird an Hinweise (mit Zeitraum → „ · " getrennt) angehängt.
- **PdfFormFiller:** reasonNote landet in Anmerkungen; reasonLabel/reasonIcd10 NICHT im Formular;
  ohne Titration und ohne reasonNote → „keine"; mit beidem → per „ | " verbunden.

## arc42

Ergänzung: Datenfluss Grund/ICD (Stammdaten → Instanz-Snapshot → DosageScheme → Plan/Formular);
Hinweis „ICD/Diagnose nur im Medikationsplan (ICD-10-GM), nie auf dem amtlichen BtM-Formular;
dort nur Freitext-Begründung".
