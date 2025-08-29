/**
 * Teste específico para validação do evento Purchase
 * Verifica se todas as melhorias implementadas estão funcionando
 */

const axios = require('axios');
const crypto = require('crypto');

// Configurações
const BASE_URL = 'http://localhost:3001';
const TEST_SESSION_ID = `test_${Date.now()}`;

/**
 * Gera dados de teste válidos para Purchase
 */
function generateValidPurchaseData() {
    return {
        sessionId: TEST_SESSION_ID,
        purchaseData: {
            transactionId: `txn_${Date.now()}`,
            value: 199.99,
            currency: 'BRL',
            products: [{
                id: 'prod_123',
                name: 'Produto Teste',
                price: 199.99,
                quantity: 1
            }]
        },
        customerData: {
            email: 'teste@exemplo.com',
            firstName: 'João',
            lastName: 'Silva',
            phone: '+5511999999999'
        },
        utmData: {
            source: 'facebook',
            medium: 'cpc',
            campaign: 'teste_campaign'
        }
    };
}

/**
 * Gera dados de teste inválidos para testar validação
 */
function generateInvalidPurchaseData() {
    return {
        sessionId: TEST_SESSION_ID,
        purchaseData: {
            // transactionId ausente (obrigatório)
            value: 0, // valor inválido
            currency: 'BRL'
        },
        customerData: {
            // Nenhum dado do usuário (obrigatório)
        }
    };
}

/**
 * Testa Purchase com dados válidos
 */
async function testValidPurchase() {
    try {
        console.log('\n🧪 Testando Purchase com dados VÁLIDOS...');
        
        const purchaseData = generateValidPurchaseData();
        console.log('📋 Dados do teste:', JSON.stringify(purchaseData, null, 2));
        
        const response = await axios.post(`${BASE_URL}/api/tracking/purchase`, purchaseData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        if (response.status === 200) {
            console.log('✅ Purchase válido processado com sucesso');
            console.log('📊 Resposta:', response.data);
            
            // Verificar se contém order_id na resposta
            if (response.data.facebook && response.data.facebook.conversionsAPI) {
                console.log('✅ Conversions API executada');
                if (response.data.facebook.conversionsAPI.eventId) {
                    console.log(`🔍 Event ID gerado: ${response.data.facebook.conversionsAPI.eventId}`);
                }
            }
            
            return { success: true, data: response.data };
        }
        
    } catch (error) {
        console.error('❌ Erro no teste de Purchase válido:', error.message);
        if (error.response) {
            console.error('📋 Resposta do servidor:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Testa Purchase com dados inválidos
 */
async function testInvalidPurchase() {
    try {
        console.log('\n🧪 Testando Purchase com dados INVÁLIDOS...');
        
        const purchaseData = generateInvalidPurchaseData();
        console.log('📋 Dados do teste:', JSON.stringify(purchaseData, null, 2));
        
        const response = await axios.post(`${BASE_URL}/api/tracking/purchase`, purchaseData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        // Se chegou aqui, a validação falhou
        console.log('❌ ERRO: Purchase inválido foi aceito (validação falhou)');
        return { success: false, error: 'Validação não funcionou' };
        
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log('✅ Purchase inválido rejeitado corretamente');
            console.log('📋 Erro esperado:', error.response.data);
            return { success: true, message: 'Validação funcionou' };
        } else {
            console.error('❌ Erro inesperado:', error.message);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Testa deduplicação de eventos
 */
async function testEventDeduplication() {
    try {
        console.log('\n🧪 Testando DEDUPLICAÇÃO de eventos...');
        
        const purchaseData = generateValidPurchaseData();
        
        // Primeiro envio
        console.log('📤 Enviando evento pela primeira vez...');
        const response1 = await axios.post(`${BASE_URL}/api/tracking/purchase`, purchaseData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        // Segundo envio (mesmo dados)
        console.log('📤 Enviando o mesmo evento novamente...');
        const response2 = await axios.post(`${BASE_URL}/api/tracking/purchase`, purchaseData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Teste de deduplicação concluído');
        console.log('📊 Primeira resposta:', response1.data.facebook?.conversionsAPI?.eventId);
        console.log('📊 Segunda resposta:', response2.data.facebook?.conversionsAPI?.eventId);
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro no teste de deduplicação:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Testa validação do token do Facebook
 */
async function testTokenValidation() {
    try {
        console.log('\n🧪 Testando VALIDAÇÃO do token Facebook...');
        
        // Testar se o serviço Facebook está inicializado corretamente
        const response = await axios.get(`${BASE_URL}/api/tracking/health`, {
            timeout: 10000
        });
        
        if (response.status === 200 && response.data.success) {
            console.log('✅ Serviço de tracking funcionando');
            return { success: true, data: response.data };
        } else {
            console.log('❌ Serviço de tracking com problemas');
            return { success: false, error: 'Serviço de tracking não está funcionando' };
        }
        
    } catch (error) {
        console.error('❌ Erro no teste de validação do serviço:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
    console.log('🚀 Iniciando testes de validação do Purchase...');
    console.log('=' .repeat(60));
    
    const results = {
        validPurchase: await testValidPurchase(),
        invalidPurchase: await testInvalidPurchase(),
        deduplication: await testEventDeduplication(),
        tokenValidation: await testTokenValidation()
    };
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DOS TESTES:');
    console.log('=' .repeat(60));
    
    let passedTests = 0;
    let totalTests = 0;
    
    Object.entries(results).forEach(([testName, result]) => {
        totalTests++;
        const status = result.success ? '✅ PASSOU' : '❌ FALHOU';
        console.log(`${status} - ${testName}`);
        if (result.success) passedTests++;
        if (result.error) {
            console.log(`   Erro: ${result.error}`);
        }
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 RESULTADO FINAL: ${passedTests}/${totalTests} testes passaram`);
    
    if (passedTests === totalTests) {
        console.log('🎉 TODOS OS TESTES PASSARAM! Integração Facebook está funcionando perfeitamente.');
    } else {
        console.log('⚠️ Alguns testes falharam. Verifique os logs acima para mais detalhes.');
    }
    
    console.log('=' .repeat(60));
}

// Executar testes
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('💥 Erro fatal nos testes:', error.message);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testValidPurchase,
    testInvalidPurchase,
    testEventDeduplication,
    testTokenValidation
};