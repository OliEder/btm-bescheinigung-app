class TravelView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="travel-tab">
                <h2>Reisedaten & Einnahmeschemata</h2>
                <div class="alert alert-info">
                    ℹ️ Geben Sie die Reisedaten und Einnahmeschemata in Dreier-Notation ein
                </div>
                
                <form id="travel-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="travel-start">Abreisedatum *</label>
                            <input type="date" id="travel-start" required>
                        </div>
                        <div class="form-group">
                            <label for="travel-end">Rückreisedatum *</label>
                            <input type="date" id="travel-end" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="travel-duration">Reisedauer (Tage)</label>
                            <input type="number" id="travel-duration" readonly>
                        </div>
                        <div class="form-group">
                            <label for="travel-destination">Reiseziel</label>
                            <input type="text" id="travel-destination" placeholder="z.B. Spanien, Italien...">
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        💾 Reisedaten speichern
                    </button>
                </form>
                
                <h3 style="margin-top: 30px;">Einnahmeschemata</h3>
                <div id="dosage-schemes"></div>
            </div>
        `;
    }
    
    render() {
        return this.template;
    }
    
    bindEvents(controller) {
        document.getElementById('travel-form').addEventListener('submit', (e) => {
            e.preventDefault();
            controller.saveTravelData();
        });
        
        document.getElementById('travel-start').addEventListener('change', () => {
            controller.updateTravelDuration();
        });
        
        document.getElementById('travel-end').addEventListener('change', () => {
            controller.updateTravelDuration();
        });
    }
    
    updateDosageSchemes(selectedMedications, travelData, dosageSchemes) {
        const container = document.getElementById('dosage-schemes');
        
        if (selectedMedications.length === 0) {
            container.innerHTML = '<p>Bitte erst Medikamente auswählen.</p>';
            return;
        }
        
        if (!travelData) {
            container.innerHTML = '<p>Bitte erst Reisedaten eingeben.</p>';
            return;
        }
        
        container.innerHTML = selectedMedications.map(med => {
            const schemes = dosageSchemes[med.id] || [];
            
            return `
                <div class="medication-item">
                    <h4>${med.name} ${med.concentration}</h4>
                    <div class="dosage-scheme">
                        <div id="schemes-${med.id}">
                            ${schemes.length === 0 ? 
                                this.renderDosageSchemeInput(med.id, 0, travelData.start, travelData.end) :
                                schemes.map((scheme, index) => 
                                    this.renderDosageSchemeInput(med.id, index, scheme.startDate, scheme.endDate, scheme)
                                ).join('')
                            }
                        </div>
                        <button class="btn btn-secondary btn-small add-scheme-btn" data-med-id="${med.id}">
                            + Weiteres Schema hinzufügen
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Bind events for scheme management
        this.bindSchemeEvents();
    }
    
    renderDosageSchemeInput(medicationId, schemeIndex, startDate, endDate, existingScheme = null) {
        const schemeId = `${medicationId}-${schemeIndex}`;
        const scheme = existingScheme || { morning: 0, noon: 0, evening: 0, night: 0 };
        
        return `
            <div class="dosage-scheme-item" id="scheme-${schemeId}">
                <p><strong>Schema ${schemeIndex + 1}</strong></p>
                <div class="form-row">
                    <div class="form-group">
                        <label>Von</label>
                        <input type="date" id="scheme-start-${schemeId}" value="${startDate}" 
                               class="scheme-date" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div class="form-group">
                        <label>Bis</label>
                        <input type="date" id="scheme-end-${schemeId}" value="${endDate}"
                               class="scheme-date" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                </div>
                <div class="dosage-input-group">
                    <div>
                        <div class="dosage-label">Morgens</div>
                        <input type="number" min="0" max="10" value="${scheme.morning}" 
                               id="dose-morning-${schemeId}" 
                               class="dose-input" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Mittags</div>
                        <input type="number" min="0" max="10" value="${scheme.noon}" 
                               id="dose-noon-${schemeId}"
                               class="dose-input" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Abends</div>
                        <input type="number" min="0" max="10" value="${scheme.evening}" 
                               id="dose-evening-${schemeId}"
                               class="dose-input" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Nachts</div>
                        <input type="number" min="0" max="10" value="${scheme.night}" 
                               id="dose-night-${schemeId}"
                               class="dose-input" data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                    </div>
                </div>
                ${schemeIndex > 0 ? `
                    <button class="btn btn-danger btn-small remove-scheme-btn" 
                            data-med-id="${medicationId}" data-scheme-index="${schemeIndex}">
                        Schema entfernen
                    </button>` : ''}
            </div>
        `;
    }
    
    bindSchemeEvents() {
        // Add scheme buttons
        document.querySelectorAll('.add-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medId = parseFloat(e.target.dataset.medId);
                window.app.controllers.travel.addDosageScheme(medId);
            });
        });
        
        // Remove scheme buttons
        document.querySelectorAll('.remove-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medId = parseFloat(e.target.dataset.medId);
                const schemeIndex = parseInt(e.target.dataset.schemeIndex);
                window.app.controllers.travel.removeScheme(medId, schemeIndex);
            });
        });
        
        // Dose inputs
        document.querySelectorAll('.dose-input, .scheme-date').forEach(input => {
            input.addEventListener('change', (e) => {
                const medId = parseFloat(e.target.dataset.medId);
                const schemeIndex = parseInt(e.target.dataset.schemeIndex);
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });
    }
    
    getTravelData() {
        return {
            start: document.getElementById('travel-start').value,
            end: document.getElementById('travel-end').value,
            destination: document.getElementById('travel-destination').value
        };
    }
    
    setTravelDuration(duration) {
        document.getElementById('travel-duration').value = duration;
    }
    
    populateTravelData(travelData) {
        if (!travelData) return;
        
        document.getElementById('travel-start').value = travelData.start || '';
        document.getElementById('travel-end').value = travelData.end || '';
        document.getElementById('travel-destination').value = travelData.destination || '';
        document.getElementById('travel-duration').value = travelData.duration || '';
    }
}