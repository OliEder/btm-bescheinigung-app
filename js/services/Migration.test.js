import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacyData, hasLegacyData, LEGACY_KEY } from './Migration.js';

beforeEach(() => { localStorage.clear(); });

describe('Migration aus localStorage["btm-app-data"]', () => {
    it('erkennt Alt-Daten', () => {
        expect(hasLegacyData()).toBe(false);
        localStorage.setItem(LEGACY_KEY, JSON.stringify({ patients: [] }));
        expect(hasLegacyData()).toBe(true);
    });

    it('migriert Patienten auf UUIDs und splittet concentration-String', () => {
        localStorage.setItem(LEGACY_KEY, JSON.stringify({
            patients: [{ id: 1712345678900, firstname: 'A', lastname: 'B' }],
            medications: [{ id: 999, name: 'Ritalin', form: 'Tablette',
                substance: 'Methylphenidat', concentration: '10mg' }],
            doctors: [], selectedMedications: [], dosageSchemes: {},
        }));
        const migrated = migrateLegacyData();
        expect(migrated.patients[0].id).toMatch(/^[0-9a-f-]{36}$/);
        const med = migrated.medications[0];
        expect(med.concentrationValue).toBe(10);
        expect(med.concentrationUnit).toBe('mg');
        expect(med.isCustom).toBe(true);
        expect(med.medicationRefId).toBeNull();
    });

    it('loescht den Alt-Key nach erfolgreicher Migration', () => {
        localStorage.setItem(LEGACY_KEY, JSON.stringify({ patients: [], medications: [], doctors: [] }));
        migrateLegacyData();
        expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });
});
