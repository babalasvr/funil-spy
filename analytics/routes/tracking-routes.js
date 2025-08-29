/**
 * 🎯 Rotas de Tracking - UTMify + Facebook Integration
 * Endpoints para captura e processamento de eventos de tracking
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

module.exports = (bridge, facebook, monitoring = null) => {

const router = express.Router();

// Rate limiting para proteção
const trackingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests por minuto por IP
    message: {
        error: 'Muitas requisições de tracking. Tente novamente em 1 minuto.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Aplicar rate limiting a todas as rotas
router.use(trackingLimiter);

/**
 * Middleware para validar sessionId
 */
function validateSession(req, res, next) {
    const sessionId = req.body.sessionId || req.query.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            error: 'sessionId é obrigatório',
            code: 'MISSING_SESSION_ID'
        });
    }
    
    req.sessionId = sessionId;
    next();
}

/**
 * Middleware para capturar dados da requisição
 */
function captureRequestData(req, res, next) {
    req.requestData = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || '',
        referrer: req.get('Referer') || req.body.referrer || '',
        timestamp: Date.now(),
        url: req.body.url || req.get('Referer') || '',
        title: req.body.title || ''
    };
    next();
}

// Aplicar middlewares
router.use(validateSession);
router.use(captureRequestData);

/**
 * POST /api/tracking/pageview
 * Registra visualização de página com dados UTM
 */
router.post('/pageview', async (req, res) => {
    try {
        const { utmParams = {}, pageData = {} } = req.body;
        
        // Combinar dados da página
        const combinedPageData = {
            ...req.requestData,
            ...pageData
        };
        
        // Processar através do bridge
        const result = await bridge.processPageView(
            req.sessionId,
            combinedPageData,
            utmParams
        );
        
        // Registrar no monitoramento
        if (monitoring) {
            monitoring.recordFacebookEvent('PageView', result.facebook?.success || false);
            monitoring.recordTrackingEvent('pageview');
        }
        
        res.json({
            success: true,
            message: 'PageView registrado com sucesso',
            data: {
                sessionId: req.sessionId,
                utmCaptured: result.utmData,
                facebookSent: result.facebook?.success || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /pageview:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'PAGEVIEW_ERROR'
        });
    }
});

/**
 * POST /api/tracking/lead
 * Registra captura de lead com vinculação UTM
 */
router.post('/lead', async (req, res) => {
    try {
        const { leadData = {}, pageData = {} } = req.body;
        
        // Validar dados obrigatórios do lead
        if (!leadData.email && !leadData.phone) {
            return res.status(400).json({
                success: false,
                error: 'Email ou telefone é obrigatório',
                code: 'MISSING_CONTACT_INFO'
            });
        }
        
        // Combinar dados da página
        const combinedPageData = {
            ...req.requestData,
            ...pageData
        };
        
        // Processar através do bridge
        const result = await bridge.processLead(
            req.sessionId,
            leadData,
            combinedPageData
        );
        
        // Registrar no monitoramento
        if (monitoring) {
            monitoring.recordFacebookEvent('Lead', result.facebook?.success || false);
            monitoring.recordTrackingEvent('lead');
        }
        
        res.json({
            success: true,
            message: 'Lead capturado com sucesso',
            data: {
                sessionId: req.sessionId,
                leadId: `lead_${req.sessionId}_${Date.now()}`,
                utmData: result.utmData,
                facebookSent: result.facebook?.success || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /lead:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'LEAD_ERROR'
        });
    }
});

/**
 * POST /api/tracking/checkout-start
 * Registra início do processo de checkout
 */
router.post('/checkout-start', async (req, res) => {
    try {
        const { checkoutData = {}, pageData = {} } = req.body;
        
        // Validar dados do produto (aceitar tanto 'price' quanto 'value')
        const price = checkoutData.price || checkoutData.value;
        if (!price || parseFloat(price) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Preço do produto é obrigatório e deve ser maior que zero',
                code: 'INVALID_PRICE'
            });
        }
        
        // Combinar dados da página
        const combinedPageData = {
            ...req.requestData,
            ...pageData
        };
        
        // Processar através do bridge
        const result = await bridge.processCheckoutStart(
            req.sessionId,
            checkoutData,
            combinedPageData
        );
        
        // Registrar no monitoramento
        if (monitoring) {
            monitoring.recordFacebookEvent('InitiateCheckout', result.facebook?.success || false);
            monitoring.recordTrackingEvent('checkout-start');
        }
        
        res.json({
            success: true,
            message: 'Checkout iniciado com sucesso',
            data: {
                sessionId: req.sessionId,
                productData: result.productData,
                utmData: result.utmData,
                facebookSent: result.facebook?.success || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /checkout-start:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'CHECKOUT_ERROR'
        });
    }
});

/**
 * POST /api/tracking/purchase
 * Registra compra finalizada
 */
router.post('/purchase', async (req, res) => {
    try {
        const { purchaseData = {}, pageData = {} } = req.body;
        
        // Validar dados da compra (aceitar tanto 'amount' quanto 'value')
        const amount = purchaseData.amount || purchaseData.value;
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valor da compra é obrigatório e deve ser maior que zero',
                code: 'INVALID_AMOUNT'
            });
        }
        
        if (!purchaseData.transactionId) {
            return res.status(400).json({
                success: false,
                error: 'ID da transação é obrigatório',
                code: 'MISSING_TRANSACTION_ID'
            });
        }
        
        // Combinar dados da página
        const combinedPageData = {
            ...req.requestData,
            ...pageData
        };
        
        // Processar através do bridge
        const result = await bridge.processPurchase(
            req.sessionId,
            purchaseData,
            combinedPageData
        );
        
        // Registrar no monitoramento
        if (monitoring) {
            monitoring.recordFacebookEvent('Purchase', result.facebook?.success || false);
            monitoring.recordTrackingEvent('purchase');
        }
        
        res.json({
            success: true,
            message: 'Compra registrada com sucesso',
            data: {
                sessionId: req.sessionId,
                transactionId: purchaseData.transactionId,
                amount: parseFloat(purchaseData.amount),
                utmData: result.utmData,
                facebookSent: result.facebook?.success || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /purchase:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'PURCHASE_ERROR'
        });
    }
});

/**
 * POST /api/tracking/offer-view
 * Registra visualização de upsell/downsell
 */
router.post('/offer-view', async (req, res) => {
    try {
        const { offerData = {}, pageData = {} } = req.body;
        
        // Validar tipo da oferta
        if (!['upsell', 'downsell'].includes(offerData.type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo da oferta deve ser "upsell" ou "downsell"',
                code: 'INVALID_OFFER_TYPE'
            });
        }
        
        // Combinar dados da página
        const combinedPageData = {
            ...req.requestData,
            ...pageData
        };
        
        // Processar através do bridge
        const result = await bridge.processOfferView(
            req.sessionId,
            offerData,
            combinedPageData
        );
        
        // Registrar no monitoramento
        if (monitoring) {
            monitoring.recordFacebookEvent('ViewContent', result.facebook?.success || false);
            monitoring.recordTrackingEvent('offer-view');
        }
        
        res.json({
            success: true,
            message: `${offerData.type} visualizado com sucesso`,
            data: {
                sessionId: req.sessionId,
                offerType: offerData.type,
                offerData: result.offerData,
                utmData: result.utmData,
                facebookSent: result.facebook?.success || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /offer-view:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'OFFER_ERROR'
        });
    }
});

/**
 * GET /api/tracking/session/:sessionId
 * GET /api/tracking/session-report/:sessionId
 * Recupera relatório completo da sessão
 */
router.get(['/session/:sessionId', '/session-report/:sessionId'], (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        // Verificar se sessionId foi fornecido
        if (!sessionId) {
            return res.json({
                success: false,
                error: 'Session ID é obrigatório',
                code: 'MISSING_SESSION_ID',
                example: 'Use: /api/tracking/session-report/sua_session_id_aqui'
            });
        }
        
        const report = bridge.getSessionReport(sessionId);
        
        // Verificar se a sessão existe
        if (!report.sessionData || Object.keys(report.sessionData).length === 0) {
            return res.json({
                success: true,
                message: 'Sessão não encontrada ou sem dados',
                data: {
                    sessionId: sessionId,
                    found: false,
                    note: 'Esta sessão pode não ter sido iniciada ou os dados expiraram',
                    emptyReport: report
                }
            });
        }
        
        res.json({
            success: true,
            message: 'Relatório da sessão recuperado',
            data: report
        });
        
    } catch (error) {
        console.error('❌ Erro em /session:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'SESSION_ERROR'
        });
    }
});

/**
 * GET /api/tracking/pixel-code
 * Retorna código JavaScript do pixel para inserção nas páginas
 */
router.get('/pixel-code', async (req, res) => {
    try {
        // Verificar configuração do Facebook
        const configValidation = facebook.validateConfig();
        if (!configValidation.valid) {
            return res.json({
                success: true,
                message: 'Código do pixel gerado (modo desenvolvimento)',
                warning: 'Configuração do Facebook incompleta: ' + configValidation.errors.join(', '),
                pixelCode: `<!-- Facebook Pixel não configurado -->\n<!-- Configure FACEBOOK_PIXEL_ID e FACEBOOK_ACCESS_TOKEN -->`,
                data: {
                    pixelCode: `<!-- Facebook Pixel não configurado -->\n<!-- Configure FACEBOOK_PIXEL_ID e FACEBOOK_ACCESS_TOKEN -->`,
                    pixelId: facebook.pixelId || 'NOT_CONFIGURED',
                    configErrors: configValidation.errors,
                    instructions: {
                        placement: 'Configure as variáveis de ambiente primeiro',
                        note: 'Veja o arquivo .env.example para referência'
                    }
                }
            });
        }
        
        // Criar dados de evento básico para gerar o pixel code
        const eventData = {
            sessionId: 'pixel_generation',
            eventName: 'PageView',
            pageUrl: 'https://example.com',
            customerData: {},
            utmData: {
                utm_source: 'direct',
                utm_medium: 'none'
            }
        };
        
        const pixelCode = facebook.generatePixelCode(eventData);
        
        // Gerar código JavaScript completo do pixel
        const jsCode = `
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${facebook.pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${facebook.pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->`;
        
        res.json({
            success: true,
            message: 'Código do pixel gerado',
            pixelCode: jsCode,
            data: {
                pixelCode: jsCode,
                pixelId: facebook.pixelId,
                instructions: {
                    placement: 'Insira este código no <head> de todas as páginas',
                    note: 'O código já inclui deduplicação automática com Conversions API'
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /pixel-code:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'PIXEL_CODE_ERROR'
        });
    }
});

/**
 * POST /api/tracking/test
 * GET /api/tracking/test-integration
 * Endpoint para testar a integração completa
 */
router.post('/test', async (req, res) => {
    await handleIntegrationTest(req, res);
});

router.get('/test-integration', async (req, res) => {
    await handleIntegrationTest(req, res);
});

async function handleIntegrationTest(req, res) {
    try {
        console.log('🧪 Iniciando teste de integração...');
        
        // Verificar configuração do Facebook primeiro
        const configValidation = facebook.validateConfig();
        
        // Testar configuração do Facebook
        let facebookTest;
        if (!configValidation.valid) {
            facebookTest = {
                success: false,
                error: 'Configuração incompleta: ' + configValidation.errors.join(', '),
                configErrors: configValidation.errors,
                note: 'Configure FACEBOOK_PIXEL_ID e FACEBOOK_ACCESS_TOKEN nas variáveis de ambiente'
            };
            console.log('⚠️ Configuração Facebook incompleta:', configValidation.errors);
        } else {
            try {
                facebookTest = await facebook.testConnection();
                console.log('✅ Teste Facebook concluído:', facebookTest.success);
            } catch (error) {
                console.error('❌ Erro no teste Facebook:', error.message);
                facebookTest = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Testar bridge completo
        let bridgeTest;
        try {
            bridgeTest = await bridge.testIntegration();
            console.log('✅ Teste Bridge concluído:', bridgeTest.success);
        } catch (error) {
            console.error('❌ Erro no teste Bridge:', error.message);
            bridgeTest = {
                success: false,
                error: error.message
            };
        }
        
        const overallSuccess = facebookTest.success && bridgeTest.success;
        
        res.json({
            success: overallSuccess,
            message: overallSuccess ? 'Teste de integração concluído com sucesso' : 'Teste de integração concluído com falhas',
            data: {
                facebook: facebookTest,
                bridge: bridgeTest,
                configuration: {
                    valid: configValidation.valid,
                    errors: configValidation.errors,
                    pixelId: facebook.pixelId || 'NOT_CONFIGURED',
                    hasAccessToken: !!facebook.accessToken
                },
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /test:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'TEST_ERROR',
            details: error.message
        });
    }
}

/**
 * GET /api/tracking/health
 * Health check do sistema de tracking
 */
router.get('/health', (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Sistema de tracking operacional',
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Sistema indisponível',
            code: 'HEALTH_ERROR'
        });
    }
});

// Middleware de tratamento de erros
router.use((error, req, res, next) => {
    console.error('❌ Erro nas rotas de tracking:', error);
    
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

    return router;
};