import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DateHelper } from '../utils/DateHelper.js';
import { formatNumber } from '../utils/NumberFormat.js';

// Bundeseinheitlicher Medikationsplan (BMP) angelehnt an § 31a Abs. 4 Satz 1 SGB V.
// Spalten je Zeile: Wirkstoff, Handelsname, Staerke, Form, morgens, mittags,
// abends, nachts (zur Nacht), Einheit, Hinweise, Grund.

function ddmm(dateStr) {
    if (!dateStr) return '';
    // UTC-Accessoren fuer zeitzonenstabile Datumsanzeige (s. DosageAggregator.ddmm).
    const d = new Date(dateStr);
    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.`;
}

function grundText(b) {
    const label = b.reasonLabel || '';
    if (!label) return '';
    return b.reasonIcd10 ? `${label} (${b.reasonIcd10})` : label;
}
function hinweisText(zeitraum, b) {
    const note = b.reasonNote || '';
    if (zeitraum && note) return `${zeitraum} · ${note}`;
    return zeitraum || note;
}

// Einheit aus der Darreichungsform ableiten (BMP-Spalte "Einheit").
function unitForForm(form) {
    const f = (form || '').toLowerCase();
    if (f.includes('tropfen')) return 'Tropfen';
    if (f.includes('saft') || f.includes('lösung') || f.includes('loesung')) return 'ml';
    // Tablette, Retardtablette, Kapsel, Retardkapsel ...
    return 'Stück';
}

/**
 * Wandelt Medikamente + Dosierschemata in BMP-Zeilen um.
 * Pro Dosierblock (Titration) eine Zeile; der Zeitraum steht im Hinweise-Feld,
 * wenn ein Medikament mehrere Bloecke hat.
 */
export function buildMedicationPlanRows(medications, dosageSchemes) {
    const rows = [];
    for (const med of medications) {
        const name = med.handelsname || med.name || '';
        const wirkstoff = med.wirkstoff || med.substance || '';
        const form = med.darreichungsform || med.form || '';
        const value = med.concentrationValue ?? '';
        const unit = med.concentrationUnit || '';
        const staerke = value !== '' ? `${value} ${unit}`.trim() : (med.concentration || '');
        const blocks = dosageSchemes[med.id] || [];
        const multi = blocks.length > 1;

        if (blocks.length === 0) {
            rows.push({
                wirkstoff, handelsname: name, staerke, form,
                morgens: '', mittags: '', abends: '', nachts: '',
                einheit: unitForForm(form), hinweise: '', grund: '',
            });
            continue;
        }

        for (const b of blocks) {
            const zeitraum = multi ? `${ddmm(b.startDate)}–${ddmm(b.endDate)}` : '';
            rows.push({
                wirkstoff, handelsname: name, staerke, form,
                morgens: formatNumber(b.morning ?? 0),
                mittags: formatNumber(b.noon ?? 0),
                abends: formatNumber(b.evening ?? 0),
                nachts: formatNumber(b.night ?? 0),
                einheit: unitForForm(form),
                hinweise: hinweisText(zeitraum, b),
                grund: grundText(b),
            });
        }
    }
    return rows;
}

const COLUMNS = [
    { key: 'wirkstoff', label: 'Wirkstoff', width: 95 },
    { key: 'handelsname', label: 'Handelsname', width: 90 },
    { key: 'staerke', label: 'Stärke', width: 55 },
    { key: 'form', label: 'Form', width: 80 },
    { key: 'morgens', label: 'morgens', width: 48 },
    { key: 'mittags', label: 'mittags', width: 48 },
    { key: 'abends', label: 'abends', width: 48 },
    { key: 'nachts', label: 'z. Nacht', width: 48 },
    { key: 'einheit', label: 'Einheit', width: 48 },
    { key: 'hinweise', label: 'Hinweise', width: 110 },
    { key: 'grund', label: 'Grund', width: 90 },
];

export async function buildMedicationPlan({ patient, doctor, medications, dosageSchemes, printDate }) {
    const doc = await PDFDocument.create();
    // A4 quer (Querformat): 841.89 x 595.28 pt.
    const page = doc.addPage([841.89, 595.28]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const marginX = 24;
    let y = height - 36;

    const draw = (text, x, yy, size = 9, f = font) =>
        page.drawText(String(text ?? ''), { x, y: yy, size, font: f, color: rgb(0, 0, 0) });

    // Kopf: Titel + rechtsbuendig Ausdruckdatum.
    draw('Medikationsplan', marginX, y, 16, bold);
    draw('gemäß § 31a Abs. 4 SGB V', marginX + 160, y + 2, 9, font);
    const pd = DateHelper.formatDate(printDate || new Date().toISOString());
    draw(`Ausdruck: ${pd}`, width - 150, y, 9, font);
    y -= 22;

    // Patientenzeile.
    const pName = `${patient?.firstname || ''} ${patient?.lastname || ''}`.trim();
    const pGeb = patient?.birthdate ? DateHelper.formatDate(patient.birthdate) : '';
    draw(`Patient/in: ${pName}    geb. ${pGeb}`, marginX, y, 10, bold);
    y -= 16;

    // Erstellende Person/Einrichtung.
    const dName = `${doctor?.title || ''} ${doctor?.firstname || ''} ${doctor?.lastname || ''}`.trim();
    draw(`Erstellt von: ${dName}${doctor?.address ? ', ' + doctor.address : ''}`, marginX, y, 9, font);
    y -= 20;

    // Tabellenkopf.
    let x = marginX;
    const headerY = y;
    page.drawRectangle({ x: marginX, y: headerY - 4, width: width - 2 * marginX, height: 16, color: rgb(0.9, 0.9, 0.9) });
    for (const col of COLUMNS) {
        draw(col.label, x + 2, headerY, 8, bold);
        x += col.width;
    }
    y -= 18;

    // Datenzeilen.
    const rows = buildMedicationPlanRows(medications, dosageSchemes);
    for (const row of rows) {
        x = marginX;
        for (const col of COLUMNS) {
            let val = row[col.key] ?? '';
            // Grobe Kuerzung, damit Text nicht in die Nachbarspalte laeuft.
            const maxChars = Math.floor(col.width / 4.6);
            if (val.length > maxChars) val = val.slice(0, maxChars - 1) + '…';
            draw(val, x + 2, y, 8, font);
            x += col.width;
        }
        page.drawLine({
            start: { x: marginX, y: y - 3 },
            end: { x: width - marginX, y: y - 3 },
            thickness: 0.3, color: rgb(0.8, 0.8, 0.8),
        });
        y -= 15;
        if (y < 40) break; // Einseitig; bei Bedarf spaeter Umbruch ergaenzen.
    }

    // Fußzeile.
    draw('Dosierangaben: Anzahl je Einnahmezeitpunkt (morgens–mittags–abends–zur Nacht).',
        marginX, 24, 7, font);

    return doc.save();
}
