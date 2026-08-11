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
      // Die TP-B-Combobox meldet das ANGEZEIGTE Label ("Land (Adjektiv)") bzw. den
      // freien Text. Gespeichert werden soll aber das Adjektiv -> hier auflösen.
      onChange: (val) => { this.nationalityInput.value = this._toAdjective(val); },
    });
    this.nationalityCombobox = cb.querySelector('input');
    const wrapper = formField({ label: 'Staatsangehörigkeit', htmlFor: 'patient-nationality', optional: true, control: cb });
    wrapper.appendChild(this.nationalityInput);
    this.fieldEls['patient-nationality'] = { field: { id: 'patient-nationality', name: 'nationality', required: false }, wrapper };
    return wrapper;
  }

  _nationalityOptions(term) {
    if (!this.nationalityRepo) return [];
    return this.nationalityRepo.search(term, 8).map((n) => ({ value: n.adjective, label: `${n.name} (${n.adjective})` }));
  }

  // Löst den von der Combobox gemeldeten Wert (Label "Land (Adjektiv)" ODER Freitext)
  // auf das Adjektiv auf. Reihenfolge: exakte Option per Repo -> Klammer-Adjektiv aus
  // dem Label -> Freitext unverändert.
  _toAdjective(val) {
    const raw = String(val ?? '').trim();
    if (!raw) return '';
    if (this.nationalityRepo) {
      const hit = this.nationalityRepo.findAll().find((n) => `${n.name} (${n.adjective})` === raw || n.adjective === raw || n.name === raw);
      if (hit) return hit.adjective;
    }
    const paren = raw.match(/\(([^)]+)\)\s*$/);
    if (paren) return paren[1].trim();
    return raw;
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
    let errEl = entry.wrapper.querySelector('.rb-field__error');
    if (error) {
      if (!errEl) { errEl = el('p', { class: 'rb-field__error' }); entry.wrapper.appendChild(errEl); }
      errEl.textContent = error;
    } else if (errEl) {
      errEl.remove();
    }
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
    if (this.nationalityCombobox) this.nationalityCombobox.value = patient.nationality || 'deutsch';
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
