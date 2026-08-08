import { escapeHtml } from '../utils/Sanitize.js';

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
            const medName = med.handelsname || med.name;
            
            return `
                <div class="medication-item">
                    <h4>${escapeHtml(medName)} ${escapeHtml(med.concentration)}</h4>
                    <div class="dosage-scheme">
                        <div id="schemes-${escapeHtml(med.id)}">
                            ${schemes.length === 0 ? 
                                this.renderDosageSchemeInput(med.id, 0, travelData.start, travelData.end, null, med.reasonSuggestions || []) :
                                schemes.map((scheme, index) => 
                                    this.renderDosageSchemeInput(med.id, index, scheme.startDate, scheme.endDate, scheme, med.reasonSuggestions || [])
                                ).join('')
                            }
                        </div>
                        <button class="btn btn-secondary btn-small add-scheme-btn" data-med-id="${escapeHtml(med.id)}">
                            + Weiteres Schema hinzufügen
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Bind events for scheme management
        this.bindSchemeEvents();
    }
    
    renderDosageSchemeInput(medicationId, schemeIndex, startDate, endDate, existingScheme = null, suggestions = []) {
        const schemeId = `${medicationId}-${schemeIndex}`;
        const scheme = existingScheme || { morning: 0, noon: 0, evening: 0, night: 0 };
        const mid = escapeHtml(medicationId);
        const sid = escapeHtml(schemeId);

        const selLabel = existingScheme?.reasonLabel || '';
        const selIcd = existingScheme?.reasonIcd10 || '';
        const matchIdx = suggestions.findIndex((s) => s.label === selLabel && (s.icd10 || '') === (selIcd || ''));
        const selectedVal = selLabel === '' ? 'none' : (matchIdx >= 0 ? String(matchIdx) : 'custom');
        const options = suggestions.map((s, i) =>
            `<option value="${i}"${selectedVal === String(i) ? ' selected' : ''}>${escapeHtml(s.label)}</option>`).join('');
        const noneSel = selectedVal === 'none' ? ' selected' : '';
        const customSel = selectedVal === 'custom' ? ' selected' : '';
        const customStyle = selectedVal === 'custom' ? '' : 'display:none;';
        const reasonBlock = `
            <div class="reason-group">
                <label>Grund</label>
                <select id="reason-select-${sid}" class="reason-select" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    ${options}
                    <option value="custom"${customSel}>Anderer Grund…</option>
                    <option value="none"${noneSel}>— kein Grund —</option>
                </select>
                <input type="text" id="reason-custom-${sid}" class="reason-custom" placeholder="Eigener Grund"
                       style="${customStyle}" value="${escapeHtml(selectedVal === 'custom' ? selLabel : '')}"
                       data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                <input type="text" id="reason-note-${sid}" class="reason-note" placeholder="Anmerkung zur Dosierung"
                       value="${escapeHtml(existingScheme?.reasonNote || '')}"
                       data-med-id="${mid}" data-scheme-index="${schemeIndex}">
            </div>`;
        
        return `
            <div class="dosage-scheme-item" id="scheme-${sid}">
                <p><strong>Schema ${schemeIndex + 1}</strong></p>
                <div class="form-row">
                    <div class="form-group">
                        <label>Von</label>
                        <input type="date" id="scheme-start-${sid}" value="${escapeHtml(startDate)}" 
                               class="scheme-date" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div class="form-group">
                        <label>Bis</label>
                        <input type="date" id="scheme-end-${sid}" value="${escapeHtml(endDate)}"
                               class="scheme-date" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                </div>
                <div class="dosage-input-group">
                    <div>
                        <div class="dosage-label">Morgens</div>
                        <input type="number" min="0" max="10" value="${escapeHtml(scheme.morning)}" 
                               id="dose-morning-${sid}" 
                               class="dose-input" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Mittags</div>
                        <input type="number" min="0" max="10" value="${escapeHtml(scheme.noon)}" 
                               id="dose-noon-${sid}"
                               class="dose-input" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Abends</div>
                        <input type="number" min="0" max="10" value="${escapeHtml(scheme.evening)}" 
                               id="dose-evening-${sid}"
                               class="dose-input" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                    <div>
                        <div class="dosage-label">Nachts</div>
                        <input type="number" min="0" max="10" value="${escapeHtml(scheme.night)}" 
                               id="dose-night-${sid}"
                               class="dose-input" data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                    </div>
                </div>
                ${reasonBlock}
                ${schemeIndex > 0 ? `
                    <button class="btn btn-danger btn-small remove-scheme-btn" 
                            data-med-id="${mid}" data-scheme-index="${schemeIndex}">
                        Schema entfernen
                    </button>` : ''}
            </div>
        `;
    }
    
    bindSchemeEvents() {
        // Add scheme buttons (medId ist UUID-String)
        document.querySelectorAll('.add-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medId = e.currentTarget.dataset.medId;
                window.app.controllers.travel.addDosageScheme(medId);
            });
        });
        
        // Remove scheme buttons
        document.querySelectorAll('.remove-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                window.app.controllers.travel.removeScheme(medId, schemeIndex);
            });
        });
        
        // Dose inputs
        document.querySelectorAll('.dose-input, .scheme-date').forEach(input => {
            input.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });

        // Grund-Select
        document.querySelectorAll('.reason-select').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
                const sid = `${medId}-${schemeIndex}`;
                const custom = document.getElementById(`reason-custom-${sid}`);
                if (custom) custom.style.display = e.currentTarget.value === 'custom' ? '' : 'none';
                window.app.controllers.travel.updateScheme(medId, schemeIndex);
            });
        });

        // Eigener Grund + Anmerkung
        document.querySelectorAll('.reason-custom, .reason-note').forEach((el) => {
            el.addEventListener('change', (e) => {
                const medId = e.currentTarget.dataset.medId;
                const schemeIndex = parseInt(e.currentTarget.dataset.schemeIndex, 10);
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

export { TravelView };
