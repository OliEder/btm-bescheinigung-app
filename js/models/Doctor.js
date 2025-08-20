class Doctor {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || 'Dr. med.';
        this.lastname = data.lastname || '';
        this.firstname = data.firstname || '';
        this.phone = data.phone || '';
        this.fax = data.fax || '';
        this.email = data.email || '';
        this.address = data.address || '';
        this.specialty = data.specialty || 'Allgemeinmedizin';
        this.registrationNumber = data.registrationNumber || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    
    // Getters
    get fullName() {
        return `${this.title} ${this.firstname} ${this.lastname}`;
    }
    
    get shortName() {
        return `${this.title} ${this.lastname}`;
    }
    
    get contactInfo() {
        const info = [];
        if (this.phone) info.push(`Tel: ${this.phone}`);
        if (this.fax) info.push(`Fax: ${this.fax}`);
        if (this.email) info.push(`Email: ${this.email}`);
        return info.join(' | ');
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
        
        if (!this.phone) {
            errors.push('Telefonnummer ist erforderlich');
        } else if (!/^[\d\s\-\+\(\)\/]+$/.test(this.phone)) {
            errors.push('Ungültige Telefonnummer');
        }
        
        if (!this.address || this.address.length < 10) {
            errors.push('Vollständige Praxisadresse ist erforderlich');
        }
        
        if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            errors.push('Ungültige E-Mail-Adresse');
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
        return new Doctor(this.toJSON());
    }
    
    // Serialization
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            lastname: this.lastname,
            firstname: this.firstname,
            phone: this.phone,
            fax: this.fax,
            email: this.email,
            address: this.address,
            specialty: this.specialty,
            registrationNumber: this.registrationNumber,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    // Static factory method
    static fromJSON(json) {
        return new Doctor(json);
    }
    
    // Check if two doctors are the same
    isSameDoctor(otherDoctor) {
        return this.firstname === otherDoctor.firstname &&
               this.lastname === otherDoctor.lastname &&
               this.registrationNumber === otherDoctor.registrationNumber;
    }
    
    // Format for display
    getDisplayInfo() {
        return {
            name: this.fullName,
            specialty: this.specialty,
            phone: this.phone,
            email: this.email || 'Nicht angegeben',
            address: this.address,
            registration: this.registrationNumber || 'Nicht angegeben'
        };
    }
    
    // Format for certificate
    getCertificateData() {
        return {
            name: `${this.title} ${this.lastname}`,
            vorname: this.firstname,
            telefon: this.phone,
            anschrift: this.address
        };
    }
    
    // Generate mock doctors for testing
    static generateMockDoctors() {
        return [
            new Doctor({
                id: 1,
                title: 'Dr. med.',
                lastname: 'Schmidt',
                firstname: 'Thomas',
                phone: '0911/123456',
                email: 'dr.schmidt@praxis.de',
                address: 'Hauptstraße 15, 90518 Altdorf bei Nürnberg',
                specialty: 'Allgemeinmedizin'
            }),
            new Doctor({
                id: 2,
                title: 'Dr. med.',
                lastname: 'Müller',
                firstname: 'Sarah',
                phone: '0911/234567',
                email: 'dr.mueller@gesundheit.de',
                address: 'Bahnhofstraße 8, 92353 Postbauer-Heng',
                specialty: 'Innere Medizin'
            }),
            new Doctor({
                id: 3,
                title: 'Dr. med.',
                lastname: 'Weber',
                firstname: 'Michael',
                phone: '0911/345678',
                email: 'dr.weber@medizin.de',
                address: 'Marktplatz 3, 90518 Altdorf bei Nürnberg',
                specialty: 'Psychiatrie'
            })
        ];
    }
}

// Export for module systems (if using)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Doctor;
}