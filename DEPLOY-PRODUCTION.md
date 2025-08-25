# 🚀 Guia de Deploy para Produção - Sistema de Pagamento Real

## 📋 Pré-requisitos

1. **VPS/Servidor** com Node.js instalado
2. **Chaves da ExpfyPay** (pública e secreta)
3. **Domínio configurado** (ex: whatspy.pro)
4. **Certificado SSL** (via Certbot)

## 🔧 Passo 1: Configuração do Ambiente

### 1.1 Clone o repositório na VPS
```bash
cd /var/www
sudo git clone https://github.com/babalasvr/funil-spy.git
sudo chown -R $USER:$USER funil-spy
cd funil-spy
```

### 1.2 Configure as variáveis de ambiente
```bash
cd analytics
cp .env.example .env
nano .env
```

**Adicione suas credenciais reais:**
```env
# Payment API Configuration
PAYMENT_API_PORT=3002
EXPFY_PUBLIC_KEY=sua_chave_publica_real_expfypay
EXPFY_SECRET_KEY=sua_chave_secreta_real_expfypay
EXPFY_API_URL=https://api.expfypay.com/v1

# Pixel Tracking
PIXEL_ID=66ac66dd43136b1d66bddb65
UTM_TRACKING=true

# Email Configuration
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-gmail
EMAIL_FROM=noreply@whatspy.pro
```

## 🔧 Passo 2: Instalação dos Serviços

### 2.1 Instalar dependências
```bash
# Analytics Service
cd analytics
npm install

# Payment API
cd ../api
npm install
```

### 2.2 Configurar PM2
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Tornar o script executável
chmod +x ../start-services.sh

# Executar os serviços
../start-services.sh
```

## 🔧 Passo 3: Configuração do Nginx

### 3.1 Criar configuração do Nginx
```bash
sudo nano /etc/nginx/sites-available/whatspy.pro
```

**Adicione a configuração:**
```nginx
server {
    listen 80;
    server_name whatspy.pro www.whatspy.pro;
    root /var/www/funil-spy;
    index index.html;

    # Main funnel pages
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Analytics API
    location /api/analytics/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Payment API
    location /api/payment/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin dashboard
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.2 Ativar o site
```bash
sudo ln -s /etc/nginx/sites-available/whatspy.pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 Passo 4: Configuração do Firewall

### 4.1 Configurar UFW
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw allow 3002
sudo ufw --force enable
```

### 4.2 Google Cloud Firewall (se usando GCP)
```bash
# Via CLI
gcloud compute firewall-rules create allow-funil-services \
    --allow tcp:80,tcp:443,tcp:3001,tcp:3002 \
    --source-ranges 0.0.0.0/0 \
    --target-tags funil-server

# Ou via Console: VPC Network → Firewall
```

## 🔧 Passo 5: SSL com Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d whatspy.pro -d www.whatspy.pro

# Testar renovação automática
sudo certbot renew --dry-run
```

## 🔧 Passo 6: Verificação dos Serviços

### 6.1 Verificar status dos serviços
```bash
# Status do PM2
pm2 status

# Logs dos serviços
pm2 logs

# Status do Nginx
sudo systemctl status nginx

# Teste da API de pagamento
curl -I http://localhost:3002/health

# Teste do site
curl -I https://whatspy.pro
```

### 6.2 Teste de pagamento
1. Acesse: `https://whatspy.pro`
2. Complete o funil até o checkout
3. Preencha os dados e clique em "Gerar QR Code"
4. Verifique se o QR Code é real (não demo)

## 🔧 Passo 7: Monitoramento

### 7.1 Configurar monitoramento básico
```bash
# Instalar htop para monitoramento
sudo apt install htop

# Configurar PM2 para boot
pm2 startup
pm2 save
```

### 7.2 Logs importantes
```bash
# Logs dos serviços
pm2 logs payment-api
pm2 logs analytics-service

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ⚠️ Configurações Importantes para Produção

### 1. Atualizar URL da API de Pagamento
No arquivo `checkout/index.html`, certifique-se de que:
```javascript
const PRODUCTION_MODE = true;
const PAYMENT_API_URL = 'https://whatspy.pro/api/payment';
```

### 2. Configurar Webhook da ExpfyPay
Na ExpfyPay, configure o webhook para:
```
https://whatspy.pro/api/payment/webhook
```

### 3. Configurar HTTPS redirect
O Nginx com Certbot irá configurar automaticamente o redirect HTTP → HTTPS.

## 🔄 Script de Atualização

### 8.1 Criar script de deploy
```bash
nano deploy-production.sh
```

```bash
#!/bin/bash
echo "🚀 Deploying to production..."

cd /var/www/funil-spy

# Pull latest changes
git pull origin main

# Update dependencies if needed
cd analytics && npm install
cd ../api && npm install

# Restart services
pm2 restart all

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Production deployment completed!"
echo "🌐 Site: https://whatspy.pro"
echo "📊 Admin: https://whatspy.pro/admin"
```

```bash
chmod +x deploy-production.sh
```

## 🎯 Checklist Final

- [ ] ✅ Chaves da ExpfyPay configuradas
- [ ] ✅ Serviços rodando (PM2 status)
- [ ] ✅ Nginx configurado e SSL ativo
- [ ] ✅ Firewall configurado
- [ ] ✅ Teste de pagamento real funcionando
- [ ] ✅ Webhook da ExpfyPay configurado
- [ ] ✅ Monitoramento ativo

## 🆘 Troubleshooting

### Problema: QR Code ainda mostra "DEMO"
**Solução:** Verifique se `PRODUCTION_MODE = true` no checkout/index.html

### Problema: Erro 502 na API de pagamento
**Solução:** 
```bash
pm2 restart payment-api
pm2 logs payment-api
```

### Problema: Erro de conexão com ExpfyPay
**Solução:** Verifique as chaves no .env e teste manualmente:
```bash
curl -X POST https://api.expfypay.com/v1/payments \
  -H "X-Public-Key: sua_chave_publica" \
  -H "X-Secret-Key: sua_chave_secreta" \
  -H "Content-Type: application/json"
```

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do PM2: `pm2 logs`
2. Logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Status dos serviços: `pm2 status`
4. Conectividade com ExpfyPay API