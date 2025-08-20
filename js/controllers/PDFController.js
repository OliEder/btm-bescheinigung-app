class PDFController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.generatedPDFs = [];
        this.pdfGenerator = new PDFGenerator();
    }
    
    init() {
        this.view.bindEvents(this);
    }
    
    generatePDFs() {
        // Validate data
        if (!this.validateData()) {
            this.view.showError('Bitte füllen Sie alle erforderlichen Daten aus!');
            return;
        }
        
        this.generatedPDFs = [];
        
        // Generate one PDF per medication
        this.model.data.selectedMedications.forEach(med => {
            const pdfName = `BTM-Bescheinigung_${med.name}_${med.concentration}.pdf`.replace(/\s+/g, '_');
            const pdf = this.pdfGenerator.createCertificatePDF(
                med,
                this.model.data.currentPatient,
                this.model.data.currentDoctor,
                this.model.data.travelData,
                this.model.data.dosageSchemes[med.id] || []
            );
            
            this.generatedPDFs.push({
                name: pdfName,
                pdf: pdf,
                medication: med
            });
        });
        
        // Generate medication plan PDF
        const planName = `Medikationsplan_${this.model.data.currentPatient.lastname}.pdf`.replace(/\s+/g, '_');
        const planPDF = this.pdfGenerator.createMedicationPlanPDF(
            this.model.data.currentPatient,
            this.model.data.currentDoctor,
            this.model.data.selectedMedications,
            this.model.data.travelData,
            this.model.data.dosageSchemes
        );
        
        this.generatedPDFs.push({
            name: planName,
            pdf: planPDF,
            isMedicationPlan: true
        });
        
        this.view.displayGeneratedPDFs(this.generatedPDFs);
    }
    
    downloadPDF(index) {
        if (this.generatedPDFs[index]) {
            const pdfInfo = this.generatedPDFs[index];
            pdfInfo.pdf.save(pdfInfo.name);
        }
    }
    
    downloadAllPDFs() {
        if (this.generatedPDFs.length === 0) {
            alert('Bitte erst PDFs generieren!');
            return;
        }
        
        this.generatedPDFs.forEach(pdfInfo => {
            pdfInfo.pdf.save(pdfInfo.name);
        });
        
        alert(`${this.generatedPDFs.length} PDFs wurden heruntergeladen!`);
    }
    
    exportData() {
        const dataToExport = {
            patient: this.model.data.currentPatient,
            doctor: this.model.data.currentDoctor,
            medications: this.model.data.selectedMedications,
            travelData: this.model.data.travelData,
            dosageSchemes: this.model.data.dosageSchemes
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `btm-reise-${Date.now()}.json`;
        link.click();
    }
    
    validateData() {
        return this.model.data.currentPatient && 
               this.model.data.currentDoctor && 
               this.model.data.selectedMedications.length > 0 && 
               this.model.data.travelData;
    }
}