# TP-B · Komponenten-Bibliothek

Teil B des Redesigns auf das *Reisebescheinigung Design System*. Baut die
präsentativen und Formular-Komponenten als schlanke Vanilla-JS-Factories nach,
gestylt über echte CSS-Klassen auf Basis der TP-A-Tokens. **Noch nicht in Views
verdrahtet** — die Komponenten werden isoliert getestet und ab TP-C in Shell und
Screens eingesetzt.

## Kontext & Leitentscheidungen

- **Vanilla, kein React.** Die JSX-Prototypen (`reisebescheinigung-design-system/`)
  sind Referenz fürs visuelle Ergebnis. Jede Komponente ist eine **Factory-Funktion**,
  die ein `HTMLElement` zurückgibt (gebaut mit `js/ui/dom.js` aus TP-A). Kein `innerHTML`.
- **CSS-Klassen statt Inline-Styles.** Styling lebt in `css/components.css` mit echten
  Klassen (Präfix `rb-`), die die Tokens (`--color-*`, `--space-*`, `--radius-*` …) nutzen.
  Hover/Focus über CSS-Pseudoklassen (`:hover`, `:focus-visible`), nicht per JS-State —
  das reduziert Code pro Komponente und ist idiomatisch.
- **Icon** aus TP-A (`js/ui/Icon.js`, `icon()`) wird von Alert, Select und Button genutzt.
- **Modal ist eine intentionale Ergänzung** (nicht im Prototyp): Ersatz für `confirm()`/
  `prompt()` (Patient/Arzt laden, Überschreiben bestätigen) gemäß PRINCIPLES.md.
- **Nicht in TP-B:** `Tabs` (nur in AppShell → TP-C), `Table` (nur in CertificateScreen →
  TP-F). YAGNI: erst bauen, wenn gebraucht.
- **components.css wird noch nicht global geladen.** Wie bei den TP-A-Tokens bleibt die App
  optisch unverändert; die Klassen greifen erst, wenn ab TP-C Markup sie verwendet. (Ein
  `@import` in `css/tokens/index.css` oder `js/app.js` erfolgt bewusst NICHT in TP-B —
  siehe „Integration".)

## Architektur / neue Dateien

```
css/components.css              # alle rb-* Klassen (nutzt TP-A-Tokens)
js/ui/components/Button.js      # button({ variant, size, icon, disabled, label, onClick }) -> HTMLElement
js/ui/components/Badge.js       # badge({ tone, text }) -> HTMLElement
js/ui/components/Alert.js       # alert({ tone, children }) -> HTMLElement  (children: string|Node|Node[])
js/ui/components/Card.js        # card({ title, meta, actions, children }) -> HTMLElement
js/ui/components/FormField.js   # formField({ label, htmlFor, optional, hint, error, control }) -> HTMLElement
js/ui/components/Input.js       # input({ value, type, error, valid, ...attrs }) -> HTMLElement (wrapper mit Icon)
js/ui/components/Select.js      # select({ options, value, ...attrs }) -> HTMLElement (wrapper mit chevron)
js/ui/components/Radio.js       # radioGroup({ name, options, value, onChange }) -> HTMLElement
js/ui/components/Combobox.js    # combobox({ options, value, onChange, placeholder }) -> HTMLElement (+ Steuer-API)
js/ui/components/Modal.js       # openModal({ title, body, actions }) -> { close } ; confirmModal(...) ; chooseModal(...)
js/ui/components/*.test.js      # je eine Testdatei pro Komponente
```

Jede Komponente ist eine eigene Datei mit einer klaren Verantwortung; die Test-Globs
(`js/**/*.test.js`) erfassen alle `*.test.js` automatisch.

## Komponenten-Spezifikationen

Farben/Abstände IMMER als Token-Variablen; Werte 1:1 aus den Prototypen.

### Button (`rb-btn`, `rb-btn--{variant}`, `rb-btn--{size}`)
- Varianten: `primary` (primary-700 Grund, weiße Schrift), `secondary` (surface, ink-900,
  Rahmen ink-300), `ghost` (transparent, primary-700), `danger` (surface, danger-600, Rahmen
  danger-600). Hover je Variante per CSS (`:hover`): primary→primary-800, secondary→primary-50
  + ink-500-Rahmen, ghost→primary-50, danger→danger-100.
- Größen `sm`/`md`/`lg` (Padding/Font aus Prototyp). `font-weight: semibold`, `radius-sm`,
  `min-height: 44px` bei `md`/`lg` (PRINCIPLES.md #9 Touch-Target).
- `icon` optional → linksbündiges `icon(name,{size:16})` vor dem Label.
- `disabled` → `opacity .45`, `cursor: not-allowed`, `disabled`-Attribut gesetzt.
- `onClick` → Click-Handler.
- API: `button({ variant='primary', size='md', icon, disabled=false, label, onClick, type='button', ...attrs })`.

### Badge (`rb-badge`, `rb-badge--{tone}`)
- Töne: neutral, primary, success, warning, danger (Hintergrund `-100`, Text `-700/-800`).
- Pill (`radius-full`), `text-xs`, semibold, uppercase, `tracking-wide`.
- API: `badge({ tone='neutral', text })`.

### Alert (`rb-alert`, `rb-alert--{tone}`)
- Töne: info (`info`-Icon), success (`check-circle-2`), warning (`triangle-alert`),
  danger (`circle-x`). Hintergrund `-100`, Text `-700`.
- `role="alert"` bei danger/warning, sonst `role="status"`.
- Layout: Icon (18px) + Inhalt nebeneinander, `radius-md`.
- API: `alert({ tone='info', children })` — children string|Node|Node[].

### Card (`rb-card`)
- Surface, Rahmen default, `radius-md`, Padding `space-5`.
- Optionaler Kopf: `title` (h4, body-Font, md, semibold), `meta` (sm, muted), `actions`
  (rechtsbündige Node-Liste). Kopf nur rendern, wenn title oder actions gesetzt.
- API: `card({ title, meta, actions, children })`.

### FormField (`rb-field`)
- Label (sm, semibold, ink-900). `optional` → „ (optional)" in Regular/ink-500 (Ditch-the-
  asterisk, PRINCIPLES.md #8b). Kein Pflicht-Sternchen.
- Slot `control` (das eigentliche Eingabe-Element, z.B. von `input()`).
- Unter dem Control: `error` (xs, danger-600) ODER `hint` (xs, muted) — error hat Vorrang.
- API: `formField({ label, htmlFor, optional=false, hint, error, control })`.

### Input (`rb-input`, Wrapper `rb-input-wrap`)
- `<input>` in einem relativen Wrapper. Bei `valid` → grünes `check-circle`-Icon rechts;
  bei `error` → rotes `alert-circle`-Icon rechts + roter Rahmen (Inline-Validierung,
  PRINCIPLES.md #4/#5). Fokus-Rahmen primary-700 + Accent-Ring (aus base-Token-Regeln,
  hier aber lokal an `.rb-input:focus`).
- Padding rechts vergrößert sich, wenn ein Status-Icon sichtbar ist.
- API: `input({ value, type='text', error, valid, id, name, placeholder, onInput, onBlur, ...attrs })`.

### Select (`rb-select`, Wrapper `rb-select-wrap`)
- `<select>` mit `appearance:none`, rechts ein `chevron-down`-Icon (pointer-events:none).
- `options`: Array `{ value, label }` (leere erste Option optional über `placeholder`).
- API: `select({ options, value, id, name, onChange, placeholder, ...attrs })`.

### Radio (`rb-radio-group`, `rb-radio`)
- `role="radiogroup"`; je Option ein `<label>` mit nativem `<input type=radio>`
  (`accent-color: primary-700`, 18px) + Text.
- API: `radioGroup({ name, options, value, onChange })`.

### Combobox (`rb-combobox`, `rb-combobox__list`, `rb-combobox__option`)
- Text-Input mit gefilterter, tastaturnavigierbarer Listbox (intentionale Ergänzung für
  190+ Optionen, z.B. Staatsangehörigkeit). `role="combobox"`, `aria-expanded`,
  `aria-autocomplete="list"`; Liste `role="listbox"`, Optionen `role="option"`.
- Verhalten: Tippen filtert (case-insensitiv, `includes`), max. 8 Treffer; ArrowUp/Down
  bewegt `activeIndex`; Enter wählt aktive Option; Escape schließt; Klick außerhalb schließt
  (document-mousedown-Listener, beim Zerstören abmelden). Auswahl ruft `onChange(label)`.
- API: `combobox({ options, value, onChange, placeholder })` → gibt das Wrapper-Element
  zurück; ein internes Aufräumen (Listener-Abmeldung) wird über eine `.destroy()`-Methode
  am Element bereitgestellt (`el.destroy = () => {...}`), damit Views es sauber entfernen können.

### Modal (`rb-modal`, `rb-modal__backdrop`, `rb-modal__dialog`)
- Intentionale Ergänzung. Overlay (fixed, Backdrop `rgba` abgedunkelt) + zentriertes
  Dialog-Panel (surface, `radius-lg`, `shadow-lg`, max-width). `role="dialog"`,
  `aria-modal="true"`, `aria-label`/`aria-labelledby` aus `title`.
- Fokus: beim Öffnen Fokus in den Dialog (erster fokussierbarer Button); Escape schließt;
  Klick auf Backdrop schließt (konfigurierbar). Beim Schließen Fokus zurück auf das vorher
  fokussierte Element. Ein einfacher Fokus-Trap (Tab zykliert innerhalb des Dialogs).
- Bausteine:
  - `openModal({ title, body, actions, dismissible=true }) -> { close }` — generisch;
    `body` string|Node, `actions` Node[] (z.B. Buttons).
  - `confirmModal({ title, message, confirmLabel='Bestätigen', cancelLabel='Abbrechen',
    tone='primary' }) -> Promise<boolean>` — Ersatz für `confirm()`.
  - `chooseModal({ title, items, renderItem }) -> Promise<item|null>` — Ersatz für die
    `prompt()`-Auswahl (Patient/Arzt laden); `items` Array, `renderItem(item)->string`
    liefert die Anzeige je Zeile.
- Kein `innerHTML`; DOM per `dom.js`. Overlay wird an `document.body` gehängt und beim
  Schließen entfernt.

## Datenfluss / Integration

- **Kein globales Laden in TP-B.** `css/components.css` wird in TP-B **nicht** in
  `index.css`/`app.js` importiert — die App bleibt optisch unverändert. Ab TP-C, wo Markup
  die `rb-*`-Klassen nutzt, wird `css/components.css` in `js/app.js` importiert.
- Komponenten importieren `icon` aus `../Icon.js` und die Helfer aus `../dom.js`.
- **Test-Sichtbarkeit von CSS:** Unit-Tests prüfen DOM-Struktur, Klassen, ARIA-Attribute,
  Event-Verhalten und Callback-Aufrufe — **nicht** berechnete Pixel (jsdom rechnet kein
  Layout). Ein separater Datei-Inhaltstest prüft, dass `css/components.css` die Kern-Klassen
  definiert und Tokens referenziert.

## Fehlerbehandlung & Randfälle

- Unbekannte `variant`/`tone` → Fallback auf Default (`primary`/`neutral`/`info`).
- `combobox`/`modal` melden ihre document-Listener beim Zerstören/Schließen ab (kein Leak).
- Nutzertexte (Labels, Optionen) laufen über `textContent` (dom.js) → Escaping by construction.
- Modal ohne fokussierbares Element → Fokus auf das Dialog-Panel (`tabindex=-1`).
- Fehlende `options` (Combobox/Select/Radio) → leere, aber valide Struktur (kein Wurf).

## Tests (Pflicht, Vitest/jsdom)

Pro Komponente eine `*.test.js`. Mindestabdeckung:
- **Button:** rendert `<button>` mit korrekter Variant-/Size-Klasse; `icon` fügt ein SVG
  voran; `disabled` setzt Attribut + Klasse; `onClick` wird bei Klick aufgerufen.
- **Badge:** korrekte Ton-Klasse; Text als `textContent` (Escaping-Fall mit `<b>`-String).
- **Alert:** Ton→Icon-Name + `role` (danger/warning=alert, sonst status); children als Node
  und als String.
- **Card:** Kopf nur bei title/actions; meta/actions gerendert; children im Body.
- **FormField:** Label + optional-Suffix; error hat Vorrang vor hint; control eingehängt.
- **Input:** `valid`→check-Icon, `error`→alert-Icon + Fehlerklasse; `onInput`/`onBlur`
  feuern; Wert gesetzt.
- **Select:** Optionen gerendert; chevron-Icon vorhanden; `value` vorgewählt; `onChange` feuert.
- **Radio:** radiogroup + je Option ein Radio; `value` markiert das richtige; `onChange`
  liefert den Wert.
- **Combobox:** Tippen filtert (≤8); ArrowDown/Enter wählt; Escape schließt; `onChange` mit
  Label; `.destroy()` meldet den document-Listener ab (danach kein Effekt mehr).
- **Modal:** `confirmModal` resolved true/false je Button; `chooseModal` resolved das
  gewählte Item bzw. null bei Abbruch; Escape schließt (dismissible); Fokus landet im Dialog;
  Overlay wird nach Schließen aus dem DOM entfernt; kein `innerHTML`.
- **components.css-Inhalt:** enthält `.rb-btn`, `.rb-alert`, `.rb-card`, `.rb-field`,
  `.rb-input`, `.rb-select`, `.rb-radio`, `.rb-combobox`, `.rb-modal`, `.rb-badge` und
  referenziert Tokens (`var(--color-primary-700)`, `var(--radius-md)`).
- **Bestehende Tests bleiben grün** (168) und **E2E** (4) unverändert — TP-B fügt nur
  isolierte Module hinzu, ändert keine bestehende Datei außer ggf. Test-Infrastruktur.

## ARC42 (Pflicht)

`docs/arc42/architecture.md` §8: den Design-System-Absatz um die Komponenten-Bibliothek
ergänzen (Factory-Muster, `rb-`-Klassen in `css/components.css`, Modal als intentionale
Ergänzung für den confirm/prompt-Ersatz, bewusst noch nicht global geladen).

## Definition of Done

- 10 Komponenten-Factories + `css/components.css` vorhanden, jede mit Unit-Tests (alle grün).
- Bestehende 168 Unit-Tests + 4 E2E grün; `npm run build` kompiliert.
- App weiterhin optisch **unverändert** (components.css nicht global geladen).
- ARC42 ergänzt.
- Kein `innerHTML`, keine CDN-Referenz in den neuen Dateien.
