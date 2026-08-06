import { describe, it, expect } from 'vitest';

describe('Test-Infrastruktur', () => {
    it('fuehrt Tests aus und hat jsdom (document verfuegbar)', () => {
        const el = document.createElement('div');
        el.textContent = 'ok';
        expect(el.textContent).toBe('ok');
    });
});
