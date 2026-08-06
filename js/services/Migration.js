// Einmalige Migration der Alt-Daten aus localStorage['btm-app-data'] ins neue
// Session-Schema: UUIDs vergeben, concentration-String splitten, Alt-Medikamente
// als isCustom markieren, danach den Alt-Key loeschen.

export const LEGACY_KEY = 'btm-app-data';

export function hasLegacyData() {
    return localStorage.getItem(LEGACY_KEY) !== null;
}

function splitConcentration(str) {
    const numMatch = String(str || '').match(/(\d+(?:\.\d+)?)/);
    const unitMatch = String(str || '').match(/\d+(?:\.\d+)?(.*)/);
    return {
        concentrationValue: numMatch ? parseFloat(numMatch[1]) : 0,
        concentrationUnit: unitMatch ? unitMatch[1].trim() : '',
    };
}

export function migrateLegacyData() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);

    const remap = (entity) => ({ ...entity, id: crypto.randomUUID() });

    const patients = (old.patients || []).map(remap);
    const doctors = (old.doctors || []).map(remap);
    const medications = (old.medications || []).map((m) => {
        const { concentrationValue, concentrationUnit } = splitConcentration(m.concentration);
        return { ...remap(m), concentrationValue, concentrationUnit, isCustom: true, medicationRefId: null };
    });

    localStorage.removeItem(LEGACY_KEY);

    return {
        patients,
        doctors,
        medications,
        selectedMedications: old.selectedMedications || [],
        patientDoctorLinks: old.patientDoctorLinks || [],
        currentPatient: null,
        currentDoctor: null,
        travelData: old.travelData || null,
        dosageSchemes: old.dosageSchemes || {},
    };
}
