# TP-Shell-Mobile/A11y

Macht die App-Shell (Header, Schritt-Tabs, Footer, Start-Screen) mobil tauglich und
WCAG-2.2-AA-konform. **Nur die Shell** — Screen-Inhalte (Views) bleiben unangetastet.
Behebt das gemeldete Problem: bei schmalen Screens laufen die 6 Tabs über den Rand
(gemessen: Tab-Leiste braucht 939 px, hat aber 278–333 px), scrollbar aber ohne Hinweis.

## Kontext & Grundlage

- **Gemessener Ist-Zustand** (Playwright, 320/375 px): `.shell-tabs` `scrollWidth=939` vs.
  `clientWidth=278` (@320) / `333` (@375) → unsichtbares Overflow. Seite selbst scrollt NICHT
  horizontal (`docScrollWidth == clientWidth`). Header-Padding 40 px je Seite frisst bei 320 px
  ein Viertel der Breite. Tab-Höhe 50 px (Target Size ok).
- **Design-System hat keine Responsive-Ausarbeitung** — der Prototyp nutzt nur `overflow-x:auto`.
  Diese Lücke wird hier geschlossen (eigene Design-Entscheidung, an den referenzierten Standards
  ausgerichtet).
- **Standards (belegt):** WCAG 2.2 AA — 1.4.10 Reflow (kein Zwei-Achsen-Scrollen @320 px),
  2.5.8 Target Size (≥ 24×24 px), 2.4.11 Focus Not Obscured (fokussierter Tab sichtbar).
  WCAG-3-Draft „User orientation" — „all steps listed", „current step indicated". Muster gewählt:
  **Badges-only** (alle 6 Schritte gleichzeitig sichtbar → erfüllt Reflow + „all steps listed").

## Umfang

**Enthalten (nur Shell, rein additiv per `@media`):**
1. **Tabs mobil (Badges-only)** — unter dem Breakpoint (≤ 640 px): die Labels der **inaktiven**
   Tabs ausblenden (nur Nummern-/Haken-Badge sichtbar); der **aktive** Tab zeigt sein Label. So
   passen alle 6 Badges ohne Scroll nebeneinander. Der Tab-**Button** bleibt Tap-Ziel ≥ 44 px
   (bereits erfüllt; im Mobil-Layout sicherstellen ≥ 24 px, faktisch 44).
2. **A11y-Labels** — jeder Tab bekommt ein `aria-label` mit dem **vollen Schrittnamen**, damit bei
   ausgeblendetem Sicht-Label der Name für Screenreader erhalten bleibt (Bedeutung nie nur über
   verkürzte Optik). Gilt Desktop wie Mobil.
3. **Seitenränder mobil** — Header/Tabs/Main/Footer von `40px`/`… 40px` auf `16px` unter dem
   Breakpoint (gewinnt 48 px auf 320 px zurück).
4. **Header mobil** — Titel-Skala/Umbruch so, dass „Schritt X von 5 · Y abgeschlossen" nicht
   abgeschnitten wird (Meta bricht unter den Titel).
5. **Footer mobil** — Buttons behalten 44 px Höhe; Padding reduziert.

**Nicht enthalten:** Screen-Inhalte/Views, `styles.css`-Ablösung (TP-F), die volle App-weite
WCAG-Durchsicht (bleibt TP4 für die Screens).

## Architektur / Dateien

```
css/components.css        @media (max-width:640px)-Block mit shell-* Mobil-Regeln (rein additiv)
js/ui/AppShell.js         je Tab ein aria-label (voller Schrittname) beim Bau setzen
js/ui/AppShell.test.js    Test: aria-label vorhanden/korrekt
test/components-css.test.js  Test: @media-Block + Badges-only-Regel vorhanden
e2e/mobile-shell.spec.js  NEU — Mobil-E2E: keine überlaufende Tab-Leiste @320px
docs/arc42/architecture.md §8 Zusatz
```

Keine neue Datei außer dem E2E-Spec; die Änderungen sind CSS (`@media`) + eine kleine
JS-Ergänzung (aria-label). Kein `innerHTML`.

### `css/components.css` — Mobil-Block (≤ 640 px)

Ein `@media (max-width: 640px)`-Block am Ende der Datei mit u.a.:
- `.shell-header`, `.shell-tabs`, `.shell-main`, `.shell-footer` → `padding` links/rechts `16px`
  (statt `40px`).
- `.shell-tab__label` → `display:none` (Labels ausblenden) …
- `.shell-tab--active .shell-tab__label` → `display:inline` (aktiver Tab zeigt Label).
- `.shell-tabs` → weiterhin flex, `gap` ggf. kleiner; da alle Badges schmal sind, entfällt der
  Scroll faktisch. `justify-content` so, dass die Badges gleichmäßig sitzen.
- `.shell-header__row` → bei Bedarf `flex-direction:column` (Meta unter Titel).
- Tab-Button behält ausreichende Tap-Fläche (Padding), Badge bleibt 20 px, Button ≥ 44 px hoch.

### `js/ui/AppShell.js` — aria-label je Tab

Beim Tab-Bau (in `_renderTabs`) erhält jeder Tab-`<button>` ein `aria-label`:
- Eingabeschritt: `"<Label>, Schritt <n> von <N>"` (z. B. „Arzt, Schritt 2 von 5").
- Utility: der Klartext-Name (z. B. „Gespeicherte Daten").
Das sichtbare Label bleibt zusätzlich als Textknoten (Desktop unverändert). Der Status
(done/attention) wird bereits über den Aufmerksamkeits-Punkt mit eigenem `aria-label`
kommuniziert; das Tab-`aria-label` beschreibt Name + Position.

## Datenfluss / Integration

- Rein CSS + eine Attribut-Ergänzung im Shell; kein Controller/View berührt.
- Der Breakpoint 640 px ist eine benannte Grenze (im CSS als Kommentar dokumentiert).
- Desktop-Verhalten (> 640 px) bleibt **unverändert** (visuell und in den bestehenden Tests).

## Fehlerbehandlung & Randfälle

- **Genau an der Grenze (640 px):** ≤ 640 → mobil, darüber Desktop.
- **Sehr viele/lange Schrittnamen:** durch Badges-only unkritisch (nur Badges + aktives Label).
- **Fokus-Sichtbarkeit (2.4.11):** die in TP-C eingebaute roving-Fokus-Führung scrollt den
  aktiven/fokussierten Tab in Sicht; im Badges-only-Modus sind ohnehin alle sichtbar.
- **Target Size (2.5.8):** Tab-Button bleibt ≥ 44 px hoch und ausreichend breit (Badge 20 px +
  Padding); nie auf den 20-px-Badge als alleiniges Tap-Ziel reduzieren.
- **Kein Verlust bei Screenreadern:** ausgeblendetes Sicht-Label wird durch `aria-label` ersetzt.

## Tests (Pflicht)

- **AppShell (unit, jsdom):** jeder Tab-Button trägt ein `aria-label`; für einen Eingabeschritt
  enthält es Name + „Schritt n von N" (z. B. „Arzt" und „2 von 5"); für die Utility den Namen
  „Gespeicherte Daten". Die bestehenden AppShell-Tests bleiben grün (Label-Textknoten unverändert).
- **components.css (Inhaltscheck):** Datei enthält `@media (max-width: 640px)` und darin eine
  Regel, die `.shell-tab__label` ausblendet (`display:none`) sowie eine, die `16px`-Padding für
  die Shell-Container setzt.
- **E2E (Playwright, `e2e/mobile-shell.spec.js`):** Viewport 320 px → Start-Screen → „Neu
  anfangen"; danach: `.shell-tabs` **überläuft nicht** (`scrollWidth <= clientWidth + 1`), alle
  6 `[role=tab]` sind im Viewport (rechte Kante ≤ Fensterbreite), keine horizontale Seiten-
  Scrollbar (`document.scrollWidth <= innerWidth + 1`). Zusätzlich 375 px als zweiter Fall.
- **Bestehende Tests grün:** die 253 Unit-Tests und die 4 bestehenden E2E-Flows (Desktop-Viewport)
  bleiben unverändert grün.

## ARC42 (Pflicht)

`docs/arc42/architecture.md` §8: Zusatz zum App-Shell-Absatz: „Shell responsiv/WCAG 2.2 AA:
Schritt-Tabs mobil als Badges-only (≤ 640 px), volle Schrittnamen als aria-label, 16-px-Ränder,
Reflow ohne horizontales Scrollen; Standards 1.4.10/2.5.8/2.4.11 + WCAG-3-Draft ‚all steps
listed'. Volle App-weite A11y-Durchsicht bleibt TP4."

## Definition of Done

- `@media`-Mobil-Block in `css/components.css`; Tabs mobil badges-only, alle 6 sichtbar.
- Jeder Tab hat ein `aria-label` mit vollem Schrittnamen.
- Neue Unit- + E2E-Tests grün; 253 bestehende + 4 E2E grün; `npm run build` kompiliert.
- Kein `innerHTML`; Desktop-Optik unverändert.
- ARC42 ergänzt.

## Später (nicht in diesem Umfang)

Volle WCAG-2.2-AA-Durchsicht der **Screens** (Views) — Teil von TP4, sobald die Screens in
TP-D–F auf Komponenten umgestellt sind.
