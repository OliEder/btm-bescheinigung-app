class CertificateView {
    constructor() {
        this.template = `
            <div class="tab-content active" id="certificates-tab">
                <h2>Formulare & Medikationsplan</h2>
                <div class="alert alert-info">
                    ℹ️ Generieren Sie PDFs für alle Formulare und den Medikationsplan
                </div>
                
                <div class="button-group">
                    <button class="btn btn-primary" id="generate-pdfs-btn">
                        📄 PDFs generieren
                    </button>
                    <button class="btn btn-success" id="download-all-pdfs-btn">
                        💾 Alle PDFs herunterladen
                    </button>
                    <button class="btn btn-secondary" id="export-data-btn">
                        📤 Daten exportieren
                    </button>
                </div>
                
                <div id="certificates-container" style="margin-top: 30px;"></div>
                <div id="medication-plan-container"></div>
            </div>
        `;
    }
    
    render() {
        return this.template;
    }
    
    bindEvents(controller) {
        document.getElementById('generate-pdfs-btn').addEventListener('click', () => {
            controller.generatePDFs();
        });
        
        document.getElementById('download-all-pdfs-btn').addEventListener('click', () => {
            controller.downloadAllPDFs();
        });
        
        document.getElementById('export-data-btn').addEventListener('click', () => {
            controller.exportData();
        });
    }
    
    displayGeneratedPDFs(pdfList) {
        const container = document.getElementById('certificates-container');
        container.innerHTML = '<h3>Generierte PDFs:</h3><div class="pdf-download-list">';
        
        pdfList.forEach((pdfInfo, index) => {
            const pdfItem = document.createElement('div');
            pdfItem.className = 'pdf-item';
            
            if (pdfInfo.isMedicationPlan) {
                pdfItem.style.background = '#e3f2fd';
                pdfItem.innerHTML = `
                    <h4>📋 Medikationsplan</h4>
                    <p style="font-size: 12px; color: #666;">Querformat mit Arztdaten</p>
                    <button class="btn btn-primary btn-small download-pdf-btn" data-index="${index}">
                        💾 Download
                    </button>
                `;
            } else {
                pdfItem.innerHTML = `
                    <h4>📄 ${pdfInfo.medication.name} ${pdfInfo.medication.concentration}</h4>
                    <p style="font-size: 12px; color: #666;">2 Seiten (Formular + Legende)</p>
                    <button class="btn btn-secondary btn-small download-pdf-btn" data-index="${index}">
                        💾 Download
                    </button>
                `;
            }
            
            container.querySelector('.pdf-download-list').appendChild(pdfItem);
        });
        
        // Add summary
        const summary = document.createElement('div');
        summary.className = 'alert alert-success';
        summary.style.marginTop = '20px';
        summary.innerHTML = `✅ ${pdfList.length} PDFs wurden erfolgreich generiert und können heruntergeladen werden.`;
        container.appendChild(summary);
        
        // Bind download events
        container.querySelectorAll('.download-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                window.app.controllers.pdf.downloadPDF(index);
            });
        });
    }
    
    showError(message) {
        const container = document.getElementById('certificates-container');
        container.innerHTML = `
            <div class="alert alert-warning">
                ⚠️ ${message}
            </div>
        `;
    }
}