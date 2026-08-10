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
  it('enthält Shell-Klassen', () => {
    const c = css();
    for (const sel of ['.shell-header', '.shell-tabs', '.shell-tab', '.shell-main', '.shell-footer']) {
      expect(c).toContain(sel);
    }
  });
  it('enthält Mobil-Block (@media ≤640px) mit Badges-only + 16px-Rändern', () => {
    const c = css();
    const idx = c.indexOf('@media (max-width: 640px)');
    expect(idx).toBeGreaterThan(-1);
    const mobile = c.slice(idx);
    expect(mobile).toMatch(/\.shell-tab__label\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.shell-header\s*\{[^}]*16px/);
  });
});
