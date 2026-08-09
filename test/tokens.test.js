import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

describe('Design-Tokens', () => {
  it('colors.css enthält die Kern-Primärfarbe', () => {
    expect(read('css/tokens/colors.css')).toContain('--color-primary-700:#1d3a5f');
  });
  it('colors.css setzt den Accent-Focus-Ring', () => {
    expect(read('css/tokens/colors.css')).toContain('--color-focus-ring:#b5763a');
  });
  it('spacing.css enthält Skala und Layout-Breiten', () => {
    const s = read('css/tokens/spacing.css');
    expect(s).toContain('--space-4:16px');
    expect(s).toContain('--content-max:840px');
    expect(s).toContain('--shell-max:1180px');
  });
  it('typography.css enthält Textskala und Gewichte', () => {
    const t = read('css/tokens/typography.css');
    expect(t).toContain('--text-2xl:2.25rem');
    expect(t).toContain('--weight-semibold:600');
  });
  it('elevation.css enthält Radien und Schatten', () => {
    expect(read('css/tokens/elevation.css')).toContain('--radius-sm:4px');
  });
  it('motion.css respektiert prefers-reduced-motion', () => {
    expect(read('css/tokens/motion.css')).toContain('prefers-reduced-motion');
  });
  it('base.css setzt einen 3px Focus-Ring', () => {
    expect(read('css/tokens/base.css')).toContain('outline:3px solid var(--color-focus-ring)');
  });
  it('index.css importiert die Variablen-Token-Dateien', () => {
    const i = read('css/tokens/index.css');
    for (const f of ['fonts', 'colors', 'spacing', 'typography', 'elevation', 'motion']) {
      expect(i).toContain(`${f}.css`);
    }
  });
  it('index.css lädt base.css (Element-Restyling) in TP-A NICHT — kein sichtbarer Umbruch', () => {
    // base.css setzt echte Element-Regeln (h1-h4 auf Libre Caslon, :focus-visible).
    // Die App hat klassenlose <h2>/<h3>/<h4>, die styles.css nicht überschreibt —
    // ein Import würde die Optik schon jetzt ändern. base.css wird in TP-C aktiviert.
    expect(read('css/tokens/index.css')).not.toMatch(/@import[^;]*base\.css/);
  });
});
