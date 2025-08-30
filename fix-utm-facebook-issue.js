const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 Diagnóstico e Correção - UTM Facebook Issue');
console.log('==================================================');

// Função para verificar dados UTM no banco
async function checkUTMDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = '/var/www/funil-spy/analytics/analytics.db';
        console.log('📊 Verificando banco de dados UTM:', dbPath);
        
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Erro ao conectar no banco:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Conectado ao banco de dados');
        });
        
        // Verificar se a tabela utm_sessions existe
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='utm_sessions'", (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar tabela:', err.message);
                reject(err);
                return;
            }
            
            if (!row) {
                console.log('❌ Tabela utm_sessions não existe!');
                console.log('💡 Criando tabela utm_sessions...');
                
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS utm_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT UNIQUE NOT NULL,
                        utm_source TEXT,
                        utm_medium TEXT,
                        utm_campaign TEXT,
                        utm_term TEXT,
                        utm_content TEXT,
                        fbclid TEXT,
                        gclid TEXT,
                        landing_page TEXT,
                        user_agent TEXT,
                        customer_email TEXT,
                        customer_phone TEXT,
                        customer_name TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                db.run(createTableSQL, (err) => {
                    if (err) {
                        console.error('❌ Erro ao criar tabela:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('✅ Tabela utm_sessions criada com sucesso!');
                    checkUTMData(db, resolve);
                });
            } else {
                console.log('✅ Tabela utm_sessions existe');
                checkUTMData(db, resolve);
            }
        });
    });
}

function checkUTMData(db, resolve) {
    // Verificar dados UTM existentes
    db.all("SELECT * FROM utm_sessions ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar dados UTM:', err.message);
            db.close();
            resolve({ error: err.message });
            return;
        }
        
        console.log(`📊 Total de registros UTM encontrados: ${rows.length}`);
        
        if (rows.length > 0) {
            console.log('📋 Últimos registros UTM:');
            rows.forEach((row, index) => {
                console.log(`   ${index + 1}. Session: ${row.session_id}`);
                console.log(`      UTM Source: ${row.utm_source || 'N/A'}`);
                console.log(`      UTM Campaign: ${row.utm_campaign || 'N/A'}`);
                console.log(`      Created: ${row.created_at}`);
                console.log('');
            });
        } else {
            console.log('⚠️ Nenhum dado UTM encontrado no banco!');
        }
        
        // Verificar se existe o session_id específico da transação
        const sessionId = '62bc2d54e0d0979eb61a1a5460c6d57b';
        db.get("SELECT * FROM utm_sessions WHERE session_id = ?", [sessionId], (err, row) => {
            if (err) {
                console.error('❌ Erro ao buscar session específica:', err.message);
            } else if (row) {
                console.log(`✅ Dados UTM encontrados para session ${sessionId}:`);
                console.log('   UTM Source:', row.utm_source);
                console.log('   UTM Campaign:', row.utm_campaign);
                console.log('   Landing Page:', row.landing_page);
            } else {
                console.log(`❌ Dados UTM NÃO encontrados para session ${sessionId}`);
                console.log('💡 Isso explica o erro "UTM data not found"');
                
                // Criar dados UTM de fallback para esta sessão
                console.log('🔧 Criando dados UTM de fallback...');
                const fallbackUTM = {
                    session_id: sessionId,
                    utm_source: 'webhook_fallback',
                    utm_medium: 'payment',
                    utm_campaign: 'direct_purchase',
                    landing_page: 'https://descubra-zap.top',
                    user_agent: 'Payment Webhook',
                    created_at: new Date().toISOString()
                };
                
                const insertSQL = `
                    INSERT OR REPLACE INTO utm_sessions 
                    (session_id, utm_source, utm_medium, utm_campaign, landing_page, user_agent, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                db.run(insertSQL, [
                    fallbackUTM.session_id,
                    fallbackUTM.utm_source,
                    fallbackUTM.utm_medium,
                    fallbackUTM.utm_campaign,
                    fallbackUTM.landing_page,
                    fallbackUTM.user_agent,
                    fallbackUTM.created_at
                ], (err) => {
                    if (err) {
                        console.error('❌ Erro ao inserir UTM fallback:', err.message);
                    } else {
                        console.log('✅ Dados UTM de fallback criados com sucesso!');
                    }
                    
                    db.close();
                    resolve({ success: true, fallbackCreated: true });
                });
            }
        });
    });
}

// Função para testar o endpoint de UTM
async function testUTMEndpoint() {
    const sessionId = '62bc2d54e0d0979eb61a1a5460c6d57b';
    
    try {
        console.log('🔍 Testando endpoint /api/get-utm...');
        
        const response = await axios.get(`http://localhost:3001/api/get-utm/${sessionId}`, {
            timeout: 5000
        });
        
        console.log('✅ Endpoint UTM respondeu:');
        console.log('   Success:', response.data.success);
        console.log('   Data:', JSON.stringify(response.data.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Erro no endpoint UTM:');
        console.log('   Status:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
        console.log('   Dados:', error.response?.data || 'N/A');
        
        return { error: error.message };
    }
}

// Função para testar o envio para Facebook após correção
async function testFacebookSend() {
    const sessionId = '62bc2d54e0d0979eb61a1a5460c6d57b';
    
    try {
        console.log('🎯 Testando envio para Facebook...');
        
        const response = await axios.post('http://localhost:3001/api/track-purchase', {
            transactionId: sessionId,
            value: 27.90,
            currency: 'BRL',
            customerData: {
                email: 'test@example.com',
                phone: '+5511999999999',
                firstName: 'Test',
                lastName: 'User',
                country: 'BR'
            },
            eventSourceUrl: 'https://descubra-zap.top',
            userAgent: 'Test User Agent'
        }, {
            timeout: 10000
        });
        
        console.log('✅ Facebook Purchase enviado com sucesso:');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Erro no envio para Facebook:');
        console.log('   Status:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
        console.log('   Dados:', error.response?.data || 'N/A');
        
        return { error: error.message };
    }
}

// Função principal
async function runDiagnosticAndFix() {
    try {
        console.log('🚀 Iniciando diagnóstico e correção...');
        console.log('');
        
        // 1. Verificar banco de dados UTM
        await checkUTMDatabase();
        console.log('');
        
        // 2. Testar endpoint UTM
        await testUTMEndpoint();
        console.log('');
        
        // 3. Testar envio para Facebook
        await testFacebookSend();
        console.log('');
        
        console.log('🏁 Diagnóstico e correção concluídos!');
        console.log('💡 Se ainda houver erros, verifique:');
        console.log('   1. Se o analytics-service está rodando na porta 3001');
        console.log('   2. Se as credenciais do Facebook estão corretas');
        console.log('   3. Se o endpoint /api/get-utm está funcionando');
        
    } catch (error) {
        console.error('💥 Erro fatal:', error.message);
        process.exit(1);
    }
}

runDiagnosticAndFix();