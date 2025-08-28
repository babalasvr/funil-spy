/**
 * UTMify Lead Tracker - Sistema de Captura Automática Otimizado para UTMify
 * Integração completa com UTMify para rastreamento de conversões e leads
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 2.0.0 - UTMify Edition
 */

(function() {
    'use strict';

    // Configuração específica para UTMify
    const UTMIFY_LEAD_CONFIG = {
        // URL do endpoint para envio dos dados (compatível com documentação UTMify)
        apiEndpoint: '/api/utmify/capture-lead',
        
        // Configuração UTMify
        utmify: {
            enabled: true,
            trackingId: null, // Será detectado automaticamente
            apiUrl: 'https://api.utm.io/v1', // URL padrão da API UTMify
            events: {
                leadCapture: 'lead_captured',
                formStart: 'form_started',
                formProgress: 'form_progress',
                formComplete: 'form_completed'
            }
        },
        
        // Seletores de formulários para monitorar
        formSelectors: [
            'form[id*="checkout"]',
            'form[class*="checkout"]',
            'form[id*="payment"]',
            'form[class*="payment"]',
            'form[id*="order"]',
            'form[class*="order"]',
            '.checkout-form',
            '.payment-form',
            '.order-form',
            '[data-utmify-form]'
        ],
        
        // Mapeamento de campos otimizado para UTMify
        fieldMappings: {
            // Dados pessoais principais
            name: ['name', 'nome', 'first_name', 'firstName', 'full_name', 'fullName', 'customer_name', 'lead_name'],
            email: ['email', 'e-mail', 'mail', 'customer_email', 'user_email', 'lead_email'],
            phone: ['phone', 'telefone', 'tel', 'mobile', 'celular', 'whatsapp', 'customer_phone', 'lead_phone'],
            
            // Documentos
            document: ['cpf', 'document', 'documento', 'tax_id', 'customer_document', 'cnpj'],
            
            // Endereço completo
            address: ['address', 'endereco', 'street', 'rua', 'customer_address'],
            city: ['city', 'cidade', 'customer_city'],
            state: ['state', 'estado', 'uf', 'customer_state'],
            zipcode: ['cep', 'zip', 'zipcode', 'postal_code', 'customer_zip'],
            country: ['country', 'pais', 'customer_country'],
            
            // Dados comerciais
            company: ['company', 'empresa', 'business_name', 'company_name'],
            position: ['position', 'cargo', 'job_title', 'role'],
            
            // Dados do produto/serviço
            product: ['product', 'produto', 'service', 'servico'],
            value: ['value', 'valor', 'price', 'preco', 'amount']
        },
        
        // Configurações de captura
        captureOnChange: true,
        captureOnSubmit: true,
        captureOnBlur: true,
        captureOnFocus: true, // Para UTMify
        
        // Debounce otimizado
        debounceTime: 800,
        
        // Debug mode
        debug: true
    };

    // Variáveis globais
    let sessionId = null;
    let utmData = {};
    let capturedData = {};
    let debounceTimer = null;
    let formsMonitored = new Set();
    let formStarted = false;
    let fieldProgress = {};

    /**
     * Inicializa o UTMify Lead Tracker
     */
    function initUTMifyLeadTracker() {
        log('🚀 Inicializando UTMify Lead Tracker...');
        
        // Detectar UTMify
        detectUTMify();
        
        // Gerar ou recuperar session ID
        initSessionId();
        
        // Capturar dados de UTM (compatível com UTMify)
        captureUTMifyData();
        
        // Monitorar formulários existentes
        monitorExistingForms();
        
        // Observar novos formulários
        observeNewForms();
        
        // Configurar eventos globais
        setupGlobalEvents();
        
        log('✅ UTMify Lead Tracker inicializado com sucesso');
    }

    /**
     * Detecta se UTMify está presente na página
     */
    function detectUTMify() {
        // Verificar se UTMify está carregado
        if (typeof window.utmify !== 'undefined') {
            UTMIFY_LEAD_CONFIG.utmify.enabled = true;
            log('🎯 UTMify detectado e ativo');
        } else {
            // Tentar detectar script UTMify
            const utmifyScript = document.querySelector('script[src*="utm.io"], script[src*="utmify"]');
            if (utmifyScript) {
                UTMIFY_LEAD_CONFIG.utmify.enabled = true;
                log('🎯 Script UTMify detectado');
            } else {
                log('⚠️ UTMify não detectado, funcionando em modo standalone');
            }
        }
    }

    /**
     * Inicializa Session ID compatível com UTMify
     */
    function initSessionId() {
        // Tentar usar session ID do UTMify primeiro
        if (window.utmify && window.utmify.getSessionId) {
            sessionId = window.utmify.getSessionId();
        }
        
        // Se não encontrou, usar nosso próprio sistema
        if (!sessionId) {
            sessionId = sessionStorage.getItem('utmifyLeadTracker_sessionId');
            
            if (!sessionId) {
                sessionId = generateUTMifySessionId();
                sessionStorage.setItem('utmifyLeadTracker_sessionId', sessionId);
            }
        }
        
        log('📋 Session ID:', sessionId);
    }

    /**
     * Gera Session ID compatível com padrões UTMify
     */
    function generateUTMifySessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `utmify_lead_${timestamp}_${random}`;
    }

    /**
     * Captura dados UTM compatíveis com UTMify
     */
    function captureUTMifyData() {
        // Parâmetros UTM padrão
        const utmParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 
            'utm_term', 'utm_content', 'utm_id'
        ];
        
        // Parâmetros adicionais para UTMify
        const additionalParams = [
            'gclid', 'fbclid', 'msclkid', // IDs de clique
            'ref', 'referrer', 'source' // Referências alternativas
        ];
        
        const allParams = [...utmParams, ...additionalParams];
        const urlParams = new URLSearchParams(window.location.search);
        
        // Capturar da URL
        allParams.forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                utmData[param] = value;
                // Persistir no localStorage com prefixo UTMify
                localStorage.setItem(`utmify_${param}`, value);
                localStorage.setItem(`utmify_${param}_timestamp`, Date.now().toString());
            } else {
                // Recuperar do localStorage (com expiração de 30 dias)
                const savedValue = localStorage.getItem(`utmify_${param}`);
                const savedTimestamp = localStorage.getItem(`utmify_${param}_timestamp`);
                
                if (savedValue && savedTimestamp) {
                    const age = Date.now() - parseInt(savedTimestamp);
                    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
                    
                    if (age < maxAge) {
                        utmData[param] = savedValue;
                    } else {
                        // Limpar dados expirados
                        localStorage.removeItem(`utmify_${param}`);
                        localStorage.removeItem(`utmify_${param}_timestamp`);
                    }
                }
            }
        });
        
        // Dados de contexto para UTMify
        utmData.page_url = window.location.href;
        utmData.page_title = document.title;
        utmData.referrer = document.referrer || 'direct';
        utmData.user_agent = navigator.userAgent;
        utmData.screen_resolution = `${screen.width}x${screen.height}`;
        utmData.viewport_size = `${window.innerWidth}x${window.innerHeight}`;
        utmData.language = navigator.language;
        utmData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        utmData.timestamp = new Date().toISOString();
        
        // Tentar obter dados do UTMify se disponível
        if (window.utmify && window.utmify.getData) {
            const utmifyData = window.utmify.getData();
            Object.assign(utmData, utmifyData);
        }
        
        log('🎯 Dados UTM/UTMify capturados:', utmData);
    }

    /**
     * Monitora formulários existentes
     */
    function monitorExistingForms() {
        UTMIFY_LEAD_CONFIG.formSelectors.forEach(selector => {
            const forms = document.querySelectorAll(selector);
            forms.forEach(form => {
                if (!formsMonitored.has(form)) {
                    setupFormMonitoring(form);
                }
            });
        });
    }

    /**
     * Observa novos formulários
     */
    function observeNewForms() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        UTMIFY_LEAD_CONFIG.formSelectors.forEach(selector => {
                            if (node.matches && node.matches(selector)) {
                                if (!formsMonitored.has(node)) {
                                    setupFormMonitoring(node);
                                }
                            }
                            
                            const forms = node.querySelectorAll ? node.querySelectorAll(selector) : [];
                            forms.forEach(form => {
                                if (!formsMonitored.has(form)) {
                                    setupFormMonitoring(form);
                                }
                            });
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Configura monitoramento de formulário
     */
    function setupFormMonitoring(form) {
        log('📝 Monitorando formulário para UTMify:', form);
        formsMonitored.add(form);
        
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Evento de foco (início de preenchimento)
            if (UTMIFY_LEAD_CONFIG.captureOnFocus) {
                input.addEventListener('focus', () => handleFieldFocus(input, form));
            }
            
            // Eventos de mudança
            if (UTMIFY_LEAD_CONFIG.captureOnChange) {
                input.addEventListener('input', () => handleFieldChange(input, form));
                input.addEventListener('change', () => handleFieldChange(input, form));
            }
            
            // Evento de blur
            if (UTMIFY_LEAD_CONFIG.captureOnBlur) {
                input.addEventListener('blur', () => handleFieldBlur(input, form));
            }
        });
        
        // Submit do formulário
        if (UTMIFY_LEAD_CONFIG.captureOnSubmit) {
            form.addEventListener('submit', (e) => handleFormSubmit(e, form));
        }
    }

    /**
     * Manipula foco em campo (início de preenchimento)
     */
    function handleFieldFocus(input, form) {
        if (!formStarted) {
            formStarted = true;
            trackUTMifyEvent('form_started', {
                form_id: form.id || 'unknown',
                first_field: input.name || input.id || 'unknown'
            });
        }
    }

    /**
     * Manipula mudanças em campos
     */
    function handleFieldChange(input, form) {
        const fieldData = extractFieldData(input);
        
        if (fieldData.type && fieldData.value) {
            capturedData[fieldData.type] = fieldData.value;
            fieldProgress[fieldData.type] = true;
            
            log('📊 Campo capturado:', fieldData.type, '=', fieldData.value);
            
            // Rastrear progresso no UTMify
            trackUTMifyEvent('form_progress', {
                field_type: fieldData.type,
                field_name: fieldData.fieldName,
                progress_percentage: calculateFormProgress(form)
            });
            
            // Enviar dados com debounce
            debouncedSendData();
        }
    }

    /**
     * Manipula blur em campo
     */
    function handleFieldBlur(input, form) {
        const fieldData = extractFieldData(input);
        
        if (fieldData.type && fieldData.value) {
            // Validação básica do campo
            const isValid = validateField(fieldData.type, fieldData.value);
            
            trackUTMifyEvent('field_completed', {
                field_type: fieldData.type,
                field_name: fieldData.fieldName,
                is_valid: isValid,
                value_length: fieldData.value.length
            });
        }
    }

    /**
     * Manipula submit do formulário
     */
    function handleFormSubmit(event, form) {
        log('🚀 Formulário submetido para UTMify:', form);
        
        const formData = extractAllFormData(form);
        Object.assign(capturedData, formData);
        
        // Rastrear conclusão no UTMify
        trackUTMifyEvent('form_completed', {
            form_id: form.id || 'unknown',
            fields_completed: Object.keys(capturedData).length,
            completion_percentage: 100
        });
        
        // Enviar dados imediatamente
        sendLeadData(true);
    }

    /**
     * Extrai dados de campo
     */
    function extractFieldData(input) {
        const fieldName = (input.name || input.id || '').toLowerCase();
        const fieldValue = input.value.trim();
        
        for (const [type, patterns] of Object.entries(UTMIFY_LEAD_CONFIG.fieldMappings)) {
            if (patterns.some(pattern => fieldName.includes(pattern))) {
                return {
                    type: type,
                    value: fieldValue,
                    fieldName: fieldName,
                    element: input.tagName.toLowerCase(),
                    inputType: input.type
                };
            }
        }
        
        // Detecção por tipo de input
        if (input.type === 'email') {
            return { type: 'email', value: fieldValue, fieldName: fieldName };
        }
        if (input.type === 'tel') {
            return { type: 'phone', value: fieldValue, fieldName: fieldName };
        }
        
        return { type: null, value: fieldValue, fieldName: fieldName };
    }

    /**
     * Extrai todos os dados do formulário
     */
    function extractAllFormData(form) {
        const formData = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const fieldData = extractFieldData(input);
            if (fieldData.type && fieldData.value) {
                formData[fieldData.type] = fieldData.value;
            }
        });
        
        return formData;
    }

    /**
     * Calcula progresso do formulário
     */
    function calculateFormProgress(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        const totalFields = inputs.length;
        const completedFields = Array.from(inputs).filter(input => input.value.trim()).length;
        
        return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    }

    /**
     * Validação básica de campos
     */
    function validateField(type, value) {
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'phone':
                return /[\d\s\(\)\+\-]{8,}/.test(value);
            case 'document':
                return value.replace(/\D/g, '').length >= 11;
            case 'zipcode':
                return /\d{5}-?\d{3}/.test(value);
            default:
                return value.length >= 2;
        }
    }

    /**
     * Envia dados com debounce
     */
    function debouncedSendData() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            sendLeadData(false);
        }, UTMIFY_LEAD_CONFIG.debounceTime);
    }

    /**
     * Envia dados do lead
     */
    async function sendLeadData(isSubmit = false) {
        if (Object.keys(capturedData).length === 0) {
            return;
        }
        
        const payload = {
            sessionId: sessionId,
            leadData: { ...capturedData },
            utmData: { ...utmData },
            pageData: {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            },
            eventType: isSubmit ? 'form_submit' : 'field_change',
            utmifyData: {
                enabled: UTMIFY_LEAD_CONFIG.utmify.enabled,
                formProgress: fieldProgress,
                formStarted: formStarted
            }
        };
        
        log('📤 Enviando dados para UTMify:', payload);
        
        try {
            const response = await fetch(UTMIFY_LEAD_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-UTMify-Session': sessionId
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                log('✅ Dados enviados com sucesso:', result);
                
                // Disparar eventos UTMify
                dispatchUTMifyEvents(payload);
            } else {
                log('❌ Erro ao enviar dados:', response.status, response.statusText);
            }
        } catch (error) {
            log('❌ Erro na requisição:', error);
        }
    }

    /**
     * Dispara eventos para UTMify
     */
    function dispatchUTMifyEvents(data) {
        // Evento principal para UTMify
        trackUTMifyEvent('lead_captured', {
            sessionId: data.sessionId,
            leadData: data.leadData,
            utmData: data.utmData,
            eventType: data.eventType
        });
        
        // Evento customizado para desenvolvedores
        const customEvent = new CustomEvent('utmifyLeadCaptured', {
            detail: data
        });
        window.dispatchEvent(customEvent);
        
        // Disponibilizar no objeto global
        if (!window.UTMifyLeadTracker) {
            window.UTMifyLeadTracker = {};
        }
        
        window.UTMifyLeadTracker.lastCapture = {
            timestamp: new Date().toISOString(),
            data: data
        };
        
        log('🎯 Eventos UTMify disparados');
    }

    /**
     * Rastreia evento no UTMify
     */
    function trackUTMifyEvent(eventName, eventData = {}) {
        const fullEventData = {
            ...eventData,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            page_url: window.location.href
        };
        
        // Enviar para UTMify se disponível
        if (window.utmify && typeof window.utmify.track === 'function') {
            window.utmify.track(eventName, fullEventData);
        }
        
        // Enviar para Google Analytics se disponível
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'UTMify Lead Tracking',
                event_label: eventName,
                custom_map: fullEventData
            });
        }
        
        log('📊 Evento UTMify rastreado:', eventName, fullEventData);
    }

    /**
     * Configura eventos globais
     */
    function setupGlobalEvents() {
        // Listener para quando UTMify carrega
        window.addEventListener('utmifyLoaded', function() {
            log('🎯 UTMify carregado, reconfiguração...');
            detectUTMify();
            captureUTMifyData();
        });
        
        // Listener para mudanças de página (SPA)
        let currentUrl = window.location.href;
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                captureUTMifyData();
                trackUTMifyEvent('page_changed', {
                    new_url: currentUrl
                });
            }
        };
        
        // Verificar mudanças de URL a cada 1 segundo
        setInterval(checkUrlChange, 1000);
    }

    /**
     * Função de log
     */
    function log(...args) {
        if (UTMIFY_LEAD_CONFIG.debug) {
            console.log('[UTMify Lead Tracker]', ...args);
        }
    }

    /**
     * API pública do UTMify Lead Tracker
     */
    window.UTMifyLeadTracker = {
        // Dados atuais
        getCurrentData: () => ({
            sessionId,
            capturedData: { ...capturedData },
            utmData: { ...utmData },
            fieldProgress: { ...fieldProgress },
            formStarted
        }),
        
        // Forçar envio
        sendData: () => sendLeadData(true),
        
        // Adicionar dados manualmente
        addData: (key, value) => {
            capturedData[key] = value;
            fieldProgress[key] = true;
            debouncedSendData();
        },
        
        // Rastrear evento customizado
        trackEvent: (eventName, eventData) => {
            trackUTMifyEvent(eventName, eventData);
        },
        
        // Configurações
        setDebug: (enabled) => {
            UTMIFY_LEAD_CONFIG.debug = enabled;
        },
        
        setEndpoint: (url) => {
            UTMIFY_LEAD_CONFIG.apiEndpoint = url;
        },
        
        // Obter dados UTM atuais
        getUTMData: () => ({ ...utmData }),
        
        // Reconfigurar UTMify
        reconfigure: () => {
            detectUTMify();
            captureUTMifyData();
        }
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUTMifyLeadTracker);
    } else {
        initUTMifyLeadTracker();
    }

    // Compatibilidade com versão anterior
    window.LeadTracker = window.UTMifyLeadTracker;

})();

/**
 * INSTRUÇÕES DE USO COM UTMIFY:
 * 
 * 1. Inclua este script após o script do UTMify:
 *    <script src="https://cdn.utm.io/utmify.js"></script>
 *    <script src="/analytics/public/utmify-lead-tracker.js"></script>
 * 
 * 2. O script detectará automaticamente o UTMify e funcionará em conjunto
 * 
 * 3. Eventos disponíveis para escutar:
 *    
 *    window.addEventListener('utmifyLeadCaptured', function(event) {
 *        const data = event.detail;
 *        console.log('Lead capturado:', data);
 *    });
 * 
 * 4. API disponível:
 *    
 *    // Ver dados capturados
 *    UTMifyLeadTracker.getCurrentData();
 *    
 *    // Adicionar dados manualmente
 *    UTMifyLeadTracker.addData('custom_field', 'valor');
 *    
 *    // Rastrear evento customizado
 *    UTMifyLeadTracker.trackEvent('custom_event', { key: 'value' });
 *    
 *    // Obter dados UTM
 *    UTMifyLeadTracker.getUTMData();
 * 
 * 5. Integração automática com:
 *    - UTMify (detecção automática)
 *    - Google Analytics (gtag)
 *    - Facebook Pixel (fbq)
 * 
 * 6. Recursos específicos para UTMify:
 *    - Rastreamento de progresso do formulário
 *    - Eventos de início, progresso e conclusão
 *    - Validação de campos em tempo real
 *    - Persistência de UTMs por 30 dias
 *    - Detecção automática de mudanças de página (SPA)
 */