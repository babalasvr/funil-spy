/**
 * Teste da Integração UTMify + Facebook Conversions API para Checkout
 * Demonstra o uso completo seguindo o template fornecido
 */

const UTMifyCheckoutIntegration = require('./services/utmify-checkout-integration');

async function testUTMifyCheckoutIntegration() {
    console.log('🧪 Testando Integração UTMify + Facebook CAPI para Checkout\n');
    
    try {
        const integration = new UTMifyCheckoutIntegration();
        
        // Dados do checkout (simulando template {{checkout.*}})
        const checkoutData = {
            name: 'Maria Santos',
            email: 'maria.santos@email.com',
            phone: '+5511987654321',
            total: '297.00'
        };
        
        // Parâmetros UTM capturados via UTMify (simulando template {{utm.*}})
        const utmData = {
            source: 'facebook',
            medium: 'paid-social',
            campaign: 'lancamento-produto',
            content: 'video-vendas',
            term: 'marketing-digital'
        };
        
        // Opções adicionais
        const options = {
            currency: 'BRL',
            contentName: 'Produto Digital',
            contentCategory: 'Curso',
            fbclid: 'IwAR1a2b3c4d5e6f7g8h9i0j' // Simulando parâmetro Facebook
        };
        
        console.log('📋 Dados de Entrada:');
        console.log('Checkout:', checkoutData);
        console.log('UTM:', utmData);
        console.log('Opções:', options);
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Teste 1: Coletar dados do checkout
        console.log('📊 Teste 1: Coletando dados do checkout...');
        const collectedData = integration.collectCheckoutData(checkoutData);
        console.log('Dados coletados:', collectedData);
        console.log('');
        
        // Teste 2: Capturar parâmetros UTM
        console.log('🎯 Teste 2: Capturando parâmetros UTM...');
        const utmParams = integration.captureUTMParameters(utmData);
        console.log('UTM capturados:', utmParams);
        console.log('');
        
        // Teste 3: Preparar payload para Facebook
        console.log('🔧 Teste 3: Preparando payload para Facebook CAPI...');
        const { payload, eventId, userData, utmParams: capturedUTM } = integration.prepareFacebookPayload(checkoutData, utmData, options);
        
        console.log('Event ID gerado:', eventId);
        console.log('Estrutura do payload:');
        console.log('- Event Name:', payload.data[0].event_name);
        console.log('- Event Time:', payload.data[0].event_time, '(Unix timestamp)');
        console.log('- Currency:', payload.data[0].custom_data.currency);
        console.log('- Value:', payload.data[0].custom_data.value);
        console.log('- Action Source:', payload.data[0].action_source);
        console.log('- FBC Parameter:', payload.data[0].user_data.fbc || 'N/A');
        console.log('- User Data Hash:', {
            email_hashed: !!payload.data[0].user_data.em,
            phone_hashed: !!payload.data[0].user_data.ph,
            name_hashed: !!payload.data[0].user_data.fn
        });
        console.log('');
        
        // Teste 4: Enviar para Facebook CAPI (simulação)
        console.log('🚀 Teste 4: Enviando para Facebook Conversions API...');
        const result = await integration.processCheckout({
            checkout: checkoutData,
            utm: utmData,
            options: options
        });
        
        console.log('\n' + '='.repeat(50));
        console.log('📈 RESULTADO FINAL:');
        console.log('='.repeat(50));
        
        if (result.success) {
            console.log('✅ Status: SUCESSO');
            console.log('🔑 Event ID:', result.eventId);
            console.log('📊 Eventos Recebidos:', result.response?.events_received || 'N/A');
            console.log('🔗 Facebook Trace ID:', result.response?.fbtrace_id || 'N/A');
            console.log('👤 Dados do Usuário Enviados:', result.userData);
            console.log('🎯 UTM Enviados:', result.utmParams);
            console.log('🔗 FBC Enviado:', result.fbc_sent ? 'Sim' : 'Não');
        } else {
            console.log('❌ Status: ERRO');
            console.log('💥 Erro:', result.error);
            console.log('🔑 Event ID:', result.eventId);
            console.log('📊 Status HTTP:', result.status || 'N/A');
            if (result.facebookError) {
                console.log('🔍 Detalhes do Erro Facebook:', result.facebookError);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📋 ESTRUTURA COMPLETA DO PAYLOAD ENVIADO:');
        console.log('='.repeat(50));
        console.log('Endpoint:', integration.endpoint);
        console.log('Method: POST');
        console.log('Headers: {"Content-Type": "application/json"}');
        console.log('Body:', JSON.stringify({
            data: [{
                event_name: payload.data[0].event_name,
                event_time: payload.data[0].event_time,
                event_id: payload.data[0].event_id,
                user_data: {
                    em: '[HASH_EMAIL]',
                    ph: '[HASH_PHONE]',
                    fn: '[HASH_NAME]',
                    fbc: payload.data[0].user_data.fbc || 'N/A'
                },
                custom_data: payload.data[0].custom_data,
                action_source: payload.data[0].action_source
            }],
            access_token: '[HIDDEN]'
        }, null, 2));
        
        console.log('\n✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testUTMifyCheckoutIntegration();
}

module.exports = { testUTMifyCheckoutIntegration };