#!/bin/bash

# Script para configurar SSL com Let's Encrypt
# Execute após o deploy básico estar funcionando

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar se está rodando como usuário normal
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário normal com sudo."
fi

# Solicitar domínio
echo -e "${BLUE}=== Configuração SSL com Let's Encrypt ===${NC}"
echo ""
read -p "Digite seu domínio principal (ex: meusite.com): " DOMAIN
read -p "Digite domínios adicionais separados por espaço (ex: www.meusite.com): " ADDITIONAL_DOMAINS

if [ -z "$DOMAIN" ]; then
    error "Domínio principal é obrigatório!"
fi

# Construir lista de domínios
DOMAIN_LIST="$DOMAIN"
if [ ! -z "$ADDITIONAL_DOMAINS" ]; then
    DOMAIN_LIST="$DOMAIN $ADDITIONAL_DOMAINS"
fi

log "Configurando SSL para: $DOMAIN_LIST"

# Detectar sistema operacional
if [ -f /etc/debian_version ]; then
    OS="debian"
elif [ -f /etc/redhat-release ]; then
    OS="redhat"
else
    error "Sistema operacional não suportado"
fi

# Instalar Certbot
log "Instalando Certbot..."
if [ "$OS" = "debian" ]; then
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
else
    sudo yum install -y certbot python3-certbot-nginx
fi

# Verificar se Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    log "Iniciando Nginx..."
    sudo systemctl start nginx
fi

# Backup da configuração atual do Nginx
log "Fazendo backup da configuração do Nginx..."
sudo cp /etc/nginx/sites-available/funil-spy /etc/nginx/sites-available/funil-spy.backup.$(date +%Y%m%d_%H%M%S)

# Atualizar configuração do Nginx com o domínio
log "Atualizando configuração do Nginx..."
sudo tee /etc/nginx/sites-available/funil-spy > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_LIST;

    # Permitir acesso ao .well-known para verificação do Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

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
        alias /var/www/funil-spy/analytics/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Testar e recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Criar diretório para verificação
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html

# Obter certificado SSL
log "Obtendo certificado SSL..."
DOMAIN_ARGS=""
for domain in $DOMAIN_LIST; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

echo "Executando: sudo certbot --nginx $DOMAIN_ARGS --non-interactive --agree-tos --email admin@$DOMAIN"
read -p "Pressione Enter para continuar ou Ctrl+C para cancelar..."

sudo certbot --nginx $DOMAIN_ARGS --non-interactive --agree-tos --email admin@$DOMAIN

# Verificar se o certificado foi criado
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    log "✅ Certificado SSL criado com sucesso!"
else
    error "❌ Falha ao criar certificado SSL"
fi

# Configurar renovação automática
log "Configurando renovação automática..."

# Criar script de renovação
sudo tee /etc/cron.daily/certbot-renew > /dev/null <<EOF
#!/bin/bash
/usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

sudo chmod +x /etc/cron.daily/certbot-renew

# Adicionar ao crontab do usuário também
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'sudo systemctl reload nginx'") | crontab -

# Configuração final do Nginx com SSL otimizado
log "Aplicando configuração SSL otimizada..."
sudo tee /etc/nginx/sites-available/funil-spy > /dev/null <<EOF
# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name $DOMAIN_LIST;
    return 301 https://\$server_name\$request_uri;
}

# Configuração HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN_LIST;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configurações SSL otimizadas
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    
    # Protocolos e cifras modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS (opcional, descomente se desejar)
    # add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # Resolver DNS
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Proxy para aplicação Node.js
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Arquivos estáticos
    location /public {
        alias /var/www/funil-spy/analytics/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Compressão
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }
    
    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|conf)\$ {
        deny all;
    }
}
EOF

# Testar e recarregar configuração final
sudo nginx -t
sudo systemctl reload nginx

# Testar SSL
log "Testando configuração SSL..."
sleep 3

if curl -f https://$DOMAIN/health 2>/dev/null; then
    log "✅ SSL configurado com sucesso!"
else
    warn "⚠️  Verifique se a aplicação está respondendo via HTTPS"
fi

# Verificar rating SSL
log "Verificando rating SSL..."
echo "Você pode testar seu SSL em: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"

log "=== Configuração SSL Concluída! ==="
echo ""
echo -e "${BLUE}Informações importantes:${NC}"
echo "• Certificado válido por 90 dias"
echo "• Renovação automática configurada"
echo "• Site disponível em: https://$DOMAIN"
echo "• Redirecionamento HTTP → HTTPS ativo"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo "• Verificar certificados: sudo certbot certificates"
echo "• Renovar manualmente: sudo certbot renew"
echo "• Testar renovação: sudo certbot renew --dry-run"
echo "• Ver logs SSL: sudo tail -f /var/log/letsencrypt/letsencrypt.log"
echo ""
echo -e "${GREEN}SSL configurado com sucesso! 🔒${NC}"