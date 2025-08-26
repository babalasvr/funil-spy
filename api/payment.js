const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '/var/www/funil-spy/analytics/.env' });

const app = express();
const PORT = process.env.PAYMENT_API_PORT || 3002;

// Set timezone to São Paulo/Brazil
process.env.TZ = 'America/Sao_Paulo';

// Middleware
app.use(cors());
app.use(express.json());

// ExpfyPay Configuration (from environment variables)
const EXPFY_CONFIG = {
    publicKey: process.env.EXPFY_PUBLIC_KEY,
    secretKey: process.env.EXPFY_SECRET_KEY,
    apiUrl: process.env.EXPFY_API_URL || 'https://pro.expfypay.com/api/v1'
};

// Simple in-memory cache for QR codes
const qrCodeCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache cleaning interval
setInterval(() => {
    const now = Date.now();
    // Clean expired cache entries
    Object.keys(qrCodeCache).forEach(key => {
        if (now > qrCodeCache[key].expiresAt) {
            delete qrCodeCache[key];
        }
    });
    console.log(`🧹 Cache cleaned, ${Object.keys(qrCodeCache).length} entries remaining`);
}, 10 * 60 * 1000); // Clean every 10 minutes

// Debug configuration loading
console.log('🔧 Loading ExpfyPay configuration...');
console.log('📁 Current working directory:', process.cwd());
console.log('🔑 Public key loaded:', EXPFY_CONFIG.publicKey ? '✅ Yes' : '❌ No');
console.log('🔐 Secret key loaded:', EXPFY_CONFIG.secretKey ? '✅ Yes' : '❌ No');
console.log('🌐 API URL:', EXPFY_CONFIG.apiUrl);

// Validate configuration
if (!EXPFY_CONFIG.publicKey || !EXPFY_CONFIG.secretKey) {
    console.error('❌ ExpfyPay credentials not configured. Check .env file.');
    console.log('💡 Expected environment variables:');
    console.log('   - EXPFY_PUBLIC_KEY');
    console.log('   - EXPFY_SECRET_KEY');
    console.log('   - EXPFY_API_URL (optional)');
    process.exit(1);
} else {
    console.log('✅ ExpfyPay credentials configured successfully');
}

// Utility function to get São Paulo time
function getSaoPauloTime() {
    return new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
}

// Utility function to format date for database with São Paulo timezone
function formatSaoPauloDate(date = new Date()) {
    const saoPauloDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return saoPauloDate.toISOString().replace('T', ' ').substring(0, 19);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'payment-api',
        timestamp: getSaoPauloTime(),
        cacheSize: Object.keys(qrCodeCache).length
    });
});

// Create payment endpoint with caching
app.post('/create-payment', async (req, res) => {
    try {
        console.log('🔄 Processing payment request:', {
            amount: req.body.amount,
            customer: req.body.customer?.name,
            external_id: req.body.external_id
        });

        // Create a cache key based on the payment data
        const cacheKey = `${req.body.amount}-${req.body.customer?.document}-${req.body.description}`;
        const now = Date.now();

        // Check if we have a valid cached response
        if (qrCodeCache[cacheKey] && now < qrCodeCache[cacheKey].expiresAt) {
            console.log('✅ Cache hit for payment request');
            return res.json({
                success: true,
                data: qrCodeCache[cacheKey].data,
                cached: true
            });
        }

        const paymentData = {
            amount: req.body.amount,
            description: req.body.description,
            customer: {
                name: req.body.customer.name,
                document: req.body.customer.document,
                email: req.body.customer.email
            },
            external_id: req.body.external_id,
            callback_url: req.body.callback_url
        };
        
        // Add UTM parameters if provided
        if (req.body.utm && Object.keys(req.body.utm).length > 0) {
            paymentData.utm = {
                utm_source: req.body.utm.utm_source || '',
                utm_medium: req.body.utm.utm_medium || '',
                utm_campaign: req.body.utm.utm_campaign || '',
                utm_term: req.body.utm.utm_term || '',
                utm_content: req.body.utm.utm_content || '',
                src: req.body.utm.src || '',
                sck: req.body.utm.sck || ''
            };
        }

        // Make request to ExpfyPay API with reduced timeout
        const response = await axios.post(
            `${EXPFY_CONFIG.apiUrl}/payments`,
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey
                },
                timeout: 8000, // Reduced to 8 seconds for faster response
            }
        );

        console.log('✅ Payment created successfully:', response.data.transaction_id);

        // Cache the response
        qrCodeCache[cacheKey] = {
            data: response.data,
            expiresAt: now + CACHE_TTL
        };

        // Return successful response
        res.json({
            success: true,
            data: response.data,
            cached: false
        });

    } catch (error) {
        console.error('❌ Payment creation failed:', error.message);
        
        // Handle different error types
        if (error.response) {
            // API returned an error
            const statusCode = error.response.status;
            const errorMessage = error.response.data?.message || 'Erro na API de pagamento';
            
            console.error(`API Error ${statusCode}:`, errorMessage);
            
            res.status(statusCode).json({
                success: false,
                error: 'payment_api_error',
                message: errorMessage
            });
        } else if (error.request) {
            // Network error
            console.error('Network Error:', error.message);
            res.status(503).json({
                success: false,
                error: 'network_error',
                message: 'Erro de conexão com o servidor de pagamentos'
            });
        } else {
            // Other error
            console.error('Unknown Error:', error.message);
            res.status(500).json({
                success: false,
                error: 'internal_error',
                message: 'Erro interno do servidor'
            });
        }
    }
});

// Check payment status endpoint
app.get('/payment-status/:transaction_id', async (req, res) => {
    try {
        const transactionId = req.params.transaction_id;
        
        console.log('🔍 Checking payment status for:', transactionId);

        const response = await axios.get(
            `${EXPFY_CONFIG.apiUrl}/payments/${transactionId}`,
            {
                headers: {
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey
                },
                timeout: 8000 // Reduced timeout
            }
        );

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error('❌ Status check failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'status_check_error',
            message: 'Erro ao verificar status do pagamento'
        });
    }
});

// Payment webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        console.log('📨 Webhook received:', req.body);
        
        // Process the webhook
        const { transaction_id, status, amount, customer, external_id } = req.body;
        
        if (status === 'paid') {
            console.log('💰 Payment confirmed for transaction:', transaction_id);
            
            // Extract session ID from external_id (format: funil_{timestamp}_{random})
            const sessionId = external_id.split('_')[1] + '_' + external_id.split('_')[2];
            
            // Register sale in analytics system
            try {
                const analyticsResponse = await axios.post('http://localhost:3001/api/register-sale', {
                    transaction_id,
                    session_id: sessionId,
                    customer_data: customer,
                    amount: parseFloat(amount),
                    order_bump: req.body.order_bump || false,
                    special_offer: req.body.special_offer || false
                }, {
                    timeout: 5000
                });
                
                console.log('✅ Sale registered in analytics:', analyticsResponse.data);
            } catch (analyticsError) {
                console.error('❌ Failed to register sale in analytics:', analyticsError.message);
            }
        }
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ Webhook processing failed:', error.message);
        res.status(500).json({ error: 'webhook_error' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error.message);
    res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Erro interno do servidor'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`💳 Payment API running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Using ExpfyPay API: ${EXPFY_CONFIG.apiUrl}`);
    console.log(`🕒 Timezone set to: ${process.env.TZ}`);
});

module.exports = app;