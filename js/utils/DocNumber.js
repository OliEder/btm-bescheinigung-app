// Prüft die deutsche Pass-/Ausweisnummer TOLERANT (blockiert nie); bei Abweichung vom
// AKTUELLEN Schema ein Hinweis. Regelwerk (BfArM/Bundesdruckerei):
//   erlaubte 26 Zeichen: C F G H J K L M N P R T V W X Y Z + 1..9
//   ausgeschlossen: A B D E I O Q S U ; 0 nur bei Dokumenten vor 01.11.2021
//   Struktur (aktuell): beginnt mit Buchstabe, enthält mind. eine Ziffer
const ALLOWED_LETTERS = 'CFGHJKLMNPRTVWXYZ';
const CURRENT_CHARS = new RegExp(`^[${ALLOWED_LETTERS}1-9]+$`);
const HINT = 'Bitte die Dokumentennummer noch einmal kontrollieren — Abweichungen vom aktuellen '
  + 'Schema können ein Ablehnungsgrund sein.';

export function checkGermanDocNumber(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return { valid: false, hint: null };
  const s = raw.toUpperCase();
  const matchesCurrent = /^[A-Z]/.test(s) && /[0-9]/.test(s) && CURRENT_CHARS.test(s);
  return { valid: true, hint: matchesCurrent ? null : HINT };
}
