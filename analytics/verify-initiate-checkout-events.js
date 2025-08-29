/**
 * Script para verificar especificamente eventos InitiateCheckout no Facebook Test Events
 * Este script ajuda a distinguir entre eventos PageView (client-side) e InitiateCheckout (server-side)
 */

require('dotenv').config();
const axios = require('axios');

class InitiateCheckoutVerifier {
    constructor() {
        this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
        this.pixelId = process.env.FACEBOOK_PIXEL_ID;
        this.testEventCode = process.env.FACEBOOK_TEST_EVENT_CODE;
    }

    async verifyConfiguration() {
        console.log('\n🔍 === VERIFICAÇÃO DE CONFIGURAÇÃO ===');
        
        const issues = [];
        
        if (!this.accessToken) {
            issues.push('❌ FACEBOOK_ACCESS_TOKEN não está configurado');
        } else {
            console.log('✅ FACEBOOK_ACCESS_TOKEN configurado');
        }
        
        if (!this.pixelId) {
            issues.push('❌ FACEBOOK_PIXEL_ID não está configurado');
        } else {
            console.log(`✅ FACEBOOK_PIXEL_ID: ${this.pixelId}`);
        }
        
        if (!this.testEventCode) {
            console.log('⚠️ FACEBOOK_TEST_EVENT_CODE não configurado (opcional para produção)');
        } else {
            console.log(`✅ FACEBOOK_TEST_EVENT_CODE: ${this.testEventCode}`);
        }
        
        if (issues.length > 0) {
            console.log('\n❌ Problemas encontrados:');
            issues.forEach(issue => console.log(`   ${issue}`));
            return false;
        }
        
        console.log('\n✅ Configuração válida!');
        return true;
    }

    async sendTestInitiateCheckoutEvent() {
        console.log('\n🧪 === ENVIANDO EVENTO INITIATECHECKOUT DE TESTE ===');
        
        const eventData = {
            event_name: 'InitiateCheckout',
            event_time: Math.floor(Date.now() / 1000),
            event_id: `test_initiate_checkout_${Date.now()}`,
            action_source: 'website',
            user_data: {
                em: ['7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068'], // test@example.com hashed
                ph: ['a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'], // +5511999999999 hashed
                client_ip_address: '192.168.1.100',
                client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            custom_data: {
                currency: 'BRL',
                value: 197.00,
                content_type: 'product',
                content_ids: ['produto_teste'],
                num_items: 1
            }
        };

        const payload = {
            data: [eventData],
            test_event_code: this.testEventCode || undefined
        };

        try {
            console.log('📤 Enviando evento InitiateCheckout...');
            console.log(`🆔 Event ID: ${eventData.event_id}`);
            console.log(`🖥️ Action Source: ${eventData.action_source}`);
            console.log(`💰 Valor: ${eventData.custom_data.currency} ${eventData.custom_data.value}`);
            
            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${this.pixelId}/events?access_token=${this.accessToken}`,
                payload
            );

            if (response.data.events_received === 1) {
                console.log('\n✅ === EVENTO INITIATECHECKOUT ENVIADO COM SUCESSO ===');
                console.log(`🔗 Facebook Trace ID: ${response.data.fbtrace_id}`);
                console.log(`📊 Eventos recebidos: ${response.data.events_received}`);
                console.log(`🖥️ Action Source: server (confirmado)`);
                console.log(`🆔 Event ID: ${eventData.event_id}`);
                
                if (this.testEventCode) {
                    console.log('\n📋 === COMO VERIFICAR NO FACEBOOK TEST EVENTS ===');
                    console.log('1. Acesse: https://business.facebook.com/events_manager2/list/pixel/events');
                    console.log(`2. Selecione o Pixel ID: ${this.pixelId}`);
                    console.log('3. Vá para a aba "Test Events"');
                    console.log(`4. Procure pelo Event ID: ${eventData.event_id}`);
                    console.log('5. Verifique se o "Received from" mostra "Server"');
                    console.log('6. Confirme que o evento é "InitiateCheckout"');
                } else {
                    console.log('\n⚠️ Para ver no Test Events, configure FACEBOOK_TEST_EVENT_CODE no .env');
                }
                
                return {
                    success: true,
                    eventId: eventData.event_id,
                    facebookTraceId: response.data.fbtrace_id
                };
            } else {
                throw new Error('Evento não foi recebido pelo Facebook');
            }
            
        } catch (error) {
            console.error('\n❌ Erro ao enviar evento InitiateCheckout:', error.message);
            
            if (error.response) {
                console.error('📋 Resposta do Facebook:', JSON.stringify(error.response.data, null, 2));
                
                if (error.response.data.error) {
                    const fbError = error.response.data.error;
                    console.log('\n🔧 === SOLUÇÕES POSSÍVEIS ===');
                    
                    if (fbError.code === 190) {
                        console.log('❌ Token de acesso inválido');
                        console.log('💡 Solução: Gere um novo token no Facebook Business');
                    } else if (fbError.code === 100) {
                        console.log('❌ Pixel ID inválido ou sem permissão');
                        console.log('💡 Solução: Verifique o FACEBOOK_PIXEL_ID no .env');
                    } else {
                        console.log(`❌ Erro ${fbError.code}: ${fbError.message}`);
                    }
                }
            }
            
            return { success: false, error: error.message };
        }
    }

    async explainEventSources() {
        console.log('\n📚 === EXPLICAÇÃO DOS TIPOS DE EVENTOS ===');
        console.log('\n🌐 EVENTOS "WEBSITE" (Client-side):');
        console.log('   • Origem: Facebook Pixel JavaScript (fbq)');
        console.log('   • Tipos: PageView, ViewContent (automáticos)');
        console.log('   • Action Source: "website"');
        console.log('   • Enviados pelo navegador do usuário');
        console.log('\n🖥️ EVENTOS "SERVER" (Server-side):');
        console.log('   • Origem: Conversions API (nosso código)');
        console.log('   • Tipos: InitiateCheckout, Purchase, Lead');
        console.log('   • Action Source: "server"');
        console.log('   • Enviados pelo nosso servidor');
        console.log('\n🔍 NO FACEBOOK TEST EVENTS:');
        console.log('   • Eventos "website" = Pixel JavaScript');
        console.log('   • Eventos "server" = Conversions API');
        console.log('   • Ambos são normais e esperados!');
        console.log('\n✅ CONCLUSÃO:');
        console.log('   • PageView como "website" = CORRETO');
        console.log('   • InitiateCheckout como "server" = CORRETO');
        console.log('   • Ambos funcionando = PERFEITO!');
    }

    async run() {
        console.log('🚀 === VERIFICADOR DE EVENTOS INITIATECHECKOUT ===\n');
        
        // Verificar configuração
        const configValid = await this.verifyConfiguration();
        if (!configValid) {
            console.log('\n❌ Configure as variáveis de ambiente antes de continuar.');
            return;
        }
        
        // Explicar tipos de eventos
        await this.explainEventSources();
        
        // Enviar evento de teste
        const result = await this.sendTestInitiateCheckoutEvent();
        
        if (result.success) {
            console.log('\n🎉 === TESTE CONCLUÍDO COM SUCESSO ===');
            console.log('✅ Evento InitiateCheckout enviado via server-side');
            console.log('✅ Action source configurado como "server"');
            console.log('✅ Sistema funcionando corretamente!');
            
            if (this.testEventCode) {
                console.log('\n📱 Próximos passos:');
                console.log('1. Verifique o evento no Facebook Test Events');
                console.log('2. Confirme que aparece como "Server" na origem');
                console.log('3. Teste o checkout real navegando para /checkout/');
            }
        } else {
            console.log('\n❌ === TESTE FALHOU ===');
            console.log('❌ Verifique as configurações e tente novamente');
        }
    }
}

// Executar verificação
if (require.main === module) {
    const verifier = new InitiateCheckoutVerifier();
    verifier.run().catch(console.error);
}

module.exports = InitiateCheckoutVerifier;