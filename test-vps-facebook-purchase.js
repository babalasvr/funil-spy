/**
 * Script de Teste VPS - Envio Automático Facebook
 * Execute na VPS: node test-vps-facebook-purchase.js
 */

const axios = require('axios');

// URLs locais da VPS
const ANALYTICS_URL = 'http://localhost:3001';
const WEBHOOK_URL = 'http://localhost:3002';

// Dados de teste
const sessionId = 'test_session_' + Date.now();
const transactionId = 'test_txn_' + Date.now();
const externalId = 'test_ext_' + Date.now();

async function testVPSFacebookPurchase() {
    console.log('🧪 Teste VPS - Envio Automático Facebook');
    console.log('=' .repeat(50));
    
    try {
        // 1. Armazenar UTM
        console.log('📊 1. Armazenando UTM...');
        const utmData = {
            session_id: sessionId,
            utm_source: 'facebook',
            utm_medium: 'cpc', 
            utm_campaign: 'teste-vps',
            utm_content: 'ad-teste',
            utm_term: 'compra-teste',
            utm_id: 'test_' + Date.now(),
            fbclid: 'IwAR0test' + Math.random().toString(36).substr(2, 9),
            customer_email: 'teste@vps.com',
            customer_phone: '11999999999',
            customer_name: 'Cliente VPS Teste'
        };
        
        const storeResponse = await axios.post(`${ANALYTICS_URL}/api/store-utm`, utmData);
        console.log('✅ UTM armazenado:', storeResponse.data);
        
        // 2. Simular webhook
        console.log('\n💳 2. Simulando pagamento...');
        const webhookPayload = {
            event: 'payment.confirmed',
            data: {
                id: transactionId,
                external_id: externalId,
                status: 'paid',
                amount: 27.90,
                customer: {
                    email: 'teste@vps.com',
                    phone: '11999999999',
                    name: 'Cliente VPS Teste'
                }
            }
        };
        
        const webhookResponse = await axios.post(`${WEBHOOK_URL}/webhook`, webhookPayload);
        console.log('✅ Webhook processado:', webhookResponse.data);
        
        console.log('\n🎉 Teste concluído!');
        console.log(`Session ID: ${sessionId}`);
        console.log(`Transaction ID: ${transactionId}`);
        console.log('\n🔍 Verificar logs:');
        console.log('pm2 logs payment-api --lines 10');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testVPSFacebookPurchase();