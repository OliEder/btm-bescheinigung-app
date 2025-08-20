class DoctorController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
    }
    
    init() {
        this.view.bindEvents(this);
        if (this.model.data.currentDoctor) {
            this.view.populateForm(this.model.data.currentDoctor);
        }
    }
    
    searchDoctor() {
        if (!this.model.data.currentPatient) {
            alert('Bitte erst Patientendaten eingeben!');
            return;
        }
        
        // Simulate doctor search - randomly select from mock doctors
        const mockDoctors = AppConfig.mockDoctors;
        const doctor = mockDoctors[Math.floor(Math.random() * mockDoctors.length)];
        
        this.view.populateForm(doctor);
        alert('Arzt wurde gefunden und eingetragen!');
    }
    
    saveDoctor() {
        const doctorData = this.view.getFormData();
        
        if (!this.validateDoctorData(doctorData)) {
            alert('Bitte füllen Sie alle Pflichtfelder aus!');
            return;
        }
        
        // Check for existing doctor
        const existing = this.model.data.doctors.find(d => 
            d.firstname === doctorData.firstname && 
            d.lastname === doctorData.lastname
        );
        
        if (existing) {
            if (confirm('Arzt existiert bereits. Überschreiben?')) {
                this.model.updateDoctor(existing.id, doctorData);
            }
        } else {
            this.model.addDoctor(doctorData);
        }
        
        alert('Arztdaten wurden gespeichert!');
    }
    
    loadDoctor() {
        const doctors = this.model.data.doctors;
        
        if (doctors.length === 0) {
            alert('Keine gespeicherten Ärzte vorhanden!');
            return;
        }
        
        let doctorList = 'Gespeicherte Ärzte:\n\n';
        doctors.forEach((doctor, index) => {
            doctorList += `${index + 1}. ${doctor.title} ${doctor.firstname} ${doctor.lastname}\n`;
        });
        
        const selection = prompt(doctorList + '\nNummer eingeben:');
        if (selection && doctors[selection - 1]) {
            this.model.data.currentDoctor = doctors[selection - 1];
            this.view.populateForm(doctors[selection - 1]);
            alert('Arzt wurde geladen!');
        }
    }
    
    linkPatientDoctor() {
        if (!this.model.data.currentPatient || !this.model.data.currentDoctor) {
            alert('Bitte erst Patient und Arzt auswählen!');
            return;
        }
        
        const existingLink = this.model.data.patientDoctorLinks.find(link =>
            link.patientId === this.model.data.currentPatient.id &&
            link.doctorId === this.model.data.currentDoctor.id
        );
        
        if (existingLink) {
            alert('Diese Verknüpfung existiert bereits!');
            return;
        }
        
        this.model.linkPatientDoctor(
            this.model.data.currentPatient.id,
            this.model.data.currentDoctor.id
        );
        
        alert('Patient und Arzt wurden verknüpft!');
    }
    
    validateDoctorData(data) {
        return data.lastname && data.firstname && data.phone && data.address;
    }
}