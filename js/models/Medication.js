class Medication {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.form = data.form || '';
        this.substance = data.substance || '';
        // Getrennte Felder; falls nur alter concentration-String kommt, ableiten.
        if (data.concentrationValue !== undefined || data.concentrationUnit !== undefined) {
            this.concentrationValue = Number(data.concentrationValue) || 0;
            this.concentrationUnit = data.concentrationUnit || '';
        } else if (data.concentration) {
            const numMatch = String(data.concentration).match(/(\d+(?:\.\d+)?)/);
            const unitMatch = String(data.concentration).match(/\d+(?:\.\d+)?(.*)/);
            this.concentrationValue = numMatch ? parseFloat(numMatch[1]) : 0;
            this.concentrationUnit = unitMatch ? unitMatch[1].trim() : '';
        } else {
            this.concentrationValue = 0;
            this.concentrationUnit = '';
        }
        this.manufacturer = data.manufacturer || '';
        this.pzn = data.pzn || ''; // Pharmazentralnummer
        this.btmCategory = data.btmCategory || 'BTM'; // BTM, Nicht-BTM
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    
    // Getters
    get fullName() {
        return `${this.name} ${this.concentration}`;
    }
    
    get description() {
        return `${this.name} ${this.concentration} (${this.substance})`;
    }
    
    get concentration() {
        // Kombinierte Anzeige aus getrennten Feldern (z.B. 36 + "mg" -> "36mg").
        return `${this.concentrationValue}${this.concentrationUnit}`;
    }
    
    get isBTM() {
        return this.btmCategory === 'BTM';
    }
    
    // Validation
    validate() {
        const errors = [];
        
        if (!this.name) {
            errors.push('Medikamentenname ist erforderlich');
        }
        
        if (!this.form) {
            errors.push('Darreichungsform ist erforderlich');
        }
        
        if (!this.substance) {
            errors.push('Wirkstoff ist erforderlich');
        }
        
        if (!this.concentrationValue || this.concentrationValue <= 0) {
            errors.push('Konzentration (Wert) ist erforderlich');
        }
        if (!this.concentrationUnit) {
            errors.push('Konzentration (Einheit) ist erforderlich');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Calculate total substance amount
    calculateTotalSubstance(quantity) {
        return this.concentrationValue * quantity;
    }
    
    // Update method
    update(data) {
        Object.keys(data).forEach(key => {
            if (this.hasOwnProperty(key) && key !== 'id' && key !== 'createdAt') {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Clone method
    clone() {
        return new Medication(this.toJSON());
    }
    
    // Serialization
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            form: this.form,
            substance: this.substance,
            concentrationValue: this.concentrationValue,
            concentrationUnit: this.concentrationUnit,
            manufacturer: this.manufacturer,
            pzn: this.pzn,
            btmCategory: this.btmCategory,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    // Static factory method
    static fromJSON(json) {
        return new Medication(json);
    }
    
    // Check if two medications are the same
    isSameMedication(otherMedication) {
        return this.name === otherMedication.name &&
               this.concentration === otherMedication.concentration &&
               this.substance === otherMedication.substance;
    }
    
    // Format for display
    getDisplayInfo() {
        return {
            name: this.fullName,
            substance: this.substance,
            form: this.form,
            manufacturer: this.manufacturer || 'Nicht angegeben',
            pzn: this.pzn || 'Nicht angegeben',
            category: this.btmCategory
        };
    }
    
    // Format for certificate
    getCertificateData() {
        return {
            handelsbezeichnung: this.name,
            darreichungsform: this.form,
            wirkstoff: this.substance,
            konzentration: this.concentration
        };
    }
    
    // Static method to create medication database
    static getMedicationDatabase() {
        const medications = [];
        
        // Methylphenidate preparations
        const methylphenidate = [
            { name: "Ritalin", form: "Tablette", concentrations: ["5mg", "10mg", "20mg"] },
            { name: "Ritalin Adult", form: "Kapsel", concentrations: ["10mg", "20mg", "30mg", "40mg", "60mg"] },
            { name: "Ritalin LA", form: "Retardkapsel", concentrations: ["10mg", "20mg", "30mg", "40mg"] },
            { name: "Medikinet", form: "Tablette", concentrations: ["5mg", "10mg", "20mg"] },
            { name: "Medikinet adult", form: "Retardkapsel", concentrations: ["5mg", "10mg", "20mg", "30mg", "40mg", "50mg", "60mg"] },
            { name: "Concerta", form: "Retardtablette", concentrations: ["18mg", "27mg", "36mg", "54mg"] },
            { name: "Equasym", form: "Tablette", concentrations: ["5mg", "10mg", "20mg"] },
            { name: "Equasym Retard", form: "Retardkapsel", concentrations: ["10mg", "20mg", "30mg"] },
            { name: "Kinecteen", form: "Retardtablette", concentrations: ["18mg", "27mg", "36mg", "54mg"] }
        ];
        
        methylphenidate.forEach(med => {
            med.concentrations.forEach(conc => {
                medications.push(new Medication({
                    name: med.name,
                    form: med.form,
                    substance: "Methylphenidat",
                    concentration: conc,
                    btmCategory: "BTM"
                }));
            });
        });
        
        // Lisdexamfetamine
        const lisdexamfetamine = [
            { name: "Elvanse", form: "Kapsel", concentrations: ["20mg", "30mg", "40mg", "50mg", "60mg", "70mg"] },
            { name: "Elvanse Adult", form: "Kapsel", concentrations: ["30mg", "50mg", "70mg"] }
        ];
        
        lisdexamfetamine.forEach(med => {
            med.concentrations.forEach(conc => {
                medications.push(new Medication({
                    name: med.name,
                    form: med.form,
                    substance: "Lisdexamfetamin",
                    concentration: conc,
                    btmCategory: "BTM"
                }));
            });
        });
        
        // Dexamfetamine
        const dexamfetamine = [
            { name: "Attentin", form: "Tablette", concentrations: ["5mg", "10mg", "20mg"] }
        ];
        
        dexamfetamine.forEach(med => {
            med.concentrations.forEach(conc => {
                medications.push(new Medication({
                    name: med.name,
                    form: med.form,
                    substance: "Dexamfetamin",
                    concentration: conc,
                    btmCategory: "BTM"
                }));
            });
        });
        
        // Non-BTM medications
        const nonBTM = [
            { name: "Strattera", form: "Kapsel", substance: "Atomoxetin", concentrations: ["10mg", "18mg", "25mg", "40mg", "60mg", "80mg", "100mg"] },
            { name: "Intuniv", form: "Retardtablette", substance: "Guanfacin", concentrations: ["1mg", "2mg", "3mg", "4mg"] }
        ];
        
        nonBTM.forEach(med => {
            med.concentrations.forEach(conc => {
                medications.push(new Medication({
                    name: med.name,
                    form: med.form,
                    substance: med.substance,
                    concentration: conc,
                    btmCategory: "Nicht-BTM"
                }));
            });
        });
        
        return medications;
    }
    
    // Search medications
    static searchMedications(searchTerm, medications) {
        const term = searchTerm.toLowerCase();
        return medications.filter(med => 
            med.name.toLowerCase().includes(term) ||
            med.substance.toLowerCase().includes(term) ||
            med.form.toLowerCase().includes(term)
        );
    }
    
    // Group medications by name for display
    static groupByName(medications) {
        const grouped = {};
        
        medications.forEach(med => {
            const key = `${med.name}_${med.substance}_${med.form}`;
            if (!grouped[key]) {
                grouped[key] = {
                    name: med.name,
                    substance: med.substance,
                    form: med.form,
                    concentrations: []
                };
            }
            grouped[key].concentrations.push(med.concentration);
        });
        
        return Object.values(grouped);
    }
}

// Dosage Scheme class for medication dosing
class DosageScheme {
    constructor(data = {}) {
        this.medicationId = data.medicationId || null;
        this.startDate = data.startDate || '';
        this.endDate = data.endDate || '';
        this.morning = data.morning || 0;
        this.noon = data.noon || 0;
        this.evening = data.evening || 0;
        this.night = data.night || 0;
        this.reasonLabel = data.reasonLabel || '';
        this.reasonIcd10 = data.reasonIcd10 || '';
        this.reasonNote = data.reasonNote ?? data.notes ?? '';
        this.weekdays = Array.isArray(data.weekdays) ? data.weekdays : [];
    }
    
    // Getters
    get dailyDose() {
        return this.morning + this.noon + this.evening + this.night;
    }

    get isDaily() {
        return this.weekdays.length === 0 || this.weekdays.length === 7;
    }

    get notation() {
        if (this.night > 0) {
            return `${this.morning}-${this.noon}-${this.evening}-${this.night}`;
        }
        return `${this.morning}-${this.noon}-${this.evening}`;
    }
    
    get duration() {
        if (!this.startDate || !this.endDate) return 0;
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    get totalDose() {
        return this.dailyDose * this.duration;
    }
    
    // Validation
    validate() {
        const errors = [];
        
        if (!this.startDate) {
            errors.push('Startdatum ist erforderlich');
        }
        
        if (!this.endDate) {
            errors.push('Enddatum ist erforderlich');
        }
        
        if (new Date(this.endDate) < new Date(this.startDate)) {
            errors.push('Enddatum muss nach Startdatum liegen');
        }
        
        if (this.dailyDose === 0) {
            errors.push('Mindestens eine Dosis pro Tag erforderlich');
        }
        
        if (this.morning < 0 || this.noon < 0 || this.evening < 0 || this.night < 0) {
            errors.push('Negative Dosierungen sind nicht erlaubt');
        }
        
        if (this.morning > 10 || this.noon > 10 || this.evening > 10 || this.night > 10) {
            errors.push('Maximale Einzeldosis überschritten (max. 10)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Clone method
    clone() {
        return new DosageScheme(this.toJSON());
    }
    
    // Serialization
    toJSON() {
        const json = {
            medicationId: this.medicationId,
            startDate: this.startDate,
            endDate: this.endDate,
            morning: this.morning,
            noon: this.noon,
            evening: this.evening,
            night: this.night,
            reasonLabel: this.reasonLabel,
            reasonIcd10: this.reasonIcd10,
            reasonNote: this.reasonNote,
        };
        if (!this.isDaily) json.weekdays = this.weekdays;
        return json;
    }
    
    // Static factory method
    static fromJSON(json) {
        return new DosageScheme(json);
    }
    
    // Format for display
    getDisplayInfo() {
        return {
            period: `${new Date(this.startDate).toLocaleDateString('de-DE')} - ${new Date(this.endDate).toLocaleDateString('de-DE')}`,
            notation: this.notation,
            dailyDose: `${this.dailyDose} Einheiten/Tag`,
            totalDose: `${this.totalDose} Einheiten gesamt`,
            duration: `${this.duration} Tage`
        };
    }
}

export { Medication, DosageScheme };