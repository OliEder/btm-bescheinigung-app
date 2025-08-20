class TravelController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
    }
    
    init() {
        this.view.bindEvents(this);
        if (this.model.data.travelData) {
            this.view.populateTravelData(this.model.data.travelData);
        }
        this.view.updateDosageSchemes(
            this.model.data.selectedMedications,
            this.model.data.travelData,
            this.model.data.dosageSchemes
        );
    }
    
    saveTravelData() {
        const travelData = this.view.getTravelData();
        
        if (!travelData.start || !travelData.end) {
            alert('Bitte geben Sie Abreise- und Rückreisedatum ein!');
            return;
        }
        
        const startDate = new Date(travelData.start);
        const endDate = new Date(travelData.end);
        
        if (endDate < startDate) {
            alert('Das Rückreisedatum muss nach dem Abreisedatum liegen!');
            return;
        }
        
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        if (duration > AppConfig.maxTravelDuration) {
            alert(`Die maximale Reisedauer beträgt ${AppConfig.maxTravelDuration} Tage!`);
            return;
        }
        
        travelData.duration = duration;
        this.model.setTravelData(travelData);
        
        alert('Reisedaten wurden gespeichert!');
        this.view.updateDosageSchemes(
            this.model.data.selectedMedications,
            this.model.data.travelData,
            this.model.data.dosageSchemes
        );
    }
    
    updateTravelDuration() {
        const travelData = this.view.getTravelData();
        
        if (travelData.start && travelData.end) {
            const startDate = new Date(travelData.start);
            const endDate = new Date(travelData.end);
            
            if (endDate >= startDate) {
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                this.view.setTravelDuration(duration);
                
                if (duration > AppConfig.maxTravelDuration) {
                    alert(`Achtung: Die maximale Gültigkeitsdauer beträgt ${AppConfig.maxTravelDuration} Tage!`);
                }
            }
        }
    }
    
    addDosageScheme(medicationId) {
        const schemes = this.model.data.dosageSchemes[medicationId] || [];
        
        let startDate = this.model.data.travelData.start;
        if (schemes.length > 0) {
            const lastScheme = schemes[schemes.length - 1];
            const lastEndDate = new Date(lastScheme.endDate);
            lastEndDate.setDate(lastEndDate.getDate() + 1);
            startDate = lastEndDate.toISOString().split('T')[0];
        }
        
        schemes.push({
            startDate: startDate,
            endDate: this.model.data.travelData.end,
            morning: 0,
            noon: 0,
            evening: 0,
            night: 0
        });
        
        this.model.data.dosageSchemes[medicationId] = schemes;
        this.model.save();
        
        this.view.updateDosageSchemes(
            this.model.data.selectedMedications,
            this.model.data.travelData,
            this.model.data.dosageSchemes
        );
    }
    
    removeScheme(medicationId, schemeIndex) {
        this.model.data.dosageSchemes[medicationId].splice(schemeIndex, 1);
        this.model.save();
        
        this.view.updateDosageSchemes(
            this.model.data.selectedMedications,
            this.model.data.travelData,
            this.model.data.dosageSchemes
        );
    }
    
    updateScheme(medicationId, schemeIndex) {
        const schemeId = `${medicationId}-${schemeIndex}`;
        const scheme = {
            startDate: document.getElementById(`scheme-start-${schemeId}`).value,
            endDate: document.getElementById(`scheme-end-${schemeId}`).value,
            morning: parseInt(document.getElementById(`dose-morning-${schemeId}`).value) || 0,
            noon: parseInt(document.getElementById(`dose-noon-${schemeId}`).value) || 0,
            evening: parseInt(document.getElementById(`dose-evening-${schemeId}`).value) || 0,
            night: parseInt(document.getElementById(`dose-night-${schemeId}`).value) || 0
        };
        
        this.model.updateDosageScheme(medicationId, schemeIndex, scheme);
    }
}