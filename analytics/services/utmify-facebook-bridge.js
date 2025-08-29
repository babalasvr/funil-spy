/**
 * UTMify + Facebook Integration Bridge
 * Combina dados UTM capturados pelo UTMify com eventos do Facebook
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Production Ready
 */

const FacebookIntegration = require('./facebook-integration');
const fs = require('fs').promises;
const path = require('path');

class UTMifyFacebookBridge {
    constructor() {
        this.facebook = new FacebookIntegration();
        this.utmCache = new Map(); // Cache de dados UTM por sessão
        this.sessionData = new Map(); // Dados de sessão
    }
    
    /**
     * Captura e armazena dados UTM da sessão
     */
    captureUTMData(sessionId, utmParams, pageData = {}) {
        const utmData = {
            utm_source: utmParams.utm_source || 'direct',
            utm_medium: utmParams.utm_medium || 'none',
            utm_campaign: utmParams.utm_campaign || 'organic',
            utm_term: utmParams.utm_term || '',
            utm_content: utmParams.utm_content || '',
            utm_id: utmParams.utm_id || '',
            gclid: utmParams.gclid || '',
            fbclid: utmParams.fbclid || '',
            msclkid: utmParams.msclkid || '',
            referrer: pageData.referrer || 'direct',
            landing_page: pageData.url || '',
            timestamp: Date.now()
        };
        
        // Armazenar no cache da sessão
        this.utmCache.set(sessionId, utmData);
        
        console.log(`📍 UTM capturado para sessão ${sessionId}:`, utmData);
        
        return utmData;
    }
    
    /**
     * Recupera dados UTM da sessão
     */
    getUTMData(sessionId) {
        return this.utmCache.get(sessionId) || {
            utm_source: 'direct',
            utm_medium: 'none',
            utm_campaign: 'organic',
            utm_term: '',
            utm_content: '',
            referrer: 'direct'
        };
    }
    
    /**
     * Atualiza dados da sessão
     */
    updateSessionData(sessionId, data) {
        const existing = this.sessionData.get(sessionId) || {};
        const updated = {
            ...existing,
            ...data,
            lastUpdate: Date.now()
        };
        
        this.sessionData.set(sessionId, updated);
        return updated;
    }
    
    /**
     * Processa evento PageView com UTM
     */
    async processPageView(sessionId, pageData, utmParams = {}) {
        try {
            // Capturar dados UTM
            const utmData = this.captureUTMData(sessionId, utmParams, pageData);
            
            // Atualizar dados da sessão
            this.updateSessionData(sessionId, {
                currentPage: pageData.url,
                pageTitle: pageData.title,
                pageViews: (this.sessionData.get(sessionId)?.pageViews || 0) + 1
            });
            
            // Preparar evento para Facebook
            const eventData = {
                sessionId: sessionId,
                eventName: 'page_view',
                pageUrl: pageData.url,
                pageTitle: pageData.title,
                utmData: utmData,
                customerData: this.sessionData.get(sessionId)?.customerData || {},
                timestamp: Date.now()
            };
            
            // Enviar para Facebook
            const result = await this.facebook.processEvent(eventData);
            
            console.log(`📄 PageView processado: ${pageData.url}`);
            
            return {
                success: true,
                sessionId: sessionId,
                utmData: utmData,
                facebook: {
                    success: result.conversionsAPI?.success || false,
                    eventId: result.eventId,
                    pixel: result.pixel,
                    conversionsAPI: result.conversionsAPI,
                    error: result.error
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar PageView:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Processa captura de lead com dados UTM
     */
    async processLead(sessionId, leadData, pageData = {}) {
        try {
            // Recuperar dados UTM da sessão
            const utmData = this.getUTMData(sessionId);
            
            // Atualizar dados do cliente na sessão
            const customerData = {
                name: leadData.name || '',
                email: leadData.email || '',
                phone: leadData.phone || '',
                document: leadData.document || '',
                city: leadData.city || '',
                state: leadData.state || '',
                country: leadData.country || 'BR'
            };
            
            this.updateSessionData(sessionId, {
                customerData: customerData,
                leadCaptured: true,
                leadTimestamp: Date.now()
            });
            
            // Preparar evento para Facebook
            const eventData = {
                sessionId: sessionId,
                eventName: 'lead_captured',
                pageUrl: pageData.url || '',
                pageTitle: pageData.title || '',
                utmData: utmData,
                customerData: customerData,
                value: leadData.value || 0,
                timestamp: Date.now()
            };
            
            // Enviar para Facebook
            const result = await this.facebook.processEvent(eventData);
            
            console.log(`👤 Lead capturado: ${customerData.email}`);
            
            return {
                success: true,
                sessionId: sessionId,
                leadData: customerData,
                utmData: utmData,
                facebook: {
                    success: result.conversionsAPI?.success || false,
                    eventId: result.eventId,
                    pixel: result.pixel,
                    conversionsAPI: result.conversionsAPI,
                    error: result.error
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar Lead:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Processa início do checkout
     */
    async processCheckoutStart(sessionId, checkoutData, pageData = {}) {
        try {
            const utmData = this.getUTMData(sessionId);
            const sessionInfo = this.sessionData.get(sessionId) || {};
            
            // Preparar dados do produto
            const productData = {
                id: checkoutData.productId || 'main-product',
                name: checkoutData.productName || 'Produto Principal',
                price: parseFloat(checkoutData.price || 0),
                category: checkoutData.category || 'digital'
            };
            
            // Atualizar sessão
            this.updateSessionData(sessionId, {
                checkoutStarted: true,
                checkoutTimestamp: Date.now(),
                productData: productData
            });
            
            // Preparar evento para Facebook
            const eventData = {
                sessionId: sessionId,
                eventName: 'checkout_started',
                pageUrl: pageData.url || '',
                pageTitle: pageData.title || '',
                utmData: utmData,
                customerData: sessionInfo.customerData || {},
                productData: productData,
                value: productData.price,
                timestamp: Date.now()
            };
            
            // Enviar para Facebook
            const result = await this.facebook.processEvent(eventData);
            
            console.log(`🛒 Checkout iniciado: R$ ${productData.price}`);
            
            return {
                success: true,
                sessionId: sessionId,
                productData: productData,
                utmData: utmData,
                facebook: {
                    success: result.conversionsAPI?.success || false,
                    eventId: result.eventId,
                    pixel: result.pixel,
                    conversionsAPI: result.conversionsAPI,
                    error: result.error
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar Checkout:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Processa compra finalizada
     */
    async processPurchase(sessionId, purchaseData, pageData = {}) {
        try {
            const utmData = this.getUTMData(sessionId);
            const sessionInfo = this.sessionData.get(sessionId) || {};
            
            // Preparar dados da compra
            const transactionData = {
                transactionId: purchaseData.transactionId || `tx_${Date.now()}`,
                amount: parseFloat(purchaseData.amount || 0),
                currency: 'BRL',
                paymentMethod: purchaseData.paymentMethod || 'PIX',
                orderBump: purchaseData.orderBump || false,
                specialOffer: purchaseData.specialOffer || false
            };
            
            // Atualizar sessão
            this.updateSessionData(sessionId, {
                purchased: true,
                purchaseTimestamp: Date.now(),
                transactionData: transactionData,
                totalRevenue: (sessionInfo.totalRevenue || 0) + transactionData.amount
            });
            
            // Preparar evento para Facebook
            const eventData = {
                sessionId: sessionId,
                eventName: 'purchase_completed',
                pageUrl: pageData.url || '',
                pageTitle: pageData.title || '',
                utmData: utmData,
                customerData: sessionInfo.customerData || {},
                productData: sessionInfo.productData || {},
                value: transactionData.amount,
                transactionId: transactionData.transactionId,
                timestamp: Date.now()
            };
            
            // Enviar para Facebook
            const result = await this.facebook.processEvent(eventData);
            
            console.log(`💰 Compra finalizada: R$ ${transactionData.amount}`);
            
            return {
                success: true,
                sessionId: sessionId,
                transactionData: transactionData,
                utmData: utmData,
                facebook: {
                    success: result.conversionsAPI?.success || false,
                    eventId: result.eventId,
                    pixel: result.pixel,
                    conversionsAPI: result.conversionsAPI,
                    error: result.error
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar Purchase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Processa visualização de upsell/downsell
     */
    async processOfferView(sessionId, offerData, pageData = {}) {
        try {
            const utmData = this.getUTMData(sessionId);
            const sessionInfo = this.sessionData.get(sessionId) || {};
            
            // Preparar dados da oferta
            const offerInfo = {
                type: offerData.type || 'upsell', // upsell, downsell
                productId: offerData.productId || 'offer-product',
                productName: offerData.productName || 'Oferta Especial',
                price: parseFloat(offerData.price || 0),
                originalPrice: parseFloat(offerData.originalPrice || 0)
            };
            
            // Atualizar sessão
            this.updateSessionData(sessionId, {
                [`${offerInfo.type}Viewed`]: true,
                [`${offerInfo.type}Timestamp`]: Date.now(),
                currentOffer: offerInfo
            });
            
            // Preparar evento para Facebook
            const eventData = {
                sessionId: sessionId,
                eventName: `${offerInfo.type}_view`,
                pageUrl: pageData.url || '',
                pageTitle: pageData.title || '',
                utmData: utmData,
                customerData: sessionInfo.customerData || {},
                productData: {
                    id: offerInfo.productId,
                    name: offerInfo.productName,
                    price: offerInfo.price,
                    category: 'offer'
                },
                value: offerInfo.price,
                timestamp: Date.now()
            };
            
            // Enviar para Facebook
            const result = await this.facebook.processEvent(eventData);
            
            console.log(`🎯 ${offerInfo.type} visualizado: ${offerInfo.productName}`);
            
            return {
                success: true,
                sessionId: sessionId,
                offerData: offerInfo,
                utmData: utmData,
                facebook: {
                    success: result.conversionsAPI?.success || false,
                    eventId: result.eventId,
                    pixel: result.pixel,
                    conversionsAPI: result.conversionsAPI,
                    error: result.error
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar Offer View:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Gera relatório da sessão
     */
    getSessionReport(sessionId) {
        const utmData = this.getUTMData(sessionId);
        const sessionInfo = this.sessionData.get(sessionId) || {};
        
        return {
            sessionId: sessionId,
            utmData: utmData,
            sessionData: sessionInfo,
            summary: {
                hasUTM: utmData.utm_source !== 'direct',
                leadCaptured: sessionInfo.leadCaptured || false,
                checkoutStarted: sessionInfo.checkoutStarted || false,
                purchased: sessionInfo.purchased || false,
                totalRevenue: sessionInfo.totalRevenue || 0,
                pageViews: sessionInfo.pageViews || 0
            }
        };
    }
    
    /**
     * Limpa dados antigos do cache
     */
    cleanupCache(maxAgeHours = 24) {
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        const now = Date.now();
        
        // Limpar UTM cache
        for (const [sessionId, data] of this.utmCache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.utmCache.delete(sessionId);
            }
        }
        
        // Limpar session data
        for (const [sessionId, data] of this.sessionData.entries()) {
            if (now - (data.lastUpdate || 0) > maxAge) {
                this.sessionData.delete(sessionId);
            }
        }
        
        console.log(`🧹 Cache limpo: ${this.utmCache.size} UTM, ${this.sessionData.size} sessões`);
    }
    
    /**
     * Testa integração completa
     */
    async testIntegration() {
        try {
            const testSessionId = `test_${Date.now()}`;
            
            // Teste 1: PageView com UTM
            const pageViewResult = await this.processPageView(testSessionId, {
                url: 'https://test.com',
                title: 'Teste Page'
            }, {
                utm_source: 'facebook',
                utm_medium: 'cpc',
                utm_campaign: 'test_campaign'
            });
            
            // Teste 2: Lead
            const leadResult = await this.processLead(testSessionId, {
                name: 'Teste User',
                email: 'test@example.com',
                phone: '11999999999'
            });
            
            // Teste 3: Purchase
            const purchaseResult = await this.processPurchase(testSessionId, {
                transactionId: 'test_tx_123',
                amount: 97.00,
                paymentMethod: 'PIX'
            });
            
            return {
                success: true,
                tests: {
                    pageView: pageViewResult.success,
                    lead: leadResult.success,
                    purchase: purchaseResult.success
                },
                sessionReport: this.getSessionReport(testSessionId)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = UTMifyFacebookBridge;