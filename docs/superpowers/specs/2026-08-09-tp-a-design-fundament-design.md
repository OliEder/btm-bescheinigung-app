# TP-A · Design-Fundament

Teil A des Redesigns auf das *Reisebescheinigung Design System* (Claude-Design-Handoff).
Legt die technische Grundlage: Design-Tokens, selbst-gehostete Schriften, ein lokales
Icon-Modul und DOM-Hilfsfunktionen. **Keine sichtbare Änderung an den bestehenden Screens** —
nur Infrastruktur, auf der TP-B (Komponenten) und TP-C–F (Shell + Screens) aufbauen.

## Kontext & Leitentscheidung

Die App bleibt Vanilla-JS-MVC. Die JSX-Prototypen im Handoff sind Referenz für das
*visuelle Ergebnis*, nicht zum Portieren (so der Handoff-README: „recreate them
pixel-perfectly in whatever technology makes sense … don't copy the prototype's internal
structure"). Der Schnitt: alle DOM-Bindung lebt in den Views; Controller/Models bleiben
unberührt.

Die App ist eine PWA und verarbeitet Gesundheits-/BtM-Daten. Deshalb **keine Laufzeit-
Abhängigkeit zu Fremd-CDNs**: Icons und Fonts werden lokal gebündelt (kein unpkg, kein
Google-Fonts-Request).

## Umfang von TP-A

**Enthalten:**
1. **Design-Tokens als CSS** — 1:1 aus dem Design-System übernommen (Werte unverändert):
   `colors`, `spacing`, `typography`, `elevation`, `motion`, `base`.
2. **Selbst-gehostete Schriften** — Libre Caslon Text (Display) + Work Sans (Body),
   als `@font-face` mit lokalen Dateien; `fonts.css` **ohne** Google-Import.
3. **Lokales Icon-Modul** (`js/ui/Icon.js`) — die im Design genutzten Lucide-SVGs
   (MIT) als Konstanten, ohne Netz-Fetch.
4. **DOM-Helfer** (`js/ui/dom.js`) — `el()`, `on()`, `clear()`, `text()`; bauen DOM per
   `createElement`/`textContent`, **nie** per `innerHTML` (respektiert den PreToolUse-Hook
   und escaped Nutzereingaben von Natur aus).
5. **Verdrahtung** — die neuen Token-Stylesheets werden in `js/app.js` importiert
   (Webpack-Pfad, `style-loader`), **zusätzlich** zum bestehenden `css/styles.css`.
   Der alte Lila-Look bleibt vorerst aktiv (wird erst in TP-F entfernt).
6. **Hygiene** — der lokale Handoff-Ordner + Zip werden `.gitignore`-t (Referenz, kein
   App-Code).

**Nicht enthalten (spätere TP):**
- Vanilla-Komponenten (Button, Card, Tabs …) → TP-B.
- Sichtbare Umgestaltung von Shell/Screens → TP-C–F.
- Entfernen von `css/styles.css` → TP-F.

## Architektur / neue Dateien

```
css/tokens/
  colors.css        # Farb-Variablen (Navy/Tan-Palette)
  spacing.css       # --space-*, --content-max, --shell-max
  typography.css    # --text-*, --leading-*, --tracking-*, --weight-*
  elevation.css     # --radius-*, --shadow-*, --border-width
  motion.css        # --ease-*, --duration-*, prefers-reduced-motion
  fonts.css         # @font-face (lokal), --font-display, --font-body
  base.css          # Reset + Grundtypografie + :focus-visible (Accent-Ring)
  index.css         # @import der obigen in fester Reihenfolge
assets/fonts/       # .woff2 (Libre Caslon Text 400/700/400i, Work Sans 400/500/600/700/400i)
js/ui/
  Icon.js           # export function icon(name, {size, color, label}) -> HTMLElement
  Icon.test.js
  dom.js            # el(), on(), clear(), text()
  dom.test.js
```

### Token-Werte (Quelle: Design-System, unverändert übernommen)

Die Werte werden wörtlich aus dem Handoff übernommen — u.a.:
- Primär: `--color-primary-700:#1d3a5f`, `--color-primary-50:#f2f5f9` …
- Akzent: `--color-accent-600:#b5763a`; `--color-focus-ring:#b5763a`.
- Semantik: success `#2f6b4f`, danger `#a3342a`, warning `#b5763a`, info `#2c5384`.
- Flächen: `--color-bg:#faf9f6`, `--color-surface:#ffffff`, `--color-border:#dfe2e6`.
- Spacing 4–96px-Skala; `--content-max:840px`, `--shell-max:1180px`.
- Typo: `--font-display: 'Libre Caslon Text', …serif`, `--font-body: 'Work Sans', …sans`.
- Elevation: `--radius-sm:4px`; drei Schatten; `--border-width:1px`.
- Motion: zwei Easings, drei Dauern, `prefers-reduced-motion`-Block.

Abweichung zum Prototyp: `fonts.css` enthält **keinen** `@import url(google…)`, sondern
lokale `@font-face`-Regeln auf `assets/fonts/*.woff2`.

### `js/ui/Icon.js`

- `icon(name, opts) -> HTMLElement`: ein `<span role="presentation" aria-hidden>` (bzw.
  `role="img"` + `aria-label`, wenn `label` gesetzt), das ein inline-`<svg>` enthält.
- Die SVG-Pfaddaten liegen als Objekt `ICONS` im Modul (Lucide-Pfade, `stroke="currentColor"`,
  `width/height/viewBox 24`). Recoloring = `color` auf dem Wrapper.
- Unbekannter Name → leeres, unsichtbares `<span>` (kein Wurf, kein Crash).
- **Kein** `innerHTML`: das SVG wird per `createElementNS`/`document.createElement` oder
  einem geparsten Template zusammengesetzt. (Konkrete Bau-Technik siehe Plan; entscheidend
  ist: hook-konform und ohne CDN.)
- Icon-Set (definitiv aus Screens/Komponenten erhoben, **25 Namen**):
  `alert-circle, arrow-left, arrow-right, check, check-circle, check-circle-2,
  chevron-down, circle-x, database, download, file-cog, file-text, folder-open, info,
  link, pill, plane, plus, save, search, stethoscope, trash-2, triangle-alert, upload,
  user`.

### `js/ui/dom.js`

- `el(tag, props?, children?)` → `HTMLElement`. `props`: `class`/`className`, `style`
  (Objekt), `on{Event}` oder `{ on: {event: handler} }`, sonstige Attribute per
  `setAttribute`. Textkinder via `textContent`; Element-Kinder per `appendChild`.
- `on(node, event, handler)` → Abmelde-Funktion.
- `clear(node)` → entfernt alle Kindknoten.
- `text(node, value)` → setzt `textContent`.
- Zweck: schrittweiser Ersatz der Template-String-Views, ohne `innerHTML`.

## Datenfluss / Integration

- `js/app.js` importiert `../css/tokens/index.css` **vor** `../css/styles.css`.
  Solange TP-A läuft, gewinnt bei Konflikten weiterhin der alte Look (bewusst — die App
  soll unverändert aussehen). Token-Variablen sind reine Custom-Properties und
  überschreiben nichts Bestehendes.
- Der legacy `index.html` (nicht-gebündelter Direktpfad) wird in TP-A **nicht** angefasst;
  Build- und E2E-Pfad laufen über `src/index.template.html` + Webpack.

## Fehlerbehandlung & Randfälle

- **Fehlende Font-Datei:** `@font-face` fällt über die Fallback-Kette (`Georgia`/System-Sans)
  zurück; kein Layout-Bruch.
- **Unbekannter Icon-Name:** leeres `<span>` (s.o.).
- **`prefers-reduced-motion`:** Motion-Token-Datei deaktiviert Transitions/Animationen.
- **innerHTML-Hook:** alle neuen Bau-Funktionen nutzen DOM-APIs, kein `innerHTML`.

## Tests (Pflicht)

- **`js/ui/dom.test.js`** (Vitest/jsdom):
  - `el` setzt Tag, Klassen, Style-Objekt, Attribute korrekt.
  - `el` hängt String- **und** Element-Kinder an; String-Kinder landen als `textContent`
    (Escaping-Nachweis: `<script>` erscheint als Text, nicht als Knoten).
  - `on` liefert funktionierende Abmelde-Funktion; `clear`/`text` wirken.
- **`js/ui/Icon.test.js`** (Vitest/jsdom):
  - `icon('user')` liefert ein `<span>` mit einem `<svg>`-Kind der gewünschten Größe.
  - `label` → `role="img"` + `aria-label`; ohne `label` → `aria-hidden="true"`.
  - `color` wird auf den Wrapper gesetzt.
  - unbekannter Name → leeres `<span>`, kein Wurf.
  - alle 25 Namen sind vorhanden (Tabelle vollständig).
- **CSS-Smoke** (leichtgewichtig): ein Test importiert `js/app.js`-Nebenwirkungen nicht
  (zu schwer in jsdom); stattdessen prüft ein Test, dass `css/tokens/index.css`
  existiert und die Kern-Variablen (`--color-primary-700`, `--font-display`,
  `--space-4`) als Text enthält. (Reiner Datei-Inhaltscheck — kein Browser nötig.)
- **Bestehende Tests bleiben grün:** die 145 Unit-Tests und die 4 Playwright-E2E-Flows
  laufen unverändert (TP-A ändert kein Verhalten und kein sichtbares Markup).

## ARC42 (Pflicht)

`docs/arc42/architecture.md` erhält einen neuen Abschnitt **„UI-Schicht: Design-System-
Fundament"**, der dokumentiert:
- Token-Layer (Custom-Properties, Herkunft aus dem Claude-Design-Handoff),
- Strategie „lokale Assets statt CDN" (Datenschutz/Offline-Begründung),
- Icon-Modul + DOM-Helfer als Bausteine für die kommenden TP,
- den bewussten Übergangszustand (neue Tokens neben altem `styles.css`).

## Definition of Done

- Neue Token-CSS + lokale Fonts + `Icon.js` + `dom.js` vorhanden und in `js/app.js`
  verdrahtet.
- Alle neuen Unit-Tests grün; die 145 bestehenden Unit-Tests grün; die 4 E2E-Flows grün.
- `npm run build` kompiliert; App sieht **unverändert** aus (alter Lila-Look aktiv).
- ARC42-Abschnitt ergänzt.
- Handoff-Bundle ge-`.gitignore`-t.
