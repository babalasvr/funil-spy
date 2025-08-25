/**
 * Funil Spy Pixel Tracking System
 * Advanced visitor identification and retargeting pixel management
 */

(function() {
    'use strict';

    // Configuration
    const PIXEL_CONFIG = {
        apiUrl: 'http://localhost:3001/api',
        remarketing: {
            enabled: true,
            identificationThreshold: 30, // seconds before trying to identify user
            exitIntentEnabled: true,
            scrollDepthTracking: true,
            formAbandonmentTracking: true
        },
        thirdPartyPixels: {
            facebook: {
                enabled: true,
                pixelId: 'YOUR_FACEBOOK_PIXEL_ID' // Replace with actual pixel ID
            },
            google: {
                enabled: true,
                conversionId: 'AW-YOUR_CONVERSION_ID', // Replace with actual conversion ID
                conversionLabel: 'YOUR_CONVERSION_LABEL' // Replace with actual label
            },
            googleAnalytics: {
                enabled: true,
                measurementId: 'G-YOUR_MEASUREMENT_ID' // Replace with actual GA4 ID
            }
        }
    };

    // Pixel State Management
    let pixelState = {
        userId: null,
        sessionId: null,
        isIdentified: false,
        identificationAttempts: 0,
        behaviorScore: 0,
        exitIntentTriggered: false,
        formStarted: false,
        formAbandoned: false,
        lastActivity: Date.now(),
        conversionTracked: false
    };

    // Utility Functions
    function generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getOrCreateUserId() {
        if (pixelState.userId) return pixelState.userId;
        
        // Try to get from localStorage
        let userId = localStorage.getItem('funil_user_id');
        
        if (!userId) {
            userId = generateUserId();
            localStorage.setItem('funil_user_id', userId);
        }
        
        pixelState.userId = userId;
        return userId;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function setCookie(name, value, days = 30) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    // Third-party Pixel Integration
    function initializeFacebookPixel() {
        if (!PIXEL_CONFIG.thirdPartyPixels.facebook.enabled) return;

        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', PIXEL_CONFIG.thirdPartyPixels.facebook.pixelId);
        fbq('track', 'PageView');

        // Track custom events
        window.fbqTrack = function(eventName, parameters = {}) {
            if (typeof fbq !== 'undefined') {
                fbq('track', eventName, parameters);
            }
        };
    }

    function initializeGooglePixel() {
        if (!PIXEL_CONFIG.thirdPartyPixels.google.enabled) return;

        // Google Ads Conversion Tracking
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${PIXEL_CONFIG.thirdPartyPixels.google.conversionId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', PIXEL_CONFIG.thirdPartyPixels.google.conversionId);

        window.gtagTrack = function(eventName, parameters = {}) {
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, parameters);
            }
        };
    }

    function initializeGoogleAnalytics() {
        if (!PIXEL_CONFIG.thirdPartyPixels.googleAnalytics.enabled) return;

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${PIXEL_CONFIG.thirdPartyPixels.googleAnalytics.measurementId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', PIXEL_CONFIG.thirdPartyPixels.googleAnalytics.measurementId);
    }

    // Behavior Tracking and Scoring
    function updateBehaviorScore(event, points) {
        pixelState.behaviorScore += points;
        pixelState.lastActivity = Date.now();
        
        // Send behavior update to server
        sendPixelEvent('behavior_scored', {
            event,
            points,
            totalScore: pixelState.behaviorScore
        });

        console.log(`🎯 Behavior score updated: +${points} (Total: ${pixelState.behaviorScore})`);
    }

    // Advanced User Identification
    function attemptUserIdentification() {
        if (pixelState.isIdentified || pixelState.identificationAttempts >= 3) return;
        
        pixelState.identificationAttempts++;
        
        // Try to get email from forms
        const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"], input[id="email"]');
        let detectedEmail = null;
        
        emailInputs.forEach(input => {
            if (input.value && input.value.includes('@')) {
                detectedEmail = input.value;
            }
        });

        // Try to get name from forms
        const nameInputs = document.querySelectorAll('input[name="name"], input[name="nome"], input[id="name"]');
        let detectedName = null;
        
        nameInputs.forEach(input => {
            if (input.value && input.value.length > 2) {
                detectedName = input.value;
            }
        });

        // Try to get phone from forms
        const phoneInputs = document.querySelectorAll('input[type="tel"], input[name="phone"], input[name="telefone"], input[name="celular"]');
        let detectedPhone = null;
        
        phoneInputs.forEach(input => {
            if (input.value && input.value.length > 8) {
                detectedPhone = input.value;
            }
        });

        if (detectedEmail || detectedName || detectedPhone) {
            pixelState.isIdentified = true;
            
            const identificationData = {
                email: detectedEmail,
                name: detectedName,
                phone: detectedPhone,
                identificationMethod: 'form_detection',
                behaviorScore: pixelState.behaviorScore
            };

            sendPixelEvent('user_identified', identificationData);
            
            // Store in localStorage for future visits
            if (detectedEmail) localStorage.setItem('funil_user_email', detectedEmail);
            if (detectedName) localStorage.setItem('funil_user_name', detectedName);
            if (detectedPhone) localStorage.setItem('funil_user_phone', detectedPhone);

            console.log('✅ User identified:', identificationData);
            
            // Add to remarketing audience
            addToRemarketingAudience(identificationData);
        }
    }

    // Exit Intent Detection
    function setupExitIntentDetection() {
        if (!PIXEL_CONFIG.remarketing.exitIntentEnabled) return;

        let hasTriggered = false;

        document.addEventListener('mouseleave', function(e) {
            if (!hasTriggered && e.clientY <= 0 && pixelState.behaviorScore > 20) {
                hasTriggered = true;
                pixelState.exitIntentTriggered = true;
                
                updateBehaviorScore('exit_intent', 25);
                
                sendPixelEvent('exit_intent_detected', {
                    timeOnPage: Date.now() - pixelState.lastActivity,
                    behaviorScore: pixelState.behaviorScore
                });

                // Fire third-party pixels
                if (window.fbqTrack) {
                    window.fbqTrack('Lead', { content_name: 'Exit Intent' });
                }
                
                console.log('🚪 Exit intent detected - high value user!');
                
                // Try immediate identification if not already identified
                if (!pixelState.isIdentified) {
                    attemptUserIdentification();
                }
            }
        });
    }

    // Form Abandonment Tracking
    function setupFormAbandonmentTracking() {
        if (!PIXEL_CONFIG.remarketing.formAbandonmentTracking) return;

        let formStarted = false;
        let formElements = [];

        // Track form interactions
        document.addEventListener('focus', function(e) {
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
                if (!formStarted) {
                    formStarted = true;
                    pixelState.formStarted = true;
                    updateBehaviorScore('form_started', 20);
                    
                    console.log('📝 Form interaction started');
                }
                
                if (!formElements.includes(e.target)) {
                    formElements.push(e.target);
                    updateBehaviorScore('form_field_focused', 5);
                }
            }
        });

        // Track form field completion
        document.addEventListener('input', function(e) {
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
                if (e.target.value.length > 2) {
                    updateBehaviorScore('form_field_completed', 10);
                    
                    // Try identification on each input
                    setTimeout(attemptUserIdentification, 500);
                }
            }
        });

        // Track form submission
        document.addEventListener('submit', function(e) {
            updateBehaviorScore('form_submitted', 30);
            pixelState.formAbandoned = false;
            
            sendPixelEvent('form_completed', {
                formId: e.target.id,
                fieldsCompleted: formElements.length
            });
        });

        // Detect form abandonment on page unload
        window.addEventListener('beforeunload', function() {
            if (formStarted && !pixelState.formAbandoned && formElements.length > 0) {
                pixelState.formAbandoned = true;
                
                navigator.sendBeacon(`${PIXEL_CONFIG.apiUrl}/pixel-track`, JSON.stringify({
                    userId: pixelState.userId,
                    sessionId: pixelState.sessionId,
                    event: 'form_abandoned',
                    data: {
                        fieldsStarted: formElements.length,
                        behaviorScore: pixelState.behaviorScore,
                        timeOnPage: Date.now() - pixelState.lastActivity
                    }
                }));
            }
        });
    }

    // Send pixel events to server
    async function sendPixelEvent(eventName, data = {}) {
        const pixelData = {
            userId: getOrCreateUserId(),
            sessionId: pixelState.sessionId || 'session_' + Date.now(),
            event: eventName,
            data: {
                ...data,
                url: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                behaviorScore: pixelState.behaviorScore
            }
        };

        try {
            await fetch(`${PIXEL_CONFIG.apiUrl}/pixel-track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pixelData)
            });
        } catch (error) {
            console.log('Pixel tracking error:', error);
            // Store for retry
            const failedPixelEvents = JSON.parse(localStorage.getItem('failed_pixel_events') || '[]');
            failedPixelEvents.push(pixelData);
            localStorage.setItem('failed_pixel_events', JSON.stringify(failedPixelEvents));
        }
    }

    // Add user to remarketing audience
    async function addToRemarketingAudience(identificationData) {
        const audienceData = {
            userId: pixelState.userId,
            sessionId: pixelState.sessionId,
            ...identificationData,
            lastPageVisited: window.location.href,
            funnelStep: determineFunnelStep(),
            utmParams: getUTMParams(),
            deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop'
        };

        try {
            await fetch(`${PIXEL_CONFIG.apiUrl}/remarketing/audience`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(audienceData)
            });
            
            console.log('✅ Added to remarketing audience');
        } catch (error) {
            console.error('Error adding to remarketing audience:', error);
        }
    }

    function determineFunnelStep() {
        const path = window.location.pathname;
        if (path.includes('/relatorio/')) return 'report';
        if (path.includes('/checkout/')) return 'checkout';
        if (path.includes('/back-redirect/')) return 'offer';
        return 'landing';
    }

    function getUTMParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            utm_source: urlParams.get('utm_source'),
            utm_medium: urlParams.get('utm_medium'),
            utm_campaign: urlParams.get('utm_campaign'),
            utm_term: urlParams.get('utm_term'),
            utm_content: urlParams.get('utm_content')
        };
    }

    // Conversion Tracking
    function trackConversion(value, conversionType = 'purchase') {
        if (pixelState.conversionTracked) return;
        
        pixelState.conversionTracked = true;
        updateBehaviorScore('conversion', 50);
        
        // Internal tracking
        sendPixelEvent('conversion', {
            value,
            conversionType,
            behaviorScore: pixelState.behaviorScore
        });

        // Third-party pixel tracking
        if (window.fbqTrack) {
            window.fbqTrack('Purchase', { 
                value: value, 
                currency: 'BRL',
                content_type: 'product'
            });
        }

        if (window.gtagTrack) {
            window.gtagTrack('conversion', {
                send_to: `${PIXEL_CONFIG.thirdPartyPixels.google.conversionId}/${PIXEL_CONFIG.thirdPartyPixels.google.conversionLabel}`,
                value: value,
                currency: 'BRL'
            });
        }

        console.log(`💰 Conversion tracked: R$ ${value}`);
    }

    // Activity Monitoring
    function startActivityMonitoring() {
        // Track scroll depth
        let maxScrollDepth = 0;
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                
                if (scrollPercent >= 25 && scrollPercent < 50) {
                    updateBehaviorScore('scroll_25', 5);
                } else if (scrollPercent >= 50 && scrollPercent < 75) {
                    updateBehaviorScore('scroll_50', 10);
                } else if (scrollPercent >= 75) {
                    updateBehaviorScore('scroll_75', 15);
                }
            }
        });

        // Track clicks on important elements
        document.addEventListener('click', function(e) {
            const element = e.target;
            
            if (element.tagName.toLowerCase() === 'button' || 
                element.className.includes('btn') || 
                element.className.includes('cta')) {
                updateBehaviorScore('cta_click', 15);
            }
        });

        // Time-based identification attempts
        setTimeout(() => {
            if (!pixelState.isIdentified && pixelState.behaviorScore > 15) {
                attemptUserIdentification();
            }
        }, PIXEL_CONFIG.remarketing.identificationThreshold * 1000);
    }

    // Public API
    window.FunnelPixel = {
        trackConversion: trackConversion,
        identifyUser: function(userData) {
            pixelState.isIdentified = true;
            addToRemarketingAudience(userData);
        },
        getBehaviorScore: () => pixelState.behaviorScore,
        getUserId: () => pixelState.userId,
        isIdentified: () => pixelState.isIdentified
    };

    // Initialize pixel system
    function initializePixel() {
        console.log('🎯 Initializing Funil Spy Pixel System...');
        
        pixelState.sessionId = window.FunnelAnalytics ? window.FunnelAnalytics.getSessionId() : 'session_' + Date.now();
        getOrCreateUserId();
        
        // Initialize third-party pixels
        initializeFacebookPixel();
        initializeGooglePixel();
        initializeGoogleAnalytics();
        
        // Start tracking
        if (PIXEL_CONFIG.remarketing.enabled) {
            setupExitIntentDetection();
            setupFormAbandonmentTracking();
            startActivityMonitoring();
        }
        
        // Send initial page view
        sendPixelEvent('pixel_loaded', {
            userAgent: navigator.userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height
        });
        
        console.log('✅ Pixel system initialized for user:', pixelState.userId);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePixel);
    } else {
        initializePixel();
    }

})();