// Central data store (Model)
class DataStore {
    constructor() {
        this.data = {
            patients: [],
            doctors: [],
            medications: [],
            selectedMedications: [],
            patientDoctorLinks: [],
            currentPatient: null,
            currentDoctor: null,
            travelData: null,
            dosageSchemes: {}
        };
        
        this.listeners = [];
        this.loadFromStorage();
    }
    
    // Observer pattern
    subscribe(callback) {
        this.listeners.push(callback);
    }
    
    notify() {
        this.listeners.forEach(callback => callback(this.data));
    }
    
    // Data operations
    addPatient(patient) {
        patient.id = Date.now();
        this.data.patients.push(patient);
        this.data.currentPatient = patient;
        this.save();
        this.notify();
        return patient;
    }
    
    updatePatient(id, updates) {
        const index = this.data.patients.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.patients[index] = { ...this.data.patients[index], ...updates };
            this.save();
            this.notify();
            return this.data.patients[index];
        }
        return null;
    }
    
    addDoctor(doctor) {
        doctor.id = Date.now();
        this.data.doctors.push(doctor);
        this.data.currentDoctor = doctor;
        this.save();
        this.notify();
        return doctor;
    }
    
    addMedication(medication) {
        medication.id = Date.now() + Math.random();
        this.data.selectedMedications.push(medication);
        this.initDosageScheme(medication.id);
        this.save();
        this.notify();
        return medication;
    }
    
    removeMedication(id) {
        this.data.selectedMedications = this.data.selectedMedications.filter(m => m.id !== id);
        delete this.data.dosageSchemes[id];
        this.save();
        this.notify();
    }
    
    initDosageScheme(medicationId) {
        if (!this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId] = [];
        }
    }
    
    updateDosageScheme(medicationId, schemeIndex, scheme) {
        if (!this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId] = [];
        }
        this.data.dosageSchemes[medicationId][schemeIndex] = scheme;
        this.save();
        this.notify();
    }
    
    setTravelData(travelData) {
        this.data.travelData = travelData;
        this.save();
        this.notify();
    }
    
    linkPatientDoctor(patientId, doctorId) {
        const link = { patientId, doctorId };
        this.data.patientDoctorLinks.push(link);
        this.save();
        this.notify();
        return link;
    }
    
    // Storage operations
    save() {
        try {
            // In production, use localStorage
            // localStorage.setItem('btm-app-data', JSON.stringify(this.data));
            console.log('Data saved:', this.data);
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }
    
    loadFromStorage() {
        try {
            // In production, use localStorage
            // const stored = localStorage.getItem('btm-app-data');
            // if (stored) {
            //     this.data = JSON.parse(stored);
            // }
            this.loadDemoData();
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
    
    loadDemoData() {
        // Demo data for testing
        this.data.currentPatient = {
            id: 1,
            lastname: "Mustermann",
            firstname: "Max",
            passport: "L3GL30CLN",
            birthplace: "München",
            birthdate: "1985-03-15",
            nationality: "Deutsch",
            gender: "männlich",
            street: "Hauptstraße 42",
            zip: "92353",
            city: "Postbauer-Heng"
        };
        
        this.data.currentDoctor = {
            id: 1,
            title: "Dr. med.",
            lastname: "Schmidt",
            firstname: "Thomas",
            phone: "0911/123456",
            address: "Bahnhofstraße 15, 90518 Altdorf bei Nürnberg"
        };
        
        this.data.patients.push(this.data.currentPatient);
        this.data.doctors.push(this.data.currentDoctor);
    }
    
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
    
    importData(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            this.data = { ...this.data, ...imported };
            this.save();
            this.notify();
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
    
    clearAll() {
        this.data = {
            patients: [],
            doctors: [],
            medications: [],
            selectedMedications: [],
            patientDoctorLinks: [],
            currentPatient: null,
            currentDoctor: null,
            travelData: null,
            dosageSchemes: {}
        };
        this.save();
        this.notify();
    }
}