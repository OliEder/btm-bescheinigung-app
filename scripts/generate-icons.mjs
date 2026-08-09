// Liest die im Design genutzten Lucide-SVGs (ISC) aus dem lucide-static-Paket
// und schreibt sie als Daten-Map nach js/ui/icon-data.js. Nur der innere Markup
// (Pfade/Kreise) wird gespeichert; Größe/Farbe setzt Icon.js zur Laufzeit.
//
// Einige Design-Namen sind alte Lucide-Aliase, die in 0.462.0 umbenannt wurden.
// ALIASES bildet den Design-Namen (öffentlicher Key) auf den echten Dateinamen ab.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = resolve(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const OUT = resolve(__dirname, '..', 'js', 'ui', 'icon-data.js');

// Öffentliche Design-Namen (Keys in icon-data.js).
const NAMES = [
  'alert-circle', 'arrow-left', 'arrow-right', 'check', 'check-circle',
  'check-circle-2', 'chevron-down', 'circle-x', 'database', 'download',
  'file-cog', 'file-text', 'folder-open', 'info', 'link', 'pill', 'plane',
  'plus', 'save', 'search', 'stethoscope', 'trash-2', 'triangle-alert',
  'upload', 'user',
];

// Design-Name -> echter Dateiname im Paket (umbenannte Lucide-Icons).
const ALIASES = {
  'alert-circle': 'circle-alert',
  'check-circle': 'circle-check',
  'check-circle-2': 'circle-check-big',
};

function innerSvg(svg) {
  // Lizenz-Kommentar + <svg …>-Hülle entfernen, nur den Kindmarkup behalten.
  return svg.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[\s\S]*?>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

const entries = NAMES.map((name) => {
  const file = ALIASES[name] || name;
  const svg = readFileSync(resolve(ICON_DIR, `${file}.svg`), 'utf8');
  return `  '${name}': ${JSON.stringify(innerSvg(svg))},`;
});

const out = `// GENERIERT von scripts/generate-icons.mjs — nicht von Hand bearbeiten.\n` +
  `// Quelle: lucide-static@0.462.0 (ISC). Regenerieren: npm run generate:icons\n` +
  `export const ICON_DATA = {\n${entries.join('\n')}\n};\n`;

writeFileSync(OUT, out);
console.log(`icon-data.js geschrieben: ${NAMES.length} Icons.`);
