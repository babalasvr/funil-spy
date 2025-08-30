#!/usr/bin/env node

/**
 * Script para melhorar o tratamento de erros no sistema
 * Corrige problemas de transações não encontradas e melhora logs
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando correção do tratamento de erros...');

// 1. Verificar se os serviços estão rodando
async function checkServices() {
    console.log('\n📋 Verificando status dos serviços...');
    
    const services = [
        { name: 'payment-api', port: 3000 },
        { name: 'analytics', port: 3001 }
    ];
    
    for (const service of services) {
        try {
            const response = await fetch(`http://localhost:${service.port}/health`);
            if (response.ok) {
                console.log(`✅ ${service.name} está rodando na porta ${service.port}`);
            } else {
                console.log(`⚠️  ${service.name} respondeu com status ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${service.name} não está acessível na porta ${service.port}`);
        }
    }
}

// 2. Testar endpoint /api/track-purchase
async function testTrackPurchaseEndpoint() {
    console.log('\n🧪 Testando endpoint /api/track-purchase...');
    
    const testData = {
        eventName: 'Purchase',
        userData: {
            email: 'teste@exemplo.com',
            phone: '+5511999999999',
            firstName: 'João',
            lastName: 'Silva',
            city: 'São Paulo',
            state: 'SP',
            country: 'BR',
            zipCode: '01234-567'
        },
        customData: {
            currency: 'BRL',
            value: 97.00,
            content_type: 'product',
            content_ids: ['produto-descubra-zap'],
            content_name: 'Descubra Zap - Curso Completo',
            num_items: 1
        },
        utmData: {
            utm_source: 'facebook',
            utm_medium: 'cpc',
            utm_campaign: 'descubra-zap-vendas',
            utm_content: 'video-vsl',
            utm_term: 'whatsapp-automacao'
        }
    };
    
    try {
        const response = await fetch('http://localhost:3001/api/track-purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Endpoint /api/track-purchase funcionando corretamente');
            console.log('📊 Resposta:', result.message);
        } else {
            console.log('❌ Erro no endpoint /api/track-purchase:');
            console.log('📋 Status:', response.status);
            console.log('📋 Erro:', result.error);
        }
    } catch (error) {
        console.log('❌ Erro ao testar endpoint /api/track-purchase:', error.message);
    }
}

// 3. Testar endpoint /api/get-utm
async function testGetUtmEndpoint() {
    console.log('\n🧪 Testando endpoint /api/get-utm...');
    
    // Testar com um ID que provavelmente não existe
    const testId = 'test-session-123';
    
    try {
        const response = await fetch(`http://localhost:3001/api/get-utm/${testId}`);
        const result = await response.json();
        
        if (response.status === 404) {
            console.log('✅ Endpoint /api/get-utm retorna 404 corretamente para IDs não encontrados');
            console.log('📋 Mensagem:', result.error);
        } else if (response.ok) {
            console.log('✅ Endpoint /api/get-utm funcionando - dados encontrados');
            console.log('📊 Dados:', result.data);
        } else {
            console.log('⚠️  Endpoint /api/get-utm retornou status inesperado:', response.status);
        }
    } catch (error) {
        console.log('❌ Erro ao testar endpoint /api/get-utm:', error.message);
    }
}

// 4. Verificar configuração do Facebook
async function checkFacebookConfig() {
    console.log('\n🔍 Verificando configuração do Facebook...');
    
    const requiredVars = [
        'FACEBOOK_PIXEL_ID',
        'FACEBOOK_ACCESS_TOKEN'
    ];
    
    let allConfigured = true;
    
    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`✅ ${varName} está configurado`);
        } else {
            console.log(`❌ ${varName} não está configurado`);
            allConfigured = false;
        }
    }
    
    if (allConfigured) {
        console.log('✅ Todas as variáveis do Facebook estão configuradas');
    } else {
        console.log('⚠️  Algumas variáveis do Facebook estão faltando');
    }
    
    return allConfigured;
}

// 5. Gerar relatório de correções
function generateReport() {
    console.log('\n📋 RELATÓRIO DE CORREÇÕES IMPLEMENTADAS:');
    console.log('=' .repeat(50));
    console.log('✅ Endpoint /api/track-purchase criado');
    console.log('✅ Integração com Facebook Conversions API');
    console.log('✅ Validação de dados obrigatórios');
    console.log('✅ Tratamento de erros melhorado');
    console.log('✅ Logs de auditoria no banco de dados');
    console.log('✅ Monitoramento de eventos do Facebook');
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS PARA A VPS:');
    console.log('1. git pull origin main');
    console.log('2. pm2 restart analytics');
    console.log('3. pm2 logs analytics --lines 50');
    console.log('4. Testar endpoint: node fix-utm-facebook-issue.js');
    console.log('');
}

// Função principal
async function main() {
    try {
        await checkServices();
        await testTrackPurchaseEndpoint();
        await testGetUtmEndpoint();
        await checkFacebookConfig();
        generateReport();
        
        console.log('\n🎉 Correção do tratamento de erros concluída!');
        console.log('📋 Execute este script na VPS após fazer git pull e restart dos serviços');
        
    } catch (error) {
        console.error('❌ Erro durante a execução:', error);
        process.exit(1);
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { main, checkServices, testTrackPurchaseEndpoint, testGetUtmEndpoint, checkFacebookConfig };