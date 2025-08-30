/**
 * Teste de Validação do Event Name
 * Verifica se as correções para o problema de event_name ausente estão funcionando
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Event Name Validation Fix
 */

const FacebookIntegration = require('./services/facebook-integration');
const UTMifyFacebookBridge = require('./services/utmify-facebook-bridge');

async function testEventNameValidation() {
    console.log('🧪 === TESTE DE VALIDAÇÃO DO EVENT_NAME ===\n');
    
    const facebook = new FacebookIntegration();
    const bridge = new UTMifyFacebookBridge();
    
    // Teste 1: Evento com eventName válido
    console.log('1️⃣ Testando evento com eventName válido...');
    try {
        const validEventData = {
            sessionId: 'test_session_001',
            eventName: 'Purchase',
            pageUrl: 'https://example.com/checkout',
            pageTitle: 'Checkout',
            customerData: {
                email: 'test@example.com',
                name: 'Test User'
            },
            value: 99.99,
            transactionId: 'txn_test_001',
            timestamp: Date.now()
        };
        
        const result = await facebook.processEvent(validEventData);
        console.log('✅ Evento válido processado com sucesso');
        console.log('📋 Event ID:', result.eventId);
        console.log('📋 CAPI Success:', result.conversionsAPI?.success ? '✅' : '❌');
        
    } catch (error) {
        console.log('❌ Erro inesperado:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 2: Evento com eventName undefined
    console.log('2️⃣ Testando evento com eventName undefined...');
    try {
        const invalidEventData = {
            sessionId: 'test_session_002',
            eventName: undefined,
            pageUrl: 'https://example.com/page',
            customerData: {
                email: 'test@example.com'
            }
        };
        
        const result = await facebook.processEvent(invalidEventData);
        console.log('❌ ERRO: Evento inválido foi processado (não deveria acontecer)');
        
    } catch (error) {
        console.log('✅ Erro capturado corretamente:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 3: Evento com eventName vazio
    console.log('3️⃣ Testando evento com eventName vazio...');
    try {
        const emptyEventData = {
            sessionId: 'test_session_003',
            eventName: '',
            pageUrl: 'https://example.com/page',
            customerData: {
                email: 'test@example.com'
            }
        };
        
        const result = await facebook.processEvent(emptyEventData);
        console.log('❌ ERRO: Evento com eventName vazio foi processado (não deveria acontecer)');
        
    } catch (error) {
        console.log('✅ Erro capturado corretamente:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 4: Evento com eventName null
    console.log('4️⃣ Testando evento com eventName null...');
    try {
        const nullEventData = {
            sessionId: 'test_session_004',
            eventName: null,
            pageUrl: 'https://example.com/page',
            customerData: {
                email: 'test@example.com'
            }
        };
        
        const result = await facebook.processEvent(nullEventData);
        console.log('❌ ERRO: Evento com eventName null foi processado (não deveria acontecer)');
        
    } catch (error) {
        console.log('✅ Erro capturado corretamente:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 5: Evento com eventName que não é string
    console.log('5️⃣ Testando evento com eventName que não é string...');
    try {
        const nonStringEventData = {
            sessionId: 'test_session_005',
            eventName: 123,
            pageUrl: 'https://example.com/page',
            customerData: {
                email: 'test@example.com'
            }
        };
        
        const result = await facebook.processEvent(nonStringEventData);
        console.log('❌ ERRO: Evento com eventName não-string foi processado (não deveria acontecer)');
        
    } catch (error) {
        console.log('✅ Erro capturado corretamente:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 6: Teste de mapeamento de eventos
    console.log('6️⃣ Testando mapeamento de eventos customizados...');
    try {
        const customEventData = {
            sessionId: 'test_session_006',
            eventName: 'lead_captured',
            pageUrl: 'https://example.com/lead',
            customerData: {
                email: 'test@example.com',
                name: 'Test User'
            },
            timestamp: Date.now()
        };
        
        const result = await facebook.processEvent(customEventData);
        console.log('✅ Evento customizado mapeado com sucesso');
        console.log('📋 Event ID:', result.eventId);
        
    } catch (error) {
        console.log('❌ Erro no mapeamento:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Teste 7: Teste com evento não mapeado
    console.log('7️⃣ Testando evento não mapeado...');
    try {
        const unmappedEventData = {
            sessionId: 'test_session_007',
            eventName: 'custom_unknown_event',
            pageUrl: 'https://example.com/unknown',
            customerData: {
                email: 'test@example.com'
            },
            timestamp: Date.now()
        };
        
        const result = await facebook.processEvent(unmappedEventData);
        console.log('⚠️ Evento não mapeado processado (com aviso esperado)');
        console.log('📋 Event ID:', result.eventId);
        
    } catch (error) {
        console.log('❌ Erro inesperado:', error.message);
    }
    
    console.log('\n🎯 === TESTE CONCLUÍDO ===');
    console.log('\n📋 Resumo:');
    console.log('✅ Eventos válidos devem ser processados');
    console.log('❌ Eventos com eventName inválido devem ser rejeitados');
    console.log('⚠️ Eventos não mapeados devem gerar avisos mas serem processados');
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testEventNameValidation()
        .then(() => {
            console.log('\n✅ Teste de validação concluído');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Erro no teste:', error);
            process.exit(1);
        });
}

module.exports = {
    testEventNameValidation
};