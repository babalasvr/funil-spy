/**
 * Teste de Tracking da Página de Checkout
 * Simula o comportamento real de um usuário acessando a página de checkout
 * e verifica se todos os eventos são disparados corretamente
 */

const axios = require('axios');
const UTMifyFacebookBridge = require('./services/utmify-facebook-bridge');

// Configuração do teste
const TEST_CONFIG = {
    checkoutUrl: 'https://descubra-zap.top/checkout/',
    serverUrl: 'http://localhost:3001', // URL do servidor local
    testDuration: 30000, // 30 segundos
    eventInterval: 5000 // 5 segundos entre eventos
};

async function simulateCheckoutPageAccess() {
    console.log('🌐 Simulando acesso real à página de checkout\n');
    
    try {
        const bridge = new UTMifyFacebookBridge();
        const sessionId = 'real_test_' + Date.now();
        
        console.log('📱 Simulando jornada do usuário:');
        console.log('1. Usuário clica no anúncio do Facebook');
        console.log('2. Usuário navega pelo funil');
        console.log('3. Usuário acessa a página de checkout');
        console.log('4. Evento InitiateCheckout é disparado');
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Simular dados realistas de UTM do Facebook
        const utmParams = {
            utm_source: 'facebook',
            utm_medium: 'paid-social',
            utm_campaign: 'descubra_zap_lancamento_2024',
            utm_content: 'video_vsl_30s',
            utm_term: 'descobrir_whatsapp',
            fbclid: 'IwAR2xYz9' + Math.random().toString(36).substr(2, 20),
            utm_id: 'fb_campaign_' + Date.now()
        };
        
        // 1. Simular landing page (página inicial)
        console.log('1️⃣ Usuário acessa landing page...');
        await bridge.processPageView(sessionId, {
            url: 'https://descubra-zap.top/',
            title: 'Descubra ZAP - Descubra Quem Te Bloqueou',
            referrer: 'https://www.facebook.com/'
        }, utmParams);
        
        await sleep(2000);
        
        // 2. Simular página de número
        console.log('2️⃣ Usuário insere número de telefone...');
        await bridge.processPageView(sessionId, {
            url: 'https://descubra-zap.top/numero',
            title: 'Digite seu Número - Descubra ZAP',
            referrer: 'https://descubra-zap.top/'
        });
        
        await sleep(3000);
        
        // 3. Simular página de carregamento
        console.log('3️⃣ Usuário aguarda análise...');
        await bridge.processPageView(sessionId, {
            url: 'https://descubra-zap.top/carregando',
            title: 'Analisando... - Descubra ZAP',
            referrer: 'https://descubra-zap.top/numero'
        });
        
        await sleep(5000);
        
        // 4. Simular página de relatório
        console.log('4️⃣ Usuário visualiza relatório...');
        await bridge.processPageView(sessionId, {
            url: 'https://descubra-zap.top/relatorio',
            title: 'Seu Relatório - Descubra ZAP',
            referrer: 'https://descubra-zap.top/carregando'
        });
        
        // Simular lead capture
        await bridge.processLead(sessionId, {
            email: 'usuario.teste@email.com',
            phone: '+5511987654321',
            name: 'Usuário Teste'
        });
        
        await sleep(10000); // Usuário lê o relatório
        
        // 5. MOMENTO CRÍTICO: Usuário acessa checkout
        console.log('\n🎯 MOMENTO CRÍTICO: Usuário acessa CHECKOUT!');
        console.log('URL:', TEST_CONFIG.checkoutUrl);
        
        const checkoutPageData = {
            url: TEST_CONFIG.checkoutUrl,
            title: 'Checkout - Descubra ZAP Premium',
            referrer: 'https://descubra-zap.top/relatorio'
        };
        
        // PageView do checkout
        const checkoutPageView = await bridge.processPageView(sessionId, checkoutPageData);
        console.log('✅ PageView do checkout processado');
        
        // INITIATE CHECKOUT - O evento principal que estamos testando
        console.log('\n🛒 DISPARANDO INITIATE CHECKOUT...');
        
        const checkoutData = {
            productId: 'descubra-zap-premium',
            productName: 'Descubra ZAP Premium - Acesso Completo',
            price: '197.00',
            category: 'digital-service',
            currency: 'BRL'
        };
        
        const initiateCheckoutResult = await bridge.processCheckoutStart(
            sessionId, 
            checkoutData, 
            checkoutPageData
        );
        
        console.log('\n📊 RESULTADO INITIATE CHECKOUT:');
        console.log('- Status:', initiateCheckoutResult.success ? '✅ SUCESSO' : '❌ FALHA');
        console.log('- Session ID:', initiateCheckoutResult.sessionId);
        console.log('- Produto:', initiateCheckoutResult.productData?.name);
        console.log('- Valor:', `R$ ${initiateCheckoutResult.productData?.price}`);
        console.log('- UTM Source:', initiateCheckoutResult.utmData?.utm_source);
        console.log('- UTM Campaign:', initiateCheckoutResult.utmData?.utm_campaign);
        console.log('- FBCLID:', initiateCheckoutResult.utmData?.fbclid);
        
        if (initiateCheckoutResult.facebook) {
            console.log('\n🎯 FACEBOOK INTEGRATION:');
            console.log('- Event ID:', initiateCheckoutResult.facebook.eventId);
            console.log('- Pixel Success:', initiateCheckoutResult.facebook.pixel?.success ? '✅' : '❌');
            console.log('- CAPI Success:', initiateCheckoutResult.facebook.conversionsAPI?.success ? '✅' : '❌');
            
            if (initiateCheckoutResult.facebook.conversionsAPI?.response) {
                console.log('- Events Received:', initiateCheckoutResult.facebook.conversionsAPI.response.events_received);
                console.log('- FB Trace ID:', initiateCheckoutResult.facebook.conversionsAPI.response.fbtrace_id);
            }
            
            if (initiateCheckoutResult.facebook.error) {
                console.log('- Erro:', initiateCheckoutResult.facebook.error);
            }
        }
        
        // 6. Simular interação com formulário (opcional)
        console.log('\n6️⃣ Usuário interage com formulário de checkout...');
        
        // Simular preenchimento de campos
        await sleep(5000);
        
        // 7. Relatório final da sessão
        console.log('\n📋 RELATÓRIO FINAL DA SESSÃO:');
        const sessionReport = bridge.getSessionReport(sessionId);
        console.log(JSON.stringify(sessionReport, null, 2));
        
        return {
            success: true,
            sessionId: sessionId,
            initiateCheckoutResult: initiateCheckoutResult,
            sessionReport: sessionReport
        };
        
    } catch (error) {
        console.error('❌ Erro na simulação:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Função para testar via API HTTP (se o servidor estiver rodando)
async function testCheckoutViaHTTP() {
    console.log('🌐 Testando InitiateCheckout via HTTP API\n');
    
    try {
        // Testar se o servidor está rodando
        const healthCheck = await axios.get(`${TEST_CONFIG.serverUrl}/health`)
            .catch(() => null);
        
        if (!healthCheck) {
            console.log('⚠️ Servidor não está rodando em', TEST_CONFIG.serverUrl);
            console.log('Execute: cd analytics && node server.js');
            return { success: false, error: 'Servidor não disponível' };
        }
        
        console.log('✅ Servidor está rodando');
        
        // Simular requisição de InitiateCheckout
        const checkoutPayload = {
            sessionId: 'http_test_' + Date.now(),
            eventName: 'InitiateCheckout',
            pageUrl: TEST_CONFIG.checkoutUrl,
            pageTitle: 'Checkout - Descubra ZAP Premium',
            utmData: {
                utm_source: 'facebook',
                utm_medium: 'paid-social',
                utm_campaign: 'http_test_campaign',
                utm_content: 'test_content',
                fbclid: 'IwAR_http_test_' + Date.now()
            },
            customerData: {
                email: 'http.test@email.com',
                phone: '+5511999888777',
                firstName: 'HTTP',
                lastName: 'Test'
            },
            productData: {
                id: 'descubra-zap-premium',
                name: 'Descubra ZAP Premium',
                price: 197.00,
                category: 'digital'
            },
            value: 197.00,
            timestamp: Date.now()
        };
        
        console.log('📤 Enviando requisição InitiateCheckout...');
        
        const response = await axios.post(
            `${TEST_CONFIG.serverUrl}/api/track-event`,
            checkoutPayload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Resposta recebida:');
        console.log('- Status:', response.status);
        console.log('- Data:', JSON.stringify(response.data, null, 2));
        
        return {
            success: true,
            response: response.data
        };
        
    } catch (error) {
        console.error('❌ Erro no teste HTTP:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Função para monitorar eventos em tempo real
async function monitorCheckoutEvents() {
    console.log('👁️ Monitorando eventos de checkout em tempo real...');
    console.log('Pressione Ctrl+C para parar\n');
    
    let eventCount = 0;
    
    const monitor = setInterval(async () => {
        eventCount++;
        console.log(`[${new Date().toLocaleTimeString()}] Verificação #${eventCount}`);
        
        // Aqui você pode implementar lógica para verificar logs
        // ou status de eventos em tempo real
        
    }, TEST_CONFIG.eventInterval);
    
    // Parar após duração do teste
    setTimeout(() => {
        clearInterval(monitor);
        console.log('\n⏹️ Monitoramento finalizado');
    }, TEST_CONFIG.testDuration);
}

// Função utilitária para sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal de teste
async function runAllTests() {
    console.log('🚀 Iniciando testes completos de InitiateCheckout\n');
    
    const results = {
        simulation: null,
        http: null
    };
    
    // 1. Teste de simulação
    console.log('='.repeat(60));
    console.log('1️⃣ TESTE DE SIMULAÇÃO');
    console.log('='.repeat(60));
    results.simulation = await simulateCheckoutPageAccess();
    
    await sleep(2000);
    
    // 2. Teste HTTP
    console.log('\n' + '='.repeat(60));
    console.log('2️⃣ TESTE HTTP API');
    console.log('='.repeat(60));
    results.http = await testCheckoutViaHTTP();
    
    // 3. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    console.log('- Simulação:', results.simulation?.success ? '✅ PASSOU' : '❌ FALHOU');
    console.log('- HTTP API:', results.http?.success ? '✅ PASSOU' : '❌ FALHOU');
    
    if (results.simulation?.success && results.http?.success) {
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('\n📋 Próximos passos:');
        console.log('1. Acesse o Facebook Events Manager');
        console.log('2. Vá para Test Events do seu Pixel');
        console.log('3. Verifique se os eventos InitiateCheckout aparecem');
        console.log('4. Teste em produção acessando:', TEST_CONFIG.checkoutUrl);
    } else {
        console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
    }
    
    return results;
}

// Executar se chamado diretamente
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--monitor')) {
        monitorCheckoutEvents();
    } else if (args.includes('--http')) {
        testCheckoutViaHTTP().then(result => {
            process.exit(result.success ? 0 : 1);
        });
    } else if (args.includes('--simulate')) {
        simulateCheckoutPageAccess().then(result => {
            process.exit(result.success ? 0 : 1);
        });
    } else {
        runAllTests().then(results => {
            const allPassed = results.simulation?.success && results.http?.success;
            process.exit(allPassed ? 0 : 1);
        });
    }
}

module.exports = {
    simulateCheckoutPageAccess,
    testCheckoutViaHTTP,
    monitorCheckoutEvents,
    runAllTests
};