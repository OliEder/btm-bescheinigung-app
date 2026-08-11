import { describe, it, expect, vi } from 'vitest';
import { PatientController } from '../js/controllers/PatientController.js';

function makeModel() {
  return { data: { patients: [], currentPatient: null },
    addPatient: vi.fn(function (p) { this.data.patients.push(p); this.data.currentPatient = p; }),
    updatePatient: vi.fn() };
}
const fullP = { lastname:'M', firstname:'A', passport:'C1', birthplace:'B', birthdate:'1990-01-01',
  gender:'männlich', street:'W 1', zip:'10115', city:'Berlin', nationality:'deutsch' };

describe('PatientController.savePatient (async, {ok,missing})', () => {
  it('fehlende Pflichtfelder → {ok:false, missing}, kein Model-Write', async () => {
    const model = makeModel();
    const view = { getFormData: () => ({ ...fullP, city: '' }), showMissing: vi.fn(), showInfo: vi.fn() };
    const res = await new PatientController(model, view).savePatient();
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('city');
    expect(model.addPatient).not.toHaveBeenCalled();
    expect(view.showMissing).toHaveBeenCalledWith(res.missing);
  });
  it('vollständig → {ok:true} + Model-Write', async () => {
    const model = makeModel();
    const view = { getFormData: () => fullP, showMissing: vi.fn(), showInfo: vi.fn() };
    const res = await new PatientController(model, view).savePatient();
    expect(res.ok).toBe(true);
    expect(model.addPatient).toHaveBeenCalled();
    expect(view.showInfo).toHaveBeenCalled();
  });
});
