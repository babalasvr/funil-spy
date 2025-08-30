const axios = require('axios');
require('dotenv').config({ path: '/var/www/funil-spy/analytics/.env' });

// ExpfyPay Configuration
const EXPFY_CONFIG = {
    publicKey: process.env.EXPFY_PUBLIC_KEY,
    secretKey: process.env.EXPFY_SECRET_KEY,
    apiUrl: process.env.EXPFY_API_URL || 'https://pro.expfypay.com/api/v1'
};

console.log('🔧 Diagnóstico ExpfyPay API - VPS');
console.log('==================================================');
console.log('📁 Diretório atual:', process.cwd());
console.log('🔑 Public key:', EXPFY_CONFIG.publicKey ? `✅ ${EXPFY_CONFIG.publicKey.substring(0, 10)}...` : '❌ Não encontrada');
console.log('🔐 Secret key:', EXPFY_CONFIG.secretKey ? `✅ ${EXPFY_CONFIG.secretKey.substring(0, 10)}...` : '❌ Não encontrada');
console.log('🌐 API URL:', EXPFY_CONFIG.apiUrl);
console.log('');

async function testSpecificTransaction() {
    const transactionId = '62bc2d54e0d0979eb61a1a5460c6d57b';
    
    try {
        console.log('🔍 Testando transação específica:', transactionId);
        
        const response = await axios.get(
            `${EXPFY_CONFIG.apiUrl}/payments/${transactionId}`,
            {
                headers: {
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );
        
        console.log('✅ Transação encontrada!');
        console.log('📊 Status:', response.data.status || 'N/A');
        console.log('💰 Valor:', response.data.amount || 'N/A');
        console.log('📅 Criada em:', response.data.created_at || 'N/A');
        console.log('🔄 Dados completos:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Erro ao buscar transação:');
        console.log('   Status HTTP:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
        
        if (error.response?.data) {
            console.log('   Resposta da API:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.status === 404) {
            console.log('');
            console.log('💡 Transação não encontrada - possíveis causas:');
            console.log('   1. Transação expirou (PIX expira em 30 minutos)');
            console.log('   2. Transação foi cancelada');
            console.log('   3. ID incorreto ou de ambiente diferente');
            console.log('   4. Credenciais de ambiente diferente (sandbox vs produção)');
        }
        
        if (error.response?.status === 401) {
            console.log('');
            console.log('🔐 Erro de autenticação - verifique as credenciais!');
        }
    }
}

async function testAPIConnection() {
    try {
        console.log('🌐 Testando conectividade com a API...');
        
        // Teste básico de conectividade
        const response = await axios.get(
            `${EXPFY_CONFIG.apiUrl}/payments`,
            {
                headers: {
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey,
                    'Content-Type': 'application/json'
                },
                params: {
                    limit: 3
                },
                timeout: 15000
            }
        );
        
        console.log('✅ API conectada com sucesso!');
        console.log('📊 Total de transações encontradas:', response.data?.data?.length || 0);
        
        if (response.data?.data?.length > 0) {
            console.log('📋 Últimas transações:');
            response.data.data.forEach((payment, index) => {
                console.log(`   ${index + 1}. ID: ${payment.id}`);
                console.log(`      Status: ${payment.status}`);
                console.log(`      Valor: R$ ${payment.amount}`);
                console.log(`      Criada: ${payment.created_at}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.log('❌ Erro na conectividade:');
        console.log('   Status:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
        
        if (error.response?.data) {
            console.log('   Detalhes:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function checkEnvironmentVariables() {
    console.log('🔍 Verificando variáveis de ambiente...');
    
    const envVars = [
        'EXPFY_PUBLIC_KEY',
        'EXPFY_SECRET_KEY', 
        'EXPFY_API_URL'
    ];
    
    envVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
        } else {
            console.log(`❌ ${varName}: Não definida`);
        }
    });
    
    console.log('');
}

async function runDiagnostic() {
    if (!EXPFY_CONFIG.publicKey || !EXPFY_CONFIG.secretKey) {
        console.log('❌ ERRO: Credenciais ExpfyPay não configuradas!');
        console.log('💡 Verifique o arquivo /var/www/funil-spy/analytics/.env');
        console.log('💡 Variáveis necessárias:');
        console.log('   - EXPFY_PUBLIC_KEY=sua_chave_publica');
        console.log('   - EXPFY_SECRET_KEY=sua_chave_secreta');
        console.log('   - EXPFY_API_URL=https://pro.expfypay.com/api/v1');
        return;
    }
    
    await checkEnvironmentVariables();
    await testAPIConnection();
    await testSpecificTransaction();
    
    console.log('');
    console.log('🏁 Diagnóstico concluído!');
    console.log('💡 Se a transação não foi encontrada, ela pode ter expirado.');
    console.log('💡 PIX tem validade de 30 minutos após a criação.');
}

runDiagnostic().catch(error => {
    console.error('💥 Erro fatal no diagnóstico:', error.message);
    process.exit(1);
});