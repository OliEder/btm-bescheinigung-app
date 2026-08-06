import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore } from './DataStore.js';

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

describe('DataStore Persistenz', () => {
    it('vergibt UUID-Strings fuer neue Patienten (kein Date.now)', () => {
        const store = new DataStore();
        const p = store.addPatient({ firstname: 'Anna', lastname: 'Beispiel',
            passport: 'AB123456', birthplace: 'Berlin', birthdate: '1990-01-01',
            nationality: 'deutsch', gender: 'weiblich', street: 'Weg 1',
            zip: '10115', city: 'Berlin' });
        expect(typeof p.id).toBe('string');
        expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('speichert obfuskiert in sessionStorage (kein Klartext-JSON)', () => {
        const store = new DataStore();
        store.addPatient({ firstname: 'Mueller', lastname: 'Geheim',
            passport: 'AB123456', birthplace: 'Berlin', birthdate: '1990-01-01',
            nationality: 'deutsch', gender: 'weiblich', street: 'Weg 1',
            zip: '10115', city: 'Berlin' });
        store.save();
        const raw = sessionStorage.getItem('btm-session-data');
        expect(raw).toBeTruthy();
        expect(raw).not.toContain('Geheim');
    });

    it('laedt zuvor gespeicherte Daten aus sessionStorage zurueck', () => {
        const store = new DataStore();
        store.addPatient({ firstname: 'Test', lastname: 'Person',
            passport: 'AB123456', birthplace: 'Berlin', birthdate: '1990-01-01',
            nationality: 'deutsch', gender: 'weiblich', street: 'Weg 1',
            zip: '10115', city: 'Berlin' });
        store.save();
        const store2 = new DataStore();
        store2.load();
        expect(store2.data.patients).toHaveLength(1);
        expect(store2.data.patients[0].lastname).toBe('Person');
    });

    it('loggt keine PII beim Speichern', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const store = new DataStore();
        store.addPatient({ firstname: 'Geheim', lastname: 'PII',
            passport: 'AB123456', birthplace: 'Berlin', birthdate: '1990-01-01',
            nationality: 'deutsch', gender: 'weiblich', street: 'Weg 1',
            zip: '10115', city: 'Berlin' });
        store.save();
        const loggedPII = spy.mock.calls.some((args) =>
            JSON.stringify(args).includes('Geheim'));
        expect(loggedPII).toBe(false);
        spy.mockRestore();
    });
});
