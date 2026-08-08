# Design: BtM-Stammdaten-Erweiterung — Opioide + zentrale Wirkstoff-Tabelle (TP1-DB)

Datum: 2026-08-08

## Motivation

Die Stammdaten-DB enthält bisher nur ADHS-Präparate. Ziel ist es, schrittweise weitere
Betäubungsmittel aufzunehmen — beginnend mit der reiserelevantesten Gruppe: den
**Opioiden (Schmerz)**. Zugleich sollen je Wirkstoff die einschlägigen Indikationen mit
ICD-10-GM zentral hinterlegt werden (Grundlage für das spätere Grund/ICD-Feature), und
der BtM-Status muss die realen Sonderfälle (z.B. Tilidin-retard = ausgenommen) abbilden.

Diese Erweiterung ist die Voraussetzung für das pausierte Grund/ICD-UI-Teilprojekt:
Statt `reasonSuggestions` je Stärke-Resource zu wiederholen, kommen die Indikationen aus
einer zentralen Wirkstoff-Tabelle, die über einen stabilen `substanceId` verschlüsselt ist.

**Warum kein ATC als Join-Schlüssel:** Ein Wirkstoff kann mehrere ATC-Codes tragen
(z.B. Guanfacin: N06BA21 im ADHS-Kontext, C02AC02 als Antihypertensivum). Ein
kontextabhängiger Code ist als alleiniger Join-Schlüssel fragil. Daher dient ein
expliziter, kontextunabhängiger `substanceId` (kebab-case) als Schlüssel; ATC-Codes
werden nur noch als Attribut geführt (als Liste, da mehrere möglich sind).

## Scope

**In Scope:**
- Neue zentrale Wirkstoff-Tabelle `data/substances.json` (Schlüssel `substanceId`), mit Indikationen/ICD.
- 5 vorhandene ADHS-Wirkstoffe + 7 neue Opioid-Wirkstoffe in `substances.json`.
- Neue Opioid-Präparate (Stärke-Resources) in `data/medications.json`.
- Feld `substanceId` je Resource nachtragen (alle bestehenden + neuen Resources).
- Neues `SubstanceRepository`; `MedicationRepository` reichert Resources per
  `substanceId`-Join mit `reasonSuggestions` (aus den Indikationen) an.
- Dreiwertiger `btmStatus` je Resource (+ optionaler `btmHinweis`); `btmCategory` bleibt
  rückwärtskompatibel erhalten und wird aus `btmStatus` abgeleitet.
- Neue Konzentrationseinheiten `µg` und `µg/h`; `DosageForm.formUnit` toleriert amtliche
  Sonder-Darreichungsformen (Zähl-Einheit „Stück" als Fallback).
- Tests.

**Out of Scope:**
- Grund/ICD-**UI** (eigenes Folge-Teilprojekt; nutzt die hier erzeugten `reasonSuggestions`).
- Cannabinoide (seit 01.04.2024 keine BtM mehr nach BtMG → MedCanG, kein Art.-75-Formular;
  bewusst zurückgestellt).
- Substitutionspräparate (Methadon/Buprenorphin-Substitution), Benzodiazepine, weitere Gruppen.
- Externe PZN-/Arzneimittel-API (Architektur bleibt darauf vorbereitet).

## A. Zentrale Wirkstoff-Tabelle `data/substances.json`

Objekt mit `substanceId` (kebab-case Wirkstoffname) als Schlüssel. Pro Wirkstoff:
Name, ATC-Codes (Liste — mehrere möglich), ATC-Gruppen-Label (flach, für spätere
UI-Gruppierung), Indikationen (2–4, laienverständliches Label + ICD-10-GM).

```json
{
  "morphin": {
    "name": "Morphin",
    "atc": ["N02AA01"],
    "atcGroup": "N02AA Natürliche Opium-Alkaloide",
    "indications": [
      { "label": "Starke chronische Schmerzen", "icd10": "R52.2" },
      { "label": "Tumor-/Palliativschmerz", "icd10": "C80.9" },
      { "label": "Akute starke Schmerzen", "icd10": "R52.0" }
    ]
  }
}
```

**substanceId-Format:** kebab-case des Wirkstoffnamens, Umlaute aufgelöst, Kombinationen
mit Bindestrich (`morphin`, `oxycodon`, `oxycodon-naloxon`, `tilidin-naloxon`, `fentanyl`,
`guanfacin`). Kombipräparate erhalten eine eigene substanceId (eigene Indikationen).

**ATC-Quelle für Kuratierung (künftige Erweiterungen):** offizielle WIdO-ATC-Klassifikation,
https://www.wido.de/publikationen-produkte/analytik/arzneimittel-klassifikation/
(aktuelle Version ATC 2026). Die verwendeten Codes sind gegen diese Systematik geprüft.

### A1. ADHS-Wirkstoffe

Indikationen einheitlich (alle ADHS-Präparate):
- ADHS (mit Hyperaktivität) — F90.0
- ADHS mit Störung des Sozialverhaltens — F90.1
- ADS (Aufmerksamkeitsstörung ohne Hyperaktivität) — F98.8
- ADHS, nicht näher bezeichnet — F90.9

Einträge (substanceId → atc, atcGroup „N06BA Zentral wirkende Sympathomimetika"):
`methylphenidat` → N06BA04 · `lisdexamfetamin` → N06BA12 · `dexamfetamin` → N06BA02 ·
`atomoxetin` → N06BA09 · `guanfacin` → **N06BA21** (ADHS-Kontext; nicht C02AC02).

**Korrektur bestehender Daten:** In `medications.json` steht Guanfacin aktuell mit
`C02AC02`. Der `code.coding`-ATC der Guanfacin-Resources wird auf **N06BA21** korrigiert
(fachlich richtig für Intuniv); da der Join nun über `substanceId` läuft, ist der ATC
ohnehin nur noch Attribut.

### A2. Opioid-Wirkstoffe (neu)

| substanceId | ATC | Wirkstoff | atcGroup | Indikationen (Label — ICD-10-GM) |
|---|---|---|---|---|
| morphin | N02AA01 | Morphin | N02AA Natürliche Opium-Alkaloide | Starke chronische Schmerzen — R52.2 · Tumor-/Palliativschmerz — C80.9 · Akute starke Schmerzen — R52.0 |
| hydromorphon | N02AA03 | Hydromorphon | N02AA Natürliche Opium-Alkaloide | Starke chronische Schmerzen — R52.2 · Tumor-/Palliativschmerz — C80.9 |
| oxycodon | N02AA05 | Oxycodon | N02AA Natürliche Opium-Alkaloide | Starke chronische Schmerzen — R52.2 · Tumor-/Palliativschmerz — C80.9 |
| oxycodon-naloxon | N02AA55 | Oxycodon + Naloxon | N02AA Natürliche Opium-Alkaloide | Starke chronische Schmerzen — R52.2 · Tumor-/Palliativschmerz — C80.9 |
| fentanyl | N02AB03 | Fentanyl | N02AB Phenylpiperidin-Derivate | Chronische starke Schmerzen — R52.2 · Tumorschmerz — C80.9 · Durchbruchschmerz bei Tumor — R52.1 |
| tapentadol | N02AX06 | Tapentadol | N02AX Andere Opioide | Starke chronische Schmerzen — R52.2 · Starke akute Schmerzen — R52.0 |
| tilidin-naloxon | N02AX51 | Tilidin + Naloxon | N02AX Andere Opioide | Starke chronische Schmerzen — R52.2 · Starke akute Schmerzen — R52.0 |
| buprenorphin | N02AE01 | Buprenorphin | N02AE Oripavin-Derivate | Mäßig starke bis starke chronische Schmerzen — R52.2 · Tumorschmerz — C80.9 |

Hinweis zu ICD: Tumorschmerz erfordert klinisch Grundleiden (C00–C97) plus Schmerzcode;
für die Auswahlliste wird das laienverständliche Label mit einem repräsentativen Code
(C80.9 „Bösartige Neubildung, nicht näher bezeichnet") geführt. Freitext bleibt möglich.

## B. Präparate in `data/medications.json` (neu)

Pro Präparat und Stärke eine FHIR-`Medication`-Resource (bestehendes Muster). Pflichtfelder:
`substanceId` = **Join-Schlüssel** in `substances.json`, `code.coding[].code` = ATC (Attribut,
informativ), `ingredient[].itemCodeableConcept.text` = Wirkstoff,
`form.text` = **amtlich zugelassene Darreichungsform** (1:1 aufs Formular),
`ingredient[].strength.numerator` = { value, unit }, `btmStatus`, ggf. `btmHinweis`.

Die `substanceId` je Präparat entspricht der Tabelle in A2 (z.B. Morphin-Präparate →
`morphin`, Targin → `oxycodon-naloxon`, Valoron N retard → `tilidin-naloxon`).

Aufzunehmende Präparate (amtliche Darreichungsform / Stärken / Einheit):

- **Morphin (N02AA01, btm):** MST Continus / M-long „Retardtablette" 10/30/60/100/200 mg;
  Sevredol „Tablette" 10/20 mg.
- **Hydromorphon (N02AA03, btm):** Palladon „Retardkapsel" 4/8/16/24 mg;
  Jurnista „Retardtablette" 4/8/16/32/64 mg.
- **Oxycodon (N02AA05, btm):** Oxygesic „Retardtablette" 5/10/20/40/80 mg.
- **Oxycodon + Naloxon (N02AA55, btm):** Targin „Retardtablette" 5/2,5 · 10/5 · 20/10 · 40/20 mg
  (Stärke als Oxycodon-Wert modelliert; Kombipartner im Handelsnamen/Hinweis).
- **Fentanyl (N02AB03, btm):** Durogesic „transdermales Pflaster" 12/25/50/75/100 µg/h;
  Effentora „Buccaltablette" 100/200/400/600/800 µg.
- **Tapentadol (N02AX06, btm):** Palexia retard „Retardtablette" 25/50/100/150/200/250 mg.
- **Tilidin + Naloxon (N02AX51):** Valoron N retard „Retardtablette" 50/4 · 100/8 · 150/12 · 200/16 mg
  → `btmStatus: "ausgenommen"`, `btmHinweis: "retardierte Form BtM-ausgenommen; nicht-retardierte Formen sind BtM-pflichtig"`.
- **Buprenorphin (N02AE01, btm):** Norspan „transdermales Pflaster" 5/10/15/20/30/40 µg/h;
  Temgesic „Sublingualtablette" 0,2/0,4 mg.

`productFamily` (Handelsname) wie bisher für die UI-Gruppierung. `id` = `<kebab-name>-<value><unit>`
(Einheit im id-Slug ohne Sonderzeichen, z.B. `durogesic-25ugh`, `effentora-200ug`).

## C. Darreichungsform & Zähl-Einheit

- `form.text` trägt die amtliche Bezeichnung (z.B. „transdermales Pflaster", „Buccaltablette",
  „Sublingualtablette", „Retardtablette", „Retardkapsel"). Dieser Wert geht unverändert ins
  Formularfeld „Darreichungsform".
- `DosageForm.formUnit` (aus TP0) leitet die **Zähl-Einheit** für „entspricht N …" ab:
  - enthält „kapsel" → Kapsel/Kapseln
  - enthält „tablette" → Tablette/Tabletten (deckt Retard-/Sublingual-/Buccaltablette ab)
  - enthält „tropfen"/„lösung"/„saft" → ml/ml
  - **enthält „pflaster" → Stück/Stück**
  - Fallback (unbekannt) → **Stück/Stück** (statt bisher „Einheit/Einheiten")

  Damit werden Sonderformen (Pflaster, Buccaltablette) als „N Stück" bzw. — bei Tablette im
  Namen — als „N Tabletten" gezählt. Die Umstellung des Fallbacks auf „Stück" ist die einzige
  Änderung an `DosageForm`.

## D. SubstanceRepository & Join

**Neu: `js/repositories/SubstanceRepository.js`**

```text
new SubstanceRepository(substancesData)
findById(substanceId)      -> { name, atc, atcGroup, indications } | null
indicationsFor(substanceId) -> indications[]  (leer, wenn kein Treffer)
```

**`MedicationRepository`** wird um den Join erweitert: `findAll()`/`findById()`/`search()`
reichern jede Resource um `reasonSuggestions` an = `indicationsFor(resource.substanceId)`.
Das Feld heißt bewusst `reasonSuggestions` (Array `{label, icd10}`), damit das spätere
Grund/ICD-UI ohne Änderung darauf zugreift. Resources ohne Substanz-Treffer (oder ohne
`substanceId`) erhalten `reasonSuggestions: []`.

Der `MedicationRepository`-Konstruktor nimmt optional ein `SubstanceRepository` entgegen;
ohne Substanz-Repo bleibt `reasonSuggestions` leer (Rückwärtskompatibilität der bestehenden Tests).

## E. btmStatus (dreiwertig)

Neues Feld je Resource: `btmStatus: "btm" | "ausgenommen" | "kein_btm"`, optional `btmHinweis`.
`btmCategory` (alt) bleibt erhalten und wird abgeleitet: `btm` → „BTM", sonst „Nicht-BTM".
Bestehende ADHS-Resources: `btmStatus` aus vorhandenem `btmCategory` setzen
(BTM → `btm`, Nicht-BTM → `kein_btm`).

## F. Migration bestehender Resources

Alle 59 bestehenden ADHS-Resources in `medications.json` werden angereichert:
- `substanceId` nachtragen (`methylphenidat`/`lisdexamfetamin`/`dexamfetamin`/`atomoxetin`/`guanfacin`).
- Guanfacin-Resources: `code.coding[].code` auf `N06BA21` korrigieren.
- `btmStatus` aus `btmCategory` ableiten.

Umsetzung über ein einmaliges Node-Skript (idempotent), das `medications.json` transformiert;
kein manuelles Editieren der 59 Einträge. Das Skript wird als Teil des Plans mitgeliefert und
getestet (Vorher/Nachher-Integritätsprüfung).

## Testfälle

- **SubstanceRepository:** `findById('morphin').name === 'Morphin'`; `findById('morphin').atc`
  enthält `'N02AA01'`; `indicationsFor('unbekannt') === []`; Indikationen enthalten `{label, icd10}`.
- **MedicationRepository-Join:** eine Morphin-Resource (substanceId `morphin`) bekommt
  `reasonSuggestions` mit „Starke chronische Schmerzen"/R52.2; eine ADHS-Resource
  (substanceId `methylphenidat`) bekommt die F90-Liste; Resource ohne `substanceId` bzw. ohne
  Substanz-Treffer → `reasonSuggestions: []`. Ohne SubstanceRepo → alle `[]`.
- **DosageForm (erweitert):** „transdermales Pflaster" → Stück/Stück; „Buccaltablette" →
  Tablette/Tabletten; unbekannte Form → Stück/Stück.
- **Datenintegrität (substances/medications):** jede Opioid-Resource hat eine `substanceId`,
  die in `substances.json` existiert; jede Stärke hat value>0 und eine Einheit aus {mg, µg, µg/h};
  Tilidin-retard hat `btmStatus: "ausgenommen"` mit `btmHinweis`.
- **btmCategory-Ableitung:** `btmStatus: "ausgenommen"` → `btmCategory: "Nicht-BTM"`.

## arc42

Ergänzungen: Bausteinsicht (Repositories: SubstanceRepository; Daten: substances.json),
ADR „Indikationen zentral in Wirkstoff-Tabelle, Join über stabile substanceId (nicht ATC,
da ein Wirkstoff mehrere ATC-Codes haben kann)", Hinweis zum BtM-Rechtsstand
(Cannabinoide seit 04/2024 kein BtM; Tilidin-retard ausgenommen), Verweis auf WIdO-ATC-Quelle.
