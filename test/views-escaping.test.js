import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../js/utils/Sanitize.js';

describe('View-Escaping (Regressionsschutz)', () => {
    it('escapeHtml neutralisiert Namen mit Markup', () => {
        const evil = 'Mue<img src=x onerror=alert(1)>ller';
        const container = document.createElement('div');
        const span = document.createElement('span');
        span.innerHTML = escapeHtml(evil);
        container.appendChild(span);
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toBe(evil);
    });
});
