import { PDFDocument } from 'pdf-lib';
import { DateHelper } from '../utils/DateHelper.js';
import { DosageAggregator } from './DosageAggregator.js';
import { formatNumber } from '../utils/NumberFormat.js';
import { formUnit } from '../utils/DosageForm.js';
import { detectDeviations } from './DosageDeviation.js';
import fontkit from '@pdf-lib/fontkit';
import { fitFontSize } from './PdfFieldFont.js';

// Befuellt das amtliche BfArM-017-Formular (AcroForm) und flattet es.
// Signatur-/Behoerdenfelder bleiben bewusst leer (per Hand/vor Ort).
// Feldnamen entsprechen der bereinigten 32-Felder-Version (s. scripts/preprocess-form.mjs).

function setField(form, name, value, font) {
    try {
        const field = form.getTextField(name);
        const text = String(value ?? '');
        field.setText(text);
        if (font) {
            // Kontrolliertes Sizing: Standard 11pt, sonst bis 7pt, sonst Auto (0).
            let width = 0;
            try { width = field.acroField.getWidgets()[0].getRectangle().width; } catch { width = 0; }
            const size = width > 0 ? fitFontSize(font, text, width) : 0;
            field.setFontSize(size);
            field.updateAppearances(font);
        } else {
            // Abwaertskompatibel: bisheriges reines Auto-Sizing (Standardschrift).
            field.setFontSize(0);
        }
    } catch {
        // Feld existiert nicht in dieser Formularvariante — ueberspringen.
    }
}

function buildInstruction(blocks, travelData) {
    const notes = [...new Set(blocks.map((b) => (b.reasonNote || '').trim()).filter(Boolean))];
    const deviations = detectDeviations(blocks, travelData);
    const extra = [...deviations, ...notes].join(' | ');
    const append = (base) => {
        const merged = [base, extra].filter((s) => s && s !== 'keine').join(' | ');
        return merged || 'keine';
    };
    if (blocks.length <= 1) {
        const chain = blocks[0] ? DosageAggregator.instructionChain(blocks) : '';
        return { gebrauchsanweisung: chain, anmerkungen: append('') };
    }
    const chain = DosageAggregator.instructionChain(blocks);
    const detailed = DosageAggregator.detailedSchedule(blocks);
    // Zu lange Kette -> Verweis auf Anmerkungen (Zeile fasst ~40 Zeichen bei Kleinschrift).
    const gebrauchsanweisung = chain.length > 40 ? 's. Anmerkungen' : chain;
    return { gebrauchsanweisung, anmerkungen: append(detailed) };
}

export async function fillCertificate(templateBytes, data, fontBytes) {
    const { patient, doctor, travel, medication, blocks = [], flatten = true } = data;
    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();

    // Optionale Condensed-Schrift: einbetten und an setField weiterreichen.
    let font = null;
    if (fontBytes) {
        doc.registerFontkit(fontkit);
        font = await doc.embedFont(fontBytes, { subset: true });
    }

    // A – Arzt: Titel + Nachname im Name-Feld (Titel ist Teil der Berufsangabe).
    setField(form, 'Name', [doctor.title, doctor.lastname].filter(Boolean).join(' ').trim(), font);
    setField(form, 'Vorname', doctor.firstname, font);
    setField(form, 'Telefon', doctor.phone, font);
    setField(form, 'Anschrift', doctor.address, font);
    // Stempel des Arztes / Datum / Unterschrift des Arztes bewusst leer.

    // B – Patient
    setField(form, 'Name_2', patient.lastname, font);
    setField(form, 'Vorname_2', patient.firstname, font);
    setField(form, 'Nr des Passes oder eines', patient.passport, font);
    setField(form, 'Geburtsort', patient.birthplace, font);
    setField(form, 'Geburtsdatum', DateHelper.formatDate(patient.birthdate), font);
    setField(form, 'Staatsangehoerigkeit', patient.nationality, font);
    setField(form, 'Geschlecht', patient.gender, font);
    setField(form, 'Wohnanschrift', `${patient.street}, ${patient.zip} ${patient.city}`, font);
    setField(form, 'Dauer der Reise in Tagen', travel.duration, font);
    setField(form, 'Gültigkeitsdauer der Erlaubnis vonbis max 30 Tage',
        `${DateHelper.formatDate(travel.start)} - ${DateHelper.formatDate(travel.end)}`, font);

    // C – Arzneimittel
    setField(form, 'Handelsbezeichnung oder Sonderzubereitung', medication.handelsname, font);
    setField(form, 'Darreichungsform', medication.darreichungsform, font);
    setField(form, 'Internationale Bezeichnung des Wirkstoffs', medication.wirkstoff, font);
    const unit = formUnit(medication.darreichungsform);
    setField(form, 'WirkstoffKonzentration',
        `${formatNumber(medication.concentrationValue)} ${medication.concentrationUnit}/${unit.singular}`, font);
    const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks, travel);
    setField(form, 'Gebrauchsanweisung', gebrauchsanweisung, font);
    setField(form, 'Anmerkungen', anmerkungen, font);
    const stueck = DosageAggregator.totalUnits(blocks);
    const stueckEinheit = stueck === 1 ? unit.singular : unit.plural;
    setField(form, 'Gesamtwirkstoffmenge',
        `${formatNumber(DosageAggregator.totalSubstance(blocks, medication.concentrationValue))} ${medication.concentrationUnit}, entspricht ${formatNumber(stueck)} ${stueckEinheit}`, font);
    setField(form, 'Reichdauer der Verschreibung in Tagen max 30 Tage',
        `${DosageAggregator.reachDurationDays(blocks)} Tage`, font);

    // D – Behörde (Bezeichnung/Anschrift_2/Telefon_2/Stempel/Datum_2/Unterschrift) bewusst leer.

    if (font) form.updateFieldAppearances(font);
    if (flatten) form.flatten();
    return doc.save();
}
