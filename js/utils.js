// Utility functions used across the application

// Local Storage utilities
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error getting from localStorage:', error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error setting to localStorage:', error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Time formatting utilities
const TimeUtils = {
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    parseTime(timeString) {
        const [minutes, seconds] = timeString.split(':').map(Number);
        return minutes * 60 + seconds;
    }
};

// Animation utilities
const AnimationUtils = {
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.min(progress / duration, 1);
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },

    fadeOut(element, duration = 300) {
        let start = null;
        const initialOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = initialOpacity * (1 - Math.min(progress / duration, 1));
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    },

    slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const fullHeight = element.scrollHeight;
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const height = Math.min((progress / duration) * fullHeight, fullHeight);
            
            element.style.height = height + 'px';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            }
        };
        
        requestAnimationFrame(animate);
    },

    slideUp(element, duration = 300) {
        const initialHeight = element.scrollHeight;
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const height = initialHeight * (1 - Math.min(progress / duration, 1));
            
            element.style.height = height + 'px';
            element.style.overflow = 'hidden';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            }
        };
        
        requestAnimationFrame(animate);
    }
};

// Device detection utilities
const DeviceUtils = {
    isMobile() {
        return window.innerWidth <= 768;
    },

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    },

    isDesktop() {
        return window.innerWidth > 1024;
    },

    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    getDeviceType() {
        if (this.isMobile()) return 'mobile';
        if (this.isTablet()) return 'tablet';
        return 'desktop';
    }
};

// API utilities for loading test data
const DataLoader = {
    async loadTestData(testNumber) {
        try {
            const response = await fetch(`scraped_data/test_${testNumber}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load test ${testNumber}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading test data:', error);
            throw error;
        }
    },

    async loadAllTests() {
        try {
            // Try to load the combined file first
            const response = await fetch('scraped_data/all_tests.json');
            if (response.ok) {
                return await response.json();
            }
            
            // Fallback: load individual test files
            const tests = [];
            for (let i = 1; i <= 63; i++) {
                try {
                    const testData = await this.loadTestData(i);
                    tests.push(testData);
                } catch (error) {
                    console.warn(`Could not load test ${i}:`, error);
                }
            }
            
            return tests.sort((a, b) => a.test_number - b.test_number);
        } catch (error) {
            console.error('Error loading all tests:', error);
            throw error;
        }
    },

    getImagePath(testNumber, imageName) {
        return `images/${testNumber}/${imageName}`;
    }
};

// Modal utilities
const ModalUtils = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus management for accessibility
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    },

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    hideAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
};

// Notification utilities
const NotificationUtils = {
    show(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);

        // Manual close
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());

        return notification;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// Validation utilities
const ValidationUtils = {
    isValidTestNumber(testNumber) {
        return Number.isInteger(testNumber) && testNumber >= 1 && testNumber <= 63;
    },

    isValidQuestionIndex(index, totalQuestions) {
        return Number.isInteger(index) && index >= 0 && index < totalQuestions;
    },

    isValidAnswerIndex(index, totalAnswers) {
        return Number.isInteger(index) && index >= 0 && index < totalAnswers;
    }
};

// Performance utilities
const PerformanceUtils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// DOM utilities
const DOMUtils = {
    createElement(tag, className, innerHTML) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    removeAllChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    addEventListeners(element, events, handler) {
        events.split(' ').forEach(event => {
            element.addEventListener(event, handler);
        });
    }
};

// Export utilities for use in other modules
window.Utils = {
    Storage,
    TimeUtils,
    AnimationUtils,
    DeviceUtils,
    DataLoader,
    ModalUtils,
    NotificationUtils,
    ValidationUtils,
    PerformanceUtils,
    DOMUtils
};