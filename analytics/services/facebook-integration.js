/**
 * Facebook Pixel + Conversions API Integration
 * Sistema avançado que combina rastreamento client-side e server-side
 * com deduplicação automática de eventos
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Production Ready
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/facebook-config');

class FacebookIntegration {
    constructor() {
        this.pixelId = config.PIXEL_ID;
        this.accessToken = config.ACCESS_TOKEN;
        this.testEventCode = config.TEST_EVENT_CODE;
        this.apiUrl = `${config.CONVERSIONS_API_URL}/${this.pixelId}/events`;
        
        // Cache para deduplicação
        this.eventCache = new Map();
        
        // Configurar axios com timeout
        this.httpClient = axios.create({
            timeout: config.API_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'FunilSpy-Facebook-Integration/1.0'
            }
        });
        
        console.log('🔧 Facebook Integration inicializado');
        console.log(`📱 Pixel ID: ${this.pixelId}`);
        console.log(`🔑 Access Token: ${this.accessToken ? 'Configurado' : 'Não configurado'}`);
        
        // Validar token na inicialização
        this.initializeAndValidate();
    }
    
    /**
     * Inicializa e valida configurações
     */
    async initializeAndValidate() {
        try {
            const configValidation = this.validateConfig();
            if (!configValidation.valid) {
                console.error('❌ Configuração do Facebook inválida:', configValidation.errors);
                return;
            }
            
            const tokenValid = await this.validateAccessToken();
            if (tokenValid) {
                console.log('✅ Token de acesso do Facebook validado com sucesso');
            } else {
                console.error('❌ Token de acesso do Facebook inválido ou expirado');
            }
        } catch (error) {
            console.error('❌ Erro na validação inicial do Facebook:', error.message);
        }
    }
    
    /**
     * Formata parâmetro fbc (Facebook click identifier)
     * Formato: fb.subdomainIndex.creationTime.fbclid
     */
    formatFbcParameter(fbclid, domain = null) {
        if (!fbclid) return null;
        
        try {
            // Determinar subdomain index
            let subdomainIndex = 1; // default para example.com
            
            if (domain) {
                const parts = domain.split('.');
                if (parts.length === 2) {
                    subdomainIndex = 1; // example.com
                } else if (parts.length === 3) {
                    subdomainIndex = 2; // www.example.com
                } else {
                    subdomainIndex = 0; // .com
                }
            }
            
            // Timestamp atual em milliseconds
            const creationTime = Date.now();
            
            // Formato: fb.subdomainIndex.creationTime.fbclid
            const fbc = `fb.${subdomainIndex}.${creationTime}.${fbclid}`;
            
            console.log(`🔗 FBC formatado: ${fbc}`);
            return fbc;
            
        } catch (error) {
            console.error('❌ Erro ao formatar FBC:', error.message);
            return null;
        }
    }
    
    /**
     * Hash de dados sensíveis do cliente (SHA256)
     */
    hashCustomerData(data) {
        if (!data || !config.CUSTOMER_DATA_HASHING.enabled) {
            return data;
        }
        
        const hash = (value) => {
            if (!value) return null;
            return crypto.createHash('sha256')
                .update(value.toString().toLowerCase().trim())
                .digest('hex');
        };
        
        return {
            em: hash(data.email), // email
            ph: hash(data.phone), // phone
            fn: hash(data.firstName), // first name
            ln: hash(data.lastName), // last name
            db: hash(data.dateOfBirth), // date of birth
            ge: hash(data.gender), // gender
            ct: hash(data.city), // city
            st: hash(data.state), // state
            zp: hash(data.zipCode), // zip code
            country: hash(data.country) // country
        };
    }
    
    /**
     * Gera ID único para evento (deduplicação)
     */
    generateEventId(sessionId, eventName, timestamp) {
        const baseString = `${sessionId}_${eventName}_${Math.floor(timestamp / 1000)}`;
        return crypto.createHash('md5').update(baseString).digest('hex');
    }
    
    /**
     * Verifica se evento já foi processado (deduplicação)
     */
    isDuplicateEvent(eventId) {
        if (!config.DEDUPLICATION.enabled) {
            return false;
        }
        
        const now = Date.now();
        const windowMs = config.DEDUPLICATION.window_hours * 60 * 60 * 1000;
        
        // Limpar cache antigo
        for (const [id, timestamp] of this.eventCache.entries()) {
            if (now - timestamp > windowMs) {
                this.eventCache.delete(id);
            }
        }
        
        // Verificar se evento existe
        if (this.eventCache.has(eventId)) {
            return true;
        }
        
        // Adicionar ao cache
        this.eventCache.set(eventId, now);
        return false;
    }
    
    /**
     * Prepara dados do evento para Conversions API
     */
    prepareEventData(eventData) {
        const timestamp = Math.floor(Date.now() / 1000);
        const eventId = this.generateEventId(
            eventData.sessionId, 
            eventData.eventName, 
            timestamp * 1000
        );
        
        // Verificar deduplicação
        if (this.isDuplicateEvent(eventId)) {
            console.log(`🔄 Evento duplicado ignorado: ${eventId}`);
            return null;
        }
        
        // Mapear nome do evento
        const facebookEventName = config.CUSTOM_EVENT_MAPPING[eventData.eventName] || 
                                 eventData.eventName;
        
        // Preparar dados do usuário
        const userData = this.hashCustomerData({
            email: eventData.customerData?.email,
            phone: eventData.customerData?.phone,
            firstName: eventData.customerData?.name?.split(' ')[0],
            lastName: eventData.customerData?.name?.split(' ').slice(1).join(' '),
            city: eventData.customerData?.city,
            state: eventData.customerData?.state,
            zipCode: eventData.customerData?.zipCode,
            country: eventData.customerData?.country || 'BR'
        });
        
        // Adicionar client_ip_address e client_user_agent se disponíveis
        if (eventData.clientData?.ip) {
            userData.client_ip_address = eventData.clientData.ip;
        }
        
        if (eventData.clientData?.userAgent) {
            userData.client_user_agent = eventData.clientData.userAgent;
        }
        
        // Adicionar fbc (Facebook click identifier) se disponível
        if (eventData.utmData?.fbclid) {
            userData.fbc = this.formatFbcParameter(eventData.utmData.fbclid, eventData.domain);
        }
        
        // Preparar dados customizados
        const customData = {
            currency: 'BRL',
            value: parseFloat(eventData.value || 0),
            content_type: 'product'
        };
        
        // Adicionar order_id se disponível (obrigatório para Purchase)
        if (eventData.transactionId) {
            customData.order_id = eventData.transactionId;
        }
        
        // Adicionar dados específicos do produto
        if (eventData.productData) {
            customData.content_ids = [eventData.productData.id];
            customData.content_name = eventData.productData.name;
            customData.content_category = eventData.productData.category;
            customData.contents = [{
                id: eventData.productData.id,
                quantity: 1,
                item_price: parseFloat(eventData.productData.price || 0)
            }];
        }
        
        // Adicionar UTM parameters como custom data
        if (eventData.utmData) {
            customData.utm_source = eventData.utmData.utm_source;
            customData.utm_medium = eventData.utmData.utm_medium;
            customData.utm_campaign = eventData.utmData.utm_campaign;
            customData.utm_term = eventData.utmData.utm_term;
            customData.utm_content = eventData.utmData.utm_content;
        }
        
        return {
            event_name: facebookEventName,
            event_time: timestamp,
            event_id: eventId,
            event_source_url: eventData.pageUrl,
            user_data: userData,
            custom_data: customData,
            action_source: 'website'
        };
    }
    
    /**
     * Envia evento para Conversions API com retry automático
     */
    async sendToConversionsAPI(eventData) {
        try {
            const preparedEvent = this.prepareEventData(eventData);
            
            if (!preparedEvent) {
                return { success: true, message: 'Evento duplicado ignorado' };
            }
            
            const payload = {
                data: [preparedEvent],
                test_event_code: this.testEventCode || undefined
            };
            
            console.log(`📤 Enviando evento para Facebook: ${preparedEvent.event_name}`);
            console.log(`🔍 Event ID: ${preparedEvent.event_id}`);
            
            // Log detalhado para Purchase events
            if (preparedEvent.event_name === 'Purchase') {
                console.log(`💰 Purchase Details:`, {
                    value: preparedEvent.custom_data.value,
                    currency: preparedEvent.custom_data.currency,
                    order_id: preparedEvent.custom_data.order_id,
                    content_ids: preparedEvent.custom_data.content_ids
                });
            }
            
            // Implementar retry automático
            const maxRetries = config.MAX_RETRIES || 3;
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await this.httpClient.post(
                        `${this.apiUrl}?access_token=${this.accessToken}`,
                        payload
                    );
                    
                    if (response.data.events_received === 1) {
                        console.log(`✅ Evento enviado com sucesso: ${preparedEvent.event_name} (tentativa ${attempt})`);
                        console.log(`🔗 Facebook Trace ID: ${response.data.fbtrace_id}`);
                        
                        return {
                            success: true,
                            eventId: preparedEvent.event_id,
                            facebookEventId: response.data.fbtrace_id,
                            eventsReceived: response.data.events_received,
                            attempt: attempt
                        };
                    } else {
                        throw new Error('Evento não foi recebido pelo Facebook');
                    }
                    
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < maxRetries) {
                        const delay = 1000 * attempt; // Delay progressivo
                        console.log(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            // Se chegou aqui, todas as tentativas falharam
            throw lastError;
            
        } catch (error) {
            console.error('❌ Erro ao enviar evento para Facebook:', error.message);
            
            // Log detalhado do erro
            if (error.response) {
                console.error('📋 Resposta do Facebook:', error.response.data);
            }
            
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }
    
    /**
     * Gera código JavaScript para Pixel (client-side)
     */
    generatePixelCode(eventData) {
        const preparedEvent = this.prepareEventData(eventData);
        
        if (!preparedEvent) {
            return null;
        }
        
        const facebookEventName = preparedEvent.event_name;
        const customData = preparedEvent.custom_data;
        const eventId = preparedEvent.event_id;
        
        return {
            eventName: facebookEventName,
            parameters: {
                ...customData,
                eventID: eventId // Para deduplicação
            },
            eventId: eventId
        };
    }
    
    /**
     * Valida parâmetros obrigatórios para evento Purchase
     */
    validatePurchaseEvent(eventData) {
        const errors = [];
        
        // Parâmetros obrigatórios para Purchase
        if (!eventData.eventName || eventData.eventName !== 'Purchase') {
            errors.push('eventName deve ser "Purchase"');
        }
        
        if (!eventData.value || parseFloat(eventData.value) <= 0) {
            errors.push('value é obrigatório e deve ser maior que 0');
        }
        
        if (!eventData.transactionId) {
            errors.push('transactionId é obrigatório para eventos Purchase');
        }
        
        // Validar dados do usuário (pelo menos um campo deve estar presente)
        const hasUserData = eventData.customerData && (
            eventData.customerData.email ||
            eventData.customerData.phone ||
            eventData.customerData.firstName ||
            eventData.customerData.lastName
        );
        
        if (!hasUserData) {
            errors.push('Pelo menos um dado do usuário (email, phone, firstName, lastName) é obrigatório');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Processa evento completo (Pixel + Conversions API)
     */
    async processEvent(eventData) {
        const results = {
            pixel: null,
            conversionsAPI: null,
            eventId: null
        };
        
        try {
            console.log(`🎯 Processando evento: ${eventData.eventName}`);
            
            // Validar dados básicos
            if (!eventData.eventName) {
                throw new Error('Nome do evento é obrigatório');
            }
            
            // Validação específica para Purchase
            if (eventData.eventName === 'Purchase') {
                const purchaseValidation = this.validatePurchaseEvent(eventData);
                if (!purchaseValidation.valid) {
                    throw new Error(`Validação Purchase falhou: ${purchaseValidation.errors.join(', ')}`);
                }
                console.log('✅ Evento Purchase validado com sucesso');
            }
            
            // Gerar código para Pixel
            const pixelCode = this.generatePixelCode(eventData);
            if (pixelCode) {
                results.pixel = pixelCode;
                results.eventId = pixelCode.eventId;
            }
            
            // Enviar para Conversions API
            const apiResult = await this.sendToConversionsAPI(eventData);
            results.conversionsAPI = apiResult;
            
            return results;
            
        } catch (error) {
            console.error('❌ Erro ao processar evento Facebook:', error);
            return {
                ...results,
                error: error.message
            };
        }
    }
    
    /**
     * Valida token de acesso do Facebook
     */
    async validateAccessToken() {
        try {
            const response = await this.httpClient.get(
                `https://graph.facebook.com/v18.0/me?access_token=${this.accessToken}`
            );
            return response.status === 200;
        } catch (error) {
            console.error('❌ Token de acesso inválido:', error.message);
            return false;
        }
    }
    
    /**
     * Valida configuração
     */
    validateConfig() {
        const errors = [];
        
        if (!this.pixelId) {
            errors.push('FACEBOOK_PIXEL_ID não configurado');
        }
        
        if (!this.accessToken) {
            errors.push('FACEBOOK_ACCESS_TOKEN não configurado');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Testa conexão com Facebook
     */
    async testConnection() {
        try {
            const testEvent = {
                sessionId: 'test_session',
                eventName: 'PageView',
                pageUrl: 'https://test.com',
                customerData: {
                    email: 'test@example.com'
                },
                utmData: {
                    utm_source: 'test',
                    utm_medium: 'test'
                }
            };
            
            const result = await this.sendToConversionsAPI(testEvent);
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = FacebookIntegration;