// Haengt Opioid-Praeparate an data/medications.json an. Idempotent:
// entfernt vor dem Anhaengen alle Resources mit den hier erzeugten ids.
// Aufruf: node scripts/add-opioids.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ATC = {
    morphin: 'N02AA01', hydromorphon: 'N02AA03', oxycodon: 'N02AA05',
    'oxycodon-naloxon': 'N02AA55', fentanyl: 'N02AB03', tapentadol: 'N02AX06',
    'tilidin-naloxon': 'N02AX51', buprenorphin: 'N02AE01',
};

function slug(s) {
    return s.toLowerCase().replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m]))
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
// id-Slug fuer die Einheit: µg/h -> ugh, µg -> ug, mg -> mg
function unitSlug(unit) {
    return unit.replace('µ', 'u').replace('/', '');
}

// [productFamily, form.text, substanceId, wirkstoff, unit, btmStatus, btmHinweis?, [values]]
const P = [
    ['MST Continus', 'Retardtablette', 'morphin', 'Morphin', 'mg', 'btm', null, [10, 30, 60, 100, 200]],
    ['Sevredol', 'Tablette', 'morphin', 'Morphin', 'mg', 'btm', null, [10, 20]],
    ['Palladon', 'Retardkapsel', 'hydromorphon', 'Hydromorphon', 'mg', 'btm', null, [4, 8, 16, 24]],
    ['Jurnista', 'Retardtablette', 'hydromorphon', 'Hydromorphon', 'mg', 'btm', null, [4, 8, 16, 32, 64]],
    ['Oxygesic', 'Retardtablette', 'oxycodon', 'Oxycodon', 'mg', 'btm', null, [5, 10, 20, 40, 80]],
    ['Targin', 'Retardtablette', 'oxycodon-naloxon', 'Oxycodon + Naloxon', 'mg', 'btm', null, [5, 10, 20, 40]],
    ['Durogesic', 'transdermales Pflaster', 'fentanyl', 'Fentanyl', 'µg/h', 'btm', null, [12, 25, 50, 75, 100]],
    ['Effentora', 'Buccaltablette', 'fentanyl', 'Fentanyl', 'µg', 'btm', null, [100, 200, 400, 600, 800]],
    ['Palexia retard', 'Retardtablette', 'tapentadol', 'Tapentadol', 'mg', 'btm', null, [25, 50, 100, 150, 200, 250]],
    ['Valoron N retard', 'Retardtablette', 'tilidin-naloxon', 'Tilidin + Naloxon', 'mg', 'ausgenommen',
        'retardierte Form BtM-ausgenommen; nicht-retardierte Formen sind BtM-pflichtig', [50, 100, 150, 200]],
    ['Norspan', 'transdermales Pflaster', 'buprenorphin', 'Buprenorphin', 'µg/h', 'btm', null, [5, 10, 15, 20, 30, 40]],
    ['Temgesic', 'Sublingualtablette', 'buprenorphin', 'Buprenorphin', 'mg', 'btm', null, [0.2, 0.4]],
];

const out = [];
const newIds = new Set();
for (const [family, form, substanceId, wirkstoff, unit, btmStatus, btmHinweis, values] of P) {
    const denom = form.toLowerCase().includes('kapsel') ? 'Kapsel'
        : form.toLowerCase().includes('pflaster') ? 'Pflaster' : 'Tablette';
    for (const v of values) {
        const id = `${slug(family)}-${String(v).replace('.', '')}${unitSlug(unit)}`;
        newIds.add(id);
        const res = {
            resourceType: 'Medication',
            id,
            substanceId,
            productFamily: family,
            code: { coding: [{ system: 'http://www.whocc.no/atc', code: ATC[substanceId] }],
                text: `${family} ${v} ${unit} ${form}` },
            form: { text: form },
            btmStatus,
            btmCategory: btmStatus === 'btm' ? 'BTM' : 'Nicht-BTM',
            ingredient: [{ itemCodeableConcept: { text: wirkstoff },
                strength: { numerator: { value: v, unit }, denominator: { value: 1, unit: denom } } }],
        };
        if (btmHinweis) res.btmHinweis = btmHinweis;
        out.push(res);
    }
}

const meds = JSON.parse(readFileSync('data/medications.json', 'utf8'));
const kept = meds.filter((m) => !newIds.has(m.id)); // idempotent
writeFileSync('data/medications.json', JSON.stringify([...kept, ...out], null, 2) + '\n');
console.log(`${out.length} Opioid-Resources angehaengt (gesamt ${kept.length + out.length}).`);
