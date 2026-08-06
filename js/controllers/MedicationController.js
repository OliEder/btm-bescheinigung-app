import { MedicationInstance } from '../models/MedicationInstance.js';

class MedicationController {
    constructor(model, view, repository) {
        this.model = model;
        this.view = view;
        this.repository = repository;
    }
    
    init() {
        this.view.bindEvents(this);
        this.view.updateSelectedMedications(this.model.data.selectedMedications);
    }
    
    // --- Repository-basierter Flow (Autocomplete + Staerke-Dropdown) ---
    
    /** Familien-Vorschlaege fuer die Autocomplete-Eingabe. */
    suggest(query) {
        return this.repository ? this.repository.search(query) : [];
    }
    
    /** Waehlbare Staerken einer Produktfamilie. */
    strengthsFor(productFamily) {
        if (!this.repository) return [];
        const [family] = this.repository.search(productFamily)
            .filter((f) => f.productFamily.toLowerCase() === productFamily.toLowerCase());
        return family ? family.strengths : [];
    }
    
    /** Snapshot-Instanz aus einer DB-Resource erzeugen und speichern. */
    addFromRepository(refId) {
        const resource = this.repository.findById(refId);
        const inst = MedicationInstance.fromRepository(resource);
        this.model.data.selectedMedications.push(inst.toJSON());
        this.model.save();
        if (this.view) this.view.updateSelectedMedications(this.model.data.selectedMedications);
        return inst;
    }
    
    /** Manuelle (Custom-)Instanz erzeugen und speichern. */
    addCustom(fields) {
        const inst = MedicationInstance.custom(fields);
        const result = inst.validate();
        if (!result.isValid) return { errors: result.errors };
        this.model.data.selectedMedications.push(inst.toJSON());
        this.model.save();
        if (this.view) this.view.updateSelectedMedications(this.model.data.selectedMedications);
        return inst;
    }
    
    // --- View-Verdrahtung ---
    
    searchMedication() {
        const searchTerm = document.getElementById('medication-search').value.trim();
        if (!searchTerm) {
            alert('Bitte geben Sie einen Suchbegriff ein!');
            return;
        }
        // Repository-Suche liefert nach Familie gruppierte Treffer mit Staerken.
        const families = this.suggest(searchTerm);
        // In die von der View erwartete Struktur (name/substance/form/concentrations) mappen.
        const results = families.map((f) => ({
            name: f.productFamily,
            substance: f.substance,
            form: f.form,
            concentrations: f.strengths.map((s) => `${s.concentrationValue}${s.concentrationUnit}`),
            refIds: f.strengths.reduce((acc, s) => {
                acc[`${s.concentrationValue}${s.concentrationUnit}`] = s.refId;
                return acc;
            }, {}),
        }));
        this.view.displaySearchResults(results);
    }
    
    addMedication(medData) {
        // medData stammt aus der View-Auswahl (name/form/substance/concentration + optional refId)
        if (medData.refId && this.repository) {
            this.addFromRepository(medData.refId);
        } else {
            const numMatch = String(medData.concentration || '').match(/(\d+(?:\.\d+)?)/);
            const unitMatch = String(medData.concentration || '').match(/\d+(?:\.\d+)?(.*)/);
            this.addCustom({
                handelsname: medData.name,
                wirkstoff: medData.substance,
                darreichungsform: medData.form,
                concentrationValue: numMatch ? parseFloat(numMatch[1]) : 0,
                concentrationUnit: unitMatch ? unitMatch[1].trim() : '',
            });
        }
    }
    
    removeMedication(id) {
        this.model.data.selectedMedications =
            this.model.data.selectedMedications.filter((m) => m.id !== id);
        delete this.model.data.dosageSchemes[id];
        this.model.save();
        this.view.updateSelectedMedications(this.model.data.selectedMedications);
    }
    
    addManualMedication() {
        const medData = this.view.getManualMedicationData();
        if (!medData.name || !medData.form || !medData.substance || !medData.concentration) {
            alert('Bitte alle Felder ausfüllen!');
            return;
        }
        const numMatch = String(medData.concentration).match(/(\d+(?:\.\d+)?)/);
        const unitMatch = String(medData.concentration).match(/\d+(?:\.\d+)?(.*)/);
        const result = this.addCustom({
            handelsname: medData.name,
            wirkstoff: medData.substance,
            darreichungsform: medData.form,
            concentrationValue: numMatch ? parseFloat(numMatch[1]) : 0,
            concentrationUnit: unitMatch ? unitMatch[1].trim() : '',
        });
        if (result && result.errors) {
            alert(result.errors.join(', '));
            return;
        }
        this.view.clearManualForm();
    }
}

export { MedicationController };
