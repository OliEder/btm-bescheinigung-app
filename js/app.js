// Main Application Class (ES-Module-Entry)
import '../css/styles.css';
import medicationsData from '../data/medications.json';

import { AppConfig } from './config.js';
import { DataStore } from './models/DataStore.js';
import { MedicationRepository } from './repositories/MedicationRepository.js';
import { obfuscate } from './utils/Obfuscate.js';
import { hasLegacyData, migrateLegacyData } from './services/Migration.js';

import { PatientView } from './views/PatientView.js';
import { DoctorView } from './views/DoctorView.js';
import { MedicationView } from './views/MedicationView.js';
import { TravelView } from './views/TravelView.js';
import { CertificateView } from './views/CertificateView.js';
import { DataManagementView } from './views/DataManagementView.js';

import { PatientController } from './controllers/PatientController.js';
import { DoctorController } from './controllers/DoctorController.js';
import { MedicationController } from './controllers/MedicationController.js';
import { TravelController } from './controllers/TravelController.js';
import { PDFController } from './controllers/PDFController.js';
import { DataController } from './controllers/DataController.js';

class BTMApp {
    constructor() {
        this.model = new DataStore();
        this.medicationRepository = new MedicationRepository(medicationsData);
        this.controllers = {};
        this.views = {};
        this.currentTab = 'patient';
        this.hasUnsavedChanges = false;

        this.init();
    }

    init() {
        this.setupNavigation();
        this.initializeViews();
        this.initializeControllers();
        this.setupGlobalListeners();

        // Persistenz-Einstieg: Migration > laufende Session > Start-Screen.
        if (hasLegacyData()) {
            this.model.hydrate(migrateLegacyData());
            this.model.save();
            this.hasUnsavedChanges = true;
            this.showTab('patient');
            alert('Alte Daten wurden übernommen. Bitte jetzt über "Daten exportieren" sichern.');
        } else if (this.model.load()) {
            this.showTab('patient');
        } else {
            this.showTab('patient');
        }

        // Warnung bei ungesicherten Änderungen (sessionStorage wird beim Schließen geleert).
        this.model.subscribe(() => { this.hasUnsavedChanges = true; });
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    setupNavigation() {
        const nav = document.getElementById('navigation');
        AppConfig.tabs.forEach(tab => {
            const button = document.createElement('button');
            button.className = 'nav-tab';
            button.dataset.tab = tab.id;
            button.textContent = tab.label;
            button.addEventListener('click', () => this.showTab(tab.id));
            nav.appendChild(button);
        });
    }

    initializeViews() {
        this.views.patient = new PatientView();
        this.views.doctor = new DoctorView();
        this.views.medication = new MedicationView();
        this.views.travel = new TravelView();
        this.views.certificates = new CertificateView();
        this.views.data = new DataManagementView();
    }

    initializeControllers() {
        this.controllers.patient = new PatientController(this.model, this.views.patient);
        this.controllers.doctor = new DoctorController(this.model, this.views.doctor);
        this.controllers.medication = new MedicationController(this.model, this.views.medication, this.medicationRepository);
        this.controllers.travel = new TravelController(this.model, this.views.travel);
        this.controllers.pdf = new PDFController(this.model, this.views.certificates);
        this.controllers.data = new DataController(this.model, this.views.data);
    }

    showTab(tabId) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '';

        switch (tabId) {
            case 'patient':
                mainContent.innerHTML = this.views.patient.render();
                this.controllers.patient.init();
                break;
            case 'doctor':
                mainContent.innerHTML = this.views.doctor.render();
                this.controllers.doctor.init();
                break;
            case 'medication':
                mainContent.innerHTML = this.views.medication.render();
                this.controllers.medication.init();
                break;
            case 'travel':
                mainContent.innerHTML = this.views.travel.render();
                this.controllers.travel.init();
                break;
            case 'certificates':
                mainContent.innerHTML = this.views.certificates.render();
                this.controllers.pdf.init();
                break;
            case 'data':
                mainContent.innerHTML = this.views.data.render();
                this.controllers.data.init();
                break;
            default:
                mainContent.innerHTML = '<div class="tab-content active"><h2>Coming Soon</h2></div>';
        }

        this.currentTab = tabId;
    }

    setupGlobalListeners() {
        // Verstecktes File-Input fuer Import (falls im DOM vorhanden).
        const importInput = document.getElementById('import-file');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && this.controllers.data) {
                    this.controllers.data.handleImport(file);
                }
                e.target.value = '';
            });
        }
    }

    // Zentraler Export: obfuskierte .btmdat-Datei (gleiches Format wie sessionStorage-Cache).
    exportData() {
        const packed = obfuscate(JSON.stringify(this.model.data));
        const blob = new Blob([packed], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'btm-bescheinigung-export.btmdat';
        link.click();
        URL.revokeObjectURL(url);
        this.hasUnsavedChanges = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new BTMApp();
});

export { BTMApp };
