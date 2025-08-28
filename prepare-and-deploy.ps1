# Script PowerShell para Preparar e Fazer Deploy via Git
# Sistema de Rastreamento Avançado
# Uso: .\prepare-and-deploy.ps1

param(
    [string]$GitUrl = "",
    [string]$ServerIP = "",
    [string]$Domain = ""
)

# Cores para output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Cyan"

function Write-Log {
    param([string]$Message, [string]$Color = $Green)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor $Red
    exit 1
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

# Verificar se Git está instalado
function Test-Git {
    Write-Log "Verificando Git..."
    
    try {
        $gitVersion = git --version
        Write-Log "Git encontrado: $gitVersion"
        return $true
    }
    catch {
        Write-Error "Git não encontrado. Instale o Git primeiro: https://git-scm.com/download/win"
        return $false
    }
}

# Verificar se Node.js está instalado
function Test-NodeJS {
    Write-Log "Verificando Node.js..."
    
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Log "Node.js encontrado: $nodeVersion"
        Write-Log "npm encontrado: $npmVersion"
        return $true
    }
    catch {
        Write-Warning "Node.js não encontrado. Recomendado para testes locais."
        Write-Info "Download: https://nodejs.org/"
        return $false
    }
}

# Preparar repositório Git
function Initialize-GitRepository {
    Write-Log "Preparando repositório Git..."
    
    # Verificar se já é um repositório Git
    if (Test-Path ".git") {
        Write-Log "Repositório Git já inicializado"
    } else {
        Write-Log "Inicializando repositório Git..."
        git init
        git branch -M main
    }
    
    # Criar/atualizar .gitignore
    $gitignoreContent = @"
node_modules/
.env
*.log
analytics.db
.DS_Store
Thumbs.db
*.tmp
*.temp
logs/
"@
    
    Set-Content -Path ".gitignore" -Value $gitignoreContent
    Write-Log ".gitignore criado/atualizado"
}

# Verificar estrutura do projeto
function Test-ProjectStructure {
    Write-Log "Verificando estrutura do projeto..."
    
    $requiredFiles = @(
        "analytics/server.js",
        "analytics/package.json",
        "analytics/services/facebook-integration.js",
        "analytics/routes/tracking-routes.js",
        "js/advanced-tracking.js"
    )
    
    $missingFiles = @()
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Warning "Arquivos importantes não encontrados:"
        foreach ($file in $missingFiles) {
            Write-Host "  - $file" -ForegroundColor $Red
        }
        Write-Warning "Certifique-se de que o sistema de rastreamento foi implementado corretamente."
    } else {
        Write-Log "✓ Estrutura do projeto verificada"
    }
}

# Preparar arquivo .env de exemplo
function Prepare-EnvExample {
    Write-Log "Preparando arquivo .env.example..."
    
    $envExamplePath = "analytics/.env.example"
    
    if (-not (Test-Path $envExamplePath)) {
        $envContent = @"
# Facebook Pixel Configuration
FACEBOOK_PIXEL_ID=your_pixel_id_here
FACEBOOK_ACCESS_TOKEN=your_access_token_here
FACEBOOK_AD_ACCOUNT_ID=act_your_ad_account_id_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./analytics.db

# UTM Tracking
UTM_TRACKING=true
PIXEL_ID=your_pixel_id_here

# Monitoring
MONITORING_ENABLED=true
ALERT_EMAIL=your_email@example.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# WhatsApp Business API (opcional)
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_phone_number_id

# Google Ads (opcional)
GOOGLE_ADS_CUSTOMER_ID=your_customer_id
GOOGLE_ADS_CONVERSION_ID=your_conversion_id

# Payment API (opcional)
PAYMENT_API_URL=https://your-payment-api.com
PAYMENT_API_KEY=your_payment_api_key
"@
        
        Set-Content -Path $envExamplePath -Value $envContent
        Write-Log ".env.example criado em analytics/"
    } else {
        Write-Log ".env.example já existe"
    }
}

# Testar aplicação localmente (se Node.js estiver disponível)
function Test-Application {
    if (-not (Test-NodeJS)) {
        Write-Warning "Pulando testes locais - Node.js não disponível"
        return
    }
    
    Write-Log "Testando aplicação localmente..."
    
    # Instalar dependências se necessário
    if (Test-Path "analytics/package.json") {
        Push-Location "analytics"
        
        if (-not (Test-Path "node_modules")) {
            Write-Log "Instalando dependências..."
            npm install
        }
        
        # Testar se o servidor inicia (apenas verificação rápida)
        if (Test-Path "test-tracking.js") {
            Write-Log "Executando testes..."
            try {
                node test-tracking.js
                Write-Log "✓ Testes executados"
            }
            catch {
                Write-Warning "Alguns testes podem ter falhado (normal se .env não estiver configurado)"
            }
        }
        
        # Testar servidor local
        Write-Log "Iniciando servidor de teste..."
        $port = 3000
        
        # Verificar se a porta está em uso
        $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portInUse) {
            Write-Warning "Porta $port em uso. Tentando porta alternativa..."
            $port = 3001
        }
        
        # Iniciar servidor de teste em background
        $env:PORT = $port
        $testProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow
        
        Start-Sleep -Seconds 3
        
        # Testar se o servidor está respondendo
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 5 -ErrorAction Stop
            Write-Host "✅ Teste local concluído com sucesso!" -ForegroundColor Green
            Write-Host "Servidor rodando em: http://localhost:$port" -ForegroundColor Cyan
            Write-Host "Pressione Ctrl+C para parar o servidor de teste" -ForegroundColor Yellow
            
            # Aguardar input do usuário
            Read-Host "Pressione Enter para continuar com o deploy"
            
            # Parar servidor de teste
            if ($testProcess -and !$testProcess.HasExited) {
                $testProcess.Kill()
                Write-Host "Servidor de teste parado" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "💡 Dica: Se houver conflito de porta no servidor, use:" -ForegroundColor Cyan
            Write-Host "   Windows: .\fix-port-conflict.ps1" -ForegroundColor White
            Write-Host "   Linux: ./fix-port-conflict.sh" -ForegroundColor White
        }
        catch {
            Write-Warning "Servidor de teste não respondeu. Continuando com deploy..."
            if ($testProcess -and !$testProcess.HasExited) {
                $testProcess.Kill()
            }
        }
        
        Pop-Location
    }
}

# Fazer commit e push
function Commit-And-Push {
    param([string]$GitUrl)
    
    Write-Log "Preparando commit..."
    
    # Adicionar arquivos
    git add .
    
    # Verificar se há mudanças
    $status = git status --porcelain
    if (-not $status) {
        Write-Log "Nenhuma mudança para commit"
        return
    }
    
    # Fazer commit
    $commitMessage = "Deploy: Sistema de Rastreamento Avançado - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m $commitMessage
    
    # Configurar remote se fornecido
    if ($GitUrl) {
        try {
            git remote remove origin 2>$null
        } catch {}
        
        git remote add origin $GitUrl
        Write-Log "Remote origin configurado: $GitUrl"
    }
    
    # Push
    try {
        git push -u origin main
        Write-Log "✓ Código enviado para o repositório"
    }
    catch {
        Write-Error "Falha ao fazer push. Verifique a URL do repositório e suas credenciais."
    }
}

# Gerar comandos para o servidor
function Generate-ServerCommands {
    param([string]$ServerIP, [string]$Domain)
    
    Write-Log "Gerando comandos para execução no servidor..."
    
    $serverCommands = @"
# Comandos para executar no servidor Linux
# Copie e cole estes comandos no seu servidor

# 1. Conectar ao servidor
ssh root@$ServerIP
# ou
ssh usuario@$ServerIP

# 2. Executar script de deploy automatizado
wget https://raw.githubusercontent.com/SEU_USUARIO/funil-spy/main/deploy-server.sh
chmod +x deploy-server.sh
bash deploy-server.sh

# OU fazer deploy manual:

# 3. Instalar dependências
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm install -g pm2

# 4. Clonar repositório
cd /var/www
sudo git clone $GitUrl funil-spy
sudo chown -R `$USER:`$USER funil-spy
cd funil-spy

# 5. Instalar dependências do projeto
npm install
cd analytics
npm install

# 6. Configurar .env
cp .env.example .env
nano .env  # Configure suas variáveis

# 7. Testar aplicação
node test-tracking.js

# 8. Iniciar com PM2
node production-deploy.js
# ou
pm2 start server.js --name funil-spy-analytics
pm2 save
pm2 startup

# 9. Configurar Nginx
sudo nano /etc/nginx/sites-available/funil-spy
# Cole a configuração do Nginx do guia
sudo ln -s /etc/nginx/sites-available/funil-spy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Configurar firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 11. Configurar SSL (opcional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d $Domain

# Verificar status
pm2 status
sudo systemctl status nginx
curl http://localhost:3000/health
"@
    
    $commandsFile = "server-deploy-commands.txt"
    Set-Content -Path $commandsFile -Value $serverCommands
    Write-Log "Comandos salvos em: $commandsFile"
}

# Exibir informações finais
function Show-FinalInfo {
    param([string]$Domain)
    
    Write-Log "=== PREPARAÇÃO CONCLUÍDA ===" $Blue
    Write-Host ""
    Write-Info "Próximos passos:"
    Write-Host "1. Acesse seu servidor Linux via SSH" -ForegroundColor $Yellow
    Write-Host "2. Execute os comandos do arquivo 'server-deploy-commands.txt'" -ForegroundColor $Yellow
    Write-Host "3. Configure o arquivo .env no servidor" -ForegroundColor $Yellow
    Write-Host "4. Teste o sistema em: http://$Domain/api/health" -ForegroundColor $Yellow
    Write-Host ""
    Write-Info "Arquivos importantes criados:"
    Write-Host "  - DEPLOY-GIT-GUIDE.md (guia completo)" -ForegroundColor $Green
    Write-Host "  - deploy-server.sh (script automatizado para Linux)" -ForegroundColor $Green
    Write-Host "  - server-deploy-commands.txt (comandos para o servidor)" -ForegroundColor $Green
    Write-Host "  - analytics/.env.example (template de configuração)" -ForegroundColor $Green
    Write-Host ""
    Write-Info "Monitoramento após deploy:"
    Write-Host "  - Status PM2: pm2 status" -ForegroundColor $Blue
    Write-Host "  - Logs: pm2 logs funil-spy-analytics" -ForegroundColor $Blue
    Write-Host "  - Métricas: http://$Domain/api/metrics" -ForegroundColor $Blue
    Write-Host "  - Teste tracking: http://$Domain/api/tracking/test" -ForegroundColor $Blue
    Write-Host ""
}

# Função principal
function Main {
    Write-Log "=== PREPARAÇÃO PARA DEPLOY VIA GIT ===" $Blue
    Write-Host ""
    
    # Verificar pré-requisitos
    if (-not (Test-Git)) {
        return
    }
    
    # Coletar informações se não fornecidas
    if (-not $GitUrl) {
        $GitUrl = Read-Host "Digite a URL do seu repositório Git (ex: https://github.com/usuario/funil-spy.git)"
    }
    
    if (-not $ServerIP) {
        $ServerIP = Read-Host "Digite o IP do seu servidor (ex: 192.168.1.100)"
    }
    
    if (-not $Domain) {
        $Domain = Read-Host "Digite seu domínio (ex: meusite.com) ou pressione Enter para usar o IP"
        if (-not $Domain) {
            $Domain = $ServerIP
        }
    }
    
    # Executar preparação
    Test-ProjectStructure
    Initialize-GitRepository
    Prepare-EnvExample
    Test-Application
    Commit-And-Push -GitUrl $GitUrl
    Generate-ServerCommands -ServerIP $ServerIP -Domain $Domain
    Show-FinalInfo -Domain $Domain
    
    Write-Log "Preparação concluída! 🚀" $Green
}

# Executar script principal
Main