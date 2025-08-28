/**
 * Lead Capture API - Endpoint para receber dados de leads do checkout
 * Integração com sistema de analytics e UTMify
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Configurações
const LEADS_DIR = path.join(__dirname, '..', 'data', 'leads');
const LEADS_FILE = path.join(LEADS_DIR, 'captured-leads.json');
const DAILY_LEADS_DIR = path.join(LEADS_DIR, 'daily');

/**
 * Garante que os diretórios necessários existem
 */
async function ensureDirectories() {
    try {
        await fs.mkdir(LEADS_DIR, { recursive: true });
        await fs.mkdir(DAILY_LEADS_DIR, { recursive: true });
    } catch (error) {
        console.error('Erro ao criar diretórios:', error);
    }
}

/**
 * Carrega leads existentes do arquivo
 */
async function loadExistingLeads() {
    try {
        const data = await fs.readFile(LEADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Arquivo não existe ou está vazio, retornar array vazio
        return [];
    }
}

/**
 * Salva leads no arquivo principal
 */
async function saveLeads(leads) {
    try {
        await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
    } catch (error) {
        console.error('Erro ao salvar leads:', error);
        throw error;
    }
}

/**
 * Salva lead no arquivo diário
 */
async function saveDailyLead(leadData) {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyFile = path.join(DAILY_LEADS_DIR, `leads-${today}.json`);
        
        let dailyLeads = [];
        try {
            const data = await fs.readFile(dailyFile, 'utf8');
            dailyLeads = JSON.parse(data);
        } catch (error) {
            // Arquivo não existe, começar com array vazio
        }
        
        dailyLeads.push(leadData);
        await fs.writeFile(dailyFile, JSON.stringify(dailyLeads, null, 2));
    } catch (error) {
        console.error('Erro ao salvar lead diário:', error);
    }
}

/**
 * Valida dados do lead
 */
function validateLeadData(data) {
    const errors = [];
    
    if (!data.sessionId) {
        errors.push('sessionId é obrigatório');
    }
    
    if (!data.leadData || typeof data.leadData !== 'object') {
        errors.push('leadData deve ser um objeto');
    }
    
    if (!data.utmData || typeof data.utmData !== 'object') {
        errors.push('utmData deve ser um objeto');
    }
    
    if (!data.timestamp) {
        errors.push('timestamp é obrigatório');
    }
    
    return errors;
}

/**
 * Enriquece dados do lead com informações adicionais
 */
function enrichLeadData(leadData, req) {
    const enriched = {
        ...leadData,
        
        // Dados do servidor
        serverData: {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            acceptLanguage: req.get('Accept-Language'),
            referer: req.get('Referer'),
            receivedAt: new Date().toISOString()
        },
        
        // ID único para este lead
        leadId: generateLeadId(),
        
        // Status inicial
        status: 'captured',
        
        // Dados de qualificação automática
        qualification: qualifyLead(leadData.leadData)
    };
    
    return enriched;
}

/**
 * Gera ID único para o lead
 */
function generateLeadId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Qualifica o lead baseado nos dados disponíveis
 */
function qualifyLead(leadData) {
    let score = 0;
    const qualification = {
        score: 0,
        level: 'cold',
        completeness: 0,
        hasEmail: false,
        hasPhone: false,
        hasName: false,
        hasDocument: false
    };
    
    // Verificar completude dos dados
    const totalFields = Object.keys(leadData).length;
    const requiredFields = ['name', 'email', 'phone'];
    let completedRequired = 0;
    
    requiredFields.forEach(field => {
        if (leadData[field] && leadData[field].trim()) {
            completedRequired++;
            qualification[`has${field.charAt(0).toUpperCase() + field.slice(1)}`] = true;
            score += 25; // 25 pontos por campo obrigatório
        }
    });
    
    // Verificar campos adicionais
    if (leadData.document && leadData.document.trim()) {
        qualification.hasDocument = true;
        score += 15;
    }
    
    if (leadData.address && leadData.address.trim()) {
        score += 10;
    }
    
    // Calcular completude
    qualification.completeness = Math.round((completedRequired / requiredFields.length) * 100);
    
    // Definir nível baseado na pontuação
    if (score >= 75) {
        qualification.level = 'hot';
    } else if (score >= 50) {
        qualification.level = 'warm';
    } else {
        qualification.level = 'cold';
    }
    
    qualification.score = score;
    
    return qualification;
}

/**
 * POST /api/capture-lead
 * Endpoint principal para captura de leads
 */
router.post('/capture-lead', async (req, res) => {
    try {
        console.log('📥 Recebendo dados de lead:', req.body);
        
        // Validar dados
        const validationErrors = validateLeadData(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: validationErrors
            });
        }
        
        // Enriquecer dados
        const enrichedLead = enrichLeadData(req.body, req);
        
        // Garantir que diretórios existem
        await ensureDirectories();
        
        // Carregar leads existentes
        const existingLeads = await loadExistingLeads();
        
        // Verificar se já existe um lead com mesmo sessionId
        const existingIndex = existingLeads.findIndex(lead => lead.sessionId === enrichedLead.sessionId);
        
        if (existingIndex !== -1) {
            // Atualizar lead existente
            existingLeads[existingIndex] = {
                ...existingLeads[existingIndex],
                ...enrichedLead,
                updatedAt: new Date().toISOString(),
                updateCount: (existingLeads[existingIndex].updateCount || 0) + 1
            };
            console.log('🔄 Lead atualizado:', enrichedLead.sessionId);
        } else {
            // Adicionar novo lead
            existingLeads.push(enrichedLead);
            console.log('✨ Novo lead capturado:', enrichedLead.sessionId);
        }
        
        // Salvar no arquivo principal
        await saveLeads(existingLeads);
        
        // Salvar no arquivo diário
        await saveDailyLead(enrichedLead);
        
        // Resposta de sucesso
        res.json({
            success: true,
            leadId: enrichedLead.leadId,
            sessionId: enrichedLead.sessionId,
            qualification: enrichedLead.qualification,
            message: 'Lead capturado com sucesso'
        });
        
        // Log para analytics
        console.log(`📊 Lead ${enrichedLead.qualification.level} capturado:`, {
            leadId: enrichedLead.leadId,
            sessionId: enrichedLead.sessionId,
            score: enrichedLead.qualification.score,
            completeness: enrichedLead.qualification.completeness,
            utm_source: enrichedLead.utmData.utm_source || 'direct'
        });
        
    } catch (error) {
        console.error('❌ Erro ao capturar lead:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Não foi possível processar os dados do lead'
        });
    }
});

/**
 * GET /api/leads
 * Listar leads capturados (com paginação)
 */
router.get('/leads', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const leads = await loadExistingLeads();
        
        // Ordenar por data mais recente
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const paginatedLeads = leads.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedLeads,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(leads.length / limit),
                totalLeads: leads.length,
                hasNext: endIndex < leads.length,
                hasPrev: startIndex > 0
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar leads:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar leads'
        });
    }
});

/**
 * GET /api/leads/stats
 * Estatísticas dos leads
 */
router.get('/leads/stats', async (req, res) => {
    try {
        const leads = await loadExistingLeads();
        
        const stats = {
            total: leads.length,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            byLevel: {
                hot: 0,
                warm: 0,
                cold: 0
            },
            bySource: {},
            avgScore: 0,
            avgCompleteness: 0
        };
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        let totalScore = 0;
        let totalCompleteness = 0;
        
        leads.forEach(lead => {
            const leadDate = new Date(lead.timestamp);
            
            // Contadores por período
            if (leadDate >= today) stats.today++;
            if (leadDate >= weekAgo) stats.thisWeek++;
            if (leadDate >= monthAgo) stats.thisMonth++;
            
            // Por nível
            if (lead.qualification && lead.qualification.level) {
                stats.byLevel[lead.qualification.level]++;
            }
            
            // Por fonte UTM
            const source = lead.utmData?.utm_source || 'direct';
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;
            
            // Médias
            if (lead.qualification) {
                totalScore += lead.qualification.score || 0;
                totalCompleteness += lead.qualification.completeness || 0;
            }
        });
        
        if (leads.length > 0) {
            stats.avgScore = Math.round(totalScore / leads.length);
            stats.avgCompleteness = Math.round(totalCompleteness / leads.length);
        }
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar estatísticas'
        });
    }
});

/**
 * GET /api/leads/:sessionId
 * Buscar lead específico por sessionId
 */
router.get('/leads/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const leads = await loadExistingLeads();
        
        const lead = leads.find(l => l.sessionId === sessionId);
        
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead não encontrado'
            });
        }
        
        res.json({
            success: true,
            data: lead
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar lead:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar lead'
        });
    }
});

/**
 * DELETE /api/leads/:sessionId
 * Remover lead específico
 */
router.delete('/leads/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const leads = await loadExistingLeads();
        
        const leadIndex = leads.findIndex(l => l.sessionId === sessionId);
        
        if (leadIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Lead não encontrado'
            });
        }
        
        const removedLead = leads.splice(leadIndex, 1)[0];
        await saveLeads(leads);
        
        res.json({
            success: true,
            message: 'Lead removido com sucesso',
            data: removedLead
        });
        
    } catch (error) {
        console.error('❌ Erro ao remover lead:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao remover lead'
        });
    }
});

module.exports = router;