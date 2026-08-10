import { describe, it, expect } from 'vitest';
import { NationalityRepository } from './NationalityRepository.js';

const data = {
  _meta: { version: '2026-08-05' },
  list: [
    { code: '000', name: 'Deutschland', adjective: 'deutsch' },
    { code: '423', name: 'Afghanistan', adjective: 'afghanisch' },
    { code: '287', name: 'Ägypten', adjective: 'ägyptisch' },
  ],
};

describe('NationalityRepository', () => {
  it('findAll liefert die Liste', () => {
    expect(new NationalityRepository(data).findAll().length).toBe(3);
  });
  it('search findet über das Adjektiv (afghan → Afghanistan)', () => {
    const r = new NationalityRepository(data).search('afghan');
    expect(r.some((n) => n.name === 'Afghanistan')).toBe(true);
  });
  it('search findet über den Namen, case-insensitiv (deutsch → Deutschland)', () => {
    const r = new NationalityRepository(data).search('DEUTSCH');
    expect(r.some((n) => n.code === '000')).toBe(true);
  });
  it('search("") liefert bis zu limit Einträge', () => {
    expect(new NationalityRepository(data).search('', 2).length).toBe(2);
  });
  it('search wirft nicht bei unvollständigen Einträgen', () => {
    const r = new NationalityRepository({ list: [{ code: '999' }, { code: '000', name: 'Deutschland', adjective: 'deutsch' }] });
    expect(() => r.search('deutsch')).not.toThrow();
    expect(r.search('deutsch').some((n) => n.code === '000')).toBe(true);
  });
  it('leeres Repository → [] ohne Wurf', () => {
    const r = new NationalityRepository();
    expect(r.findAll()).toEqual([]);
    expect(r.search('x')).toEqual([]);
  });
});
