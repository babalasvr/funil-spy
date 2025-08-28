#!/usr/bin/env node

/**
 * 🚀 Script de Instalação Automática
 * Sistema de Tracking Avançado - UTMify + Facebook Pixel + Conversions API
 * 
 * Este script automatiza a configuração inicial do sistema de tracking.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Cores para output no terminal
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

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.cyan}${colors.bright}🚀 ${msg}${colors.reset}\n`)
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

class TrackingInstaller {
    constructor() {
        this.config = {};
        this.analyticsPath = path.join(__dirname, 'analytics');
    }

    async run() {
        try {
            log.title('Instalação do Sistema de Tracking Avançado');
            
            await this.checkPrerequisites();
            await this.collectConfiguration();
            await this.installDependencies();
            await this.createEnvironmentFile();
            await this.testConfiguration();
            await this.showCompletionMessage();
            
        } catch (error) {
            log.error(`Erro durante a instalação: ${error.message}`);
            process.exit(1);
        } finally {
            rl.close();
        }
    }

    async checkPrerequisites() {
        log.info('Verificando pré-requisitos...');
        
        // Verificar Node.js
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
            const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
            
            if (majorVersion < 14) {
                throw new Error(`Node.js ${nodeVersion} encontrado. Versão mínima: 14.0.0`);
            }
            
            log.success(`Node.js ${nodeVersion} ✓`);
        } catch (error) {
            throw new Error('Node.js não encontrado. Instale Node.js 14+ antes de continuar.');
        }

        // Verificar npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            log.success(`npm ${npmVersion} ✓`);
        } catch (error) {
            throw new Error('npm não encontrado.');
        }

        // Verificar estrutura do projeto
        if (!fs.existsSync(this.analyticsPath)) {
            throw new Error('Diretório analytics/ não encontrado. Execute este script na raiz do projeto.');
        }
        
        if (!fs.existsSync(path.join(this.analyticsPath, 'package.json'))) {
            throw new Error('package.json não encontrado em analytics/');
        }
        
        log.success('Estrutura do projeto ✓');
    }

    async collectConfiguration() {
        log.info('Coletando configurações do Facebook...');
        
        console.log('\n📋 Para configurar o sistema, você precisará:');
        console.log('   1. Facebook Pixel ID (obrigatório)');
        console.log('   2. Access Token do Facebook (obrigatório)');
        console.log('   3. Test Event Code (opcional, para testes)');
        console.log('\n💡 Encontre essas informações em: https://business.facebook.com/events_manager\n');
        
        // Facebook Pixel ID
        while (!this.config.pixelId) {
            const pixelId = await question('🎯 Facebook Pixel ID: ');
            if (pixelId && /^\d{15,16}$/.test(pixelId)) {
                this.config.pixelId = pixelId;
            } else {
                log.warning('Pixel ID deve ter 15-16 dígitos. Exemplo: 123456789012345');
            }
        }
        
        // Access Token
        while (!this.config.accessToken) {
            const accessToken = await question('🔑 Facebook Access Token: ');
            if (accessToken && accessToken.startsWith('EAA')) {
                this.config.accessToken = accessToken;
            } else {
                log.warning('Access Token deve começar com "EAA". Verifique se copiou corretamente.');
            }
        }
        
        // Test Event Code (opcional)
        const testCode = await question('🧪 Test Event Code (opcional, Enter para pular): ');
        if (testCode) {
            this.config.testEventCode = testCode;
        }
        
        // Porta do servidor
        const port = await question('🌐 Porta do servidor (padrão: 3001): ');
        this.config.port = port || '3001';
        
        log.success('Configurações coletadas ✓');
    }

    async installDependencies() {
        log.info('Instalando dependências...');
        
        try {
            process.chdir(this.analyticsPath);
            execSync('npm install', { stdio: 'inherit' });
            log.success('Dependências instaladas ✓');
        } catch (error) {
            throw new Error('Falha ao instalar dependências. Verifique sua conexão com a internet.');
        }
    }

    async createEnvironmentFile() {
        log.info('Criando arquivo de configuração...');
        
        const envContent = `# 🚀 Configuração do Sistema de Tracking Avançado
# Gerado automaticamente em ${new Date().toISOString()}

# ===== FACEBOOK CONFIGURATION =====
FACEBOOK_PIXEL_ID=${this.config.pixelId}
FACEBOOK_ACCESS_TOKEN=${this.config.accessToken}
${this.config.testEventCode ? `FACEBOOK_TEST_EVENT_CODE=${this.config.testEventCode}` : '# FACEBOOK_TEST_EVENT_CODE=TEST12345'}

# ===== SERVER CONFIGURATION =====
PORT=${this.config.port}
NODE_ENV=production

# ===== SECURITY CONFIGURATION =====
SESSION_SECRET=${this.generateRandomString(32)}
API_KEY=${this.generateRandomString(24)}

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ===== CACHE CONFIGURATION =====
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# ===== LOGGING =====
LOG_LEVEL=info
LOG_FILE=./logs/analytics.log

# ===== DATABASE =====
DB_PATH=./data/analytics.db
DB_BACKUP_INTERVAL=86400

# ===== CORS CONFIGURATION =====
# CORS_ORIGIN=https://seudominio.com
# CORS_CREDENTIALS=true

# ===== SSL CONFIGURATION (Para produção) =====
# SSL_CERT_PATH=./ssl/cert.pem
# SSL_KEY_PATH=./ssl/key.pem

# ===== MONITORING =====
# WEBHOOK_URL=https://hooks.slack.com/services/...
# ALERT_EMAIL=admin@seudominio.com
`;
        
        const envPath = path.join(this.analyticsPath, '.env');
        fs.writeFileSync(envPath, envContent);
        
        log.success('Arquivo .env criado ✓');
    }

    async testConfiguration() {
        log.info('Testando configuração...');
        
        try {
            // Iniciar servidor temporariamente para teste
            log.info('Iniciando servidor para teste...');
            
            const serverProcess = execSync('timeout 10 npm start', { 
                cwd: this.analyticsPath,
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            log.success('Servidor iniciado com sucesso ✓');
            
        } catch (error) {
            // Timeout é esperado, verificar se não houve erro de configuração
            if (error.stdout && error.stdout.includes('Analytics service running')) {
                log.success('Configuração testada com sucesso ✓');
            } else {
                log.warning('Não foi possível testar automaticamente. Execute manualmente: npm start');
            }
        }
    }

    async showCompletionMessage() {
        log.title('Instalação Concluída com Sucesso!');
        
        console.log(`${colors.green}🎉 Sistema de Tracking Avançado instalado e configurado!${colors.reset}\n`);
        
        console.log('📋 Próximos passos:');
        console.log('\n1. 🚀 Iniciar o servidor:');
        console.log(`   ${colors.cyan}cd analytics && npm start${colors.reset}`);
        
        console.log('\n2. 📱 Incluir script nas páginas:');
        console.log(`   ${colors.cyan}<script src="/js/advanced-tracking.js"></script>${colors.reset}`);
        
        console.log('\n3. 🧪 Testar configuração:');
        console.log(`   ${colors.cyan}curl -X POST http://localhost:${this.config.port}/api/tracking/test${colors.reset}`);
        
        console.log('\n4. 📊 Verificar eventos no Facebook:');
        console.log(`   ${colors.cyan}https://business.facebook.com/events_manager${colors.reset}`);
        
        console.log('\n📖 Documentação completa:');
        console.log(`   ${colors.cyan}TRACKING_IMPLEMENTATION_GUIDE.md${colors.reset}`);
        
        console.log('\n🔧 Configurações salvas em:');
        console.log(`   ${colors.cyan}analytics/.env${colors.reset}`);
        
        console.log(`\n${colors.yellow}⚠️  IMPORTANTE: Mantenha seu Access Token seguro e nunca o compartilhe!${colors.reset}`);
    }

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Executar instalação
if (require.main === module) {
    const installer = new TrackingInstaller();
    installer.run().catch((error) => {
        log.error(`Erro fatal: ${error.message}`);
        process.exit(1);
    });
}

module.exports = TrackingInstaller;