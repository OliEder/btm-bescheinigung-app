// Erzeugt data/substances.json aus einer Seed-Tabelle. Idempotent.
// Aufruf: node scripts/build-substances.mjs
import { writeFileSync } from 'node:fs';

const ADHS = [
    { label: 'ADHS (mit Hyperaktivität)', icd10: 'F90.0', icd11: '6A05.1' },
    { label: 'ADHS mit Störung des Sozialverhaltens', icd10: 'F90.1', icd11: '6A05.2 + 6C90' },
    { label: 'ADS (Aufmerksamkeitsstörung ohne Hyperaktivität)', icd10: 'F98.8', icd11: '6A05.0' },
    { label: 'ADHS, nicht näher bezeichnet', icd10: 'F90.9', icd11: '6A05.Z' },
];
const chronisch = { label: 'Starke chronische Schmerzen', icd10: 'R52.2', icd11: 'MG30.0' };
const tumor = { label: 'Tumor-/Palliativschmerz', icd10: 'C80.9', icd11: 'MG30.10' };
const akut = { label: 'Akute starke Schmerzen', icd10: 'R52.0', icd11: 'MG31.Z' };
const durchbruch = { label: 'Durchbruchschmerz bei Tumor', icd10: 'R52.1', icd11: 'MG30.10' };

const NEURO = 'N06BA Zentral wirkende Sympathomimetika';
const AA = 'N02AA Natürliche Opium-Alkaloide';
const AB = 'N02AB Phenylpiperidin-Derivate';
const AX = 'N02AX Andere Opioide';
const AE = 'N02AE Oripavin-Derivate';

const substances = {
    methylphenidat: { name: 'Methylphenidat', atc: ['N06BA04'], atcGroup: NEURO, indications: ADHS },
    lisdexamfetamin: { name: 'Lisdexamfetamin', atc: ['N06BA12'], atcGroup: NEURO, indications: ADHS },
    dexamfetamin: { name: 'Dexamfetamin', atc: ['N06BA02'], atcGroup: NEURO, indications: ADHS },
    atomoxetin: { name: 'Atomoxetin', atc: ['N06BA09'], atcGroup: NEURO, indications: ADHS },
    guanfacin: { name: 'Guanfacin', atc: ['N06BA21', 'C02AC02'], atcGroup: NEURO, indications: ADHS },

    morphin: { name: 'Morphin', atc: ['N02AA01'], atcGroup: AA, indications: [chronisch, tumor, akut] },
    hydromorphon: { name: 'Hydromorphon', atc: ['N02AA03'], atcGroup: AA, indications: [chronisch, tumor] },
    oxycodon: { name: 'Oxycodon', atc: ['N02AA05'], atcGroup: AA, indications: [chronisch, tumor] },
    'oxycodon-naloxon': { name: 'Oxycodon + Naloxon', atc: ['N02AA55'], atcGroup: AA, indications: [chronisch, tumor] },
    fentanyl: { name: 'Fentanyl', atc: ['N02AB03'], atcGroup: AB, indications: [chronisch, tumor, durchbruch] },
    tapentadol: { name: 'Tapentadol', atc: ['N02AX06'], atcGroup: AX, indications: [chronisch, akut] },
    'tilidin-naloxon': { name: 'Tilidin + Naloxon', atc: ['N02AX51'], atcGroup: AX, indications: [chronisch, akut] },
    buprenorphin: { name: 'Buprenorphin', atc: ['N02AE01'], atcGroup: AE, indications: [chronisch, tumor] },
};

writeFileSync('data/substances.json', JSON.stringify(substances, null, 2) + '\n');
console.log(`${Object.keys(substances).length} Wirkstoffe geschrieben.`);
