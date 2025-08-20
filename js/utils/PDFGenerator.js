class PDFGenerator {
    constructor() {
        this.jsPDF = window.jspdf?.jsPDF;
    }
    
    createCertificatePDF(medication, patient, doctor, travelData, dosageSchemes) {
        const pdf = new this.jsPDF('p', 'mm', 'a4');
        
        // Calculate dosage information
        const schemes = dosageSchemes.length > 0 ? dosageSchemes : [{
            startDate: travelData.start,
            endDate: travelData.end,
            morning: 0,
            noon: 0,
            evening: 0,
            night: 0
        }];
        
        let totalAmount = 0;
        let dosageInstructions = [];
        
        schemes.forEach(scheme => {
            const startDate = new Date(scheme.startDate);
            const endDate = new Date(scheme.endDate);
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const dailyDose = scheme.morning + scheme.noon + scheme.evening + scheme.night;
            totalAmount += dailyDose * days;
            
            const notation = `${scheme.morning}-${scheme.noon}-${scheme.evening}${scheme.night > 0 ? '-' + scheme.night : ''}`;
            dosageInstructions.push(`${startDate.toLocaleDateString('de-DE')}-${endDate.toLocaleDateString('de-DE')}: ${notation}`);
        });
        
        const concentrationValue = parseFloat(medication.concentration);
        const totalSubstance = totalAmount * concentrationValue;
        
        // Page 1: Certificate
        this.drawCertificatePage(pdf, patient, doctor, medication, travelData, dosageInstructions, totalAmount, totalSubstance);
        
        // Page 2: International Legend
        pdf.addPage();
        this.drawLegendPage(pdf);
        
        return pdf;
    }
    
    drawCertificatePage(pdf, patient, doctor, medication, travelData, dosageInstructions, totalAmount, totalSubstance) {
        // Header
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Bescheinigung für das Mitführen von Betäubungsmitteln', 105, 20, { align: 'center' });
        pdf.text('im Rahmen einer ärztlichen Behandlung', 105, 26, { align: 'center' });
        pdf.text('- Artikel 75 des Schengener Durchführungsabkommens -', 105, 32, { align: 'center' });
        
        let y = 45;
        
        // Section A - Doctor
        pdf.setFontSize(10);
        pdf.rect(10, y, 190, 45);
        pdf.setFont(undefined, 'bold');
        pdf.text('A - Verschreibender Arzt:', 12, y + 5);
        pdf.setFont(undefined, 'normal');
        
        pdf.text('(1) Name, Vorname, Telefon:', 12, y + 12);
        pdf.text(`${doctor.title} ${doctor.lastname}, ${doctor.firstname}, ${doctor.phone}`, 70, y + 12);
        
        pdf.text('(2) Anschrift:', 12, y + 19);
        pdf.text(doctor.address, 70, y + 19);
        
        pdf.text('(3) Stempel des Arztes:', 12, y + 30);
        pdf.rect(70, y + 25, 40, 15);
        pdf.text('Datum:', 115, y + 30);
        pdf.rect(130, y + 25, 30, 15);
        pdf.text('Unterschrift:', 165, y + 30);
        pdf.rect(165, y + 25, 30, 15);
        
        y += 50;
        
        // Section B - Patient
        pdf.rect(10, y, 190, 65);
        pdf.setFont(undefined, 'bold');
        pdf.text('B - Patient:', 12, y + 5);
        pdf.setFont(undefined, 'normal');
        
        pdf.text('(4) Name, (5) Vorname:', 12, y + 12);
        pdf.text(`${patient.lastname}, ${patient.firstname}`, 70, y + 12);
        
        pdf.text('(5) Nr. des Passes/Ausweises:', 12, y + 19);
        pdf.text(patient.passport, 70, y + 19);
        
        pdf.text('(6) Geburtsort:', 12, y + 26);
        pdf.text(patient.birthplace, 70, y + 26);
        
        pdf.text('(7) Geburtsdatum:', 115, y + 26);
        pdf.text(new Date(patient.birthdate).toLocaleDateString('de-DE'), 150, y + 26);
        
        pdf.text('(8) Staatsangehörigkeit:', 12, y + 33);
        pdf.text(patient.nationality, 70, y + 33);
        
        pdf.text('(9) Geschlecht:', 115, y + 33);
        pdf.text(patient.gender, 150, y + 33);
        
        pdf.text('(10) Wohnanschrift:', 12, y + 40);
        const address = `${patient.street}, ${patient.zip} ${patient.city}`;
        const splitAddress = pdf.splitTextToSize(address, 120);
        pdf.text(splitAddress, 70, y + 40);
        
        pdf.text('(11) Dauer der Reise in Tagen:', 12, y + 47);
        pdf.text(travelData.duration.toString(), 70, y + 47);
        
        pdf.text('(12) Gültigkeitsdauer:', 12, y + 54);
        pdf.text(`${new Date(travelData.start).toLocaleDateString('de-DE')} - ${new Date(travelData.end).toLocaleDateString('de-DE')}`, 70, y + 54);
        
        y += 70;
        
        // Section C - Medication
        pdf.rect(10, y, 190, 70);
        pdf.setFont(undefined, 'bold');
        pdf.text('C - Verschriebenes Arzneimittel:', 12, y + 5);
        pdf.setFont(undefined, 'normal');
        
        pdf.text('(13) Handelsbezeichnung:', 12, y + 12);
        pdf.text(medication.name, 70, y + 12);
        
        pdf.text('(14) Darreichungsform:', 12, y + 19);
        pdf.text(medication.form, 70, y + 19);
        
        pdf.text('(15) Internationale Bezeichnung:', 12, y + 26);
        pdf.text(medication.substance, 70, y + 26);
        
        pdf.text('(16) Wirkstoff-Konzentration:', 12, y + 33);
        pdf.text(medication.concentration, 70, y + 33);
        
        pdf.text('(17) Gebrauchsanweisung:', 12, y + 40);
        const instructionText = dosageInstructions.join('; ');
        const splitInstructions = pdf.splitTextToSize(instructionText, 120);
        pdf.text(splitInstructions, 70, y + 40);
        
        pdf.text('(18) Gesamtwirkstoffmenge:', 12, y + 47);
        pdf.text(`${totalSubstance} mg`, 70, y + 47);
        
        pdf.text('(19) Reichdauer:', 12, y + 54);
        pdf.text(`${travelData.duration} Tage`, 70, y + 54);
        
        pdf.text('(20) Anmerkungen:', 12, y + 61);
        pdf.text(`Gesamtmenge: ${totalAmount} ${medication.form}`, 70, y + 61);
        
        y += 75;
        
        // Section D - Authority
        if (y + 45 > 297) {
            pdf.addPage();
            y = 20;
        }
        
        pdf.rect(10, y, 190, 45);
        pdf.setFont(undefined, 'bold');
        pdf.text('D - Für die Beglaubigung zuständige Behörde:', 12, y + 5);
        pdf.setFont(undefined, 'normal');
        
        pdf.text('(21) Bezeichnung:', 12, y + 12);
        pdf.line(50, y + 12, 195, y + 12);
        
        pdf.text('(22) Anschrift, Telefon:', 12, y + 19);
        pdf.line(50, y + 19, 195, y + 19);
        
        pdf.text('(23) Stempel der Behörde:', 12, y + 30);
        pdf.rect(70, y + 25, 40, 15);
        pdf.text('Datum:', 115, y + 30);
        pdf.rect(130, y + 25, 30, 15);
        pdf.text('Unterschrift:', 165, y + 30);
        pdf.rect(165, y + 25, 30, 15);
    }
    
    drawLegendPage(pdf) {
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('International Legend / Légende Internationale', 105, 20, { align: 'center' });
        
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        
        // English column
        let legendY = 35;
        pdf.setFont(undefined, 'bold');
        pdf.text('English:', 20, legendY);
        pdf.setFont(undefined, 'normal');
        legendY += 7;
        
        const englishLegend = [
            'A - Prescribing doctor',
            '(1) name, first name, phone',
            '(2) address',
            '(3) stamp, date, signature of doctor',
            '',
            'B - Patient',
            '(4) name, first name',
            '(5) no. of passport or ID',
            '(6) place of birth',
            '(7) date of birth',
            '(8) nationality',
            '(9) sex',
            '(10) address',
            '(11) duration of travel in days',
            '(12) validity from/to - max. 30 days',
            '',
            'C - Prescribed drug',
            '(13) trade name',
            '(14) dosage form',
            '(15) international name of substance',
            '(16) concentration',
            '(17) instructions for use',
            '(18) total quantity of substance',
            '(19) duration - max. 30 days',
            '(20) remarks',
            '',
            'D - Accrediting authority',
            '(21) designation',
            '(22) address, phone',
            '(23) stamp, date, signature'
        ];
        
        englishLegend.forEach(line => {
            if (line === '') {
                legendY += 3;
            } else {
                pdf.text(line, 20, legendY);
                legendY += 5;
            }
        });
        
        // French column
        legendY = 35;
        pdf.setFont(undefined, 'bold');
        pdf.text('Français:', 110, legendY);
        pdf.setFont(undefined, 'normal');
        legendY += 7;
        
        const frenchLegend = [
            'A - Médecin prescripteur',
            '(1) nom, prénom, téléphone',
            '(2) adresse',
            '(3) cachet, date, signature',
            '',
            'B - Patient',
            '(4) nom, prénom',
            '(5) n° du passeport ou document',
            '(6) lieu de naissance',
            '(7) date de naissance',
            '(8) nationalité',
            '(9) sexe',
            '(10) adresse',
            '(11) durée du voyage en jours',
            '(12) validité du/au - max. 30 jours',
            '',
            'C - Médicament prescrit',
            '(13) nom commercial',
            '(14) forme pharmaceutique',
            '(15) dénomination internationale',
            '(16) concentration',
            '(17) mode d\'emploi',
            '(18) quantité totale',
            '(19) durée - max. 30 jours',
            '(20) remarques',
            '',
            'D - Autorité qui authentifie',
            '(21) désignation',
            '(22) adresse, téléphone',
            '(23) sceau, date, signature'
        ];
        
        frenchLegend.forEach(line => {
            if (line === '') {
                legendY += 3;
            } else {
                pdf.text(line, 110, legendY);
                legendY += 5;
            }
        });
    }
    
    createMedicationPlanPDF(patient, doctor, medications, travelData, dosageSchemes) {
        const pdf = new this.jsPDF('l', 'mm', 'a4'); // Landscape
        
        // Header
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Medikationsplan für BTM-Reise', 148, 20, { align: 'center' });
        
        // Patient and Doctor info
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        // Patient info box
        pdf.rect(10, 30, 135, 30);
        pdf.setFont(undefined, 'bold');
        pdf.text('Patient:', 12, 36);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${patient.firstname} ${patient.lastname}`, 12, 42);
        pdf.text(`Geb.: ${new Date(patient.birthdate).toLocaleDateString('de-DE')}`, 12, 48);
        pdf.text(`${patient.street}, ${patient.zip} ${patient.city}`, 12, 54);
        
        // Doctor info box
        pdf.rect(152, 30, 135, 30);
        pdf.setFont(undefined, 'bold');
        pdf.text('Verschreibender Arzt:', 154, 36);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${doctor.title} ${doctor.firstname} ${doctor.lastname}`, 154, 42);
        pdf.text(`Tel: ${doctor.phone}`, 154, 48);
        const doctorAddress = pdf.splitTextToSize(doctor.address, 130);
        pdf.text(doctorAddress, 154, 54);
        
        // Travel info
        pdf.setFont(undefined, 'bold');
        pdf.text('Reisezeitraum:', 12, 68);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${new Date(travelData.start).toLocaleDateString('de-DE')} - ${new Date(travelData.end).toLocaleDateString('de-DE')} (${travelData.duration} Tage)`, 45, 68);
        
        // Medication table
        let y = 80;
        
        // Table header
        pdf.setFillColor(102, 126, 234);
        pdf.rect(10, y, 277, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, 'bold');
        pdf.text('Zeitraum', 12, y + 5);
        pdf.text('Arzneimittel', 60, y + 5);
        pdf.text('Einnahmeanweisung', 140, y + 5);
        pdf.text('Tagesdosis', 200, y + 5);
        pdf.text('Gesamtmenge', 240, y + 5);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        y += 10;
        
        let totalsByMedication = {};
        
        // Table content
        medications.forEach(med => {
            const schemes = dosageSchemes[med.id] || [{
                startDate: travelData.start,
                endDate: travelData.end,
                morning: 0,
                noon: 0,
                evening: 0,
                night: 0
            }];
            
            schemes.forEach(scheme => {
                const startDate = new Date(scheme.startDate);
                const endDate = new Date(scheme.endDate);
                const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const dailyDose = scheme.morning + scheme.noon + scheme.evening + scheme.night;
                const totalAmount = dailyDose * days;
                
                const dosageNotation = `${scheme.morning}-${scheme.noon}-${scheme.evening}${scheme.night > 0 ? '-' + scheme.night : ''}`;
                
                // Draw row
                pdf.rect(10, y - 2, 277, 8);
                pdf.text(`${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`, 12, y + 2);
                pdf.text(`${med.name} ${med.concentration}`, 60, y + 2);
                pdf.text(dosageNotation, 140, y + 2);
                pdf.text(`${dailyDose} ${med.form}/Tag`, 200, y + 2);
                pdf.text(`${totalAmount} ${med.form}`, 240, y + 2);
                
                y += 8;
                
                const key = `${med.name} ${med.concentration}`;
                totalsByMedication[key] = (totalsByMedication[key] || 0) + totalAmount;
                
                // Add new page if needed
                if (y > 180) {
                    pdf.addPage();
                    y = 20;
                }
            });
        });
        
        // Summary
        y += 10;
        pdf.setFont(undefined, 'bold');
        pdf.text('Packhilfe - Gesamtmengen:', 12, y);
        pdf.setFont(undefined, 'normal');
        y += 8;
        
        for (const [med, total] of Object.entries(totalsByMedication)) {
            pdf.text(`• ${med}: ${total} Stück`, 15, y);
            y += 6;
        }
        
        // Footer
        y = 190;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'italic');
        pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`, 12, y);
        pdf.text('Dieser Medikationsplan ist Teil der BTM-Reisebescheinigung nach Artikel 75 des Schengener Abkommens', 12, y + 5);
        
        return pdf;
    }
}