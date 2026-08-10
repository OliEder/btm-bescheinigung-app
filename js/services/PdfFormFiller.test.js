import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { fillCertificate } from './PdfFormFiller.js';

const templateBytes = new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));

const patient = { lastname: 'Muster', firstname: 'Max', passport: 'C01X00T47',
    birthplace: 'Berlin', birthdate: '1990-05-01', nationality: 'deutsch',
    gender: 'maennlich', street: 'Hauptstr. 1', zip: '10115', city: 'Berlin' };
const doctor = { title: 'Dr. med.', lastname: 'Aerztin', firstname: 'Anna',
    phone: '030-1234', address: 'Praxisweg 2, 10117 Berlin' };
const travel = { start: '2026-08-10', end: '2026-08-24', duration: 15 };
const medication = { handelsname: 'Concerta', wirkstoff: 'Methylphenidat',
    darreichungsform: 'Retardtablette', concentrationValue: 36, concentrationUnit: 'mg' };
const blocks = [
    { startDate: '2026-08-10', endDate: '2026-08-13', morning: 1, noon: 0, evening: 1, night: 0 },
    { startDate: '2026-08-14', endDate: '2026-08-24', morning: 2, noon: 0, evening: 1, night: 0 },
];

describe('fillCertificate', () => {
    it('befuellt Patient/Arzt/Medikament und flattet das Formular', async () => {
        const bytes = await fillCertificate(templateBytes, { patient, doctor, travel, medication, blocks });
        const out = await PDFDocument.load(bytes);
        expect(out.getForm().getFields().length).toBe(0);
        expect(bytes.byteLength).toBeGreaterThan(1000);
    });

    it('befuellt Patient/Medikament, laesst Signatur-/Behoerdenfelder leer (flatten:false)', async () => {
        const bytes = await fillCertificate(templateBytes,
            { patient, doctor, travel, medication, blocks, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        const get = (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
        expect(get('Name_2')).toBe('Muster');
        expect(get('Staatsangehoerigkeit')).toBe('deutsch');
        expect(get('Handelsbezeichnung oder Sonderzubereitung')).toBe('Concerta');
        expect(get('Gesamtwirkstoffmenge')).toContain('1476');
        expect(get('Datum')).toBe('');
        expect(get('Unterschrift des Arztes')).toBe('');
        expect(get('Stempel der Behörde')).toBe('');
    });
});

describe('fillCertificate — Formatkorrekturen (TP0)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };

    it('Konzentration als Wert Einheit/Bezugsmenge', async () => {
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('WirkstoffKonzentration')).toBe('36 mg/Tablette');
    });

    it('Gesamtmenge mit Stueckzahl und Plural', async () => {
        // blocks: 4 Tage*(1+1)=8 + 11 Tage*(2+1)=33 => 41 Stueck; 41*36=1476 mg
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Gesamtwirkstoffmenge')).toBe('1476 mg, entspricht 41 Tabletten');
    });

    it('Einzelstueck -> Singular', async () => {
        const oneDay = [{ startDate: '2026-08-10', endDate: '2026-08-10',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks: oneDay });
        expect(g('Gesamtwirkstoffmenge')).toBe('36 mg, entspricht 1 Tablette');
    });

    it('Bruchteil -> Dezimalkomma in Stueckzahl', async () => {
        const half = [{ startDate: '2026-08-10', endDate: '2026-08-19',
            morning: 0.5, noon: 0, evening: 0, night: 0 }]; // 10 Tage*0.5=5 Stueck
        const g = await read({ patient, doctor, travel, medication, blocks: half });
        expect(g('Gesamtwirkstoffmenge')).toContain('entspricht 5 Tabletten');
    });

    it('leere Anmerkungen -> "keine"', async () => {
        const oneBlock = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 1, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks: oneBlock });
        expect(g('Anmerkungen')).toBe('keine');
    });
});

describe('fillCertificate — reasonNote in Anmerkungen (Grund/ICD-UI)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };
    it('reasonNote landet in Anmerkungen, ICD/Label nicht', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 1, night: 0,
            reasonLabel: 'ADHS', reasonIcd10: 'F90.0', reasonNote: 'Titration' }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toContain('Titration');
        expect(g('Anmerkungen')).not.toContain('F90.0');
        expect(g('Anmerkungen')).not.toContain('ADHS');
    });
    it('ohne reasonNote und ohne Titration -> keine', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 1, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toBe('keine');
    });

    it('dedupliziert reasonNotes und ignoriert Whitespace-only', async () => {
        const blocks = [
            { startDate: '2026-08-10', endDate: '2026-08-13', morning: 1, noon: 0, evening: 0, night: 0, reasonNote: 'Titration' },
            { startDate: '2026-08-14', endDate: '2026-08-17', morning: 2, noon: 0, evening: 0, night: 0, reasonNote: 'Titration' },
            { startDate: '2026-08-18', endDate: '2026-08-24', morning: 3, noon: 0, evening: 0, night: 0, reasonNote: '   ' },
        ];
        const g = await read({ patient, doctor, travel, medication, blocks });
        const anm = g('Anmerkungen');
        // 'Titration' nur einmal (dedupliziert), Whitespace-only-Note ignoriert
        expect(anm.match(/Titration/g)).toHaveLength(1);
    });
});

describe('fillCertificate — Reisedauer-Abweichung in Anmerkungen (TP2)', () => {
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } };
    };
    it('nicht-taeglich -> Hinweis in Anmerkungen', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, weekdays: ['Mo', 'Di', 'So'] }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toMatch(/Mo, Di, So/);
    });
    it('Abweichung + reasonNote kombiniert', async () => {
        const blocks = [{ startDate: '2026-08-12', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0, reasonNote: 'Titration' }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        const anm = g('Anmerkungen');
        expect(anm).toContain('Titration');
        expect(anm).toMatch(/keine Einnahme/i);
    });
    it('ohne Abweichung/Note/Titration -> keine', async () => {
        const blocks = [{ startDate: '2026-08-10', endDate: '2026-08-24',
            morning: 1, noon: 0, evening: 0, night: 0 }];
        const g = await read({ patient, doctor, travel, medication, blocks });
        expect(g('Anmerkungen')).toBe('keine');
    });
});

describe('fillCertificate — Hotfix: Arzt-Titel + lange Namen', () => {
    const templateBytes2 = new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));
    const read = async (data) => {
        const bytes = await fillCertificate(templateBytes2, { ...data, flatten: false });
        const form = (await PDFDocument.load(bytes)).getForm();
        return {
            get: (n) => { try { return form.getTextField(n).getText() || ''; } catch { return ''; } },
            field: (n) => { try { return form.getTextField(n); } catch { return null; } },
        };
    };

    it('übernimmt den Arzt-Titel in das Name-Feld', async () => {
        const { get } = await read({ patient, doctor, travel, medication, blocks });
        expect(get('Name')).toBe('Dr. med. Aerztin');
    });

    it('ohne Titel: nur der Nachname (kein führendes Leerzeichen)', async () => {
        const { get } = await read({ patient, doctor: { ...doctor, title: '' }, travel, medication, blocks });
        expect(get('Name')).toBe('Aerztin');
    });

    it('lange Textwerte: Feld auf Auto-Größe, damit Text schrumpft statt abzuschneiden', async () => {
        const longDoctor = { ...doctor, lastname: 'Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen' };
        const { field } = await read({ patient, doctor: longDoctor, travel, medication, blocks });
        const nameField = field('Name');
        expect(nameField).not.toBeNull();
        // Auto-Größe: pdf-lib berechnet die Schrift beim Rendern kleiner, damit
        // der lange Name passt — die Default Appearance zeigt eine geschrumpfte
        // Tf-Größe deutlich unter der Default-Größe 12 (statt Text abzuschneiden).
        const size = Number((nameField.acroField.getDefaultAppearance().match(/\/\S+\s+([\d.]+)\s+Tf/) || [])[1]);
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(12);
    });
});

describe('fillCertificate — Fira Condensed + Sizing', () => {
    const tpl = () => new Uint8Array(readFileSync('assets/reise-scheng-formular.pdf'));
    const firaBytes = new Uint8Array(readFileSync('assets/fonts/FiraSansCondensed-Regular.ttf'));
    const base = { patient, doctor, travel, medication, blocks, flatten: false };

    const readField = async (data, fieldName) => {
        const bytes = await fillCertificate(tpl(), data, firaBytes);
        const form = (await (await import('pdf-lib')).PDFDocument.load(bytes)).getForm();
        const field = form.getTextField(fieldName);
        return { text: field.getText() || '', da: field.acroField.getDefaultAppearance() };
    };

    it('bettet Fira Condensed ein (Default Appearance referenziert die Schrift)', async () => {
        const { da } = await readField(base, 'Name');
        expect(da).toMatch(/FiraSansCondensed/);
    });
    it('kurzer Wert → Standardgröße 11pt', async () => {
        const shortDoc = { ...doctor, title: '', lastname: 'Meier' };
        const { text, da } = await readField({ ...base, doctor: shortDoc }, 'Name');
        expect(text).toBe('Meier');
        expect(da).toMatch(/\b11 Tf\b/);
    });
    it('sehr langer Wert → schrumpft (< 11) oder Auto (0), Wert bleibt vollständig gesetzt', async () => {
        const longDoc = { ...doctor, title: 'Prof. Dr. med.', lastname: 'Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen' };
        const { text, da } = await readField({ ...base, doctor: longDoc }, 'Name');
        expect(text).toBe('Prof. Dr. med. Von-Hohenzollern-Sigmaringen-Habsburg-Lothringen');
        const size = Number((da.match(/\/\S+\s+([\d.]+)\s+Tf/) || [])[1]);
        expect(size).toBeLessThan(11);
    });
    it('ohne fontBytes: bisheriges Verhalten (kein Wurf, Feld gesetzt)', async () => {
        const bytes = await fillCertificate(tpl(), base);
        const form = (await (await import('pdf-lib')).PDFDocument.load(bytes)).getForm();
        expect(form.getTextField('Name').getText()).toBe('Dr. med. Aerztin');
    });
});
