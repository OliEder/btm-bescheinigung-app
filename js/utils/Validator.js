class Validator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        const re = /^[\d\s\-\+\(\)\/]+$/;
        return re.test(phone);
    }
    
    static validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
    
    static validatePostalCode(zip) {
        const re = /^\d{5}$/;
        return re.test(zip);
    }
    
    static validatePassport(passport) {
        // Basic passport validation - alphanumeric
        const re = /^[A-Z0-9]{6,15}$/;
        return re.test(passport.toUpperCase());
    }
    
    static validateConcentration(concentration) {
        const re = /^\d+(\.\d+)?mg$/;
        return re.test(concentration);
    }
    
    static isDateInFuture(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    }
    
    static calculateAge(birthdate) {
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    static validatePatientData(data) {
        const errors = [];
        
        if (!data.lastname || data.lastname.length < 2) {
            errors.push('Nachname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!data.firstname || data.firstname.length < 2) {
            errors.push('Vorname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!this.validatePassport(data.passport)) {
            errors.push('Ungültige Pass-/Ausweisnummer');
        }
        
        if (!this.validateDate(data.birthdate)) {
            errors.push('Ungültiges Geburtsdatum');
        }
        
        if (this.calculateAge(data.birthdate) < 0) {
            errors.push('Geburtsdatum kann nicht in der Zukunft liegen');
        }
        
        if (!this.validatePostalCode(data.zip)) {
            errors.push('Ungültige Postleitzahl (5 Ziffern erforderlich)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateDoctorData(data) {
        const errors = [];
        
        if (!data.lastname || data.lastname.length < 2) {
            errors.push('Nachname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!data.firstname || data.firstname.length < 2) {
            errors.push('Vorname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!this.validatePhone(data.phone)) {
            errors.push('Ungültige Telefonnummer');
        }
        
        if (!data.address || data.address.length < 10) {
            errors.push('Adresse muss mindestens 10 Zeichen lang sein');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateTravelData(data) {
        const errors = [];
        
        if (!this.validateDate(data.start)) {
            errors.push('Ungültiges Abreisedatum');
        }
        
        if (!this.validateDate(data.end)) {
            errors.push('Ungültiges Rückreisedatum');
        }
        
        if (new Date(data.end) < new Date(data.start)) {
            errors.push('Rückreisedatum muss nach Abreisedatum liegen');
        }
        
        const duration = Math.ceil((new Date(data.end) - new Date(data.start)) / (1000 * 60 * 60 * 24)) + 1;
        if (duration > 30) {
            errors.push('Maximale Reisedauer beträgt 30 Tage');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}