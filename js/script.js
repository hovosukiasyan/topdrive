// Main page functionality for test selection
class TestSelectionApp {
    constructor() {
        this.tests = [];
        this.filteredTests = [];
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadTests();
            this.setupEventListeners();
            this.renderTests();
            this.updateStats();
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Չհաջողվեց բեռնել թեստերը: Խնդրում ենք նորից փորձել:');
        }
    }

    async loadTests() {
        try {
            this.tests = await Utils.DataLoader.loadAllTests();
            this.filteredTests = [...this.tests];
        } catch (error) {
            throw new Error('Failed to load tests: ' + error.message);
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchTests');
        if (searchInput) {
            searchInput.addEventListener('input', 
                Utils.PerformanceUtils.debounce((e) => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.filterTests();
                }, 300)
            );
        }

        // Responsive navigation
        this.setupMobileNavigation();
        
        // Handle window resize
        window.addEventListener('resize', 
            Utils.PerformanceUtils.throttle(() => {
                this.handleResize();
            }, 100)
        );
    }

    setupMobileNavigation() {
        // Add mobile-specific event listeners
        if (Utils.DeviceUtils.isTouchDevice()) {
            // Enable swipe gestures for better mobile experience
            let startY = 0;
            let startX = 0;

            document.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                // Prevent default scrolling behavior if needed
            }, { passive: true });
        }
    }

    filterTests() {
        let filtered = [...this.tests];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(test => 
                test.title.toLowerCase().includes(this.searchTerm) ||
                test.test_number.toString().includes(this.searchTerm)
            );
        }

        this.filteredTests = filtered;
        this.renderTests();
    }

    renderTests() {
        const testsGrid = document.getElementById('testsGrid');
        if (!testsGrid) return;

        Utils.DOMUtils.removeAllChildren(testsGrid);

        if (this.filteredTests.length === 0) {
            this.renderEmptyState(testsGrid);
            return;
        }

        this.filteredTests.forEach((test, index) => {
            const testCard = this.createTestCard(test);
            testCard.classList.add('stagger-item');
            testCard.style.setProperty('--stagger-delay', `${index * 0.1}s`);
            testsGrid.appendChild(testCard);
        });

        // Trigger stagger animation
        setTimeout(() => {
            const cards = testsGrid.querySelectorAll('.test-card');
            cards.forEach(card => card.classList.add('animate-slideInUp'));
        }, 100);
    }

    createTestCard(test) {
        const card = Utils.DOMUtils.createElement('div', 
            'test-card',
            `
                <div class="test-card-header">
                    <h3 class="test-title">${test.title}</h3>
                    <div class="test-meta">
                        <span>20 հարց</span>
                        <span>${test.duration} րոպե</span>
                    </div>
                </div>
                <div class="test-card-body">
                    <div class="test-stats">
                        <div class="stat">
                            <span class="stat-value">${test.max_wrong_answers}</span>
                            <span class="stat-text">Մաքս. սխալ</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">20</span>
                            <span class="stat-text">Հարցեր</span>
                        </div>
                    </div>
                </div>
                <div class="test-card-footer">
                    <button class="start-test-btn" data-test-number="${test.test_number}">
                        Սկսել թեստը
                    </button>
                </div>
            `
        );

        // Add click handler for the entire card
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('start-test-btn')) {
                this.startTest(test.test_number);
            }
        });

        // Add click handler for the button
        const startBtn = card.querySelector('.start-test-btn');
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startTest(test.test_number);
        });

        // Add hover effects for desktop
        if (!Utils.DeviceUtils.isTouchDevice()) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        }

        return card;
    }

    renderEmptyState(container) {
        const emptyState = Utils.DOMUtils.createElement('div', 'empty-state', `
            <div class="empty-state-content">
                <div class="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <h3>Թեստեր չգտնվեցին</h3>
                <p>Փորձեք փոխել որոնման պարամետրերը:</p>
                <button class="btn btn-primary" onclick="this.clearFilters()">
                    Մաքրել որոնումը
                </button>
            </div>
        `);
        
        container.appendChild(emptyState);
    }

    startTest(testNumber) {
        console.log("TestSelectionApp.startTest called with:", testNumber, typeof testNumber); // <-- Add this
        if (!Utils.ValidationUtils.isValidTestNumber(testNumber)) {
            console.warn("Test number failed validation:", testNumber); // <-- Add this
            Utils.NotificationUtils.error('Անվավեր թեստի համար');
            return;
        }

        // Save test number for the quiz page (temporary, only for current session)
        sessionStorage.setItem('currentTestNumber', testNumber);
        console.log("Test number saved to sessionStorage:", testNumber); // <-- Add this

        // Navigate to quiz page
        console.log("Navigating to quiz.html"); // <-- Add this
        window.location.href = 'quiz.html';
    }

    updateStats() {
        const totalTestsEl = document.getElementById('totalTests');
        
        if (totalTestsEl) {
            totalTestsEl.textContent = this.tests.length;
        }

        // Remove completed tests counter
        const completedTestsEl = document.getElementById('completedTests');
        if (completedTestsEl) {
            completedTestsEl.style.display = 'none';
        }
    }

    clearFilters() {
        this.searchTerm = '';
        
        // Reset UI
        const searchInput = document.getElementById('searchTests');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.filterTests();
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'flex';
        }
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            Utils.AnimationUtils.fadeOut(spinner);
        }
    }

    showError(message) {
        this.hideLoading();
        Utils.NotificationUtils.error(message, 5000);
        
        const testsGrid = document.getElementById('testsGrid');
        if (testsGrid) {
            testsGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-state-content">
                        <div class="error-state-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h3>Սխալ</h3>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            Նորից փորձել
                        </button>
                    </div>
                </div>
            `;
        }
    }

    handleResize() {
        // Handle responsive layout changes
        const deviceType = Utils.DeviceUtils.getDeviceType();
        document.body.classList.remove('mobile', 'tablet', 'desktop');
        document.body.classList.add(deviceType);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing data when loading home page
    sessionStorage.clear();
    
    window.testSelectionApp = new TestSelectionApp();
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.testSelectionApp = new TestSelectionApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.testSelectionApp) {
        // Refresh completed tests when returning to page
        window.testSelectionApp.completedTests = Utils.Storage.get('completedTests', []);
        window.testSelectionApp.updateStats();
        window.testSelectionApp.renderTests();
    }
});