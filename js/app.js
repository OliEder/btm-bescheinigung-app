// Main Application Class
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
        // Initialize other views similarly
        // this.views.doctor = new DoctorView();
        // this.views.medication = new MedicationView();
        // etc.
    }
    
    initializeControllers() {
        this.controllers.patient = new PatientController(this.model, this.views.patient);
        // Initialize other controllers
        // this.controllers.doctor = new DoctorController(this.model, this.views.doctor);
        // etc.
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
            // Add other cases for other tabs
            default:
                mainContent.innerHTML = '<div class="tab-content active"><h2>Coming Soon</h2></div>';
        }
        
        this.currentTab = tabId;
    }
    
    setupGlobalListeners() {
        // Model change listener
        this.model.subscribe((data) => {
            console.log('Data updated:', data);
            // Update UI if needed
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BTMApp();
});