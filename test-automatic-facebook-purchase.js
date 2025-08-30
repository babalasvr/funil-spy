/**
 * Script de Teste - Envio Automático de Eventos Purchase para Facebook
 * 
 * Este script simula uma compra para testar se o webhook está enviando
 * automaticamente os eventos Purchase para o Facebook.
 */

const axios = require('axios');

// Configurações do teste
const VPS_URL = 'https://descubra-zap.top';
const ANALYTICS_URL = 'http://localhost:3001'; // URL do analytics na VPS
const WEBHOOK_URL = 'http://localhost:3002'; // URL do webhook na VPS

// Dados de teste simulando uma compra real
const testData = {
    // Dados UTM simulados
    utmData: {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'teste-automatico',
        utm_content: 'ad-teste',
        utm_term: 'compra-teste',
        utm_id: 'test_' + Date.now(),
        fbclid: 'IwAR0test' + Math.random().toString(36).substr(2, 9),
        session_id: 'test_session_' + Date.now(),
        customer_email: 'teste@exemplo.com',
        customer_phone: '11999999999',
        customer_name: 'Cliente Teste'
    },
    
    // Dados de pagamento simulados
    paymentData: {
        transaction_id: 'test_txn_' + Date.now(),
        external_id: 'test_ext_' + Date.now(),
        amount: 27.90,
        status: 'paid',
        customer: {
            email: 'teste@exemplo.com',
            phone: '11999999999',
            name: 'Cliente Teste'
        }
    }
};

async function testAutomaticFacebookPurchase() {
    console.log('🧪 Iniciando teste de envio automático para Facebook...');
    console.log('=' .repeat(60));
    
    try {
        // Passo 1: Armazenar dados UTM
        console.log('📊 Passo 1: Armazenando dados UTM...');
        const storeUtmResponse = await axios.post(`${ANALYTICS_URL}/api/store-utm`, testData.utmData);
        console.log('✅ UTM armazenado:', storeUtmResponse.data);
        
        // Aguardar um pouco
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Passo 2: Verificar se UTM foi armazenado
        console.log('\n🔍 Passo 2: Verificando armazenamento UTM...');
        const getUtmResponse = await axios.get(`${ANALYTICS_URL}/api/get-utm/${testData.utmData.session_id}`);
        console.log('✅ UTM recuperado:', getUtmResponse.data);
        
        // Passo 3: Simular webhook de pagamento
        console.log('\n💳 Passo 3: Simulando confirmação de pagamento...');
        
        // Criar payload do webhook simulando ExpfyPay
        const webhookPayload = {
            event: 'payment.confirmed',
            data: {
                id: testData.paymentData.transaction_id,
                external_id: testData.paymentData.external_id,
                status: 'paid',
                amount: testData.paymentData.amount,
                customer: testData.paymentData.customer,
                created_at: new Date().toISOString()
            }
        };
        
        console.log('📤 Enviando webhook payload:', JSON.stringify(webhookPayload, null, 2));
        
        const webhookResponse = await axios.post(`${WEBHOOK_URL}/webhook`, webhookPayload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ExpfyPay-Webhook/1.0'
            }
        });
        
        console.log('✅ Webhook processado:', webhookResponse.data);
        
        // Passo 4: Aguardar processamento e verificar logs
        console.log('\n⏳ Aguardando processamento...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n🎉 Teste concluído!');
        console.log('=' .repeat(60));
        console.log('📋 Resumo do teste:');
        console.log(`   • Session ID: ${testData.utmData.session_id}`);
        console.log(`   • Transaction ID: ${testData.paymentData.transaction_id}`);
        console.log(`   • Valor: R$ ${testData.paymentData.amount}`);
        console.log(`   • UTM Source: ${testData.utmData.utm_source}`);
        console.log(`   • FBCLID: ${testData.utmData.fbclid}`);
        console.log('\n🔍 Verifique os logs do PM2 para confirmar o envio para Facebook:');
        console.log('   pm2 logs payment-api --lines 20');
        console.log('   pm2 logs analytics-service --lines 20');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        console.log('\n🔧 Possíveis soluções:');
        console.log('   1. Verificar se os serviços estão rodando: pm2 status');
        console.log('   2. Verificar logs de erro: pm2 logs --error');
        console.log('   3. Testar conectividade: curl http://localhost:3001/health');
    }
}

// Executar teste
if (require.main === module) {
    testAutomaticFacebookPurchase();
}

module.exports = { testAutomaticFacebookPurchase, testData };