#!/usr/bin/env node
/**
 * 🚀 Script de Deploy para Produção
 * Sistema de Tracking Avançado - UTMify + Facebook
 * 
 * Este script automatiza o processo de deploy em produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function checkPrerequisites() {
    log('\n🔍 Verificando pré-requisitos...', 'cyan');
    
    // Verificar Node.js
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`✅ Node.js: ${nodeVersion}`, 'green');
    } catch (error) {
        log('❌ Node.js não encontrado', 'red');
        process.exit(1);
    }
    
    // Verificar npm
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`✅ npm: ${npmVersion}`, 'green');
    } catch (error) {
        log('❌ npm não encontrado', 'red');
        process.exit(1);
    }
    
    // Verificar PM2 (opcional)
    try {
        const pm2Version = execSync('pm2 --version', { encoding: 'utf8' }).trim();
        log(`✅ PM2: ${pm2Version}`, 'green');
        return true;
    } catch (error) {
        log('⚠️  PM2 não encontrado (será instalado)', 'yellow');
        return false;
    }
}

async function installDependencies() {
    log('\n📦 Instalando dependências...', 'cyan');
    
    try {
        execSync('npm install --production', { stdio: 'inherit' });
        log('✅ Dependências instaladas', 'green');
    } catch (error) {
        log('❌ Erro ao instalar dependências', 'red');
        process.exit(1);
    }
}

async function setupEnvironment() {
    log('\n⚙️  Configurando ambiente de produção...', 'cyan');
    
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        log('❌ Arquivo .env não encontrado', 'red');
        log('Execute primeiro: node install-tracking.js', 'yellow');
        process.exit(1);
    }
    
    // Verificar variáveis críticas
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
        'FACEBOOK_PIXEL_ID',
        'FACEBOOK_ACCESS_TOKEN',
        'NODE_ENV',
        'PORT'
    ];
    
    const missingVars = [];
    requiredVars.forEach(varName => {
        if (!envContent.includes(`${varName}=`)) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        log(`❌ Variáveis de ambiente faltando: ${missingVars.join(', ')}`, 'red');
        process.exit(1);
    }
    
    // Definir NODE_ENV como production
    let updatedEnv = envContent;
    if (!envContent.includes('NODE_ENV=production')) {
        updatedEnv = updatedEnv.replace(/NODE_ENV=.*/g, 'NODE_ENV=production');
        if (!updatedEnv.includes('NODE_ENV=')) {
            updatedEnv += '\nNODE_ENV=production';
        }
        fs.writeFileSync(envPath, updatedEnv);
    }
    
    log('✅ Ambiente configurado para produção', 'green');
}

async function setupPM2() {
    log('\n🔧 Configurando PM2...', 'cyan');
    
    // Instalar PM2 globalmente se necessário
    try {
        execSync('pm2 --version', { stdio: 'ignore' });
    } catch (error) {
        log('📦 Instalando PM2...', 'yellow');
        execSync('npm install -g pm2', { stdio: 'inherit' });
    }
    
    // Criar arquivo de configuração PM2
    const pm2Config = {
        apps: [{
            name: 'funil-spy-analytics',
            script: './server.js',
            cwd: __dirname,
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: process.env.PORT || 3001
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            max_memory_restart: '1G',
            node_args: '--max-old-space-size=1024',
            watch: false,
            ignore_watch: ['node_modules', 'logs', '*.db'],
            restart_delay: 4000,
            max_restarts: 10,
            min_uptime: '10s'
        }]
    };
    
    // Criar diretório de logs
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(__dirname, 'ecosystem.config.js'),
        `module.exports = ${JSON.stringify(pm2Config, null, 2)};`
    );
    
    log('✅ PM2 configurado', 'green');
}

async function runTests() {
    log('\n🧪 Executando testes...', 'cyan');
    
    try {
        // Teste básico de inicialização
        const testScript = `
            const FacebookIntegration = require('./services/facebook-integration');
            const UTMifyFacebookBridge = require('./services/utmify-facebook-bridge');
            
            async function test() {
                try {
                    const facebook = new FacebookIntegration();
                    const bridge = new UTMifyFacebookBridge();
                    
                    console.log('✅ Módulos carregados com sucesso');
                    
                    // Teste de configuração
                    const isValid = facebook.validateConfig();
                    if (isValid) {
                        console.log('✅ Configuração do Facebook válida');
                    } else {
                        console.log('⚠️  Configuração do Facebook incompleta');
                    }
                    
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Erro nos testes:', error.message);
                    process.exit(1);
                }
            }
            
            test();
        `;
        
        fs.writeFileSync(path.join(__dirname, 'test-deploy.js'), testScript);
        execSync('node test-deploy.js', { stdio: 'inherit' });
        fs.unlinkSync(path.join(__dirname, 'test-deploy.js'));
        
        log('✅ Testes passaram', 'green');
    } catch (error) {
        log('❌ Testes falharam', 'red');
        process.exit(1);
    }
}

async function deployApplication() {
    log('\n🚀 Fazendo deploy da aplicação...', 'cyan');
    
    try {
        // Parar aplicação existente
        try {
            execSync('pm2 stop funil-spy-analytics', { stdio: 'ignore' });
            execSync('pm2 delete funil-spy-analytics', { stdio: 'ignore' });
        } catch (error) {
            // Aplicação não estava rodando
        }
        
        // Iniciar aplicação
        execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
        
        // Salvar configuração PM2
        execSync('pm2 save', { stdio: 'inherit' });
        
        // Configurar startup
        execSync('pm2 startup', { stdio: 'inherit' });
        
        log('✅ Aplicação deployada com sucesso', 'green');
        
        // Mostrar status
        setTimeout(() => {
            execSync('pm2 status', { stdio: 'inherit' });
        }, 2000);
        
    } catch (error) {
        log('❌ Erro no deploy', 'red');
        console.error(error.message);
        process.exit(1);
    }
}

async function showPostDeployInfo() {
    log('\n🎉 Deploy concluído com sucesso!', 'green');
    log('\n📋 Informações importantes:', 'cyan');
    log('\n• Aplicação rodando em modo cluster com PM2');
    log('• Logs disponíveis em: ./logs/');
    log('• Monitoramento: http://localhost:3001/api/monitoring/health');
    log('• Métricas: http://localhost:3001/api/monitoring/metrics');
    log('\n🔧 Comandos úteis:', 'yellow');
    log('• pm2 status - Ver status da aplicação');
    log('• pm2 logs funil-spy-analytics - Ver logs em tempo real');
    log('• pm2 restart funil-spy-analytics - Reiniciar aplicação');
    log('• pm2 stop funil-spy-analytics - Parar aplicação');
    log('• pm2 monit - Monitor interativo');
    log('\n🔍 Para testar o tracking:', 'magenta');
    log('• Acesse: http://localhost:3001/health');
    log('• Execute: node test-tracking.js (se disponível)');
    log('\n⚠️  Lembre-se:', 'yellow');
    log('• Configure seu firewall para a porta 3001');
    log('• Configure SSL/HTTPS em produção');
    log('• Monitore os logs regularmente');
    log('• Faça backup do banco de dados analytics.db');
}

async function main() {
    log('🚀 DEPLOY PARA PRODUÇÃO - Sistema de Tracking Avançado', 'bright');
    log('═══════════════════════════════════════════════════════', 'cyan');
    
    try {
        const hasPM2 = await checkPrerequisites();
        
        const confirm = await question('\n❓ Continuar com o deploy? (y/N): ');
        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            log('❌ Deploy cancelado', 'yellow');
            process.exit(0);
        }
        
        await installDependencies();
        await setupEnvironment();
        await setupPM2();
        await runTests();
        await deployApplication();
        await showPostDeployInfo();
        
    } catch (error) {
        log(`❌ Erro durante o deploy: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { main };