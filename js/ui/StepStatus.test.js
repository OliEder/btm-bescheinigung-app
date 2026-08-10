import { describe, it, expect } from 'vitest';
import { stepStatus } from './StepStatus.js';

const fullPatient = {
  firstname: 'Max', lastname: 'Mustermann', birthdate: '1990-01-01', passport: 'X1',
  birthplace: 'Berlin', nationality: 'Deutsch', gender: 'männlich',
  street: 'Weg 1', zip: '10115', city: 'Berlin',
};
const fullDoctor = { firstname: 'Erika', lastname: 'Schmidt', address: 'Klinikweg 2' };
const fullTravel = { start: '2026-08-10', end: '2026-08-20', duration: 11 };

describe('stepStatus', () => {
  it('leeres Model → alles todo', () => {
    const s = stepStatus({});
    expect(s).toEqual({ patient: 'todo', doctor: 'todo', medication: 'todo', travel: 'todo', certificates: 'todo' });
  });
  it('Patient teilweise → attention', () => {
    expect(stepStatus({ currentPatient: { firstname: 'Max' } }).patient).toBe('attention');
  });
  it('Patient vollständig → done', () => {
    expect(stepStatus({ currentPatient: fullPatient }).patient).toBe('done');
  });
  it('Doctor vollständig → done, teilweise → attention', () => {
    expect(stepStatus({ currentDoctor: fullDoctor }).doctor).toBe('done');
    expect(stepStatus({ currentDoctor: { firstname: 'E' } }).doctor).toBe('attention');
  });
  it('medication: 0 → todo, ≥1 → done (kein attention)', () => {
    expect(stepStatus({ medications: [] }).medication).toBe('todo');
    expect(stepStatus({ medications: [{ id: 1 }] }).medication).toBe('done');
  });
  it('travel aus travelData: vollständig → done, teilweise → attention', () => {
    expect(stepStatus({ travelData: fullTravel }).travel).toBe('done');
    expect(stepStatus({ travelData: { start: '2026-08-10' } }).travel).toBe('attention');
  });
  it('certificates done nur wenn alle vier done', () => {
    const all = { currentPatient: fullPatient, currentDoctor: fullDoctor, medications: [{ id: 1 }], travelData: fullTravel };
    expect(stepStatus(all).certificates).toBe('done');
    expect(stepStatus({ ...all, travelData: null }).certificates).toBe('todo');
  });
});
