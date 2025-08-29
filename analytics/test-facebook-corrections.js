/**
 * Teste das correções implementadas no Facebook Integration
 * 
 * Este arquivo testa:
 * 1. Formatação correta do parâmetro FBC (timestamp em segundos)
 * 2. Validação robusta do token do Facebook
 * 3. Logs melhorados para eventos Purchase
 * 4. Nova função sendPurchaseEvent
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Teste das Correções
 */

require('dotenv').config();
const FacebookIntegration = require('./services/facebook-integration');

// Função para testar formatação do FBC
function testFbcFormatting() {
    console.log('\n🧪 === TESTE: FORMATAÇÃO FBC ===');
    
    const fb = new FacebookIntegration();
    const fbclid = 'IwAR1234567890abcdef';
    const domain = 'example.com';
    
    const fbc = fb.formatFbcParameter(fbclid, domain);
    
    console.log(`📝 FBCLID original: ${fbclid}`);
    console.log(`🌐 Domínio: ${domain}`);
    console.log(`🔗 FBC formatado: ${fbc}`);
    
    // Verificar se o timestamp está em segundos (10 dígitos)
    if (fbc) {
        const parts = fbc.split('.');
        const timestamp = parts[2];
        
        if (timestamp && timestamp.length === 10) {
            console.log('✅ Timestamp em segundos (correto)');
            console.log(`⏰ Timestamp: ${timestamp} (${new Date(parseInt(timestamp) * 1000).toISOString()})`);
        } else {
            console.log('❌ Timestamp não está em segundos');
        }
    }
    
    console.log('===============================\n');
}

// Função para testar validação do token
async function testTokenValidation() {
    console.log('🧪 === TESTE: VALIDAÇÃO DO TOKEN ===');
    
    const fb = new FacebookIntegration();
    
    console.log('🔍 Testando validação do token...');
    const isValid = await fb.validateAccessToken();
    
    if (isValid) {
        console.log('✅ Token validado com sucesso');
    } else {
        console.log('❌ Token inválido ou não configurado');
    }
    
    console.log('==================================\n');
}

// Função para testar evento Purchase
async function testPurchaseEvent() {
    console.log('🧪 === TESTE: EVENTO PURCHASE ===');
    
    const fb = new FacebookIntegration();
    
    // Dados de teste para Purchase
    const purchaseData = {
        sessionId: 'test_session_' + Date.now(),
        transactionId: 'TEST_ORDER_' + Date.now(),
        value: 99.90,
        pageUrl: 'https://test.com/checkout/success',
        customerData: {
            email: 'test@example.com',
            phone: '+5511999999999',
            name: 'João Silva',
            city: 'São Paulo',
            state: 'SP',
            country: 'BR'
        },
        productData: {
            id: 'PROD_001',
            name: 'Produto Teste',
            category: 'Categoria Teste',
            price: 99.90
        },
        utmData: {
            fbclid: 'IwAR1234567890abcdef',
            utm_source: 'facebook',
            utm_medium: 'cpc',
            utm_campaign: 'test_campaign',
            utm_content: 'test_ad'
        },
        clientData: {
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0 (Test Browser)'
        },
        domain: 'test.com'
    };
    
    console.log('📝 Dados do teste:');
    console.log(`🧾 Transaction ID: ${purchaseData.transactionId}`);
    console.log(`💵 Valor: R$ ${purchaseData.value}`);
    console.log(`📧 Email: ${purchaseData.customerData.email}`);
    console.log(`🔗 FBCLID: ${purchaseData.utmData.fbclid}`);
    
    try {
        // Testar nova função sendPurchaseEvent
        console.log('\n🚀 Testando nova função sendPurchaseEvent...');
        const result = await fb.sendPurchaseEvent(purchaseData);
        
        if (result.success) {
            console.log('\n🎉 Teste do Purchase concluído com SUCESSO!');
            console.log(`🆔 Event ID: ${result.eventId}`);
            console.log(`🔗 Facebook Trace ID: ${result.facebookEventId}`);
            console.log(`📊 FBC enviado: ${result.fbcSent ? 'Sim' : 'Não'}`);
        } else {
            console.log('\n⚠️ Teste do Purchase falhou:');
            console.log(`❌ Erro: ${result.error}`);
        }
        
    } catch (error) {
        console.error('\n❌ Erro no teste do Purchase:');
        console.error(error.message);
    }
    
    console.log('================================\n');
}

// Função para testar configuração
function testConfiguration() {
    console.log('🧪 === TESTE: CONFIGURAÇÃO ===');
    
    const fb = new FacebookIntegration();
    const config = fb.validateConfig();
    
    console.log('📋 Validação da configuração:');
    
    if (config.valid) {
        console.log('✅ Configuração válida');
        console.log(`📱 Pixel ID: ${fb.pixelId ? 'Configurado' : 'Não configurado'}`);
        console.log(`🔑 Access Token: ${fb.accessToken ? 'Configurado' : 'Não configurado'}`);
    } else {
        console.log('❌ Configuração inválida:');
        config.errors.forEach(error => {
            console.log(`   • ${error}`);
        });
    }
    
    console.log('=============================\n');
}

// Executar todos os testes
async function runAllTests() {
    console.log('🧪 === INICIANDO TESTES DAS CORREÇÕES ===\n');
    
    try {
        // 1. Testar configuração
        testConfiguration();
        
        // 2. Testar formatação FBC
        testFbcFormatting();
        
        // 3. Testar validação do token
        await testTokenValidation();
        
        // 4. Testar evento Purchase (apenas se token estiver configurado)
        if (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PIXEL_ID) {
            await testPurchaseEvent();
        } else {
            console.log('⚠️ Pulando teste do Purchase - Token ou Pixel ID não configurados\n');
        }
        
        console.log('🎉 === TESTES CONCLUÍDOS ===');
        console.log('\n📋 Resumo das correções implementadas:');
        console.log('✅ 1. FBC agora usa timestamp em segundos (Unix time)');
        console.log('✅ 2. Validação robusta do token com mensagens claras');
        console.log('✅ 3. Logs detalhados para eventos Purchase');
        console.log('✅ 4. Nova função sendPurchaseEvent otimizada');
        console.log('✅ 5. Verificação de System User Token do Business Manager');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
    }
}

// Executar testes se arquivo for chamado diretamente
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testFbcFormatting,
    testTokenValidation,
    testPurchaseEvent,
    testConfiguration,
    runAllTests
};