# Guia de Deploy na VPS - Sistema de Analytics com Integração Facebook

## Pré-requisitos

- VPS com Ubuntu 20.04+ ou CentOS 7+
- Acesso SSH à VPS
- Domínio configurado (opcional, mas recomendado)
- Node.js 16+ e npm
- Git instalado

## Passo 1: Preparação da VPS

### 1.1 Conectar na VPS
```bash
ssh usuario@seu-ip-da-vps
```

### 1.2 Atualizar o sistema
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.3 Instalar Node.js e npm
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs npm
```

### 1.4 Instalar Git
```bash
# Ubuntu/Debian
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
```

### 1.5 Instalar PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Passo 2: Deploy do Código

### 2.1 Clonar o repositório
```bash
cd /var/www
sudo mkdir funil-spy
sudo chown $USER:$USER funil-spy
cd funil-spy

# Clone seu repositório (substitua pela URL do seu repo)
git clone https://github.com/seu-usuario/funil-spy.git .
```

### 2.2 Configurar o ambiente
```bash
cd analytics
cp .env.example .env
```

### 2.3 Editar as variáveis de ambiente
```bash
nano .env
```

Configure as seguintes variáveis:
```env
# Configurações do servidor
PORT=3000
NODE_ENV=production

# Configurações do Facebook
FACEBOOK_ACCESS_TOKEN=seu_token_aqui
FACEBOOK_PIXEL_ID=seu_pixel_id_aqui
FACEBOOK_APP_ID=seu_app_id_aqui
FACEBOOK_APP_SECRET=seu_app_secret_aqui

# Configurações de segurança
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
API_SECRET_KEY=sua_chave_secreta_muito_forte_aqui

# Configurações do banco de dados
DB_PATH=./analytics.db

# Configurações de monitoramento
ENABLE_MONITORING=true
LOG_LEVEL=info
```

### 2.4 Instalar dependências
```bash
npm install --production
```

## Passo 3: Configuração do Firewall

### 3.1 Configurar UFW (Ubuntu)
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw enable
```

### 3.2 Configurar firewalld (CentOS)
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Passo 4: Configuração do Nginx (Proxy Reverso)

### 4.1 Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### 4.2 Configurar o site
```bash
sudo nano /etc/nginx/sites-available/funil-spy
```

Adicione a configuração:
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # Configurações SSL (configure depois de obter certificado)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    # Configurações de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy para a aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configurações para arquivos estáticos
    location /public {
        alias /var/www/funil-spy/analytics/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.3 Ativar o site
```bash
sudo ln -s /etc/nginx/sites-available/funil-spy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Passo 5: Configuração SSL com Let's Encrypt

### 5.1 Instalar Certbot
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

### 5.2 Obter certificado SSL
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### 5.3 Configurar renovação automática
```bash
sudo crontab -e
```

Adicione a linha:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Passo 6: Iniciar a Aplicação

### 6.1 Testar a aplicação
```bash
cd /var/www/funil-spy/analytics
node server.js
```

### 6.2 Configurar PM2
```bash
# Parar o teste anterior (Ctrl+C)

# Iniciar com PM2
pm2 start server.js --name "funil-spy-analytics"

# Configurar para iniciar automaticamente
pm2 startup
pm2 save
```

### 6.3 Verificar status
```bash
pm2 status
pm2 logs funil-spy-analytics
```

## Passo 7: Configuração de Monitoramento

### 7.1 Configurar logs
```bash
sudo mkdir -p /var/log/funil-spy
sudo chown $USER:$USER /var/log/funil-spy
```

### 7.2 Configurar rotação de logs
```bash
sudo nano /etc/logrotate.d/funil-spy
```

Adicione:
```
/var/log/funil-spy/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload funil-spy-analytics
    endscript
}
```

## Passo 8: Backup e Manutenção

### 8.1 Script de backup
```bash
nano /home/$USER/backup-funil-spy.sh
```

Conteúdo do script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
APP_DIR="/var/www/funil-spy"

mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/funil-spy-code-$DATE.tar.gz -C $APP_DIR .

# Backup do banco de dados
cp $APP_DIR/analytics/analytics.db $BACKUP_DIR/analytics-db-$DATE.db

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "funil-spy-*" -mtime +7 -delete
find $BACKUP_DIR -name "analytics-db-*" -mtime +7 -delete

echo "Backup concluído: $DATE"
```

### 8.2 Tornar executável e agendar
```bash
chmod +x /home/$USER/backup-funil-spy.sh
crontab -e
```

Adicione:
```
0 2 * * * /home/$USER/backup-funil-spy.sh
```

## Passo 9: Verificação Final

### 9.1 Testar endpoints
```bash
# Testar API de tracking
curl -X POST https://seudominio.com/api/track \
  -H "Content-Type: application/json" \
  -d '{"event":"page_view","page":"/test"}'

# Testar integração Facebook
curl -X POST https://seudominio.com/api/utmify-checkout \
  -H "Content-Type: application/json" \
  -d '{"event":"Purchase","transactionId":"test123","value":99.99,"currency":"BRL"}'
```

### 9.2 Verificar logs
```bash
pm2 logs funil-spy-analytics
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Comandos Úteis para Manutenção

```bash
# Reiniciar aplicação
pm2 restart funil-spy-analytics

# Ver logs em tempo real
pm2 logs funil-spy-analytics --lines 100

# Atualizar código
cd /var/www/funil-spy
git pull origin main
cd analytics
npm install --production
pm2 restart funil-spy-analytics

# Verificar status do sistema
pm2 status
sudo systemctl status nginx
sudo systemctl status ufw

# Monitorar recursos
htop
df -h
free -h
```

## Troubleshooting

### Problema: Aplicação não inicia
```bash
# Verificar logs
pm2 logs funil-spy-analytics

# Verificar porta
sudo netstat -tlnp | grep :3000

# Verificar variáveis de ambiente
cat /var/www/funil-spy/analytics/.env
```

### Problema: Nginx não funciona
```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar serviço
sudo systemctl restart nginx
```

### Problema: SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Verificar configuração SSL
openssl s_client -connect seudominio.com:443
```

## Segurança Adicional

### Configurar fail2ban
```bash
sudo apt install fail2ban -y
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configurar atualizações automáticas
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

**Importante**: Substitua `seudominio.com` pelo seu domínio real e configure todas as variáveis de ambiente com seus valores reais antes de fazer o deploy.

**Suporte**: Em caso de problemas, verifique os logs da aplicação e do Nginx para identificar possíveis erros.