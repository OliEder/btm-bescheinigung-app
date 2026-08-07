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

## Scope

**In Scope:** rein die drei Formatkorrekturen im `PdfFormFiller`, eine zentrale
Hilfsfunktion zur Ableitung der Bezugseinheit aus der Darreichungsform, eine neue
`DosageAggregator`-Methode für die Stückzahl, Tests.

**Out of Scope:** Grund/ICD (TP1), Dosierungs-Erweiterungen (TP2), Design (TP3/TP4).
Keine Änderung am Datenmodell, keine Änderung an der Asset-PDF.

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
   `${concentrationValue} ${concentrationUnit}/${formUnit(form).singular}`
   Beispiel: `36 mg/Retardtablette`, `20 mg/Kapsel`.
   (Die Darreichungsform steht als `medication.darreichungsform` bereit.)

2. **Gesamtwirkstoffmenge:**
   `${summeMg} ${concentrationUnit}, entspricht ${stück} ${einheit}`
   - `summeMg` = `DosageAggregator.totalSubstance(blocks, concentrationValue)`
   - `stück`   = `DosageAggregator.totalUnits(blocks)`
   - `einheit` = Singular bei `stück === 1`, sonst Plural (`formUnit(form)`)
   Beispiel: `400 mg, entspricht 20 Kapseln`; `20 mg, entspricht 1 Kapsel`.

3. **Anmerkungen:** die bestehende Titrations-Logik liefert `anmerkungen`.
   Ist der Wert leer (kein mehrblockiges Schema), wird stattdessen `keine`
   eingetragen.

## Testfälle

- `formUnit`: Kapsel/Retardkapsel -> Kapsel/Kapseln; Tablette/Retardtablette ->
  Tablette/Tabletten; Tropfen -> ml/ml; Unbekannt -> Einheit/Einheiten.
- `totalUnits`: Titrations-Beispiel (3 Blöcke) -> korrekte Stückzahl; Einzelblock.
- `PdfFormFiller` (flatten:false, Felder auslesen):
  - Konzentration = `36 mg/Retardtablette`.
  - Gesamtmenge enthält `entspricht` + korrekte Stückzahl + Plural.
  - Einzelstück -> Singular ("1 Kapsel").
  - Anmerkungen leer -> `keine`; mehrblockig -> Datumsschema (unverändert).

## arc42

`docs/arc42/architecture.md` wird um die Bezugseinheit-Ableitung (Utils: DosageForm)
und die präzisierte Formularbefüllung ergänzt.
