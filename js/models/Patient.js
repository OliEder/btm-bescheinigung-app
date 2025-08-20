class Patient {
    constructor(data = {}) {
        this.id = data.id || null;
        this.lastname = data.lastname || '';
        this.firstname = data.firstname || '';
        this.passport = data.passport || '';
        this.birthplace = data.birthplace || '';
        this.birthdate = data.birthdate || '';
        this.nationality = data.nationality || 'Deutsch';
        this.gender = data.gender || '';
        this.street = data.street || '';
        this.zip = data.zip || '';
        this.city = data.city || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    
    // Getters
    get fullName() {
        return `${this.firstname} ${this.lastname}`;
    }
    
    get fullAddress() {
        return `${this.street}, ${this.zip} ${this.city}`;
    }
    
    get age() {
        if (!this.birthdate) return null;
        const today = new Date();
        const birth = new Date(this.birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    get formattedBirthdate() {
        if (!this.birthdate) return '';
        return new Date(this.birthdate).toLocaleDateString('de-DE');
    }
    
    // Validation
    validate() {
        const errors = [];
        
        if (!this.lastname || this.lastname.length < 2) {
            errors.push('Nachname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!this.firstname || this.firstname.length < 2) {
            errors.push('Vorname muss mindestens 2 Zeichen lang sein');
        }
        
        if (!this.passport || !/^[A-Z0-9]{6,15}$/i.test(this.passport)) {
            errors.push('Ungültige Pass-/Ausweisnummer (6-15 alphanumerische Zeichen)');
        }
        
        if (!this.birthplace) {
            errors.push('Geburtsort ist erforderlich');
        }
        
        if (!this.birthdate) {
            errors.push('Geburtsdatum ist erforderlich');
        } else if (new Date(this.birthdate) > new Date()) {
            errors.push('Geburtsdatum kann nicht in der Zukunft liegen');
        }
        
        if (!this.nationality) {
            errors.push('Staatsangehörigkeit ist erforderlich');
        }
        
        if (!this.gender) {
            errors.push('Geschlecht ist erforderlich');
        }
        
        if (!this.street) {
            errors.push('Straße und Hausnummer sind erforderlich');
        }
        
        if (!this.zip || !/^\d{5}$/.test(this.zip)) {
            errors.push('Ungültige Postleitzahl (5 Ziffern erforderlich)');
        }
        
        if (!this.city) {
            errors.push('Stadt ist erforderlich');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Update method
    update(data) {
        Object.keys(data).forEach(key => {
            if (this.hasOwnProperty(key) && key !== 'id' && key !== 'createdAt') {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Clone method
    clone() {
        return new Patient(this.toJSON());
    }
    
    // Serialization
    toJSON() {
        return {
            id: this.id,
            lastname: this.lastname,
            firstname: this.firstname,
            passport: this.passport,
            birthplace: this.birthplace,
            birthdate: this.birthdate,
            nationality: this.nationality,
            gender: this.gender,
            street: this.street,
            zip: this.zip,
            city: this.city,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    // Static factory method
    static fromJSON(json) {
        return new Patient(json);
    }
    
    // Check if two patients are the same person
    isSamePerson(otherPatient) {
        return this.firstname === otherPatient.firstname &&
               this.lastname === otherPatient.lastname &&
               this.birthdate === otherPatient.birthdate;
    }
    
    // Format for display
    getDisplayInfo() {
        return {
            name: this.fullName,
            birthdate: this.formattedBirthdate,
            age: this.age ? `${this.age} Jahre` : 'Unbekannt',
            address: this.fullAddress,
            passport: this.passport,
            gender: this.gender,
            nationality: this.nationality
        };
    }
    
    // Format for certificate
    getCertificateData() {
        return {
            name: this.lastname,
            vorname: this.firstname,
            ausweis: this.passport,
            geburtsort: this.birthplace,
            geburtsdatum: this.formattedBirthdate,
            staatsangehoerigkeit: this.nationality,
            geschlecht: this.gender,
            wohnanschrift: this.fullAddress
        };
    }
}

// Export for module systems (if using)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Patient;
}