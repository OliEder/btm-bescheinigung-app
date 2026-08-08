# Design: BtM-Formular-Feinschliff (TP0)

Datum: 2026-08-07

## Motivation

Eine amtliche Ausfüllhilfe zum BfArM-017-Formular zeigt, dass zwei Felder im
`PdfFormFiller` aktuell nicht formatgerecht befüllt werden und ein leeres Feld
explizit gekennzeichnet werden soll:

1. **Wirkstoff-Konzentration** soll die Bezugsmenge nennen, z.B. `20 mg/Kapsel`
   (aktuell nur `20mg`).
2. **Gesamtwirkstoffmenge** soll die Stückzahl der Darreichungsform nennen, z.B.
   `400 mg, entspricht 20 Kapseln` (aktuell nur `400 mg`).
3. **Anmerkungen** sollen bei fehlendem Inhalt den Wert `keine` tragen (statt leer).

Zusätzlich wird bereits hier eine **einheitliche Zahlenformatierung** eingezogen
(deutsches Dezimalkomma, bis zu 2 Nachkommastellen), damit spätere Bruchteil-Dosierungen
(½, ¼ pro Zeitpunkt aus TP2) korrekt dargestellt werden, ohne diese Felder erneut
anfassen zu müssen. Bruchteile können krumme Mengen erzeugen (z.B.
`210 mg, entspricht 10,5 Tabletten`).

## Scope

**In Scope:** die drei Formatkorrekturen im `PdfFormFiller`, eine zentrale
Hilfsfunktion zur Ableitung der Bezugseinheit aus der Darreichungsform, eine neue
`DosageAggregator`-Methode für die Stückzahl, eine zentrale Zahlenformatierung
(`formatNumber`), Anwendung der Formatierung auch im `MedicationPlanBuilder` und in
der Dosier-Notation, Tests.

**Out of Scope:** Grund/ICD (TP1), die eigentliche Bruchteil-*Eingabe* im UI und die
0,25er-Validierung (TP2), Design (TP3/TP4). Keine Änderung am Datenmodell, keine
Änderung an der Asset-PDF.

## A. Bezugseinheit aus Darreichungsform

Neue reine Funktion `js/utils/DosageForm.js` (zentralisiert die bereits im
`MedicationPlanBuilder` vorhandene, dort verbleibende Ad-hoc-Logik):

```
formUnit(darreichungsform) -> { singular, plural }
```

Ableitung (case-insensitiv, Teilstring-Match):
- enthält "kapsel"      -> { singular: 'Kapsel',  plural: 'Kapseln' }
- enthält "tablette"    -> { singular: 'Tablette', plural: 'Tabletten' }
- enthält "tropfen"     -> { singular: 'ml',       plural: 'ml' }
- enthält "saft"/"lösung"/"loesung" -> { singular: 'ml', plural: 'ml' }
- sonst (Fallback)      -> { singular: 'Einheit',  plural: 'Einheiten' }

Der bestehende `unitForForm()` im `MedicationPlanBuilder` wird auf `formUnit().singular`
bzw. den passenden Wert umgestellt (eine Quelle der Wahrheit).

## A2. Zahlenformatierung

Neue reine Funktion `js/utils/NumberFormat.js`:

```
formatNumber(value) -> String
```

Regeln (deutsche Konvention):
- Dezimaltrennzeichen ist das Komma.
- Bis zu 2 Nachkommastellen; überflüssige Nullen werden entfernt.
- Ganze Zahlen ohne Nachkommastellen.

Beispiele: `20 -> "20"`, `10.5 -> "10,5"`, `0.25 -> "0,25"`, `10.75 -> "10,75"`,
`10.005 -> "10,01"` (kaufmännisch gerundet auf 2 Stellen), `0 -> "0"`.

Angewendet auf: Gesamtwirkstoffmenge (mg-Summe **und** Stückzahl), den
Konzentrations-Wert, die Dosier-Notation und die Mengenspalten des Medikationsplans.

Die Dosier-Notation wird dezimal geschrieben, z.B. `0,5-0-0,5-0` (nicht `½-0-½`).

## B. Stückzahl-Aggregation

Neue Methode in `DosageAggregator`:

```
totalUnits(blocks) -> Σ über alle Blöcke (Tage_i × Tagesdosis_i)
```

Bereits vorhanden bleibt `totalSubstance(blocks, concentrationValue)`
(= `totalUnits(blocks) × concentrationValue`, gerundet). `totalUnits` wird intern
von `totalSubstance` mitgenutzt (DRY).

## C. PdfFormFiller — Feldkorrekturen

Betroffen: `js/services/PdfFormFiller.js`.

1. **WirkstoffKonzentration:**
   `${formatNumber(concentrationValue)} ${concentrationUnit}/${formUnit(form).singular}`
   Beispiel: `36 mg/Retardtablette`, `20 mg/Kapsel`.
   (Die Darreichungsform steht als `medication.darreichungsform` bereit.)

2. **Gesamtwirkstoffmenge:**
   `${formatNumber(summeMg)} ${concentrationUnit}, entspricht ${formatNumber(stück)} ${einheit}`
   - `summeMg` = `DosageAggregator.totalSubstance(blocks, concentrationValue)`
   - `stück`   = `DosageAggregator.totalUnits(blocks)`
   - `einheit` = Singular bei `stück === 1`, sonst Plural (`formUnit(form)`)
   Beispiel: `400 mg, entspricht 20 Kapseln`; `20 mg, entspricht 1 Kapsel`;
   `210 mg, entspricht 10,5 Tabletten`.

3. **Anmerkungen:** die bestehende Titrations-Logik liefert `anmerkungen`.
   Ist der Wert leer (kein mehrblockiges Schema), wird stattdessen `keine`
   eingetragen.

Die Dosier-Notation (`DosageAggregator.instructionChain` / `detailedSchedule` bzw. die
Notation im `MedicationPlanBuilder`) nutzt `formatNumber` je Zeitpunkt, sodass
Bruchteile als `0,5-0-0,5-0` erscheinen. Der Medikationsplan formatiert seine
Mengenspalten ebenfalls über `formatNumber`.

## Testfälle

- `formatNumber`: `20 -> "20"`, `10.5 -> "10,5"`, `0.25 -> "0,25"`,
  `10.75 -> "10,75"`, `0 -> "0"`, `10.005 -> "10,01"`.
- `formUnit`: Kapsel/Retardkapsel -> Kapsel/Kapseln; Tablette/Retardtablette ->
  Tablette/Tabletten; Tropfen -> ml/ml; Unbekannt -> Einheit/Einheiten.
- `totalUnits`: Titrations-Beispiel (3 Blöcke) -> korrekte Stückzahl; Einzelblock;
  Bruchteil-Block (Tagesdosis 0,5) -> krumme Stückzahl.
- `PdfFormFiller` (flatten:false, Felder auslesen):
  - Konzentration = `36 mg/Retardtablette`.
  - Gesamtmenge enthält `entspricht` + korrekte Stückzahl + Plural.
  - Einzelstück -> Singular ("1 Kapsel").
  - Bruchteil-Fall -> Stückzahl mit Dezimalkomma ("10,5 Tabletten").
  - Anmerkungen leer -> `keine`; mehrblockig -> Datumsschema (unverändert).
- Notation mit Bruchteil -> `0,5-0-0,5-0` (dezimal, Komma).

## arc42

`docs/arc42/architecture.md` wird um die Bezugseinheit-Ableitung (Utils: DosageForm),
die zentrale Zahlenformatierung (Utils: NumberFormat) und die präzisierte
Formularbefüllung ergänzt.
