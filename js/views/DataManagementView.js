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
                <h4>${patient.firstname} ${patient.lastname}</h4>
                <p>Geboren: ${new Date(patient.birthdate).toLocaleDateString('de-DE')}</p>
                <p>Adresse: ${patient.zip} ${patient.city}</p>
                <button class="btn btn-secondary btn-small select-patient-btn" data-id="${patient.id}">
                    Auswählen
                </button>
                <button class="btn btn-danger btn-small delete-patient-btn" data-id="${patient.id}">
                    Löschen
                </button>
            </div>
        `).join('');
        
        // Bind events
        container.querySelectorAll('.select-patient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.selectPatient(parseInt(e.target.dataset.id));
            });
        });
        
        container.querySelectorAll('.delete-patient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.deletePatient(parseInt(e.target.dataset.id));
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
                <h4>${doctor.title} ${doctor.firstname} ${doctor.lastname}</h4>
                <p>Telefon: ${doctor.phone}</p>
                <p>Adresse: ${doctor.address}</p>
                <button class="btn btn-secondary btn-small select-doctor-btn" data-id="${doctor.id}">
                    Auswählen
                </button>
                <button class="btn btn-danger btn-small delete-doctor-btn" data-id="${doctor.id}">
                    Löschen
                </button>
            </div>
        `).join('');
        
        // Bind events
        container.querySelectorAll('.select-doctor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.selectDoctor(parseInt(e.target.dataset.id));
            });
        });
        
        container.querySelectorAll('.delete-doctor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.data.deleteDoctor(parseInt(e.target.dataset.id));
            });
        });
    }
    
    displayLinks(links, patients, doctors) {
        const container = document.getElementById('saved-links');
        
        if (links.length === 0) {
            container.innerHTML = '<p>Keine Verknüpfungen vorhanden</p>';
            return;
        }
        
        container.innerHTML = links.map(link => {
            const patient = patients.find(p => p.id === link.patientId);
            const doctor = doctors.find(d => d.id === link.doctorId);
            
            if (!patient || !doctor) return '';
            
            return `
                <div class="saved-data-card">
                    <h4>Verknüpfung</h4>
                    <p><strong>Patient:</strong> ${patient.firstname} ${patient.lastname}</p>
                    <p><strong>Arzt:</strong> ${doctor.title} ${doctor.firstname} ${doctor.lastname}</p>
                    <button class="btn btn-secondary btn-small load-link-btn" 
                            data-patient-id="${link.patientId}" 
                            data-doctor-id="${link.doctorId}">
                        Laden
                    </button>
                </div>
            `;
        }).join('');
        
        // Bind events
        container.querySelectorAll('.load-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = parseInt(e.target.dataset.patientId);
                const doctorId = parseInt(e.target.dataset.doctorId);
                window.app.controllers.data.loadLink(patientId, doctorId);
            });
        });
    }
}