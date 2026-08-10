# TP-C · App-Shell + Navigation

Teil C des Redesigns auf das *Reisebescheinigung Design System*. Baut das App-Shell
(Header, Schritt-Tabs, Footer, Start-Screen) als eigenes Modul neu und lädt erstmals
`css/components.css` und `base.css` global — **hier kippt die Optik sichtbar**. Die
bestehenden Views/Controller bleiben inhaltlich unangetastet; nur `js/app.js` wird
schlank und delegiert die Navigations-UI ans Shell.

## Kontext & Leitentscheidungen

- **Vanilla, kein React.** Shell baut DOM via `js/ui/dom.js` und `js/ui/Icon.js` (TP-A) und
  nutzt die TP-B-Komponenten (Button, Card, Alert, Tabs-Verhalten). Kein `innerHTML` im Shell.
- **`app.js` wird Orchestrator.** Model/Views/Controller/Persistenz bleiben in `app.js`; die
  Navigations-UI (bisher `setupNavigation`/`showTab`/`showStartScreen` per `innerHTML`) wandert
  in `js/ui/AppShell.js`.
- **Status voll aus dem Model.** Pro Schritt wird `done`/`attention`/`todo` aus den Model-Daten
  abgeleitet (`js/ui/StepStatus.js`, reine Funktion). Header zeigt „Schritt X von 5 · Y
  abgeschlossen"; Tabs zeigen Haken (done) bzw. Aufmerksamkeits-Punkt (attention).
- **Footer navigiert nur.** Zurück/Weiter wechseln den Schritt; „Speichern beim Weiter" wird
  erst in TP-D/E pro Screen verdrahtet (Views bleiben in TP-C unangetastet → kleine
  Konfliktfläche zum parallelen Redesign).
- **Übergangs-Kompromiss View-Einhängung.** `AppShell.setContent()` akzeptiert weiterhin den
  `render()`-String der bestehenden Views. Das ist die *einzige* Stelle, die bestehendes
  View-HTML einsetzt; sie ist isoliert und dokumentiert und wird in TP-D/E auf Komponenten-
  Nodes umgestellt. (Die Views selbst sind bereits geprüft/escaped; TP-C ändert sie nicht.)

## Architektur / Dateien

```
js/ui/StepStatus.js     NEU — stepStatus(data) -> { patient, doctor, medication, travel, certificates }
js/ui/StepStatus.test.js
js/ui/AppShell.js       NEU — Klasse AppShell: mount/setActive/setContent/setStatus/showStart/hideStart
js/ui/AppShell.test.js
js/app.js               MOD — nutzt AppShell statt setupNavigation/showTab/showStartScreen
src/index.template.html MOD — Container-Struktur an das Shell angepasst (Root-Mountpunkt)
css/tokens/index.css    MOD — base.css wieder aufgenommen (Element-Restyling ab jetzt aktiv)
css/components.css      (import in app.js hinzugefügt — ab jetzt aktiv)
docs/arc42/architecture.md MOD — §8 Absatz „App-Shell (TP-C)"
```

### `js/ui/StepStatus.js`

Reine Funktion, DOM-frei, isoliert testbar:
```
stepStatus(data) -> { patient, doctor, medication, travel, certificates }
```
(Der Rückgabe-Key heißt `travel`, die Datenquelle ist `data.travelData`.)
Jeder Wert `'done' | 'attention' | 'todo'`. Ableitung aus `data` (exakte Struktur aus
`DataStore.data`): `currentPatient` (Objekt|null), `currentDoctor` (Objekt|null),
`medications` (Array), `travelData` (Objekt|null mit `start`/`end`/`duration`):

- **patient**: Quelle `data.currentPatient`. Pflichtfelder = firstname, lastname, birthdate,
  passport, birthplace, nationality, gender, street, zip, city.
  - `currentPatient` null/leer → `todo`; alle gesetzt → `done`; einige (nicht alle) → `attention`.
- **doctor**: Quelle `data.currentDoctor`. Pflichtfelder = firstname, lastname, address
  (phone optional). Gleiche null/all/some-Logik.
- **medication**: `done`, wenn `Array.isArray(data.medications) && data.medications.length > 0`;
  sonst `todo` (kein Teilzustand → kein `attention`).
- **travel**: Quelle `data.travelData`. Pflichtfelder = start, end, duration. null → `todo`;
  alle gesetzt → `done`; einige → `attention`.
- **certificates**: Ausgabeschritt. `done`, wenn patient+doctor+medication+travel alle `done`;
  sonst `todo` (nie `attention`).

Hilfslogik (intern): `completeness(obj, keys)` zählt gesetzte (nicht leere) Pflichtfelder →
`all` / `some` / `none`. „gesetzt" = `String(v ?? '').trim() !== ''`.

### `js/ui/AppShell.js`

Klasse mit klarer Schnittstelle zu `app.js`:
```
const shell = new AppShell({ steps, onNavigate, onGenerate });
shell.mount(rootEl);          // baut Header + Tabs + <main id=main-content> + Footer
shell.setActive(stepId);      // aktiver Schritt + Header „Schritt X von N · Y abgeschlossen"
shell.setContent(htmlOrNode); // füllt <main> (String -> übergangsweise via View-HTML; Node -> appendChild)
shell.setStatus(statusMap);   // done -> Haken-Badge, attention -> Aufmerksamkeits-Punkt
shell.showStart(opts);        // Start-Screen (Card/Alert/Buttons), opts.hasSession/onContinue/onImport/onNew
shell.hideStart();            // Start-Screen entfernen, Shell-Chrome zeigen
```

`steps` = Array `{ id, label, icon }` für die 5 Eingabeschritte (patient/doctor/medication/travel/
certificates) + die Utility „Gespeicherte Daten" (`id: 'data'`, `utility: true`).

- **Header**: Logo (`assets/logo.svg` bzw. vorhandenes Logo), Produktname, aktueller Schritt-
  Titel + Icon, rechts „Schritt X von 5 · Y abgeschlossen" (bei Utility: „Verwaltung").
- **Tabs** (Design-`Tabs`, `steps`-Modus): je Schritt ein `role="tab"`-Button mit Badge
  (Nummer, oder Haken-Icon bei `done`), Aufmerksamkeits-Punkt (`aria-label="Angaben
  unvollständig"`) bei `attention`; „Gespeicherte Daten" als abgesetzte Utility (Divider,
  Datenbank-Icon). WAI-ARIA-Tabs: ArrowLeft/Right/Home/End, roving `tabindex`, `aria-selected`,
  jede Tab unabhängig klickbar (`onNavigate(id)`).
- **Footer**: Zurück (deaktiviert im 1. Schritt) / Weiter; im letzten Eingabeschritt (travel)
  heißt Weiter „Bescheinigungen generieren" und ruft `onGenerate()` zusätzlich zur Navigation.
  `min-height: 44px`. **Nur Navigation, kein Speichern.** Footer nur bei Eingabeschritten (nicht
  bei der Utility).
- **View-Einhängung**: `setContent(html)` — ist `html` ein `Node`, `appendChild`; ist es ein
  String (bestehende View-`render()`), wird er über die bestehende, bereits abgesicherte
  Einhäng-Konvention gesetzt. Dieser eine String-Pfad ist der dokumentierte Übergangs-Kompromiss
  (Views sind escaped; Umstellung auf Nodes in TP-D/E).

### Start-Screen

`shell.showStart({ hasSession, onContinue, onImport, onNew })` rendert mit TP-B-Komponenten:
- **Card** mit `title: 'Willkommen'`.
- **Alert (info)**: „Möchten Sie eine gespeicherte Datei laden oder neu beginnen?"
- **Buttons**: „Laufende Sitzung fortsetzen" (nur wenn `hasSession`, ruft `onContinue`),
  „Gespeicherte Datei laden" (`onImport`), „Neu anfangen" (`onNew`).
- **E2E-Anker bleiben**: Text „Willkommen" und Button-Name „Neu anfangen" (Rollen-Name) müssen
  erhalten bleiben. Tab-Chrome ist während des Start-Screens ausgeblendet/inaktiv.

## Datenfluss / Integration

- `js/app.js` importiert zusätzlich `../css/components.css` (nach den Tokens). `css/tokens/index.css`
  nimmt `base.css` wieder auf. → Optik kippt (gewollt).
- `app.js` erzeugt `new AppShell({ steps, onNavigate, onGenerate })`, `mount()` in den Root.
  - `onNavigate(stepId)`: `app.js` ruft `views[step].render()` + `controllers[step].init()`,
    `shell.setContent(html)`, `shell.setActive(stepId)`, `shell.setStatus(stepStatus(model.data))`.
  - `onGenerate()`: entspricht dem bisherigen Wechsel auf `certificates` + PDF-Init.
- `model.subscribe(...)` aktualisiert zusätzlich `shell.setStatus(stepStatus(model.data))` bei jeder
  Änderung (Live-Zähler/Badges).
- Start/Fortsetzen/Neu/Import-Logik bleibt in `app.js`; das Shell liefert nur die Buttons+Callbacks.
- **Kein Controller/View wird inhaltlich geändert.** Feld-IDs (`#patient-form`, …) bleiben, weil sie
  aus den unveränderten Views kommen.

## Fehlerbehandlung & Randfälle

- Unbekannter `stepId` → Fallback `patient`.
- `setStatus` mit fehlendem Schritt-Key → dieser Tab bleibt `todo` (kein Badge/Punkt).
- Start-Screen ohne Session → „fortsetzen"-Button entfällt (kein toter Button).
- base.css jetzt aktiv: klassenlose `<h2>/<h3>/<h4>` erhalten das Display-Font — der gewollte
  Umschwung. `styles.css` bleibt geladen (entfällt in TP-F); bei Doppelregeln gewinnt die neue Optik
  bewusst (Ladereihenfolge: tokens inkl. base → components → styles; wo nötig, präzisere `rb-`-Klassen).
- Kein `innerHTML` im Shell außer dem dokumentierten View-String-Pfad.

## Tests (Pflicht, Vitest/jsdom + Playwright)

- **StepStatus** (unit, DOM-frei):
  - leeres Model → alle `todo` (bzw. certificates `todo`).
  - Patient teilweise → `attention`; vollständig → `done`.
  - medication: 0 → `todo`, ≥1 → `done`.
  - alle vier vollständig → certificates `done`.
- **AppShell** (unit, jsdom):
  - `mount` erzeugt Header, Tabs (6 Buttons inkl. Utility), `<main id=main-content>`, Footer.
  - `setActive('doctor')` markiert den Doctor-Tab (`aria-selected=true`) und setzt den Header-Titel.
  - `setStatus({patient:'done', doctor:'attention', ...})` → Haken-Badge bzw. Aufmerksamkeits-Punkt.
  - `showStart({hasSession:false,...})` enthält Text „Willkommen" und einen Button „Neu anfangen";
    `onNew`/`onImport` feuern bei Klick; ohne Session kein „fortsetzen"-Button.
  - Tastatur: ArrowRight auf aktivem Tab bewegt die Auswahl (roving tabindex), `onNavigate` feuert.
  - Footer: Weiter feuert `onNavigate` auf den nächsten Schritt; im travel-Schritt ruft Weiter
    zusätzlich `onGenerate`.
  - kein `innerHTML` in AppShell.js/StepStatus.js.
- **E2E (Playwright)**: die 4 bestehenden Flows bleiben grün — Tabs per Rollen-Name klickbar
  (Patient/Arzt/Medikamente/Reisedaten/Formulare/Gespeicherte Daten), Start-Screen-Anker
  „Willkommen"/„Neu anfangen" erhalten, Feld-IDs unverändert. Anpassung nur, falls die
  Shell-Struktur es zwingend erfordert (dann dokumentiert).
- **Bestehende Unit-Tests** (212) bleiben grün.

## ARC42 (Pflicht)

`docs/arc42/architecture.md` §8: Absatz „App-Shell (TP-C)":
- `AppShell.js` kapselt Header/Tabs/Footer/Start-Screen; `app.js` wird schlanker Orchestrator.
- `StepStatus.js` leitet done/attention/todo je Schritt aus dem Model ab (Header-Zähler, Tab-Badges).
- Optik-Umschwung: `components.css` + `base.css` ab TP-C global aktiv; `styles.css` bleibt bis TP-F.
- Footer navigiert nur; „Speichern-per-Weiter" folgt in TP-D/E.

## Definition of Done

- `StepStatus.js` + `AppShell.js` vorhanden, `app.js` nutzt sie; Navigation läuft über das Shell.
- `components.css` + `base.css` global geladen — Optik sichtbar umgestellt.
- Alle neuen Unit-Tests grün; 212 bestehende grün; 4 E2E grün; `npm run build` kompiliert.
- Kein `innerHTML` in den neuen Shell-Dateien (außer dokumentiertem View-String-Pfad in setContent).
- ARC42 ergänzt.
