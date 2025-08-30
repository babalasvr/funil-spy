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

        // Validate and sanitize customer document
        let customerDocument = req.body.customer.document;
        
        // If document is empty, null, or undefined, generate a fake CPF
        if (!customerDocument || customerDocument.trim() === '') {
            // Generate a fake but valid CPF format (11 digits)
            customerDocument = '000' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            console.log('⚠️ Empty document provided, using generated CPF:', customerDocument);
        }
        
        const paymentData = {
            amount: req.body.amount,
            description: req.body.description,
            customer: {
                name: req.body.customer.name,
                document: customerDocument,
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
            let errorMessage = 'Erro na API de pagamento';
            
            // Check if response is HTML (common with 400 errors from ExpfyPay)
            const contentType = error.response.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                console.error(`API Error ${statusCode}: HTML response received (likely validation error)`);
                console.error('HTML Response:', error.response.data.substring(0, 200) + '...');
                
                // Provide a more user-friendly error message for HTML responses
                if (statusCode === 400) {
                    errorMessage = 'Dados de pagamento inválidos. Verifique os campos obrigatórios.';
                } else {
                    errorMessage = 'Erro no servidor de pagamentos. Tente novamente.';
                }
            } else {
                // JSON response
                errorMessage = error.response.data?.message || errorMessage;
            }
            
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
// In-memory storage for payment status (in production, use Redis or database)
const paymentStatusCache = new Map();

app.get('/payment-status/:transaction_id', async (req, res) => {
    try {
        const transactionId = req.params.transaction_id;
        
        console.log('🔍 Checking payment status for:', transactionId);

        // First, check if we have the status in cache (from webhook)
        const cachedStatus = paymentStatusCache.get(transactionId);
        if (cachedStatus) {
            console.log('📋 Found cached status:', cachedStatus);
            return res.json({
                success: true,
                payment_status: cachedStatus.status,
                data: cachedStatus,
                source: 'webhook_cache'
            });
        }

        // If not in cache, try to fetch from ExpfyPay API
        try {
            const response = await axios.get(
                `${EXPFY_CONFIG.apiUrl}/payments/${transactionId}`,
                {
                    headers: {
                        'X-Public-Key': EXPFY_CONFIG.publicKey,
                        'X-Secret-Key': EXPFY_CONFIG.secretKey
                    },
                    timeout: 8000
                }
            );

            console.log('✅ Payment status response from API:', response.data);

            // Extract payment status from the response
            let paymentStatus = '';
            if (response.data && response.data.status) {
                paymentStatus = response.data.status;
            } else if (response.data && response.data.data && response.data.data.status) {
                paymentStatus = response.data.data.status;
            }

            console.log('📊 Payment status from API:', paymentStatus);

            // Cache the status for future requests
            paymentStatusCache.set(transactionId, {
                status: paymentStatus,
                data: response.data,
                updated_at: new Date().toISOString()
            });

            res.json({
                success: true,
                data: response.data,
                payment_status: paymentStatus,
                source: 'api_direct'
            });

        } catch (apiError) {
            console.error('❌ API status check failed:', apiError.message);
            
            // If API returns 404, the transaction might not exist or be expired
            if (apiError.response && apiError.response.status === 404) {
                console.log('⚠️ Transaction not found in API, checking if it was recently created...');
                
                // For recently created transactions, return pending status
                // This handles the case where ExpfyPay API doesn't immediately make transactions available
                return res.json({
                    success: true,
                    payment_status: 'pending',
                    message: 'Transação criada recentemente, aguardando confirmação via webhook',
                    source: 'fallback_pending'
                });
            }
            
            // For other API errors, return error response
            throw apiError;
        }

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
        
        // Always cache the payment status for future status checks
        if (transaction_id && status) {
            console.log(`💾 Caching payment status: ${transaction_id} -> ${status}`);
            paymentStatusCache.set(transaction_id, {
                status: status,
                data: req.body,
                updated_at: new Date().toISOString(),
                source: 'webhook'
            });
        }
        
        if (
            status === 'paid' ||
            status === 'completed' ||
            req.body.event === 'payment.confirmed'
        ) {
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

// Development endpoint to simulate payment confirmation (for testing)
app.post('/simulate-payment-confirmation/:transaction_id', async (req, res) => {
    try {
        const transactionId = req.params.transaction_id;
        
        console.log('🧪 Simulating payment confirmation for:', transactionId);
        
        // Simulate webhook data
        const webhookData = {
            transaction_id: transactionId,
            status: 'paid',
            amount: req.body.amount || 1.00,
            customer: req.body.customer || {
                name: 'Test User',
                document: '12345678901',
                email: 'test@test.com'
            },
            external_id: req.body.external_id || `funil_${Date.now()}_test`,
            event: 'payment.confirmed'
        };
        
        // Cache the payment status
        paymentStatusCache.set(transactionId, {
            status: 'paid',
            data: webhookData,
            updated_at: new Date().toISOString(),
            source: 'simulation'
        });
        
        console.log('✅ Payment confirmation simulated and cached');
        
        res.json({
            success: true,
            message: 'Payment confirmation simulated',
            transaction_id: transactionId,
            status: 'paid'
        });
        
    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'simulation_error',
            message: 'Erro ao simular confirmação de pagamento'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`💳 Payment API running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Using ExpfyPay API: ${EXPFY_CONFIG.apiUrl}`);
    console.log(`🕒 Timezone set to: ${process.env.TZ}`);
    console.log(`🧪 Simulation endpoint: http://localhost:${PORT}/simulate-payment-confirmation/:transaction_id`);
});

module.exports = app;