// Lädt die amtliche DESTATIS-Staatsangehörigkeitstabelle (Statistisches Bundesamt,
// xrepository) und schreibt data/nationalities.json. Ermittelt automatisch die aktuell
// gültige Version über den gueltigeVersion-Endpoint (kein fest verdrahtetes Datum).
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.xrepository.de/api/xrepository/urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit';

const gv = await (await fetch(`${BASE}/gueltigeVersion`)).text();
const version = (gv.match(/<dat:version>([^<]+)<\/dat:version>/) || [])[1];
if (!version) throw new Error('Konnte gültige Version nicht ermitteln');

const url = `https://www.xrepository.de/api/xrepository/urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit_${version}/download/DESTATIS_Staatsangeh_rigkeit_${version}.json`;
const doc = await (await fetch(url)).json();

const list = doc.daten
  .filter((r) => r[2])
  .map((r) => ({ code: r[0], name: r[1], adjective: r[2] }))
  .sort((a, b) => a.name.localeCompare(b.name, 'de'));

const out = {
  _meta: { version, source: 'DESTATIS/Statistisches Bundesamt (xrepository)', count: list.length },
  list,
};
writeFileSync(resolve(__dirname, '..', 'data', 'nationalities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`nationalities.json geschrieben: ${list.length} Einträge (Version ${version}).`);
