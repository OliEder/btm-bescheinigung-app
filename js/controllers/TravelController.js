import { AppConfig } from '../config.js';

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
        
        let reasonLabel = '';
        let reasonIcd10 = '';
        if (schemes.length > 0) {
            const prev = schemes[schemes.length - 1];
            reasonLabel = prev.reasonLabel || '';
            reasonIcd10 = prev.reasonIcd10 || '';
        } else {
            const inst = this.model.data.selectedMedications.find((m) => m.id === medicationId);
            const first = inst?.reasonSuggestions?.[0];
            if (first) { reasonLabel = first.label; reasonIcd10 = first.icd10; }
        }

        schemes.push({
            startDate: startDate,
            endDate: this.model.data.travelData.end,
            morning: 0,
            noon: 0,
            evening: 0,
            night: 0,
            reasonLabel,
            reasonIcd10,
            reasonNote: '',
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
        const val = (id) => document.getElementById(id)?.value ?? '';
        const reasonSelect = document.getElementById(`reason-select-${schemeId}`);
        const reasonSelectVal = reasonSelect ? reasonSelect.value : 'none';
        const suggestions = (this.model.data.selectedMedications
            .find((m) => m.id === medicationId)?.reasonSuggestions) || [];

        let reasonLabel = '';
        let reasonIcd10 = '';
        if (reasonSelectVal === 'custom') {
            reasonLabel = val(`reason-custom-${schemeId}`);
        } else if (reasonSelectVal !== 'none' && reasonSelectVal !== '') {
            const s = suggestions[Number(reasonSelectVal)];
            if (s) { reasonLabel = s.label; reasonIcd10 = s.icd10; }
        }

        const scheme = {
            startDate: val(`scheme-start-${schemeId}`),
            endDate: val(`scheme-end-${schemeId}`),
            morning: parseInt(val(`dose-morning-${schemeId}`)) || 0,
            noon: parseInt(val(`dose-noon-${schemeId}`)) || 0,
            evening: parseInt(val(`dose-evening-${schemeId}`)) || 0,
            night: parseInt(val(`dose-night-${schemeId}`)) || 0,
            reasonLabel,
            reasonIcd10,
            reasonNote: val(`reason-note-${schemeId}`),
        };

        this.model.updateDosageScheme(medicationId, schemeIndex, scheme);
    }
}

export { TravelController };
