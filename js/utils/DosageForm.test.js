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
        expect(formUnit('Zäpfchen')).toEqual({ singular: 'Stück', plural: 'Stück' });
        expect(formUnit('')).toEqual({ singular: 'Stück', plural: 'Stück' });
    });
});

describe('formUnit — Sonderformen (Stammdaten-Erweiterung)', () => {
    it('transdermales Pflaster -> Stück', () => {
        expect(formUnit('transdermales Pflaster')).toEqual({ singular: 'Stück', plural: 'Stück' });
    });
    it('Buccaltablette/Sublingualtablette -> Tablette (enthält "tablette")', () => {
        expect(formUnit('Buccaltablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
        expect(formUnit('Sublingualtablette')).toEqual({ singular: 'Tablette', plural: 'Tabletten' });
    });
    it('unbekannte Form -> Stück (nicht mehr Einheit)', () => {
        expect(formUnit('Zäpfchen')).toEqual({ singular: 'Stück', plural: 'Stück' });
        expect(formUnit('')).toEqual({ singular: 'Stück', plural: 'Stück' });
    });
});
