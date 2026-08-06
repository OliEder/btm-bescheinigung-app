import { describe, it, expect } from 'vitest';
import { obfuscate, deobfuscate } from './Obfuscate.js';

describe('Obfuscate', () => {
    it('round-trip stellt das Original wieder her', () => {
        const original = JSON.stringify({ a: 1, name: 'Mueller', list: [1, 2, 3] });
        const packed = obfuscate(original);
        expect(packed).not.toBe(original);
        expect(deobfuscate(packed)).toBe(original);
    });
    it('behandelt Unicode korrekt', () => {
        const original = 'Strasse 5, Auto, Attache';
        expect(deobfuscate(obfuscate(original))).toBe(original);
    });
    it('deobfuscate wirft bei nicht dekodierbarem Input', () => {
        expect(() => deobfuscate('%%%kein-base64%%%')).toThrow();
    });
});
