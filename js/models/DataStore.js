// Erweiterte DataStore Klasse mit Model-Integration
import { obfuscate, deobfuscate } from '../utils/Obfuscate.js';
import { Patient } from './Patient.js';
import { Doctor } from './Doctor.js';
import { Medication, DosageScheme } from './Medication.js';
import { DateHelper } from '../utils/DateHelper.js';

const SESSION_KEY = 'btm-session-data';

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
        this.initializeMedicationDatabase();
        // Kein Auto-Load mehr im Konstruktor — app.js entscheidet ueber load()/Start-Screen.
    }
    
    // Initialize medication database
    initializeMedicationDatabase() {
        this.medicationDatabase = Medication.getMedicationDatabase();
    }
    
    // Observer pattern
    subscribe(callback) {
        this.listeners.push(callback);
    }
    
    notify() {
        this.listeners.forEach(callback => callback(this.data));
    }
    
    // Patient operations using Patient model
    addPatient(patientData) {
        const patient = new Patient(patientData);
        patient.id = crypto.randomUUID();
        
        const validation = patient.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        this.data.patients.push(patient);
        this.data.currentPatient = patient;
        this.save();
        this.notify();
        return patient;
    }
    
    updatePatient(id, updates) {
        const index = this.data.patients.findIndex(p => p.id === id);
        if (index !== -1) {
            const patient = Patient.fromJSON(this.data.patients[index]);
            patient.update(updates);
            
            const validation = patient.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            this.data.patients[index] = patient;
            if (this.data.currentPatient && this.data.currentPatient.id === id) {
                this.data.currentPatient = patient;
            }
            this.save();
            this.notify();
            return patient;
        }
        return null;
    }
    
    deletePatient(id) {
        this.data.patients = this.data.patients.filter(p => p.id !== id);
        this.data.patientDoctorLinks = this.data.patientDoctorLinks.filter(l => l.patientId !== id);
        if (this.data.currentPatient && this.data.currentPatient.id === id) {
            this.data.currentPatient = null;
        }
        this.save();
        this.notify();
    }
    
    // Doctor operations using Doctor model
    addDoctor(doctorData) {
        const doctor = new Doctor(doctorData);
        doctor.id = crypto.randomUUID();
        
        const validation = doctor.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        this.data.doctors.push(doctor);
        this.data.currentDoctor = doctor;
        this.save();
        this.notify();
        return doctor;
    }
    
    updateDoctor(id, updates) {
        const index = this.data.doctors.findIndex(d => d.id === id);
        if (index !== -1) {
            const doctor = Doctor.fromJSON(this.data.doctors[index]);
            doctor.update(updates);
            
            const validation = doctor.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            this.data.doctors[index] = doctor;
            if (this.data.currentDoctor && this.data.currentDoctor.id === id) {
                this.data.currentDoctor = doctor;
            }
            this.save();
            this.notify();
            return doctor;
        }
        return null;
    }
    
    deleteDoctor(id) {
        this.data.doctors = this.data.doctors.filter(d => d.id !== id);
        this.data.patientDoctorLinks = this.data.patientDoctorLinks.filter(l => l.doctorId !== id);
        if (this.data.currentDoctor && this.data.currentDoctor.id === id) {
            this.data.currentDoctor = null;
        }
        this.save();
        this.notify();
    }
    
    // Medication operations using Medication model
    addMedication(medicationData) {
        const medication = new Medication(medicationData);
        medication.id = crypto.randomUUID();
        
        const validation = medication.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
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
    
    addCustomMedication(medicationData) {
        const medication = new Medication(medicationData);
        
        const validation = medication.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        // Check if medication already exists in custom database
        const existing = this.data.medications.find(m => 
            m.name === medication.name && 
            m.concentration === medication.concentration
        );
        
        if (!existing) {
            this.data.medications.push(medication);
            this.save();
        }
        
        return medication;
    }
    
    searchMedications(searchTerm) {
        const allMedications = [...this.medicationDatabase, ...this.data.medications];
        return Medication.searchMedications(searchTerm, allMedications);
    }
    
    // Dosage scheme operations
    initDosageScheme(medicationId) {
        if (!this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId] = [];
        }
    }
    
    addDosageScheme(medicationId, schemeData) {
        const scheme = new DosageScheme({
            ...schemeData,
            medicationId: medicationId
        });
        
        const validation = scheme.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        if (!this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId] = [];
        }
        
        this.data.dosageSchemes[medicationId].push(scheme);
        this.save();
        this.notify();
        return scheme;
    }
    
    updateDosageScheme(medicationId, schemeIndex, schemeData) {
        const scheme = new DosageScheme({
            ...schemeData,
            medicationId: medicationId
        });
        
        const validation = scheme.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        if (!this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId] = [];
        }
        
        this.data.dosageSchemes[medicationId][schemeIndex] = scheme;
        this.save();
        this.notify();
        return scheme;
    }
    
    removeDosageScheme(medicationId, schemeIndex) {
        if (this.data.dosageSchemes[medicationId]) {
            this.data.dosageSchemes[medicationId].splice(schemeIndex, 1);
            this.save();
            this.notify();
        }
    }
    
    // Travel data operations
    setTravelData(travelData) {
        const errors = [];
        
        if (!travelData.start) {
            errors.push('Abreisedatum erforderlich');
        }
        
        if (!travelData.end) {
            errors.push('Rückreisedatum erforderlich');
        }
        
        if (new Date(travelData.end) < new Date(travelData.start)) {
            errors.push('Rückreisedatum muss nach Abreisedatum liegen');
        }
        
        const duration = DateHelper.getDaysBetween(travelData.start, travelData.end);
        if (duration > 30) {
            errors.push('Maximale Reisedauer beträgt 30 Tage');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
        
        travelData.duration = duration;
        this.data.travelData = travelData;
        this.save();
        this.notify();
    }
    
    // Link operations
    linkPatientDoctor(patientId, doctorId) {
        const existingLink = this.data.patientDoctorLinks.find(l =>
            l.patientId === patientId && l.doctorId === doctorId
        );
        
        if (existingLink) {
            throw new Error('Diese Verknüpfung existiert bereits');
        }
        
        const link = { 
            patientId, 
            doctorId,
            createdAt: new Date().toISOString()
        };
        
        this.data.patientDoctorLinks.push(link);
        this.save();
        this.notify();
        return link;
    }
    
    // Storage operations — sessionStorage, obfuskiert, ohne PII-Log
    save() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(SESSION_KEY, obfuscate(JSON.stringify(this.data)));
            }
            // Kein Logging von PII.
        } catch (e) {
            console.error('Error saving data.');
        }
    }
    
    load() {
        try {
            if (typeof sessionStorage === 'undefined') return false;
            const packed = sessionStorage.getItem(SESSION_KEY);
            if (!packed) return false;
            const parsedData = JSON.parse(deobfuscate(packed));
            this.hydrate(parsedData);
            return true;
        } catch (e) {
            console.warn('Session-Daten konnten nicht gelesen werden.');
            return false;
        }
    }
    
    // Wandelt Plain-Objekte zurueck in Modellinstanzen.
    hydrate(parsedData) {
        this.data.patients = (parsedData.patients || []).map(p => Patient.fromJSON(p));
        this.data.doctors = (parsedData.doctors || []).map(d => Doctor.fromJSON(d));
        this.data.selectedMedications = (parsedData.selectedMedications || []).map(m => Medication.fromJSON(m));
        this.data.medications = (parsedData.medications || []).map(m => Medication.fromJSON(m));
        
        this.data.dosageSchemes = {};
        if (parsedData.dosageSchemes) {
            Object.keys(parsedData.dosageSchemes).forEach(key => {
                this.data.dosageSchemes[key] = parsedData.dosageSchemes[key].map(s => DosageScheme.fromJSON(s));
            });
        }
        
        this.data.currentPatient = parsedData.currentPatient ? Patient.fromJSON(parsedData.currentPatient) : null;
        this.data.currentDoctor = parsedData.currentDoctor ? Doctor.fromJSON(parsedData.currentDoctor) : null;
        this.data.travelData = parsedData.travelData || null;
        this.data.patientDoctorLinks = parsedData.patientDoctorLinks || [];
    }
    
    // Export/Import operations
    exportData() {
        const exportData = {
            ...this.data,
            version: '2.0.0',
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
    }
    
    // Liest sowohl obfuskierte (.btmdat) als auch Klartext-JSON-Exporte.
    parseImport(raw) {
        // Zuerst Klartext-JSON versuchen (Rueckwaertskompatibilitaet).
        try {
            return JSON.parse(raw);
        } catch (_) {
            // Kein Klartext-JSON -> als obfuskiert behandeln.
        }
        return JSON.parse(deobfuscate(raw));
    }

    importData(rawData) {
        try {
            const imported = this.parseImport(rawData);
            this.hydrate(imported);
            this.save();
            this.notify();
            return true;
        } catch (e) {
            console.error('Import error.');
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

export { DataStore };
