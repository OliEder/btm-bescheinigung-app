class DoctorView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="doctor-tab">
                <h2>Arztdaten</h2>
                <div class="alert alert-info">
                    ℹ️ Arzt basierend auf Patientenadresse suchen oder manuell eingeben
                </div>
                
                <div class="button-group">
                    <button class="btn btn-primary" id="search-doctor-btn">
                        🔍 Arzt in der Nähe suchen
                    </button>
                    <button class="btn btn-secondary" id="load-doctor-btn">
                        📂 Gespeicherten Arzt laden
                    </button>
                </div>
                
                <form id="doctor-form" style="margin-top: 20px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="doctor-title">Titel</label>
                            <input type="text" id="doctor-title" value="Dr. med.">
                        </div>
                        <div class="form-group">
                            <label for="doctor-lastname">Nachname *</label>
                            <input type="text" id="doctor-lastname" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="doctor-firstname">Vorname *</label>
                            <input type="text" id="doctor-firstname" required>
                        </div>
                        <div class="form-group">
                            <label for="doctor-phone">Telefon *</label>
                            <input type="tel" id="doctor-phone" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="doctor-address">Praxisadresse *</label>
                        <input type="text" id="doctor-address" required>
                    </div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary">
                            💾 Arztdaten speichern
                        </button>
                        <button type="button" class="btn btn-success" id="link-patient-doctor-btn">
                            🔗 Mit aktuellem Patienten verknüpfen
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
        document.getElementById('doctor-form').addEventListener('submit', (e) => {
            e.preventDefault();
            controller.saveDoctor();
        });
        
        document.getElementById('search-doctor-btn').addEventListener('click', () => {
            controller.searchDoctor();
        });
        
        document.getElementById('load-doctor-btn').addEventListener('click', () => {
            controller.loadDoctor();
        });
        
        document.getElementById('link-patient-doctor-btn').addEventListener('click', () => {
            controller.linkPatientDoctor();
        });
    }
    
    populateForm(doctor) {
        if (!doctor) return;
        
        document.getElementById('doctor-title').value = doctor.title || 'Dr. med.';
        document.getElementById('doctor-lastname').value = doctor.lastname || '';
        document.getElementById('doctor-firstname').value = doctor.firstname || '';
        document.getElementById('doctor-phone').value = doctor.phone || '';
        document.getElementById('doctor-address').value = doctor.address || '';
    }
    
    getFormData() {
        return {
            title: document.getElementById('doctor-title').value,
            lastname: document.getElementById('doctor-lastname').value,
            firstname: document.getElementById('doctor-firstname').value,
            phone: document.getElementById('doctor-phone').value,
            address: document.getElementById('doctor-address').value
        };
    }
}