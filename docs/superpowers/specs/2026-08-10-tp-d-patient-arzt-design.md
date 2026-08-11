# TP-D · Patient + Arzt (erste Screen-Migration)

Erste echte Screen-Migration des Redesigns: PatientView und DoctorView werden von
Template-Strings auf **Node-Factories** (dom.js + TP-B-Komponenten) umgestellt, mit
**Inline-Validierung**, **Speichern-per-Weiter** (Shell-Footer) und **Dialog-Ersatz**
(alert/prompt/confirm → Modal/Alert). Feld-IDs bleiben identisch (E2E-/Controller-Vertrag).

## Leitentscheidungen

- **Views → Nodes.** `render()` liefert für Patient/Arzt ab jetzt einen **DOM-Node** statt
  eines HTML-Strings. `AppShell.setContent()` akzeptiert bereits Node **oder** String (TP-C);
  die übrigen Views bleiben vorerst Strings (Migration in TP-E/F).
- **Feld-IDs unverändert** (`patient-lastname`, `doctor-address`, …) → bestehende
  Controller-`getFormData`/`populateForm` und E2E-Selektoren funktionieren weiter.
- **Pflichtfeld-Kennzeichnung (PRINCIPLES.md #8b — „mark the exception"):** Pflichtfelder
  tragen **keine** Markierung (kein Sternchen). Nur **optionale** Felder erhalten „(optional)".
  Ein Pflichtfeld-Fehler erscheint **erst** beim `blur` eines leer gelassenen Felds **oder**
  beim „Weiter"-Versuch — dann roter Rahmen + „Pflichtfeld".
- **Speichern-per-Weiter.** Kein Speichern-Button in den Screens; der Shell-Footer „Weiter"
  speichert den aktiven Screen und navigiert nur bei Erfolg weiter.
- **Dialoge → Komponenten.** alert/prompt/confirm werden durch TP-B `alert()` (inline),
  `confirmModal`, `chooseModal` ersetzt; Controller-Methoden werden dafür async.

## Umfang

**Enthalten:** PatientView + DoctorView als Node-Factories; Inline-Validierung inkl.
Dokumentennummer-Warnung; Speichern-per-Weiter für Patient→Arzt→Medikamente (Navigation);
Dialog-Ersatz in PatientController + DoctorController; E2E-Anpassung.

**Nicht enthalten (Schnittstelle für TP-E/F):**
- **PDF-Trigger am letzten Schritt:** „Weiter" auf **Reisedaten** soll zusätzlich die
  PDF-Generierung anstoßen — das ist **TP-E** (Reisedaten-Screen). TP-D verdrahtet nur das
  Speichern+Weiter für Patient/Arzt/Medikamente. Der Speichern-Hook im Shell ist so gebaut,
  dass TP-E den PDF-Trigger für `travel` andocken kann.
- Medikamente-/Reise-Screens (TP-E), Formulare/Verwaltung (TP-F), `styles.css`-Ablösung (TP-F).

## Architektur / Dateien

```
js/utils/DocNumber.js         NEU — checkGermanDocNumber(value) -> { valid, hint }
js/utils/DocNumber.test.js
js/validation/RequiredFields.js  NEU — validatePatientFields(data)/validateDoctorFields(data) -> string[] (fehlende Keys)
js/validation/RequiredFields.test.js
js/views/PatientView.js       Node-Factory (dom.js + formField/input/select/combobox); Inline-Validierung + DocNumber-Warnung; NationalityRepository für die Combobox
js/views/DoctorView.js        dito
js/controllers/PatientController.js  savePatient()->{ok,missing}; loadPatient() via chooseModal; confirmModal; Inline-alert
js/controllers/DoctorController.js   saveDoctor()->{ok,missing}; loadDoctor(); searchDoctor/linkPatientDoctor Inline-alert
js/app.js                     setContent(node); Footer-„Weiter" ruft Save-Hook des aktiven Schritts
js/ui/AppShell.js             onNext-Hook: pro Eingabeschritt ein optionaler saveHook (Promise<{ok}>)
docs/arc42/architecture.md    §8 Screen-Migration
+ Tests + e2e-Anpassung
```

### `js/utils/DocNumber.js` — Deutsche Dokumentennummer

Reine Funktion, DOM-frei. Regelwerk (BfArM/Bundesdruckerei):
- **Zeichensatz (26):** `C F G H J K L M N P R T V W X Y Z` + `1 2 3 4 5 6 7 8 9`.
  Ausgeschlossene Buchstaben: `A B D E I O Q S U`. `0` ist im **aktuellen** Schema nicht
  enthalten (aber bei Dokumenten vor 01.11.2021 möglich).
- **Struktur (aktuell):** beginnt mit einem Buchstaben; enthält mindestens eine Ziffer.
- **Historische Ausnahmen:** vor 01.11.2021 → `0` erlaubt; vor 01.11.2023 → in Ausnahmefällen
  nur Buchstaben (keine Ziffer).

```
checkGermanDocNumber(value) -> { valid: boolean, hint: string|null }
```
- **Tolerant + Warnung** (kein Blockieren): `valid` ist `false` nur bei grob unplausiblen
  Eingaben (leere/whitespace); ansonsten `true`. `hint` ist gesetzt, wenn die Nummer vom
  **aktuellen** Schema abweicht (enthält `0`; enthält einen ausgeschlossenen Buchstaben wie
  `O`; beginnt nicht mit Buchstabe; enthält keine Ziffer). `hint`-Text:
  „Bitte die Dokumentennummer noch einmal kontrollieren — Abweichungen vom aktuellen Schema
  können ein Ablehnungsgrund sein." `hint` ist `null`, wenn die Nummer dem aktuellen Schema
  entspricht.
- Groß-/Kleinschreibung: Vergleich case-insensitiv (Ausweise sind Großbuchstaben; Eingabe wird
  für die Prüfung upgecased, der Wert selbst NICHT verändert).
- **Anwendung nur bei deutscher Staatsangehörigkeit** — die Entscheidung, ob geprüft wird,
  trifft der View (s.u.), nicht die Funktion. Die Funktion prüft nur das Schema.

### `js/validation/RequiredFields.js`

Reine Funktionen, DOM-frei:
```
validatePatientFields(data) -> string[]   // Keys leerer Pflichtfelder
validateDoctorFields(data) -> string[]
```
- Patient-Pflicht: lastname, firstname, passport, birthplace, birthdate, gender, street, zip,
  city. **Optional:** nationality (Default „Deutsch").
- Doctor-Pflicht: lastname, firstname, phone, address. **Optional:** title (Default „Dr. med.").
- „leer" = `String(v ?? '').trim() === ''`.

### Views (Node-Factories)

`render()` baut mit `dom.js` + TP-B-Komponenten einen Node mit **denselben Feld-IDs**:
- Jedes Feld über `formField({ label, htmlFor, optional? , control: input({id, name, ...}) })`.
  `optional:true` NUR bei nationality (Patient) bzw. title (Doctor).
- Geschlecht: `select` mit id `patient-gender` und den bestehenden Option-Werten
  (männlich/weiblich/divers) — bleibt select, um Controller-Vertrag/E2E exakt zu halten.
- Staatsangehörigkeit: **`combobox`** (aus TP-B), gespeist von `NationalityRepository.search()`
  (amtliche DESTATIS-Daten aus TP-Nationalities). Angezeigt „Land (Adjektiv)", **gespeichert das
  Adjektiv** (z.B. „deutsch"); Default „deutsch". Die Combobox schreibt ihren Wert in ein
  verstecktes/gebundenes Feld mit id **`patient-nationality`** (Controller-/E2E-Vertrag bleibt:
  `getFormData().nationality` = das Adjektiv). Als optionales Feld markiert („(optional)").
  Fallback: ist das Repository leer, erlaubt die Combobox weiterhin Freitext.
  `app.js` erzeugt das `NationalityRepository` (Import `data/nationalities.json`) und übergibt es
  der PatientView (z.B. via Konstruktor/Setter), damit die View DOM-frei testbar bleibt.
- **Kein** Speichern-Button (Speichern per Footer). „Laden"-Button bleibt (öffnet chooseModal).
  Doctor behält „Suchen" und „Verknüpfen".
- Inline-Validierung: `blur` auf einem leeren Pflichtfeld → `input({error:'Pflichtfeld'})`;
  korrekt gefüllt → `input({valid:true})`. Die View hält Referenzen auf die Feld-Wrapper, um
  error/valid umzuschalten (Re-Render des einzelnen Feldes oder Klassen-Toggle).
- **Dokumentennummer:** bei `blur` von `patient-passport` UND `patient-nationality === 'Deutsch'`
  → `checkGermanDocNumber(value)`; `hint` (falls gesetzt) als **Warnung** (nicht blockierend)
  unter dem Feld anzeigen (z.B. `formField({hint})` bzw. eine dezente Warnzeile). Bei nicht-
  deutscher Staatsangehörigkeit: keine Schema-Prüfung.
- `getFormData()`/`populateForm()` bleiben erhalten (gleiche IDs) — Controller unverändert nutzbar.
- Eine Methode `showMissing(keys)` markiert die übergebenen Felder als Fehler (für „Weiter").

### Controller-Änderungen

- `savePatient()` / `saveDoctor()` werden **async** und geben `{ ok: boolean, missing: string[] }`
  zurück (statt alert+void):
  - Pflichtfelder prüfen (RequiredFields). Fehlt etwas → `{ ok:false, missing }` (kein Save).
  - Duplikat (gleicher Name/…): `await confirmModal(...)`; bei false → `{ ok:true, missing:[] }`
    ohne Überschreiben (oder Abbruch — Verhalten wie bisher, nur ohne Browser-confirm).
  - Erfolg → Model speichern, `{ ok:true, missing:[] }`. Die „Gespeichert"-Bestätigung zeigt der
    View/Shell (Inline-Alert), nicht der Controller per Browser-alert.
- `loadPatient()`/`loadDoctor()`: `await chooseModal({ items, renderItem })`; Auswahl →
  `populateForm`. Keine Einträge → Inline-Alert „keine vorhanden".
- `searchDoctor`/`linkPatientDoctor`: bestehende Logik, ihre `alert`s → Inline-Alert.

### Shell / app.js — Speichern-per-Weiter

- `AppShell` bekommt einen optionalen **Save-Hook je Eingabeschritt**: beim Footer-„Weiter" ruft
  die Shell `onNext(activeStepId)`; `app.js` mappt das auf `controllers[step].saveX()` (async).
  - Ergebnis `{ok:true}` → Shell navigiert zum nächsten Schritt + kurze „Gespeichert"-Bestätigung.
  - Ergebnis `{ok:false, missing}` → **keine** Navigation; `views[step].showMissing(missing)`.
- Für Schritte ohne Save-Hook (certificates) bleibt „Weiter" reine Navigation.
- **PDF-Trigger** für `travel` wird in **TP-E** an denselben Hook angedockt (hier nur vorbereitet).

## Datenfluss / Integration

- `app.js.showTab` hängt für patient/doctor den **Node** ein (`views[x].render()` → Node →
  `shell.setContent(node)`), initialisiert den Controller (`bindEvents`), und der Footer-Hook
  ruft beim „Weiter" `saveX()`.
- Modelldaten/Feld-IDs unverändert → StepStatus (TP-C) funktioniert weiter (done/attention).
- Kein `innerHTML` in den neuen Views (dom.js/Komponenten); Escaping by construction.

## Fehlerbehandlung & Randfälle

- „Weiter" mit leeren Pflichtfeldern → bleibt auf dem Screen, markiert Felder, kein Save,
  keine Navigation.
- Dokumentennummer-Warnung blockiert **nie** (nur Hinweis); nur bei `nationality === 'Deutsch'`.
- „Laden" ohne Einträge → Inline-Alert.
- Nationalitäts-Combobox mit leerem/fehlendem Repository → erlaubt Freitext (kein Wurf), Default „deutsch".
- Async-Controller: Doppelklick auf „Weiter" während eines offenen Modals → Save-Hook ist
  idempotent (zweiter Aufruf wartet/ignoriert), damit keine Doppel-Navigation entsteht.

## Tests (Pflicht)

- **DocNumber (unit):** aktuelles Schema (z.B. „C1Z9…") → `hint=null`; enthält `0` → `hint` gesetzt;
  enthält `O` (ausgeschlossen) → `hint`; nur Buchstaben (keine Ziffer) → `hint`; beginnt mit Ziffer
  → `hint`; leer → `valid:false`. Case-insensitiv.
- **RequiredFields (unit):** vollständige Daten → `[]`; einzelne fehlende → Key enthalten;
  optional (nationality/title) fehlend → NICHT in der Liste.
- **Views (unit, jsdom):** `render()` liefert Node mit allen erwarteten Feld-IDs; „(optional)"
  nur an nationality/title; kein Speichern-Button; `showMissing(['firstname'])` markiert das Feld
  als Fehler; `blur` auf leerem Pflichtfeld → Fehlerzustand; Dokumentennummer-Hinweis erscheint
  nur bei deutscher Staatsangehörigkeit + Schema-Abweichung.
- **Controller (unit, jsdom):** `savePatient` mit fehlenden Feldern → `{ok:false, missing:[...]}`,
  kein Model-Write; vollständig → `{ok:true}` + Model-Write; Duplikat → `confirmModal` aufgerufen.
  `loadPatient` → `chooseModal` aufgerufen, Auswahl landet in `populateForm`.
- **E2E (Playwright):** Flows umstellen — **kein** `dialog`-accept mehr; „Weiter" (Footer)
  speichert und navigiert; „Laden" per Modal-Klick; Pflichtfeld leer → „Weiter" bleibt auf dem
  Screen + Fehlermarkierung. Kompletter Flow (frisch + gespeicherte Datei) bleibt grün.
- **Bestehende Tests** (257) bleiben grün, soweit nicht durch den Dialog-/Save-Flow bewusst
  angepasst (dann Erwartung an das neue Verhalten anpassen, nie Produktionslogik verbiegen).

## ARC42 (Pflicht)

`docs/arc42/architecture.md` §8: „Screen-Migration (TP-D): PatientView/DoctorView als
Node-Factories (dom.js + TP-B-Komponenten, kein innerHTML); Inline-Validierung (nur optionale
Felder markiert; Pflichtfehler bei Blur/Weiter); Speichern-per-Weiter über den Shell-Footer
(Save-Hook je Schritt, Ergebnis {ok,missing}); alert/prompt/confirm → Alert/confirmModal/
chooseModal (Controller async). Dokumentennummer-Prüfung (DocNumber, nur bei dt.
Staatsangehörigkeit, tolerant + Warnung, blockiert nicht). PDF-Trigger am letzten Schritt folgt
in TP-E."

## Definition of Done

- Patient/Arzt als Node-Factories; Feld-IDs unverändert; kein Speichern-Button.
- Inline-Validierung: nur optionale Felder markiert; Pflichtfehler bei Blur/Weiter; DocNumber-
  Warnung nur bei dt. Staatsangehörigkeit, nicht blockierend.
- Speichern-per-Weiter über Shell-Footer; alert/prompt/confirm ersetzt.
- Neue Unit-Tests + angepasste E2E grün; 257 bestehende grün; `npm run build` kompiliert.
- Kein `innerHTML` in den neuen Views; ARC42 ergänzt.

## Später (Schnittstelle)

- **TP-E:** Reisedaten-Screen; „Weiter" auf travel stößt zusätzlich die PDF-Generierung an
  (Save-Hook + Generate). Medikamente-Screen.
- **TP-F:** Formulare-/Verwaltungs-Screen, `styles.css`-Ablösung.
- Nicht-deutsche Dokumentennummern: eigene Regeln später (aktuell nur Pflichtfeld-Prüfung).
