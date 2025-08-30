// Load environment variables
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// Import lead capture routes
const leadCaptureRoutes = require('./routes/lead-capture');
const utmifyIntegrationRoutes = require('./routes/utmify-integration');
const trackingRoutes = require('./routes/tracking-routes');
const utmifyCheckoutRoutes = require('./routes/utmify-checkout-api');
const UTMifyFacebookBridge = require('./services/utmify-facebook-bridge');
const FacebookIntegration = require('./services/facebook-integration');
const SecurityConfig = require('./config/security-config');
const MonitoringService = require('./services/monitoring-service');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Set timezone to São Paulo/Brazil
process.env.TZ = 'America/Sao_Paulo';

// Utility function to get São Paulo time
function getSaoPauloTime() {
    return new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
}

// Utility function to format date for database with São Paulo timezone
function formatSaoPauloDate(date = new Date()) {
    // Create a new Date object in São Paulo timezone
    const saoPauloDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return saoPauloDate.toISOString().replace('T', ' ').substring(0, 19);
}

// Configurar middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.utmify.com.br", "https://connect.facebook.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.utmify.com.br", "https://graph.facebook.com"]
        }
    }
}));

// Instanciar serviços de tracking
const bridge = new UTMifyFacebookBridge();
const facebook = new FacebookIntegration();
const monitoring = new MonitoringService();

// Aplicar configurações de segurança
SecurityConfig.configure(app);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Middleware de monitoramento
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        monitoring.recordRequest(req, res, responseTime);
    });
    
    next();
});

// Middleware para detectar acesso à página checkout e disparar InitiateCheckout
app.use((req, res, next) => {
    // Detectar se a requisição é para a página checkout/index.html
    if (req.url.includes('checkout/index.html') || req.url.includes('checkout') && req.method === 'GET') {
        // Capturar dados da requisição
        const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || generateSessionId();
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const referrer = req.headers.referer || req.headers.referrer;
        
        // Extrair dados do usuário dos headers ou query params
        const userEmail = req.headers['x-user-email'] || req.query.email;
        const userPhone = req.headers['x-user-phone'] || req.query.phone;
        const userName = req.headers['x-user-name'] || req.query.name;
        const checkoutValue = req.headers['x-checkout-value'] || req.query.value;
        const productIds = req.headers['x-product-ids'] || req.query.product_ids;
        const fbclid = req.query.fbclid;
        
        // Dados do evento InitiateCheckout
        const eventData = {
            event_name: 'InitiateCheckout',
            session_id: sessionId,
            page_url: req.url,
            client_ip_address: clientIp,
            client_user_agent: userAgent,
            referrer: referrer,
            timestamp: new Date().toISOString(),
            // Dados do usuário
            user_data: {
                em: userEmail ? [userEmail] : undefined,
                ph: userPhone ? [userPhone] : undefined,
                fn: userName ? [userName.split(' ')[0]] : undefined,
                ln: userName ? [userName.split(' ').slice(1).join(' ')] : undefined,
                external_id: sessionId
            },
            // Dados customizados do checkout
            custom_data: {
                content_type: 'product',
                currency: 'BRL',
                value: checkoutValue ? parseFloat(checkoutValue) : undefined,
                content_ids: productIds ? productIds.split(',') : undefined,
                num_items: productIds ? productIds.split(',').length : 1
            },
            // Facebook Click ID se disponível
            fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined
        };
        
        // Processar evento através do bridge e facebook integration
        setImmediate(async () => {
            try {
                console.log(`[CHECKOUT DETECTION] ===== EVENTO INITIATE CHECKOUT DETECTADO =====`);
                console.log(`[CHECKOUT DETECTION] URL: ${req.url}`);
                console.log(`[CHECKOUT DETECTION] Session ID: ${sessionId}`);
                console.log(`[CHECKOUT DETECTION] IP Cliente: ${clientIp}`);
                console.log(`[CHECKOUT DETECTION] User Agent: ${userAgent}`);
                console.log(`[CHECKOUT DETECTION] Referrer: ${referrer}`);
                
                // Log dos dados do usuário coletados
                console.log(`[CHECKOUT DETECTION] Dados do Usuário:`, {
                    email: userEmail ? 'Presente' : 'Ausente',
                    phone: userPhone ? 'Presente' : 'Ausente',
                    name: userName ? 'Presente' : 'Ausente'
                });
                
                // Log dos dados do checkout
                console.log(`[CHECKOUT DETECTION] Dados do Checkout:`, {
                    value: checkoutValue || 'Não informado',
                    product_ids: productIds || 'Não informado',
                    num_items: productIds ? productIds.split(',').length : 1,
                    currency: 'BRL'
                });
                
                // Log do Facebook Click ID
                console.log(`[CHECKOUT DETECTION] Facebook Click ID (fbclid): ${fbclid ? 'Presente' : 'Ausente'}`);
                if (fbclid) {
                    console.log(`[CHECKOUT DETECTION] FBC gerado: fb.1.${Date.now()}.${fbclid}`);
                }
                
                // Enviar para Facebook Conversions API usando função específica
                await facebook.sendInitiateCheckoutEvent(eventData);
                
                // Registrar no monitoramento
                monitoring.recordFacebookEvent('InitiateCheckout', {
                    session_id: sessionId,
                    page_url: req.url,
                    success: true
                });
                
                console.log(`[CHECKOUT DETECTION] ===== EVENTO INITIATE CHECKOUT ENVIADO COM SUCESSO =====`);
                console.log(`[CHECKOUT DETECTION] Session ID: ${sessionId}`);
                console.log(`[CHECKOUT DETECTION] Action Source: server`);
                console.log(`[CHECKOUT DETECTION] Dados enviados para Facebook Conversions API`);
                console.log(`[CHECKOUT DETECTION] Monitoramento registrado com sucesso`);
                console.log(`[CHECKOUT DETECTION] ========================================================`);
            } catch (error) {
                console.error(`[CHECKOUT DETECTION] Erro ao processar evento InitiateCheckout:`, error);
                monitoring.recordFacebookEvent('InitiateCheckout', {
                    session_id: sessionId,
                    page_url: req.url,
                    success: false,
                    error: error.message
                });
            }
        });
    }
    
    next();
});
// Serve static files for tracking scripts only
app.use(express.static(path.join(__dirname, 'public')));

// Serve checkout files from parent directory
app.use('/checkout', express.static(path.join(__dirname, '..', 'checkout')));

// Use lead capture routes
app.use('/api', leadCaptureRoutes);
app.use('/api', utmifyIntegrationRoutes);
app.use('/api', utmifyCheckoutRoutes);

// Usar rotas de tracking avançado
app.use('/api/tracking', trackingRoutes(bridge, facebook, monitoring));

// Endpoints de monitoramento
app.get('/api/monitoring/metrics', (req, res) => {
    res.json(monitoring.getMetrics());
});

app.get('/api/monitoring/health', (req, res) => {
    const health = monitoring.getHealthStatus();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
});

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
    
    // Sales table for detailed sales tracking
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        session_id TEXT NOT NULL,
        customer_name TEXT,
        customer_email TEXT,
        customer_document TEXT,
        amount DECIMAL(10,2) NOT NULL,
        order_bump BOOLEAN DEFAULT FALSE,
        special_offer BOOLEAN DEFAULT FALSE,
        payment_method TEXT DEFAULT 'PIX',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'analytics-service'
    });
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
        ip_address, user_agent, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run([
        sessionId, eventName, pageUrl, pageTitle, JSON.stringify(properties),
        utmParams.utm_source, utmParams.utm_medium, utmParams.utm_campaign,
        utmParams.utm_term, utmParams.utm_content,
        deviceType, browser, os, screenWidth, screenHeight,
        req.ip, userAgent, formatSaoPauloDate()
    ], function(err) {
        if (err) {
            console.error('Error inserting event:', err);
            return res.status(500).json({ error: 'Failed to track event' });
        }

        // Update or create session
        updateSession(sessionId, pageUrl, pageTitle, utmParams, deviceType);
        
        res.json({ success: true, eventId: this.lastID });
    });
});

// Update session data
function updateSession(sessionId, pageUrl, pageTitle, utmParams, deviceType) {
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
                updated_at = ?
                WHERE session_id = ?`, 
                [pageUrl, formatSaoPauloDate(), sessionId]);
        } else {
            // Create new session
            db.run(`INSERT INTO sessions (
                session_id, first_page, last_page, total_events,
                utm_source, utm_medium, utm_campaign, device_type, created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`, [
                sessionId, pageUrl, pageUrl,
                utmParams.utm_source, utmParams.utm_medium, 
                utmParams.utm_campaign, deviceType,
                formatSaoPauloDate(), formatSaoPauloDate()
            ]);
        }
    });
}

// Endpoint to capture lead data even when payment is not completed
app.post('/api/capture-lead', (req, res) => {
    const {
        session_id,
        customer_data,
        current_page
    } = req.body;

    // Update session with customer data
    db.run(`UPDATE sessions SET 
        converted = 0,
        updated_at = ?
        WHERE session_id = ?`, 
        [formatSaoPauloDate(), session_id], function(err) {
        if (err) {
            console.error('Error updating session:', err);
            return res.status(500).json({ error: 'Failed to capture lead' });
        }

        // Insert partial conversion record
        const stmt = db.prepare(`INSERT INTO conversions (
            session_id, conversion_type, value, order_bump, special_offer, customer_data, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            session_id,
            'partial_lead',
            0,
            false,
            false,
            JSON.stringify(customer_data),
            formatSaoPauloDate()
        ], function(convErr) {
            if (convErr) {
                console.error('Error inserting partial conversion:', convErr);
                return res.status(500).json({ error: 'Failed to capture lead' });
            }

            res.json({ success: true, message: 'Lead data captured successfully' });
        });
    });
});

// Endpoint to register sales data (essential for payment integration)
app.post('/api/register-sale', (req, res) => {
    const {
        transaction_id,
        session_id,
        customer_data,
        amount,
        order_bump,
        special_offer
    } = req.body;

    // Generate transaction_id if not provided
    const finalTransactionId = transaction_id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert sale record
    const stmt = db.prepare(`INSERT INTO sales (
        transaction_id, session_id, customer_name, customer_email, customer_document,
        amount, order_bump, special_offer, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run([
        finalTransactionId,
        session_id,
        customer_data?.name || '',
        customer_data?.email || '',
        customer_data?.document || '',
        amount,
        order_bump || false,
        special_offer || false,
        'paid',
        formatSaoPauloDate(),
        formatSaoPauloDate()
    ], function(err) {
        if (err) {
            console.error('Error inserting sale:', err);
            return res.status(500).json({ error: 'Failed to register sale' });
        }

        // Also update conversions table for backward compatibility
        const conversionStmt = db.prepare(`INSERT INTO conversions (
            session_id, conversion_type, value, order_bump, special_offer, customer_data, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

        conversionStmt.run([
            session_id,
            'payment',
            amount,
            order_bump || false,
            special_offer || false,
            JSON.stringify(customer_data),
            formatSaoPauloDate()
        ], function(convErr) {
            if (convErr) {
                console.error('Error inserting conversion:', convErr);
            }

            // Update session as converted
            db.run(`UPDATE sessions SET 
                converted = 1, 
                revenue = revenue + ?,
                updated_at = ?
                WHERE session_id = ?`, 
                [amount, formatSaoPauloDate(), session_id]);

            res.json({ success: true, saleId: this.lastID });
        });
    });
});

// Enhanced track event endpoint with localStorage data
app.post('/api/track-enhanced', (req, res) => {
    const {
        sessionId,
        eventName,
        properties = {},
        pageUrl,
        pageTitle,
        userAgent,
        screenWidth,
        screenHeight,
        localStorageData = {}
    } = req.body;

    // Merge localStorage data with properties
    const enhancedProperties = {
        ...properties,
        ...localStorageData,
        // Extract specific localStorage keys
        alvoMonitoramento: localStorageData.alvoMonitoramento,
        numeroClonado: localStorageData.numeroClonado,
        fotoperfil: localStorageData.fotoperfil,
        Status: localStorageData.Status,
        customerData: localStorageData.customerData ? JSON.parse(localStorageData.customerData || '{}') : {},
        currentTransaction: localStorageData.currentTransaction ? JSON.parse(localStorageData.currentTransaction || '{}') : {}
    };

    // Extract UTM parameters
    const utmParams = {
        utm_source: enhancedProperties.utm_source || null,
        utm_medium: enhancedProperties.utm_medium || null,
        utm_campaign: enhancedProperties.utm_campaign || null,
        utm_term: enhancedProperties.utm_term || null,
        utm_content: enhancedProperties.utm_content || null
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

    // Insert event with enhanced data
    const stmt = db.prepare(`INSERT INTO events (
        session_id, event_name, page_url, page_title, properties,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        device_type, browser, os, screen_width, screen_height,
        ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run([
        sessionId, eventName, pageUrl, pageTitle, JSON.stringify(enhancedProperties),
        utmParams.utm_source, utmParams.utm_medium, utmParams.utm_campaign,
        utmParams.utm_term, utmParams.utm_content,
        deviceType, browser, os, screenWidth, screenHeight,
        req.ip, userAgent
    ], function(err) {
        if (err) {
            console.error('Error inserting enhanced event:', err);
            return res.status(500).json({ error: 'Failed to track event' });
        }

        // Update or create session
        updateSession(sessionId, pageUrl, pageTitle, utmParams, deviceType);
        
        res.json({ success: true, eventId: this.lastID });
    });
});

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

// Generate session ID endpoint
app.get('/api/session', (req, res) => {
    res.json({ sessionId: generateSessionId() });
});

// 404 handler for all dashboard routes (completely removed for performance)
app.get(['/admin', '/dashboard*', '/admin-dashboard', '/remarketing-dashboard', '/api/stats', '/api/leads', '/api/sales', '/api/analytics/*'], (req, res) => {
    res.status(404).json({ error: 'Dashboard services removed for performance optimization' });
});

// Limpeza automática do cache (a cada hora)
setInterval(() => {
    try {
        bridge.cleanupCache(24); // Limpar dados com mais de 24 horas
    } catch (error) {
        console.error('❌ Erro na limpeza do cache:', error);
    }
}, 60 * 60 * 1000); // 1 hora

// Inicializar monitoramento
monitoring.startMonitoring();

// Relatórios diários de monitoramento
setInterval(() => {
    monitoring.generateDailyReport();
}, 24 * 60 * 60 * 1000); // 24 horas

// Start server
server.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Analytics service running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 API Tracking: http://localhost:${PORT}/api/tracking`);
    console.log(`⚠️  Dashboard services DISABLED for performance optimization`);
    console.log(`✅ Core tracking and payment integration services ACTIVE`);
    
    // Testar configuração do Facebook na inicialização
    try {
        const facebookTest = await facebook.testConnection();
        if (facebookTest.success) {
            console.log('✅ Facebook Pixel + Conversions API configurado corretamente');
            monitoring.recordFacebookEvent('connection_test', true);
        } else {
            console.log('⚠️  Facebook não configurado - verifique as variáveis de ambiente');
            monitoring.recordFacebookEvent('connection_test', false);
        }
    } catch (error) {
        console.log('⚠️  Erro ao testar Facebook:', error.message);
        monitoring.recordFacebookEvent('connection_test', false);
    }
});