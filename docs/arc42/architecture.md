# arc42 — BtM-Reisebescheinigung

## 1. Einführung und Ziele
PWA zur Erzeugung von Reise-Bescheinigungen für Betäubungsmittel nach Art. 75 SDÜ.
Ausgabe = amtliches BfArM-017-Formular (befüllt, geflattet). Keine Server-Komponente,
alle Daten bleiben lokal beim Nutzer.

## 2. Randbedingungen
- Rein clientseitig (Browser), offline-fähig (PWA).
- Keine dauerhafte Speicherung von PII im Browser (nur Session + Nutzer-Export).
- Amtliches Formular darf inhaltlich nicht verändert werden (nur Felder befüllen).

## 3. Kontextabgrenzung
Nutzer (Arzt/Praxispersonal) <-> App <-> (lokale Export-Datei, Drucker/Behörde).
Keine externen Online-Dienste (PZN-API bewusst zurückgestellt).

## 4. Lösungsstrategie
Vanilla-JS-MVC, Webpack-Bundle, ES-Module. pdf-lib zum Befüllen des AcroForm-PDF.
FHIR-angelehnte Flatfile-Medikamenten-DB hinter einem Repository-Interface.

## 5. Bausteinsicht
- Models: Patient, Doctor, Medication, MedicationInstance, DosageScheme, DataStore
- Repositories: MedicationRepository, SubstanceRepository
- Daten: medications.json, substances.json
- Services: PdfFormFiller, DosageAggregator, Migration, MedicationPlanBuilder (BMP nach § 31a Abs. 4 SGB V)
- Utils: Sanitize, Obfuscate, Validator, DateHelper, NumberFormat (deutsche
  Zahlenformatierung), DosageForm (Bezugseinheit aus Darreichungsform)
- Views / Controllers: pro Domäne

## 6. Laufzeitsicht
- Start: Auswahl "Neu anfangen" / "Datei importieren" (+ ggf. Migration).
- Erfassung Patient/Arzt/Medikament/Reise -> Autosave in sessionStorage (obfuskiert).
- "Bescheinigung erzeugen" -> PdfFormFiller befüllt + flattet das amtliche PDF.
- "Exportieren" -> obfuskierte JSON-Datei zum Download.
- Erststart nach Update: Alt-localStorage erkannt -> Migration.js (UUIDs, concentration
  splitten, isCustom) -> Session laden -> Export-Aufforderung -> Alt-Key gelöscht.

## 7. Verteilungssicht
Webpack-Bundle (js/app.js Entry) -> dist/ (bundle.<hash>.js + index.html + PDF-Asset).
Kein CDN mehr (jsPDF entfernt), damit kein SRI/CSP-Lücken-Risiko.
Auslieferbar über beliebigen Static-Host / lokal.

## 8. Querschnittliche Konzepte
- Security: XSS-Escaping (Sanitize), keine PII-Logs, UUIDs, obfuskierte Persistenz.
  - XSS: Alle Modelldaten laufen durch escapeHtml(); data-Attribute via setDataset()
    (element.dataset), nie per String-Interpolation. IDs sind UUID-Strings (kein parseInt/parseFloat).
- Persistenz: sessionStorage (flüchtig, obfuskiert via Obfuscate.js = Base64+Shift,
  kein Krypto) + Datei-Export im gleichen Format (Nutzerhoheit über Ablageort).
- Mengen/Dosen: einheitlich über formatNumber() (Dezimalkomma, bis 2 Nachkommastellen).
  Formular-Konzentration als „Wert Einheit/Bezugsmenge" (z.B. 36 mg/Tablette),
  Gesamtmenge als „X mg, entspricht Y <Form>" (Zähl-Einheit aus DosageForm.formUnit),
  leere Anmerkungen als „keine". Dosier-Notation dezimal 4-Slot (0,5-0-0,5-0).
- Grund/ICD: reasonSuggestions (Stammdaten) -> Snapshot in MedicationInstance -> Grund-Dropdown
  je Dosierblock -> reasonLabel/reasonIcd10/reasonNote im DosageScheme. Anzeige: Medikationsplan
  Grund-Spalte „Label (ICD-10-GM)", reasonNote in Hinweise. BtM-Formular: nur reasonNote in
  Anmerkungen (nie ICD/Diagnose).
- Dosierung: Bruchteile (DosageRound, 0,25-Schritte), nicht-tägliche Einnahme (weekdays je Block,
  nur bei Abweichung gespeichert). Reisedauer = Tage im Ausland; Reichdauer = eindeutige Einnahmetage
  (Weekdays.intakeDaySet); Gesamtmenge = Σ(Einnahmetage × Dosis) × Wirkstoff. Abweichungs-Hinweise
  (DosageDeviation) in App + BtM-Anmerkungen.
- Test: Vitest + jsdom.

## 9. Architekturentscheidungen
- ADR-001: pdf-lib befüllt das amtliche BfArM-017-Formular (AcroForm) und flattet es.
  Einmalige Vorverarbeitung (scripts/preprocess-form.mjs) merged zusammengesetzte
  Feldpaare (Staatsangehoerigkeit, Wohnanschrift) und repariert die Widgets (/P + Page-Annots),
  damit flatten() funktioniert. Signatur-/Behördenfelder bleiben leer. 32 Felder final.
- ADR-002: sessionStorage-Key `btm-session-data` (obfuskiert) ersetzt dauerhaftes
  localStorage `btm-app-data` (Datensparsamkeit). Alte Daten werden einmalig migriert (Migration.js).
- ADR-003: data/medications.json (FHIR-Medication, 1 Resource pro Stärke) hinter
  MedicationRepository (findAll/findById/search). productFamily = UI-Gruppierung
  (nicht-FHIR). MedicationInstance = Snapshot bei Erfassung. Spätere PZN-API austauschbar.
- ADR-004: Indikationen (ICD-10-GM + ICD-11) zentral in substances.json; Join Resource->Wirkstoff über stabile substanceId (nicht ATC, da ein Wirkstoff mehrere ATC-Codes haben kann, z.B. Guanfacin N06BA21/C02AC02). MedicationRepository reichert Resources um reasonSuggestions an.

## 10. Qualitätsanforderungen
Datensparsamkeit, XSS-Freiheit, korrekte Wirkstoffmengen-Aggregation, amtstreue PDF-Ausgabe.

## 11. Risiken und technische Schulden
- Obfuskierung != Verschlüsselung (bewusst, s. Scope).
- Keine vollständige PZN-Datenbank (lizenzpflichtig) — Repository-Interface ist
  auf einen späteren PZN-API-Adapter vorbereitet.
- Medikamenten-Stammdaten decken aktuell die Seed-Präparate ab; weitere
  Wirkstärken können in `data/medications.json` ergänzt werden.
- jsPDF-Nachbau entfernt (erledigt) — Ausgabe erfolgt nur noch über das amtliche Formular.
- PatientView/DoctorView-Formulare wurden bei der ES-Umstellung nur exportiert, nicht
  neu gestaltet; ihre Eingaben laufen weiter über die bestehende Validierung.
- BtM-Rechtsstand: Cannabinoide seit 04/2024 kein BtM (MedCanG), daher (noch) nicht aufgenommen; Tilidin-retard ist BtM-ausgenommen (btmStatus 'ausgenommen'). ATC-Referenz: WIdO; ICD-11: WHO MMS.

## 12. Glossar
- BtM: Betäubungsmittel. SDÜ: Schengener Durchführungsübereinkommen.
- AcroForm: PDF-Formularfelder. Snapshot: kopierte Medikamentenwerte bei Erfassung.
