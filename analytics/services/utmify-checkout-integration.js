/**
 * Integração UTMify + Facebook Conversions API para Checkout
 * Coleta dados do checkout, parâmetros UTM via UTMify e envia para Facebook CAPI
 */

const crypto = require('crypto');
const axios = require('axios');
const FacebookIntegration = require('./facebook-integration');

class UTMifyCheckoutIntegration {
    constructor() {
        this.facebookIntegration = new FacebookIntegration();
        this.pixelId = process.env.FACEBOOK_PIXEL_ID;
        this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
        this.apiVersion = 'v18.0';
        this.endpoint = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`;
    }

    /**
     * Coleta dados do lead no checkout
     */
    collectCheckoutData(checkoutData) {
        return {
            name: checkoutData.name || '',
            email: checkoutData.email || '',
            phone: checkoutData.phone || '',
            purchase_value: parseFloat(checkoutData.total) || 0
        };
    }

    /**
     * Captura parâmetros UTM via UTMify
     */
    captureUTMParameters(utmData) {
        return {
            utm_source: utmData.source || '',
            utm_medium: utmData.medium || '',
            utm_campaign: utmData.campaign || '',
            utm_content: utmData.content || '',
            utm_term: utmData.term || ''
        };
    }

    /**
     * Hash de dados do usuário para Facebook CAPI
     */
    hashUserData(data) {
        const hash = (value) => {
            if (!value) return null;
            return crypto.createHash('sha256')
                .update(value.toString().toLowerCase().trim())
                .digest('hex');
        };

        return {
            em: hash(data.email),
            ph: hash(data.phone?.replace(/\D/g, '')), // Remove caracteres não numéricos
            fn: hash(data.name?.split(' ')[0]) // Primeiro nome apenas
        };
    }

    /**
     * Prepara payload para Facebook Conversions API
     */
    prepareFacebookPayload(checkoutData, utmData, options = {}) {
        const userData = this.collectCheckoutData(checkoutData);
        const utmParams = this.captureUTMParameters(utmData);
        const hashedUserData = this.hashUserData(userData);
        
        const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp em segundos
        const eventId = this.facebookIntegration.generateEventId();

        const payload = {
            data: [
                {
                    event_name: 'Purchase',
                    event_time: eventTime,
                    event_id: eventId,
                    user_data: {
                        em: hashedUserData.em,
                        ph: hashedUserData.ph,
                        fn: hashedUserData.fn
                    },
                    custom_data: {
                        currency: options.currency || 'BRL',
                        value: userData.purchase_value,
                        content_name: options.contentName || 'Checkout Lead',
                        content_category: options.contentCategory || 'Lead',
                        utm_source: utmParams.utm_source,
                        utm_medium: utmParams.utm_medium,
                        utm_campaign: utmParams.utm_campaign,
                        utm_content: utmParams.utm_content,
                        utm_term: utmParams.utm_term
                    },
                    action_source: 'website'
                }
            ],
            access_token: this.accessToken
        };

        // Adicionar fbc se disponível
        if (options.fbclid) {
            const fbc = this.facebookIntegration.formatFbcParameter(options.fbclid);
            payload.data[0].user_data.fbc = fbc;
        }

        return { payload, eventId, userData, utmParams };
    }

    /**
     * Envia dados para Facebook Conversions API
     */
    async sendToFacebookCAPI(checkoutData, utmData, options = {}) {
        try {
            console.log('🚀 Iniciando envio para Facebook Conversions API...');
            
            // Preparar payload
            const { payload, eventId, userData, utmParams } = this.prepareFacebookPayload(checkoutData, utmData, options);
            
            console.log('📊 Dados do Checkout:', {
                name: userData.name,
                email: userData.email ? `${userData.email.substring(0, 3)}***` : 'N/A',
                phone: userData.phone ? `${userData.phone.substring(0, 3)}***` : 'N/A',
                value: userData.purchase_value
            });
            
            console.log('🎯 Parâmetros UTM:', utmParams);
            console.log('🔑 Event ID:', eventId);
            
            if (payload.data[0].user_data.fbc) {
                console.log('🔗 FBC Parameter:', payload.data[0].user_data.fbc);
            }

            // Enviar para Facebook
            const response = await axios.post(this.endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            // Validar resposta
            const isSuccess = this.validateFacebookResponse(response.data);
            
            if (isSuccess) {
                console.log('✅ Evento Purchase enviado com sucesso!');
                console.log('📈 Resposta Facebook:', {
                    events_received: response.data.events_received,
                    fbtrace_id: response.data.fbtrace_id || 'N/A'
                });
                
                return {
                    success: true,
                    eventId,
                    response: response.data,
                    userData: {
                        email_sent: !!userData.email,
                        phone_sent: !!userData.phone,
                        name_sent: !!userData.name
                    },
                    utmParams,
                    fbc_sent: !!payload.data[0].user_data.fbc
                };
            } else {
                throw new Error('Resposta inválida do Facebook');
            }
            
        } catch (error) {
            console.error('❌ Erro ao enviar para Facebook CAPI:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                eventId
            });
            
            return {
                success: false,
                error: error.message,
                eventId,
                status: error.response?.status,
                facebookError: error.response?.data
            };
        }
    }

    /**
     * Valida resposta do Facebook
     */
    validateFacebookResponse(responseData) {
        // Resposta esperada: {"events_received":1}
        return responseData && 
               typeof responseData.events_received === 'number' && 
               responseData.events_received > 0;
    }

    /**
     * Função principal para processar checkout completo
     */
    async processCheckout(data) {
        const {
            checkout = {},
            utm = {},
            options = {}
        } = data;

        console.log('🛒 Processando checkout com UTMify + Facebook CAPI...');
        
        // Validações básicas
        if (!checkout.email && !checkout.phone) {
            throw new Error('Email ou telefone são obrigatórios para envio ao Facebook');
        }
        
        if (!checkout.total || parseFloat(checkout.total) <= 0) {
            throw new Error('Valor da compra deve ser maior que zero');
        }

        // Enviar para Facebook CAPI
        const result = await this.sendToFacebookCAPI(checkout, utm, options);
        
        if (result.success) {
            console.log('🎉 Checkout processado com sucesso!');
        } else {
            console.error('💥 Falha no processamento do checkout');
        }
        
        return result;
    }

    /**
     * Exemplo de uso com dados do template fornecido
     */
    async exampleUsage() {
        const exampleData = {
            checkout: {
                name: 'João Silva',
                email: 'joao@email.com',
                phone: '+5511999999999',
                total: '197.00'
            },
            utm: {
                source: 'google',
                medium: 'cpc',
                campaign: 'black-friday',
                content: 'ad-variant-a',
                term: 'curso-online'
            },
            options: {
                currency: 'BRL',
                contentName: 'Curso Online',
                contentCategory: 'Educação',
                fbclid: 'IwAR1234567890' // Se disponível
            }
        };

        return await this.processCheckout(exampleData);
    }
}

module.exports = UTMifyCheckoutIntegration;