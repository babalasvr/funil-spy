/**
 * Funil Spy Analytics - Client Tracking Script
 * Tracks user behavior across the mobile funnel
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiUrl: 'http://localhost:3001/api',
        debug: false,
        autoTrack: true,
        trackScrollDepth: true,
        trackClicks: true,
        trackFormEvents: true
    };

    // State
    let sessionId = null;
    let pageStartTime = Date.now();
    let maxScrollDepth = 0;
    let isTracking = false;

    // Utility functions
    function log(...args) {
        if (CONFIG.debug) {
            console.log('[FunnelAnalytics]', ...args);
        }
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getSessionId() {
        if (sessionId) return sessionId;
        
        // Try to get from localStorage first
        sessionId = localStorage.getItem('funil_session_id');
        
        if (!sessionId) {
            sessionId = generateUUID();
            localStorage.setItem('funil_session_id', sessionId);
        }
        
        return sessionId;
    }

    function getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            timestamp: new Date().toISOString()
        };
    }

    function getUTMParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            utm_source: urlParams.get('utm_source'),
            utm_medium: urlParams.get('utm_medium'),
            utm_campaign: urlParams.get('utm_campaign'),
            utm_term: urlParams.get('utm_term'),
            utm_content: urlParams.get('utm_content'),
            src: urlParams.get('src'),
            sck: urlParams.get('sck')
        };
    }

    function getCurrentPageType() {
        const path = window.location.pathname;
        const url = window.location.href;
        
        if (path.includes('/relatorio/')) return 'report';
        if (path.includes('/checkout/')) {
            if (url.includes('back-redirect')) return 'checkout_offer';
            return 'checkout';
        }
        if (path.includes('/back-redirect/')) return 'report_redirect';
        
        return 'unknown';
    }

    // API communication
    async function sendEvent(eventName, properties = {}) {
        const pageInfo = getPageInfo();
        const utmParams = getUTMParams();
        
        const eventData = {
            sessionId: getSessionId(),
            eventName,
            properties: {
                ...properties,
                ...utmParams,
                pageType: getCurrentPageType()
            },
            pageUrl: pageInfo.url,
            pageTitle: pageInfo.title,
            userAgent: pageInfo.userAgent,
            screenWidth: pageInfo.screenWidth,
            screenHeight: pageInfo.screenHeight
        };

        try {
            const response = await fetch(`${CONFIG.apiUrl}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                log('Event tracked:', eventName, properties);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            log('Error tracking event:', error);
            // Store failed events for retry
            storeFailedEvent(eventData);
        }
    }

    async function sendConversion(conversionData) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/conversion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: getSessionId(),
                    ...conversionData
                })
            });

            if (response.ok) {
                log('Conversion tracked:', conversionData);
            }
        } catch (error) {
            log('Error tracking conversion:', error);
        }
    }

    function storeFailedEvent(eventData) {
        try {
            const failedEvents = JSON.parse(localStorage.getItem('funil_failed_events') || '[]');
            failedEvents.push(eventData);
            localStorage.setItem('funil_failed_events', JSON.stringify(failedEvents));
        } catch (error) {
            log('Error storing failed event:', error);
        }
    }

    async function retryFailedEvents() {
        try {
            const failedEvents = JSON.parse(localStorage.getItem('funil_failed_events') || '[]');
            if (failedEvents.length === 0) return;

            const retryPromises = failedEvents.map(eventData => 
                fetch(`${CONFIG.apiUrl}/track`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                })
            );

            await Promise.all(retryPromises);
            localStorage.removeItem('funil_failed_events');
            log('Retried failed events successfully');
        } catch (error) {
            log('Error retrying failed events:', error);
        }
    }

    // Event tracking functions
    function trackPageView() {
        const pageType = getCurrentPageType();
        const eventName = `page_view_${pageType}`;
        
        sendEvent(eventName, {
            pageLoadTime: Date.now() - pageStartTime,
            referrer: document.referrer
        });
    }

    function trackScrollDepth() {
        if (!CONFIG.trackScrollDepth) return;

        function updateScrollDepth() {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                
                // Track milestone scrolls
                if (scrollPercent >= 25 && maxScrollDepth < 25) {
                    sendEvent('scroll_25_percent');
                } else if (scrollPercent >= 50 && maxScrollDepth < 50) {
                    sendEvent('scroll_50_percent');
                } else if (scrollPercent >= 75 && maxScrollDepth < 75) {
                    sendEvent('scroll_75_percent');
                } else if (scrollPercent >= 100 && maxScrollDepth < 100) {
                    sendEvent('scroll_100_percent');
                }
            }
        }

        window.addEventListener('scroll', updateScrollDepth, { passive: true });
    }

    function trackClicks() {
        if (!CONFIG.trackClicks) return;

        document.addEventListener('click', function(e) {
            const element = e.target;
            const tagName = element.tagName.toLowerCase();
            const className = element.className;
            const id = element.id;
            
            // Track important clicks
            if (tagName === 'button' || tagName === 'a' || className.includes('btn')) {
                const clickData = {
                    elementType: tagName,
                    elementId: id,
                    elementClass: className,
                    elementText: element.textContent?.substring(0, 100),
                    href: element.href
                };

                // Specific button tracking
                if (id === 'submitBtn') {
                    sendEvent('checkout_button_clicked', clickData);
                } else if (className.includes('order-bump')) {
                    sendEvent('order_bump_clicked', clickData);
                } else if (className.includes('back-redirect')) {
                    sendEvent('back_redirect_clicked', clickData);
                } else {
                    sendEvent('element_clicked', clickData);
                }
            }
        });
    }

    function trackFormEvents() {
        if (!CONFIG.trackFormEvents) return;

        // Track form field interactions
        document.addEventListener('input', function(e) {
            const element = e.target;
            if (element.tagName.toLowerCase() === 'input') {
                const fieldName = element.name || element.id;
                const fieldType = element.type;
                
                if (fieldName === 'name' || fieldName === 'email' || fieldName === 'cpf') {
                    sendEvent('form_field_completed', {
                        fieldName,
                        fieldType,
                        hasValue: element.value.length > 0
                    });
                }
            }
        });

        // Track form submissions
        document.addEventListener('submit', function(e) {
            sendEvent('form_submitted', {
                formId: e.target.id,
                formAction: e.target.action
            });
        });

        // Track form start
        let formStarted = false;
        document.addEventListener('focus', function(e) {
            if (!formStarted && e.target.tagName.toLowerCase() === 'input') {
                formStarted = true;
                sendEvent('form_started');
            }
        });
    }

    function trackSpecialEvents() {
        // Track order bump checkbox changes
        const orderBumpCheckbox = document.getElementById('orderBumpCheckbox');
        if (orderBumpCheckbox) {
            orderBumpCheckbox.addEventListener('change', function() {
                sendEvent('order_bump_toggled', {
                    checked: this.checked,
                    value: this.value
                });
            });
        }

        // Track timer views
        const timer = document.getElementById('timer');
        if (timer) {
            sendEvent('timer_viewed');
        }

        // Track QR code generation
        const qrSection = document.getElementById('qrSection');
        if (qrSection) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (qrSection.classList.contains('active')) {
                            sendEvent('qr_code_generated');
                        }
                    }
                });
            });
            observer.observe(qrSection, { attributes: true });
        }
    }

    function trackPageExit() {
        window.addEventListener('beforeunload', function() {
            const timeOnPage = Date.now() - pageStartTime;
            
            // Send exit event with timing
            navigator.sendBeacon(`${CONFIG.apiUrl}/track`, JSON.stringify({
                sessionId: getSessionId(),
                eventName: 'page_exit',
                properties: {
                    timeOnPage,
                    maxScrollDepth,
                    pageType: getCurrentPageType()
                },
                pageUrl: window.location.href,
                pageTitle: document.title,
                userAgent: navigator.userAgent,
                screenWidth: screen.width,
                screenHeight: screen.height
            }));
        });
    }

    // Public API
    window.FunnelAnalytics = {
        track: sendEvent,
        conversion: sendConversion,
        getSessionId: getSessionId,
        
        // Convenience methods
        trackConversion: function(value, orderBump = false, specialOffer = false, customerData = {}) {
            return sendConversion({
                conversionType: 'purchase',
                value,
                orderBump,
                specialOffer,
                customerData
            });
        },
        
        trackBackRedirect: function() {
            sendEvent('exit_intent_triggered');
        },
        
        trackOfferView: function(offerType) {
            sendEvent('offer_viewed', { offerType });
        }
    };

    // Initialize tracking
    function init() {
        if (isTracking) return;
        isTracking = true;
        
        log('Initializing Funil Spy Analytics');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Retry failed events from previous sessions
        retryFailedEvents();

        // Set up tracking
        if (CONFIG.autoTrack) {
            trackPageView();
            trackScrollDepth();
            trackClicks();
            trackFormEvents();
            trackSpecialEvents();
            trackPageExit();
        }

        log('Analytics initialized for session:', getSessionId());
    }

    // Start tracking
    init();

})();