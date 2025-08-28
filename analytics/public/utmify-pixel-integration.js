/**
 * UTMify Pixel Integration Script
 * Integra o pixel oficial da UTMify com nosso sistema de lead tracking
 * Versão: 1.0.0
 */

(function() {
    'use strict';
    
    // Configuração do pixel UTMify
    const UTMIFY_CONFIG = {
        pixelId: "66ac66dd43136b1d66bddb65",
        pixelUrl: "https://cdn.utmify.com.br/scripts/pixel/pixel.js",
        debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    };
    
    // Estado da integração
    let utmifyPixelLoaded = false;
    let leadTrackerLoaded = false;
    let integrationReady = false;
    
    /**
     * Carrega o pixel oficial da UTMify
     */
    function loadUTMifyPixel() {
        if (utmifyPixelLoaded) return;
        
        // Definir pixelId globalmente
        window.pixelId = UTMIFY_CONFIG.pixelId;
        
        // Criar e carregar script do pixel
        const script = document.createElement('script');
        script.setAttribute('async', '');
        script.setAttribute('defer', '');
        script.setAttribute('src', UTMIFY_CONFIG.pixelUrl);
        
        script.onload = function() {
            utmifyPixelLoaded = true;
            log('✅ Pixel UTMify carregado com sucesso');
            checkIntegrationReady();
        };
        
        script.onerror = function() {
            log('❌ Erro ao carregar pixel UTMify');
        };
        
        document.head.appendChild(script);
        log('🔄 Carregando pixel UTMify...');
    }
    
    /**
     * Carrega nosso lead tracker
     */
    function loadLeadTracker() {
        if (leadTrackerLoaded || window.UTMifyLeadTracker) {
            leadTrackerLoaded = true;
            checkIntegrationReady();
            return;
        }
        
        const script = document.createElement('script');
        // Detectar se estamos em uma subpasta e ajustar o caminho
        const isInSubfolder = window.location.pathname.includes('/checkout/') || 
                             window.location.pathname.includes('/back-redirect/') ||
                             window.location.pathname.includes('/numero/') ||
                             window.location.pathname.includes('/carregando/') ||
                             window.location.pathname.includes('/relatorio/');
        
        script.src = isInSubfolder ? '../analytics/public/utmify-lead-tracker.js' : './analytics/public/utmify-lead-tracker.js';
        
        log('🔄 Tentando carregar Lead Tracker de:', script.src);
        
        script.onload = function() {
            leadTrackerLoaded = true;
            log('✅ Lead Tracker carregado com sucesso');
            checkIntegrationReady();
        };
        
        script.onerror = function() {
            log('❌ Erro ao carregar Lead Tracker de:', script.src);
        };
        
        document.head.appendChild(script);
        log('🔄 Carregando Lead Tracker...');
    }
    
    /**
     * Verifica se a integração está pronta
     */
    function checkIntegrationReady() {
        if (utmifyPixelLoaded && leadTrackerLoaded && !integrationReady) {
            integrationReady = true;
            setupIntegration();
        }
    }
    
    /**
     * Configura a integração entre pixel e lead tracker
     */
    function setupIntegration() {
        log('🔗 Configurando integração UTMify + Lead Tracker');
        
        // Aguardar que ambos os sistemas estejam prontos
        const checkReady = setInterval(() => {
            if (window.UTMifyLeadTracker && window.utmify) {
                clearInterval(checkReady);
                initializeIntegration();
            }
        }, 100);
        
        // Timeout de segurança
        setTimeout(() => {
            clearInterval(checkReady);
            if (!window.UTMifyLeadTracker || !window.utmify) {
                log('⚠️ Timeout na inicialização - continuando sem integração completa');
            }
        }, 5000);
    }
    
    /**
     * Inicializa a integração completa
     */
    function initializeIntegration() {
        log('🚀 Integração UTMify inicializada com sucesso!');
        
        // Sincronizar dados entre sistemas
        syncData();
        
        // Configurar eventos
        setupEventListeners();
        
        // Notificar que a integração está pronta
        window.dispatchEvent(new CustomEvent('utmifyIntegrationReady', {
            detail: {
                pixelId: UTMIFY_CONFIG.pixelId,
                leadTracker: !!window.UTMifyLeadTracker,
                utmifyPixel: !!window.utmify
            }
        }));
        
        // API pública da integração
        window.UTMifyIntegration = {
            isReady: () => integrationReady,
            getPixelId: () => UTMIFY_CONFIG.pixelId,
            trackEvent: trackEvent,
            syncData: syncData,
            debug: UTMIFY_CONFIG.debug
        };
    }
    
    /**
     * Sincroniza dados entre pixel e lead tracker
     */
    function syncData() {
        try {
            // Obter dados do lead tracker
            const leadData = window.UTMifyLeadTracker?.getCurrentData();
            
            if (leadData && window.utmify) {
                // Enviar dados para o pixel UTMify
                if (leadData.lead?.email) {
                    window.utmify.track('lead_email_captured', {
                        email: leadData.lead.email,
                        source: 'lead_tracker'
                    });
                }
                
                if (leadData.lead?.phone) {
                    window.utmify.track('lead_phone_captured', {
                        phone: leadData.lead.phone,
                        source: 'lead_tracker'
                    });
                }
                
                log('🔄 Dados sincronizados com pixel UTMify');
            }
        } catch (error) {
            log('❌ Erro na sincronização:', error);
        }
    }
    
    /**
     * Configura listeners de eventos
     */
    function setupEventListeners() {
        // Escutar eventos do lead tracker
        window.addEventListener('leadCaptured', function(event) {
            const data = event.detail;
            
            // Enviar para pixel UTMify
            if (window.utmify) {
                window.utmify.track('lead_captured', {
                    sessionId: data.sessionId,
                    formProgress: data.formProgress,
                    source: 'lead_tracker'
                });
                
                log('📊 Evento leadCaptured enviado para UTMify');
            }
        });
        
        // Escutar eventos de formulário
        window.addEventListener('form_started', function(event) {
            if (window.utmify) {
                window.utmify.track('form_started', event.detail);
            }
        });
        
        window.addEventListener('form_progress', function(event) {
            if (window.utmify) {
                window.utmify.track('form_progress', event.detail);
            }
        });
        
        window.addEventListener('form_completed', function(event) {
            if (window.utmify) {
                window.utmify.track('form_completed', event.detail);
                syncData(); // Sincronizar dados finais
            }
        });
    }
    
    /**
     * Função para tracking de eventos customizados
     */
    function trackEvent(eventName, data = {}) {
        try {
            // Enviar para pixel UTMify
            if (window.utmify) {
                window.utmify.track(eventName, data);
            }
            
            // Enviar para lead tracker se relevante
            if (window.UTMifyLeadTracker && eventName.includes('lead')) {
                window.UTMifyLeadTracker.trackEvent(eventName, data);
            }
            
            log(`📈 Evento ${eventName} enviado`);
        } catch (error) {
            log('❌ Erro no tracking:', error);
        }
    }
    
    /**
     * Função de log
     */
    function log(...args) {
        if (UTMIFY_CONFIG.debug) {
            console.log('[UTMify Integration]', ...args);
        }
    }
    
    /**
     * Inicialização
     */
    function init() {
        log('🎯 Inicializando integração UTMify');
        
        // Carregar scripts
        loadUTMifyPixel();
        loadLeadTracker();
    }
    
    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Inclua este script em todas as páginas do funil:
 *    <script src="/analytics/public/utmify-pixel-integration.js"></script>
 * 
 * 2. O script irá automaticamente:
 *    - Carregar o pixel oficial da UTMify
 *    - Carregar nosso lead tracker
 *    - Sincronizar dados entre os dois sistemas
 *    - Configurar eventos automáticos
 * 
 * 3. Para tracking customizado:
 *    window.UTMifyIntegration.trackEvent('evento_customizado', { dados });
 * 
 * 4. Para verificar se está funcionando:
 *    window.addEventListener('utmifyIntegrationReady', function(event) {
 *        console.log('Integração pronta!', event.detail);
 *    });
 */