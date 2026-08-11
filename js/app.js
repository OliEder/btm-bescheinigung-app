// Main Application Class (ES-Module-Entry)
// Design-Tokens zuerst (definieren nur Custom-Properties), dann der bestehende
// Look. Übergangszustand von TP-A: styles.css bleibt aktiv, die Optik kippt erst
// ab TP-C. styles.css wird in TP-F entfernt.
import '../css/tokens/index.css';
import '../css/components.css';
import '../css/styles.css';
import medicationsData from '../data/medications.json';
import substancesData from '../data/substances.json';

import { DataStore } from './models/DataStore.js';
import { MedicationRepository } from './repositories/MedicationRepository.js';
import { SubstanceRepository } from './repositories/SubstanceRepository.js';
import nationalitiesData from '../data/nationalities.json';
import { NationalityRepository } from './repositories/NationalityRepository.js';
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

import { AppShell } from './ui/AppShell.js';
import { stepStatus } from './ui/StepStatus.js';

const SHELL_STEPS = [
    { id: 'patient', label: 'Patient', icon: 'user' },
    { id: 'doctor', label: 'Arzt', icon: 'stethoscope' },
    { id: 'medication', label: 'Medikamente', icon: 'pill' },
    { id: 'travel', label: 'Reisedaten', icon: 'plane' },
    { id: 'certificates', label: 'Formulare', icon: 'file-text' },
    { id: 'data', label: 'Gespeicherte Daten', icon: 'database', utility: true },
];

class BTMApp {
    constructor() {
        this.model = new DataStore();
        this.substanceRepository = new SubstanceRepository(substancesData);
        this.medicationRepository = new MedicationRepository(medicationsData, this.substanceRepository);
        this.nationalityRepository = new NationalityRepository(nationalitiesData);
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

        // Persistenz-Einstieg: Migration > Start-Screen (Sitzung/Neu/Laden).
        if (hasLegacyData()) {
            this.model.hydrate(migrateLegacyData());
            this.model.save();
            this.hasUnsavedChanges = true;
            this.showTab('patient');
            alert('Alte Daten wurden übernommen. Bitte jetzt über "Daten exportieren" sichern.');
        } else {
            // Fragt: laufende Sitzung fortsetzen (falls vorhanden) / neu / Datei laden.
            this.showStartScreen();
        }

        // Warnung bei ungesicherten Änderungen (sessionStorage wird beim Schließen geleert).
        this.model.subscribe(() => {
            this.hasUnsavedChanges = true;
            if (this.shell) this.shell.setStatus(stepStatus(this.model.data));
        });
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    setupNavigation() {
        this.shell = new AppShell({
            steps: SHELL_STEPS,
            onNavigate: (id) => this.showTab(id),
            onGenerate: () => {},
            onNext: (stepId) => this._saveStep(stepId),
        });
        this.shell.mount(document.getElementById('app'));
    }

    // Speichern-per-Weiter: der Footer ruft dies je Schritt; nur bei {ok:true} navigiert das Shell.
    async _saveStep(stepId) {
        if (stepId === 'patient') return this.controllers.patient.savePatient();
        if (stepId === 'doctor') return this.controllers.doctor.saveDoctor();
        // medication/travel speichern (noch) selbst; PDF-Trigger für travel folgt in TP-E.
        return { ok: true, missing: [] };
    }

    initializeViews() {
        this.views.patient = new PatientView(this.nationalityRepository);
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
        this.shell.hideStart();
        let html = '';
        switch (tabId) {
            case 'patient': html = this.views.patient.render(); break;
            case 'doctor': html = this.views.doctor.render(); break;
            case 'medication': html = this.views.medication.render(); break;
            case 'travel': html = this.views.travel.render(); break;
            case 'certificates': html = this.views.certificates.render(); break;
            case 'data': html = this.views.data.render(); break;
            default: tabId = 'patient'; html = this.views.patient.render();
        }
        this.shell.setContent(html);
        this.shell.setActive(tabId);
        this.shell.setStatus(stepStatus(this.model.data));
        switch (tabId) {
            case 'patient': this.controllers.patient.init(); break;
            case 'doctor': this.controllers.doctor.init(); break;
            case 'medication': this.controllers.medication.init(); break;
            case 'travel': this.controllers.travel.init(); break;
            case 'certificates': this.controllers.pdf.init(); break;
            case 'data': this.controllers.data.init(); break;
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

    // Start-Screen: laufende Sitzung fortsetzen / neu anfangen / Datei laden.
    showStartScreen() {
        this.shell.showStart({
            hasSession: this.model.hasSession(),
            onContinue: () => { this.model.load(); this.showTab('patient'); },
            onImport: () => { this._pendingImportRedirect = true; this.controllers.data.importData(); },
            onNew: () => { this.model.clearAll(); this.hasUnsavedChanges = false; this.showTab('patient'); },
        });
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
