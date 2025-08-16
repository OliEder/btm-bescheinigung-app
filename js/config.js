const AppConfig = {
    version: '1.0.0',
    appName: 'BTM-Reisebescheinigung Generator',
    
    // Maximum travel duration (days)
    maxTravelDuration: 30,
    
    // Navigation tabs
    tabs: [
        { id: 'patient', label: '👤 Patient', view: 'PatientView' },
        { id: 'doctor', label: '⚕️ Arzt', view: 'DoctorView' },
        { id: 'medication', label: '💊 Medikamente', view: 'MedicationView' },
        { id: 'travel', label: '✈️ Reisedaten', view: 'TravelView' },
        { id: 'certificates', label: '📄 Formulare', view: 'CertificateView' },
        { id: 'data', label: '💾 Gespeicherte Daten', view: 'DataManagementView' }
    ],
    
    // Medication database
    medications: [
        // Methylphenidate
        { name: "Ritalin", form: "Tablette", substance: "Methylphenidat", concentrations: ["5mg", "10mg", "20mg"] },
        { name: "Ritalin Adult", form: "Kapsel", substance: "Methylphenidat", concentrations: ["10mg", "20mg", "30mg", "40mg", "60mg"] },
        { name: "Ritalin LA", form: "Retardkapsel", substance: "Methylphenidat", concentrations: ["10mg", "20mg", "30mg", "40mg"] },
        { name: "Medikinet", form: "Tablette", substance: "Methylphenidat", concentrations: ["5mg", "10mg", "20mg"] },
        { name: "Medikinet adult", form: "Retardkapsel", substance: "Methylphenidat", concentrations: ["5mg", "10mg", "20mg", "30mg", "40mg", "50mg", "60mg"] },
        { name: "Concerta", form: "Retardtablette", substance: "Methylphenidat", concentrations: ["18mg", "27mg", "36mg", "54mg"] },
        { name: "Equasym", form: "Tablette", substance: "Methylphenidat", concentrations: ["5mg", "10mg", "20mg"] },
        { name: "Equasym Retard", form: "Retardkapsel", substance: "Methylphenidat", concentrations: ["10mg", "20mg", "30mg"] },
        { name: "Kinecteen", form: "Retardtablette", substance: "Methylphenidat", concentrations: ["18mg", "27mg", "36mg", "54mg"] },
        // Lisdexamfetamine
        { name: "Elvanse", form: "Kapsel", substance: "Lisdexamfetamin", concentrations: ["20mg", "30mg", "40mg", "50mg", "60mg", "70mg"] },
        { name: "Elvanse Adult", form: "Kapsel", substance: "Lisdexamfetamin", concentrations: ["30mg", "50mg", "70mg"] },
        // Dexamfetamine
        { name: "Attentin", form: "Tablette", substance: "Dexamfetamin", concentrations: ["5mg", "10mg", "20mg"] },
        // Others
        { name: "Strattera", form: "Kapsel", substance: "Atomoxetin", concentrations: ["10mg", "18mg", "25mg", "40mg", "60mg", "80mg", "100mg"] },
        { name: "Intuniv", form: "Retardtablette", substance: "Guanfacin", concentrations: ["1mg", "2mg", "3mg", "4mg"] }
    ],
    
    // Mock doctors for demo
    mockDoctors: [
        { title: "Dr. med.", lastname: "Schmidt", firstname: "Thomas", phone: "0911/123456", address: "Hauptstraße 15, 90518 Altdorf bei Nürnberg" },
        { title: "Dr. med.", lastname: "Müller", firstname: "Sarah", phone: "0911/234567", address: "Bahnhofstraße 8, 92353 Postbauer-Heng" },
        { title: "Dr. med.", lastname: "Weber", firstname: "Michael", phone: "0911/345678", address: "Marktplatz 3, 90518 Altdorf bei Nürnberg" }
    ]
};