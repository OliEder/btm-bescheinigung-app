import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fitFontSize, STD_SIZE, MIN_SIZE } from './PdfFieldFont.js';

let font;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

describe('fitFontSize', () => {
  it('kurzer Text in breitem Feld → Standardgröße 11', () => {
    expect(fitFontSize(font, 'Meier', 200)).toBe(STD_SIZE);
    expect(STD_SIZE).toBe(11);
  });
  it('leerer Text → Standardgröße', () => {
    expect(fitFontSize(font, '', 40)).toBe(STD_SIZE);
  });
  it('Text der bei 11 nicht passt, aber schrumpfbar → zwischen MIN und STD, < 11', () => {
    const size = fitFontSize(font, 'Dr. med. Mustermann', 90);
    expect(size).toBeLessThan(STD_SIZE);
    expect(size).toBeGreaterThanOrEqual(MIN_SIZE);
  });
  it('Text der auch bei MIN nicht passt → 0 (Auto)', () => {
    expect(fitFontSize(font, 'Prof. Dr. med. Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen', 60)).toBe(0);
  });
  it('respektiert die Grenzen (nie größer als STD, nie zwischen 0 und MIN)', () => {
    const size = fitFontSize(font, 'Testwert mittel', 100);
    expect(size === 0 || (size >= MIN_SIZE && size <= STD_SIZE)).toBe(true);
  });
});
