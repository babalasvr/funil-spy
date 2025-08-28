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
        
        // Validar dados do produto
        if (!checkoutData.price || parseFloat(checkoutData.price) <= 0) {
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
        
        // Validar dados da compra
        if (!purchaseData.amount || parseFloat(purchaseData.amount) <= 0) {
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
 * Recupera relatório completo da sessão
 */
router.get('/session/:sessionId', (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const report = bridge.getSessionReport(sessionId);
        
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
        const pixelCode = await facebook.generatePixelCode();
        
        res.json({
            success: true,
            message: 'Código do pixel gerado',
            data: {
                pixelCode: pixelCode,
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
 * Endpoint para testar a integração completa
 */
router.post('/test', async (req, res) => {
    try {
        // Testar configuração do Facebook
        const facebookTest = await facebook.testConnection();
        
        // Testar bridge completo
        const bridgeTest = await bridge.testIntegration();
        
        res.json({
            success: true,
            message: 'Teste de integração concluído',
            data: {
                facebook: facebookTest,
                bridge: bridgeTest,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /test:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            code: 'TEST_ERROR'
        });
    }
});

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