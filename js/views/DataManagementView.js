import { escapeHtml, setDataset } from '../utils/Sanitize.js';

class DataManagementView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="data-tab">
                <h2>Datenverwaltung</h2>
                <div class="alert alert-info">
                    ℹ️ Verwalten Sie gespeicherte Patienten, Ärzte und Verknüpfungen
                </div>
                
                <div class="button-group">
                    <button class="btn btn-primary" id="export-all-data-btn">
                        📤 Alle Daten exportieren
                    </button>
                    <button class="btn btn-secondary" id="import-data-btn">
                        📥 Daten importieren
                    </button>
                    <button class="btn btn-danger" id="clear-all-data-btn">
                        🗑️ Alle Daten löschen
                    </button>
                </div>
                
                <h3 style="margin-top: 30px;">Gespeicherte Patienten</h3>
                <div id="saved-patients" class="saved-data-list"></div>
                
                <h3 style="margin-top: 30px;">Gespeicherte Ärzte</h3>
                <div id="saved-doctors" class="saved-data-list"></div>
                
                <h3 style="margin-top: 30px;">Verknüpfungen</h3>
                <div id="saved-links" class="saved-data-list"></div>
            </div>
        `;
    }
    
    render() {
        return this.template;
    }
    
    bindEvents(controller) {
        document.getElementById('export-all-data-btn').addEventListener('click', () => {
            controller.exportAllData();
        });
        
        document.getElementById('import-data-btn').addEventListener('click', () => {
            controller.importData();
        });
        
        document.getElementById('clear-all-data-btn').addEventListener('click', () => {
            controller.clearAllData();
        });
    }
    
    updateDataDisplay(data) {
        this.displayPatients(data.patients);
        this.displayDoctors(data.doctors);
        this.displayLinks(data.patientDoctorLinks, data.patients, data.doctors);
    }
    
    displayPatients(patients) {
        const container = document.getElementById('saved-patients');
        
        if (patients.length === 0) {
            container.innerHTML = '<p>Keine gespeicherten Patienten</p>';
            return;
        }
        
        container.innerHTML = patients.map(patient => `
            <div class="saved-data-card">
                <h4>${escapeHtml(patient.firstname)} ${escapeHtml(patient.lastname)}</h4>
                <p>Geboren: ${escapeHtml(new Date(patient.birthdate).toLocaleDateString('de-DE'))}</p>
                <p>Adresse: ${escapeHtml(patient.zip)} ${escapeHtml(patient.city)}</p>
                <button class="btn btn-secondary btn-small select-patient-btn">
                    Auswählen
                </button>
                <button class="btn btn-danger btn-small delete-patient-btn">
                    Löschen
                </button>
            </div>
        `).join('');
        
        // IDs per dataset (kein parseInt — IDs sind UUID-Strings)
        container.querySelectorAll('.saved-data-card').forEach((card, i) => {
            const id = patients[i].id;
            setDataset(card.querySelector('.select-patient-btn'), { id });
            setDataset(card.querySelector('.delete-patient-btn'), { id });
        });
        
        container.querySelectorAll('.select-patient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.selectPatient(e.currentTarget.dataset.id);
            });
        });
        
        container.querySelectorAll('.delete-patient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.deletePatient(e.currentTarget.dataset.id);
            });
        });
    }
    
    displayDoctors(doctors) {
        const container = document.getElementById('saved-doctors');
        
        if (doctors.length === 0) {
            container.innerHTML = '<p>Keine gespeicherten Ärzte</p>';
            return;
        }
        
        container.innerHTML = doctors.map(doctor => `
            <div class="saved-data-card">
                <h4>${escapeHtml(doctor.title)} ${escapeHtml(doctor.firstname)} ${escapeHtml(doctor.lastname)}</h4>
                <p>Telefon: ${escapeHtml(doctor.phone)}</p>
                <p>Adresse: ${escapeHtml(doctor.address)}</p>
                <button class="btn btn-secondary btn-small select-doctor-btn">
                    Auswählen
                </button>
                <button class="btn btn-danger btn-small delete-doctor-btn">
                    Löschen
                </button>
            </div>
        `).join('');
        
        container.querySelectorAll('.saved-data-card').forEach((card, i) => {
            const id = doctors[i].id;
            setDataset(card.querySelector('.select-doctor-btn'), { id });
            setDataset(card.querySelector('.delete-doctor-btn'), { id });
        });
        
        container.querySelectorAll('.select-doctor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.selectDoctor(e.currentTarget.dataset.id);
            });
        });
        
        container.querySelectorAll('.delete-doctor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.deleteDoctor(e.currentTarget.dataset.id);
            });
        });
    }
    
    displayLinks(links, patients, doctors) {
        const container = document.getElementById('saved-links');
        
        if (links.length === 0) {
            container.innerHTML = '<p>Keine Verknüpfungen vorhanden</p>';
            return;
        }
        
        const visibleLinks = links.filter(link =>
            patients.find(p => p.id === link.patientId) &&
            doctors.find(d => d.id === link.doctorId));
        
        container.innerHTML = visibleLinks.map(link => {
            const patient = patients.find(p => p.id === link.patientId);
            const doctor = doctors.find(d => d.id === link.doctorId);
            return `
                <div class="saved-data-card">
                    <h4>Verknüpfung</h4>
                    <p><strong>Patient:</strong> ${escapeHtml(patient.firstname)} ${escapeHtml(patient.lastname)}</p>
                    <p><strong>Arzt:</strong> ${escapeHtml(doctor.title)} ${escapeHtml(doctor.firstname)} ${escapeHtml(doctor.lastname)}</p>
                    <button class="btn btn-secondary btn-small load-link-btn">
                        Laden
                    </button>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.load-link-btn').forEach((btn, i) => {
            setDataset(btn, {
                patientId: visibleLinks[i].patientId,
                doctorId: visibleLinks[i].doctorId,
            });
            btn.addEventListener('click', (e) => {
                const { patientId, doctorId } = e.currentTarget.dataset;
                window.app.controllers.data.loadLink(patientId, doctorId);
            });
        });
    }
}

export { DataManagementView };
