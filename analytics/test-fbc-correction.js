/**
 * Teste da Correção do Parâmetro FBC
 * 
 * Este script testa a correção do bug no formatFbcParameter onde o timestamp
 * estava sendo enviado em segundos quando deveria ser em milissegundos.
 * 
 * Referência: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/
 */

const FacebookIntegration = require('./services/facebook-integration');

async function testFbcCorrection() {
    console.log('🧪 === TESTE DA CORREÇÃO DO PARÂMETRO FBC ===\n');
    
    const facebook = new FacebookIntegration();
    
    // 1. Testar formatação do FBC com diferentes cenários
    console.log('1️⃣ Testando formatação do FBC...');
    
    const testCases = [
        {
            fbclid: 'IwAR2F4-dbP0l7Mn1IawQQGCINEz7PYXQvwjNwB_qa2ofrHyiLjcbCRxTDMgk',
            domain: 'descubra-zap.top',
            expected: 'fb.1.TIMESTAMP.IwAR2F4-dbP0l7Mn1IawQQGCINEz7PYXQvwjNwB_qa2ofrHyiLjcbCRxTDMgk'
        },
        {
            fbclid: 'IwAR1234567890TestClickId',
            domain: 'www.example.com',
            expected: 'fb.2.TIMESTAMP.IwAR1234567890TestClickId'
        },
        {
            fbclid: 'IwAR9876543210AnotherTest',
            domain: null,
            expected: 'fb.1.TIMESTAMP.IwAR9876543210AnotherTest'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📋 Testando: ${testCase.fbclid}`);
        console.log(`   Domínio: ${testCase.domain || 'null (default)'}`);
        
        const result = facebook.formatFbcParameter(testCase.fbclid, testCase.domain);
        console.log(`   Resultado: ${result}`);
        
        // Validar formato
        const parts = result.split('.');
        if (parts.length === 4 && parts[0] === 'fb') {
            const timestamp = parseInt(parts[2]);
            const now = Date.now();
            
            console.log(`   ✅ Formato válido: fb.${parts[1]}.${parts[2]}.${parts[3]}`);
            console.log(`   📅 Timestamp: ${timestamp} (${new Date(timestamp).toISOString()})`);
            
            // Verificar se timestamp está em milissegundos (deve ser próximo ao atual)
            const timeDiff = Math.abs(now - timestamp);
            if (timeDiff < 5000) { // menos de 5 segundos de diferença
                console.log(`   ✅ Timestamp em milissegundos: CORRETO`);
            } else {
                console.log(`   ❌ Timestamp incorreto: diferença de ${timeDiff}ms`);
            }
        } else {
            console.log(`   ❌ Formato inválido`);
        }
    }
    
    // 2. Testar evento completo com FBC
    console.log('\n2️⃣ Testando evento completo com FBC...');
    
    const eventData = {
        sessionId: 'test-session-fbc-correction',
        eventName: 'Purchase',
        pageUrl: 'https://descubra-zap.top/checkout/',
        value: 297.00,
        transactionId: 'TEST-FBC-' + Date.now(),
        customerData: {
            email: 'teste@email.com',
            phone: '+5511999999999',
            name: 'João Silva'
        },
        utmData: {
            utm_source: 'facebook',
            utm_medium: 'paid-social',
            utm_campaign: 'teste-fbc-correction',
            fbclid: 'IwAR2F4-dbP0l7Mn1IawQQGCINEz7PYXQvwjNwB_qa2ofrHyiLjcbCRxTDMgk'
        },
        productData: {
            id: 'produto-digital',
            name: 'Curso Digital',
            category: 'Educação',
            price: 297.00
        },
        domain: 'descubra-zap.top'
    };
    
    console.log('\n📤 Preparando dados do evento...');
    const preparedEvent = facebook.prepareEventData(eventData);
    
    if (preparedEvent) {
        console.log('\n📋 Dados preparados:');
        console.log(`   Event Name: ${preparedEvent.event_name}`);
        console.log(`   Event Time: ${preparedEvent.event_time}`);
        console.log(`   Event ID: ${preparedEvent.event_id}`);
        console.log(`   Action Source: ${preparedEvent.action_source}`);
        console.log(`   Event Source URL: ${preparedEvent.event_source_url}`);
        
        if (preparedEvent.user_data.fbc) {
            console.log(`   ✅ FBC: ${preparedEvent.user_data.fbc}`);
            
            // Validar FBC no payload
            const fbcParts = preparedEvent.user_data.fbc.split('.');
            const fbcTimestamp = parseInt(fbcParts[2]);
            const now = Date.now();
            
            if (Math.abs(now - fbcTimestamp) < 5000) {
                console.log(`   ✅ FBC timestamp correto (milissegundos)`);
            } else {
                console.log(`   ❌ FBC timestamp incorreto`);
            }
        } else {
            console.log(`   ❌ FBC não encontrado no payload`);
        }
        
        // 3. Enviar evento de teste
        console.log('\n3️⃣ Enviando evento de teste para Facebook...');
        
        try {
            const result = await facebook.sendToConversionsAPI(preparedEvent);
            
            if (result.success) {
                console.log('\n✅ Evento enviado com sucesso!');
                console.log(`   Events Received: ${result.events_received}`);
                console.log(`   FB Trace ID: ${result.fbtrace_id}`);
                
                if (result.messages && result.messages.length > 0) {
                    console.log('\n📋 Mensagens do Facebook:');
                    result.messages.forEach(msg => {
                        console.log(`   ${msg}`);
                    });
                }
            } else {
                console.log('\n❌ Erro ao enviar evento:');
                console.log(`   ${result.error}`);
            }
        } catch (error) {
            console.log('\n❌ Erro na requisição:');
            console.log(`   ${error.message}`);
        }
    } else {
        console.log('❌ Falha ao preparar dados do evento');
    }
    
    // 4. Resumo da correção
    console.log('\n📊 === RESUMO DA CORREÇÃO ===');
    console.log('\n🐛 Problema identificado:');
    console.log('   - FBC timestamp estava sendo enviado em SEGUNDOS');
    console.log('   - Facebook requer timestamp em MILISSEGUNDOS');
    console.log('   - Isso causava rejeição dos eventos pelo Facebook');
    
    console.log('\n✅ Correção aplicada:');
    console.log('   - Mudança de Math.floor(Date.now() / 1000) para Date.now()');
    console.log('   - Timestamp agora está em milissegundos');
    console.log('   - Formato FBC agora está conforme documentação');
    
    console.log('\n📚 Referência:');
    console.log('   https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/');
    
    console.log('\n🎯 Próximos passos:');
    console.log('   1. Testar na VPS com: node test-fbc-correction.js');
    console.log('   2. Verificar se o erro do Facebook foi resolvido');
    console.log('   3. Monitorar eventos no Facebook Events Manager');
}

// Executar teste
if (require.main === module) {
    testFbcCorrection()
        .then(() => {
            console.log('\n🎉 Teste da correção FBC concluído!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Erro no teste:', error);
            process.exit(1);
        });
}

module.exports = {
    testFbcCorrection
};