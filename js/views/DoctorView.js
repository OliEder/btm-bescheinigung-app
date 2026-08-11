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
    let errEl = entry.wrapper.querySelector('.rb-field__error');
    if (error) {
      if (!errEl) { errEl = el('p', { class: 'rb-field__error' }); entry.wrapper.appendChild(errEl); }
      errEl.textContent = error;
    } else if (errEl) {
      errEl.remove();
    }
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
