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
- Repositories: MedicationRepository
- Services: PdfFormFiller, DosageAggregator, Migration
- Utils: Sanitize, Obfuscate, Validator, DateHelper
- Views / Controllers: pro Domäne

## 6. Laufzeitsicht
- Start: Auswahl "Neu anfangen" / "Datei importieren" (+ ggf. Migration).
- Erfassung Patient/Arzt/Medikament/Reise -> Autosave in sessionStorage (obfuskiert).
- "Bescheinigung erzeugen" -> PdfFormFiller befüllt + flattet das amtliche PDF.
- "Exportieren" -> obfuskierte JSON-Datei zum Download.

## 7. Verteilungssicht
Statisches Bundle in `dist/`, auslieferbar über beliebigen Static-Host / lokal.

## 8. Querschnittliche Konzepte
- Security: XSS-Escaping (Sanitize), keine PII-Logs, UUIDs, obfuskierte Persistenz.
- Persistenz: sessionStorage (flüchtig) + Datei-Export (Nutzerhoheit).
- Test: Vitest + jsdom.

## 9. Architekturentscheidungen
- ADR-001: pdf-lib statt jsPDF-Nachbau (amtliches Formular direkt befüllen).
- ADR-002: sessionStorage + Export statt dauerhaftem localStorage (Datensparsamkeit).
- ADR-003: FHIR-Medication-Flatfile hinter Repository (spätere PZN-API austauschbar).

## 10. Qualitätsanforderungen
Datensparsamkeit, XSS-Freiheit, korrekte Wirkstoffmengen-Aggregation, amtstreue PDF-Ausgabe.

## 11. Risiken und technische Schulden
- Obfuskierung != Verschlüsselung (bewusst, s. Scope).
- Keine vollständige PZN-Datenbank (lizenzpflichtig).

## 12. Glossar
- BtM: Betäubungsmittel. SDÜ: Schengener Durchführungsübereinkommen.
- AcroForm: PDF-Formularfelder. Snapshot: kopierte Medikamentenwerte bei Erfassung.
