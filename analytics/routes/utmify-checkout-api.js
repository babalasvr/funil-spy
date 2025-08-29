/**
 * API Route para Integração UTMify + Facebook Conversions API
 * Endpoint: POST /api/utmify-checkout
 */

const express = require('express');
const UTMifyCheckoutIntegration = require('../services/utmify-checkout-integration');
const router = express.Router();

// Middleware para log de requisições
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

/**
 * POST /api/utmify-checkout
 * Processa checkout com dados UTM e envia para Facebook CAPI
 */
router.post('/utmify-checkout', async (req, res) => {
    try {
        console.log('🛒 Nova requisição de checkout recebida');
        
        const { checkout, utm, options } = req.body;
        
        // Validações básicas
        if (!checkout) {
            return res.status(400).json({
                success: false,
                error: 'Dados do checkout são obrigatórios',
                code: 'MISSING_CHECKOUT_DATA'
            });
        }
        
        if (!checkout.email && !checkout.phone) {
            return res.status(400).json({
                success: false,
                error: 'Email ou telefone são obrigatórios',
                code: 'MISSING_CONTACT_INFO'
            });
        }
        
        if (!checkout.total || parseFloat(checkout.total) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valor da compra deve ser maior que zero',
                code: 'INVALID_PURCHASE_VALUE'
            });
        }
        
        // Log dos dados recebidos (sem dados sensíveis)
        console.log('📊 Dados recebidos:', {
            checkout: {
                name: checkout.name || 'N/A',
                email: checkout.email ? `${checkout.email.substring(0, 3)}***` : 'N/A',
                phone: checkout.phone ? `${checkout.phone.substring(0, 3)}***` : 'N/A',
                total: checkout.total
            },
            utm: utm || {},
            options: options || {}
        });
        
        // Processar checkout
        const integration = new UTMifyCheckoutIntegration();
        const result = await integration.processCheckout({
            checkout,
            utm: utm || {},
            options: options || {}
        });
        
        // Resposta baseada no resultado
        if (result.success) {
            console.log('✅ Checkout processado com sucesso');
            
            // Resposta de sucesso (sem dados sensíveis)
            res.status(200).json({
                success: true,
                eventId: result.eventId,
                response: {
                    events_received: result.response?.events_received,
                    fbtrace_id: result.response?.fbtrace_id
                },
                userData: result.userData,
                utmParams: result.utmParams,
                fbc_sent: result.fbc_sent,
                timestamp: new Date().toISOString()
            });
            
        } else {
            console.error('❌ Falha no processamento do checkout');
            
            // Resposta de erro
            res.status(400).json({
                success: false,
                error: result.error,
                eventId: result.eventId,
                status: result.status,
                facebookError: result.facebookError,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('💥 Erro interno no processamento:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/utmify-checkout/test
 * Endpoint de teste para verificar se a API está funcionando
 */
router.get('/utmify-checkout/test', async (req, res) => {
    try {
        console.log('🧪 Teste da API UTMify Checkout');
        
        const integration = new UTMifyCheckoutIntegration();
        
        // Dados de teste
        const testData = {
            checkout: {
                name: 'Teste Usuario',
                email: 'teste@email.com',
                phone: '+5511999999999',
                total: '97.00'
            },
            utm: {
                source: 'test',
                medium: 'api',
                campaign: 'test-campaign',
                content: 'api-test',
                term: 'checkout-test'
            },
            options: {
                currency: 'BRL',
                contentName: 'Produto Teste',
                contentCategory: 'Teste'
            }
        };
        
        // Preparar payload (sem enviar)
        const { payload, eventId, userData, utmParams } = integration.prepareFacebookPayload(
            testData.checkout, 
            testData.utm, 
            testData.options
        );
        
        res.status(200).json({
            success: true,
            message: 'API UTMify Checkout está funcionando',
            test_data: {
                eventId,
                userData,
                utmParams,
                payload_structure: {
                    event_name: payload.data[0].event_name,
                    event_time: payload.data[0].event_time,
                    currency: payload.data[0].custom_data.currency,
                    value: payload.data[0].custom_data.value,
                    action_source: payload.data[0].action_source,
                    has_user_data: !!payload.data[0].user_data,
                    has_custom_data: !!payload.data[0].custom_data
                }
            },
            endpoint: integration.endpoint,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro no teste da API:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro no teste da API',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/utmify-checkout/status
 * Verifica status da integração Facebook
 */
router.get('/utmify-checkout/status', async (req, res) => {
    try {
        console.log('📊 Verificando status da integração Facebook');
        
        const integration = new UTMifyCheckoutIntegration();
        
        // Verificar configurações
        const hasPixelId = !!integration.pixelId;
        const hasAccessToken = !!integration.accessToken;
        
        let tokenValid = false;
        let tokenError = null;
        
        if (hasAccessToken) {
            try {
                await integration.facebookIntegration.validateAccessToken();
                tokenValid = true;
            } catch (error) {
                tokenError = error.message;
            }
        }
        
        res.status(200).json({
            success: true,
            status: {
                pixel_id_configured: hasPixelId,
                access_token_configured: hasAccessToken,
                access_token_valid: tokenValid,
                token_error: tokenError,
                endpoint: integration.endpoint,
                api_version: integration.apiVersion
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;