# TP-A · Design-Fundament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Legt das technische Fundament des Redesigns (Design-Tokens als CSS, lokale Fonts, lokales Lucide-Icon-Modul, DOM-Helfer) — ohne sichtbare Änderung an den bestehenden Screens.

**Architecture:** Token-Werte werden 1:1 aus dem Claude-Design-Handoff übernommen und über `js/app.js` (Webpack `style-loader`) neben dem bestehenden `css/styles.css` geladen. Icons werden aus dem `lucide-static`-npm-Paket zur Build-Zeit in ein Daten-Modul generiert und zur Laufzeit per `DOMParser` (kein `innerHTML`) zu `<svg>` gebaut. Fonts werden als `.woff2` selbst gehostet. DOM-Helfer bereiten den schrittweisen Ersatz der Template-String-Views vor.

**Tech Stack:** Vanilla JS (ES-Module), Webpack 5 (`style-loader`/`css-loader`), Vitest + jsdom, `lucide-static@0.462.0` (devDependency), selbst-gehostete Fonts.

---

## Datei-Struktur

**Neu:**
```
css/tokens/colors.css          # Farb-Custom-Properties (verbatim aus DS)
css/tokens/spacing.css         # --space-*, --content-max, --shell-max
css/tokens/typography.css      # --text-*, --leading-*, --tracking-*, --weight-*
css/tokens/elevation.css       # --radius-*, --shadow-*, --border-width
css/tokens/motion.css          # --ease-*, --duration-*, reduced-motion
css/tokens/fonts.css           # @font-face (lokal) + --font-display/--font-body
css/tokens/base.css            # Reset + Grundtypografie + :focus-visible
css/tokens/index.css           # @import der obigen in fester Reihenfolge
assets/fonts/*.woff2           # Libre Caslon Text + Work Sans (selbst gehostet)
scripts/generate-icons.mjs     # liest lucide-static → schreibt js/ui/icon-data.js
js/ui/icon-data.js             # generiert: { name: 'innerSVG', ... } (25 Icons)
js/ui/Icon.js                  # icon(name, opts) -> HTMLElement (DOMParser, kein innerHTML)
js/ui/Icon.test.js
js/ui/dom.js                   # el(), on(), clear(), text()
js/ui/dom.test.js
test/tokens.test.js            # Datei-Inhaltscheck der Kern-Variablen
```

**Modifiziert:**
- `js/app.js:2` — Import von `../css/tokens/index.css` **vor** `../css/styles.css`.
- `package.json` — devDependency `lucide-static@0.462.0`, Script `generate:icons`.
- `docs/arc42/architecture.md` — Abschnitt „UI-Schicht: Design-System-Fundament".

---

## Task 1: Design-Tokens als CSS (verbatim aus dem Handoff)

**Files:**
- Create: `css/tokens/colors.css`, `css/tokens/spacing.css`, `css/tokens/typography.css`, `css/tokens/elevation.css`, `css/tokens/motion.css`, `css/tokens/base.css`, `css/tokens/index.css`
- Test: `test/tokens.test.js`

- [ ] **Step 1: Write the failing test**

`test/tokens.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

describe('Design-Tokens', () => {
  it('colors.css enthält die Kern-Primärfarbe', () => {
    expect(read('css/tokens/colors.css')).toContain('--color-primary-700:#1d3a5f');
  });
  it('colors.css setzt den Accent-Focus-Ring', () => {
    expect(read('css/tokens/colors.css')).toContain('--color-focus-ring:#b5763a');
  });
  it('spacing.css enthält Skala und Layout-Breiten', () => {
    const s = read('css/tokens/spacing.css');
    expect(s).toContain('--space-4:16px');
    expect(s).toContain('--content-max:840px');
    expect(s).toContain('--shell-max:1180px');
  });
  it('typography.css enthält Textskala und Gewichte', () => {
    const t = read('css/tokens/typography.css');
    expect(t).toContain('--text-2xl:2.25rem');
    expect(t).toContain('--weight-semibold:600');
  });
  it('elevation.css enthält Radien und Schatten', () => {
    expect(read('css/tokens/elevation.css')).toContain('--radius-sm:4px');
  });
  it('motion.css respektiert prefers-reduced-motion', () => {
    expect(read('css/tokens/motion.css')).toContain('prefers-reduced-motion');
  });
  it('base.css setzt einen 3px Focus-Ring', () => {
    expect(read('css/tokens/base.css')).toContain('outline:3px solid var(--color-focus-ring)');
  });
  it('index.css importiert alle Token-Dateien', () => {
    const i = read('css/tokens/index.css');
    for (const f of ['fonts', 'colors', 'spacing', 'typography', 'elevation', 'motion', 'base']) {
      expect(i).toContain(`${f}.css`);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tokens.test.js`
Expected: FAIL (ENOENT — Dateien existieren noch nicht).

- [ ] **Step 3: Create the token files (Werte 1:1 aus dem Handoff)**

`css/tokens/colors.css`:
```css
:root{
--color-primary-900:#0d1b2e;--color-primary-800:#122840;--color-primary-700:#1d3a5f;--color-primary-600:#2c5384;--color-primary-500:#3f6ba3;--color-primary-100:#e6ecf3;--color-primary-50:#f2f5f9;
--color-accent-700:#8f5a28;--color-accent-600:#b5763a;--color-accent-100:#f3e6d6;--color-accent-50:#faf3ea;
--color-ink-900:#1a2333;--color-ink-700:#3d4657;--color-ink-500:#6b7280;--color-ink-300:#c3c9d1;--color-ink-200:#dde1e6;--color-ink-100:#eceef1;
--color-bg:#faf9f6;--color-surface:#ffffff;--color-border:#dfe2e6;
--color-success-700:#22513c;--color-success-600:#2f6b4f;--color-success-100:#e3efe8;
--color-danger-700:#7c261e;--color-danger-600:#a3342a;--color-danger-100:#f5e5e3;
--color-warning-700:#8f5a28;--color-warning-600:#b5763a;--color-warning-100:#f3e6d6;
--color-info-700:#122840;--color-info-600:#2c5384;--color-info-100:#e6ecf3;
--color-focus-ring:#b5763a;
--text-body:var(--color-ink-900);--text-muted:var(--color-ink-500);--text-inverse:#ffffff;
--surface-page:var(--color-bg);--surface-card:var(--color-surface);--surface-sunken:var(--color-primary-50);
--border-default:var(--color-border);--border-strong:var(--color-ink-300);
}
```

`css/tokens/spacing.css`:
```css
:root{
--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-8:32px;--space-10:40px;--space-12:48px;--space-16:64px;--space-20:80px;--space-24:96px;
--content-max:840px;--shell-max:1180px;
}
```

`css/tokens/typography.css`:
```css
:root{
--text-xs:0.75rem;--text-sm:0.875rem;--text-base:1rem;--text-md:1.125rem;--text-lg:1.375rem;--text-xl:1.75rem;--text-2xl:2.25rem;--text-3xl:2.875rem;
--leading-tight:1.15;--leading-snug:1.35;--leading-normal:1.6;
--tracking-wide:0.06em;--tracking-wider:0.1em;
--weight-regular:400;--weight-medium:500;--weight-semibold:600;--weight-bold:700;
}
```

`css/tokens/elevation.css`:
```css
:root{
--radius-sm:4px;--radius-md:8px;--radius-lg:12px;--radius-full:999px;
--shadow-sm:0 1px 2px rgba(26,35,51,0.07);--shadow-md:0 4px 16px rgba(26,35,51,0.08);--shadow-lg:0 16px 40px rgba(26,35,51,0.12);
--border-width:1px;
}
```

`css/tokens/motion.css`:
```css
:root{
--ease-standard:cubic-bezier(0.4,0,0.2,1);
--ease-out:cubic-bezier(0,0,0.2,1);
--duration-fast:120ms;
--duration-base:200ms;
--duration-slow:320ms;
}
@media (prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
```

`css/tokens/base.css`:
```css
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--font-body);color:var(--text-body);background:var(--surface-page);font-size:var(--text-base);line-height:var(--leading-normal)}
h1,h2,h3,h4{font-family:var(--font-display);font-weight:var(--weight-regular);line-height:var(--leading-tight);margin:0;color:var(--color-ink-900)}
p{margin:0}
a{color:var(--color-primary-700);text-decoration-thickness:1px;text-underline-offset:2px}
a:hover{color:var(--color-primary-900)}
button,input,select,textarea{font-family:inherit;font-size:inherit;color:inherit}
:focus-visible{outline:3px solid var(--color-focus-ring);outline-offset:2px;border-radius:var(--radius-sm)}
```

`css/tokens/index.css` (fonts zuerst, base zuletzt):
```css
@import './fonts.css';
@import './colors.css';
@import './spacing.css';
@import './typography.css';
@import './elevation.css';
@import './motion.css';
@import './base.css';
```

> **Hinweis:** `fonts.css` wird in Task 2 erstellt; `index.css` verweist bereits darauf. Der Token-Test prüft nur die anderen Dateien + dass `index.css` alle Namen nennt.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tokens.test.js`
Expected: PASS (8 Tests).

- [ ] **Step 5: Commit**

```bash
git add css/tokens/ test/tokens.test.js
git commit -m "TP-A: Design-Tokens als CSS (verbatim aus Handoff)"
```

---

## Task 2: Selbst-gehostete Fonts

**Files:**
- Create: `assets/fonts/*.woff2` (heruntergeladen), `css/tokens/fonts.css`
- Modify: (kein Test-Code — Binärdateien; Prüfung über Task-1-`index.css`-Test)

- [ ] **Step 1: Fonts als woff2 herunterladen**

Google liefert bei woff2-fähigem User-Agent `.woff2`. Lade Work Sans (400/500/600/700 + 400 italic) und Libre Caslon Text (400/700 + 400 italic) herunter und speichere sie unter `assets/fonts/` mit sprechenden Namen.

Run:
```bash
mkdir -p assets/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

fetch_family () {
  local fam="$1"; local out="$2"
  curl -s -H "User-Agent: $UA" "https://fonts.googleapis.com/css2?family=${fam}&display=swap" \
    | grep -oE "https://[^)]+\.woff2" | sort -u | while read -r url; do echo "$url"; done
}

# URLs einsammeln und je Gewicht/Stil benennen (manuell zuordnen, s. Ausgabe):
fetch_family "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" ws
fetch_family "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400" lct
```

Speichere die woff2 als:
`worksans-400.woff2`, `worksans-500.woff2`, `worksans-600.woff2`, `worksans-700.woff2`, `worksans-400i.woff2`, `librecaslontext-400.woff2`, `librecaslontext-700.woff2`, `librecaslontext-400i.woff2` (Reihenfolge der URLs entspricht der `@font-face`-Reihenfolge in der CSS2-Antwort: normal 400,500,600,700 dann italic 400).

Verifikation:
```bash
ls -la assets/fonts/ && file assets/fonts/worksans-400.woff2
```
Expected: 8 `.woff2`-Dateien, `file` meldet „Web Open Font Format (Version 2)".

- [ ] **Step 2: fonts.css schreiben (lokal, kein Google-Import)**

`css/tokens/fonts.css`:
```css
/* Body: Work Sans */
@font-face{font-family:'Work Sans';font-style:normal;font-weight:400;font-display:swap;src:url('../../assets/fonts/worksans-400.woff2') format('woff2')}
@font-face{font-family:'Work Sans';font-style:normal;font-weight:500;font-display:swap;src:url('../../assets/fonts/worksans-500.woff2') format('woff2')}
@font-face{font-family:'Work Sans';font-style:normal;font-weight:600;font-display:swap;src:url('../../assets/fonts/worksans-600.woff2') format('woff2')}
@font-face{font-family:'Work Sans';font-style:normal;font-weight:700;font-display:swap;src:url('../../assets/fonts/worksans-700.woff2') format('woff2')}
@font-face{font-family:'Work Sans';font-style:italic;font-weight:400;font-display:swap;src:url('../../assets/fonts/worksans-400i.woff2') format('woff2')}
/* Display: Libre Caslon Text */
@font-face{font-family:'Libre Caslon Text';font-style:normal;font-weight:400;font-display:swap;src:url('../../assets/fonts/librecaslontext-400.woff2') format('woff2')}
@font-face{font-family:'Libre Caslon Text';font-style:normal;font-weight:700;font-display:swap;src:url('../../assets/fonts/librecaslontext-700.woff2') format('woff2')}
@font-face{font-family:'Libre Caslon Text';font-style:italic;font-weight:400;font-display:swap;src:url('../../assets/fonts/librecaslontext-400i.woff2') format('woff2')}
:root{--font-display:'Libre Caslon Text',Georgia,'Times New Roman',serif;--font-body:'Work Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
```

- [ ] **Step 3: Verify build resolves font URLs**

Run: `npx webpack --mode production 2>&1 | tail -20`
Expected: kompiliert ohne „Module not found"-Fehler zu den woff2 (css-loader löst die `url()` auf). Falls css-loader die Fonts nicht als Assets emittiert, ist das für TP-A unkritisch (Fonts werden erst ab TP-C sichtbar aktiv) — der Build darf aber nicht brechen.

- [ ] **Step 4: Commit**

```bash
git add assets/fonts css/tokens/fonts.css
git commit -m "TP-A: Work Sans + Libre Caslon Text selbst gehostet (woff2, kein CDN)"
```

---

## Task 3: DOM-Helfer (`js/ui/dom.js`)

**Files:**
- Create: `js/ui/dom.js`, `js/ui/dom.test.js`

- [ ] **Step 1: Write the failing test**

`js/ui/dom.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { el, on, clear, text } from './dom.js';

describe('dom.el', () => {
  it('erzeugt Element mit Tag, Klasse und Attributen', () => {
    const node = el('button', { class: 'btn', type: 'button', 'aria-label': 'x' });
    expect(node.tagName).toBe('BUTTON');
    expect(node.className).toBe('btn');
    expect(node.getAttribute('type')).toBe('button');
    expect(node.getAttribute('aria-label')).toBe('x');
  });
  it('akzeptiert className-Alias und Style-Objekt', () => {
    const node = el('div', { className: 'a', style: { color: 'red', marginTop: '4px' } });
    expect(node.className).toBe('a');
    expect(node.style.color).toBe('red');
    expect(node.style.marginTop).toBe('4px');
  });
  it('hängt String-Kinder als textContent an (Escaping)', () => {
    const node = el('div', {}, ['<script>alert(1)</script>']);
    expect(node.childNodes.length).toBe(1);
    expect(node.querySelector('script')).toBeNull();
    expect(node.textContent).toBe('<script>alert(1)</script>');
  });
  it('hängt Element-Kinder an', () => {
    const child = el('span', {}, ['hi']);
    const node = el('div', {}, [child]);
    expect(node.firstChild).toBe(child);
    expect(node.textContent).toBe('hi');
  });
  it('bindet Event-Handler über on{Event}', () => {
    const fn = vi.fn();
    const node = el('button', { onClick: fn });
    node.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('dom.on/clear/text', () => {
  it('on liefert funktionierende Abmelde-Funktion', () => {
    const fn = vi.fn();
    const node = el('button');
    const off = on(node, 'click', fn);
    node.click();
    off();
    node.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('clear entfernt alle Kinder', () => {
    const node = el('div', {}, [el('span'), el('span')]);
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });
  it('text setzt textContent', () => {
    const node = el('div');
    text(node, 'hallo');
    expect(node.textContent).toBe('hallo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run js/ui/dom.test.js`
Expected: FAIL (Modul `./dom.js` nicht gefunden).

- [ ] **Step 3: Implement `js/ui/dom.js`**

```js
// Kleine DOM-Fabrik ohne innerHTML: baut Knoten per createElement/textContent,
// escaped Nutzereingaben von Natur aus und respektiert den PreToolUse-innerHTML-Hook.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null) continue;
    if (key === 'class' || key === 'className') {
      node.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'on' && typeof value === 'object') {
      for (const [ev, handler] of Object.entries(value)) node.addEventListener(ev, handler);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function on(node, event, handler) {
  node.addEventListener(event, handler);
  return () => node.removeEventListener(event, handler);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function text(node, value) {
  node.textContent = value == null ? '' : String(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run js/ui/dom.test.js`
Expected: PASS (8 Tests).

- [ ] **Step 5: Commit**

```bash
git add js/ui/dom.js js/ui/dom.test.js
git commit -m "TP-A: DOM-Helfer (el/on/clear/text) ohne innerHTML"
```

---

## Task 4: Icon-Generator + Daten-Modul

**Files:**
- Modify: `package.json` (devDependency `lucide-static@0.462.0`, Script `generate:icons`)
- Create: `scripts/generate-icons.mjs`, `js/ui/icon-data.js` (generiert)

- [ ] **Step 1: lucide-static als devDependency installieren**

Run:
```bash
npm install --save-dev lucide-static@0.462.0
```
Expected: `package.json` listet `lucide-static` unter devDependencies; `node_modules/lucide-static/icons/user.svg` existiert.

- [ ] **Step 2: Generator schreiben**

`scripts/generate-icons.mjs`:
```js
// Liest die im Design genutzten Lucide-SVGs (MIT/ISC) aus dem lucide-static-Paket
// und schreibt sie als Daten-Map nach js/ui/icon-data.js. Nur der innere Markup
// (Pfade/Kreise) wird gespeichert; Größe/Farbe setzt Icon.js zur Laufzeit.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = resolve(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const OUT = resolve(__dirname, '..', 'js', 'ui', 'icon-data.js');

const NAMES = [
  'alert-circle', 'arrow-left', 'arrow-right', 'check', 'check-circle',
  'check-circle-2', 'chevron-down', 'circle-x', 'database', 'download',
  'file-cog', 'file-text', 'folder-open', 'info', 'link', 'pill', 'plane',
  'plus', 'save', 'search', 'stethoscope', 'trash-2', 'triangle-alert',
  'upload', 'user',
];

function innerSvg(svg) {
  // Kommentar-Lizenzzeile + <svg …>-Hülle entfernen, nur den Kindmarkup behalten.
  const body = svg.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[\s\S]*?>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
    .replace(/\s+/g, ' ');
  return body;
}

const entries = NAMES.map((name) => {
  const svg = readFileSync(resolve(ICON_DIR, `${name}.svg`), 'utf8');
  return `  '${name}': ${JSON.stringify(innerSvg(svg))},`;
});

const out = `// GENERIERT von scripts/generate-icons.mjs — nicht von Hand bearbeiten.\n` +
  `// Quelle: lucide-static@0.462.0 (ISC). Regenerieren: npm run generate:icons\n` +
  `export const ICON_DATA = {\n${entries.join('\n')}\n};\n`;

writeFileSync(OUT, out);
console.log(`icon-data.js geschrieben: ${NAMES.length} Icons.`);
```

- [ ] **Step 3: package.json-Script ergänzen**

In `package.json` unter `"scripts"` hinzufügen:
```json
"generate:icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 4: Generator ausführen**

Run: `npm run generate:icons`
Expected: Ausgabe „icon-data.js geschrieben: 25 Icons."; Datei `js/ui/icon-data.js` existiert und enthält `'user':` und `'plane':`.

Verifikation:
```bash
grep -c "':" js/ui/icon-data.js
```
Expected: `25`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/generate-icons.mjs js/ui/icon-data.js
git commit -m "TP-A: Icon-Generator + generiertes icon-data.js (25 Lucide-Icons, lokal)"
```

---

## Task 5: Icon-Modul (`js/ui/Icon.js`)

**Files:**
- Create: `js/ui/Icon.js`, `js/ui/Icon.test.js`

- [ ] **Step 1: Write the failing test**

`js/ui/Icon.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { icon } from './Icon.js';
import { ICON_DATA } from './icon-data.js';

describe('icon()', () => {
  it('liefert ein span mit svg-Kind der gewünschten Größe', () => {
    const node = icon('user', { size: 18 });
    expect(node.tagName).toBe('SPAN');
    const svg = node.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
  });
  it('setzt die Wrapper-Farbe', () => {
    const node = icon('plane', { color: 'var(--color-primary-700)' });
    expect(node.style.color).toBe('var(--color-primary-700)');
  });
  it('mit label: role=img + aria-label', () => {
    const node = icon('info', { label: 'Hinweis' });
    expect(node.getAttribute('role')).toBe('img');
    expect(node.getAttribute('aria-label')).toBe('Hinweis');
  });
  it('ohne label: aria-hidden', () => {
    const node = icon('info');
    expect(node.getAttribute('aria-hidden')).toBe('true');
  });
  it('unbekannter Name: leeres span, kein Wurf', () => {
    const node = icon('gibtsnicht');
    expect(node.tagName).toBe('SPAN');
    expect(node.querySelector('svg')).toBeNull();
  });
  it('alle 25 Icons sind vorhanden', () => {
    expect(Object.keys(ICON_DATA).length).toBe(25);
    for (const name of ['alert-circle','arrow-left','arrow-right','check','check-circle','check-circle-2','chevron-down','circle-x','database','download','file-cog','file-text','folder-open','info','link','pill','plane','plus','save','search','stethoscope','trash-2','triangle-alert','upload','user']) {
      expect(ICON_DATA[name]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run js/ui/Icon.test.js`
Expected: FAIL (Modul `./Icon.js` nicht gefunden).

- [ ] **Step 3: Implement `js/ui/Icon.js` (DOMParser, kein innerHTML)**

```js
import { ICON_DATA } from './icon-data.js';

// Baut ein inline-<svg> aus den gespeicherten Lucide-Pfaden. Kein innerHTML:
// der gespeicherte Markup wird per DOMParser (SVG-Namespace) zu echten Knoten
// geparst und angehängt. Lucide-SVGs nutzen stroke="currentColor", deshalb
// genügt die color-Eigenschaft am Wrapper zum Umfärben.
const SVG_NS = 'http://www.w3.org/2000/svg';

function buildSvg(inner, size) {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
    'image/svg+xml'
  );
  return doc.documentElement;
}

export function icon(name, opts = {}) {
  const { size = 20, color = 'currentColor', label } = opts;
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.flexShrink = '0';
  span.style.color = color;
  if (label) {
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', label);
  } else {
    span.setAttribute('aria-hidden', 'true');
  }
  const inner = ICON_DATA[name];
  if (inner) span.appendChild(buildSvg(inner, size));
  return span;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run js/ui/Icon.test.js`
Expected: PASS (6 Tests).

> **jsdom-Hinweis:** jsdom stellt `DOMParser` mit `image/svg+xml` bereit; `documentElement` ist das `<svg>`. Falls ein `<parsererror>` erschiene (bei valider Eingabe nicht der Fall), würde `querySelector('svg')` im Fehlerfall trotzdem korrekt greifen, weil wir das svg direkt anhängen.

- [ ] **Step 5: Commit**

```bash
git add js/ui/Icon.js js/ui/Icon.test.js
git commit -m "TP-A: Icon-Modul (icon() baut inline-SVG per DOMParser, kein innerHTML)"
```

---

## Task 6: Tokens in die App verdrahten

**Files:**
- Modify: `js/app.js:2`

- [ ] **Step 1: Token-Import vor styles.css einfügen**

In `js/app.js` die bestehende Zeile
```js
import '../css/styles.css';
```
ersetzen durch (Tokens zuerst, damit Custom-Properties definiert sind, alter Look bleibt aktiv):
```js
import '../css/tokens/index.css';
import '../css/styles.css';
```

- [ ] **Step 2: Build prüfen**

Run: `npx webpack --mode production 2>&1 | tail -15`
Expected: kompiliert ohne Fehler; `index.css`-`@import`s werden von css-loader aufgelöst.

- [ ] **Step 3: Optischer Nicht-Regressions-Check (manuell, kurz)**

Run: `npm run e2e -- e2e/smoke.spec.js`
Expected: PASS — Startschirm sichtbar, App unverändert lauffähig (Tokens ändern die Optik noch nicht).

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "TP-A: Design-Tokens neben bestehendem styles.css laden (Übergangszustand)"
```

---

## Task 7: ARC42-Dokumentation

**Files:**
- Modify: `docs/arc42/architecture.md`

- [ ] **Step 1: Abschnitt „UI-Schicht: Design-System-Fundament" ergänzen**

Am Ende des Bausteine-/Konzept-Kapitels folgenden Abschnitt einfügen:
```markdown
## UI-Schicht: Design-System-Fundament (TP-A)

Das Redesign auf das *Reisebescheinigung Design System* (Claude-Design-Handoff)
wird schrittweise umgesetzt. TP-A legt das Fundament ohne sichtbare Änderung:

- **Design-Tokens** (`css/tokens/*.css`): Farb-, Spacing-, Typografie-, Elevation-
  und Motion-Variablen als CSS-Custom-Properties, Werte 1:1 aus dem Handoff.
  Geladen über `js/app.js` neben dem (noch aktiven) `css/styles.css`.
- **Lokale Assets statt CDN**: Icons (Lucide, ISC) werden aus `lucide-static` zur
  Build-Zeit in `js/ui/icon-data.js` generiert; Fonts (Work Sans, Libre Caslon
  Text) werden als `.woff2` selbst gehostet. Grund: die App ist eine Gesundheits-/
  BtM-PWA — keine Laufzeit-Requests an Fremd-CDNs (Datenschutz, Offline-Fähigkeit).
- **Bausteine für kommende TP**: `js/ui/Icon.js` (`icon()` baut inline-SVG per
  DOMParser, ohne `innerHTML`) und `js/ui/dom.js` (`el/on/clear/text`) bereiten den
  schrittweisen Ersatz der Template-String-Views vor.
- **Übergangszustand**: Neue Tokens liegen neben dem alten Lila-Look; die Optik
  kippt erst ab TP-C. `css/styles.css` wird in TP-F entfernt.
```

- [ ] **Step 2: Commit**

```bash
git add docs/arc42/architecture.md
git commit -m "TP-A: ARC42 um Design-System-Fundament ergänzt"
```

---

## Task 8: Gesamtabnahme

- [ ] **Step 1: Alle Unit-Tests grün**

Run: `npm test`
Expected: alle bestehenden 145 Tests + neue (tokens 8, dom 8, Icon 6) grün.

- [ ] **Step 2: E2E grün**

Run: `npm run e2e`
Expected: die 4 bestehenden Flows grün (kein Verhalten geändert).

- [ ] **Step 3: Build kompiliert**

Run: `npx webpack --mode production 2>&1 | tail -5`
Expected: erfolgreicher Build.

- [ ] **Step 4: DoD-Check**

- [ ] Token-CSS + lokale Fonts + `Icon.js` + `dom.js` vorhanden und verdrahtet.
- [ ] App sieht unverändert aus (alter Look aktiv).
- [ ] ARC42-Abschnitt ergänzt.
- [ ] Handoff-Bundle ge-`.gitignore`-t (bereits im Spec-Commit erledigt).

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** Tokens (T1), Fonts (T2), dom.js (T3), Icon-Generator (T4) + Icon.js (T5), Verdrahtung (T6), ARC42 (T7), Tests in jeder Task; DoD in T8. Alle Spec-Punkte abgedeckt.
- **Icon-Namen:** 25, konsistent zwischen Generator (T4), Icon.test (T5) und Spec.
- **Kein innerHTML:** `dom.js` und `Icon.js` nutzen ausschließlich DOM-APIs/DOMParser.
- **Typkonsistenz:** `icon(name, opts)`, `el/on/clear/text`, `ICON_DATA` durchgängig gleich benannt.
