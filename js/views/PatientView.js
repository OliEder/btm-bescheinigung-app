class PatientView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="patient-tab">
                <h2>Patientendaten</h2>
                <div class="alert alert-info">
                    ℹ️ Bitte geben Sie die persönlichen Daten des Patienten ein
                </div>
                
                <form id="patient-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patient-lastname">Nachname *</label>
                            <input type="text" id="patient-lastname" required>
                        </div>
                        <div class="form-group">
                            <label for="patient-firstname">Vorname *</label>
                            <input type="text" id="patient-firstname" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patient-passport">Pass-/Ausweisnummer *</label>
                            <input type="text" id="patient-passport" required>
                        </div>
                        <div class="form-group">
                            <label for="patient-birthplace">Geburtsort *</label>
                            <input type="text" id="patient-birthplace" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patient-birthdate">Geburtsdatum *</label>
                            <input type="date" id="patient-birthdate" required>
                        </div>
                        <div class="form-group">
                            <label for="patient-nationality">Staatsangehörigkeit *</label>
                            <input type="text" id="patient-nationality" value="Deutsch">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patient-gender">Geschlecht *</label>
                            <select id="patient-gender" required>
                                <option value="">Bitte wählen</option>
                                <option value="männlich">Männlich</option>
                                <option value="weiblich">Weiblich</option>
                                <option value="divers">Divers</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="patient-street">Straße und Hausnummer *</label>
                            <input type="text" id="patient-street" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patient-zip">PLZ *</label>
                            <input type="text" id="patient-zip" required>
                        </div>
                        <div class="form-group">
                            <label for="patient-city">Stadt *</label>
                            <input type="text" id="patient-city" required>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">
                            💾 Patientendaten speichern
                        </button>
                        <button type="button" class="btn btn-secondary" id="load-patient-btn">
                            📂 Gespeicherten Patienten laden
                        </button>
                    </div>
                </form>
            </div>
        `;
    }
    
    render() {
        return this.template;
    }
    
    bindEvents(controller) {
        document.getElementById('patient-form').addEventListener('submit', (e) => {
            e.preventDefault();
            controller.savePatient();
        });
        
        document.getElementById('load-patient-btn').addEventListener('click', () => {
            controller.loadPatient();
        });
    }
    
    populateForm(patient) {
        if (!patient) return;
        
        document.getElementById('patient-lastname').value = patient.lastname || '';
        document.getElementById('patient-firstname').value = patient.firstname || '';
        document.getElementById('patient-passport').value = patient.passport || '';
        document.getElementById('patient-birthplace').value = patient.birthplace || '';
        document.getElementById('patient-birthdate').value = patient.birthdate || '';
        document.getElementById('patient-nationality').value = patient.nationality || '';
        document.getElementById('patient-gender').value = patient.gender || '';
        document.getElementById('patient-street').value = patient.street || '';
        document.getElementById('patient-zip').value = patient.zip || '';
        document.getElementById('patient-city').value = patient.city || '';
    }
    
    getFormData() {
        return {
            lastname: document.getElementById('patient-lastname').value,
            firstname: document.getElementById('patient-firstname').value,
            passport: document.getElementById('patient-passport').value,
            birthplace: document.getElementById('patient-birthplace').value,
            birthdate: document.getElementById('patient-birthdate').value,
            nationality: document.getElementById('patient-nationality').value,
            gender: document.getElementById('patient-gender').value,
            street: document.getElementById('patient-street').value,
            zip: document.getElementById('patient-zip').value,
            city: document.getElementById('patient-city').value
        };
    }
}

export { PatientView };
