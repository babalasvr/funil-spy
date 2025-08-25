#!/bin/bash

# 🚀 Script de Setup Automático - Google Cloud
# Sistema de Remarketing Funil Spy

echo "🌐 Iniciando setup do Sistema de Remarketing no Google Cloud..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar se está rodando como usuário normal
if [[ $EUID -eq 0 ]]; then
   print_error "Este script não deve ser executado como root"
   exit 1
fi

print_info "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

print_info "Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

print_info "Instalando dependências do sistema..."
sudo apt-get install -y git nginx sqlite3 htop curl wget

print_info "Verificando instalação do Node.js..."
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js: $node_version | NPM: $npm_version"

print_info "Instalando PM2..."
sudo npm install -g pm2

print_info "Configurando diretório do projeto..."
cd ~
mkdir -p funil-spy
cd funil-spy

print_info "Clonando repositório ou aguardando upload manual..."
print_warning "Se você tem o código no GitHub, execute: git clone https://github.com/seu-usuario/funil-spy.git ."
print_warning "Caso contrário, faça upload dos arquivos para ~/funil-spy/"

# Aguardar confirmação do usuário
read -p "Pressione Enter após upload dos arquivos ou clone do repositório..."

# Verificar se existe a pasta analytics
if [ ! -d "analytics" ]; then
    print_error "Pasta 'analytics' não encontrada. Verifique se os arquivos foram uploadados corretamente."
    exit 1
fi

cd analytics

print_info "Instalando dependências NPM..."
npm install

print_info "Criando arquivo de configuração .env..."
cat > .env << EOL
# Email Configuration
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-gmail
EMAIL_FROM=noreply@seudominio.com

# Server Configuration
NODE_ENV=production
PORT=3001
DB_PATH=./analytics.db

# Demo Pixels (substitua pelos reais)
FACEBOOK_PIXEL_ID=demo_pixel_id
GOOGLE_CONVERSION_ID=AW-demo-conversion
GOOGLE_CONVERSION_LABEL=demo-label
EOL

print_status "Arquivo .env criado! Edite-o com suas configurações reais."

print_info "Testando aplicação..."
timeout 10s node server.js &
sleep 5

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Aplicação está funcionando!"
else
    print_error "Erro ao iniciar aplicação. Verifique os logs."
fi

print_info "Configurando PM2..."
pm2 start server.js --name "remarketing-system"
pm2 startup
pm2 save

print_info "Configurando Nginx..."
sudo tee /etc/nginx/sites-available/remarketing > /dev/null << EOL
server {
    listen 80;
    server_name _;

    location / {
        root $HOME/funil-spy;
        try_files \$uri \$uri/ @nodejs;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /admin {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /remarketing {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /demo {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location @nodejs {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

sudo ln -sf /etc/nginx/sites-available/remarketing /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

print_info "Testando configuração do Nginx..."
if sudo nginx -t; then
    print_status "Configuração do Nginx está correta!"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    print_error "Erro na configuração do Nginx!"
fi

# Obter IP externo
EXTERNAL_IP=$(curl -s ifconfig.me)

print_status "🎉 Setup concluído com sucesso!"
echo ""
print_info "📊 URLs do Sistema:"
echo "   Dashboard Principal: http://$EXTERNAL_IP/admin"
echo "   Dashboard Remarketing: http://$EXTERNAL_IP/remarketing" 
echo "   Página Demo: http://$EXTERNAL_IP/demo"
echo "   API Health Check: http://$EXTERNAL_IP/api/health"
echo ""
print_info "🔧 Comandos Úteis:"
echo "   Ver logs: pm2 logs remarketing-system"
echo "   Reiniciar: pm2 restart remarketing-system"
echo "   Status: pm2 status"
echo "   Editar config: nano ~/funil-spy/analytics/.env"
echo ""
print_warning "📝 Próximos passos:"
echo "   1. Edite o arquivo .env com suas configurações reais"
echo "   2. Configure seu Gmail para envio de emails"
echo "   3. Adicione seus pixels do Facebook e Google"
echo "   4. Teste o sistema acessando as URLs acima"
echo ""
print_status "Sistema pronto para uso! 🚀"