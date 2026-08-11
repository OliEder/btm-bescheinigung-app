import { describe, it, expect } from 'vitest';
import { checkGermanDocNumber } from './DocNumber.js';

describe('checkGermanDocNumber', () => {
  it('aktuelles Schema → kein Hinweis', () => {
    const r = checkGermanDocNumber('C1Z9K7');
    expect(r.valid).toBe(true); expect(r.hint).toBeNull();
  });
  it('enthält 0 → Hinweis', () => { expect(checkGermanDocNumber('C0Z9').hint).toBeTruthy(); });
  it('enthält ausgeschlossenen Buchstaben O → Hinweis', () => { expect(checkGermanDocNumber('CO9Z').hint).toBeTruthy(); });
  it('nur Buchstaben (keine Ziffer) → Hinweis', () => { expect(checkGermanDocNumber('CFGHK').hint).toBeTruthy(); });
  it('beginnt mit Ziffer → Hinweis', () => { expect(checkGermanDocNumber('1CZ9').hint).toBeTruthy(); });
  it('leer → valid:false', () => {
    expect(checkGermanDocNumber('').valid).toBe(false);
    expect(checkGermanDocNumber('   ').valid).toBe(false);
  });
  it('case-insensitiv', () => { expect(checkGermanDocNumber('c1z9k7').hint).toBeNull(); });
});
