# TP-Shell-Mobile/A11y Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Macht die App-Shell mobil tauglich (WCAG 2.2 AA): Schritt-Tabs werden auf schmalen Screens Badges-only (alle 6 sichtbar, kein Overflow), jeder Tab bekommt ein aria-label mit vollem Schrittnamen, Ränder werden mobil kleiner.

**Architecture:** Rein additiv — ein `@media (max-width:640px)`-Block in `css/components.css` (Labels der inaktiven Tabs aus, aktiver Tab zeigt Label, 16-px-Ränder) plus eine `aria-label`-Ergänzung je Tab in `AppShell._renderTabs`. Views/Controller unberührt; Desktop-Optik unverändert.

**Tech Stack:** Vanilla JS, CSS `@media`, Vitest+jsdom, Playwright.

---

## Datei-Struktur

**Neu:**
```
e2e/mobile-shell.spec.js   Mobil-E2E: Tab-Leiste läuft @320/375px nicht über
```
**Modifiziert:**
```
css/components.css         @media (max-width:640px)-Block (shell-* mobil)
test/components-css.test.js  Inhaltscheck @media + Badges-only-Regel
js/ui/AppShell.js          aria-label je Tab (voller Schrittname)
js/ui/AppShell.test.js     Test: aria-label vorhanden/korrekt
docs/arc42/architecture.md §8 Zusatz
```

**Konventionen:** `npm test` = `vitest run`; Test-Globs `test/**` + `js/**`. Kein `innerHTML`.
Bei E2E ggf. verwaisten Dev-Server killen: `lsof -ti:8080 | xargs kill -9 2>/dev/null`.

---

## Task 1: aria-label je Tab (AppShell)

**Files:** Modify `js/ui/AppShell.js`, `js/ui/AppShell.test.js`

- [ ] **Step 1: Failing test anhängen** — an `js/ui/AppShell.test.js` (nach dem letzten `});`):
```js
describe('AppShell — Tab aria-label (Mobile/A11y)', () => {
  it('Eingabeschritt: aria-label enthält Namen + "Schritt n von N"', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const shell = new AppShell({ steps: STEPS, onNavigate: vi.fn(), onGenerate: vi.fn() });
    shell.mount(root);
    const doctorTab = root.querySelector('[role=tab][data-step=doctor]');
    const label = doctorTab.getAttribute('aria-label');
    expect(label).toContain('Arzt');
    expect(label).toContain('2 von 5');
  });
  it('Utility-Tab: aria-label ist der Klartext-Name', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const shell = new AppShell({ steps: STEPS, onNavigate: vi.fn(), onGenerate: vi.fn() });
    shell.mount(root);
    const dataTab = root.querySelector('[role=tab][data-step=data]');
    expect(dataTab.getAttribute('aria-label')).toBe('Gespeicherte Daten');
  });
  it('sichtbares Label bleibt erhalten (Desktop unverändert)', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const shell = new AppShell({ steps: STEPS, onNavigate: vi.fn(), onGenerate: vi.fn() });
    shell.mount(root);
    const patientTab = root.querySelector('[role=tab][data-step=patient]');
    expect(patientTab.querySelector('.shell-tab__label').textContent).toBe('Patient');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run js/ui/AppShell.test.js`
Expected: FAIL (die beiden aria-label-Tests; das Label-Test besteht bereits).

- [ ] **Step 3: Implement** — in `js/ui/AppShell.js`, Methode `_renderTabs`, den `btn`-Erzeugungsblock so ergänzen, dass das aria-label gesetzt wird. Ersetze
```js
      const stepIndex = step.utility ? null : this.inputSteps.findIndex((s) => s.id === step.id);
      const btn = el('button', {
        class: 'shell-tab' + (step.utility ? ' shell-tab--utility' : ''),
        role: 'tab', 'data-step': step.id, tabindex: '-1', 'aria-selected': 'false',
      });
```
durch
```js
      const stepIndex = step.utility ? null : this.inputSteps.findIndex((s) => s.id === step.id);
      // aria-label traegt den vollen Schrittnamen (+ Position), damit das Label
      // fuer Screenreader erhalten bleibt, wenn es mobil visuell ausgeblendet ist.
      const ariaLabel = step.utility
        ? String(step.label)
        : `${step.label}, Schritt ${stepIndex + 1} von ${this.inputSteps.length}`;
      const btn = el('button', {
        class: 'shell-tab' + (step.utility ? ' shell-tab--utility' : ''),
        role: 'tab', 'data-step': step.id, tabindex: '-1', 'aria-selected': 'false',
        'aria-label': ariaLabel,
      });
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run js/ui/AppShell.test.js` → alle grün.

- [ ] **Step 5: Commit**
```bash
git add js/ui/AppShell.js js/ui/AppShell.test.js
git commit -m "TP-Mobile: aria-label je Tab (voller Schrittname + Position)"
```

---

## Task 2: Mobil-CSS (@media ≤ 640px)

**Files:** Modify `css/components.css`, `test/components-css.test.js`

- [ ] **Step 1: Failing test anhängen** — in `test/components-css.test.js` innerhalb des `describe`-Blocks (vor der schließenden `});` in Zeile 26) ein `it` ergänzen:
```js
  it('enthält Mobil-Block (@media ≤640px) mit Badges-only + 16px-Rändern', () => {
    const c = css();
    const idx = c.indexOf('@media (max-width: 640px)');
    expect(idx).toBeGreaterThan(-1);
    const mobile = c.slice(idx); // nur der Mobil-Teil ab dem Media-Query
    // Badges-only: inaktive Labels ausgeblendet
    expect(mobile).toMatch(/\.shell-tab__label\s*\{[^}]*display:\s*none/);
    // schmalere Ränder mobil (16px im Mobil-Block)
    expect(mobile).toMatch(/\.shell-header\s*\{[^}]*16px/);
  });
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run test/components-css.test.js` → FAIL.

- [ ] **Step 3: Mobil-Block an `css/components.css` anhängen** (ans Dateiende):
```css

/* App-Shell mobil (≤640px): Badges-only-Tabs + schmalere Ränder.
   Alle 6 Schritte bleiben gleichzeitig sichtbar (kein Overflow) -> WCAG 1.4.10
   Reflow + WCAG-3-Draft "all steps listed". Voller Schrittname bleibt via
   aria-label am Tab (s. AppShell). */
@media (max-width: 640px) {
  .shell-header { padding: 20px 16px 16px; }
  .shell-tabs { padding: 0 16px; gap: var(--space-1); justify-content: space-between; }
  .shell-main { padding: 24px 16px 28px; }
  .shell-footer { padding: 16px 16px 24px; }
  .shell-header__row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .shell-header__title { font-size: var(--text-xl); }
  /* Badges-only: Labels der inaktiven Tabs ausblenden, aktiver Tab zeigt Label. */
  .shell-tab__label { display: none; }
  .shell-tab--active .shell-tab__label { display: inline; }
  .shell-tab { padding: 12px 8px; gap: 6px; }
  .shell-tabs__spacer { display: none; }
}
```
> Hinweis: `.shell-tabs__spacer` (der Divider vor der Utility-Tab) wird mobil ausgeblendet, damit alle Badges gleichmäßig in die Reihe passen. Der Tab-Button bleibt durch `padding:12px 8px` + Badge (20px) ausreichend groß als Tap-Ziel (Höhe ≥ 44px bleibt durch den Badge + Padding erhalten; Breite ≥ 24px erfüllt).

- [ ] **Step 4: Run to verify it passes** — `npx vitest run test/components-css.test.js` → PASS.

- [ ] **Step 5: Commit**
```bash
git add css/components.css test/components-css.test.js
git commit -m "TP-Mobile: @media-Block — Badges-only-Tabs + 16px-Ränder (≤640px)"
```

---

## Task 3: Mobil-E2E (kein Tab-Overflow @320/375px)

**Files:** Create `e2e/mobile-shell.spec.js`

- [ ] **Step 1: E2E-Spec schreiben** — `e2e/mobile-shell.spec.js`:
```js
const { test, expect } = require('@playwright/test');

for (const width of [320, 375]) {
  test(`Shell mobil @${width}px: Tab-Leiste läuft nicht über, alle 6 Tabs sichtbar`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.getByRole('button', { name: /Neu anfangen/ }).click();
    await page.waitForSelector('#patient-form', { timeout: 8000 });

    const m = await page.evaluate(() => {
      const tabs = document.querySelector('.shell-tabs');
      const btns = [...document.querySelectorAll('[role=tab]')];
      const doc = document.documentElement;
      return {
        tabsOverflow: tabs.scrollWidth > tabs.clientWidth + 1,
        tabCount: btns.length,
        maxRight: Math.max(...btns.map((b) => Math.round(b.getBoundingClientRect().right))),
        innerWidth: window.innerWidth,
        pageOverflow: doc.scrollWidth > window.innerWidth + 1,
      };
    });

    expect(m.tabCount).toBe(6);
    expect(m.tabsOverflow).toBe(false);          // Tab-Leiste läuft nicht über
    expect(m.maxRight).toBeLessThanOrEqual(m.innerWidth + 1); // alle Tabs im Viewport
    expect(m.pageOverflow).toBe(false);          // keine horizontale Seiten-Scrollbar
  });
}
```

- [ ] **Step 2: Verwaisten Dev-Server killen (falls Port belegt)** — `lsof -ti:8080 | xargs kill -9 2>/dev/null; echo ok`

- [ ] **Step 3: Run to verify it passes** — `npm run e2e -- e2e/mobile-shell.spec.js`
Expected: 2 passed (320 + 375). Falls es fehlschlägt: prüfen, ob der `@media`-Block aus Task 2 greift (components.css ist ab TP-C global geladen).

- [ ] **Step 4: Commit**
```bash
git add e2e/mobile-shell.spec.js
git commit -m "TP-Mobile: E2E — keine überlaufende Tab-Leiste @320/375px"
```

---

## Task 4: ARC42

**Files:** Modify `docs/arc42/architecture.md`

- [ ] **Step 1: §8 App-Shell-Absatz ergänzen** — direkt nach dem bestehenden „App-Shell (TP-C)"-Absatz anfügen:
```markdown
- Shell responsiv / WCAG 2.2 AA (TP-Mobile): Schritt-Tabs werden ≤640px als Badges-only
  dargestellt (inaktive Labels ausgeblendet, aktiver Tab mit Label) — alle 6 Schritte bleiben
  gleichzeitig sichtbar (kein horizontales Scrollen, WCAG 1.4.10 Reflow; WCAG-3-Draft
  "all steps listed"). Jeder Tab trägt ein aria-label mit vollem Schrittnamen (+ Position),
  sodass das Label bei mobiler Ausblendung für Screenreader erhalten bleibt. Ränder mobil 16px.
  Target Size (2.5.8) und Focus-Sichtbarkeit (2.4.11, roving-Fokus aus TP-C) bleiben gewahrt.
  Volle App-weite A11y-Durchsicht der Screens bleibt TP4.
```

- [ ] **Step 2: Commit**
```bash
git add docs/arc42/architecture.md
git commit -m "TP-Mobile: ARC42 um Shell-Responsivität/WCAG 2.2 AA ergänzt"
```

---

## Task 5: Gesamtabnahme

- [ ] **Step 1: Unit-Tests** — `npm test` → 253 bestehende + neu (AppShell +3, components-css +1) grün.
- [ ] **Step 2: E2E** — `lsof -ti:8080 | xargs kill -9 2>/dev/null; npm run e2e` → 4 bestehende (Desktop) + 2 neue (Mobil) grün.
- [ ] **Step 3: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert.
- [ ] **Step 4: DoD-Check**
  - [ ] `@media`-Mobil-Block vorhanden; Tabs mobil badges-only, alle 6 sichtbar (E2E belegt).
  - [ ] Jeder Tab hat ein aria-label mit vollem Schrittnamen.
  - [ ] Desktop-Optik/-Tests unverändert; kein `innerHTML`.
  - [ ] ARC42 ergänzt.

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** aria-label (T1), Mobil-CSS Badges-only + Ränder (T2), Mobil-E2E (T3),
  ARC42 (T4), Abnahme (T5). Header-Umbruch + Footer-Padding sind im T2-Block enthalten.
- **Kein Placeholder:** alle Steps mit konkretem Code/Command.
- **Konsistenz:** Klassen `.shell-tab__label`, `.shell-tab--active`, `.shell-tabs`, `.shell-header`
  entsprechen exakt den in TP-C angelegten (verifiziert). aria-label-Format „Name, Schritt n von N"
  durchgängig in Test (T1) und Implementierung.
- **Views unberührt:** nur css/components.css, AppShell.js, Tests, ARC42, neues E2E-Spec.
- **E2E-Vorsicht:** verwaister Dev-Server auf 8080 wird vor E2E gekillt (bekanntes Umfeld-Thema).
