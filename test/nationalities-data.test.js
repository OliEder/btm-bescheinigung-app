import { describe, it, expect } from 'vitest';
import data from '../data/nationalities.json';

describe('nationalities.json', () => {
  it('enthält mindestens 200 Einträge', () => {
    expect(Array.isArray(data.list)).toBe(true);
    expect(data.list.length).toBeGreaterThanOrEqual(200);
  });
  it('enthält Deutschland (code 000, adjective deutsch)', () => {
    const de = data.list.find((n) => n.code === '000');
    expect(de).toBeTruthy();
    expect(de.adjective).toBe('deutsch');
    expect(de.name).toBe('Deutschland');
  });
  it('jeder Eintrag hat nicht-leere code/name/adjective', () => {
    for (const n of data.list) {
      expect(String(n.code || '').length).toBeGreaterThan(0);
      expect(String(n.name || '').length).toBeGreaterThan(0);
      expect(String(n.adjective || '').length).toBeGreaterThan(0);
    }
  });
  it('_meta.version ist gesetzt', () => {
    expect(typeof data._meta.version).toBe('string');
    expect(data._meta.version.length).toBeGreaterThan(0);
  });
});
