import { escapeHtml, setDataset } from '../utils/Sanitize.js';

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
        container.innerHTML = '<h3>Generierte PDFs:</h3><div class="pdf-download-list"></div>';
        
        pdfList.forEach((pdfInfo, index) => {
            const pdfItem = document.createElement('div');
            pdfItem.className = 'pdf-item';
            
            if (pdfInfo.isMedicationPlan) {
                pdfItem.style.background = '#e3f2fd';
                pdfItem.innerHTML = `
                    <h4>📋 Medikationsplan</h4>
                    <p style="font-size: 12px; color: #666;">Querformat mit Arztdaten</p>
                    <button class="btn btn-primary btn-small download-pdf-btn">
                        💾 Download
                    </button>
                `;
            } else {
                const name = pdfInfo.medication.handelsname || pdfInfo.medication.name;
                pdfItem.innerHTML = `
                    <h4>📄 ${escapeHtml(name)} ${escapeHtml(pdfInfo.medication.concentration)}</h4>
                    <p style="font-size: 12px; color: #666;">Amtliches Formular (befüllt)</p>
                    <button class="btn btn-secondary btn-small download-pdf-btn">
                        💾 Download
                    </button>
                `;
            }
            
            setDataset(pdfItem.querySelector('.download-pdf-btn'), { index });
            container.querySelector('.pdf-download-list').appendChild(pdfItem);
        });
        
        // Add summary
        const summary = document.createElement('div');
        summary.className = 'alert alert-success';
        summary.style.marginTop = '20px';
        summary.textContent = `✅ ${pdfList.length} PDFs wurden erfolgreich generiert und können heruntergeladen werden.`;
        container.appendChild(summary);
        
        // Bind download events (index ist Array-Position)
        container.querySelectorAll('.download-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                window.app.controllers.pdf.downloadPDF(index);
            });
        });
    }
    
    showError(message) {
        const container = document.getElementById('certificates-container');
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning';
        alert.textContent = `⚠️ ${message}`;
        container.replaceChildren(alert);
    }
}

export { CertificateView };
