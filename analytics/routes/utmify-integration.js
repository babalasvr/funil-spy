/**
 * UTMify Integration API - Endpoint compatível com a documentação oficial da UTMify
 * Estrutura baseada na documentação: Customer, Product, TrackingParameters, Commission
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - UTMify Compatible
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Configurações
const UTMIFY_DATA_DIR = path.join(__dirname, '..', 'data', 'utmify');
const UTMIFY_LEADS_FILE = path.join(UTMIFY_DATA_DIR, 'utmify-leads.json');
const UTMIFY_TRANSACTIONS_FILE = path.join(UTMIFY_DATA_DIR, 'utmify-transactions.json');

/**
 * Garante que os diretórios necessários existem
 */
async function ensureUTMifyDirectories() {
    try {
        await fs.mkdir(UTMIFY_DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Erro ao criar diretórios UTMify:', error);
    }
}

/**
 * Valida estrutura de dados conforme documentação UTMify
 */
function validateUTMifyData(data) {
    const errors = [];
    
    // Validar Headers (se fornecidos)
    if (data.headers) {
        if (!data.headers.authorization && !data.headers['x-api-key']) {
            errors.push('Header de autorização é recomendado');
        }
    }
    
    // Validar Body
    if (!data.body || typeof data.body !== 'object') {
        errors.push('Body é obrigatório e deve ser um objeto');
    }
    
    // Validar Customer (obrigatório)
    if (!data.customer || typeof data.customer !== 'object') {
        errors.push('Customer é obrigatório e deve ser um objeto');
    } else {
        if (!data.customer.email) {
            errors.push('Customer.email é obrigatório');
        }
        if (!data.customer.name) {
            errors.push('Customer.name é obrigatório');
        }
    }
    
    // Validar Product (obrigatório)
    if (!data.product || typeof data.product !== 'object') {
        errors.push('Product é obrigatório e deve ser um objeto');
    } else {
        if (!data.product.id) {
            errors.push('Product.id é obrigatório');
        }
        if (!data.product.name) {
            errors.push('Product.name é obrigatório');
        }
        if (data.product.price === undefined || data.product.price === null) {
            errors.push('Product.price é obrigatório');
        }
    }
    
    // Validar TrackingParameters (obrigatório)
    if (!data.trackingParameters || typeof data.trackingParameters !== 'object') {
        errors.push('TrackingParameters é obrigatório e deve ser um objeto');
    }
    
    return errors;
}

/**
 * Converte dados do nosso formato para o formato UTMify
 */
function convertToUTMifyFormat(leadData) {
    const utmifyData = {
        // Headers (simulados)
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.UTMIFY_API_KEY || 'demo-key',
            'user-agent': 'FunilSpy-UTMify-Integration/1.0'
        },
        
        // Body principal
        body: {
            event_type: leadData.eventType || 'lead_captured',
            timestamp: leadData.timestamp || new Date().toISOString(),
            session_id: leadData.sessionId
        },
        
        // Customer (dados do cliente)
        customer: {
            id: leadData.leadData?.document || leadData.leadId || generateCustomerId(),
            name: leadData.leadData?.name || '',
            email: leadData.leadData?.email || '',
            phone: leadData.leadData?.phone || '',
            document: leadData.leadData?.document || '',
            address: {
                street: leadData.leadData?.address || '',
                city: leadData.leadData?.city || '',
                state: leadData.leadData?.state || '',
                zipcode: leadData.leadData?.zipcode || '',
                country: leadData.leadData?.country || 'BR'
            },
            metadata: {
                lead_score: leadData.qualification?.score || 0,
                lead_level: leadData.qualification?.level || 'cold',
                completeness: leadData.qualification?.completeness || 0,
                ip_address: leadData.serverData?.ip || '',
                user_agent: leadData.serverData?.userAgent || ''
            }
        },
        
        // Product (dados do produto/serviço)
        product: {
            id: leadData.productData?.id || 'default-product',
            name: leadData.productData?.name || 'Produto Principal',
            description: leadData.productData?.description || '',
            price: parseFloat(leadData.productData?.price || leadData.leadData?.value || 0),
            currency: leadData.productData?.currency || 'BRL',
            category: leadData.productData?.category || 'digital',
            sku: leadData.productData?.sku || '',
            metadata: {
                funnel_step: leadData.pageData?.funnel_step || 'checkout',
                page_url: leadData.pageData?.url || '',
                page_title: leadData.pageData?.title || ''
            }
        },
        
        // TrackingParameters (parâmetros de rastreamento)
        trackingParameters: {
            utm_source: leadData.utmData?.utm_source || 'direct',
            utm_medium: leadData.utmData?.utm_medium || 'none',
            utm_campaign: leadData.utmData?.utm_campaign || 'organic',
            utm_term: leadData.utmData?.utm_term || '',
            utm_content: leadData.utmData?.utm_content || '',
            utm_id: leadData.utmData?.utm_id || '',
            
            // Parâmetros adicionais
            gclid: leadData.utmData?.gclid || '',
            fbclid: leadData.utmData?.fbclid || '',
            msclkid: leadData.utmData?.msclkid || '',
            
            // Dados de contexto
            referrer: leadData.utmData?.referrer || 'direct',
            landing_page: leadData.pageData?.url || '',
            device_type: detectDeviceType(leadData.serverData?.userAgent || ''),
            browser: detectBrowser(leadData.serverData?.userAgent || ''),
            os: detectOS(leadData.serverData?.userAgent || ''),
            
            // Dados de sessão
            session_duration: leadData.sessionData?.duration || 0,
            page_views: leadData.sessionData?.pageViews || 1,
            is_returning_visitor: leadData.sessionData?.isReturning || false
        },
        
        // Commission (dados de comissão - opcional)
        commission: {
            affiliate_id: leadData.affiliateData?.id || '',
            affiliate_name: leadData.affiliateData?.name || '',
            commission_rate: parseFloat(leadData.affiliateData?.rate || 0),
            commission_amount: parseFloat(leadData.affiliateData?.amount || 0),
            commission_type: leadData.affiliateData?.type || 'percentage',
            payout_method: leadData.affiliateData?.payoutMethod || 'automatic'
        }
    };
    
    return utmifyData;
}

/**
 * Gera ID único para customer
 */
function generateCustomerId() {
    return 'customer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Detecta tipo de dispositivo
 */
function detectDeviceType(userAgent) {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        return 'mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
        return 'tablet';
    }
    return 'desktop';
}

/**
 * Detecta navegador
 */
function detectBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

/**
 * Detecta sistema operacional
 */
function detectOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
}

/**
 * Salva dados no formato UTMify
 */
async function saveUTMifyData(utmifyData, type = 'lead') {
    try {
        const filename = type === 'transaction' ? UTMIFY_TRANSACTIONS_FILE : UTMIFY_LEADS_FILE;
        
        let existingData = [];
        try {
            const data = await fs.readFile(filename, 'utf8');
            existingData = JSON.parse(data);
        } catch (error) {
            // Arquivo não existe, começar com array vazio
        }
        
        existingData.push({
            ...utmifyData,
            saved_at: new Date().toISOString(),
            id: generateCustomerId()
        });
        
        await fs.writeFile(filename, JSON.stringify(existingData, null, 2));
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados UTMify:', error);
        return false;
    }
}

/**
 * POST /api/utmify/capture-lead
 * Endpoint compatível com a estrutura UTMify
 */
router.post('/utmify/capture-lead', async (req, res) => {
    try {
        await ensureUTMifyDirectories();
        
        console.log('📥 Recebendo dados para UTMify:', JSON.stringify(req.body, null, 2));
        
        // Converter dados para formato UTMify
        const utmifyData = convertToUTMifyFormat(req.body);
        
        // Validar estrutura UTMify
        const validationErrors = validateUTMifyData(utmifyData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos para UTMify',
                details: validationErrors,
                utmify_format: utmifyData
            });
        }
        
        // Salvar dados
        const saved = await saveUTMifyData(utmifyData, 'lead');
        
        if (saved) {
            console.log('✅ Lead salvo no formato UTMify com sucesso');
            
            res.json({
                success: true,
                message: 'Lead capturado e convertido para formato UTMify',
                utmify_data: utmifyData,
                lead_id: utmifyData.customer.id,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Falha ao salvar dados UTMify');
        }
        
    } catch (error) {
        console.error('❌ Erro no endpoint UTMify:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor UTMify',
            message: error.message
        });
    }
});

/**
 * POST /api/utmify/transaction
 * Endpoint para registrar transações no formato UTMify
 */
router.post('/utmify/transaction', async (req, res) => {
    try {
        await ensureUTMifyDirectories();
        
        const transactionData = {
            ...req.body,
            transaction_type: req.body.transaction_type || 'sale',
            status: req.body.status || 'completed'
        };
        
        const utmifyData = convertToUTMifyFormat(transactionData);
        const saved = await saveUTMifyData(utmifyData, 'transaction');
        
        if (saved) {
            res.json({
                success: true,
                message: 'Transação registrada no formato UTMify',
                transaction_id: utmifyData.customer.id,
                utmify_data: utmifyData
            });
        } else {
            throw new Error('Falha ao salvar transação UTMify');
        }
        
    } catch (error) {
        console.error('❌ Erro no endpoint de transação UTMify:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar transação UTMify',
            message: error.message
        });
    }
});

/**
 * GET /api/utmify/leads
 * Lista leads no formato UTMify
 */
router.get('/utmify/leads', async (req, res) => {
    try {
        const data = await fs.readFile(UTMIFY_LEADS_FILE, 'utf8');
        const leads = JSON.parse(data);
        
        res.json({
            success: true,
            total: leads.length,
            leads: leads,
            format: 'UTMify Compatible'
        });
    } catch (error) {
        res.json({
            success: true,
            total: 0,
            leads: [],
            message: 'Nenhum lead encontrado'
        });
    }
});

/**
 * GET /api/utmify/stats
 * Estatísticas no formato UTMify
 */
router.get('/utmify/stats', async (req, res) => {
    try {
        const leadsData = await fs.readFile(UTMIFY_LEADS_FILE, 'utf8').catch(() => '[]');
        const leads = JSON.parse(leadsData);
        
        const stats = {
            total_leads: leads.length,
            today_leads: leads.filter(lead => {
                const today = new Date().toISOString().split('T')[0];
                return lead.saved_at?.startsWith(today);
            }).length,
            utm_sources: {},
            lead_levels: { hot: 0, warm: 0, cold: 0 },
            conversion_rate: 0,
            avg_lead_score: 0
        };
        
        // Calcular estatísticas
        leads.forEach(lead => {
            const source = lead.trackingParameters?.utm_source || 'direct';
            stats.utm_sources[source] = (stats.utm_sources[source] || 0) + 1;
            
            const level = lead.customer?.metadata?.lead_level || 'cold';
            if (stats.lead_levels[level] !== undefined) {
                stats.lead_levels[level]++;
            }
            
            const score = lead.customer?.metadata?.lead_score || 0;
            stats.avg_lead_score += score;
        });
        
        if (leads.length > 0) {
            stats.avg_lead_score = Math.round(stats.avg_lead_score / leads.length);
        }
        
        res.json({
            success: true,
            stats: stats,
            format: 'UTMify Compatible',
            generated_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erro ao gerar estatísticas UTMify:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar estatísticas'
        });
    }
});

module.exports = router;