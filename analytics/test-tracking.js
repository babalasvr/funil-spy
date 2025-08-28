#!/usr/bin/env node
/**
 * 🧪 Script de Teste Completo
 * Sistema de Tracking Avançado - UTMify + Facebook
 * 
 * Este script testa todas as funcionalidades do sistema
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class TrackingTester {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        this.sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTest(name, testFn) {
        try {
            log(`\n🧪 Testando: ${name}`, 'cyan');
            const result = await testFn();
            
            if (result.success) {
                log(`✅ ${name} - PASSOU`, 'green');
                this.testResults.passed++;
            } else {
                log(`❌ ${name} - FALHOU: ${result.error}`, 'red');
                this.testResults.failed++;
            }
            
            this.testResults.tests.push({
                name,
                success: result.success,
                error: result.error,
                data: result.data
            });
            
        } catch (error) {
            log(`❌ ${name} - ERRO: ${error.message}`, 'red');
            this.testResults.failed++;
            this.testResults.tests.push({
                name,
                success: false,
                error: error.message
            });
        }
    }

    async testHealthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`);
            
            if (response.status === 200 && response.data.status === 'ok') {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Health check retornou status inválido'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Servidor não está respondendo: ${error.message}`
            };
        }
    }

    async testMonitoringHealth() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/health`);
            
            if (response.status === 200 && response.data.healthy !== undefined) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Endpoint de monitoramento retornou dados inválidos'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no endpoint de monitoramento: ${error.message}`
            };
        }
    }

    async testPageView() {
        try {
            const response = await axios.post(`${this.baseUrl}/api/tracking/pageview`, {
                sessionId: this.sessionId,
                url: 'https://example.com/test-page',
                title: 'Página de Teste',
                referrer: 'https://google.com',
                utm: {
                    source: 'test',
                    medium: 'automation',
                    campaign: 'tracking-test',
                    term: 'test-keyword',
                    content: 'test-content'
                }
            });
            
            if (response.status === 200 && response.data.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'PageView não foi processado corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no tracking de PageView: ${error.message}`
            };
        }
    }

    async testLeadCapture() {
        try {
            const response = await axios.post(`${this.baseUrl}/api/tracking/lead`, {
                sessionId: this.sessionId,
                leadData: {
                    name: 'João Teste',
                    email: 'joao.teste@example.com',
                    phone: '+5511999999999'
                },
                formId: 'test-form',
                pageUrl: 'https://example.com/landing-page'
            });
            
            if (response.status === 200 && response.data.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Lead capture não foi processado corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no lead capture: ${error.message}`
            };
        }
    }

    async testCheckoutStart() {
        try {
            const response = await axios.post(`${this.baseUrl}/api/tracking/checkout-start`, {
                sessionId: this.sessionId,
                checkoutData: {
                    value: 197.00,
                    currency: 'BRL',
                    products: [{
                        id: 'prod-test-001',
                        name: 'Produto de Teste',
                        category: 'Digital',
                        price: 197.00,
                        quantity: 1
                    }]
                },
                pageUrl: 'https://example.com/checkout'
            });
            
            if (response.status === 200 && response.data.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Checkout start não foi processado corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no checkout start: ${error.message}`
            };
        }
    }

    async testPurchase() {
        try {
            const response = await axios.post(`${this.baseUrl}/api/tracking/purchase`, {
                sessionId: this.sessionId,
                purchaseData: {
                    transactionId: `test_txn_${Date.now()}`,
                    value: 197.00,
                    currency: 'BRL',
                    products: [{
                        id: 'prod-test-001',
                        name: 'Produto de Teste',
                        category: 'Digital',
                        price: 197.00,
                        quantity: 1
                    }]
                },
                customerData: {
                    name: 'João Teste',
                    email: 'joao.teste@example.com',
                    phone: '+5511999999999',
                    document: '12345678901'
                }
            });
            
            if (response.status === 200 && response.data.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Purchase não foi processado corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no purchase: ${error.message}`
            };
        }
    }

    async testPixelCode() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tracking/pixel-code`);
            
            if (response.status === 200 && response.data.pixelCode) {
                const pixelCode = response.data.pixelCode;
                
                // Verificar se contém elementos essenciais do Pixel
                if (pixelCode.includes('fbq') && pixelCode.includes('init')) {
                    return {
                        success: true,
                        data: { codeLength: pixelCode.length }
                    };
                } else {
                    return {
                        success: false,
                        error: 'Código do Pixel não contém elementos essenciais'
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'Pixel code não foi gerado'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro ao gerar pixel code: ${error.message}`
            };
        }
    }

    async testSessionReport() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tracking/session-report/${this.sessionId}`);
            
            if (response.status === 200 && response.data.sessionId) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Session report não foi gerado corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no session report: ${error.message}`
            };
        }
    }

    async testIntegration() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tracking/test-integration`);
            
            if (response.status === 200) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Teste de integração falhou'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro no teste de integração: ${error.message}`
            };
        }
    }

    async testMetrics() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/metrics`);
            
            if (response.status === 200 && response.data.requests) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'Métricas não foram retornadas corretamente'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Erro ao obter métricas: ${error.message}`
            };
        }
    }

    async runAllTests() {
        log('🚀 INICIANDO TESTES DO SISTEMA DE TRACKING', 'bright');
        log('═══════════════════════════════════════════════', 'cyan');
        log(`📊 Session ID de teste: ${this.sessionId}`, 'blue');
        
        // Testes básicos
        await this.runTest('Health Check', () => this.testHealthCheck());
        await this.runTest('Monitoring Health', () => this.testMonitoringHealth());
        
        // Testes de tracking
        await this.runTest('Page View Tracking', () => this.testPageView());
        await this.runTest('Lead Capture', () => this.testLeadCapture());
        await this.runTest('Checkout Start', () => this.testCheckoutStart());
        await this.runTest('Purchase Tracking', () => this.testPurchase());
        
        // Testes de funcionalidades
        await this.runTest('Pixel Code Generation', () => this.testPixelCode());
        await this.runTest('Session Report', () => this.testSessionReport());
        await this.runTest('Integration Test', () => this.testIntegration());
        await this.runTest('Metrics Collection', () => this.testMetrics());
        
        this.showResults();
    }

    showResults() {
        log('\n📊 RESULTADOS DOS TESTES', 'bright');
        log('═══════════════════════════', 'cyan');
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = ((this.testResults.passed / total) * 100).toFixed(1);
        
        log(`\n✅ Testes aprovados: ${this.testResults.passed}`, 'green');
        log(`❌ Testes falharam: ${this.testResults.failed}`, 'red');
        log(`📈 Taxa de sucesso: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
        
        if (this.testResults.failed > 0) {
            log('\n❌ TESTES QUE FALHARAM:', 'red');
            this.testResults.tests
                .filter(test => !test.success)
                .forEach(test => {
                    log(`   • ${test.name}: ${test.error}`, 'red');
                });
        }
        
        // Salvar relatório
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            results: this.testResults,
            successRate: parseFloat(successRate)
        }, null, 2));
        
        log(`\n📄 Relatório salvo em: ${reportPath}`, 'blue');
        
        if (successRate >= 80) {
            log('\n🎉 SISTEMA FUNCIONANDO CORRETAMENTE!', 'green');
        } else {
            log('\n⚠️  SISTEMA PRECISA DE ATENÇÃO!', 'yellow');
        }
        
        log('\n🔍 PRÓXIMOS PASSOS:', 'cyan');
        log('• Verifique os logs do servidor para mais detalhes');
        log('• Teste manualmente no navegador');
        log('• Configure o Facebook Test Events para validar eventos');
        log('• Monitore as métricas em /api/monitoring/metrics');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://localhost:3001';
    
    log(`🎯 Testando servidor: ${baseUrl}`, 'cyan');
    
    const tester = new TrackingTester(baseUrl);
    await tester.runAllTests();
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        log(`❌ Erro fatal: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = TrackingTester;