const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados (mesmo que o servidor usa)
const dbPath = './analytics.db';

console.log('🔧 Verificando e corrigindo schema do banco de dados...');
console.log('📁 Caminho do banco:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco SQLite');
});

// Verificar se a coluna timestamp existe na tabela conversions
db.all("PRAGMA table_info(conversions)", (err, columns) => {
  if (err) {
    console.error('❌ Erro ao verificar estrutura da tabela:', err.message);
    db.close();
    process.exit(1);
  }

  console.log('📋 Estrutura atual da tabela conversions:');
  columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });

  const hasTimestamp = columns.some(col => col.name === 'timestamp');
  
  if (hasTimestamp) {
    console.log('✅ Coluna timestamp já existe!');
    console.log('🎯 Schema do banco está correto!');
    db.close();
    return;
  }

  console.log('⚠️  Coluna timestamp não encontrada. Adicionando...');
  
  // Adicionar a coluna timestamp
  db.run("ALTER TABLE conversions ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
    if (err) {
      console.error('❌ Erro ao adicionar coluna timestamp:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('✅ Coluna timestamp adicionada com sucesso!');
    
    // Verificar novamente para confirmar
    db.all("PRAGMA table_info(conversions)", (err, newColumns) => {
      if (err) {
        console.error('❌ Erro ao verificar estrutura atualizada:', err.message);
      } else {
        console.log('\n📋 Estrutura atualizada da tabela conversions:');
        newColumns.forEach(col => {
          console.log(`  - ${col.name}: ${col.type}`);
        });
        console.log('\n🎉 Schema do banco corrigido com sucesso!');
      }
      db.close();
    });
  });
});