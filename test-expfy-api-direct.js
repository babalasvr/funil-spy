const axios = require('axios');
require('dotenv').config({ path: './analytics/.env' });

// ExpfyPay Configuration
const EXPFY_CONFIG = {
    publicKey: process.env.EXPFY_PUBLIC_KEY,
    secretKey: process.env.EXPFY_SECRET_KEY,
    apiUrl: process.env.EXPFY_API_URL || 'https://pro.expfypay.com/api/v1'
};

console.log('🔧 Teste ExpfyPay API - Verificação Direta');
console.log('==================================================');
console.log('🔑 Public key:', EXPFY_CONFIG.publicKey ? '✅ Configurada' : '❌ Não encontrada');
console.log('🔐 Secret key:', EXPFY_CONFIG.secretKey ? '✅ Configurada' : '❌ Não encontrada');
console.log('🌐 API URL:', EXPFY_CONFIG.apiUrl);
console.log('');

async function testExpfyAPI() {
    const transactionId = '62bc2d54e0d0979eb61a1a5460c6d57b';
    
    try {
        console.log('🔍 Testando busca da transação:', transactionId);
        
        const response = await axios.get(
            `${EXPFY_CONFIG.apiUrl}/payments/${transactionId}`,
            {
                headers: {
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Resposta da API:', response.data);
        console.log('📊 Status:', response.status);
        
    } catch (error) {
        console.log('❌ Erro na API:');
        console.log('   Status:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
        console.log('   Dados:', error.response?.data || 'N/A');
        
        if (error.response?.status === 404) {
            console.log('');
            console.log('💡 Transação não encontrada - possíveis causas:');
            console.log('   1. Transação expirou ou foi cancelada');
            console.log('   2. ID da transação incorreto');
            console.log('   3. Transação de ambiente diferente (sandbox vs produção)');
            console.log('   4. Credenciais incorretas');
        }
    }
}

// Teste adicional: listar transações recentes
async function testListPayments() {
    try {
        console.log('');
        console.log('📋 Testando listagem de transações recentes...');
        
        const response = await axios.get(
            `${EXPFY_CONFIG.apiUrl}/payments`,
            {
                headers: {
                    'X-Public-Key': EXPFY_CONFIG.publicKey,
                    'X-Secret-Key': EXPFY_CONFIG.secretKey
                },
                params: {
                    limit: 5
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Transações encontradas:', response.data?.data?.length || 0);
        if (response.data?.data?.length > 0) {
            console.log('📊 Últimas transações:');
            response.data.data.forEach((payment, index) => {
                console.log(`   ${index + 1}. ID: ${payment.id} | Status: ${payment.status} | Valor: ${payment.amount}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Erro ao listar transações:');
        console.log('   Status:', error.response?.status || 'N/A');
        console.log('   Mensagem:', error.message);
    }
}

async function runTests() {
    if (!EXPFY_CONFIG.publicKey || !EXPFY_CONFIG.secretKey) {
        console.log('❌ Credenciais não configuradas!');
        console.log('💡 Verifique o arquivo .env na pasta analytics/');
        return;
    }
    
    await testExpfyAPI();
    await testListPayments();
}

runTests().catch(console.error);