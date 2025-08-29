/**
 * Facebook Pixel + Conversions API Integration
 * Sistema avançado que combina rastreamento client-side e server-side
 * com deduplicação automática de eventos
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Production Ready
 */

// Carregar variáveis de ambiente
require('dotenv').config();

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
        
        console.log('🔧 Facebook Integration inicializado (Server-Side Mode)');
        console.log(`📱 Pixel ID: ${this.pixelId}`);
        console.log(`🔑 Access Token: ${this.accessToken ? 'Configurado' : 'Não configurado'}`);
        console.log(`🖥️ Modo: Server-Side Events (action_source: server)`);
        
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
     * Verifica se um IP é do lado do cliente (não adequado para server-side)
     * IPs locais, privados ou de loopback não devem ser usados em server-side events
     */
    isClientSideIP(ip) {
        if (!ip) return true;
        
        // IPs locais/privados que indicam client-side
        const clientSidePatterns = [
            /^127\./, // localhost
            /^192\.168\./, // rede privada
            /^10\./, // rede privada
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // rede privada
            /^::1$/, // IPv6 localhost
            /^fe80:/, // IPv6 link-local
            /^fc00:/, // IPv6 unique local
        ];
        
        return clientSidePatterns.some(pattern => pattern.test(ip));
    }
    
    /**
     * Valida e formata parâmetro fbp (Facebook browser identifier)
     * NOTA: fbp não deve ser usado em server-side events pois indica presença de cookie do navegador
     * Esta função é mantida para compatibilidade mas não é usada em server-side
     */
    validateAndFormatFbp(fbp) {
        if (!fbp) return null;
        
        try {
            // Validar formato básico do fbp
            // Formato esperado: fb.subdomainIndex.creationTime.randomValue
            const fbpParts = fbp.split('.');
            
            if (fbpParts.length !== 4 || fbpParts[0] !== 'fb') {
                console.warn('⚠️ Formato fbp inválido:', fbp);
                return null;
            }
            
            // Validar se o timestamp é válido (deve ter 10 ou 13 dígitos)
            const timestamp = fbpParts[2];
            if (!/^\d{10,13}$/.test(timestamp)) {
                console.warn('⚠️ Timestamp fbp inválido:', timestamp);
                return null;
            }
            
            console.log(`🔗 FBP validado (não usado em server-side): ${fbp}`);
            return fbp;
            
        } catch (error) {
            console.error('❌ Erro ao validar FBP:', error.message);
            return null;
        }
    }
    
    /**
     * Formata parâmetro fbc (Facebook click identifier) para server-side
     * Formato: fb.subdomainIndex.creationTime.fbclid
     * Server-side: creationTime deve ser em segundos (Unix time)
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
            
            // Server-side: Timestamp atual em SEGUNDOS (Unix time)
            const creationTime = Math.floor(Date.now() / 1000);
            
            // Formato: fb.subdomainIndex.creationTime.fbclid
            const fbc = `fb.${subdomainIndex}.${creationTime}.${fbclid}`;
            
            console.log(`🔗 FBC formatado para server-side: ${fbc} (timestamp: ${creationTime}s)`);
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
     * Prepara dados do evento para Conversions API (Server-Side)
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
        
        // Para server-side events, usar dados do servidor em vez de dados do navegador
        // Adicionar IP do servidor ou proxy se disponível
        if (eventData.serverData?.ip) {
            userData.client_ip_address = eventData.serverData.ip;
        } else if (eventData.clientData?.ip && !this.isClientSideIP(eventData.clientData.ip)) {
            userData.client_ip_address = eventData.clientData.ip;
        }
        
        // Para server-side, usar user agent do servidor ou omitir
        if (eventData.serverData?.userAgent) {
            userData.client_user_agent = eventData.serverData.userAgent;
        }
        
        // Adicionar fbc (Facebook click identifier) apenas se disponível e válido
        // FBC é permitido em server-side quando há fbclid válido
        if (eventData.utmData?.fbclid) {
            userData.fbc = this.formatFbcParameter(eventData.utmData.fbclid, eventData.domain);
            console.log(`🔗 FBC adicionado para server-side: ${userData.fbc}`);
        }
        
        // REMOVIDO: fbp não deve ser enviado em server-side events
        // fbp indica presença de cookie do navegador, incompatível com server-side
        // if (eventData.clientData?.fbp) {
        //     userData.fbp = this.validateAndFormatFbp(eventData.clientData.fbp);
        // }
        
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
            action_source: 'server'
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
            
            console.log(`📤 Enviando evento SERVER-SIDE para Facebook: ${preparedEvent.event_name}`);
            console.log(`🔍 Event ID: ${preparedEvent.event_id}`);
            console.log(`🖥️ Action Source: ${preparedEvent.action_source}`);
            
            // Log detalhado para Purchase events
            if (preparedEvent.event_name === 'Purchase') {
                console.log('\n💰 === DETALHES DO EVENTO PURCHASE ===');
                console.log(`🆔 Event ID: ${preparedEvent.event_id}`);
                console.log(`🔗 FBC (Facebook Click ID): ${preparedEvent.user_data.fbc || 'Não disponível'}`);
                console.log(`🧾 Transaction ID: ${preparedEvent.custom_data.order_id || 'Não informado'}`);
                console.log(`💵 Valor: ${preparedEvent.custom_data.currency} ${preparedEvent.custom_data.value}`);
                console.log(`📦 Produtos: ${JSON.stringify(preparedEvent.custom_data.content_ids || [])}`);
                console.log(`👤 Dados do usuário: ${Object.keys(preparedEvent.user_data).filter(key => preparedEvent.user_data[key] && key !== 'fbc').join(', ')}`);
                console.log('==========================================\n');
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
                        console.log(`\n✅ === EVENTO SERVER-SIDE ENVIADO COM SUCESSO ===`);
                        console.log(`📝 Evento: ${preparedEvent.event_name}`);
                        console.log(`🆔 Event ID: ${preparedEvent.event_id}`);
                        console.log(`🔗 Facebook Trace ID: ${response.data.fbtrace_id}`);
                        console.log(`📊 Eventos recebidos: ${response.data.events_received}`);
                        console.log(`🔄 Tentativa: ${attempt}/${maxRetries}`);
                        console.log(`🖥️ Modo: Server-Side (${preparedEvent.action_source})`);
                        
                        // Log específico para Purchase
                        if (preparedEvent.event_name === 'Purchase') {
                            console.log(`💰 Purchase processado com sucesso!`);
                            console.log(`🧾 Transaction ID: ${preparedEvent.custom_data.order_id}`);
                            console.log(`🔗 FBC enviado: ${preparedEvent.user_data.fbc ? 'Sim' : 'Não'}`);
                        }
                        
                        console.log('=====================================\n');
                        
                        return {
                            success: true,
                            eventId: preparedEvent.event_id,
                            facebookEventId: response.data.fbtrace_id,
                            eventsReceived: response.data.events_received,
                            attempt: attempt,
                            eventName: preparedEvent.event_name,
                            transactionId: preparedEvent.custom_data.order_id,
                            fbcSent: !!preparedEvent.user_data.fbc
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
     * Valida token de acesso do Facebook com verificações robustas
     * CORREÇÃO: Melhor validação e tratamento de erros
     */
    async validateAccessToken() {
        if (!this.accessToken) {
            console.error('❌ FACEBOOK_ACCESS_TOKEN não configurado no arquivo .env');
            console.error('📋 Configure a variável FACEBOOK_ACCESS_TOKEN com um System User Token válido do Business Manager');
            return false;
        }

        try {
            console.log('🔍 Validando token do Facebook...');
            
            // Verificar se o token é válido e tem as permissões necessárias
            const response = await this.httpClient.get(
                `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${this.accessToken}`
            );
            
            if (response.status === 200 && response.data.id) {
                console.log(`✅ Token válido - User ID: ${response.data.id}`);
                
                // Verificar se o token tem acesso ao pixel
                try {
                    const pixelResponse = await this.httpClient.get(
                        `https://graph.facebook.com/v18.0/${this.pixelId}?fields=id,name&access_token=${this.accessToken}`
                    );
                    
                    if (pixelResponse.status === 200) {
                        console.log(`✅ Token tem acesso ao Pixel ID: ${this.pixelId}`);
                        return true;
                    }
                } catch (pixelError) {
                    console.error('❌ Token não tem acesso ao Pixel especificado');
                    console.error('📋 Verifique se o System User Token está vinculado ao Pixel no Business Manager');
                    return false;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Erro na validação do token do Facebook:');
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                switch (status) {
                    case 400:
                        console.error('📋 Erro 400: Token malformado ou inválido');
                        console.error('💡 Verifique se o FACEBOOK_ACCESS_TOKEN está correto');
                        break;
                    case 401:
                        console.error('📋 Erro 401: Token não autorizado ou expirado');
                        console.error('💡 Gere um novo System User Token no Business Manager');
                        break;
                    case 403:
                        console.error('📋 Erro 403: Token sem permissões necessárias');
                        console.error('💡 Verifique se o token tem permissões de ads_management');
                        break;
                    default:
                        console.error(`📋 Erro ${status}: ${errorData?.error?.message || error.message}`);
                }
                
                if (errorData?.error) {
                    console.error('🔍 Detalhes do erro:', errorData.error);
                }
            } else {
                console.error('📋 Erro de conexão:', error.message);
            }
            
            console.error('\n📖 Como corrigir:');
            console.error('1. Acesse https://business.facebook.com/');
            console.error('2. Vá em Configurações > Usuários > Usuários do Sistema');
            console.error('3. Gere um novo token com permissões ads_management');
            console.error('4. Vincule o token ao Pixel no Business Manager');
            console.error('5. Atualize a variável FACEBOOK_ACCESS_TOKEN no .env');
            
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
     * Função específica para envio de eventos InitiateCheckout
     * NOVA: Função otimizada para server-side com action_source 'server'
     */
    async sendInitiateCheckoutEvent(eventData) {
        try {
            console.log('[FACEBOOK] Iniciando envio de evento InitiateCheckout server-side');
            
            // Converter estrutura de dados do middleware para formato da API
            const convertedEventData = {
                sessionId: eventData.session_id,
                eventName: 'InitiateCheckout',
                pageUrl: eventData.page_url,
                customerData: {
                    email: eventData.user_data?.em?.[0],
                    phone: eventData.user_data?.ph?.[0],
                    firstName: eventData.user_data?.fn?.[0],
                    lastName: eventData.user_data?.ln?.[0],
                    externalId: eventData.user_data?.external_id
                },
                customData: {
                    content_type: eventData.custom_data?.content_type,
                    currency: eventData.custom_data?.currency,
                    value: eventData.custom_data?.value,
                    content_ids: eventData.custom_data?.content_ids,
                    num_items: eventData.custom_data?.num_items
                },
                utmData: {
                    fbclid: eventData.fbc ? eventData.fbc.split('.').pop() : undefined
                },
                clientIpAddress: eventData.client_ip_address,
                clientUserAgent: eventData.client_user_agent,
                referrer: eventData.referrer
            };
            
            // Garantir que fbc está presente se fbclid foi fornecido
            if (eventData.fbc) {
                console.log('[FACEBOOK] Facebook Click ID (fbc) incluído:', eventData.fbc);
            }
            
            // Validar dados essenciais
            if (!convertedEventData.sessionId) {
                throw new Error('Session ID é obrigatório para InitiateCheckout');
            }
            
            // Log das configurações server-side
            console.log('[FACEBOOK] Configurações server-side:', {
                action_source: 'server',
                has_fbc: !!eventData.fbc,
                has_user_data: !!(convertedEventData.customerData.email || convertedEventData.customerData.phone),
                has_custom_data: !!convertedEventData.customData.value,
                session_id: convertedEventData.sessionId,
                page_url: convertedEventData.pageUrl
            });
            
            // Processar evento
            const result = await this.processEvent(convertedEventData);
            
            console.log('[FACEBOOK] Evento InitiateCheckout server-side enviado com sucesso:', {
                eventId: result.eventId,
                sessionId: convertedEventData.sessionId,
                pageUrl: convertedEventData.pageUrl,
                has_user_data: !!(convertedEventData.customerData.email || convertedEventData.customerData.phone),
                custom_data_value: convertedEventData.customData.value,
                fbc_sent: !!eventData.fbc
            });
            
            return result;
        } catch (error) {
            console.error('[FACEBOOK] Erro ao enviar evento InitiateCheckout:', error);
            throw error;
        }
    }

    /**
     * Função específica para envio de eventos Purchase
     * NOVA: Função otimizada com validações e logs específicos
     */
    async sendPurchaseEvent(purchaseData) {
        console.log('\n🛒 === PROCESSANDO EVENTO PURCHASE ===');
        
        try {
            // Validações específicas para Purchase
            if (!purchaseData.transactionId) {
                throw new Error('transactionId é obrigatório para eventos Purchase');
            }
            
            if (!purchaseData.value || parseFloat(purchaseData.value) <= 0) {
                throw new Error('value deve ser maior que 0 para eventos Purchase');
            }
            
            if (!purchaseData.customerData || (!purchaseData.customerData.email && !purchaseData.customerData.phone)) {
                throw new Error('email ou phone do cliente é obrigatório para eventos Purchase');
            }
            
            // Preparar dados do evento
            const eventData = {
                ...purchaseData,
                eventName: 'Purchase'
            };
            
            console.log('✅ Validações do Purchase aprovadas');
            console.log(`🧾 Transaction ID: ${purchaseData.transactionId}`);
            console.log(`💵 Valor: ${purchaseData.value}`);
            console.log(`📧 Email: ${purchaseData.customerData.email ? 'Presente' : 'Ausente'}`);
            console.log(`📱 Telefone: ${purchaseData.customerData.phone ? 'Presente' : 'Ausente'}`);
            console.log(`🔗 FBCLID: ${purchaseData.utmData?.fbclid ? 'Presente' : 'Ausente'}`);
            
            // Enviar evento
            const result = await this.sendToConversionsAPI(eventData);
            
            if (result.success) {
                console.log('\n🎉 === PURCHASE ENVIADO COM SUCESSO ===');
                console.log(`🆔 Event ID: ${result.eventId}`);
                console.log(`🔗 Facebook Trace ID: ${result.facebookEventId}`);
                console.log(`🧾 Transaction ID: ${result.transactionId}`);
                console.log(`📊 FBC enviado: ${result.fbcSent ? 'Sim' : 'Não'}`);
                console.log('=========================================\n');
            } else {
                console.error('\n❌ === FALHA NO ENVIO DO PURCHASE ===');
                console.error(`🚫 Erro: ${result.error}`);
                console.error(`🧾 Transaction ID: ${purchaseData.transactionId}`);
                console.error('====================================\n');
            }
            
            return result;
            
        } catch (error) {
            console.error('\n❌ === ERRO NO PROCESSAMENTO DO PURCHASE ===');
            console.error(`🚫 Erro: ${error.message}`);
            console.error(`🧾 Transaction ID: ${purchaseData.transactionId || 'Não informado'}`);
            console.error('===========================================\n');
            
            return {
                success: false,
                error: error.message,
                transactionId: purchaseData.transactionId
            };
        }
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