# Guia de Deploy via Git - Sistema de Rastreamento Avançado

## 📋 Pré-requisitos

### 1. Servidor/VPS
- Ubuntu 20.04+ ou CentOS 7+
- Mínimo 1GB RAM, 1 CPU
- Acesso SSH (root ou sudo)
- Domínio configurado (opcional)

### 2. Ferramentas Necessárias
- Git
- Node.js 16+
- npm
- PM2 (para produção)
- Nginx (para proxy reverso)

---

## 🚀 Passo a Passo Completo

### **Etapa 1: Preparar o Repositório Git**

#### 1.1 Criar repositório no GitHub/GitLab
```bash
# No seu computador local
cd funil-spy
git init
git add .
git commit -m "Sistema de rastreamento avançado - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/funil-spy.git
git push -u origin main
```

#### 1.2 Configurar .gitignore (se não existir)
```bash
echo "node_modules/
.env
*.log
analytics.db
.DS_Store" > .gitignore
```

---

### **Etapa 2: Configurar o Servidor**

#### 2.1 Conectar ao servidor
```bash
ssh root@SEU_SERVIDOR_IP
# ou
ssh usuario@SEU_SERVIDOR_IP
```

#### 2.2 Instalar Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### 2.3 Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

#### 2.4 Instalar Git (se não estiver instalado)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install git

# CentOS/RHEL
sudo yum install git
```

---

### **Etapa 3: Fazer Deploy da Aplicação**

#### 3.1 Clonar o repositório
```bash
cd /var/www
sudo git clone https://github.com/SEU_USUARIO/funil-spy.git
sudo chown -R $USER:$USER funil-spy
cd funil-spy
```

#### 3.2 Instalar dependências
```bash
# Dependências do projeto principal
npm install

# Dependências do analytics
cd analytics
npm install
cd ..
```

#### 3.3 Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
cp analytics/.env.example analytics/.env

# Editar configurações
nano analytics/.env
```

**Configure as seguintes variáveis:**
```env
# Facebook Pixel
FACEBOOK_PIXEL_ID=seu_pixel_id
FACEBOOK_ACCESS_TOKEN=seu_access_token
FACEBOOK_AD_ACCOUNT_ID=act_seu_ad_account_id

# Configurações do servidor
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./analytics.db

# UTM Tracking
UTM_TRACKING=true
PIXEL_ID=seu_pixel_id

# Monitoramento
MONITORING_ENABLED=true
ALERT_EMAIL=seu@email.com
```

---

### **Etapa 4: Testar a Aplicação**

#### 4.1 Teste local
```bash
cd analytics
node test-tracking.js
```

#### 4.2 Iniciar servidor temporariamente
```bash
node server.js
```

#### 4.3 Testar endpoints (em outro terminal)
```bash
# Teste de saúde
curl http://localhost:3000/health

# Teste de tracking
curl -X POST http://localhost:3000/api/tracking/pageview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seusite.com", "title": "Teste"}'
```

---

### **Etapa 5: Configurar PM2 para Produção**

#### 5.1 Parar servidor de teste
```bash
# Ctrl+C para parar o servidor
```

#### 5.2 Usar script de deploy automático
```bash
cd analytics
node production-deploy.js
```

**OU configurar manualmente:**

#### 5.3 Configuração manual do PM2
```bash
# Criar arquivo ecosystem
nano ecosystem.config.js
```

```javascript
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
    min_uptime: '10s'
  }]
};
```

#### 5.4 Iniciar com PM2
```bash
# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar inicialização automática
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

---

### **Etapa 6: Configurar Nginx (Proxy Reverso)**

#### 6.1 Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 6.2 Configurar site
```bash
sudo nano /etc/nginx/sites-available/funil-spy
```

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    
    # Servir arquivos estáticos
    location / {
        root /var/www/funil-spy;
        try_files $uri $uri/ =404;
        index index.html;
    }
    
    # Proxy para API analytics
    location /api/ {
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
    
    # Logs
    access_log /var/log/nginx/funil-spy.access.log;
    error_log /var/log/nginx/funil-spy.error.log;
}
```

#### 6.3 Ativar site
```bash
sudo ln -s /etc/nginx/sites-available/funil-spy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### **Etapa 7: Configurar SSL (Opcional mas Recomendado)**

#### 7.1 Instalar Certbot
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### 7.2 Obter certificado SSL
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

---

### **Etapa 8: Configurar Firewall**

```bash
# Ubuntu (UFW)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔧 Comandos Úteis de Manutenção

### PM2
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs funil-spy-analytics

# Reiniciar
pm2 restart funil-spy-analytics

# Parar
pm2 stop funil-spy-analytics

# Monitoramento
pm2 monit
```

### Git (Atualizações)
```bash
# Fazer backup
pm2 stop funil-spy-analytics
cp -r /var/www/funil-spy /var/www/funil-spy-backup-$(date +%Y%m%d)

# Atualizar código
cd /var/www/funil-spy
git pull origin main
cd analytics
npm install

# Reiniciar
pm2 restart funil-spy-analytics
```

### Nginx
```bash
# Testar configuração
sudo nginx -t

# Recarregar
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/funil-spy.access.log
```

---

## 📊 Verificação Final

### 1. Testar URLs
- `http://seudominio.com` - Site principal
- `http://seudominio.com/api/health` - Health check
- `http://seudominio.com/api/tracking/test` - Teste de tracking

### 2. Monitoramento
- Logs PM2: `pm2 logs`
- Logs Nginx: `sudo tail -f /var/log/nginx/funil-spy.access.log`
- Métricas: `http://seudominio.com/api/metrics`

### 3. Facebook Events Manager
- Verificar se eventos estão chegando
- Testar Event Test Tool

---

## 🆘 Solução de Problemas

### Aplicação não inicia
```bash
# Verificar logs
pm2 logs funil-spy-analytics

# Verificar porta
sudo netstat -tlnp | grep :3000

# Verificar variáveis de ambiente
cat analytics/.env
```

### Erro: "Port already in use"

#### No Windows:
```powershell
# Execute o script de resolução automática
.\fix-port-conflict.ps1

# Ou manualmente:
# Encontrar processo usando a porta
Get-NetTCPConnection -LocalPort 3001

# Parar processo específico
Stop-Process -Id <PID> -Force
```

#### No Linux/VPS:
```bash
# Execute o script de resolução automática
./fix-port-conflict.sh

# Ou manualmente:
# Encontrar processo usando a porta
sudo lsof -i :3001
# ou
sudo netstat -tulpn | grep :3001

# Parar processo específico
sudo kill -9 <PID>

# Ou usar uma porta diferente
export PORT=3002
```

### Nginx não funciona
```bash
# Verificar configuração
sudo nginx -t

# Verificar status
sudo systemctl status nginx

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

### Eventos não chegam no Facebook
```bash
# Testar API
cd analytics
node test-tracking.js

# Verificar logs de integração
pm2 logs funil-spy-analytics | grep facebook
```

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `pm2 logs`
2. Teste a API: `curl http://localhost:3000/health`
3. Verifique as configurações: `cat analytics/.env`
4. Consulte o Event Test Tool do Facebook

**Sistema pronto para produção! 🚀**