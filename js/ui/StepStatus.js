// Leitet je Schritt done/attention/todo aus DataStore.data ab. Rein (kein DOM).
// "gesetzt" = String(v ?? '').trim() !== ''.

const PATIENT_KEYS = ['firstname', 'lastname', 'birthdate', 'passport', 'birthplace',
  'nationality', 'gender', 'street', 'zip', 'city'];
const DOCTOR_KEYS = ['firstname', 'lastname', 'address'];
const TRAVEL_KEYS = ['start', 'end', 'duration'];

function isSet(v) { return String(v ?? '').trim() !== ''; }

function completeness(obj, keys) {
  if (!obj) return 'none';
  const set = keys.filter((k) => isSet(obj[k])).length;
  if (set === 0) return 'none';
  if (set === keys.length) return 'all';
  return 'some';
}

function status(obj, keys) {
  const c = completeness(obj, keys);
  return c === 'all' ? 'done' : c === 'some' ? 'attention' : 'todo';
}

export function stepStatus(data = {}) {
  const patient = status(data.currentPatient, PATIENT_KEYS);
  const doctor = status(data.currentDoctor, DOCTOR_KEYS);
  const medication = Array.isArray(data.medications) && data.medications.length > 0 ? 'done' : 'todo';
  const travel = status(data.travelData, TRAVEL_KEYS);
  const allDone = patient === 'done' && doctor === 'done' && medication === 'done' && travel === 'done';
  const certificates = allDone ? 'done' : 'todo';
  return { patient, doctor, medication, travel, certificates };
}
