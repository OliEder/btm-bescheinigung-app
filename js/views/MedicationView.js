class MedicationView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="medication-tab">
                <h2>Medikamente</h2>
                <div class="alert alert-info">
                    ℹ️ Fügen Sie die benötigten Betäubungsmittel hinzu
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="medication-search">Medikament suchen</label>
                        <input type="text" id="medication-search" placeholder="z.B. Ritalin, Medikinet, Elvanse...">
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button class="btn btn-primary" id="search-medication-btn">
                            🔍 Suchen
                        </button>
                    </div>
                </div>
                
                <div id="medication-search-results"></div>
                
                <!-- Manual medication entry -->
                <div class="manual-medication-form">
                    <h4>Medikament manuell hinzufügen</h4>
                    <form id="manual-medication-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="manual-med-name">Handelsname *</label>
                                <input type="text" id="manual-med-name" placeholder="z.B. Ritalin Adult" required>
                            </div>
                            <div class="form-group">
                                <label for="manual-med-form">Darreichungsform *</label>
                                <select id="manual-med-form" required>
                                    <option value="Tablette">Tablette</option>
                                    <option value="Kapsel">Kapsel</option>
                                    <option value="Retardkapsel">Retardkapsel</option>
                                    <option value="Retardtablette">Retardtablette</option>
                                    <option value="Tropfen">Tropfen</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="manual-med-substance">Wirkstoff *</label>
                                <input type="text" id="manual-med-substance" placeholder="z.B. Methylphenidat" required>
                            </div>
                            <div class="form-group">
                                <label for="manual-med-concentration">Konzentration *</label>
                                <input type="text" id="manual-med-concentration" placeholder="z.B. 10mg" required>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-secondary">
                            ➕ Manuell hinzufügen
                        </button>
                    </form>
                </div>
                
                <h3 style="margin-top: 30px;">Ausgewählte Medikamente</h3>
                <div id="selected-medications"></div>
            </div>
        `;
    }
    
    render() {
        return this.template;
    }
    
    bindEvents(controller) {
        document.getElementById('search-medication-btn').addEventListener('click', () => {
            controller.searchMedication();
        });
        
        document.getElementById('medication-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                controller.searchMedication();
            }
        });
        
        document.getElementById('manual-medication-form').addEventListener('submit', (e) => {
            e.preventDefault();
            controller.addManualMedication();
        });
    }
    
    displaySearchResults(results) {
        const container = document.getElementById('medication-search-results');
        container.innerHTML = '<h4>Suchergebnisse:</h4>';
        
        if (results.length === 0) {
            container.innerHTML += '<p>Keine Medikamente gefunden.</p>';
            return;
        }
        
        results.forEach(med => {
            const medDiv = document.createElement('div');
            medDiv.className = 'medication-item';
            medDiv.innerHTML = `
                <div class="medication-header">
                    <span class="medication-title">${med.name} (${med.substance})</span>
                    <span>${med.form}</span>
                </div>
                <div class="form-row">
                    ${med.concentrations.map(conc => `
                        <button class="btn btn-secondary btn-small add-med-btn" 
                                data-name="${med.name}" 
                                data-form="${med.form}" 
                                data-substance="${med.substance}" 
                                data-concentration="${conc}">
                            + ${conc}
                        </button>
                    `).join('')}
                </div>
            `;
            container.appendChild(medDiv);
        });
        
        // Bind click events to concentration buttons
        container.querySelectorAll('.add-med-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medData = {
                    name: e.target.dataset.name,
                    form: e.target.dataset.form,
                    substance: e.target.dataset.substance,
                    concentration: e.target.dataset.concentration
                };
                window.app.controllers.medication.addMedication(medData);
            });
        });
    }
    
    updateSelectedMedications(medications) {
        const container = document.getElementById('selected-medications');
        
        if (medications.length === 0) {
            container.innerHTML = '<p>Noch keine Medikamente ausgewählt.</p>';
            return;
        }
        
        container.innerHTML = medications.map(med => `
            <div class="medication-item">
                <div class="medication-header">
                    <span class="medication-title">${med.name} ${med.concentration}</span>
                    <button class="btn btn-danger btn-small remove-med-btn" data-id="${med.id}">
                        🗑️ Entfernen
                    </button>
                </div>
                <p>Wirkstoff: ${med.substance} | Form: ${med.form}</p>
            </div>
        `).join('');
        
        // Bind remove events
        container.querySelectorAll('.remove-med-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.app.controllers.medication.removeMedication(parseFloat(e.target.dataset.id));
            });
        });
    }
    
    getManualMedicationData() {
        return {
            name: document.getElementById('manual-med-name').value,
            form: document.getElementById('manual-med-form').value,
            substance: document.getElementById('manual-med-substance').value,
            concentration: document.getElementById('manual-med-concentration').value
        };
    }
    
    clearManualForm() {
        document.getElementById('manual-med-name').value = '';
        document.getElementById('manual-med-concentration').value = '';
        document.getElementById('manual-med-substance').value = '';
    }
}