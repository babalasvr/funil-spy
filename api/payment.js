const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '../analytics/.env' });

const app = express();
const PORT = process.env.PAYMENT_API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// ExpfyPay Configuration (from environment variables)
const EXPFY_CONFIG = {
    publicKey: process.env.EXPFY_PUBLIC_KEY,
    secretKey: process.env.EXPFY_SECRET_KEY,
    apiUrl: process.env.EXPFY_API_URL || 'https://pro.expfypay.com/api/v1'
};

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'payment-api',
        timestamp: new Date().toISOString()
    });
});

// Create payment endpoint
app.post('/create-payment', async (req, res) => {
    try {
        console.log('🔄 Processing payment request:', {
            amount: req.body.amount,
            customer: req.body.customer?.name,
            external_id: req.body.external_id
        });

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

        // Make request to ExpfyPay API
        const response = await axios.post(
            `${EXPFY_CONFIG.apiUrl}/payments`,
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('✅ Payment created successfully:', response.data.transaction_id);

        // Return successful response
        res.json({
            success: true,
            data: response.data
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
                timeout: 10000
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
app.post('/webhook', (req, res) => {
    try {
        console.log('📨 Webhook received:', req.body);
        
        // Here you would process the webhook
        // Update payment status in database
        // Send confirmation emails
        // etc.
        
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
});

module.exports = app;