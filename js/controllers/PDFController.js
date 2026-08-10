import { fillCertificate } from '../services/PdfFormFiller.js';
import { buildMedicationPlan } from '../services/MedicationPlanBuilder.js';
import templateUrl from '../../assets/reise-scheng-formular.pdf';
import fontUrl from '../../assets/fonts/FiraSansCondensed-Regular.ttf';

// Testbare Kernfunktion: baut die PDF-Bytes aus Session + gewaehlter Medikamenten-ID.
export async function buildCertificateBytes(templateBytes, session, medicationId, fontBytes) {
    const medication = session.selectedMedications.find((m) => m.id === medicationId);
    const blocks = session.dosageSchemes[medicationId] || [];
    return fillCertificate(templateBytes, {
        patient: session.currentPatient,
        doctor: session.currentDoctor,
        travel: session.travelData,
        medication,
        blocks,
    }, fontBytes);
}

class PDFController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.generatedPDFs = [];
        this._templateBytes = null;
        this._fontBytes = null;
    }
    
    init() {
        this.view.bindEvents(this);
    }
    
    async _loadTemplate() {
        if (this._templateBytes) return this._templateBytes;
        const res = await fetch(templateUrl);
        this._templateBytes = new Uint8Array(await res.arrayBuffer());
        return this._templateBytes;
    }

    async _loadFont() {
        if (this._fontBytes) return this._fontBytes;
        const res = await fetch(fontUrl);
        this._fontBytes = new Uint8Array(await res.arrayBuffer());
        return this._fontBytes;
    }
    
    async generatePDFs() {
        if (!this.validateData()) {
            this.view.showError('Bitte füllen Sie alle erforderlichen Daten aus!');
            return;
        }
        
        const templateBytes = await this._loadTemplate();
        const fontBytes = await this._loadFont();
        this.generatedPDFs = [];
        
        for (const med of this.model.data.selectedMedications) {
            const name = med.handelsname || med.name;
            const conc = med.concentration
                || `${med.concentrationValue || ''}${med.concentrationUnit || ''}`;
            const fileName = `BTM-Bescheinigung_${name}_${conc}.pdf`.replace(/\s+/g, '_');
            // Template pro Medikament frisch laden (fillCertificate flattet und veraendert das Dokument).
            const bytes = await buildCertificateBytes(templateBytes, this.model.data, med.id, fontBytes);
            this.generatedPDFs.push({ name: fileName, bytes, medication: med });
        }

        // Medikationsplan (§ 31a Abs. 4 SGB V) ueber alle Medikamente.
        const planBytes = await buildMedicationPlan({
            patient: this.model.data.currentPatient,
            doctor: this.model.data.currentDoctor,
            medications: this.model.data.selectedMedications,
            dosageSchemes: this.model.data.dosageSchemes,
            printDate: new Date().toISOString(),
        });
        const planName = `Medikationsplan_${this.model.data.currentPatient.lastname}.pdf`.replace(/\s+/g, '_');
        this.generatedPDFs.push({ name: planName, bytes: planBytes, isMedicationPlan: true });

        this.view.displayGeneratedPDFs(this.generatedPDFs);
    }
    
    _downloadBytes(bytes, fileName) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    downloadPDF(index) {
        const pdfInfo = this.generatedPDFs[index];
        if (pdfInfo) this._downloadBytes(pdfInfo.bytes, pdfInfo.name);
    }
    
    downloadAllPDFs() {
        if (this.generatedPDFs.length === 0) {
            alert('Bitte erst PDFs generieren!');
            return;
        }
        this.generatedPDFs.forEach((pdfInfo) => this._downloadBytes(pdfInfo.bytes, pdfInfo.name));
        alert(`${this.generatedPDFs.length} PDFs wurden heruntergeladen!`);
    }
    
    exportData() {
        // Delegiert an die zentrale Export-Logik der App (obfuskierte .btmdat-Datei).
        if (window.app && typeof window.app.exportData === 'function') {
            window.app.exportData();
        }
    }
    
    validateData() {
        return this.model.data.currentPatient &&
               this.model.data.currentDoctor &&
               this.model.data.selectedMedications.length > 0 &&
               this.model.data.travelData;
    }
}

export { PDFController };
