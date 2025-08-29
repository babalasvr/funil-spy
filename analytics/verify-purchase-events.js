/**
 * Script para verificar eventos Purchase no Facebook Test Events
 * 
 * Este script ajuda a:
 * 1. Enviar eventos Purchase de teste para o Facebook
 * 2. Verificar se aparecem no Facebook Test Events
 * 3. Validar a configuração do UTMify Checkout Integration
 * 4. Diagnosticar problemas de visibilidade no Test Events
 */

const UTMifyCheckoutIntegration = require('./services/utmify-checkout-integration');
const FacebookIntegration = require('./services/facebook-integration');

class PurchaseEventVerifier {
    constructor() {
        this.integration = new UTMifyCheckoutIntegration();
        this.facebookIntegration = new FacebookIntegration();
    }

    /**
     * Envia evento Purchase de teste
     */
    async sendTestPurchaseEvent() {
        console.log('🛒 Enviando evento Purchase de teste...');
        console.log('=' .repeat(50));
        
        const testData = {
            checkout: {
                name: 'João Teste Purchase',
                email: 'joao.purchase@teste.com',
                phone: '+5511999888777',
                total: '497.00'
            },
            utm: {
                source: 'google',
                medium: 'cpc', 
                campaign: 'teste-purchase-event',
                content: 'anuncio-teste',
                term: 'comprar-produto'
            },
            options: {
                currency: 'BRL',
                contentName: 'Produto Teste Purchase',
                contentCategory: 'Teste',
                fbclid: 'IwAR1TestPurchaseEvent123456'
            }
        };

        try {
            const result = await this.integration.processCheckout(testData);
            
            if (result.success) {
                console.log('\n✅ EVENTO PURCHASE ENVIADO COM SUCESSO!');
                console.log('🔑 Event ID:', result.eventId);
                console.log('📊 Events Received:', result.response.events_received);
                console.log('🔗 Facebook Trace ID:', result.response.fbtrace_id);
                console.log('💰 Valor:', 'R$ 497,00');
                console.log('🎯 UTMs Enviados:', result.utmParams);
                
                return {
                    success: true,
                    eventId: result.eventId,
                    facebookTraceId: result.response.fbtrace_id,
                    eventsReceived: result.response.events_received,
                    utmData: result.utmParams
                };
            } else {
                console.log('\n❌ FALHA AO ENVIAR EVENTO PURCHASE');
                console.log('💥 Erro:', result.error);
                console.log('🔑 Event ID:', result.eventId);
                console.log('📊 Status HTTP:', result.status);
                
                if (result.facebookError) {
                    console.log('🔍 Detalhes do Erro Facebook:');
                    console.log(JSON.stringify(result.facebookError, null, 2));
                }
                
                return {
                    success: false,
                    error: result.error,
                    eventId: result.eventId
                };
            }
            
        } catch (error) {
            console.error('\n❌ Erro durante o teste:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fornece instruções para verificar no Facebook Test Events
     */
    showTestEventsInstructions(result) {
        console.log('\n' + '='.repeat(60));
        console.log('📋 COMO VERIFICAR NO FACEBOOK TEST EVENTS');
        console.log('='.repeat(60));
        
        console.log('\n1. 🌐 Acesse: https://www.facebook.com/events_manager2/list/pixel/1228910731857928/test_events');
        console.log('\n2. 🔍 Procure por:');
        console.log('   📅 Event Name: Purchase');
        console.log('   🌍 Action Source: Website');
        
        if (result.success) {
            console.log('   🔑 Event ID:', result.eventId);
            console.log('   🔗 Facebook Trace ID:', result.facebookTraceId);
            console.log('   ⏰ Timestamp: Próximo ao horário atual');
        }
        
        console.log('\n3. 📊 Dados esperados no evento:');
        console.log('   💰 Currency: BRL');
        console.log('   💵 Value: 497');
        console.log('   📦 Content Name: Produto Teste Purchase');
        console.log('   🏷️ Content Category: Teste');
        
        if (result.success && result.utmData) {
            console.log('\n4. 🎯 UTM Parameters no custom_data:');
            console.log('   📍 utm_source:', result.utmData.utm_source);
            console.log('   📊 utm_medium:', result.utmData.utm_medium);
            console.log('   🎯 utm_campaign:', result.utmData.utm_campaign);
            console.log('   📝 utm_content:', result.utmData.utm_content);
            console.log('   🔍 utm_term:', result.utmData.utm_term);
        }
        
        console.log('\n5. ⚠️ Se não aparecer:');
        console.log('   ⏳ Aguarde alguns minutos (pode haver delay)');
        console.log('   🔄 Atualize a página do Test Events');
        console.log('   🔍 Verifique se não há filtros ativos');
        console.log('   📱 Confirme o Pixel ID correto (1228910731857928)');
        
        console.log('\n6. ✅ Confirmação de sucesso:');
        console.log('   📊 Events Received: 1 (confirmado pelo Facebook)');
        console.log('   🔗 Trace ID válido fornecido');
        console.log('   🎯 UTMs incluídos no custom_data');
    }

    /**
     * Executa verificação completa
     */
    async runCompleteVerification() {
        console.log('🔍 VERIFICAÇÃO DE EVENTOS PURCHASE');
        console.log('🎯 Testando envio de eventos Purchase com UTMs');
        console.log('📱 Pixel ID: 1228910731857928');
        console.log('🌍 Action Source: website');
        console.log('');
        
        // Validar token primeiro
        console.log('🔐 Validando token do Facebook...');
        const isTokenValid = await this.facebookIntegration.validateAccessToken();
        if (!isTokenValid) {
            console.error('❌ Token inválido - verifique a configuração');
            return;
        }
        console.log('✅ Token válido!');
        
        // Enviar evento de teste
        const result = await this.sendTestPurchaseEvent();
        
        // Mostrar instruções
        this.showTestEventsInstructions(result);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 VERIFICAÇÃO CONCLUÍDA!');
        console.log('='.repeat(60));
        
        if (result.success) {
            console.log('✅ Evento Purchase enviado com sucesso para o Facebook');
            console.log('📊 Deve aparecer no Test Events em alguns minutos');
            console.log('🎯 UTMs incluídos no payload');
        } else {
            console.log('❌ Falha no envio do evento Purchase');
            console.log('🔧 Verifique a configuração e tente novamente');
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const verifier = new PurchaseEventVerifier();
    verifier.runCompleteVerification().catch(console.error);
}

module.exports = PurchaseEventVerifier;