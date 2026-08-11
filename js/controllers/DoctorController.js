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
