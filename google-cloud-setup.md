# 🌐 Google Cloud Setup - Sistema de Remarketing

## 📋 Pré-requisitos
- Conta Google
- Cartão de crédito (para verificação - não será cobrado)
- Código do projeto funil-spy

## 🎯 Passo 1: Criar Conta Google Cloud

1. Acesse: https://cloud.google.com/
2. Clique em "Começar gratuitamente"
3. Faça login com sua conta Google
4. Aceite os termos e configure billing
5. **Ganhe $300 USD em créditos grátis!**

## 🖥️ Passo 2: Criar VM Gratuita

### No Console Google Cloud:

1. **Ativar Compute Engine API:**
   ```
   APIs & Services > Library > Compute Engine API > Enable
   ```

2. **Criar VM e2-micro (SEMPRE GRATUITA):**
   ```
   Compute Engine > VM Instances > Create Instance
   
   Configurações:
   - Name: remarketing-vm
   - Region: us-central1 (Iowa)
   - Zone: us-central1-a
   - Machine type: e2-micro (1 vCPU, 1GB RAM)
   - Boot disk: Ubuntu 20.04 LTS (30GB)
   - Firewall: Allow HTTP + HTTPS traffic
   ```

3. **Configurar Firewall para porta 3001:**
   ```
   VPC Network > Firewall > Create Firewall Rule
   
   - Name: allow-remarketing
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances in network
   - Source IP ranges: 0.0.0.0/0
   - Protocols: TCP - Port 3001
   ```

## ⚙️ Passo 3: Configurar o Servidor

### Conectar via SSH:
```bash
# No console Google Cloud, clique em SSH na sua VM
```

### Instalar Node.js e dependências:
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar outras dependências
sudo apt-get install -y git nginx sqlite3

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

## 📁 Passo 4: Upload do Código

### Opção A - Via Git (Recomendado):
```bash
# Se você tem o código no GitHub
git clone https://github.com/seu-usuario/funil-spy.git
cd funil-spy/analytics
```

### Opção B - Upload Manual:
```bash
# Criar diretório
mkdir -p /home/funil-spy/analytics
cd /home/funil-spy

# Use o comando 'gcloud compute scp' do seu PC:
# gcloud compute scp --recurse C:\Users\Balas\Downloads\funil-spy remarketing-vm:~/funil-spy --zone=us-central1-a
```

## 🔧 Passo 5: Configurar Aplicação

```bash
cd funil-spy/analytics

# Instalar dependências
npm install

# Criar arquivo de configuração
nano .env
```

### Conteúdo do .env:
```env
# Email Configuration (use Gmail para testes)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-gmail
EMAIL_FROM=noreply@seudominio.com

# Google Cloud específico
NODE_ENV=production
PORT=3001
DB_PATH=./analytics.db

# Facebook/Google (opcional para testes)
FACEBOOK_PIXEL_ID=demo_pixel
GOOGLE_CONVERSION_ID=AW-demo-conversion
```

## 🚀 Passo 6: Iniciar o Sistema

```bash
# Testar se funciona
node server.js

# Se tudo OK, parar (Ctrl+C) e iniciar com PM2
pm2 start server.js --name "remarketing-system"

# Configurar para iniciar automaticamente
pm2 startup
pm2 save

# Verificar status
pm2 status
```

## 🌐 Passo 7: Configurar Nginx (Proxy)

```bash
# Criar configuração do Nginx
sudo nano /etc/nginx/sites-available/remarketing
```

### Configuração do Nginx:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /home/funil-spy;
        try_files $uri $uri/ @nodejs;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location @nodejs {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Ativar configuração
sudo ln -s /etc/nginx/sites-available/remarketing /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Testar e reiniciar nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 📊 Passo 8: Testar o Sistema

### Verificar se está funcionando:
```bash
# Verificar PM2
pm2 logs remarketing-system

# Verificar portas
sudo netstat -tulpn | grep :3001

# Testar API
curl http://localhost:3001/health
```

### Acessar via navegador:
```
http://SEU-IP-EXTERNO-VM/admin
http://SEU-IP-EXTERNO-VM/remarketing
http://SEU-IP-EXTERNO-VM/demo
```

## 🎯 URLs Importantes

Após configurar, você terá:

- **Dashboard Principal:** `http://SEU-IP/admin`
- **Dashboard Remarketing:** `http://SEU-IP/remarketing`
- **Página Demo:** `http://SEU-IP/demo`
- **API Endpoint:** `http://SEU-IP/api/`

## 💰 Custos Estimados

- **Primeiros 12 meses:** R$ 0 (créditos grátis)
- **e2-micro sempre gratuita:** R$ 0/mês (dentro dos limites)
- **Tráfego de rede:** ~R$ 5-10/mês (com uso moderado)

## 🔧 Comandos Úteis

```bash
# Ver logs do sistema
pm2 logs remarketing-system

# Reiniciar aplicação
pm2 restart remarketing-system

# Ver status da VM
htop

# Ver IP externo da VM
curl ifconfig.me

# Monitorar banco de dados
sqlite3 analytics.db ".tables"
```

## 🚨 Troubleshooting

### Se algo não funcionar:

1. **Verificar logs:** `pm2 logs`
2. **Verificar firewall:** `sudo ufw status`
3. **Verificar nginx:** `sudo nginx -t`
4. **Verificar porta 3001:** `curl localhost:3001/health`

### Comandos de diagnóstico:
```bash
# Verificar se Node.js está instalado
node --version

# Verificar se PM2 está rodando
pm2 status

# Verificar se Nginx está ativo
sudo systemctl status nginx
```