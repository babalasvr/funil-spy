#!/bin/bash

# Script de Deploy Automatizado - Funil Spy Analytics
# Execute este script na sua VPS após fazer o clone do repositório

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
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário normal com sudo."
fi

# Verificar sistema operacional
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -f /etc/debian_version ]; then
        OS="debian"
        log "Sistema detectado: Debian/Ubuntu"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
        log "Sistema detectado: RedHat/CentOS"
    else
        error "Sistema Linux não suportado"
    fi
else
    error "Sistema operacional não suportado. Use Linux."
fi

# Função para instalar pacotes
install_package() {
    if [ "$OS" = "debian" ]; then
        sudo apt-get install -y $1
    else
        sudo yum install -y $1
    fi
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log "=== Iniciando Deploy do Funil Spy Analytics ==="

# 1. Atualizar sistema
log "Atualizando sistema..."
if [ "$OS" = "debian" ]; then
    sudo apt-get update && sudo apt-get upgrade -y
else
    sudo yum update -y
fi

# 2. Instalar Node.js se não existir
if ! command_exists node; then
    log "Instalando Node.js..."
    if [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs npm
    fi
else
    log "Node.js já está instalado: $(node --version)"
fi

# 3. Instalar Git se não existir
if ! command_exists git; then
    log "Instalando Git..."
    install_package git
else
    log "Git já está instalado: $(git --version)"
fi

# 4. Instalar PM2 se não existir
if ! command_exists pm2; then
    log "Instalando PM2..."
    sudo npm install -g pm2
else
    log "PM2 já está instalado: $(pm2 --version)"
fi

# 5. Instalar Nginx se não existir
if ! command_exists nginx; then
    log "Instalando Nginx..."
    install_package nginx
    sudo systemctl enable nginx
else
    log "Nginx já está instalado"
fi

# 6. Configurar diretório da aplicação
APP_DIR="/var/www/funil-spy"
log "Configurando diretório da aplicação: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
fi

# 7. Verificar se já existe código
if [ -d "$APP_DIR/.git" ]; then
    log "Atualizando código existente..."
    cd $APP_DIR
    git pull origin main || git pull origin master
else
    warn "Diretório não contém repositório Git. Certifique-se de clonar o repositório primeiro."
    echo "Execute: git clone https://github.com/seu-usuario/funil-spy.git $APP_DIR"
    read -p "Pressione Enter após clonar o repositório..."
fi

# 8. Configurar aplicação
cd $APP_DIR/analytics

log "Instalando dependências..."
npm install --production

# 9. Configurar arquivo .env
if [ ! -f ".env" ]; then
    log "Criando arquivo .env..."
    cp .env.example .env
    warn "IMPORTANTE: Edite o arquivo .env com suas configurações!"
    echo "Arquivo criado em: $APP_DIR/analytics/.env"
    echo "Configure as seguintes variáveis:"
    echo "- FACEBOOK_ACCESS_TOKEN"
    echo "- FACEBOOK_PIXEL_ID"
    echo "- FACEBOOK_APP_ID"
    echo "- FACEBOOK_APP_SECRET"
    echo "- ALLOWED_ORIGINS"
    echo "- API_SECRET_KEY"
    read -p "Pressione Enter após configurar o .env..."
else
    log "Arquivo .env já existe"
fi

# 10. Configurar firewall
log "Configurando firewall..."
if command_exists ufw; then
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow 3000
    sudo ufw --force enable
elif command_exists firewall-cmd; then
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
fi

# 11. Configurar Nginx
log "Configurando Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/funil-spy"

if [ ! -f "$NGINX_CONFIG" ]; then
    sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /public {
        alias $APP_DIR/analytics/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Ativar site
    if [ "$OS" = "debian" ]; then
        sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Testar configuração
    sudo nginx -t
    sudo systemctl restart nginx
else
    log "Configuração do Nginx já existe"
fi

# 12. Configurar PM2
log "Configurando PM2..."

# Parar aplicação se estiver rodando
pm2 stop funil-spy-analytics 2>/dev/null || true
pm2 delete funil-spy-analytics 2>/dev/null || true

# Iniciar aplicação
pm2 start server.js --name "funil-spy-analytics"
pm2 save

# Configurar startup
pm2 startup | grep -E '^sudo' | bash || true

# 13. Configurar logs
log "Configurando logs..."
sudo mkdir -p /var/log/funil-spy
sudo chown $USER:$USER /var/log/funil-spy

# 14. Criar script de backup
log "Criando script de backup..."
BACKUP_SCRIPT="/home/$USER/backup-funil-spy.sh"

cat > $BACKUP_SCRIPT <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
APP_DIR="$APP_DIR"

mkdir -p \$BACKUP_DIR

# Backup do código
tar -czf \$BACKUP_DIR/funil-spy-code-\$DATE.tar.gz -C \$APP_DIR .

# Backup do banco de dados
cp \$APP_DIR/analytics/analytics.db \$BACKUP_DIR/analytics-db-\$DATE.db

# Manter apenas os últimos 7 backups
find \$BACKUP_DIR -name "funil-spy-*" -mtime +7 -delete
find \$BACKUP_DIR -name "analytics-db-*" -mtime +7 -delete

echo "Backup concluído: \$DATE"
EOF

chmod +x $BACKUP_SCRIPT

# 15. Verificar status
log "Verificando status da aplicação..."
sleep 3
pm2 status

# 16. Testar aplicação
log "Testando aplicação..."
sleep 2
if curl -f http://localhost:3000/health 2>/dev/null; then
    log "✅ Aplicação está respondendo!"
else
    warn "⚠️  Aplicação pode não estar respondendo corretamente"
fi

log "=== Deploy Concluído! ==="
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Configure o arquivo .env: $APP_DIR/analytics/.env"
echo "2. Configure seu domínio no Nginx (opcional)"
echo "3. Configure SSL com Let's Encrypt (recomendado)"
echo "4. Configure backup automático no crontab"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo "- Ver logs: pm2 logs funil-spy-analytics"
echo "- Reiniciar: pm2 restart funil-spy-analytics"
echo "- Status: pm2 status"
echo "- Backup: $BACKUP_SCRIPT"
echo ""
echo -e "${GREEN}Aplicação disponível em: http://$(curl -s ifconfig.me):3000${NC}"
echo -e "${GREEN}Ou através do Nginx: http://$(curl -s ifconfig.me)${NC}"

log "Deploy finalizado com sucesso!"