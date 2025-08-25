# 🚀 Deploy Completo: Domínio + VPS + Funil Spy

## 📂 Estrutura Final no VPS

```
/var/www/seudominio.com/
├── index.html                    # Página principal
├── analytics/                    # Sistema de remarketing
│   ├── server.js                # Servidor Node.js
│   ├── package.json
│   └── public/
├── checkout/                     # Página de checkout
│   ├── index.html
│   └── js/core.js
├── relatorio/                    # Página de relatório
│   ├── index.html
│   └── js/core.js
├── back-redirect/               # Página de oferta
│   └── index.html
├── numero/                      # Captura de número
│   ├── index.html
│   └── js/core.js
├── carregando/                  # Página de loading
│   ├── index.html
│   └── js/core.js
└── js/                         # Scripts globais
    └── core.js
```

## 🔧 Configuração Nginx Completa

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    root /var/www/seudominio.com;
    index index.html;

    # Página principal
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Sistema de analytics (Node.js)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Dashboards do remarketing
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /remarketing {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket para prova social em tempo real
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Páginas do funil
    location /checkout/ {
        try_files $uri $uri/ /checkout/index.html;
    }

    location /relatorio/ {
        try_files $uri $uri/ /relatorio/index.html;
    }

    location /back-redirect/ {
        try_files $uri $uri/ /back-redirect/index.html;
    }

    location /numero/ {
        try_files $uri $uri/ /numero/index.html;
    }

    location /carregando/ {
        try_files $uri $uri/ /carregando/index.html;
    }

    # Arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

## 📜 Script de Deploy Automático

```bash
#!/bin/bash

# 🚀 Deploy Completo Funil Spy
echo "🌐 Iniciando deploy completo do Funil Spy..."

DOMAIN="seudominio.com"
PROJECT_DIR="/var/www/$DOMAIN"

# Criar diretório do projeto
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Upload dos arquivos (você faz isso via SCP/FTP)
echo "📁 Aguardando upload dos arquivos para $PROJECT_DIR"
echo "Execute no seu PC: scp -r C:/Users/Balas/Downloads/funil-spy/* user@$DOMAIN:$PROJECT_DIR/"
read -p "Pressione Enter após o upload dos arquivos..."

# Configurar analytics
cd $PROJECT_DIR/analytics
npm install

# Configurar PM2
pm2 delete remarketing-system 2>/dev/null || true
pm2 start server.js --name "remarketing-system"
pm2 save

# Configurar Nginx
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << 'EOF'
# [Configuração nginx acima]
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar nginx
sudo nginx -t && sudo systemctl reload nginx

# Configurar SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

echo "✅ Deploy concluído!"
echo "🌐 Site disponível em: https://$DOMAIN"
echo "📊 Dashboard: https://$DOMAIN/admin"
echo "🎯 Remarketing: https://$DOMAIN/remarketing"
```

## 📤 Como Fazer Upload dos Arquivos

### Opção 1 - SCP (Recomendado):
```bash
# Do seu PC Windows (use WSL ou Git Bash)
scp -r "C:/Users/Balas/Downloads/funil-spy/*" user@seudominio.com:/var/www/seudominio.com/
```

### Opção 2 - FTP/SFTP:
- Use **FileZilla** ou **WinSCP**
- Conecte via SFTP no IP do VPS
- Upload toda pasta `funil-spy` para `/var/www/seudominio.com/`

### Opção 3 - Git (Se você usar GitHub):
```bash
# No VPS
cd /var/www/seudominio.com
git clone https://github.com/seu-usuario/funil-spy.git .
```

## ⚙️ Configurações Importantes

### 1. **Atualizar URLs no código:**

Você precisa atualizar as URLs nos scripts para usar seu domínio:

```javascript
// Em analytics/public/pixel-tracking.js
const CONFIG = {
    apiUrl: 'https://seudominio.com/api',  // ← Alterar aqui
    // ... resto da config
};
```

### 2. **Configurar .env:**
```env
# analytics/.env
EMAIL_USER=noreply@seudominio.com
EMAIL_FROM=WhatsApp Spy <noreply@seudominio.com>
NODE_ENV=production
PORT=3001
DOMAIN=seudominio.com
```

### 3. **Integrar remarketing nas páginas:**

Todas as páginas do funil já devem ter os scripts:

```html
<!-- Em checkout/index.html, relatorio/index.html, etc. -->
<script src="/analytics/public/tracking.js"></script>
<script src="/analytics/public/pixel-tracking.js"></script>
```

## 🔒 SSL Automático

O Let's Encrypt configurará SSL automaticamente:
- **HTTP:** redireciona para HTTPS
- **Certificado:** renovação automática
- **Segurança:** Headers de segurança configurados

## 💰 Custos Totais

- **Domínio:** R$ 40-60/ano
- **VPS Google Cloud:** R$ 0 (primeiros 12 meses)
- **SSL:** Gratuito (Let's Encrypt)
- **Total Ano 1:** ~R$ 50

## ✅ Checklist Final

- [ ] Domínio comprado e DNS apontado
- [ ] VPS configurado no Google Cloud  
- [ ] Arquivos uploadados para `/var/www/seudominio.com/`
- [ ] Nginx configurado
- [ ] SSL instalado
- [ ] Analytics rodando em Node.js
- [ ] Todas as páginas do funil acessíveis
- [ ] Remarketing funcionando
- [ ] Testes de conversão realizados

## 🎯 URLs Finais

Após o deploy, você terá:

- **Site:** `https://seudominio.com`
- **Checkout:** `https://seudominio.com/checkout/`
- **Relatório:** `https://seudominio.com/relatorio/`
- **Dashboard:** `https://seudominio.com/admin`
- **Remarketing:** `https://seudominio.com/remarketing`

**Resumo:** Sim, você sobe o projeto inteiro! O VPS serve tanto as páginas estáticas (HTML/CSS/JS) quanto o sistema de remarketing (Node.js). É a solução completa em um só lugar! 🚀