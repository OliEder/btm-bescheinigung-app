class MedicationController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.medicationDatabase = [...AppConfig.medications, ...model.data.medications];
    }
    
    init() {
        this.view.bindEvents(this);
        this.view.updateSelectedMedications(this.model.data.selectedMedications);
    }
    
    searchMedication() {
        const searchTerm = document.getElementById('medication-search').value.toLowerCase();
        
        if (!searchTerm) {
            alert('Bitte geben Sie einen Suchbegriff ein!');
            return;
        }
        
        const results = this.medicationDatabase.filter(med => 
            med.name.toLowerCase().includes(searchTerm) ||
            med.substance.toLowerCase().includes(searchTerm)
        );
        
        this.view.displaySearchResults(results);
    }
    
    addMedication(medData) {
        this.model.addMedication(medData);
        this.view.updateSelectedMedications(this.model.data.selectedMedications);
        alert(`${medData.name} ${medData.concentration} wurde hinzugefügt!`);
    }
    
    removeMedication(id) {
        this.model.removeMedication(id);
        this.view.updateSelectedMedications(this.model.data.selectedMedications);
    }
    
    addManualMedication() {
        const medData = this.view.getManualMedicationData();
        
        if (!medData.name || !medData.form || !medData.substance || !medData.concentration) {
            alert('Bitte alle Felder ausfüllen!');
            return;
        }
        
        // Add to database for future use
        const existingMed = this.model.data.medications.find(m => m.name === medData.name);
        if (existingMed) {
            if (!existingMed.concentrations.includes(medData.concentration)) {
                existingMed.concentrations.push(medData.concentration);
            }
        } else {
            this.model.data.medications.push({
                name: medData.name,
                form: medData.form,
                substance: medData.substance,
                concentrations: [medData.concentration]
            });
        }
        
        // Add to selected medications
        this.addMedication(medData);
        this.view.clearManualForm();
        
        // Update database for next search
        this.medicationDatabase = [...AppConfig.medications, ...this.model.data.medications];
    }
}