// Reine Mess-/Entscheidungsfunktion fuer die Feld-Schriftgroesse.
// Standard 11pt; passt der Text nicht, in 0,5-Schritten bis MIN (7pt) reduzieren;
// passt auch MIN nicht, 0 zurueckgeben (pdf-lib Auto-Sizing als Notnagel).
// font: pdf-lib PDFFont (muss widthOfTextAtSize(text, size) bereitstellen).

export const STD_SIZE = 11;
export const MIN_SIZE = 7;

export function fitFontSize(font, text, fieldWidth, { std = STD_SIZE, min = MIN_SIZE, padding = 4 } = {}) {
  const value = String(text ?? '');
  if (value === '') return std;
  const avail = fieldWidth - padding;
  if (avail <= 0) return 0;
  if (font.widthOfTextAtSize(value, std) <= avail) return std;
  for (let s = std - 0.5; s >= min; s -= 0.5) {
    if (font.widthOfTextAtSize(value, s) <= avail) return s;
  }
  return 0;
}
