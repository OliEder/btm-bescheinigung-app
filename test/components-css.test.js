import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = () => readFileSync(resolve(__dirname, '..', 'css/components.css'), 'utf8');

describe('components.css', () => {
  it('definiert die Kern-Klassen', () => {
    const c = css();
    for (const sel of ['.rb-btn', '.rb-badge', '.rb-alert', '.rb-card', '.rb-field',
      '.rb-input', '.rb-select', '.rb-radio-group', '.rb-combobox', '.rb-modal']) {
      expect(c).toContain(sel);
    }
  });
  it('referenziert Tokens statt Rohwerte', () => {
    const c = css();
    expect(c).toContain('var(--color-primary-700)');
    expect(c).toContain('var(--radius-md)');
    expect(c).toContain('var(--space-');
  });
});
