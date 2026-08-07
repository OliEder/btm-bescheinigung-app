// Snapshot-Instanz eines Medikaments (Werte werden beim Hinzufuegen kopiert,
// nicht live aus der DB referenziert — spaetere DB-Korrekturen aendern bereits
// ausgestellte Bescheinigungen nicht rueckwirkend).

export class MedicationInstance {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.medicationRefId = data.medicationRefId ?? null;
        this.isCustom = data.isCustom ?? false;
        this.handelsname = data.handelsname || '';
        this.wirkstoff = data.wirkstoff || '';
        this.darreichungsform = data.darreichungsform || '';
        this.concentrationValue = Number(data.concentrationValue) || 0;
        this.concentrationUnit = data.concentrationUnit || '';
    }

    static fromRepository(resource) {
        const strength = resource.ingredient?.[0]?.strength?.numerator || {};
        return new MedicationInstance({
            medicationRefId: resource.id,
            isCustom: false,
            handelsname: resource.productFamily || resource.code?.text || '',
            wirkstoff: resource.ingredient?.[0]?.itemCodeableConcept?.text || '',
            darreichungsform: resource.form?.text || '',
            concentrationValue: strength.value ?? 0,
            concentrationUnit: strength.unit ?? '',
        });
    }

    static custom(data) {
        return new MedicationInstance({ ...data, isCustom: true, medicationRefId: null });
    }

    validate() {
        const errors = [];
        if (!this.handelsname) errors.push('Handelsname ist erforderlich');
        if (!this.wirkstoff) errors.push('Wirkstoff ist erforderlich');
        if (!this.darreichungsform) errors.push('Darreichungsform ist erforderlich');
        if (!this.concentrationValue || this.concentrationValue <= 0)
            errors.push('Konzentration (Wert) ist erforderlich');
        if (!this.concentrationUnit) errors.push('Konzentration (Einheit) ist erforderlich');
        return { isValid: errors.length === 0, errors };
    }

    get concentration() {
        return `${this.concentrationValue}${this.concentrationUnit}`;
    }

    toJSON() {
        return {
            id: this.id,
            medicationRefId: this.medicationRefId,
            isCustom: this.isCustom,
            handelsname: this.handelsname,
            wirkstoff: this.wirkstoff,
            darreichungsform: this.darreichungsform,
            concentrationValue: this.concentrationValue,
            concentrationUnit: this.concentrationUnit,
        };
    }
}
