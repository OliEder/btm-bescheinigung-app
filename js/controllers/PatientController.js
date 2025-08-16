class PatientController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
    }
    
    init() {
        this.view.bindEvents(this);
        if (this.model.data.currentPatient) {
            this.view.populateForm(this.model.data.currentPatient);
        }
    }
    
    savePatient() {
        const patientData = this.view.getFormData();
        
        // Validate
        if (!this.validatePatientData(patientData)) {
            alert('Bitte füllen Sie alle Pflichtfelder aus!');
            return;
        }
        
        // Check for existing patient
        const existing = this.model.data.patients.find(p => 
            p.firstname === patientData.firstname && 
            p.lastname === patientData.lastname && 
            p.birthdate === patientData.birthdate
        );
        
        if (existing) {
            if (confirm('Patient existiert bereits. Überschreiben?')) {
                this.model.updatePatient(existing.id, patientData);
            }
        } else {
            this.model.addPatient(patientData);
        }
        
        alert('Patientendaten wurden gespeichert!');
    }
    
    loadPatient() {
        const patients = this.model.data.patients;
        
        if (patients.length === 0) {
            alert('Keine gespeicherten Patienten vorhanden!');
            return;
        }
        
        // Simple selection dialog
        let patientList = 'Gespeicherte Patienten:\n\n';
        patients.forEach((patient, index) => {
            patientList += `${index + 1}. ${patient.firstname} ${patient.lastname} (${new Date(patient.birthdate).toLocaleDateString('de-DE')})\n`;
        });
        
        const selection = prompt(patientList + '\nNummer eingeben:');
        if (selection && patients[selection - 1]) {
            this.model.data.currentPatient = patients[selection - 1];
            this.view.populateForm(patients[selection - 1]);
            alert('Patient wurde geladen!');
        }
    }
    
    validatePatientData(data) {
        return data.lastname && data.firstname && data.passport && 
               data.birthplace && data.birthdate && data.gender && 
               data.street && data.zip && data.city;
    }
}