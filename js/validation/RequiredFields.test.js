import { describe, it, expect } from 'vitest';
import { validatePatientFields, validateDoctorFields } from './RequiredFields.js';

const fullP = { lastname:'M', firstname:'A', passport:'C1', birthplace:'B', birthdate:'1990-01-01',
  gender:'männlich', street:'W 1', zip:'10115', city:'Berlin', nationality:'deutsch' };
const fullD = { lastname:'S', firstname:'E', phone:'030', address:'Weg 2', title:'Dr. med.' };

describe('validatePatientFields', () => {
  it('vollständig → []', () => { expect(validatePatientFields(fullP)).toEqual([]); });
  it('fehlendes Pflichtfeld erscheint', () => { expect(validatePatientFields({ ...fullP, city: '' })).toContain('city'); });
  it('nationality optional → nicht in der Liste', () => { expect(validatePatientFields({ ...fullP, nationality: '' })).not.toContain('nationality'); });
  it('Whitespace zählt als leer', () => { expect(validatePatientFields({ ...fullP, zip: '   ' })).toContain('zip'); });
});
describe('validateDoctorFields', () => {
  it('vollständig → []', () => { expect(validateDoctorFields(fullD)).toEqual([]); });
  it('fehlendes Pflichtfeld', () => { expect(validateDoctorFields({ ...fullD, address: '' })).toContain('address'); });
  it('title optional → nicht in der Liste', () => { expect(validateDoctorFields({ ...fullD, title: '' })).not.toContain('title'); });
});
