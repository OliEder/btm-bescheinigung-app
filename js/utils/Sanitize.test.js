import { describe, it, expect } from 'vitest';
import { escapeHtml, setDataset } from './Sanitize.js';

describe('escapeHtml', () => {
    it('escaped HTML-Sonderzeichen', () => {
        expect(escapeHtml('<script>alert(1)</script>'))
            .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
    it('escaped Anfuehrungszeichen und Ampersand', () => {
        expect(escapeHtml(`a & "b" 'c'`)).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
    });
    it('wandelt null/undefined/Zahl in String', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('setDataset', () => {
    it('setzt data-Attribute ohne HTML-Injection', () => {
        const el = document.createElement('button');
        setDataset(el, { id: '1"><img src=x>', schemeIndex: 3 });
        expect(el.dataset.id).toBe('1"><img src=x>');
        expect(el.dataset.schemeIndex).toBe('3');
        expect(el.querySelector('img')).toBeNull();
    });
});
