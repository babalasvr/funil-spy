# 🚀 Deploy em Produção - Funil Spy

## 📋 Pré-requisitos na VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Python 3
sudo apt install python3 python3-pip -y

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Git
sudo apt install git -y

# Instalar Nginx (opcional)
sudo apt install nginx -y
```

## 🔧 1. Preparação Local

### Limpar repositório e commit final
```bash
# Verificar status
git status

# Adicionar arquivos importantes
git add .
git add -f analytics/routes/
git add -f checkout/checkout-with-lead-tracker.html
git add -f checkout/utmify-checkout-example.html
git add -f checkout/utmify-official-example.html

# Commit final
git commit -m "🚀 Versão final para produção - Sistema completo"

# Push para repositório
git push origin main
```

## 🌐 2. Deploy na VPS

### Primeira instalação
```bash
# Conectar na VPS
ssh root@SEU_IP_VPS

# Criar diretório do projeto
sudo mkdir -p /var/www/funil-spy
cd /var/www/funil-spy

# Clonar repositório
git clone https://github.com/SEU_USUARIO/funil-spy.git .

# Configurar permissões
sudo chown -R $USER:$USER /var/www/funil-spy
chmod -R 755 /var/www/funil-spy
```

### Configuração de ambiente
```bash
# Copiar arquivo de ambiente
cp .env.example .env

# Editar configurações de produção
nano .env
```

### Instalação de dependências
```bash
# Instalar todas as dependências
npm run install-all

# Ou manualmente:
npm install
cd analytics && npm install
cd ../api && npm install
cd ..
```

## 🔄 3. Atualizações Futuras

### ⚠️ IMPORTANTE: Sincronização completa com exclusão de arquivos

```bash
# Na VPS - Método SEGURO para sincronizar tudo
cd /var/www/funil-spy

# 1. Fazer backup (opcional)
cp -r . ../funil-spy-backup-$(date +%Y%m%d-%H%M%S)

# 2. Parar serviços
pm2 stop all

# 3. Fazer fetch de todas as mudanças
git fetch origin main

# 4. RESET HARD - Remove arquivos deletados localmente
git reset --hard origin/main

# 5. Limpar arquivos não rastreados
git clean -fd

# 6. Reinstalar dependências (se package.json mudou)
npm run install-all

# 7. Reiniciar serviços
pm2 restart all
```

### 🔄 Método alternativo (mais seguro)
```bash
# Clone fresh em novo diretório
cd /var/www
git clone https://github.com/SEU_USUARIO/funil-spy.git funil-spy-new

# Copiar configurações
cp funil-spy/.env funil-spy-new/.env

# Instalar dependências
cd funil-spy-new
npm run install-all

# Parar serviços antigos
cd ../funil-spy
pm2 stop all

# Trocar diretórios
cd ..
mv funil-spy funil-spy-old
mv funil-spy-new funil-spy

# Iniciar serviços
cd funil-spy
pm2 start ecosystem.config.js --env production

# Remover versão antiga (após confirmar que tudo funciona)
rm -rf funil-spy-old
```

## 🚀 4. Inicialização dos Serviços

### Usando PM2 (Recomendado)
```bash
# Iniciar todos os serviços
pm2 start ecosystem.config.js --env production

# Verificar status
pm2 status

# Ver logs
pm2 logs

# Salvar configuração PM2
pm2 save
pm2 startup
```

### Scripts disponíveis
```bash
# Instalar tudo
npm run setup-production

# Iniciar com PM2
npm run pm2-start

# Parar serviços
npm run pm2-stop

# Reiniciar serviços
npm run pm2-restart

# Ver logs
npm run pm2-logs

# Health check
npm run health-check
```

## 🔧 5. Configuração Nginx (Opcional)

```nginx
# /etc/nginx/sites-available/funil-spy
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;
    
    # Certificados SSL
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Arquivos estáticos
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API Analytics
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/funil-spy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 6. Monitoramento

```bash
# Verificar serviços
pm2 status

# Logs em tempo real
pm2 logs --lines 100

# Monitoramento de recursos
pm2 monit

# Verificar portas
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :8080
```

## 🔒 7. Segurança

```bash
# Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Fail2ban (opcional)
sudo apt install fail2ban -y
```

## ⚡ 8. Comandos Rápidos

```bash
# Deploy completo (uma linha)
git pull && npm run install-all && pm2 restart all

# Reset completo
git reset --hard origin/main && git clean -fd && npm run install-all && pm2 restart all

# Backup rápido
cp -r /var/www/funil-spy /var/www/backup-$(date +%Y%m%d-%H%M%S)
```

## 🆘 9. Troubleshooting

```bash
# Verificar logs de erro
pm2 logs --err

# Reiniciar serviço específico
pm2 restart funil-spy-analytics

# Verificar uso de memória
pm2 monit

# Limpar logs
pm2 flush

# Verificar processos
ps aux | grep node
ps aux | grep python
```

## ✅ 10. Checklist Final

- [ ] VPS configurada com Node.js, Python, PM2
- [ ] Repositório clonado em `/var/www/funil-spy`
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas (`npm run install-all`)
- [ ] Serviços iniciados (`pm2 start ecosystem.config.js --env production`)
- [ ] Firewall configurado
- [ ] Nginx configurado (se aplicável)
- [ ] SSL configurado (se aplicável)
- [ ] Monitoramento ativo (`pm2 monit`)
- [ ] Backup configurado

---

**🎉 Projeto pronto para produção!**

**URLs de acesso:**
- Site principal: `http://SEU_IP:8080`
- Analytics: `http://SEU_IP:3001`
- Com Nginx: `https://seudominio.com`