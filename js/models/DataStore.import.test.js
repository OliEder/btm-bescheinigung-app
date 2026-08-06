import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore } from './DataStore.js';
import { obfuscate } from '../utils/Obfuscate.js';

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

const sample = {
    patients: [{ id: 'p1', firstname: 'Max', lastname: 'Muster' }],
    doctors: [], selectedMedications: [], medications: [],
    dosageSchemes: {}, patientDoctorLinks: [], travelData: null,
    currentPatient: null, currentDoctor: null,
};

describe('DataStore.importData akzeptiert beide Formate', () => {
    it('importiert obfuskiertes .btmdat', () => {
        const store = new DataStore();
        const packed = obfuscate(JSON.stringify(sample));
        expect(store.importData(packed)).toBe(true);
        expect(store.data.patients).toHaveLength(1);
        expect(store.data.patients[0].lastname).toBe('Muster');
    });

    it('importiert Klartext-JSON (Rueckwaertskompatibilitaet)', () => {
        const store = new DataStore();
        const plain = JSON.stringify(sample, null, 2);
        expect(store.importData(plain)).toBe(true);
        expect(store.data.patients).toHaveLength(1);
    });

    it('gibt false bei unlesbarem Input zurueck', () => {
        const store = new DataStore();
        expect(store.importData('%%%kaputt%%%')).toBe(false);
    });
});
