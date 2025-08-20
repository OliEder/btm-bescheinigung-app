class DataController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
    }
    
    init() {
        this.view.bindEvents(this);
        this.view.updateDataDisplay(this.model.data);
        
        // Subscribe to model changes
        this.model.subscribe((data) => {
            this.view.updateDataDisplay(data);
        });
    }
    
    exportAllData() {
        const dataStr = this.model.exportData();
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `btm-app-data-${Date.now()}.json`;
        link.click();
        
        alert('Alle Daten wurden exportiert!');
    }
    
    importData() {
        document.getElementById('import-file').click();
    }
    
    handleImport(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = this.model.importData(e.target.result);
            if (success) {
                alert('Daten wurden erfolgreich importiert!');
                this.view.updateDataDisplay(this.model.data);
            } else {
                alert('Fehler beim Importieren der Daten!');
            }
        };
        reader.readAsText(file);
    }
    
    clearAllData() {
        if (confirm('Wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
            this.model.clearAll();
            alert('Alle Daten wurden gelöscht!');
        }
    }
    
    selectPatient(id) {
        const patient = this.model.data.patients.find(p => p.id === id);
        if (patient) {
            this.model.data.currentPatient = patient;
            this.model.save();
            alert('Patient wurde ausgewählt!');
            // Switch to patient tab
            window.app.showTab('patient');
        }
    }
    
    selectDoctor(id) {
        const doctor = this.model.data.doctors.find(d => d.id === id);
        if (doctor) {
            this.model.data.currentDoctor = doctor;
            this.model.save();
            alert('Arzt wurde ausgewählt!');
            // Switch to doctor tab
            window.app.showTab('doctor');
        }
    }
    
    deletePatient(id) {
        if (confirm('Patient wirklich löschen?')) {
            this.model.data.patients = this.model.data.patients.filter(p => p.id !== id);
            this.model.data.patientDoctorLinks = this.model.data.patientDoctorLinks.filter(l => l.patientId !== id);
            if (this.model.data.currentPatient && this.model.data.currentPatient.id === id) {
                this.model.data.currentPatient = null;
            }
            this.model.save();
            this.model.notify();
        }
    }
    
    deleteDoctor(id) {
        if (confirm('Arzt wirklich löschen?')) {
            this.model.data.doctors = this.model.data.doctors.filter(d => d.id !== id);
            this.model.data.patientDoctorLinks = this.model.data.patientDoctorLinks.filter(l => l.doctorId !== id);
            if (this.model.data.currentDoctor && this.model.data.currentDoctor.id === id) {
                this.model.data.currentDoctor = null;
            }
            this.model.save();
            this.model.notify();
        }
    }
    
    loadLink(patientId, doctorId) {
        this.selectPatient(patientId);
        this.selectDoctor(doctorId);
        alert('Verknüpfung wurde geladen!');
    }
}