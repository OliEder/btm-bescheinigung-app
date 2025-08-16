====================================
BTM-REISEBESCHEINIGUNG PWA - MVC STRUKTUR
====================================

Dateistruktur:
/btm-app/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js (Hauptinitialisierung)
│   ├── config.js (Konfiguration)
│   ├── models/
│   │   ├── Patient.js
│   │   ├── Doctor.js
│   │   ├── Medication.js
│   │   └── DataStore.js
│   ├── views/
│   │   ├── PatientView.js
│   │   ├── DoctorView.js
│   │   ├── MedicationView.js
│   │   ├── TravelView.js
│   │   ├── CertificateView.js
│   │   └── DataManagementView.js
│   ├── controllers/
│   │   ├── PatientController.js
│   │   ├── DoctorController.js
│   │   ├── MedicationController.js
│   │   ├── TravelController.js
│   │   ├── PDFController.js
│   │   └── DataController.js
│   └── utils/
│       ├── PDFGenerator.js
│       ├── Validator.js
│       └── DateHelper.js
└── assets/
    └── logo.svg (optional)

====================================