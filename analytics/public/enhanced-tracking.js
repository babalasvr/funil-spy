/**
 * Enhanced Tracking Script for Funil-Spy
 * Captures localStorage data and sends enhanced tracking events
 */

(function() {
    'use strict';

    // Enhanced tracking configuration
    const ENHANCED_TRACKING_CONFIG = {
        apiEndpoint: '/api/track-enhanced',
        sessionStorageKey: 'funil_session_id',
        localStorageKeys: [
            'alvoMonitoramento',
            'numeroClonado',
            'fotoperfil',
            'Status',
            'customerData',
            'currentTransaction',
            'funil_user_id',
            'funil_user_email',
            'funil_user_name',
            'funil_user_phone',
            'cookiesAccepted'
        ]
    };

    // Generate or get session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem(ENHANCED_TRACKING_CONFIG.sessionStorageKey);
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem(ENHANCED_TRACKING_CONFIG.sessionStorageKey, sessionId);
        }
        return sessionId;
    }

    // Collect localStorage data
    function collectLocalStorageData() {
        const data = {};
        
        ENHANCED_TRACKING_CONFIG.localStorageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                data[key] = value;
            }
        });

        // Also collect any keys that start with 'funil_'
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('funil_') && !data[key]) {
                data[key] = localStorage.getItem(key);
            }
        }

        return data;
    }

    // Get URL parameters
    function getURLParameters() {
        const params = {};
        const urlParams = new URLSearchParams(window.location.search);
        
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        
        return params;
    }

    // Detect page type based on URL
    function detectPageType() {
        const path = window.location.pathname;
        const url = window.location.href;
        
        if (path.includes('/numero') || url.includes('numero')) return 'numero';
        if (path.includes('/carregando') || url.includes('carregando')) return 'carregando';
        if (path.includes('/relatorio') || url.includes('relatorio')) return 'relatorio';
        if (path.includes('/checkout') || url.includes('checkout')) return 'checkout';
        if (path.includes('/back-redirect') || url.includes('back-redirect')) return 'back-redirect';
        if (path === '/' || path.includes('index.html')) return 'home';
        
        return 'unknown';
    }

    // Send enhanced tracking event
    async function sendEnhancedTrackingEvent(eventName, additionalProperties = {}) {
        try {
            const localStorageData = collectLocalStorageData();
            const urlParameters = getURLParameters();
            const pageType = detectPageType();
            
            const eventData = {
                sessionId: getSessionId(),
                eventName: eventName,
                pageUrl: window.location.href,
                pageTitle: document.title,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                screenHeight: screen.height,
                properties: {
                    pageType: pageType,
                    referrer: document.referrer,
                    timestamp: new Date().toISOString(),
                    ...urlParameters,
                    ...additionalProperties
                },
                localStorageData: localStorageData
            };

            const response = await fetch(ENHANCED_TRACKING_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Enhanced tracking event sent successfully:', eventName, result);
            
        } catch (error) {
            console.warn('Enhanced tracking failed:', error);
            
            // Fallback to standard tracking if available
            if (window.trackEvent && typeof window.trackEvent === 'function') {
                window.trackEvent(eventName, additionalProperties);
            }
        }
    }

    // Track page view with enhanced data
    function trackEnhancedPageView() {
        const pageType = detectPageType();
        sendEnhancedTrackingEvent(`page_view_${pageType}`, {
            loadTime: Date.now() - performance.timing.navigationStart,
            pageType: pageType
        });
    }

    // Track form interactions
    function setupFormTracking() {
        // Track form starts
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            let formStarted = false;
            
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    if (!formStarted) {
                        formStarted = true;
                        sendEnhancedTrackingEvent('form_started', {
                            formId: form.id || 'unknown',
                            fieldName: input.name || input.id || 'unknown'
                        });
                    }
                });
                
                input.addEventListener('blur', function() {
                    if (input.value) {
                        sendEnhancedTrackingEvent('form_field_completed', {
                            formId: form.id || 'unknown',
                            fieldName: input.name || input.id || 'unknown',
                            fieldType: input.type
                        });
                    }
                });
            });
            
            // Track form submissions
            form.addEventListener('submit', function() {
                sendEnhancedTrackingEvent('form_submitted', {
                    formId: form.id || 'unknown'
                });
            });
        });
    }

    // Track button clicks with enhanced data
    function setupButtonTracking() {
        const buttons = document.querySelectorAll('button, .btn, .cta-button, .submit-btn, .contact-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                sendEnhancedTrackingEvent('button_clicked', {
                    buttonText: button.textContent?.trim()?.substring(0, 50) || 'unknown',
                    buttonId: button.id || 'unknown',
                    buttonClass: button.className || 'unknown'
                });
            });
        });
    }

    // Track phone number investigation
    function trackPhoneInvestigation() {
        // Monitor localStorage changes for numeroClonado
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key === 'numeroClonado') {
                sendEnhancedTrackingEvent('phone_search', {
                    phoneNumber: value,
                    investigatedAt: new Date().toISOString()
                });
            }
            originalSetItem.apply(this, arguments);
        };
    }

    // Track conversion events
    function trackConversionEvents() {
        // Monitor for QR code generation
        const qrCodeElements = document.querySelectorAll('#qrSection, .qr-section, .qr-code-container');
        qrCodeElements.forEach(element => {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (element.style.display !== 'none' && element.style.display !== '') {
                            sendEnhancedTrackingEvent('qr_code_generated', {
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                });
            });
            
            observer.observe(element, { attributes: true });
        });
    }

    // Track scroll depth
    function trackScrollDepth() {
        let maxScroll = 0;
        const scrollThresholds = [25, 50, 75, 90, 100];
        const triggeredThresholds = new Set();
        
        function calculateScrollDepth() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            const scrollDepth = Math.round((scrollTop + windowHeight) / documentHeight * 100);
            
            if (scrollDepth > maxScroll) {
                maxScroll = scrollDepth;
                
                scrollThresholds.forEach(threshold => {
                    if (scrollDepth >= threshold && !triggeredThresholds.has(threshold)) {
                        triggeredThresholds.add(threshold);
                        sendEnhancedTrackingEvent('scroll_depth', {
                            depth: threshold,
                            maxDepth: maxScroll
                        });
                    }
                });
            }
        }
        
        window.addEventListener('scroll', debounce(calculateScrollDepth, 500));
    }

    // Utility function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Track exit intent
    function trackExitIntent() {
        let exitIntentTriggered = false;
        
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY <= 0 && !exitIntentTriggered) {
                exitIntentTriggered = true;
                sendEnhancedTrackingEvent('exit_intent', {
                    timeOnPage: Date.now() - performance.timing.navigationStart
                });
            }
        });
    }

    // Initialize enhanced tracking
    function initializeEnhancedTracking() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeEnhancedTracking, 100);
            });
            return;
        }

        // Track initial page view
        trackEnhancedPageView();
        
        // Setup event tracking
        setupFormTracking();
        setupButtonTracking();
        trackPhoneInvestigation();
        trackConversionEvents();
        trackScrollDepth();
        trackExitIntent();
        
        console.log('Enhanced tracking initialized successfully');
        
        // Track session data every 30 seconds
        setInterval(() => {
            sendEnhancedTrackingEvent('session_heartbeat', {
                timeOnPage: Date.now() - performance.timing.navigationStart,
                localStorageSnapshot: collectLocalStorageData()
            });
        }, 30000);
    }

    // Start tracking when script loads
    initializeEnhancedTracking();

    // Expose functions globally for manual tracking
    window.enhancedTracking = {
        sendEvent: sendEnhancedTrackingEvent,
        getSessionId: getSessionId,
        getLocalStorageData: collectLocalStorageData
    };

})();