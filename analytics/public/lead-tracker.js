/**
 * Lead Tracker - Sistema de Captura Automática de Dados do Checkout
 * Integração com UTMify para rastreamento completo de conversões
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuração do Lead Tracker
    const LEAD_TRACKER_CONFIG = {
        // URL do endpoint para envio dos dados
        apiEndpoint: '/api/capture-lead',
        
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
            '.order-form'
        ],
        
        // Campos de dados pessoais para capturar
        fieldMappings: {
            // Nome
            name: ['name', 'nome', 'first_name', 'firstName', 'full_name', 'fullName', 'customer_name'],
            // Email
            email: ['email', 'e-mail', 'mail', 'customer_email', 'user_email'],
            // Telefone
            phone: ['phone', 'telefone', 'tel', 'mobile', 'celular', 'whatsapp', 'customer_phone'],
            // CPF/Documento
            document: ['cpf', 'document', 'documento', 'tax_id', 'customer_document'],
            // Endereço
            address: ['address', 'endereco', 'street', 'rua', 'customer_address'],
            // Cidade
            city: ['city', 'cidade', 'customer_city'],
            // Estado
            state: ['state', 'estado', 'uf', 'customer_state'],
            // CEP
            zipcode: ['cep', 'zip', 'zipcode', 'postal_code', 'customer_zip']
        },
        
        // Configurações de captura
        captureOnChange: true,  // Capturar dados quando campos mudam
        captureOnSubmit: true,  // Capturar dados no submit
        captureOnBlur: true,    // Capturar dados quando campo perde foco
        
        // Debounce para evitar muitas requisições
        debounceTime: 1000,
        
        // Debug mode
        debug: true
    };

    // Variáveis globais
    let sessionId = null;
    let utmData = {};
    let capturedData = {};
    let debounceTimer = null;
    let formsMonitored = new Set();

    /**
     * Inicializa o Lead Tracker
     */
    function initLeadTracker() {
        log('🚀 Inicializando Lead Tracker...');
        
        // Gerar ou recuperar session ID
        initSessionId();
        
        // Capturar dados de UTM
        captureUTMData();
        
        // Monitorar formulários existentes
        monitorExistingForms();
        
        // Observar novos formulários adicionados dinamicamente
        observeNewForms();
        
        log('✅ Lead Tracker inicializado com sucesso');
    }

    /**
     * Inicializa ou recupera o Session ID
     */
    function initSessionId() {
        sessionId = sessionStorage.getItem('leadTracker_sessionId');
        
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('leadTracker_sessionId', sessionId);
        }
        
        log('📋 Session ID:', sessionId);
    }

    /**
     * Gera um Session ID único
     */
    function generateSessionId() {
        return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Captura dados de UTM da URL e localStorage
     */
    function captureUTMData() {
        // Capturar UTMs da URL atual
        const urlParams = new URLSearchParams(window.location.search);
        const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        
        utmParams.forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                utmData[param] = value;
                // Salvar no localStorage para persistir
                localStorage.setItem(`leadTracker_${param}`, value);
            } else {
                // Tentar recuperar do localStorage
                const savedValue = localStorage.getItem(`leadTracker_${param}`);
                if (savedValue) {
                    utmData[param] = savedValue;
                }
            }
        });
        
        // Capturar dados adicionais
        utmData.referrer = document.referrer || 'direct';
        utmData.landing_page = window.location.href;
        utmData.user_agent = navigator.userAgent;
        utmData.timestamp = new Date().toISOString();
        
        log('🎯 Dados UTM capturados:', utmData);
    }

    /**
     * Monitora formulários existentes na página
     */
    function monitorExistingForms() {
        LEAD_TRACKER_CONFIG.formSelectors.forEach(selector => {
            const forms = document.querySelectorAll(selector);
            forms.forEach(form => {
                if (!formsMonitored.has(form)) {
                    setupFormMonitoring(form);
                }
            });
        });
    }

    /**
     * Observa novos formulários adicionados dinamicamente
     */
    function observeNewForms() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar se o próprio node é um formulário
                        LEAD_TRACKER_CONFIG.formSelectors.forEach(selector => {
                            if (node.matches && node.matches(selector)) {
                                if (!formsMonitored.has(node)) {
                                    setupFormMonitoring(node);
                                }
                            }
                        });
                        
                        // Verificar formulários dentro do node
                        LEAD_TRACKER_CONFIG.formSelectors.forEach(selector => {
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
     * Configura monitoramento de um formulário específico
     */
    function setupFormMonitoring(form) {
        log('📝 Monitorando formulário:', form);
        formsMonitored.add(form);
        
        // Encontrar todos os campos de input relevantes
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Monitorar mudanças nos campos
            if (LEAD_TRACKER_CONFIG.captureOnChange) {
                input.addEventListener('input', () => handleFieldChange(input));
                input.addEventListener('change', () => handleFieldChange(input));
            }
            
            // Monitorar quando campo perde foco
            if (LEAD_TRACKER_CONFIG.captureOnBlur) {
                input.addEventListener('blur', () => handleFieldChange(input));
            }
        });
        
        // Monitorar submit do formulário
        if (LEAD_TRACKER_CONFIG.captureOnSubmit) {
            form.addEventListener('submit', (e) => handleFormSubmit(e, form));
        }
    }

    /**
     * Manipula mudanças em campos do formulário
     */
    function handleFieldChange(input) {
        const fieldData = extractFieldData(input);
        
        if (fieldData.type && fieldData.value) {
            capturedData[fieldData.type] = fieldData.value;
            log('📊 Campo capturado:', fieldData.type, '=', fieldData.value);
            
            // Enviar dados com debounce
            debouncedSendData();
        }
    }

    /**
     * Manipula submit do formulário
     */
    function handleFormSubmit(event, form) {
        log('🚀 Formulário submetido:', form);
        
        // Capturar todos os dados do formulário
        const formData = extractAllFormData(form);
        Object.assign(capturedData, formData);
        
        // Enviar dados imediatamente
        sendLeadData(true);
    }

    /**
     * Extrai dados de um campo específico
     */
    function extractFieldData(input) {
        const fieldName = (input.name || input.id || '').toLowerCase();
        const fieldValue = input.value.trim();
        
        // Identificar tipo do campo baseado no nome/id
        for (const [type, patterns] of Object.entries(LEAD_TRACKER_CONFIG.fieldMappings)) {
            if (patterns.some(pattern => fieldName.includes(pattern))) {
                return {
                    type: type,
                    value: fieldValue,
                    fieldName: fieldName,
                    element: input.tagName.toLowerCase()
                };
            }
        }
        
        // Se não encontrou padrão específico, tentar por tipo de input
        if (input.type === 'email') {
            return { type: 'email', value: fieldValue, fieldName: fieldName };
        }
        if (input.type === 'tel') {
            return { type: 'phone', value: fieldValue, fieldName: fieldName };
        }
        
        return { type: null, value: fieldValue, fieldName: fieldName };
    }

    /**
     * Extrai todos os dados de um formulário
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
     * Envia dados com debounce
     */
    function debouncedSendData() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            sendLeadData(false);
        }, LEAD_TRACKER_CONFIG.debounceTime);
    }

    /**
     * Envia dados do lead para o servidor
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
                referrer: document.referrer
            },
            eventType: isSubmit ? 'form_submit' : 'field_change',
            timestamp: new Date().toISOString()
        };
        
        log('📤 Enviando dados do lead:', payload);
        
        try {
            const response = await fetch(LEAD_TRACKER_CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                log('✅ Dados enviados com sucesso:', result);
                
                // Disparar evento customizado para integração com UTMify
                dispatchUTMifyEvent(payload);
            } else {
                log('❌ Erro ao enviar dados:', response.status, response.statusText);
            }
        } catch (error) {
            log('❌ Erro na requisição:', error);
        }
    }

    /**
     * Dispara evento customizado para integração com UTMify
     */
    function dispatchUTMifyEvent(data) {
        // Evento para UTMify
        const utmifyEvent = new CustomEvent('leadCaptured', {
            detail: {
                sessionId: data.sessionId,
                leadData: data.leadData,
                utmData: data.utmData,
                eventType: data.eventType
            }
        });
        
        window.dispatchEvent(utmifyEvent);
        
        // Também disponibilizar no objeto global para fácil acesso
        if (!window.LeadTracker) {
            window.LeadTracker = {};
        }
        
        window.LeadTracker.lastCapture = {
            timestamp: new Date().toISOString(),
            data: data
        };
        
        log('🎯 Evento UTMify disparado:', utmifyEvent.detail);
    }

    /**
     * Função de log com controle de debug
     */
    function log(...args) {
        if (LEAD_TRACKER_CONFIG.debug) {
            console.log('[Lead Tracker]', ...args);
        }
    }

    /**
     * API pública do Lead Tracker
     */
    window.LeadTracker = {
        // Dados atuais
        getCurrentData: () => ({
            sessionId,
            capturedData: { ...capturedData },
            utmData: { ...utmData }
        }),
        
        // Forçar envio de dados
        sendData: () => sendLeadData(true),
        
        // Adicionar dados manualmente
        addData: (key, value) => {
            capturedData[key] = value;
            debouncedSendData();
        },
        
        // Configurar debug
        setDebug: (enabled) => {
            LEAD_TRACKER_CONFIG.debug = enabled;
        },
        
        // Reconfigurar endpoint
        setEndpoint: (url) => {
            LEAD_TRACKER_CONFIG.apiEndpoint = url;
        }
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLeadTracker);
    } else {
        initLeadTracker();
    }

    // Exemplo de uso com UTMify (se disponível)
    window.addEventListener('leadCaptured', function(event) {
        const { sessionId, leadData, utmData, eventType } = event.detail;
        
        // Integração com UTMify
        if (typeof window.utmify !== 'undefined') {
            window.utmify.track('lead_captured', {
                session_id: sessionId,
                lead_data: leadData,
                utm_data: utmData,
                event_type: eventType
            });
        }
        
        // Integração com Google Analytics (se disponível)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'lead_captured', {
                session_id: sessionId,
                event_category: 'Lead Generation',
                event_label: eventType,
                custom_map: {
                    utm_source: utmData.utm_source,
                    utm_medium: utmData.utm_medium,
                    utm_campaign: utmData.utm_campaign
                }
            });
        }
        
        // Integração com Facebook Pixel (se disponível)
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
                content_name: 'Checkout Lead',
                content_category: 'Lead Generation',
                value: 1,
                currency: 'BRL'
            });
        }
    });

})();

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Inclua este script em todas as páginas de checkout:
 *    <script src="/analytics/public/lead-tracker.js"></script>
 * 
 * 2. O script funcionará automaticamente, mas você pode personalizar:
 *    
 *    // Adicionar dados manualmente
 *    LeadTracker.addData('custom_field', 'valor');
 *    
 *    // Forçar envio de dados
 *    LeadTracker.sendData();
 *    
 *    // Ver dados capturados
 *    console.log(LeadTracker.getCurrentData());
 *    
 *    // Configurar debug
 *    LeadTracker.setDebug(false);
 * 
 * 3. Para integração com UTMify, escute o evento 'leadCaptured':
 *    
 *    window.addEventListener('leadCaptured', function(event) {
 *        const data = event.detail;
 *        // Sua lógica de integração aqui
 *    });
 * 
 * 4. O script captura automaticamente:
 *    - Nome, email, telefone, CPF
 *    - Endereço, cidade, estado, CEP
 *    - Dados de UTM da URL e localStorage
 *    - Informações da sessão e página
 * 
 * 5. Os dados são enviados para /api/capture-lead
 *    (certifique-se de que o endpoint existe no servidor)
 */