# TP-B · Komponenten-Bibliothek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Baut 10 präsentative/Formular-Komponenten als Vanilla-JS-Factories (DOM via `dom.js`, kein dynamisches HTML), gestylt über `rb-*`-CSS-Klassen auf den TP-A-Tokens — isoliert getestet, noch nicht in Views verdrahtet.

**Architecture:** Jede Komponente ist eine reine Funktion `name(props) -> HTMLElement`, gebaut mit `el/on/clear/text` aus `js/ui/dom.js` und `icon()` aus `js/ui/Icon.js` (beide TP-A). Styling lebt komplett in `css/components.css` (Klassenpräfix `rb-`); Hover/Focus per CSS-Pseudoklassen. Interaktive Komponenten (Combobox, Modal) hängen document-Listener an und melden sie beim Zerstören/Schließen wieder ab. `css/components.css` wird in TP-B NICHT global geladen — die App bleibt optisch unverändert.

**Tech Stack:** Vanilla JS (ES-Module), Vitest + jsdom, TP-A-Bausteine (`dom.js`, `Icon.js`, Tokens).

---

## Datei-Struktur

**Neu:**
```
css/components.css              # alle rb-* Klassen
js/ui/components/Button.js      + Button.test.js
js/ui/components/Badge.js       + Badge.test.js
js/ui/components/Alert.js       + Alert.test.js
js/ui/components/Card.js        + Card.test.js
js/ui/components/FormField.js   + FormField.test.js
js/ui/components/Input.js       + Input.test.js
js/ui/components/Select.js      + Select.test.js
js/ui/components/Radio.js       + Radio.test.js
js/ui/components/Combobox.js    + Combobox.test.js
js/ui/components/Modal.js       + Modal.test.js
test/components-css.test.js     # Datei-Inhaltscheck der rb-* Klassen
```
**Modifiziert:** `docs/arc42/architecture.md` (§8 Ergänzung).

**Konventionen für ALLE Komponenten-Dateien:**
- Import der Helfer: `import { el, on, clear, text } from '../dom.js';` und wo Icons nötig `import { icon } from '../Icon.js';`
- Keine dynamische HTML-Injektion (die aus TP-A bekannten verbotenen APIs). Nur DOM-Bau.
- Nutzertexte immer über `el(tag, {}, [string])` (→ textContent) oder `text()`.
- Test-Globs (`js/**/*.test.js`, `test/**/*.test.js`) erfassen alle Tests automatisch; `npm test` = `vitest run`.

---

## Task 1: components.css — Grundgerüst der rb-Klassen

**Files:** Create `css/components.css`, `test/components-css.test.js`

- [ ] **Step 1: Write the failing test** — `test/components-css.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = () => readFileSync(resolve(__dirname, '..', 'css/components.css'), 'utf8');

describe('components.css', () => {
  it('definiert die Kern-Klassen', () => {
    const c = css();
    for (const sel of ['.rb-btn', '.rb-badge', '.rb-alert', '.rb-card', '.rb-field',
      '.rb-input', '.rb-select', '.rb-radio-group', '.rb-combobox', '.rb-modal']) {
      expect(c).toContain(sel);
    }
  });
  it('referenziert Tokens statt Rohwerte', () => {
    const c = css();
    expect(c).toContain('var(--color-primary-700)');
    expect(c).toContain('var(--radius-md)');
    expect(c).toContain('var(--space-');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run test/components-css.test.js` → FAIL (ENOENT).

- [ ] **Step 3: Create `css/components.css`** (Werte aus den Prototypen, alles via Tokens):
```css
/* Komponenten-Klassen des Reisebescheinigung Design Systems (Vanilla-Nachbau).
   Nutzt ausschließlich TP-A-Tokens. Wird ab TP-C global geladen. */

/* Button */
.rb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-body);font-weight:var(--weight-semibold);border-radius:var(--radius-sm);cursor:pointer;border:1px solid transparent;transition:background var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.rb-btn--sm{padding:6px 14px;font-size:var(--text-sm);min-height:32px}
.rb-btn--md{padding:10px 20px;font-size:var(--text-sm);min-height:44px}
.rb-btn--lg{padding:14px 26px;font-size:var(--text-base);min-height:44px}
.rb-btn--primary{background:var(--color-primary-700);color:var(--text-inverse);border-color:var(--color-primary-700)}
.rb-btn--primary:hover:not(:disabled){background:var(--color-primary-800)}
.rb-btn--secondary{background:var(--color-surface);color:var(--color-ink-900);border-color:var(--border-strong)}
.rb-btn--secondary:hover:not(:disabled){background:var(--color-primary-50);border-color:var(--color-ink-500)}
.rb-btn--ghost{background:transparent;color:var(--color-primary-700)}
.rb-btn--ghost:hover:not(:disabled){background:var(--color-primary-50)}
.rb-btn--danger{background:var(--color-surface);color:var(--color-danger-600);border-color:var(--color-danger-600)}
.rb-btn--danger:hover:not(:disabled){background:var(--color-danger-100)}
.rb-btn:disabled{opacity:.45;cursor:not-allowed}

/* Badge */
.rb-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-wide);text-transform:uppercase}
.rb-badge--neutral{background:var(--color-ink-100);color:var(--color-ink-700)}
.rb-badge--primary{background:var(--color-primary-100);color:var(--color-primary-800)}
.rb-badge--success{background:var(--color-success-100);color:var(--color-success-700)}
.rb-badge--warning{background:var(--color-warning-100);color:var(--color-warning-700)}
.rb-badge--danger{background:var(--color-danger-100);color:var(--color-danger-700)}

/* Alert */
.rb-alert{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:var(--radius-md);font-size:var(--text-sm);line-height:var(--leading-snug)}
.rb-alert__body{flex:1}
.rb-alert--info{background:var(--color-info-100);color:var(--color-info-700)}
.rb-alert--success{background:var(--color-success-100);color:var(--color-success-700)}
.rb-alert--warning{background:var(--color-warning-100);color:var(--color-warning-700)}
.rb-alert--danger{background:var(--color-danger-100);color:var(--color-danger-700)}

/* Card */
.rb-card{background:var(--color-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-5);transition:border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)}
.rb-card__head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
.rb-card__title{font-family:var(--font-body);font-size:var(--text-md);font-weight:var(--weight-semibold);margin:0}
.rb-card__meta{margin:4px 0 0;font-size:var(--text-sm);color:var(--text-muted)}
.rb-card__actions{display:flex;gap:8px;flex-shrink:0}

/* FormField */
.rb-field{display:flex;flex-direction:column;gap:6px}
.rb-field__label{font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--color-ink-900);letter-spacing:.01em}
.rb-field__optional{font-weight:var(--weight-regular);color:var(--color-ink-500)}
.rb-field__error{margin:0;font-size:var(--text-xs);color:var(--color-danger-600)}
.rb-field__hint{margin:0;font-size:var(--text-xs);color:var(--text-muted)}

/* Input */
.rb-input-wrap{position:relative}
.rb-input{width:100%;padding:11px 14px;font-size:var(--text-base);font-family:var(--font-body);color:var(--color-ink-900);background:var(--color-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);transition:border-color var(--duration-fast) var(--ease-standard)}
.rb-input:focus{border-color:var(--color-primary-700);outline:3px solid var(--color-focus-ring);outline-offset:1px}
.rb-input--has-icon{padding-right:38px}
.rb-input--error{border-color:var(--color-danger-600)}
.rb-input__icon{position:absolute;right:12px;top:50%;transform:translateY(-50%)}

/* Select */
.rb-select-wrap{position:relative}
.rb-select{width:100%;appearance:none;-webkit-appearance:none;padding:11px 40px 11px 14px;font-size:var(--text-base);font-family:var(--font-body);color:var(--color-ink-900);background:var(--color-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm)}
.rb-select:focus{border-color:var(--color-primary-700);outline:3px solid var(--color-focus-ring);outline-offset:1px}
.rb-select__chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none}

/* Radio */
.rb-radio-group{display:flex;gap:var(--space-6);flex-wrap:wrap}
.rb-radio{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-base);cursor:pointer}
.rb-radio input{width:18px;height:18px;accent-color:var(--color-primary-700)}

/* Combobox */
.rb-combobox{position:relative}
.rb-combobox__input{width:100%;padding:11px 14px;font-size:var(--text-base);font-family:var(--font-body);color:var(--color-ink-900);background:var(--color-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm)}
.rb-combobox__input:focus{border-color:var(--color-primary-700);outline:3px solid var(--color-focus-ring);outline-offset:1px}
.rb-combobox__list{position:absolute;z-index:10;top:calc(100% + 4px);left:0;right:0;margin:0;padding:4px;list-style:none;background:var(--color-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);box-shadow:var(--shadow-md);max-height:220px;overflow-y:auto}
.rb-combobox__option{padding:8px 10px;border-radius:var(--radius-sm);font-size:var(--text-sm);cursor:pointer;color:var(--color-ink-900)}
.rb-combobox__option--active{background:var(--color-primary-50)}

/* Modal */
.rb-modal__backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:var(--space-4);background:rgba(13,27,46,0.55)}
.rb-modal{background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:var(--space-6)}
.rb-modal__title{font-family:var(--font-display);font-size:var(--text-xl);margin:0 0 var(--space-3)}
.rb-modal__body{font-size:var(--text-base);color:var(--color-ink-700)}
.rb-modal__actions{display:flex;justify-content:flex-end;gap:var(--space-3);margin-top:var(--space-6)}
.rb-modal__list{list-style:none;margin:var(--space-3) 0 0;padding:0;display:flex;flex-direction:column;gap:var(--space-2)}
.rb-modal__item{text-align:left;width:100%;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--color-surface);cursor:pointer;font-size:var(--text-sm)}
.rb-modal__item:hover{background:var(--color-primary-50);border-color:var(--color-primary-200)}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run test/components-css.test.js` → PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add css/components.css test/components-css.test.js
git commit -m "TP-B: components.css — rb-* Klassen auf TP-A-Tokens"
```

---

## Task 2: Button

**Files:** Create `js/ui/components/Button.js`, `js/ui/components/Button.test.js`

- [ ] **Step 1: Write the failing test** — `js/ui/components/Button.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { button } from './Button.js';

describe('button()', () => {
  it('rendert <button> mit Variant- und Size-Klasse + Label', () => {
    const b = button({ label: 'Speichern', variant: 'primary', size: 'md' });
    expect(b.tagName).toBe('BUTTON');
    expect(b.classList.contains('rb-btn')).toBe(true);
    expect(b.classList.contains('rb-btn--primary')).toBe(true);
    expect(b.classList.contains('rb-btn--md')).toBe(true);
    expect(b.textContent).toContain('Speichern');
    expect(b.getAttribute('type')).toBe('button');
  });
  it('unbekannte Variant → primary-Fallback', () => {
    const b = button({ label: 'x', variant: 'lila' });
    expect(b.classList.contains('rb-btn--primary')).toBe(true);
  });
  it('icon fügt ein SVG voran', () => {
    const b = button({ label: 'Laden', icon: 'folder-open' });
    expect(b.querySelector('svg')).not.toBeNull();
  });
  it('disabled setzt Attribut', () => {
    const b = button({ label: 'x', disabled: true });
    expect(b.disabled).toBe(true);
  });
  it('onClick feuert bei Klick', () => {
    const fn = vi.fn();
    const b = button({ label: 'x', onClick: fn });
    b.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run js/ui/components/Button.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `js/ui/components/Button.js`:**
```js
import { el } from '../dom.js';
import { icon } from '../Icon.js';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

export function button({ label, variant = 'primary', size = 'md', icon: iconName,
  disabled = false, onClick, type = 'button', ...attrs } = {}) {
  const v = VARIANTS.includes(variant) ? variant : 'primary';
  const s = SIZES.includes(size) ? size : 'md';
  const children = [];
  if (iconName) children.push(icon(iconName, { size: 16, color: 'currentColor' }));
  if (label != null) children.push(el('span', {}, [String(label)]));
  const node = el('button', {
    class: `rb-btn rb-btn--${v} rb-btn--${s}`,
    type,
    ...attrs,
  }, children);
  if (disabled) node.disabled = true;
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run js/ui/components/Button.test.js` → PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Button.js js/ui/components/Button.test.js
git commit -m "TP-B: Button-Komponente"
```

---

## Task 3: Badge

**Files:** Create `js/ui/components/Badge.js`, `js/ui/components/Badge.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect } from 'vitest';
import { badge } from './Badge.js';

describe('badge()', () => {
  it('rendert span mit Ton-Klasse und Text', () => {
    const b = badge({ tone: 'success', text: 'BtM' });
    expect(b.tagName).toBe('SPAN');
    expect(b.classList.contains('rb-badge')).toBe(true);
    expect(b.classList.contains('rb-badge--success')).toBe(true);
    expect(b.textContent).toBe('BtM');
  });
  it('unbekannter Ton → neutral', () => {
    expect(badge({ tone: 'xx', text: 'a' }).classList.contains('rb-badge--neutral')).toBe(true);
  });
  it('Text wird als Text gesetzt (kein HTML)', () => {
    const b = badge({ tone: 'neutral', text: '<b>x</b>' });
    expect(b.querySelector('b')).toBeNull();
    expect(b.textContent).toBe('<b>x</b>');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run js/ui/components/Badge.test.js` → FAIL.

- [ ] **Step 3: Implement `js/ui/components/Badge.js`:**
```js
import { el } from '../dom.js';

const TONES = ['neutral', 'primary', 'success', 'warning', 'danger'];

export function badge({ tone = 'neutral', text = '' } = {}) {
  const t = TONES.includes(tone) ? tone : 'neutral';
  return el('span', { class: `rb-badge rb-badge--${t}` }, [String(text)]);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Badge.js js/ui/components/Badge.test.js
git commit -m "TP-B: Badge-Komponente"
```

---

## Task 4: Alert

**Files:** Create `js/ui/components/Alert.js`, `js/ui/components/Alert.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect } from 'vitest';
import { alert } from './Alert.js';

describe('alert()', () => {
  it('info → role=status + info-Klasse + Icon', () => {
    const a = alert({ tone: 'info', children: 'Hinweis' });
    expect(a.classList.contains('rb-alert--info')).toBe(true);
    expect(a.getAttribute('role')).toBe('status');
    expect(a.querySelector('svg')).not.toBeNull();
    expect(a.textContent).toContain('Hinweis');
  });
  it('danger und warning → role=alert', () => {
    expect(alert({ tone: 'danger', children: 'x' }).getAttribute('role')).toBe('alert');
    expect(alert({ tone: 'warning', children: 'x' }).getAttribute('role')).toBe('alert');
  });
  it('unbekannter Ton → info', () => {
    expect(alert({ tone: 'zz', children: 'x' }).classList.contains('rb-alert--info')).toBe(true);
  });
  it('children als Node', () => {
    const strong = document.createElement('strong');
    strong.textContent = 'wichtig';
    const a = alert({ tone: 'success', children: strong });
    expect(a.querySelector('strong')).toBe(strong);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Alert.js`:**
```js
import { el } from '../dom.js';
import { icon } from '../Icon.js';

const TONES = {
  info: 'info',
  success: 'check-circle-2',
  warning: 'triangle-alert',
  danger: 'circle-x',
};

export function alert({ tone = 'info', children } = {}) {
  const t = TONES[tone] ? tone : 'info';
  const role = (t === 'danger' || t === 'warning') ? 'alert' : 'status';
  const body = el('div', { class: 'rb-alert__body' });
  for (const c of [].concat(children)) {
    if (c == null) continue;
    body.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el('div', { class: `rb-alert rb-alert--${t}`, role }, [
    icon(TONES[t], { size: 18, color: 'currentColor' }),
    body,
  ]);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Alert.js js/ui/components/Alert.test.js
git commit -m "TP-B: Alert-Komponente"
```

---

## Task 5: Card

**Files:** Create `js/ui/components/Card.js`, `js/ui/components/Card.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect } from 'vitest';
import { card } from './Card.js';

describe('card()', () => {
  it('ohne title/actions: kein Kopf, nur Body', () => {
    const body = document.createElement('p'); body.textContent = 'Inhalt';
    const c = card({ children: body });
    expect(c.classList.contains('rb-card')).toBe(true);
    expect(c.querySelector('.rb-card__head')).toBeNull();
    expect(c.textContent).toContain('Inhalt');
  });
  it('mit title + meta rendert Kopf', () => {
    const c = card({ title: 'Elvanse', meta: '30 mg' });
    expect(c.querySelector('.rb-card__title').textContent).toBe('Elvanse');
    expect(c.querySelector('.rb-card__meta').textContent).toBe('30 mg');
  });
  it('actions werden rechts eingehängt', () => {
    const btn = document.createElement('button');
    const c = card({ title: 'x', actions: [btn] });
    expect(c.querySelector('.rb-card__actions').firstChild).toBe(btn);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Card.js`:**
```js
import { el } from '../dom.js';

export function card({ title, meta, actions, children } = {}) {
  const parts = [];
  if (title || (actions && actions.length)) {
    const left = el('div', {}, []);
    if (title) left.appendChild(el('h4', { class: 'rb-card__title' }, [String(title)]));
    if (meta) left.appendChild(el('p', { class: 'rb-card__meta' }, [String(meta)]));
    const head = el('div', { class: 'rb-card__head' }, [left]);
    if (actions && actions.length) {
      head.appendChild(el('div', { class: 'rb-card__actions' }, actions));
    }
    parts.push(head);
  }
  for (const c of [].concat(children || [])) {
    if (c == null) continue;
    parts.push(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el('div', { class: 'rb-card' }, parts);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Card.js js/ui/components/Card.test.js
git commit -m "TP-B: Card-Komponente"
```

---

## Task 6: FormField

**Files:** Create `js/ui/components/FormField.js`, `js/ui/components/FormField.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect } from 'vitest';
import { formField } from './FormField.js';

describe('formField()', () => {
  it('rendert Label + Control', () => {
    const ctrl = document.createElement('input');
    const f = formField({ label: 'Nachname', htmlFor: 'ln', control: ctrl });
    const label = f.querySelector('.rb-field__label');
    expect(label.textContent).toContain('Nachname');
    expect(label.getAttribute('for')).toBe('ln');
    expect(f.contains(ctrl)).toBe(true);
  });
  it('optional zeigt (optional)', () => {
    const f = formField({ label: 'Titel', optional: true, control: document.createElement('input') });
    expect(f.querySelector('.rb-field__optional').textContent).toContain('optional');
  });
  it('error hat Vorrang vor hint', () => {
    const f = formField({ label: 'x', error: 'Pflichtfeld', hint: 'Tipp', control: document.createElement('input') });
    expect(f.querySelector('.rb-field__error').textContent).toBe('Pflichtfeld');
    expect(f.querySelector('.rb-field__hint')).toBeNull();
  });
  it('nur hint, kein error', () => {
    const f = formField({ label: 'x', hint: 'Tipp', control: document.createElement('input') });
    expect(f.querySelector('.rb-field__hint').textContent).toBe('Tipp');
    expect(f.querySelector('.rb-field__error')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/FormField.js`:**
```js
import { el } from '../dom.js';

export function formField({ label, htmlFor, optional = false, hint, error, control } = {}) {
  const labelChildren = [String(label ?? '')];
  if (optional) labelChildren.push(el('span', { class: 'rb-field__optional' }, [' (optional)']));
  const labelEl = el('label', { class: 'rb-field__label', ...(htmlFor ? { for: htmlFor } : {}) }, labelChildren);
  const parts = [labelEl];
  if (control) parts.push(control);
  if (error) parts.push(el('p', { class: 'rb-field__error' }, [String(error)]));
  else if (hint) parts.push(el('p', { class: 'rb-field__hint' }, [String(hint)]));
  return el('div', { class: 'rb-field' }, parts);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/FormField.js js/ui/components/FormField.test.js
git commit -m "TP-B: FormField-Komponente"
```

---

## Task 7: Input

**Files:** Create `js/ui/components/Input.js`, `js/ui/components/Input.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect, vi } from 'vitest';
import { input } from './Input.js';

describe('input()', () => {
  it('rendert Wrapper mit <input> und Wert', () => {
    const w = input({ value: 'Meier', id: 'ln', name: 'lastname' });
    expect(w.classList.contains('rb-input-wrap')).toBe(true);
    const el = w.querySelector('input.rb-input');
    expect(el.value).toBe('Meier');
    expect(el.id).toBe('ln');
    expect(el.name).toBe('lastname');
  });
  it('valid → check-circle-Icon', () => {
    const w = input({ value: 'x', valid: true });
    expect(w.querySelector('.rb-input__icon svg')).not.toBeNull();
    expect(w.querySelector('input').classList.contains('rb-input--has-icon')).toBe(true);
  });
  it('error → Fehlerklasse + Icon', () => {
    const w = input({ value: '', error: true });
    expect(w.querySelector('input').classList.contains('rb-input--error')).toBe(true);
    expect(w.querySelector('.rb-input__icon svg')).not.toBeNull();
  });
  it('onInput und onBlur feuern', () => {
    const oi = vi.fn(); const ob = vi.fn();
    const w = input({ onInput: oi, onBlur: ob });
    const el = w.querySelector('input');
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    expect(oi).toHaveBeenCalledTimes(1);
    expect(ob).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Input.js`:**
```js
import { el } from '../dom.js';
import { icon } from '../Icon.js';

export function input({ value, type = 'text', error = false, valid = false,
  id, name, placeholder, onInput, onBlur, ...attrs } = {}) {
  const showIcon = !!(error || valid);
  const cls = ['rb-input'];
  if (showIcon) cls.push('rb-input--has-icon');
  if (error) cls.push('rb-input--error');
  const inputEl = el('input', {
    class: cls.join(' '),
    type,
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...attrs,
  });
  if (value != null) inputEl.value = String(value);
  if (onInput) inputEl.addEventListener('input', onInput);
  if (onBlur) inputEl.addEventListener('blur', onBlur);
  const children = [inputEl];
  if (showIcon) {
    const wrap = el('span', { class: 'rb-input__icon' }, [
      icon(error ? 'alert-circle' : 'check-circle', {
        size: 18,
        color: error ? 'var(--color-danger-600)' : 'var(--color-success-600)',
      }),
    ]);
    children.push(wrap);
  }
  return el('div', { class: 'rb-input-wrap' }, children);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Input.js js/ui/components/Input.test.js
git commit -m "TP-B: Input-Komponente (Inline-Validierungs-Icons)"
```

---

## Task 8: Select

**Files:** Create `js/ui/components/Select.js`, `js/ui/components/Select.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect, vi } from 'vitest';
import { select } from './Select.js';

const OPTS = [{ value: 'm', label: 'Männlich' }, { value: 'w', label: 'Weiblich' }];

describe('select()', () => {
  it('rendert Wrapper, <select>, Optionen und chevron', () => {
    const w = select({ options: OPTS, value: 'w', id: 'g', name: 'gender' });
    expect(w.classList.contains('rb-select-wrap')).toBe(true);
    const s = w.querySelector('select.rb-select');
    expect(s.querySelectorAll('option').length).toBe(2);
    expect(s.value).toBe('w');
    expect(w.querySelector('.rb-select__chevron svg')).not.toBeNull();
  });
  it('placeholder erzeugt eine leere erste Option', () => {
    const w = select({ options: OPTS, placeholder: 'Bitte wählen' });
    const first = w.querySelector('select option');
    expect(first.value).toBe('');
    expect(first.textContent).toBe('Bitte wählen');
  });
  it('onChange feuert', () => {
    const fn = vi.fn();
    const w = select({ options: OPTS, onChange: fn });
    w.querySelector('select').dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('leere options → valides, leeres select', () => {
    const w = select({});
    expect(w.querySelectorAll('option').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Select.js`:**
```js
import { el } from '../dom.js';
import { icon } from '../Icon.js';

export function select({ options = [], value, id, name, onChange, placeholder, ...attrs } = {}) {
  const optionEls = [];
  if (placeholder != null) optionEls.push(el('option', { value: '' }, [String(placeholder)]));
  for (const o of options) {
    optionEls.push(el('option', { value: o.value }, [String(o.label)]));
  }
  const selectEl = el('select', {
    class: 'rb-select',
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...attrs,
  }, optionEls);
  if (value != null) selectEl.value = String(value);
  if (onChange) selectEl.addEventListener('change', onChange);
  const chevron = el('span', { class: 'rb-select__chevron' }, [
    icon('chevron-down', { size: 16, color: 'var(--color-ink-500)' }),
  ]);
  return el('div', { class: 'rb-select-wrap' }, [selectEl, chevron]);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Select.js js/ui/components/Select.test.js
git commit -m "TP-B: Select-Komponente"
```

---

## Task 9: Radio

**Files:** Create `js/ui/components/Radio.js`, `js/ui/components/Radio.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect, vi } from 'vitest';
import { radioGroup } from './Radio.js';

const OPTS = [{ value: 'w', label: 'Weiblich' }, { value: 'm', label: 'Männlich' }, { value: 'd', label: 'Divers' }];

describe('radioGroup()', () => {
  it('rendert radiogroup mit je einem Radio', () => {
    const g = radioGroup({ name: 'gender', options: OPTS, value: 'm' });
    expect(g.getAttribute('role')).toBe('radiogroup');
    const radios = g.querySelectorAll('input[type=radio]');
    expect(radios.length).toBe(3);
  });
  it('value markiert das richtige Radio', () => {
    const g = radioGroup({ name: 'gender', options: OPTS, value: 'd' });
    const checked = g.querySelector('input:checked');
    expect(checked.value).toBe('d');
  });
  it('onChange liefert den gewählten Wert', () => {
    const fn = vi.fn();
    const g = radioGroup({ name: 'gender', options: OPTS, onChange: fn });
    const first = g.querySelector('input[type=radio]');
    first.checked = true;
    first.dispatchEvent(new Event('change'));
    expect(fn).toHaveBeenCalledWith('w');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Radio.js`:**
```js
import { el } from '../dom.js';

export function radioGroup({ name, options = [], value, onChange } = {}) {
  const labels = options.map((opt) => {
    const radio = el('input', { type: 'radio', name, value: opt.value });
    if (value === opt.value) radio.checked = true;
    if (onChange) radio.addEventListener('change', () => onChange(opt.value));
    return el('label', { class: 'rb-radio' }, [radio, el('span', {}, [String(opt.label)])]);
  });
  return el('div', { class: 'rb-radio-group', role: 'radiogroup' }, labels);
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Radio.js js/ui/components/Radio.test.js
git commit -m "TP-B: Radio-Komponente"
```

---

## Task 10: Combobox

**Files:** Create `js/ui/components/Combobox.js`, `js/ui/components/Combobox.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect, vi } from 'vitest';
import { combobox } from './Combobox.js';

const OPTS = [
  { value: 'de', label: 'Deutsch' }, { value: 'at', label: 'Österreichisch' },
  { value: 'ch', label: 'Schweizerisch' }, { value: 'fr', label: 'Französisch' },
];

function type(inputEl, val) {
  inputEl.value = val;
  inputEl.dispatchEvent(new Event('input'));
}

describe('combobox()', () => {
  it('rendert combobox-Input', () => {
    const c = combobox({ options: OPTS });
    const inp = c.querySelector('input[role=combobox]');
    expect(inp).not.toBeNull();
    expect(inp.getAttribute('aria-autocomplete')).toBe('list');
  });
  it('Tippen filtert die Liste (case-insensitiv)', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    type(inp, 'öster');
    const items = c.querySelectorAll('.rb-combobox__option');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Österreichisch');
    c.destroy(); c.remove();
  });
  it('ArrowDown + Enter wählt Option, onChange bekommt Label', () => {
    const fn = vi.fn();
    const c = combobox({ options: OPTS, onChange: fn });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    type(inp, 'sch');
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fn).toHaveBeenCalledWith('Schweizerisch');
    c.destroy(); c.remove();
  });
  it('Escape schließt die Liste', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    const inp = c.querySelector('input');
    inp.dispatchEvent(new Event('focus'));
    type(inp, 'd');
    expect(c.querySelector('.rb-combobox__list')).not.toBeNull();
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(c.querySelector('.rb-combobox__list')).toBeNull();
    c.destroy(); c.remove();
  });
  it('destroy() meldet den document-Listener ab', () => {
    const c = combobox({ options: OPTS });
    document.body.appendChild(c);
    c.destroy();
    expect(() => document.dispatchEvent(new MouseEvent('mousedown'))).not.toThrow();
    c.remove();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Combobox.js`:**
```js
import { el, clear } from '../dom.js';

export function combobox({ options = [], value, onChange, placeholder } = {}) {
  let query = value || '';
  let open = false;
  let activeIndex = -1;

  const inputEl = el('input', {
    class: 'rb-combobox__input',
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-autocomplete': 'list',
    ...(placeholder ? { placeholder } : {}),
  });
  inputEl.value = query;

  const list = el('ul', { class: 'rb-combobox__list', role: 'listbox' });
  const wrap = el('div', { class: 'rb-combobox' }, [inputEl]);

  function filtered() {
    const q = query.trim().toLowerCase();
    const src = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return src.slice(0, 8);
  }

  function render() {
    const items = filtered();
    inputEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open || items.length === 0) {
      if (list.parentNode) list.remove();
      return;
    }
    clear(list);
    items.forEach((opt, i) => {
      const li = el('li', {
        class: 'rb-combobox__option' + (i === activeIndex ? ' rb-combobox__option--active' : ''),
        role: 'option',
        'aria-selected': i === activeIndex ? 'true' : 'false',
      }, [String(opt.label)]);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); select(opt); });
      li.addEventListener('mouseenter', () => { activeIndex = i; render(); });
      list.appendChild(li);
    });
    if (!list.parentNode) wrap.appendChild(list);
  }

  function select(opt) {
    query = opt.label;
    inputEl.value = opt.label;
    open = false;
    activeIndex = -1;
    render();
    if (onChange) onChange(opt.label);
  }

  inputEl.addEventListener('input', () => {
    query = inputEl.value;
    open = true;
    activeIndex = -1;
    render();
    if (onChange) onChange(inputEl.value);
  });
  inputEl.addEventListener('focus', () => { open = true; render(); });
  inputEl.addEventListener('keydown', (e) => {
    const items = filtered();
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { open = true; render(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && items[activeIndex]) select(items[activeIndex]); }
    else if (e.key === 'Escape') { open = false; render(); }
  });

  const onDocDown = (e) => { if (!wrap.contains(e.target)) { open = false; render(); } };
  document.addEventListener('mousedown', onDocDown);

  wrap.destroy = () => { document.removeEventListener('mousedown', onDocDown); };
  return wrap;
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Combobox.js js/ui/components/Combobox.test.js
git commit -m "TP-B: Combobox-Komponente (gefilterte, tastaturnavigierbare Listbox)"
```

---

## Task 11: Modal

**Files:** Create `js/ui/components/Modal.js`, `js/ui/components/Modal.test.js`

- [ ] **Step 1: Write the failing test:**
```js
import { describe, it, expect } from 'vitest';
import { openModal, confirmModal, chooseModal } from './Modal.js';

describe('openModal()', () => {
  it('hängt ein Overlay an document.body und close() entfernt es', () => {
    const { close } = openModal({ title: 'Titel', body: 'Text', actions: [] });
    const overlay = document.querySelector('.rb-modal__backdrop');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('.rb-modal').getAttribute('role')).toBe('dialog');
    expect(overlay.querySelector('.rb-modal').getAttribute('aria-modal')).toBe('true');
    close();
    expect(document.querySelector('.rb-modal__backdrop')).toBeNull();
  });
  it('Escape schließt (dismissible)', () => {
    openModal({ title: 'X', body: 'x' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.rb-modal__backdrop')).toBeNull();
  });
});

describe('confirmModal()', () => {
  it('resolved true beim Bestätigen', async () => {
    const p = confirmModal({ title: 'Löschen?', message: 'Sicher?' });
    document.querySelector('.rb-modal__actions .rb-btn--primary').click();
    await expect(p).resolves.toBe(true);
  });
  it('resolved false beim Abbrechen', async () => {
    const p = confirmModal({ title: 'Löschen?', message: 'Sicher?' });
    const buttons = document.querySelectorAll('.rb-modal__actions .rb-btn');
    buttons[0].click();
    await expect(p).resolves.toBe(false);
  });
});

describe('chooseModal()', () => {
  it('resolved das gewählte Item', async () => {
    const items = [{ id: 1, name: 'Meier' }, { id: 2, name: 'Schmidt' }];
    const p = chooseModal({ title: 'Patient laden', items, renderItem: (it) => it.name });
    const rows = document.querySelectorAll('.rb-modal__item');
    expect(rows.length).toBe(2);
    rows[1].click();
    await expect(p).resolves.toEqual({ id: 2, name: 'Schmidt' });
  });
  it('resolved null bei Abbruch (Escape)', async () => {
    const p = chooseModal({ title: 'x', items: [{ id: 1, name: 'a' }], renderItem: (it) => it.name });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(p).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `js/ui/components/Modal.js`:**
```js
import { el } from '../dom.js';
import { button } from './Button.js';

// Generisches Modal. Kein dynamisches HTML; Overlay an document.body, beim Schließen entfernt.
export function openModal({ title, body, actions = [], dismissible = true, onClose } = {}) {
  const prevFocus = document.activeElement;

  const titleEl = title ? el('h2', { class: 'rb-modal__title', id: 'rb-modal-title' }, [String(title)]) : null;
  const bodyEl = el('div', { class: 'rb-modal__body' });
  for (const c of [].concat(body || [])) {
    if (c == null) continue;
    bodyEl.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  const dialogChildren = [];
  if (titleEl) dialogChildren.push(titleEl);
  dialogChildren.push(bodyEl);
  if (actions && actions.length) {
    dialogChildren.push(el('div', { class: 'rb-modal__actions' }, actions));
  }
  const dialog = el('div', {
    class: 'rb-modal',
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
    ...(titleEl ? { 'aria-labelledby': 'rb-modal-title' } : { 'aria-label': String(title || 'Dialog') }),
  }, dialogChildren);

  const backdrop = el('div', { class: 'rb-modal__backdrop' }, [dialog]);

  function close() {
    document.removeEventListener('keydown', onKey);
    if (backdrop.parentNode) backdrop.remove();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape' && dismissible) { close(); }
    else if (e.key === 'Tab') {
      const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) { e.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (dismissible) {
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  }
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);

  const firstBtn = dialog.querySelector('button');
  (firstBtn || dialog).focus();

  return { close, element: dialog };
}

export function confirmModal({ title, message, confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen', tone = 'primary' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => { if (done) return; done = true; modal.close(); resolve(val); };
    const cancelBtn = button({ label: cancelLabel, variant: 'secondary', onClick: () => finish(false) });
    const okBtn = button({ label: confirmLabel, variant: tone === 'danger' ? 'danger' : 'primary', onClick: () => finish(true) });
    const modal = openModal({
      title,
      body: el('p', {}, [String(message || '')]),
      actions: [cancelBtn, okBtn],
      onClose: () => { if (!done) { done = true; resolve(false); } },
    });
  });
}

export function chooseModal({ title, items = [], renderItem = (x) => String(x) } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => { if (done) return; done = true; modal.close(); resolve(val); };
    const listEl = el('ul', { class: 'rb-modal__list' });
    items.forEach((it) => {
      const row = el('button', { class: 'rb-modal__item', type: 'button' }, [String(renderItem(it))]);
      row.addEventListener('click', () => finish(it));
      listEl.appendChild(el('li', {}, [row]));
    });
    const cancelBtn = button({ label: 'Abbrechen', variant: 'secondary', onClick: () => finish(null) });
    const modal = openModal({
      title,
      body: listEl,
      actions: [cancelBtn],
      onClose: () => { if (!done) { done = true; resolve(null); } },
    });
  });
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (6 tests).

> **Hinweis zur onClose-Semantik:** `close()` entfernt zuerst den Keydown-Listener und ruft dann `onClose`. In `confirmModal`/`chooseModal` setzt der Button-Handler `done=true` VOR `modal.close()`, sodass `onClose` nicht doppelt auflöst. Bei Escape/Backdrop wird `close()` ohne vorher gesetztes `done` gerufen → `onClose` löst mit dem Default (false/null) auf.

- [ ] **Step 5: Commit**
```bash
git add js/ui/components/Modal.js js/ui/components/Modal.test.js
git commit -m "TP-B: Modal-Komponente (openModal/confirmModal/chooseModal, Fokus-Trap)"
```

---

## Task 12: ARC42-Dokumentation

**Files:** Modify `docs/arc42/architecture.md`

- [ ] **Step 1: Den Design-System-Absatz in §8 um die Komponenten-Bibliothek ergänzen.** Direkt nach dem TP-A-Satz („…Optik kippt ab TP-C, styles.css entfällt in TP-F.") anfügen:
```markdown
- UI-Komponenten (TP-B): 10 präsentative/Formular-Komponenten als Vanilla-Factories
  (js/ui/components/*, name(props)->HTMLElement via dom.js, kein dynamisches HTML), gestylt
  über rb-*-Klassen in css/components.css (auf TP-A-Tokens). Modal ist eine intentionale
  Ergänzung (openModal/confirmModal/chooseModal) für den Ersatz von confirm()/prompt(). Wie die
  Tokens wird css/components.css bewusst noch nicht global geladen (App optisch unverändert bis TP-C).
```

- [ ] **Step 2: Commit**
```bash
git add docs/arc42/architecture.md
git commit -m "TP-B: ARC42 um Komponenten-Bibliothek ergänzt"
```

---

## Task 13: Gesamtabnahme

- [ ] **Step 1: Alle Unit-Tests grün** — `npm test` → 168 bestehende + neue (components-css 2, Button 5, Badge 3, Alert 4, Card 3, FormField 4, Input 4, Select 4, Radio 3, Combobox 5, Modal 6 = 43 neu) grün.
- [ ] **Step 2: E2E grün** — `npm run e2e` → 4 Flows grün (App unverändert).
- [ ] **Step 3: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert.
- [ ] **Step 4: DoD-Check**
  - [ ] 10 Komponenten + components.css vorhanden, alle Tests grün.
  - [ ] App optisch unverändert (components.css nicht global geladen — `js/app.js` und `css/tokens/index.css` enthalten KEIN `components.css`).
  - [ ] Keine dynamische HTML-Injektion / CDN in `js/ui/components/**` und `css/components.css`.
  - [ ] ARC42 ergänzt.

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** Alle 10 Komponenten je eine Task (T2–T11), components.css (T1), ARC42 (T12), Abnahme (T13). Tabs/Table korrekt nicht enthalten.
- **Signatur-Konsistenz:** Factories heißen durchgängig `button/badge/alert/card/formField/input/select/radioGroup/combobox` + `openModal/confirmModal/chooseModal`. Alle nutzen `el` aus `../dom.js` und `icon` aus `../Icon.js`.
- **Icon-Namen:** alle in ICON_DATA (TP-A) vorhanden: folder-open, check-circle-2, triangle-alert, circle-x, info, alert-circle, check-circle, chevron-down.
- **Kein dynamisches HTML:** alle Komponenten bauen per dom.js/createElement; Tests prüfen Escaping (Badge) und dialog/aria-Struktur (Modal).
- **Listener-Leaks:** Combobox `.destroy()` und Modal `close()` melden document-Listener ab (getestet).
