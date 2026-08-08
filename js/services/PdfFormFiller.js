import { PDFDocument } from 'pdf-lib';
import { DateHelper } from '../utils/DateHelper.js';
import { DosageAggregator } from './DosageAggregator.js';
import { formatNumber } from '../utils/NumberFormat.js';
import { formUnit } from '../utils/DosageForm.js';
import { detectDeviations } from './DosageDeviation.js';

// Befuellt das amtliche BfArM-017-Formular (AcroForm) und flattet es.
// Signatur-/Behoerdenfelder bleiben bewusst leer (per Hand/vor Ort).
// Feldnamen entsprechen der bereinigten 32-Felder-Version (s. scripts/preprocess-form.mjs).

function setField(form, name, value) {
    try {
        form.getTextField(name).setText(String(value ?? ''));
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

export async function fillCertificate(templateBytes, data) {
    const { patient, doctor, travel, medication, blocks = [], flatten = true } = data;
    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();

    // A – Arzt
    setField(form, 'Name', doctor.lastname);
    setField(form, 'Vorname', doctor.firstname);
    setField(form, 'Telefon', doctor.phone);
    setField(form, 'Anschrift', doctor.address);
    // Stempel des Arztes / Datum / Unterschrift des Arztes bewusst leer.

    // B – Patient
    setField(form, 'Name_2', patient.lastname);
    setField(form, 'Vorname_2', patient.firstname);
    setField(form, 'Nr des Passes oder eines', patient.passport);
    setField(form, 'Geburtsort', patient.birthplace);
    setField(form, 'Geburtsdatum', DateHelper.formatDate(patient.birthdate));
    setField(form, 'Staatsangehoerigkeit', patient.nationality);
    setField(form, 'Geschlecht', patient.gender);
    setField(form, 'Wohnanschrift', `${patient.street}, ${patient.zip} ${patient.city}`);
    setField(form, 'Dauer der Reise in Tagen', travel.duration);
    setField(form, 'Gültigkeitsdauer der Erlaubnis vonbis max 30 Tage',
        `${DateHelper.formatDate(travel.start)} - ${DateHelper.formatDate(travel.end)}`);

    // C – Arzneimittel
    setField(form, 'Handelsbezeichnung oder Sonderzubereitung', medication.handelsname);
    setField(form, 'Darreichungsform', medication.darreichungsform);
    setField(form, 'Internationale Bezeichnung des Wirkstoffs', medication.wirkstoff);
    const unit = formUnit(medication.darreichungsform);
    setField(form, 'WirkstoffKonzentration',
        `${formatNumber(medication.concentrationValue)} ${medication.concentrationUnit}/${unit.singular}`);
    const { gebrauchsanweisung, anmerkungen } = buildInstruction(blocks, travel);
    setField(form, 'Gebrauchsanweisung', gebrauchsanweisung);
    setField(form, 'Anmerkungen', anmerkungen);
    const stueck = DosageAggregator.totalUnits(blocks);
    const stueckEinheit = stueck === 1 ? unit.singular : unit.plural;
    setField(form, 'Gesamtwirkstoffmenge',
        `${formatNumber(DosageAggregator.totalSubstance(blocks, medication.concentrationValue))} ${medication.concentrationUnit}, entspricht ${formatNumber(stueck)} ${stueckEinheit}`);
    setField(form, 'Reichdauer der Verschreibung in Tagen max 30 Tage',
        `${DosageAggregator.reachDurationDays(blocks)} Tage`);

    // D – Behörde (Bezeichnung/Anschrift_2/Telefon_2/Stempel/Datum_2/Unterschrift) bewusst leer.

    if (flatten) form.flatten();
    return doc.save();
}
