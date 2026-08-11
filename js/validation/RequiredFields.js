// Reine Pflichtfeld-Prüfung. Gibt die Keys leerer Pflichtfelder zurück.
// "leer" = String(v ?? '').trim() === ''. Optional: patient.nationality, doctor.title.
const PATIENT_REQUIRED = ['lastname', 'firstname', 'passport', 'birthplace', 'birthdate',
  'gender', 'street', 'zip', 'city'];
const DOCTOR_REQUIRED = ['lastname', 'firstname', 'phone', 'address'];

function missing(data, keys) {
  const d = data || {};
  return keys.filter((k) => String(d[k] ?? '').trim() === '');
}
export function validatePatientFields(data) { return missing(data, PATIENT_REQUIRED); }
export function validateDoctorFields(data) { return missing(data, DOCTOR_REQUIRED); }
