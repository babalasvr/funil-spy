/**
 * Script para testar e diagnosticar problemas com o token do Facebook
 * 
 * Este script verifica:
 * 1. Se o token está configurado corretamente
 * 2. Se o token é válido e não expirou
 * 3. Se o token tem acesso ao Pixel especificado
 * 4. Se consegue enviar um evento de teste
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0
 */

require('dotenv').config();
const axios = require('axios');
const config = require('./config/facebook-config');

class FacebookTokenTester {
    constructor() {
        this.pixelId = config.PIXEL_ID;
        this.accessToken = config.ACCESS_TOKEN;
        this.testEventCode = config.TEST_EVENT_CODE;
        
        console.log('🔧 Facebook Token Tester inicializado');
        console.log(`📱 Pixel ID: ${this.pixelId}`);
        console.log(`🔑 Access Token: ${this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'Não configurado'}`);
        console.log(`🧪 Test Event Code: ${this.testEventCode || 'Não configurado'}`);
    }
    
    /**
     * Teste 1: Verificar se as variáveis estão configuradas
     */
    testConfiguration() {
        console.log('\n🔍 === TESTE 1: CONFIGURAÇÃO ===');
        
        const issues = [];
        
        if (!this.pixelId) {
            issues.push('❌ FACEBOOK_PIXEL_ID não está configurado no .env');
        } else {
            console.log(`✅ FACEBOOK_PIXEL_ID: ${this.pixelId}`);
        }
        
        if (!this.accessToken) {
            issues.push('❌ FACEBOOK_ACCESS_TOKEN não está configurado no .env');
        } else {
            console.log(`✅ FACEBOOK_ACCESS_TOKEN: ${this.accessToken.substring(0, 20)}...`);
            
            // Verificar formato básico do token
            if (this.accessToken.length < 50) {
                issues.push('⚠️ FACEBOOK_ACCESS_TOKEN parece muito curto (pode estar incompleto)');
            }
            
            if (!this.accessToken.startsWith('EAA')) {
                issues.push('⚠️ FACEBOOK_ACCESS_TOKEN não tem o formato esperado (deveria começar com EAA)');
            }
        }
        
        if (this.testEventCode) {
            console.log(`✅ FACEBOOK_TEST_EVENT_CODE: ${this.testEventCode}`);
        } else {
            console.log('ℹ️ FACEBOOK_TEST_EVENT_CODE não configurado (opcional)');
        }
        
        if (issues.length > 0) {
            console.log('\n❌ Problemas encontrados na configuração:');
            issues.forEach(issue => console.log(issue));
            return false;
        }
        
        console.log('✅ Configuração básica OK');
        return true;
    }
    
    /**
     * Teste 2: Validar o token de acesso
     */
    async testTokenValidity() {
        console.log('\n🔍 === TESTE 2: VALIDAÇÃO DO TOKEN ===');
        
        if (!this.accessToken) {
            console.log('❌ Token não configurado, pulando teste');
            return false;
        }
        
        try {
            console.log('🔄 Verificando validade do token...');
            
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${this.accessToken}`,
                { timeout: 10000 }
            );
            
            if (response.status === 200 && response.data.id) {
                console.log(`✅ Token válido!`);
                console.log(`👤 User ID: ${response.data.id}`);
                console.log(`📝 Name: ${response.data.name || 'N/A'}`);
                return true;
            } else {
                console.log('❌ Resposta inesperada da API do Facebook');
                console.log('📄 Response:', response.data);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Erro ao validar token:');
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                console.log(`📊 Status: ${status}`);
                console.log(`📄 Error Data:`, errorData);
                
                switch (status) {
                    case 400:
                        console.log('💡 Solução: Token malformado. Verifique se copiou o token completo.');
                        break;
                    case 401:
                        console.log('💡 Solução: Token expirado ou inválido. Gere um novo token.');
                        break;
                    case 403:
                        console.log('💡 Solução: Token sem permissões. Use um System User Token.');
                        break;
                    case 190:
                        console.log('💡 Solução: Token OAuth inválido. Gere um novo token no Business Manager.');
                        break;
                }
            } else {
                console.log(`📄 Error:`, error.message);
                console.log('💡 Solução: Verifique sua conexão com a internet.');
            }
            
            return false;
        }
    }
    
    /**
     * Teste 3: Verificar acesso ao Pixel
     */
    async testPixelAccess() {
        console.log('\n🔍 === TESTE 3: ACESSO AO PIXEL ===');
        
        if (!this.accessToken || !this.pixelId) {
            console.log('❌ Token ou Pixel ID não configurado, pulando teste');
            return false;
        }
        
        try {
            console.log(`🔄 Verificando acesso ao Pixel ${this.pixelId}...`);
            
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${this.pixelId}?fields=id,name,creation_time&access_token=${this.accessToken}`,
                { timeout: 10000 }
            );
            
            if (response.status === 200 && response.data.id) {
                console.log(`✅ Acesso ao Pixel confirmado!`);
                console.log(`📱 Pixel ID: ${response.data.id}`);
                console.log(`📝 Name: ${response.data.name || 'N/A'}`);
                console.log(`📅 Created: ${response.data.creation_time || 'N/A'}`);
                return true;
            } else {
                console.log('❌ Resposta inesperada ao acessar Pixel');
                console.log('📄 Response:', response.data);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Erro ao acessar Pixel:');
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                console.log(`📊 Status: ${status}`);
                console.log(`📄 Error Data:`, errorData);
                
                switch (status) {
                    case 400:
                        console.log('💡 Solução: Pixel ID inválido. Verifique o FACEBOOK_PIXEL_ID no .env');
                        break;
                    case 403:
                        console.log('💡 Solução: Token sem acesso ao Pixel. Vincule o token ao Pixel no Business Manager.');
                        break;
                    case 404:
                        console.log('💡 Solução: Pixel não encontrado. Verifique se o Pixel ID está correto.');
                        break;
                }
            } else {
                console.log(`📄 Error:`, error.message);
            }
            
            return false;
        }
    }
    
    /**
     * Teste 4: Enviar evento de teste
     */
    async testEventSending() {
        console.log('\n🔍 === TESTE 4: ENVIO DE EVENTO DE TESTE ===');
        
        if (!this.accessToken || !this.pixelId) {
            console.log('❌ Token ou Pixel ID não configurado, pulando teste');
            return false;
        }
        
        try {
            console.log('🔄 Enviando evento de teste...');
            
            const testEvent = {
                event_name: 'PageView',
                event_time: Math.floor(Date.now() / 1000),
                event_id: `test_${Date.now()}`,
                action_source: 'website', // PageView deve usar 'website', não 'server'
                user_data: {
                    em: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514', // hash de test@example.com
                    client_ip_address: '127.0.0.1',
                    client_user_agent: 'FunilSpy-Test-Agent/1.0'
                },
                custom_data: {
                    currency: 'BRL',
                    value: 0
                }
            };
            
            const payload = {
                data: [testEvent]
            };
            
            // Adicionar test_event_code se configurado
            if (this.testEventCode) {
                payload.test_event_code = this.testEventCode;
                console.log(`🧪 Usando Test Event Code: ${this.testEventCode}`);
            }
            
            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${this.pixelId}/events?access_token=${this.accessToken}`,
                payload,
                { 
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.status === 200 && response.data.events_received === 1) {
                console.log(`✅ Evento de teste enviado com sucesso!`);
                console.log(`📊 Events Received: ${response.data.events_received}`);
                console.log(`🔗 Facebook Trace ID: ${response.data.fbtrace_id}`);
                
                if (this.testEventCode) {
                    console.log('🧪 Evento enviado em modo de teste - verifique no Events Manager');
                } else {
                    console.log('⚠️ Evento enviado em modo PRODUÇÃO - aparecerá nas métricas reais');
                }
                
                return true;
            } else {
                console.log('❌ Evento não foi recebido corretamente');
                console.log('📄 Response:', response.data);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Erro ao enviar evento de teste:');
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                console.log(`📊 Status: ${status}`);
                console.log(`📄 Error Data:`, JSON.stringify(errorData, null, 2));
                
                if (errorData.error) {
                    console.log(`🔍 Error Code: ${errorData.error.code}`);
                    console.log(`📝 Error Message: ${errorData.error.message}`);
                    console.log(`🔗 FB Trace ID: ${errorData.error.fbtrace_id}`);
                }
            } else {
                console.log(`📄 Error:`, error.message);
            }
            
            return false;
        }
    }
    
    /**
     * Executar todos os testes
     */
    async runAllTests() {
        console.log('🚀 === DIAGNÓSTICO COMPLETO DO FACEBOOK TOKEN ===\n');
        
        const results = {
            configuration: false,
            tokenValidity: false,
            pixelAccess: false,
            eventSending: false
        };
        
        // Teste 1: Configuração
        results.configuration = this.testConfiguration();
        
        // Teste 2: Validação do token (só se configuração OK)
        if (results.configuration) {
            results.tokenValidity = await this.testTokenValidity();
        }
        
        // Teste 3: Acesso ao Pixel (só se token válido)
        if (results.tokenValidity) {
            results.pixelAccess = await this.testPixelAccess();
        }
        
        // Teste 4: Envio de evento (só se acesso ao Pixel OK)
        if (results.pixelAccess) {
            results.eventSending = await this.testEventSending();
        }
        
        // Resumo final
        console.log('\n📊 === RESUMO DOS TESTES ===');
        console.log(`1. Configuração: ${results.configuration ? '✅ OK' : '❌ FALHOU'}`);
        console.log(`2. Token Válido: ${results.tokenValidity ? '✅ OK' : '❌ FALHOU'}`);
        console.log(`3. Acesso ao Pixel: ${results.pixelAccess ? '✅ OK' : '❌ FALHOU'}`);
        console.log(`4. Envio de Evento: ${results.eventSending ? '✅ OK' : '❌ FALHOU'}`);
        
        const allPassed = Object.values(results).every(result => result === true);
        
        if (allPassed) {
            console.log('\n🎉 === TODOS OS TESTES PASSARAM ===');
            console.log('✅ Sua integração com o Facebook está funcionando corretamente!');
            console.log('🚀 Você pode usar o sistema normalmente.');
        } else {
            console.log('\n⚠️ === ALGUNS TESTES FALHARAM ===');
            console.log('📋 Siga as instruções acima para corrigir os problemas.');
            console.log('\n📖 Guia de correção:');
            console.log('1. Acesse https://business.facebook.com/');
            console.log('2. Vá em Configurações > Usuários > Usuários do Sistema');
            console.log('3. Crie ou edite um System User');
            console.log('4. Gere um token com permissões ads_management');
            console.log('5. Vincule o token ao seu Pixel no Business Manager');
            console.log('6. Atualize o FACEBOOK_ACCESS_TOKEN no arquivo .env');
        }
        
        return allPassed;
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new FacebookTokenTester();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Erro fatal durante os testes:', error);
            process.exit(1);
        });
}

module.exports = FacebookTokenTester;