#!/bin/bash

# Script de Deploy Automatizado - Sistema de Rastreamento Avançado
# Uso: bash deploy-server.sh

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está rodando como root ou com sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warn "Rodando como root. Recomendado usar usuário normal com sudo."
    fi
}

# Detectar sistema operacional
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Não foi possível detectar o sistema operacional"
    fi
    
    log "Sistema detectado: $OS $VER"
}

# Instalar dependências do sistema
install_system_deps() {
    log "Instalando dependências do sistema..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        sudo apt update
        sudo apt install -y curl git nginx ufw
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        sudo yum update -y
        sudo yum install -y curl git nginx firewalld
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
    else
        error "Sistema operacional não suportado: $OS"
    fi
}

# Instalar Node.js
install_nodejs() {
    log "Verificando Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "Node.js já instalado: $NODE_VERSION"
        
        # Verificar se a versão é >= 16
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [[ $MAJOR_VERSION -lt 16 ]]; then
            warn "Versão do Node.js muito antiga. Atualizando..."
            install_nodejs_fresh
        fi
    else
        log "Instalando Node.js..."
        install_nodejs_fresh
    fi
}

install_nodejs_fresh() {
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    
    log "Node.js instalado: $(node --version)"
    log "npm instalado: $(npm --version)"
}

# Instalar PM2
install_pm2() {
    log "Verificando PM2..."
    
    if command -v pm2 &> /dev/null; then
        log "PM2 já instalado: $(pm2 --version)"
    else
        log "Instalando PM2..."
        sudo npm install -g pm2
        log "PM2 instalado: $(pm2 --version)"
    fi
}

# Configurar diretório do projeto
setup_project_directory() {
    log "Configurando diretório do projeto..."
    
    PROJECT_DIR="/var/www/funil-spy"
    
    if [[ -d $PROJECT_DIR ]]; then
        warn "Diretório $PROJECT_DIR já existe. Fazendo backup..."
        sudo mv $PROJECT_DIR "${PROJECT_DIR}-backup-$(date +%Y%m%d-%H%M%S)"
    fi
    
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
}

# Clonar repositório
clone_repository() {
    log "Clonando repositório..."
    
    echo -n "Digite a URL do seu repositório Git: "
    read REPO_URL
    
    if [[ -z "$REPO_URL" ]]; then
        error "URL do repositório é obrigatória"
    fi
    
    cd /var/www
    git clone $REPO_URL funil-spy
    cd funil-spy
    
    log "Repositório clonado com sucesso"
}

# Instalar dependências do projeto
install_project_deps() {
    log "Instalando dependências do projeto..."
    
    cd /var/www/funil-spy
    
    # Dependências principais
    if [[ -f package.json ]]; then
        npm install
    fi
    
    # Dependências do analytics
    if [[ -f analytics/package.json ]]; then
        cd analytics
        npm install
        cd ..
    fi
    
    log "Dependências instaladas"
}

# Configurar variáveis de ambiente
setup_environment() {
    log "Configurando variáveis de ambiente..."
    
    cd /var/www/funil-spy/analytics
    
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            log "Arquivo .env criado a partir do .env.example"
        else
            create_env_file
        fi
    else
        warn "Arquivo .env já existe"
    fi
    
    echo
    info "IMPORTANTE: Configure as variáveis de ambiente em /var/www/funil-spy/analytics/.env"
    info "Principais variáveis a configurar:"
    echo "  - FACEBOOK_PIXEL_ID"
    echo "  - FACEBOOK_ACCESS_TOKEN"
    echo "  - FACEBOOK_AD_ACCOUNT_ID"
    echo "  - ALERT_EMAIL"
    echo
    
    read -p "Pressione Enter para continuar após configurar o .env..."
}

create_env_file() {
    cat > .env << EOF
# Facebook Pixel
FACEBOOK_PIXEL_ID=
FACEBOOK_ACCESS_TOKEN=
FACEBOOK_AD_ACCOUNT_ID=

# Servidor
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./analytics.db

# UTM Tracking
UTM_TRACKING=true
PIXEL_ID=

# Monitoramento
MONITORING_ENABLED=true
ALERT_EMAIL=

# Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    
    log "Arquivo .env criado com template padrão"
}

# Testar aplicação
test_application() {
    log "Testando aplicação..."
    
    cd /var/www/funil-spy/analytics
    
    # Testar se o servidor inicia
    timeout 10s node server.js &
    SERVER_PID=$!
    
    sleep 3
    
    if kill -0 $SERVER_PID 2>/dev/null; then
        log "Servidor iniciou com sucesso"
        kill $SERVER_PID
        wait $SERVER_PID 2>/dev/null
    else
        error "Falha ao iniciar servidor. Verifique as configurações."
    fi
    
    # Executar testes se disponível
    if [[ -f test-tracking.js ]]; then
        log "Executando testes..."
        node test-tracking.js || warn "Alguns testes falharam"
    fi
}

# Configurar PM2
setup_pm2() {
    log "Configurando PM2..."
    
    cd /var/www/funil-spy/analytics
    
    # Parar processos existentes
    pm2 delete funil-spy-analytics 2>/dev/null || true
    
    # Criar diretório de logs
    mkdir -p logs
    
    # Usar script de deploy se disponível
    if [[ -f production-deploy.js ]]; then
        log "Usando script de deploy automático..."
        node production-deploy.js
    else
        # Configuração manual
        create_pm2_config
        pm2 start ecosystem.config.js
    fi
    
    # Salvar configuração
    pm2 save
    
    # Configurar inicialização automática
    pm2 startup | tail -1 | sudo bash
    
    log "PM2 configurado com sucesso"
}

create_pm2_config() {
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'funil-spy-analytics',
    script: 'server.js',
    cwd: '/var/www/funil-spy/analytics',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs']
  }]
};
EOF
    
    log "Arquivo ecosystem.config.js criado"
}

# Configurar Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    echo -n "Digite seu domínio (ex: meusite.com): "
    read DOMAIN
    
    if [[ -z "$DOMAIN" ]]; then
        DOMAIN="localhost"
        warn "Usando localhost como domínio padrão"
    fi
    
    # Criar configuração do Nginx
    sudo tee /etc/nginx/sites-available/funil-spy > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Servir arquivos estáticos
    location / {
        root /var/www/funil-spy;
        try_files \$uri \$uri/ =404;
        index index.html;
    }
    
    # Proxy para API analytics
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    
    # Logs
    access_log /var/log/nginx/funil-spy.access.log;
    error_log /var/log/nginx/funil-spy.error.log;
}
EOF
    
    # Ativar site
    sudo ln -sf /etc/nginx/sites-available/funil-spy /etc/nginx/sites-enabled/
    
    # Remover site padrão se existir
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    sudo nginx -t
    
    # Reiniciar Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configurado para domínio: $DOMAIN"
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        sudo ufw --force reset
        sudo ufw allow 22
        sudo ufw allow 80
        sudo ufw allow 443
        sudo ufw --force enable
        log "UFW configurado"
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
        log "Firewalld configurado"
    fi
}

# Verificação final
final_verification() {
    log "Executando verificação final..."
    
    # Verificar PM2
    if pm2 list | grep -q "funil-spy-analytics"; then
        log "✓ PM2 rodando"
    else
        error "✗ PM2 não está rodando"
    fi
    
    # Verificar Nginx
    if sudo systemctl is-active --quiet nginx; then
        log "✓ Nginx rodando"
    else
        error "✗ Nginx não está rodando"
    fi
    
    # Testar endpoint
    sleep 5
    if curl -s http://localhost:3000/health > /dev/null; then
        log "✓ API respondendo"
    else
        warn "✗ API não está respondendo (pode estar iniciando)"
    fi
    
    echo
    info "=== DEPLOY CONCLUÍDO ==="
    echo "Site: http://$DOMAIN"
    echo "API: http://$DOMAIN/api/health"
    echo "Logs PM2: pm2 logs funil-spy-analytics"
    echo "Status PM2: pm2 status"
    echo "Logs Nginx: sudo tail -f /var/log/nginx/funil-spy.access.log"
    echo
    info "Próximos passos:"
    echo "1. Configure SSL com: sudo certbot --nginx -d $DOMAIN"
    echo "2. Teste o rastreamento em: http://$DOMAIN/api/tracking/test"
    echo "3. Monitore os logs: pm2 monit"
    echo
}

# Função principal
main() {
    log "Iniciando deploy automatizado do Sistema de Rastreamento Avançado"
    
    check_permissions
    detect_os
    install_system_deps
    install_nodejs
    install_pm2
    setup_project_directory
    clone_repository
    install_project_deps
    setup_environment
    test_application
    setup_pm2
    setup_nginx
    setup_firewall
    final_verification
    
    log "Deploy concluído com sucesso! 🚀"
}

# Executar script principal
main "$@"