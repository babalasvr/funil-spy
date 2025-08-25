const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');
const RemarketingService = require('./remarketing-service');
const WhatsAppService = require('./whatsapp-service');
const SocialProofService = require('./social-proof-service');
const ABTestingService = require('./ab-testing-service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3001;

// Initialize services
const remarketing = new RemarketingService('./analytics.db');
const whatsapp = new WhatsAppService({ debug: true });
const socialProof = new SocialProofService('./analytics.db');
const abTesting = new ABTestingService('./analytics.db');

// Setup services
remarketing.startAutomaticProcessing();
whatsapp.setupWebhooks(app);

// WebSocket handling for real-time social proof
wss.on('connection', (ws) => {
    socialProof.addConnection(ws);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./analytics.db');

// Initialize database tables
db.serialize(() => {
    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id TEXT,
        event_name TEXT NOT NULL,
        page_url TEXT,
        page_title TEXT,
        properties TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sessions table
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        first_page TEXT,
        last_page TEXT,
        total_events INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        converted BOOLEAN DEFAULT FALSE,
        revenue DECIMAL(10,2) DEFAULT 0,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        device_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Conversions table
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        conversion_type TEXT NOT NULL,
        value DECIMAL(10,2),
        order_bump BOOLEAN DEFAULT FALSE,
        special_offer BOOLEAN DEFAULT FALSE,
        customer_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Generate session ID
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

// Track event endpoint
app.post('/api/track', (req, res) => {
    const {
        sessionId,
        eventName,
        properties = {},
        pageUrl,
        pageTitle,
        userAgent,
        screenWidth,
        screenHeight
    } = req.body;

    // Extract UTM parameters
    const utmParams = {
        utm_source: properties.utm_source || null,
        utm_medium: properties.utm_medium || null,
        utm_campaign: properties.utm_campaign || null,
        utm_term: properties.utm_term || null,
        utm_content: properties.utm_content || null
    };

    // Device detection
    const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                   userAgent.includes('Firefox') ? 'Firefox' : 
                   userAgent.includes('Safari') ? 'Safari' : 'Other';
    const os = userAgent.includes('Windows') ? 'Windows' :
               userAgent.includes('Mac') ? 'macOS' :
               userAgent.includes('Android') ? 'Android' :
               userAgent.includes('iPhone') ? 'iOS' : 'Other';

    // Insert event
    const stmt = db.prepare(`INSERT INTO events (
        session_id, event_name, page_url, page_title, properties,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        device_type, browser, os, screen_width, screen_height,
        ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run([
        sessionId, eventName, pageUrl, pageTitle, JSON.stringify(properties),
        utmParams.utm_source, utmParams.utm_medium, utmParams.utm_campaign,
        utmParams.utm_term, utmParams.utm_content,
        deviceType, browser, os, screenWidth, screenHeight,
        req.ip, userAgent
    ], function(err) {
        if (err) {
            console.error('Error inserting event:', err);
            return res.status(500).json({ error: 'Failed to track event' });
        }

        // Update or create session
        updateSession(sessionId, pageUrl, utmParams, deviceType);
        
        res.json({ success: true, eventId: this.lastID });
    });
});

// Update session data
function updateSession(sessionId, pageUrl, utmParams, deviceType) {
    db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId], (err, row) => {
        if (err) {
            console.error('Error checking session:', err);
            return;
        }

        if (row) {
            // Update existing session
            db.run(`UPDATE sessions SET 
                last_page = ?, 
                total_events = total_events + 1,
                updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?`, 
                [pageUrl, sessionId]);
        } else {
            // Create new session
            db.run(`INSERT INTO sessions (
                session_id, first_page, last_page, total_events,
                utm_source, utm_medium, utm_campaign, device_type
            ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`, [
                sessionId, pageUrl, pageUrl,
                utmParams.utm_source, utmParams.utm_medium, 
                utmParams.utm_campaign, deviceType
            ]);
        }
    });
}

// Track conversion endpoint
app.post('/api/conversion', (req, res) => {
    const {
        sessionId,
        conversionType,
        value,
        orderBump = false,
        specialOffer = false,
        customerData = {}
    } = req.body;

    // Insert conversion
    const stmt = db.prepare(`INSERT INTO conversions (
        session_id, conversion_type, value, order_bump, special_offer, customer_data
    ) VALUES (?, ?, ?, ?, ?, ?)`);

    stmt.run([
        sessionId, conversionType, value, orderBump, specialOffer,
        JSON.stringify(customerData)
    ], function(err) {
        if (err) {
            console.error('Error inserting conversion:', err);
            return res.status(500).json({ error: 'Failed to track conversion' });
        }

        // Update session as converted
        db.run(`UPDATE sessions SET 
            converted = TRUE, 
            revenue = revenue + ?
            WHERE session_id = ?`, [value || 0, sessionId]);

        res.json({ success: true, conversionId: this.lastID });
    });
});

// Analytics data endpoints
app.get('/api/analytics/overview', (req, res) => {
    const { days = 7 } = req.query;
    
    const queries = {
        totalSessions: `SELECT COUNT(*) as count FROM sessions WHERE created_at >= datetime('now', '-${days} days')`,
        totalConversions: `SELECT COUNT(*) as count FROM conversions WHERE timestamp >= datetime('now', '-${days} days')`,
        totalRevenue: `SELECT SUM(revenue) as total FROM sessions WHERE created_at >= datetime('now', '-${days} days')`,
        conversionRate: `SELECT 
            (SELECT COUNT(*) FROM conversions WHERE timestamp >= datetime('now', '-${days} days')) * 100.0 / 
            NULLIF((SELECT COUNT(*) FROM sessions WHERE created_at >= datetime('now', '-${days} days')), 0) as rate`
    };

    const results = {};
    let completed = 0;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], (err, row) => {
            if (!err) {
                results[key] = row;
            }
            completed++;
            if (completed === Object.keys(queries).length) {
                res.json(results);
            }
        });
    });
});

// Funnel data endpoint
app.get('/api/analytics/funnel', (req, res) => {
    const { days = 7 } = req.query;
    
    const funnelSteps = [
        { name: 'Relatório', event: 'page_view_report' },
        { name: 'Back Redirect', event: 'exit_intent_triggered' },
        { name: 'Checkout', event: 'page_view_checkout' },
        { name: 'Form Started', event: 'form_started' },
        { name: 'Conversion', event: 'conversion_completed' }
    ];

    const results = [];
    let completed = 0;

    funnelSteps.forEach(step => {
        const query = `SELECT COUNT(DISTINCT session_id) as count 
                      FROM events 
                      WHERE event_name = ? 
                      AND timestamp >= datetime('now', '-${days} days')`;
        
        db.get(query, [step.event], (err, row) => {
            if (!err) {
                results.push({
                    step: step.name,
                    count: row.count || 0
                });
            }
            completed++;
            
            if (completed === funnelSteps.length) {
                // Calculate conversion rates
                const sortedResults = results.sort((a, b) => {
                    const order = ['Relatório', 'Back Redirect', 'Checkout', 'Form Started', 'Conversion'];
                    return order.indexOf(a.step) - order.indexOf(b.step);
                });
                
                sortedResults.forEach((step, index) => {
                    if (index === 0) {
                        step.conversionRate = 100;
                    } else {
                        const previousCount = sortedResults[0].count;
                        step.conversionRate = previousCount > 0 ? (step.count / previousCount * 100).toFixed(2) : 0;
                    }
                });
                
                res.json(sortedResults);
            }
        });
    });
});

// Real-time stats endpoint
app.get('/api/analytics/realtime', (req, res) => {
    const queries = {
        activeUsers: `SELECT COUNT(DISTINCT session_id) as count 
                     FROM events 
                     WHERE timestamp >= datetime('now', '-5 minutes')`,
        recentEvents: `SELECT event_name, COUNT(*) as count 
                      FROM events 
                      WHERE timestamp >= datetime('now', '-1 hour')
                      GROUP BY event_name 
                      ORDER BY count DESC 
                      LIMIT 10`,
        recentConversions: `SELECT COUNT(*) as count 
                           FROM conversions 
                           WHERE timestamp >= datetime('now', '-1 hour')`
    };

    const results = {};
    let completed = 0;

    // Active users
    db.get(queries.activeUsers, (err, row) => {
        results.activeUsers = row ? row.count : 0;
        completed++;
        checkComplete();
    });

    // Recent events
    db.all(queries.recentEvents, (err, rows) => {
        results.recentEvents = rows || [];
        completed++;
        checkComplete();
    });

    // Recent conversions
    db.get(queries.recentConversions, (err, row) => {
        results.recentConversions = row ? row.count : 0;
        completed++;
        checkComplete();
    });

    function checkComplete() {
        if (completed === 3) {
            res.json(results);
        }
    }
});

// Campaign performance endpoint
app.get('/api/analytics/campaigns', (req, res) => {
    const { days = 7 } = req.query;
    
    const query = `SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) as sessions,
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as conversions,
        SUM(revenue) as revenue,
        AVG(duration) as avg_duration
        FROM sessions 
        WHERE created_at >= datetime('now', '-${days} days')
        AND utm_source IS NOT NULL
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY revenue DESC`;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error fetching campaign data:', err);
            return res.status(500).json({ error: 'Failed to fetch campaign data' });
        }

        const results = rows.map(row => ({
            ...row,
            conversionRate: row.sessions > 0 ? (row.conversions / row.sessions * 100).toFixed(2) : 0,
            avgDuration: Math.round(row.avg_duration || 0)
        }));

        res.json(results);
    });
});

// Generate session ID endpoint
app.get('/api/session', (req, res) => {
    res.json({ sessionId: generateSessionId() });
});

// Serve dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Combined dashboard data endpoint for real data
app.get('/api/dashboard-data', (req, res) => {
    const period = req.query.days || '7';
    const periodHours = period === '1' ? '24 hours' : `${period} days`;
    
    console.log(`\n📊 Getting real dashboard data for ${periodHours}`);
    
    // Get overview stats
    const overviewQueries = {
        totalSessions: `SELECT COUNT(DISTINCT session_id) as count FROM sessions WHERE created_at >= datetime('now', '-${period} days')`,
        totalConversions: `SELECT COUNT(*) as count FROM conversions WHERE timestamp >= datetime('now', '-${period} days')`,
        totalRevenue: `SELECT COALESCE(SUM(value), 0) as total FROM conversions WHERE timestamp >= datetime('now', '-${period} days')`,
        activeUsers: `SELECT COUNT(DISTINCT session_id) as count FROM events WHERE timestamp >= datetime('now', '-5 minutes')`
    };

    let overviewResults = {};
    let overviewCompleted = 0;

    // Execute overview queries
    Object.keys(overviewQueries).forEach(key => {
        db.get(overviewQueries[key], (err, row) => {
            if (err) {
                console.error(`Error in ${key} query:`, err);
                overviewResults[key] = 0;
            } else {
                overviewResults[key] = row ? (row.count || row.total || 0) : 0;
            }
            overviewCompleted++;
            
            if (overviewCompleted === Object.keys(overviewQueries).length) {
                // Calculate conversion rate
                const conversionRate = overviewResults.totalSessions > 0 ? 
                    ((overviewResults.totalConversions / overviewResults.totalSessions) * 100).toFixed(1) : 0;
                
                // Get funnel data
                const funnelQuery = `
                    SELECT 
                        'Relatório' as step,
                        COUNT(DISTINCT session_id) as count
                    FROM events 
                    WHERE event_name LIKE '%page_view_report%' 
                        AND timestamp >= datetime('now', '-${period} days')
                    
                    UNION ALL
                    
                    SELECT 
                        'Checkout' as step,
                        COUNT(DISTINCT session_id) as count
                    FROM events 
                    WHERE event_name LIKE '%page_view_checkout%' 
                        AND timestamp >= datetime('now', '-${period} days')
                    
                    UNION ALL
                    
                    SELECT 
                        'Formulário' as step,
                        COUNT(DISTINCT session_id) as count
                    FROM events 
                    WHERE event_name LIKE '%form_started%' 
                        AND timestamp >= datetime('now', '-${period} days')
                    
                    UNION ALL
                    
                    SELECT 
                        'QR Code' as step,
                        COUNT(DISTINCT session_id) as count
                    FROM events 
                    WHERE event_name LIKE '%qr_code_generated%' 
                        AND timestamp >= datetime('now', '-${period} days')
                        
                    UNION ALL
                    
                    SELECT 
                        'Conversão' as step,
                        COUNT(DISTINCT session_id) as count
                    FROM conversions 
                    WHERE timestamp >= datetime('now', '-${period} days')
                `;
                
                db.all(funnelQuery, (err, funnelData) => {
                    if (err) {
                        console.error('Error getting funnel data:', err);
                        funnelData = [];
                    }
                    
                    // Calculate conversion rates for funnel
                    const reportCount = funnelData.find(d => d.step === 'Relatório')?.count || 1;
                    const processedFunnelData = funnelData.map(step => {
                        let conversionRate = 0;
                        if (step.step === 'Relatório') {
                            conversionRate = 100;
                        } else {
                            conversionRate = reportCount > 0 ? ((step.count / reportCount) * 100).toFixed(1) : 0;
                        }
                        return {
                            ...step,
                            conversionRate: parseFloat(conversionRate)
                        };
                    });
                    
                    // Get campaign data
                    const campaignQuery = `
                        SELECT 
                            COALESCE(s.utm_source, 'Direct') as utm_source,
                            COALESCE(s.utm_medium, 'organic') as utm_medium,
                            COALESCE(s.utm_campaign, 'unknown') as utm_campaign,
                            COUNT(DISTINCT s.session_id) as sessions,
                            COUNT(DISTINCT c.session_id) as conversions,
                            COALESCE(SUM(c.value), 0) as revenue
                        FROM sessions s
                        LEFT JOIN conversions c ON s.session_id = c.session_id
                        WHERE s.created_at >= datetime('now', '-${period} days')
                        GROUP BY s.utm_source, s.utm_medium, s.utm_campaign
                        HAVING sessions > 0
                        ORDER BY sessions DESC
                        LIMIT 5
                    `;
                    
                    db.all(campaignQuery, (err, campaignData) => {
                        if (err) {
                            console.error('Error getting campaign data:', err);
                            campaignData = [];
                        }
                        
                        // Add conversion rates to campaign data
                        const processedCampaignData = campaignData.map(campaign => ({
                            ...campaign,
                            conversionRate: campaign.sessions > 0 ? 
                                ((campaign.conversions / campaign.sessions) * 100).toFixed(1) : 0
                        }));
                        
                        console.log('✅ Real data collected:', {
                            sessions: overviewResults.totalSessions,
                            conversions: overviewResults.totalConversions,
                            revenue: overviewResults.totalRevenue,
                            funnelSteps: processedFunnelData.length,
                            campaigns: processedCampaignData.length
                        });
                        
                        // Return combined data
                        res.json({
                            totalSessions: overviewResults.totalSessions,
                            totalConversions: overviewResults.totalConversions,
                            conversionRate: parseFloat(conversionRate),
                            totalRevenue: overviewResults.totalRevenue,
                            activeUsers: overviewResults.activeUsers,
                            funnelData: processedFunnelData,
                            campaignData: processedCampaignData,
                            period: period,
                            timestamp: new Date().toISOString(),
                            isRealData: true
                        });
                    });
                });
            }
        });
    });
});

// Pixel tracking endpoint
app.post('/api/pixel-track', (req, res) => {
    const { userId, sessionId, event, data } = req.body;
    
    // Store pixel event
    const stmt = db.prepare(`INSERT INTO events (
        session_id, user_id, event_name, page_url, properties,
        device_type, browser, os, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    const deviceType = /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent']) ? 'mobile' : 'desktop';
    const browser = req.headers['user-agent'].includes('Chrome') ? 'Chrome' : 'Other';
    const os = req.headers['user-agent'].includes('Windows') ? 'Windows' : 'Other';
    
    stmt.run([
        sessionId, userId, `pixel_${event}`, data.url || '', JSON.stringify(data),
        deviceType, browser, os, req.ip, req.headers['user-agent']
    ], function(err) {
        if (err) {
            console.error('Error storing pixel event:', err);
            return res.status(500).json({ error: 'Failed to track pixel event' });
        }
        res.json({ success: true, eventId: this.lastID });
    });
});

// Remarketing audience endpoint
app.post('/api/remarketing/audience', async (req, res) => {
    try {
        const result = await remarketing.trackUserForRemarketing(req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error adding to remarketing audience:', error);
        res.status(500).json({ error: 'Failed to add to remarketing audience' });
    }
});

// Remarketing stats endpoint
app.get('/api/remarketing/stats', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const stats = await remarketing.getRemarketingStats(days);
        res.json(stats);
    } catch (error) {
        console.error('Error getting remarketing stats:', error);
        res.status(500).json({ error: 'Failed to get remarketing stats' });
    }
});

// Manual remarketing campaign trigger
app.post('/api/remarketing/campaign', async (req, res) => {
    try {
        const { userId, campaignType = 'email' } = req.body;
        
        if (campaignType === 'email') {
            const result = await remarketing.sendEmailCampaign(userId);
            res.json({ success: true, ...result });
        } else if (campaignType === 'whatsapp') {
            // Get user data first
            const userData = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM remarketing_audiences WHERE user_id = ?', [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!userData || !userData.phone) {
                return res.status(400).json({ error: 'User not found or no phone number' });
            }
            
            // Get progressive discount
            const discount = remarketing.getProgressiveDiscount(userId, 2);
            const templateData = {
                message: `🔍 *WhatsApp Spy*\n\nOi ${userData.first_name || 'Cliente'}! 👋\n\nVocê estava quase descobrindo a verdade sobre aquela pessoa especial...\n\n🔥 *OFERTA ESPECIAL PARA VOCÊ:*\n${discount.discount}% OFF - De R$ 27,90 por *R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}*\n\n✅ Descubra conversas secretas\n✅ Veja atividade online\n✅ Resultados em 5 minutos\n✅ 100% confidencial\n\n⏰ *Válido apenas por 24h*\n\n👉 Clique aqui para garantir: https://funilspy.com/checkout?discount=${discount.discount}&user=${userId}&utm_source=whatsapp\n\nNão perca essa chance de descobrir a verdade! 🔍`,
                discount: discount.discount,
                offerUrl: `https://funilspy.com/checkout?discount=${discount.discount}&user=${userId}&utm_source=whatsapp`,
                firstName: userData.first_name
            };
            
            const result = await whatsapp.sendRemarketingMessage(userData.phone, templateData);
            
            // Record campaign
            remarketing.recordCampaign(userId, 'whatsapp', 'manual_trigger', discount.discount, 
                `WhatsApp campaign with ${discount.discount}% discount`);
            
            res.json({ success: true, ...result, discount: discount.discount });
        } else {
            res.status(400).json({ error: 'Invalid campaign type' });
        }
    } catch (error) {
        console.error('Error sending remarketing campaign:', error);
        res.status(500).json({ error: 'Failed to send campaign' });
    }
});

// Social proof endpoints
app.get('/api/social-proof/stats', async (req, res) => {
    try {
        const stats = await socialProof.getSocialProofStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting social proof stats:', error);
        res.status(500).json({ error: 'Failed to get social proof stats' });
    }
});

app.get('/api/social-proof/initial', async (req, res) => {
    try {
        const { count = 5 } = req.query;
        const proofs = await socialProof.getInitialSocialProofs(parseInt(count));
        res.json(proofs);
    } catch (error) {
        console.error('Error getting initial social proofs:', error);
        res.status(500).json({ error: 'Failed to get social proofs' });
    }
});

// A/B Testing endpoints
app.post('/api/ab-testing/experiments', async (req, res) => {
    try {
        const result = await abTesting.createExperiment(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error creating experiment:', error);
        res.status(500).json({ error: 'Failed to create experiment' });
    }
});

app.get('/api/ab-testing/experiments', async (req, res) => {
    try {
        const experiments = await abTesting.getAllExperiments();
        res.json(experiments);
    } catch (error) {
        console.error('Error getting experiments:', error);
        res.status(500).json({ error: 'Failed to get experiments' });
    }
});

app.get('/api/ab-testing/experiments/:id/results', async (req, res) => {
    try {
        const results = await abTesting.getExperimentResults(req.params.id);
        res.json(results);
    } catch (error) {
        console.error('Error getting experiment results:', error);
        res.status(500).json({ error: 'Failed to get experiment results' });
    }
});

app.post('/api/ab-testing/experiments/:id/start', async (req, res) => {
    try {
        const result = await abTesting.startExperiment(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error starting experiment:', error);
        res.status(500).json({ error: 'Failed to start experiment' });
    }
});

app.post('/api/ab-testing/experiments/:id/stop', async (req, res) => {
    try {
        const result = await abTesting.stopExperiment(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error stopping experiment:', error);
        res.status(500).json({ error: 'Failed to stop experiment' });
    }
});

app.get('/api/ab-testing/templates', (req, res) => {
    const templates = abTesting.getEmailTestTemplates();
    res.json(templates);
});

// Remarketing dashboard
app.get('/remarketing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remarketing-dashboard.html'));
});

// Demo page
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'remarketing-demo.html'));
});

// WhatsApp campaign stats
app.get('/api/remarketing/whatsapp/stats', (req, res) => {
    const stats = whatsapp.getWhatsAppStats();
    res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Analytics API Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}/admin`);
    console.log(`🎯 Remarketing Dashboard at http://localhost:${PORT}/remarketing`);
    console.log(`🎭 Demo Page at http://localhost:${PORT}/demo`);
    console.log(`📡 WebSocket server running for real-time social proof`);
});

module.exports = app;