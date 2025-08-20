// Main Application Class (erweitert)
class BTMApp {
    constructor() {
        this.model = new DataStore();
        this.controllers = {};
        this.views = {};
        this.currentTab = 'patient';
        
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.initializeViews();
        this.initializeControllers();
        this.showTab('patient');
        
        // Global event listeners
        this.setupGlobalListeners();
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
        this.controllers.medication = new MedicationController(this.model, this.views.medication);
        this.controllers.travel = new TravelController(this.model, this.views.travel);
        this.controllers.pdf = new PDFController(this.model, this.views.certificates);
        this.controllers.data = new DataController(this.model, this.views.data);
    }
    
    showTab(tabId) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update content
        const mainContent = document.getElementById('main-content');
        
        // Clear current content
        mainContent.innerHTML = '';
        
        // Render new view
        switch(tabId) {
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
        // Model change listener
        this.model.subscribe((data) => {
            console.log('Data updated:', data);
        });
        
        // File import handler
        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.controllers.data) {
                this.controllers.data.handleImport(file);
            }
            e.target.value = ''; // Reset file input
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BTMApp();
});