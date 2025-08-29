/**
 * Teste para validar a implementação do parâmetro FBP (Facebook Browser ID)
 * Conforme documentação oficial do Facebook Marketing API
 */

const FacebookIntegration = require('./services/facebook-integration');
require('dotenv').config();

// Criar instância do Facebook Integration
const facebookIntegration = new FacebookIntegration();

// Mock de dados de teste
const testEventData = {
    transactionId: 'test_transaction_' + Date.now(),
    value: 99.99,
    currency: 'BRL',
    customerData: {
        email: 'test@example.com',
        phone: '+5511999999999',
        firstName: 'João',
        lastName: 'Silva'
    },
    clientData: {
        fbp: 'fb.1.1703123456.1234567890', // Formato correto do FBP
        fbc: 'fb.1.1703123456.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890', // Formato correto do FBC
        fbclid: 'IwAR1234567890'
    },
    utmData: {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'test_campaign',
        fbclid: 'IwAR1234567890'
    }
};

/**
 * Testa a validação e formatação do parâmetro FBP
 */
function testFbpValidation() {
    console.log('\n🧪 Testando validação do parâmetro FBP...');
    
    // Teste 1: FBP válido
    const validFbp = 'fb.1.1703123456.1234567890';
    const result1 = facebookIntegration.validateAndFormatFbp(validFbp);
    console.log(`✅ FBP válido: ${validFbp} -> ${result1}`);
    
    // Teste 2: FBP inválido (formato incorreto)
    const invalidFbp = 'invalid_fbp_format';
    const result2 = facebookIntegration.validateAndFormatFbp(invalidFbp);
    console.log(`❌ FBP inválido: ${invalidFbp} -> ${result2}`);
    
    // Teste 3: FBP null/undefined
    const result3 = facebookIntegration.validateAndFormatFbp(null);
    console.log(`⚠️  FBP null: null -> ${result3}`);
    
    return {
        validFbp: result1 === validFbp,
        invalidFbp: result2 === null,
        nullFbp: result3 === null
    };
}

/**
 * Testa o processamento completo de evento com FBP e FBC
 */
async function testCompleteEventProcessing() {
    console.log('\n🧪 Testando processamento completo do evento...');
    
    try {
        const result = await facebookIntegration.sendPurchaseEvent(testEventData);
        
        console.log('📊 Resultado do processamento:');
        console.log(`- Status: ${result.success ? '✅ Sucesso' : '❌ Falha'}`);
        console.log(`- FBP enviado: ${result.fbp_sent ? '✅ Sim' : '❌ Não'}`);
        console.log(`- FBC enviado: ${result.fbc_sent ? '✅ Sim' : '❌ Não'}`);
        
        if (result.payload) {
            const userData = result.payload.data[0].user_data;
            console.log('\n📋 Dados do usuário no payload:');
            console.log(`- FBP: ${userData.fbp || 'Não incluído'}`);
            console.log(`- FBC: ${userData.fbc || 'Não incluído'}`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Erro no processamento:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Testa diferentes cenários de dados do cliente
 */
async function testDifferentScenarios() {
    console.log('\n🧪 Testando diferentes cenários...');
    
    const scenarios = [
        {
            name: 'Apenas FBP',
            clientData: { fbp: 'fb.1.1703123456.1234567890' },
            utmData: { utm_source: 'test', utm_medium: 'test' }
        },
        {
            name: 'Apenas FBC',
            clientData: { fbc: 'fb.1.1703123456.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890' },
            utmData: { utm_source: 'test', utm_medium: 'test', fbclid: 'IwAR1234567890' }
        },
        {
            name: 'FBP e FBC',
            clientData: {
                fbp: 'fb.1.1703123456.1234567890',
                fbc: 'fb.1.1703123456.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'
            },
            utmData: { utm_source: 'test', utm_medium: 'test', fbclid: 'IwAR1234567890' }
        },
        {
            name: 'Sem dados do Facebook',
            clientData: {},
            utmData: { utm_source: 'test', utm_medium: 'test' }
        }
    ];
    
    const results = [];
    
    for (const scenario of scenarios) {
        console.log(`\n📋 Cenário: ${scenario.name}`);
        
        const eventData = {
            ...testEventData,
            transactionId: 'test_transaction_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            clientData: scenario.clientData,
            utmData: scenario.utmData
        };
        
        try {
            const result = await facebookIntegration.sendPurchaseEvent(eventData);
            console.log(`- Status: ${result.success ? '✅ Sucesso' : '❌ Falha'}`);
            console.log(`- FBP enviado: ${result.fbp_sent ? '✅ Sim' : '❌ Não'}`);
            console.log(`- FBC enviado: ${result.fbc_sent ? '✅ Sim' : '❌ Não'}`);
            
            results.push({
                scenario: scenario.name,
                success: result.success,
                fbp_sent: result.fbp_sent,
                fbc_sent: result.fbc_sent
            });
        } catch (error) {
            console.error(`❌ Erro: ${error.message}`);
            results.push({
                scenario: scenario.name,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
    console.log('🚀 Iniciando testes da implementação FBP + FBC\n');
    console.log('=' .repeat(60));
    
    // Teste 1: Validação do FBP
    const fbpValidationResults = testFbpValidation();
    
    // Teste 2: Processamento completo
    const completeProcessingResult = await testCompleteEventProcessing();
    
    // Teste 3: Diferentes cenários
    const scenarioResults = await testDifferentScenarios();
    
    // Resumo dos resultados
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('=' .repeat(60));
    
    console.log('\n🔍 Validação FBP:');
    console.log(`- FBP válido: ${fbpValidationResults.validFbp ? '✅' : '❌'}`);
    console.log(`- FBP inválido rejeitado: ${fbpValidationResults.invalidFbp ? '✅' : '❌'}`);
    console.log(`- FBP null tratado: ${fbpValidationResults.nullFbp ? '✅' : '❌'}`);
    
    console.log('\n🔄 Processamento completo:');
    console.log(`- Evento processado: ${completeProcessingResult.success ? '✅' : '❌'}`);
    console.log(`- FBP incluído: ${completeProcessingResult.fbp_sent ? '✅' : '❌'}`);
    console.log(`- FBC incluído: ${completeProcessingResult.fbc_sent ? '✅' : '❌'}`);
    
    console.log('\n📋 Cenários testados:');
    scenarioResults.forEach(result => {
        console.log(`- ${result.scenario}: ${result.success ? '✅' : '❌'}`);
    });
    
    const allTestsPassed = 
        fbpValidationResults.validFbp &&
        fbpValidationResults.invalidFbp &&
        fbpValidationResults.nullFbp &&
        completeProcessingResult.success &&
        scenarioResults.every(r => r.success);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 RESULTADO FINAL: ${allTestsPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
    console.log('=' .repeat(60));
    
    return allTestsPassed;
}

// Executar testes se o arquivo for chamado diretamente
if (require.main === module) {
    runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Erro fatal nos testes:', error);
            process.exit(1);
        });
}

module.exports = {
    testFbpValidation,
    testCompleteEventProcessing,
    testDifferentScenarios,
    runAllTests
};