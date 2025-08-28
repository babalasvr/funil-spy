/**
 * Advanced Tracking System - Client Side
 * Integração UTMify + Facebook Pixel + Conversions API
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Production Ready
 */

(function() {
    'use strict';
    
    // Configurações
    const CONFIG = {
        apiBaseUrl: window.location.origin + '/api/tracking',
        sessionStorageKey: 'funil_spy_session',
        utmStorageKey: 'funil_spy_utm',
        debugMode: false, // Altere para true em desenvolvimento
        retryAttempts: 3,
        retryDelay: 1000
    };
    
    // Classe principal do tracking
    class AdvancedTracking {
        constructor() {
            this.sessionId = this.getOrCreateSessionId();
            this.utmParams = this.captureUTMParams();
            this.isInitialized = false;
            this.eventQueue = [];
            this.isOnline = navigator.onLine;
            
            this.init();
        }
        
        /**
         * Inicialização do sistema
         */
        init() {
            try {
                this.log('🚀 Inicializando Advanced Tracking System');
                
                // Capturar dados da página atual
                this.capturePageData();
                
                // Configurar listeners
                this.setupEventListeners();
                
                // Processar fila de eventos offline
                this.processOfflineQueue();
                
                // Enviar pageview inicial
                this.trackPageView();
                
                this.isInitialized = true;
                this.log('✅ Advanced Tracking System inicializado');
                
            } catch (error) {
                this.log('❌ Erro na inicialização:', error);
            }
        }
        
        /**
         * Gera ou recupera session ID
         */
        getOrCreateSessionId() {
            let sessionId = sessionStorage.getItem(CONFIG.sessionStorageKey);
            
            if (!sessionId) {
                sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem(CONFIG.sessionStorageKey, sessionId);
            }
            
            return sessionId;
        }
        
        /**
         * Captura parâmetros UTM da URL
         */
        captureUTMParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const utmParams = {};
            
            // Parâmetros UTM padrão
            const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
            
            // Parâmetros de tracking adiccionais
            const trackingKeys = ['gclid', 'fbclid', 'msclkid', 'ttclid'];
            
            // Capturar UTMs
            utmKeys.forEach(key => {
                const value = urlParams.get(key);
                if (value) {
                    utmParams[key] = value;
                }
            });
            
            // Capturar IDs de tracking
            trackingKeys.forEach(key => {
                const value = urlParams.get(key);
                if (value) {
                    utmParams[key] = value;
                }
            });
            
            // Salvar no localStorage para persistir entre páginas
            if (Object.keys(utmParams).length > 0) {
                localStorage.setItem(CONFIG.utmStorageKey, JSON.stringify(utmParams));
                this.log('📍 UTM capturado:', utmParams);
            } else {
                // Tentar recuperar UTMs salvos
                const savedUtm = localStorage.getItem(CONFIG.utmStorageKey);
                if (savedUtm) {
                    try {
                        return JSON.parse(savedUtm);
                    } catch (e) {
                        this.log('⚠️ Erro ao recuperar UTM salvo:', e);
                    }
                }
            }
            
            return utmParams;
        }
        
        /**
         * Captura dados da página atual
         */
        capturePageData() {
            this.pageData = {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                language: navigator.language,
                screen: {
                    width: screen.width,
                    height: screen.height
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
        }
        
        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Detectar mudanças de conectividade
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.processOfflineQueue();
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });
            
            // Detectar saída da página
            window.addEventListener('beforeunload', () => {
                this.flushEvents();
            });
            
            // Detectar visibilidade da página
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.flushEvents();
                }
            });
        }
        
        /**
         * Processa fila de eventos offline
         */
        processOfflineQueue() {
            if (!this.isOnline || this.eventQueue.length === 0) return;
            
            const queue = [...this.eventQueue];
            this.eventQueue = [];
            
            queue.forEach(event => {
                this.sendEvent(event.endpoint, event.data, false);
            });
        }
        
        /**
         * Envia evento para o servidor
         */
        async sendEvent(endpoint, data, addToQueue = true) {
            const eventData = {
                sessionId: this.sessionId,
                utmParams: this.utmParams,
                pageData: this.pageData,
                timestamp: Date.now(),
                ...data
            };
            
            // Se offline, adicionar à fila
            if (!this.isOnline && addToQueue) {
                this.eventQueue.push({ endpoint, data: eventData });
                this.log('📦 Evento adicionado à fila offline:', endpoint);
                return;
            }
            
            let attempts = 0;
            
            while (attempts < CONFIG.retryAttempts) {
                try {
                    const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Session-ID': this.sessionId
                        },
                        body: JSON.stringify(eventData)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        this.log(`✅ Evento enviado: ${endpoint}`, result);
                        return result;
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                } catch (error) {
                    attempts++;
                    this.log(`❌ Tentativa ${attempts} falhou para ${endpoint}:`, error);
                    
                    if (attempts < CONFIG.retryAttempts) {
                        await this.delay(CONFIG.retryDelay * attempts);
                    } else {
                        // Se todas as tentativas falharam, adicionar à fila
                        if (addToQueue) {
                            this.eventQueue.push({ endpoint, data: eventData });
                        }
                    }
                }
            }
        }
        
        /**
         * Flush de eventos pendentes
         */
        flushEvents() {
            if (this.eventQueue.length > 0) {
                // Usar sendBeacon se disponível
                if (navigator.sendBeacon) {
                    const data = JSON.stringify({
                        sessionId: this.sessionId,
                        events: this.eventQueue
                    });
                    
                    navigator.sendBeacon(`${CONFIG.apiBaseUrl}/batch`, data);
                }
            }
        }
        
        /**
         * Delay helper
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * Log helper
         */
        log(message, data = null) {
            if (CONFIG.debugMode) {
                if (data) {
                    console.log(`[AdvancedTracking] ${message}`, data);
                } else {
                    console.log(`[AdvancedTracking] ${message}`);
                }
            }
        }
        
        // ===== MÉTODOS PÚBLICOS DE TRACKING =====
        
        /**
         * Track Page View
         */
        trackPageView(customData = {}) {
            this.sendEvent('/pageview', {
                pageData: {
                    ...this.pageData,
                    ...customData
                }
            });
        }
        
        /**
         * Track Lead Capture
         */
        trackLead(leadData) {
            if (!leadData.email && !leadData.phone) {
                this.log('⚠️ Lead deve ter email ou telefone');
                return;
            }
            
            this.sendEvent('/lead', {
                leadData: leadData
            });
        }
        
        /**
         * Track Checkout Start
         */
        trackCheckoutStart(checkoutData) {
            if (!checkoutData.price || parseFloat(checkoutData.price) <= 0) {
                this.log('⚠️ Checkout deve ter preço válido');
                return;
            }
            
            this.sendEvent('/checkout-start', {
                checkoutData: checkoutData
            });
        }
        
        /**
         * Track Purchase
         */
        trackPurchase(purchaseData) {
            if (!purchaseData.amount || !purchaseData.transactionId) {
                this.log('⚠️ Purchase deve ter amount e transactionId');
                return;
            }
            
            this.sendEvent('/purchase', {
                purchaseData: purchaseData
            });
        }
        
        /**
         * Track Offer View (Upsell/Downsell)
         */
        trackOfferView(offerData) {
            if (!['upsell', 'downsell'].includes(offerData.type)) {
                this.log('⚠️ Offer type deve ser "upsell" ou "downsell"');
                return;
            }
            
            this.sendEvent('/offer-view', {
                offerData: offerData
            });
        }
        
        /**
         * Track Custom Event
         */
        trackCustomEvent(eventName, eventData = {}) {
            this.sendEvent('/custom', {
                eventName: eventName,
                eventData: eventData
            });
        }
        
        /**
         * Get Session Report
         */
        async getSessionReport() {
            try {
                const response = await fetch(`${CONFIG.apiBaseUrl}/session/${this.sessionId}`);
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                this.log('❌ Erro ao buscar relatório da sessão:', error);
            }
            return null;
        }
    }
    
    // ===== AUTO-TRACKING PARA FORMULÁRIOS =====
    
    /**
     * Auto-tracking para formulários de lead
     */
    function setupFormTracking() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            
            // Detectar formulários de lead
            if (form.matches('[data-track="lead"], .lead-form, #lead-form')) {
                const formData = new FormData(form);
                const leadData = {
                    name: formData.get('name') || formData.get('nome') || '',
                    email: formData.get('email') || '',
                    phone: formData.get('phone') || formData.get('telefone') || formData.get('whatsapp') || '',
                    document: formData.get('document') || formData.get('cpf') || '',
                    city: formData.get('city') || formData.get('cidade') || '',
                    state: formData.get('state') || formData.get('estado') || ''
                };
                
                if (window.advancedTracking) {
                    window.advancedTracking.trackLead(leadData);
                }
            }
            
            // Detectar formulários de checkout
            if (form.matches('[data-track="checkout"], .checkout-form, #checkout-form')) {
                const formData = new FormData(form);
                const checkoutData = {
                    productId: form.dataset.productId || 'main-product',
                    productName: form.dataset.productName || 'Produto Principal',
                    price: form.dataset.price || formData.get('price') || 0,
                    category: form.dataset.category || 'digital'
                };
                
                if (window.advancedTracking) {
                    window.advancedTracking.trackCheckoutStart(checkoutData);
                }
            }
        });
    }
    
    // ===== INICIALIZAÇÃO =====
    
    // Aguardar DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.advancedTracking = new AdvancedTracking();
            setupFormTracking();
        });
    } else {
        window.advancedTracking = new AdvancedTracking();
        setupFormTracking();
    }
    
    // Expor API global
    window.FunilSpyTracking = {
        trackPageView: (data) => window.advancedTracking?.trackPageView(data),
        trackLead: (data) => window.advancedTracking?.trackLead(data),
        trackCheckoutStart: (data) => window.advancedTracking?.trackCheckoutStart(data),
        trackPurchase: (data) => window.advancedTracking?.trackPurchase(data),
        trackOfferView: (data) => window.advancedTracking?.trackOfferView(data),
        trackCustomEvent: (name, data) => window.advancedTracking?.trackCustomEvent(name, data),
        getSessionReport: () => window.advancedTracking?.getSessionReport()
    };
    
})();