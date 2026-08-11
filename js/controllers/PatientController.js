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
