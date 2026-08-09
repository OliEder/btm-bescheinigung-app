# Design: Dosierungs-Erweiterung — Bruchteile, nicht-tägliche Einnahme, Reisedauer-Abweichung (TP2)

Datum: 2026-08-08

## Motivation

Drei Lücken im Dosierungsmodell:
1. **Teilbare Tabletten:** ¼/½ pro Einnahmezeitpunkt sind nicht eingebbar (Felder nur ganzzahlig).
2. **Nicht-tägliche Einnahme:** Präparate, die nur an bestimmten Wochentagen genommen werden
   (z.B. „Mo, Di, So"), lassen sich nicht abbilden — und die Gesamtmenge würde fälschlich als
   Kalendertage × Tagesdosis gerechnet (zu hoch).
3. **Reisedauer-Abweichung:** Wenn die Einnahme nicht durchgängig über die Reisedauer erfolgt
   (Lücke, nicht-täglich), fehlt eine Erklärung für die kontrollierende Behörde.

## Scope

**In Scope:**
- Bruchteil-Dosen (0,25er-Schritte) mit weicher Rundung.
- Wochentags-Einschränkung je Dosierblock (`weekdays`), nur bei Abweichung von „täglich" gespeichert.
- Mengenberechnung zählt tatsächliche Einnahmetage (nur aktive Wochentage).
- Automatische Abweichungs-Hinweise (App + BtM-Anmerkungen).
- Tests, arc42.

**Out of Scope:**
- Intervall-Rhythmus („jeden n-ten Tag") — nur Wochentags-Muster.
- Uhrzeitgenaue Einnahme; Design (TP3) und WCAG (TP4).

## A. Datenmodell

**`DosageScheme`** (`js/models/Medication.js`):
- Neues optionales Feld `weekdays: string[]` — Kürzel aus `['Mo','Di','Mi','Do','Fr','Sa','So']`.
  Konstruktor: `this.weekdays = Array.isArray(data.weekdays) ? data.weekdays : []`.
- Getter `isDaily`: `true`, wenn `weekdays` leer ist ODER alle 7 Kürzel enthält.
- `toJSON()`: gibt `weekdays` NUR aus, wenn NICHT täglich (sonst weglassen — unverschmutzter Standard).
- `morning`/`noon`/`evening`/`night` bleiben Number, tragen jetzt auch 0,25er-Werte.

**Neuer Helfer `js/utils/DosageRound.js`:** `roundToQuarter(value)` → rundet auf nächstes
0,25-Vielfaches (0,3→0,25; 0,4→0,5; 1,1→1). Nicht-numerisch/negativ → 0.

**Neuer Helfer `js/utils/Weekdays.js`:**
- `WEEKDAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']` (Index = JS getDay(): So=0 → Index 6, Mo=1 → 0, …).
- `isActiveWeekday(date, weekdays)` → true, wenn `weekdays` leer ist ODER der Wochentag von `date`
  in `weekdays` enthalten ist (leer = täglich).
- `countIntakeDays(startDate, endDate, weekdays)` → Anzahl Tage im Zeitraum (inkl.), die auf einen
  aktiven Wochentag fallen. Bei leerem/vollständigem `weekdays` = alle Kalendertage
  (= `DateHelper.getDaysBetween`). Wird für die MENGENberechnung je Block genutzt.
- `intakeDaySet(blocks)` → Set eindeutiger Kalendertage (ISO `YYYY-MM-DD`), an denen IRGENDEIN Block
  eine Einnahme vorsieht (unter Berücksichtigung der `weekdays` des Blocks). Wird für die REICHDAUER
  genutzt (distinct Tage, keine Doppelzählung bei Überschneidung).

## B. Aggregation (DosageAggregator)

Begriffsklärung (amtliche Semantik des Schengen-BtM-Formulars, Art. 75):
- **Reisedauer** (Feld 11): Anzahl Tage im Ausland — Kalendertage der Reise aus `travelData`, max. 30.
  Unverändert, bereits vorhanden.
- **Reichdauer der Verschreibung**: Anzahl der TAGE, an denen das Medikament eingenommen wird —
  unabhängig von der Anzahl Einheiten pro Tag oder deren Verteilung über den Tag.
- **Gesamtwirkstoffmenge**: Summe des insgesamt eingenommenen Wirkstoffs
  (z.B. 30 Tabletten × 40 mg = 1200 mg, egal an wie vielen Tagen).

Umsetzung:
- Interne `blockDays(block)` nutzt `countIntakeDays(block.startDate, block.endDate, block.weekdays)`
  statt aller Kalendertage. Dadurch rechnen `totalUnits`/`totalSubstance` (Gesamtmenge) automatisch
  korrekt = Σ (Einnahmetage_i × Tagesdosis_i) [× concentrationValue].
- `reachDurationDays(blocks)` wird umgestellt auf `intakeDaySet(blocks).size` — die Anzahl
  EINDEUTIGER Kalendertage mit mindestens einer Einnahme (nicht mehr „erster Start bis letztes Ende").
  Bei lückenlosen, täglichen Blöcken = Gesamtzahl der Tage; bei nicht-täglicher Einnahme nur die
  tatsächlichen Einnahmetage; überschneidende Blöcke zählen einen Tag nur einmal.
- `notation(block)`: bei nicht-täglicher Einnahme Präfix mit Wochentagen, z.B. `Mo,Di,So: 1-0-0-0`;
  bei täglich unverändert `1-0-0-0`.

Beispiel: Concerta 36 mg, „Mo,Di,So", 14 Kalendertage, 1-0-0-0 → 6 Einnahmetage.
Gesamtmenge = 6 × 36 = 216 mg; Reichdauer = 6 Tage. (Reisedauer bleibt 14.)

## C. Abweichungs-Erkennung (DosageDeviation, neu)

`js/services/DosageDeviation.js` — reine Funktion, eine Quelle der Wahrheit für App-Hinweis und PDF:

`detectDeviations(blocks, travelData)` → String[] (Hinweis-Texte):
- **Nicht-täglich:** je Block mit eingeschränkten `weekdays` → z.B.
  „Einnahme nur an Mo, Di, So".
- **Lücke:** Blöcke decken die Reisedauer nicht durchgängig ab — erster Block-Start > travelData.start,
  letztes Block-Ende < travelData.end, oder Lücke zwischen aufeinanderfolgenden Blöcken (endDate+1 < nächstes startDate)
  → „An einzelnen Reisetagen ist keine Einnahme vorgesehen."
- Volle, tägliche Abdeckung → leeres Array.

## D. UI (TravelView, additiv/minimal)

Änderungen bewusst additiv (paralleles Redesign-Teilprojekt läuft — keine Umstrukturierung):

1. **Bruchteil-Eingabe:** die vier Dosis-Zahlenfelder erhalten `step="0.25"` (min=0, max=10 bleiben).
2. **Wochentags-Auswahl (unauffällig):** Toggle/Checkbox „Nicht täglich einnehmen" (Default aus).
   Erst wenn aktiv, erscheinen 7 Wochentag-Checkboxen (Mo–So). Aus/alle 7 → `weekdays` nicht gesetzt.
3. **App-Abweichungs-Hinweis:** unterhalb der Blöcke eines Medikaments ein dezenter Hinweis, wenn
   `detectDeviations(...)` etwas liefert.
Verdrahtung wie bestehende Felder: `data-med-id`/`data-scheme-index`, `escapeHtml`; Änderungen
rufen `TravelController.updateScheme`. IDs bleiben Strings.

**`TravelController.updateScheme` erweitert:** liest Dosis-Werte durch `roundToQuarter`; liest den
Toggle + gewählte Wochentage; setzt `weekdays` NUR, wenn Toggle an UND nicht alle 7 gewählt.

## E. PDF-Ausgabe

- **BtM-Formular (`PdfFormFiller.buildInstruction`):** die vorhandene Anmerkungen-Logik (sammelt
  bereits reasonNotes) wird um `detectDeviations(blocks, travelData)`-Hinweise ergänzt.
  Reihenfolge: Titrationsschema (bei mehreren Blöcken) | Abweichungs-Hinweise | reasonNotes —
  alle per `" | "` verbunden; leer → „keine". buildInstruction bekommt dazu Zugriff auf travelData
  (zusätzliches Argument; fillCertificate reicht es durch).
- **Medikationsplan (`MedicationPlanBuilder`):** die Notation je Zeile zeigt bei nicht-täglicher
  Einnahme den Wochentags-Präfix (aus B). Mengenspalten stimmen automatisch (Aggregation).

## Testfälle

- `roundToQuarter`: 0,3→0,25; 0,4→0,5; 1,1→1; 2→2; -1→0; 'x'→0.
- `Weekdays.countIntakeDays`: täglich (leer) über 14 Tage = 14; ['Mo','Di','So'] über 2 Kalenderwochen = 6;
  alle 7 = alle Tage; ein einzelner Wochentag korrekt gezählt.
- `Weekdays.intakeDaySet`: ein täglicher Block über 10 Tage → size 10; nicht-täglicher Block korrekt;
  zwei sich überschneidende Blöcke → gemeinsamer Tag nur einmal gezählt.
- `DosageScheme`: weekdays im Konstruktor; `isDaily` (leer/alle 7 → true, Teilmenge → false);
  toJSON lässt weekdays bei täglich weg, gibt es bei Teilmenge aus.
- `DosageAggregator`: nicht-täglicher Block → totalUnits/totalSubstance zählen Einnahmetage
  (z.B. „Mo,Di,So" 14 Tage 1-0-0-0 × 36 mg → 216 mg); notation mit Wochentags-Präfix bei Teilmenge,
  ohne bei täglich; `reachDurationDays` = Anzahl eindeutiger Einnahmetage (nicht Kalenderspanne):
  täglich lückenlos 14 Tage → 14; „Mo,Di,So" über 14 Tage → 6.
- `DosageDeviation.detectDeviations`: nicht-täglich → Hinweis; Start nach Reisebeginn → Lücken-Hinweis;
  Lücke zwischen Blöcken → Hinweis; volle tägliche Abdeckung → [].
- `PdfFormFiller`: Abweichungs-Hinweis landet in Anmerkungen; mit reasonNote kombiniert (per „ | ");
  ohne Abweichung/Note/Titration → „keine".
- `TravelController.updateScheme`: Dosis 0,3 → als 0,25 gespeichert; Toggle an + Teilmenge → weekdays gesetzt;
  Toggle aus → weekdays nicht gesetzt.

## arc42

Ergänzung: Dosierung — Einnahmetage-Zählung (Weekdays.countIntakeDays / intakeDaySet),
Bruchteil-Rundung (DosageRound), Abweichungs-Hinweise (DosageDeviation) in App + BtM-Anmerkungen.
Formular-Semantik (Art. 75 SDÜ): Reisedauer = Tage im Ausland (travelData); Reichdauer der
Verschreibung = Anzahl eindeutiger Einnahmetage (intakeDaySet); Gesamtwirkstoffmenge =
Σ (Einnahmetage × Tagesdosis) × Wirkstoffwert.
