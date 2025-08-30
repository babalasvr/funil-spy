/**
 * Script de Teste Local - Verificar S2S Facebook na VPS
 * Testa se o sistema está enviando eventos Purchase para Facebook via S2S
 */

const axios = require('axios');

// URLs da VPS
const VPS_URL = 'https://descubra-zap.top';
const ANALYTICS_URL = `${VPS_URL}:3001`;
const WEBHOOK_URL = `${VPS_URL}:3002`;

// Dados de teste
const sessionId = 'test_session_' + Date.now();
const transactionId = 'test_txn_' + Date.now();
const externalId = 'test_ext_' + Date.now();

async function testFacebookS2S() {
    console.log('🧪 Teste S2S Facebook - VPS');
    console.log('=' .repeat(50));
    
    try {
        // 1. Armazenar UTM na VPS
        console.log('📊 1. Armazenando UTM na VPS...');
        const utmData = {
            session_id: sessionId,
            utm_source: 'facebook',
            utm_medium: 'cpc', 
            utm_campaign: 'teste-s2s',
            utm_content: 'ad-teste',
            utm_term: 'compra-teste',
            utm_id: 'test_' + Date.now(),
            fbclid: 'IwAR0test' + Math.random().toString(36).substr(2, 9),
            customer_email: 'teste@s2s.com',
            customer_phone: '11999999999',
            customer_name: 'Cliente S2S Teste'
        };
        
        const storeResponse = await axios.post(`${ANALYTICS_URL}/api/store-utm`, utmData, {
            timeout: 10000
        });
        console.log('✅ UTM armazenado:', storeResponse.data);
        
        // 2. Simular webhook de pagamento
        console.log('\n💳 2. Simulando pagamento na VPS...');
        const webhookPayload = {
            event: 'payment.confirmed',
            data: {
                id: transactionId,
                external_id: externalId,
                status: 'paid',
                amount: 27.90,
                customer: {
                    email: 'teste@s2s.com',
                    phone: '11999999999',
                    name: 'Cliente S2S Teste'
                }
            }
        };
        
        const webhookResponse = await axios.post(`${WEBHOOK_URL}/webhook`, webhookPayload, {
            timeout: 15000
        });
        console.log('✅ Webhook processado:', webhookResponse.data);
        
        console.log('\n🎉 Teste S2S concluído!');
        console.log(`Session ID: ${sessionId}`);
        console.log(`Transaction ID: ${transactionId}`);
        console.log('\n📋 O que foi testado:');
        console.log('   ✅ Armazenamento de UTM na VPS');
        console.log('   ✅ Processamento de webhook na VPS');
        console.log('   🎯 Envio automático para Facebook S2S');
        console.log('\n🔍 Verificar no Facebook Events Manager:');
        console.log('   https://business.facebook.com/events_manager2/');
        console.log('   Procurar por evento "Purchase" nos últimos minutos');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Dica: Verifique se os serviços estão rodando na VPS');
        }
    }
}

testFacebookS2S();