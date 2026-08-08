import { describe, it, expect } from 'vitest';
import { formUnit } from './DosageForm.js';

describe('formUnit', () => {
    it('Kapsel/Retardkapsel', () => {
        expect(formUnit('Kapsel')).toEqual({ singular: 'Kapsel', plural: 'Kapseln' });
        expect(formUnit('Retardkapsel')).toEqual({ singular: 'Kapsel', plural: 'Kapseln' });
    });
    it('Tablette/Retardtablette', () => {
        expect(formUnit('Tablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
        expect(formUnit('Retardtablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
    });
    it('Tropfen/Saft -> ml', () => {
        expect(formUnit('Tropfen')).toEqual({ singular: 'ml', plural: 'ml' });
        expect(formUnit('Lösung')).toEqual({ singular: 'ml', plural: 'ml' });
    });
    it('Fallback fuer Unbekanntes', () => {
        expect(formUnit('Zäpfchen')).toEqual({ singular: 'Einheit', plural: 'Einheiten' });
        expect(formUnit('')).toEqual({ singular: 'Einheit', plural: 'Einheiten' });
    });
});
