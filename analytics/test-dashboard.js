/**
 * Teste rápido para validar o dashboard de leads
 * Execute com: node test-dashboard.js
 */

const http = require('http');

// Função para fazer requisições HTTP
function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: res.statusCode === 200 ? JSON.parse(body) : body
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Teste das APIs do dashboard
async function testDashboard() {
    console.log('🧪 Testando Dashboard de Leads...\n');

    const baseUrl = 'localhost';
    const port = 3001;

    // 1. Testar endpoint de stats
    console.log('📊 Testando endpoint /api/stats...');
    try {
        const statsResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/api/stats?period=7d',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (statsResponse.statusCode === 200) {
            console.log('✅ Stats endpoint funcionando');
            console.log('📈 Dados:', JSON.stringify(statsResponse.data, null, 2));
        } else {
            console.log('❌ Stats endpoint falhou:', statsResponse.statusCode);
        }
    } catch (error) {
        console.log('❌ Erro ao testar stats:', error.message);
    }

    console.log('\n');

    // 2. Testar endpoint de leads
    console.log('👥 Testando endpoint /api/leads...');
    try {
        const leadsResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/api/leads?period=7d',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (leadsResponse.statusCode === 200) {
            console.log('✅ Leads endpoint funcionando');
            console.log(`📋 ${leadsResponse.data.length} leads encontrados`);
            
            if (leadsResponse.data.length > 0) {
                console.log('👤 Exemplo de lead:', JSON.stringify(leadsResponse.data[0], null, 2));
            }
        } else {
            console.log('❌ Leads endpoint falhou:', leadsResponse.statusCode);
        }
    } catch (error) {
        console.log('❌ Erro ao testar leads:', error.message);
    }

    console.log('\n');

    // 3. Testar tracking aprimorado
    console.log('📡 Testando endpoint /api/track-enhanced...');
    try {
        const trackingData = {
            sessionId: 'test_session_' + Date.now(),
            eventName: 'test_event',
            pageUrl: 'http://localhost:3001/test',
            pageTitle: 'Teste Dashboard',
            userAgent: 'Node.js Test Agent',
            screenWidth: 1920,
            screenHeight: 1080,
            properties: {
                test: true,
                timestamp: new Date().toISOString()
            },
            localStorageData: {
                alvoMonitoramento: 'parceiro',
                numeroClonado: '(11) 99999-9999',
                funil_user_email: 'teste@dashboard.com'
            }
        };

        const trackResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/api/track-enhanced',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, trackingData);

        if (trackResponse.statusCode === 200) {
            console.log('✅ Enhanced tracking funcionando');
            console.log('📤 Evento registrado:', trackResponse.data);
        } else {
            console.log('❌ Enhanced tracking falhou:', trackResponse.statusCode);
        }
    } catch (error) {
        console.log('❌ Erro ao testar tracking:', error.message);
    }

    console.log('\n');

    // 4. Testar acesso ao dashboard HTML
    console.log('🌐 Testando acesso ao dashboard HTML...');
    try {
        const htmlResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/admin-dashboard.html',
            method: 'GET'
        });

        if (htmlResponse.statusCode === 200) {
            console.log('✅ Dashboard HTML acessível');
            console.log('📄 Tamanho da página:', htmlResponse.data.length, 'caracteres');
        } else {
            console.log('❌ Dashboard HTML não acessível:', htmlResponse.statusCode);
        }
    } catch (error) {
        console.log('❌ Erro ao acessar dashboard HTML:', error.message);
    }

    console.log('\n🏁 Teste concluído!');
    console.log('\n📋 Para acessar o dashboard:');
    console.log(`   👉 http://${baseUrl}:${port}/admin-dashboard.html`);
    console.log('\n💡 Certifique-se de que o serviço analytics está rodando:');
    console.log('   👉 pm2 status');
    console.log('   👉 npm start (na pasta analytics)');
}

// Executar testes
testDashboard().catch(console.error);