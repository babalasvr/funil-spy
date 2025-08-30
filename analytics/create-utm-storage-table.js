/**
 * Script para criar tabela de armazenamento de UTMs por sessão/transaction_id
 * Permite que o webhook de pagamento recupere dados UTM para envio ao Facebook
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🗄️ Criando tabela de armazenamento UTM...');

const dbPath = path.join(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Criar tabela utm_sessions para armazenar dados UTM por sessão
    db.run(`CREATE TABLE IF NOT EXISTS utm_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        transaction_id TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        utm_id TEXT,
        fbclid TEXT,
        gclid TEXT,
        msclkid TEXT,
        referrer TEXT,
        landing_page TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        customer_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela utm_sessions:', err);
        } else {
            console.log('✅ Tabela utm_sessions criada com sucesso!');
        }
    });
    
    // Criar índices para melhor performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_utm_sessions_session_id ON utm_sessions(session_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_utm_sessions_transaction_id ON utm_sessions(transaction_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_utm_sessions_created_at ON utm_sessions(created_at)`);
    
    console.log('📊 Índices criados para otimização de consultas.');
});

db.close((err) => {
    if (err) {
        console.error('❌ Erro ao fechar banco:', err);
    } else {
        console.log('✅ Script executado com sucesso!');
        console.log('\n📋 Próximos passos:');
        console.log('1. Executar este script na VPS');
        console.log('2. Implementar captura de UTM nas páginas de checkout');
        console.log('3. Integrar envio automático para Facebook no webhook');
    }
});