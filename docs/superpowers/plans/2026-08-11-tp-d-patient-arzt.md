# TP-D · Patient + Arzt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migriert PatientView + DoctorView auf Node-Factories (dom.js + TP-B-Komponenten) mit Inline-Validierung, Dokumentennummer-Prüfung, Nationalitäts-Combobox, Speichern-per-Weiter und Dialog-Ersatz (alert/prompt/confirm → Alert/Modal).

**Architecture:** Reine Validierungs-/Prüf-Funktionen (RequiredFields, DocNumber) zuerst; Views bauen DOM via dom.js + TP-B (formField/input/select/combobox), Feld-IDs unverändert (Controller-/E2E-Vertrag); Controller werden async und geben `{ok,missing}` zurück (Dialoge → chooseModal/confirmModal/inline Alert); Shell-Footer „Weiter" ruft je Schritt einen async Save-Hook.

**Tech Stack:** Vanilla JS (ES-Module), dom.js/Icon.js (TP-A), TP-B-Komponenten, NationalityRepository (TP-Nationalities), Vitest+jsdom, Playwright.

**WICHTIG (Schreib-Hook):** Keine der neuen Dateien darf die Literalkette der verbotenen DOM-HTML-Property enthalten. In Tests statt `document.body` zu leeren `document.body.replaceChildren()` verwenden; für Textprüfungen `textContent`. In Views/Komponenten ausschließlich dom.js/`createElement`.

---

## Datei-Struktur

**Neu:**
```
js/utils/DocNumber.js            checkGermanDocNumber(value) -> {valid, hint}
js/utils/DocNumber.test.js
js/validation/RequiredFields.js  validatePatientFields(data)/validateDoctorFields(data) -> string[]
js/validation/RequiredFields.test.js
test/patientview.test.js
test/doctorview.test.js
test/tpd-controllers.test.js
```
**Modifiziert:**
```
js/views/PatientView.js          Node-Factory + Inline-Validierung + DocNumber + Nationalitäts-Combobox
js/views/DoctorView.js           Node-Factory + Inline-Validierung
js/controllers/PatientController.js  savePatient()->{ok,missing} async; loadPatient() chooseModal; confirmModal; inline Alert
js/controllers/DoctorController.js   saveDoctor()->{ok,missing} async; loadDoctor(); search/link inline Alert
js/ui/AppShell.js                Save-Hook beim Footer-„Weiter" (onNext(stepId)->Promise)
js/app.js                        NationalityRepository; Patient/Doctor als Node; Footer-Save-Hook
docs/arc42/architecture.md       §8 Screen-Migration
```

**Feld-IDs (bleiben):** `patient-lastname/firstname/passport/birthplace/birthdate/nationality/
gender/street/zip/city`, `doctor-title/lastname/firstname/phone/address`.

---

## Task 1: RequiredFields — Pflichtfeld-Prüfung (rein)

**Files:** Create `js/validation/RequiredFields.js`, `js/validation/RequiredFields.test.js`

- [ ] **Step 1: Failing test** — `js/validation/RequiredFields.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { validatePatientFields, validateDoctorFields } from './RequiredFields.js';

const fullP = { lastname:'M', firstname:'A', passport:'C1', birthplace:'B', birthdate:'1990-01-01',
  gender:'männlich', street:'W 1', zip:'10115', city:'Berlin', nationality:'deutsch' };
const fullD = { lastname:'S', firstname:'E', phone:'030', address:'Weg 2', title:'Dr. med.' };

describe('validatePatientFields', () => {
  it('vollständig → []', () => { expect(validatePatientFields(fullP)).toEqual([]); });
  it('fehlendes Pflichtfeld erscheint', () => { expect(validatePatientFields({ ...fullP, city: '' })).toContain('city'); });
  it('nationality optional → nicht in der Liste', () => { expect(validatePatientFields({ ...fullP, nationality: '' })).not.toContain('nationality'); });
  it('Whitespace zählt als leer', () => { expect(validatePatientFields({ ...fullP, zip: '   ' })).toContain('zip'); });
});
describe('validateDoctorFields', () => {
  it('vollständig → []', () => { expect(validateDoctorFields(fullD)).toEqual([]); });
  it('fehlendes Pflichtfeld', () => { expect(validateDoctorFields({ ...fullD, address: '' })).toContain('address'); });
  it('title optional → nicht in der Liste', () => { expect(validateDoctorFields({ ...fullD, title: '' })).not.toContain('title'); });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run js/validation/RequiredFields.test.js` → FAIL.

- [ ] **Step 3: Implement `js/validation/RequiredFields.js`:**
```js
// Reine Pflichtfeld-Prüfung. Gibt die Keys leerer Pflichtfelder zurück.
// "leer" = String(v ?? '').trim() === ''. Optional: patient.nationality, doctor.title.
const PATIENT_REQUIRED = ['lastname', 'firstname', 'passport', 'birthplace', 'birthdate',
  'gender', 'street', 'zip', 'city'];
const DOCTOR_REQUIRED = ['lastname', 'firstname', 'phone', 'address'];

function missing(data, keys) {
  const d = data || {};
  return keys.filter((k) => String(d[k] ?? '').trim() === '');
}
export function validatePatientFields(data) { return missing(data, PATIENT_REQUIRED); }
export function validateDoctorFields(data) { return missing(data, DOCTOR_REQUIRED); }
```

- [ ] **Step 4: Run to pass** — PASS (7).

- [ ] **Step 5: Commit**
```bash
git add js/validation/RequiredFields.js js/validation/RequiredFields.test.js
git commit -m "TP-D: RequiredFields — Pflichtfeld-Prüfung (rein)"
```

---

## Task 2: DocNumber — deutsche Dokumentennummer (rein)

**Files:** Create `js/utils/DocNumber.js`, `js/utils/DocNumber.test.js`

- [ ] **Step 1: Failing test** — `js/utils/DocNumber.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { checkGermanDocNumber } from './DocNumber.js';

describe('checkGermanDocNumber', () => {
  it('aktuelles Schema → kein Hinweis', () => {
    const r = checkGermanDocNumber('C1Z9K7');
    expect(r.valid).toBe(true); expect(r.hint).toBeNull();
  });
  it('enthält 0 → Hinweis', () => { expect(checkGermanDocNumber('C0Z9').hint).toBeTruthy(); });
  it('enthält ausgeschlossenen Buchstaben O → Hinweis', () => { expect(checkGermanDocNumber('CO9Z').hint).toBeTruthy(); });
  it('nur Buchstaben (keine Ziffer) → Hinweis', () => { expect(checkGermanDocNumber('CFGHK').hint).toBeTruthy(); });
  it('beginnt mit Ziffer → Hinweis', () => { expect(checkGermanDocNumber('1CZ9').hint).toBeTruthy(); });
  it('leer → valid:false', () => {
    expect(checkGermanDocNumber('').valid).toBe(false);
    expect(checkGermanDocNumber('   ').valid).toBe(false);
  });
  it('case-insensitiv', () => { expect(checkGermanDocNumber('c1z9k7').hint).toBeNull(); });
});
```

- [ ] **Step 2: Run to fail** — FAIL.

- [ ] **Step 3: Implement `js/utils/DocNumber.js`:**
```js
// Prüft die deutsche Pass-/Ausweisnummer TOLERANT (blockiert nie); bei Abweichung vom
// AKTUELLEN Schema ein Hinweis. Regelwerk (BfArM/Bundesdruckerei):
//   erlaubte 26 Zeichen: C F G H J K L M N P R T V W X Y Z + 1..9
//   ausgeschlossen: A B D E I O Q S U ; 0 nur bei Dokumenten vor 01.11.2021
//   Struktur (aktuell): beginnt mit Buchstabe, enthält mind. eine Ziffer
const ALLOWED_LETTERS = 'CFGHJKLMNPRTVWXYZ';
const CURRENT_CHARS = new RegExp(`^[${ALLOWED_LETTERS}1-9]+$`);
const HINT = 'Bitte die Dokumentennummer noch einmal kontrollieren — Abweichungen vom aktuellen '
  + 'Schema können ein Ablehnungsgrund sein.';

export function checkGermanDocNumber(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return { valid: false, hint: null };
  const s = raw.toUpperCase();
  const matchesCurrent = /^[A-Z]/.test(s) && /[0-9]/.test(s) && CURRENT_CHARS.test(s);
  return { valid: true, hint: matchesCurrent ? null : HINT };
}
```
> `CURRENT_CHARS` schließt `0` und ausgeschlossene Buchstaben (A/B/D/E/I/O/Q/S/U) aus → beide Fälle erzeugen den Hinweis.

- [ ] **Step 4: Run to pass** — PASS (7).

- [ ] **Step 5: Commit**
```bash
git add js/utils/DocNumber.js js/utils/DocNumber.test.js
git commit -m "TP-D: DocNumber — deutsche Dokumentennummer (tolerant + Warnung)"
```

---

## Task 3: AppShell — Save-Hook beim Footer-„Weiter"

**Files:** Modify `js/ui/AppShell.js`, `js/ui/AppShell.test.js`

- [ ] **Step 1: Failing test anhängen** — an `js/ui/AppShell.test.js`:
```js
describe('AppShell — Save-Hook beim Weiter (TP-D)', () => {
  it('Weiter ruft onNext; bei ok:true wird navigiert', async () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const onNavigate = vi.fn();
    const onNext = vi.fn().mockResolvedValue({ ok: true, missing: [] });
    const shell = new AppShell({ steps: STEPS, onNavigate, onGenerate: vi.fn(), onNext });
    shell.mount(root); shell.setActive('patient');
    root.querySelector('[data-role=next]').click();
    await Promise.resolve(); await Promise.resolve();
    expect(onNext).toHaveBeenCalledWith('patient');
    expect(onNavigate).toHaveBeenCalledWith('doctor');
  });
  it('bei ok:false wird NICHT navigiert', async () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const onNavigate = vi.fn();
    const onNext = vi.fn().mockResolvedValue({ ok: false, missing: ['city'] });
    const shell = new AppShell({ steps: STEPS, onNavigate, onGenerate: vi.fn(), onNext });
    shell.mount(root); shell.setActive('patient');
    root.querySelector('[data-role=next]').click();
    await Promise.resolve(); await Promise.resolve();
    expect(onNext).toHaveBeenCalledWith('patient');
    expect(onNavigate).not.toHaveBeenCalled();
  });
  it('ohne onNext: Weiter navigiert wie bisher', () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const onNavigate = vi.fn();
    const shell = new AppShell({ steps: STEPS, onNavigate, onGenerate: vi.fn() });
    shell.mount(root); shell.setActive('patient');
    root.querySelector('[data-role=next]').click();
    expect(onNavigate).toHaveBeenCalledWith('doctor');
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL.

- [ ] **Step 3: Implement** — in `js/ui/AppShell.js`:
  (a) Konstruktor: ersetze
```js
  constructor({ steps, onNavigate, onGenerate } = {}) {
    this.steps = steps || [];
    this.inputSteps = this.steps.filter((s) => !s.utility);
    this.onNavigate = onNavigate || (() => {});
    this.onGenerate = onGenerate || (() => {});
```
  durch
```js
  constructor({ steps, onNavigate, onGenerate, onNext } = {}) {
    this.steps = steps || [];
    this.inputSteps = this.steps.filter((s) => !s.utility);
    this.onNavigate = onNavigate || (() => {});
    this.onGenerate = onGenerate || (() => {});
    this.onNext = onNext || null;
    this._navigating = false;
```
  (b) `_go(delta)` ersetzen durch:
```js
  _go(delta) {
    const idx = this.inputSteps.findIndex((s) => s.id === this.active);
    if (idx === -1) return;
    if (delta < 0) {
      const prev = idx - 1;
      if (prev >= 0) this.onNavigate(this.inputSteps[prev].id);
      return;
    }
    const proceed = () => {
      const isLast = this.active === 'travel';
      if (isLast) { this.onGenerate(); this.onNavigate('certificates'); return; }
      const nextIdx = idx + 1;
      if (nextIdx < this.inputSteps.length) this.onNavigate(this.inputSteps[nextIdx].id);
    };
    if (!this.onNext) { proceed(); return; }
    if (this._navigating) return;
    this._navigating = true;
    Promise.resolve(this.onNext(this.active))
      .then((res) => { if (res && res.ok) proceed(); })
      .finally(() => { this._navigating = false; });
  }
```

- [ ] **Step 4: Run to pass** — `npx vitest run js/ui/AppShell.test.js` → alle grün.

- [ ] **Step 5: Commit**
```bash
git add js/ui/AppShell.js js/ui/AppShell.test.js
git commit -m "TP-D: AppShell — async Save-Hook beim Footer-Weiter (nur bei ok navigieren)"
```

---

## Task 4: PatientView — Node-Factory + Validierung + Combobox

**Files:** Modify `js/views/PatientView.js`, Create `test/patientview.test.js`

- [ ] **Step 1: Failing test** — `test/patientview.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { PatientView } from '../js/views/PatientView.js';

function mount() {
  const view = new PatientView();
  document.body.replaceChildren(view.render());
  return view;
}

describe('PatientView (Node-Factory)', () => {
  it('render() liefert Node mit allen Feld-IDs', () => {
    mount();
    for (const id of ['patient-lastname','patient-firstname','patient-passport','patient-birthplace',
      'patient-birthdate','patient-nationality','patient-gender','patient-street','patient-zip','patient-city']) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(document.getElementById('patient-form')).not.toBeNull();
  });
  it('kein Speichern-Button, aber Laden-Button', () => {
    mount();
    expect([...document.querySelectorAll('button')].some((b) => /speichern/i.test(b.textContent))).toBe(false);
    expect(document.getElementById('load-patient-btn')).not.toBeNull();
  });
  it('nur optionale Felder tragen "(optional)"; keine Label mit *', () => {
    mount();
    expect(document.body.textContent).toContain('(optional)');
    const labels = [...document.querySelectorAll('.rb-field__label')].map((l) => l.textContent);
    expect(labels.every((t) => !t.includes('*'))).toBe(true);
  });
  it('getFormData liest Feldwerte', () => {
    const view = mount();
    document.getElementById('patient-lastname').value = 'Muster';
    expect(view.getFormData().lastname).toBe('Muster');
  });
  it('showMissing markiert Felder (Pflichtfeld-Text erscheint)', () => {
    const view = mount();
    view.showMissing(['firstname']);
    expect(document.body.textContent).toContain('Pflichtfeld');
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL.

- [ ] **Step 3: Implement `js/views/PatientView.js`** (vollständige Neufassung):
```js
import { el } from '../ui/dom.js';
import { input } from '../ui/components/Input.js';
import { formField } from '../ui/components/FormField.js';
import { select } from '../ui/components/Select.js';
import { combobox } from '../ui/components/Combobox.js';
import { alert as alertBox } from '../ui/components/Alert.js';
import { checkGermanDocNumber } from '../utils/DocNumber.js';

const FIELDS = [
  { id: 'patient-lastname', name: 'lastname', label: 'Nachname', required: true },
  { id: 'patient-firstname', name: 'firstname', label: 'Vorname', required: true },
  { id: 'patient-passport', name: 'passport', label: 'Pass-/Ausweisnummer', required: true },
  { id: 'patient-birthplace', name: 'birthplace', label: 'Geburtsort', required: true },
  { id: 'patient-birthdate', name: 'birthdate', label: 'Geburtsdatum', required: true, type: 'date' },
  { id: 'patient-street', name: 'street', label: 'Straße und Hausnummer', required: true },
  { id: 'patient-zip', name: 'zip', label: 'PLZ', required: true },
  { id: 'patient-city', name: 'city', label: 'Stadt', required: true },
];

export class PatientView {
  constructor(nationalityRepo) {
    this.nationalityRepo = nationalityRepo || null;
    this.fieldEls = {};
  }

  render() {
    const grid = el('div', { class: 'form-grid' });
    for (const f of FIELDS) grid.appendChild(this._textField(f));
    grid.appendChild(this._genderField());
    grid.appendChild(this._nationalityField());

    this.alertSlot = el('div', { class: 'view-alert' });
    this.loadBtn = el('button', { id: 'load-patient-btn', type: 'button', class: 'rb-btn rb-btn--secondary rb-btn--md' }, ['Gespeicherten Patienten laden']);
    this.form = el('form', { id: 'patient-form' }, [grid, el('div', { class: 'view-actions' }, [this.loadBtn])]);
    this.root = el('div', { id: 'patient-tab' }, [el('h2', {}, ['Patientendaten']), this.alertSlot, this.form]);
    return this.root;
  }

  _textField(f) {
    const control = input({ id: f.id, name: f.name, type: f.type || 'text' });
    const inputEl = control.querySelector('input');
    inputEl.addEventListener('blur', () => this._validateField(f, inputEl));
    if (f.id === 'patient-passport') inputEl.addEventListener('blur', () => this._checkDocNumber(inputEl));
    const wrapper = formField({ label: f.label, htmlFor: f.id, control });
    this.fieldEls[f.id] = { field: f, wrapper };
    return wrapper;
  }

  _genderField() {
    const control = select({
      id: 'patient-gender', name: 'gender', placeholder: 'Bitte wählen',
      options: [{ value: 'männlich', label: 'Männlich' }, { value: 'weiblich', label: 'Weiblich' }, { value: 'divers', label: 'Divers' }],
    });
    const wrapper = formField({ label: 'Geschlecht', htmlFor: 'patient-gender', control });
    this.fieldEls['patient-gender'] = { field: { id: 'patient-gender', name: 'gender', required: true }, wrapper };
    return wrapper;
  }

  _nationalityField() {
    this.nationalityInput = el('input', { id: 'patient-nationality', name: 'nationality', type: 'hidden' });
    this.nationalityInput.value = 'deutsch';
    const cb = combobox({
      placeholder: 'z.B. deutsch', value: 'deutsch',
      options: this._nationalityOptions(''),
      onChange: (val) => { this.nationalityInput.value = val; },
    });
    const wrapper = formField({ label: 'Staatsangehörigkeit', htmlFor: 'patient-nationality', optional: true, control: cb });
    wrapper.appendChild(this.nationalityInput);
    this.fieldEls['patient-nationality'] = { field: { id: 'patient-nationality', name: 'nationality', required: false }, wrapper };
    return wrapper;
  }

  _nationalityOptions(term) {
    if (!this.nationalityRepo) return [];
    return this.nationalityRepo.search(term, 8).map((n) => ({ value: n.adjective, label: `${n.name} (${n.adjective})` }));
  }

  _validateField(f, inputEl) {
    if (!f.required) return;
    const empty = String(inputEl.value ?? '').trim() === '';
    this._setFieldError(f, empty ? 'Pflichtfeld' : null, !empty);
  }

  _checkDocNumber(inputEl) {
    const nationality = this.nationalityInput ? this.nationalityInput.value : '';
    if (String(nationality).toLowerCase() !== 'deutsch') { this._setFieldHint('patient-passport', null); return; }
    const { hint } = checkGermanDocNumber(inputEl.value);
    this._setFieldHint('patient-passport', hint);
  }

  _setFieldError(f, error, valid) {
    const entry = this.fieldEls[f.id]; if (!entry) return;
    const cur = document.getElementById(f.id) ? document.getElementById(f.id).value : '';
    const fresh = input({ id: f.id, name: f.name, type: f.type || 'text', value: cur, error, valid });
    const freshInput = fresh.querySelector('input');
    freshInput.addEventListener('blur', () => this._validateField(f, freshInput));
    if (f.id === 'patient-passport') freshInput.addEventListener('blur', () => this._checkDocNumber(freshInput));
    const old = entry.wrapper.querySelector('.rb-input-wrap');
    if (old) entry.wrapper.replaceChild(fresh, old);
  }

  _setFieldHint(id, hint) {
    const entry = this.fieldEls[id]; if (!entry) return;
    let hintEl = entry.wrapper.querySelector('.rb-field__hint');
    if (hint) { if (!hintEl) { hintEl = el('p', { class: 'rb-field__hint' }); entry.wrapper.appendChild(hintEl); } hintEl.textContent = hint; }
    else if (hintEl) hintEl.remove();
  }

  showMissing(keys) {
    for (const key of keys) {
      const id = `patient-${key}`;
      const entry = this.fieldEls[id];
      if (entry) this._setFieldError(entry.field, 'Pflichtfeld', false);
    }
  }

  showInfo(message) {
    if (this.alertSlot) this.alertSlot.replaceChildren(alertBox({ tone: 'success', children: String(message) }));
  }

  bindEvents(controller) {
    if (this.loadBtn) this.loadBtn.addEventListener('click', () => controller.loadPatient());
  }

  populateForm(patient) {
    if (!patient) return;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
    set('patient-lastname', patient.lastname); set('patient-firstname', patient.firstname);
    set('patient-passport', patient.passport); set('patient-birthplace', patient.birthplace);
    set('patient-birthdate', patient.birthdate); set('patient-nationality', patient.nationality || 'deutsch');
    set('patient-gender', patient.gender); set('patient-street', patient.street);
    set('patient-zip', patient.zip); set('patient-city', patient.city);
  }

  getFormData() {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    return { lastname: v('patient-lastname'), firstname: v('patient-firstname'), passport: v('patient-passport'),
      birthplace: v('patient-birthplace'), birthdate: v('patient-birthdate'), nationality: v('patient-nationality'),
      gender: v('patient-gender'), street: v('patient-street'), zip: v('patient-zip'), city: v('patient-city') };
  }
}
```
> **Combobox-Dynamik (YAGNI):** Die TP-B-`combobox` filtert aus ihrer options-Closure; für TP-D
> genügt Initialisierung mit den ersten Treffern + Spiegeln des gewählten Werts ins hidden
> `#patient-nationality`. Freitext bleibt möglich. Reaktive Options-Neubefüllung ist NICHT Teil von TP-D.

- [ ] **Step 4: Run to pass** — `npx vitest run test/patientview.test.js` → PASS.

- [ ] **Step 5: Commit**
```bash
git add js/views/PatientView.js test/patientview.test.js
git commit -m "TP-D: PatientView als Node-Factory (Validierung, DocNumber, Nationalitäts-Combobox)"
```

---

## Task 5: DoctorView — Node-Factory + Validierung

**Files:** Modify `js/views/DoctorView.js`, Create `test/doctorview.test.js`

- [ ] **Step 1: Failing test** — `test/doctorview.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { DoctorView } from '../js/views/DoctorView.js';

function mount() {
  const view = new DoctorView();
  document.body.replaceChildren(view.render());
  return view;
}

describe('DoctorView (Node-Factory)', () => {
  it('render() liefert Node mit allen Feld-IDs', () => {
    mount();
    for (const id of ['doctor-title','doctor-lastname','doctor-firstname','doctor-phone','doctor-address']) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(document.getElementById('doctor-form')).not.toBeNull();
  });
  it('kein Speichern-Button; Laden/Suchen/Verknüpfen vorhanden', () => {
    mount();
    expect([...document.querySelectorAll('button')].some((b) => /speichern/i.test(b.textContent))).toBe(false);
    expect(document.getElementById('load-doctor-btn')).not.toBeNull();
    expect(document.getElementById('search-doctor-btn')).not.toBeNull();
    expect(document.getElementById('link-patient-doctor-btn')).not.toBeNull();
  });
  it('nur title trägt "(optional)"; keine Label mit *', () => {
    mount();
    expect(document.body.textContent).toContain('(optional)');
    const labels = [...document.querySelectorAll('.rb-field__label')].map((l) => l.textContent);
    expect(labels.every((t) => !t.includes('*'))).toBe(true);
  });
  it('getFormData/populateForm über IDs', () => {
    const view = mount();
    view.populateForm({ title: 'Prof.', lastname: 'Schmidt', firstname: 'E', phone: '030', address: 'Weg 2' });
    expect(view.getFormData().lastname).toBe('Schmidt');
    expect(view.getFormData().title).toBe('Prof.');
  });
  it('showMissing markiert Felder', () => {
    const view = mount();
    view.showMissing(['address']);
    expect(document.body.textContent).toContain('Pflichtfeld');
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL.

- [ ] **Step 3: Implement `js/views/DoctorView.js`:**
```js
import { el } from '../ui/dom.js';
import { input } from '../ui/components/Input.js';
import { formField } from '../ui/components/FormField.js';
import { alert as alertBox } from '../ui/components/Alert.js';

const FIELDS = [
  { id: 'doctor-title', name: 'title', label: 'Titel', required: false, def: 'Dr. med.' },
  { id: 'doctor-lastname', name: 'lastname', label: 'Nachname', required: true },
  { id: 'doctor-firstname', name: 'firstname', label: 'Vorname', required: true },
  { id: 'doctor-phone', name: 'phone', label: 'Telefon', required: true, type: 'tel' },
  { id: 'doctor-address', name: 'address', label: 'Praxisadresse', required: true },
];

export class DoctorView {
  constructor() { this.fieldEls = {}; }

  render() {
    const grid = el('div', { class: 'form-grid' });
    for (const f of FIELDS) grid.appendChild(this._field(f));
    this.searchBtn = el('button', { id: 'search-doctor-btn', type: 'button', class: 'rb-btn rb-btn--primary rb-btn--md' }, ['Arzt in der Nähe suchen']);
    this.loadBtn = el('button', { id: 'load-doctor-btn', type: 'button', class: 'rb-btn rb-btn--secondary rb-btn--md' }, ['Gespeicherten Arzt laden']);
    this.linkBtn = el('button', { id: 'link-patient-doctor-btn', type: 'button', class: 'rb-btn rb-btn--secondary rb-btn--md' }, ['Mit aktuellem Patienten verknüpfen']);
    this.alertSlot = el('div', { class: 'view-alert' });
    this.form = el('form', { id: 'doctor-form' }, [
      el('div', { class: 'view-actions' }, [this.searchBtn, this.loadBtn]), grid,
      el('div', { class: 'view-actions' }, [this.linkBtn]),
    ]);
    this.root = el('div', { id: 'doctor-tab' }, [el('h2', {}, ['Arztdaten']), this.alertSlot, this.form]);
    return this.root;
  }

  _field(f) {
    const control = input({ id: f.id, name: f.name, type: f.type || 'text' });
    const inputEl = control.querySelector('input');
    if (f.def) inputEl.value = f.def;
    if (f.required) inputEl.addEventListener('blur', () => this._validate(f, inputEl));
    const wrapper = formField({ label: f.label, htmlFor: f.id, optional: !f.required, control });
    this.fieldEls[f.id] = { field: f, wrapper };
    return wrapper;
  }

  _validate(f, inputEl) {
    const empty = String(inputEl.value ?? '').trim() === '';
    this._setError(f, empty ? 'Pflichtfeld' : null, !empty);
  }

  _setError(f, error, valid) {
    const entry = this.fieldEls[f.id]; if (!entry) return;
    const cur = document.getElementById(f.id) ? document.getElementById(f.id).value : '';
    const fresh = input({ id: f.id, name: f.name, type: f.type || 'text', value: cur, error, valid });
    const freshInput = fresh.querySelector('input');
    if (f.required) freshInput.addEventListener('blur', () => this._validate(f, freshInput));
    const old = entry.wrapper.querySelector('.rb-input-wrap');
    if (old) entry.wrapper.replaceChild(fresh, old);
  }

  showMissing(keys) {
    for (const key of keys) { const id = `doctor-${key}`; const e = this.fieldEls[id]; if (e) this._setError(e.field, 'Pflichtfeld', false); }
  }

  showInfo(message) {
    if (this.alertSlot) this.alertSlot.replaceChildren(alertBox({ tone: 'success', children: String(message) }));
  }

  bindEvents(controller) {
    this.searchBtn.addEventListener('click', () => controller.searchDoctor());
    this.loadBtn.addEventListener('click', () => controller.loadDoctor());
    this.linkBtn.addEventListener('click', () => controller.linkPatientDoctor());
  }

  populateForm(doctor) {
    if (!doctor) return;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
    set('doctor-title', doctor.title || 'Dr. med.'); set('doctor-lastname', doctor.lastname);
    set('doctor-firstname', doctor.firstname); set('doctor-phone', doctor.phone); set('doctor-address', doctor.address);
  }

  getFormData() {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    return { title: v('doctor-title'), lastname: v('doctor-lastname'), firstname: v('doctor-firstname'), phone: v('doctor-phone'), address: v('doctor-address') };
  }
}
```

- [ ] **Step 4: Run to pass** — PASS.

- [ ] **Step 5: Commit**
```bash
git add js/views/DoctorView.js test/doctorview.test.js
git commit -m "TP-D: DoctorView als Node-Factory (Validierung, keine Speichern-Buttons)"
```

---

## Task 6: Controller — async save/load + Dialog-Ersatz

**Files:** Modify `js/controllers/PatientController.js`, `js/controllers/DoctorController.js`; Create `test/tpd-controllers.test.js`

VORAB: `js/models/DataStore.js` prüfen, dass `addPatient/updatePatient/addDoctor/updateDoctor/
linkPatientDoctor` existieren (Signaturen). Falls abweichend → Aufrufe unten daran anpassen.

- [ ] **Step 1: Failing test** — `test/tpd-controllers.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { PatientController } from '../js/controllers/PatientController.js';

function makeModel() {
  return { data: { patients: [], currentPatient: null },
    addPatient: vi.fn(function (p) { this.data.patients.push(p); this.data.currentPatient = p; }),
    updatePatient: vi.fn() };
}
const fullP = { lastname:'M', firstname:'A', passport:'C1', birthplace:'B', birthdate:'1990-01-01',
  gender:'männlich', street:'W 1', zip:'10115', city:'Berlin', nationality:'deutsch' };

describe('PatientController.savePatient (async, {ok,missing})', () => {
  it('fehlende Pflichtfelder → {ok:false, missing}, kein Model-Write', async () => {
    const model = makeModel();
    const view = { getFormData: () => ({ ...fullP, city: '' }), showMissing: vi.fn(), showInfo: vi.fn() };
    const res = await new PatientController(model, view).savePatient();
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('city');
    expect(model.addPatient).not.toHaveBeenCalled();
    expect(view.showMissing).toHaveBeenCalledWith(res.missing);
  });
  it('vollständig → {ok:true} + Model-Write', async () => {
    const model = makeModel();
    const view = { getFormData: () => fullP, showMissing: vi.fn(), showInfo: vi.fn() };
    const res = await new PatientController(model, view).savePatient();
    expect(res.ok).toBe(true);
    expect(model.addPatient).toHaveBeenCalled();
    expect(view.showInfo).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL.

- [ ] **Step 3: Implement `js/controllers/PatientController.js`:**
```js
import { validatePatientFields } from '../validation/RequiredFields.js';
import { confirmModal, chooseModal } from '../ui/components/Modal.js';

class PatientController {
  constructor(model, view) { this.model = model; this.view = view; }

  init() {
    this.view.bindEvents(this);
    if (this.model.data.currentPatient) this.view.populateForm(this.model.data.currentPatient);
  }

  async savePatient() {
    const data = this.view.getFormData();
    const missing = validatePatientFields(data);
    if (missing.length) { this.view.showMissing(missing); return { ok: false, missing }; }
    const existing = this.model.data.patients.find((p) =>
      p.firstname === data.firstname && p.lastname === data.lastname && p.birthdate === data.birthdate);
    if (existing) {
      const overwrite = await confirmModal({ title: 'Patient existiert bereits',
        message: 'Vorhandenen Patienten überschreiben?', confirmLabel: 'Überschreiben' });
      if (overwrite) this.model.updatePatient(existing.id, data);
    } else {
      this.model.addPatient(data);
    }
    if (this.view.showInfo) this.view.showInfo('Patientendaten gespeichert.');
    return { ok: true, missing: [] };
  }

  async loadPatient() {
    const patients = this.model.data.patients;
    if (!patients.length) { if (this.view.showInfo) this.view.showInfo('Keine gespeicherten Patienten vorhanden.'); return; }
    const chosen = await chooseModal({ title: 'Gespeicherten Patienten laden', items: patients,
      renderItem: (p) => `${p.firstname} ${p.lastname} (${p.birthdate || ''})` });
    if (chosen) { this.model.data.currentPatient = chosen; this.view.populateForm(chosen); }
  }
}
export { PatientController };
```

- [ ] **Step 4: Run to pass** — PASS.

- [ ] **Step 5: `js/controllers/DoctorController.js`:**
```js
import { validateDoctorFields } from '../validation/RequiredFields.js';
import { confirmModal, chooseModal } from '../ui/components/Modal.js';

class DoctorController {
  constructor(model, view) { this.model = model; this.view = view; }

  init() {
    this.view.bindEvents(this);
    if (this.model.data.currentDoctor) this.view.populateForm(this.model.data.currentDoctor);
  }

  async saveDoctor() {
    const data = this.view.getFormData();
    const missing = validateDoctorFields(data);
    if (missing.length) { this.view.showMissing(missing); return { ok: false, missing }; }
    const existing = this.model.data.doctors.find((d) =>
      d.firstname === data.firstname && d.lastname === data.lastname && d.address === data.address);
    if (existing) {
      const overwrite = await confirmModal({ title: 'Arzt existiert bereits',
        message: 'Vorhandenen Arzt überschreiben?', confirmLabel: 'Überschreiben' });
      if (overwrite) this.model.updateDoctor(existing.id, data);
    } else {
      this.model.addDoctor(data);
    }
    if (this.view.showInfo) this.view.showInfo('Arztdaten gespeichert.');
    return { ok: true, missing: [] };
  }

  async loadDoctor() {
    const doctors = this.model.data.doctors;
    if (!doctors.length) { if (this.view.showInfo) this.view.showInfo('Keine gespeicherten Ärzte vorhanden.'); return; }
    const chosen = await chooseModal({ title: 'Gespeicherten Arzt laden', items: doctors,
      renderItem: (d) => `${d.title || ''} ${d.firstname} ${d.lastname}`.trim() });
    if (chosen) { this.model.data.currentDoctor = chosen; this.view.populateForm(chosen); }
  }

  searchDoctor() {
    if (!this.model.data.currentPatient) { if (this.view.showInfo) this.view.showInfo('Bitte erst Patientendaten eingeben.'); return; }
    if (this.view.showInfo) this.view.showInfo('Arzt-Suche steht in dieser Version nicht zur Verfügung.');
  }

  linkPatientDoctor() {
    if (!this.model.data.currentPatient || !this.model.data.currentDoctor) {
      if (this.view.showInfo) this.view.showInfo('Bitte erst Patient und Arzt speichern.'); return;
    }
    this.model.linkPatientDoctor(this.model.data.currentPatient.id, this.model.data.currentDoctor.id);
    if (this.view.showInfo) this.view.showInfo('Patient und Arzt wurden verknüpft.');
  }
}
export { DoctorController };
```
> **Hinweis:** `linkPatientDoctor(patientId, doctorId)` an die tatsächliche DataStore-Signatur
> anpassen (im Zweifel `js/models/DataStore.js` prüfen). Die frühere `searchDoctor`-Dummy-Logik
> (setzte feste Fake-Werte) wird durch einen ehrlichen Hinweis ersetzt.

- [ ] **Step 6: Commit**
```bash
git add js/controllers/PatientController.js js/controllers/DoctorController.js test/tpd-controllers.test.js
git commit -m "TP-D: Controller async {ok,missing}; Dialoge → confirmModal/chooseModal/Inline-Alert"
```

---

## Task 7: app.js — Node-Views, Nationality-Repo, Footer-Save-Hook

**Files:** Modify `js/app.js`

- [ ] **Step 1: Importe ergänzen** (oben):
```js
import nationalitiesData from '../data/nationalities.json';
import { NationalityRepository } from './repositories/NationalityRepository.js';
```

- [ ] **Step 2: Repository im Konstruktor** — bei den anderen Repositories:
```js
        this.nationalityRepository = new NationalityRepository(nationalitiesData);
```

- [ ] **Step 3: PatientView mit Repo** — in `initializeViews()`:
```js
        this.views.patient = new PatientView(this.nationalityRepository);
```

- [ ] **Step 4: Shell mit onNext** — `setupNavigation()`:
```js
  setupNavigation() {
    this.shell = new AppShell({
      steps: SHELL_STEPS,
      onNavigate: (id) => this.showTab(id),
      onGenerate: () => {},
      onNext: (stepId) => this._saveStep(stepId),
    });
    this.shell.mount(document.getElementById('app'));
  }

  async _saveStep(stepId) {
    if (stepId === 'patient') return this.controllers.patient.savePatient();
    if (stepId === 'doctor') return this.controllers.doctor.saveDoctor();
    return { ok: true, missing: [] };
  }
```

- [ ] **Step 5: showTab — Patient/Doctor als Node** — den `showTab`-Body ersetzen durch:
```js
  showTab(tabId) {
    this.shell.hideStart();
    let content;
    switch (tabId) {
      case 'patient': content = this.views.patient.render(); break;
      case 'doctor': content = this.views.doctor.render(); break;
      case 'medication': content = this.views.medication.render(); break;
      case 'travel': content = this.views.travel.render(); break;
      case 'certificates': content = this.views.certificates.render(); break;
      case 'data': content = this.views.data.render(); break;
      default: tabId = 'patient'; content = this.views.patient.render();
    }
    this.shell.setContent(content);
    this.shell.setActive(tabId);
    this.shell.setStatus(stepStatus(this.model.data));
    switch (tabId) {
      case 'patient': this.controllers.patient.init(); break;
      case 'doctor': this.controllers.doctor.init(); break;
      case 'medication': this.controllers.medication.init(); break;
      case 'travel': this.controllers.travel.init(); break;
      case 'certificates': this.controllers.pdf.init(); break;
      case 'data': this.controllers.data.init(); break;
    }
    this.currentTab = tabId;
  }
```

- [ ] **Step 6: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert.

- [ ] **Step 7: Commit**
```bash
git add js/app.js
git commit -m "TP-D: app.js — Patient/Doctor als Node, NationalityRepo, Footer-Save-Hook"
```

---

## Task 8: E2E anpassen

**Files:** Modify `e2e/full-flow.spec.js`, `e2e/save-patient-doctor.spec.js`

- [ ] **Step 1: Dev-Server killen** — `lsof -ti:8080 | xargs kill -9 2>/dev/null; echo ok`
- [ ] **Step 2: Save-Flow umstellen** — in beiden Specs: nach dem Ausfüllen der Patient-/Arzt-Felder
  KEINEN Speichern-Button und KEIN `page.on('dialog', …)` mehr für „gespeichert"; stattdessen
  Footer klicken: `await page.locator('[data-role=next]').click();`. „Laden"/„Überschreiben" (falls im
  Flow) auf Modal-Klicks umstellen (Item per Text; Bestätigen via `.rb-modal__actions .rb-btn--primary`).
  Feld-IDs bleiben.
- [ ] **Step 3: E2E ausführen** — `npm run e2e 2>&1 | tail -25`; nur Selektoren/Flow anpassen (kein
  Produktions-Bending). Kompletter Flow (frisch + gespeicherte Datei) grün. Neue Assertion:
  leeres Pflichtfeld + „Weiter" → Formular bleibt sichtbar (`#patient-form`) und „Pflichtfeld"-Text erscheint.
- [ ] **Step 4: Commit**
```bash
git add e2e
git commit -m "TP-D: E2E auf Speichern-per-Weiter + Modal umgestellt"
```

---

## Task 9: ARC42 + Gesamtabnahme

**Files:** Modify `docs/arc42/architecture.md`

- [ ] **Step 1: §8 ergänzen** — nach dem TP-C/Mobile-Absatz:
```markdown
- Screen-Migration (TP-D): PatientView/DoctorView als Node-Factories (dom.js + TP-B-Komponenten,
  kein innerHTML); Feld-IDs unverändert (Controller-/E2E-Vertrag). Inline-Validierung: nur optionale
  Felder markiert („(optional)"), Pflichtfehler bei Blur/Weiter. Speichern-per-Weiter über den
  Shell-Footer (onNext-Save-Hook je Schritt, Ergebnis {ok,missing}; nur bei ok navigieren).
  Dialoge → Alert (inline)/confirmModal/chooseModal (Controller async). Dokumentennummer-Prüfung
  (DocNumber) nur bei dt. Staatsangehörigkeit, tolerant + Warnung (blockiert nicht).
  Staatsangehörigkeit als Combobox (NationalityRepository/DESTATIS), Adjektiv gespeichert.
  PDF-Trigger am letzten Schritt (travel) folgt in TP-E über denselben Save-Hook.
```

- [ ] **Step 2: Commit** `git add docs/arc42/architecture.md && git commit -m "TP-D: ARC42 Screen-Migration"`

- [ ] **Step 3: Unit-Tests** — `npm test` → 267 bestehende + neu (RequiredFields 7, DocNumber 7,
  AppShell +3, PatientView 5, DoctorView 5, Controller 2) grün.
- [ ] **Step 4: E2E** — `lsof -ti:8080 | xargs kill -9 2>/dev/null; npm run e2e` → alle grün.
- [ ] **Step 5: Build** — `npx webpack --mode production 2>&1 | tail -5` → kompiliert.
- [ ] **Step 6: DoD-Check** — s. Spec „Definition of Done".

---

## Selbst-Review-Notiz (bereits eingearbeitet)

- **Spec-Abdeckung:** RequiredFields (T1), DocNumber (T2), Save-Hook (T3), PatientView inkl.
  Combobox/DocNumber (T4), DoctorView (T5), Controller async + Modals (T6), app.js (T7), E2E (T8),
  ARC42/Abnahme (T9). PDF-Trigger bewusst TP-E.
- **Feld-ID-Vertrag:** getFormData/populateForm rein ID-basiert → Controller/E2E unverändert nutzbar.
- **Signatur-Konsistenz:** `savePatient()/saveDoctor()->Promise<{ok,missing}>`;
  `validatePatientFields/validateDoctorFields(data)->string[]`; `checkGermanDocNumber(value)->{valid,hint}`;
  `AppShell({...,onNext})`, `onNext(stepId)->Promise<{ok}>`; `NationalityRepository.search`.
- **DataStore-API:** in T6 vorab verifizieren (addPatient/updatePatient/addDoctor/updateDoctor/linkPatientDoctor).
- **Kein verbotenes DOM-HTML** in neuen Dateien (Tests nutzen replaceChildren/textContent; Views dom.js).
