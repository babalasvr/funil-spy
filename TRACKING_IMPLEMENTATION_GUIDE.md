# 🚀 Guia de Implementação - Sistema de Tracking Avançado

## UTMify + Facebook Pixel + Conversions API Integration

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Configuração Inicial](#-configuração-inicial)
3. [Implementação Frontend](#-implementação-no-frontend)
4. [Configuração de Formulários](#-configuração-de-formulários)
5. [Segurança e Performance](#-segurança-e-performance)
6. [Testes](#-como-testar-o-sistema)
7. [Monitoramento](#-monitoramento-e-logs)
8. [Deploy em Produção](#-deploy-em-produção)
9. [Troubleshooting](#-troubleshooting)
10. [Scripts de Automação](#-scripts-de-automação)

### 📋 Visão Geral

Este sistema combina:
- **UTMify**: Captura e gerenciamento de parâmetros UTM
- **Facebook Pixel**: Tracking client-side
- **Conversions API**: Tracking server-side para máxima confiabilidade
- **Deduplicação automática**: Evita eventos duplicados
- **Tracking offline**: Fila de eventos para conexões instáveis
- **Segurança avançada**: Rate limiting, validação e sanitização
- **Monitoramento em tempo real**: Logs estruturados e métricas

---

## 🛡️ Segurança e Performance

O sistema inclui configurações avançadas de segurança e otimizações de performance para produção:

### 🔒 Recursos de Segurança

- **Rate Limiting**: Proteção contra ataques DDoS e spam
- **Helmet.js**: Headers de segurança (CSP, HSTS, XSS Protection)
- **Input Sanitization**: Validação e limpeza de dados de entrada
- **CORS Configurável**: Controle de origens permitidas
- **API Key Validation**: Autenticação para endpoints sensíveis
- **Security Logging**: Logs estruturados de eventos de segurança

### ⚡ Otimizações de Performance

- **Compression**: Compressão gzip/deflate automática
- **Connection Pooling**: Reutilização de conexões de banco
- **Cache Inteligente**: Cache de sessões e eventos
- **Memory Management**: Limpeza automática de cache
- **Cluster Mode**: Suporte a múltiplos processos (PM2)

### 📊 Monitoramento em Tempo Real

- **Métricas Detalhadas**: Requests, performance, Facebook events
- **Health Checks**: Status da aplicação e dependências
- **Alertas Automáticos**: Email e webhook para problemas críticos
- **Relatórios Diários**: Resumos automáticos de performance
- **Dashboard de Métricas**: `/api/monitoring/metrics`

---

### 🔧 Configuração Inicial

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp analytics/.env.example analytics/.env
```

**Editar `analytics/.env` com seus dados:**

```env
# OBRIGATÓRIO - Facebook Pixel ID
FACEBOOK_PIXEL_ID=123456789012345

# OBRIGATÓRIO - Access Token do Facebook
FACEBOOK_ACCESS_TOKEN=EAAxxxxxxxxxxxxx

# OPCIONAL - Para testes
FACEBOOK_TEST_EVENT_CODE=TEST12345

# Configurações do servidor
PORT=3001
NODE_ENV=production
```

### 2. Instalar Dependências

```bash
cd analytics
npm install
```

### 3. Iniciar Servidor

```bash
npm start
```

**Saída esperada:**
```
🚀 Analytics service running on http://localhost:3001
📈 API Tracking: http://localhost:3001/api/tracking
✅ Facebook Pixel + Conversions API configurado corretamente
```

---

## 📱 Implementação no Frontend

### 1. Incluir Script de Tracking

**Adicionar no `<head>` de todas as páginas:**

```html
<!-- Advanced Tracking System -->
<script src="/js/advanced-tracking.js"></script>
```

### 2. Tracking Automático

O sistema já captura automaticamente:
- ✅ **PageViews** com UTMs
- ✅ **Formulários de Lead** (com `data-track="lead"`)
- ✅ **Formulários de Checkout** (com `data-track="checkout"`)

### 3. Tracking Manual

#### Captura de Lead
```javascript
// Exemplo: Após captura de lead
FunilSpyTracking.trackLead({
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    document: '12345678901',
    city: 'São Paulo',
    state: 'SP'
});
```

#### Início do Checkout
```javascript
// Exemplo: Ao iniciar checkout
FunilSpyTracking.trackCheckoutStart({
    productId: 'produto-principal',
    productName: 'Curso Completo',
    price: 197.00,
    category: 'digital'
});
```

#### Compra Finalizada
```javascript
// Exemplo: Após pagamento aprovado
FunilSpyTracking.trackPurchase({
    transactionId: 'TXN_123456789',
    amount: 197.00,
    paymentMethod: 'PIX',
    orderBump: false,
    specialOffer: false
});
```

#### Visualização de Upsell/Downsell
```javascript
// Exemplo: Ao mostrar upsell
FunilSpyTracking.trackOfferView({
    type: 'upsell', // ou 'downsell'
    productId: 'upsell-1',
    productName: 'Mentoria VIP',
    price: 497.00,
    originalPrice: 997.00
});
```

---

## 🎯 Configuração de Formulários

### Formulário de Lead (Auto-tracking)

```html
<form data-track="lead" class="lead-form">
    <input type="text" name="name" placeholder="Seu nome" required>
    <input type="email" name="email" placeholder="Seu email" required>
    <input type="tel" name="phone" placeholder="Seu WhatsApp" required>
    <button type="submit">Quero Receber!</button>
</form>
```

### Formulário de Checkout (Auto-tracking)

```html
<form data-track="checkout" 
      data-product-id="curso-principal"
      data-product-name="Curso Completo"
      data-price="197.00"
      data-category="digital">
    
    <input type="text" name="name" placeholder="Nome completo" required>
    <input type="email" name="email" placeholder="Email" required>
    <input type="tel" name="phone" placeholder="WhatsApp" required>
    <button type="submit">Finalizar Compra</button>
</form>
```

---

## 🧪 Como Testar o Sistema

### 1. Teste de Configuração

```bash
# Testar se o sistema está funcionando
curl -X POST http://localhost:3001/api/tracking/test
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Teste de integração concluído",
  "data": {
    "facebook": {
      "success": true,
      "pixelConfigured": true,
      "conversionsApiConfigured": true
    },
    "bridge": {
      "success": true,
      "tests": {
        "pageView": true,
        "lead": true,
        "purchase": true
      }
    }
  }
}
```

### 2. Teste no Facebook Events Manager

1. **Acesse:** [Facebook Events Manager](https://business.facebook.com/events_manager)
2. **Selecione seu Pixel**
3. **Vá em "Test Events"**
4. **Navegue pelo seu site**
5. **Verifique se os eventos aparecem em tempo real**

### 3. Teste com Meta Pixel Helper

1. **Instale:** [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. **Navegue pelo seu site**
3. **Verifique se o ícone fica verde**
4. **Clique para ver detalhes dos eventos**

### 4. Teste de Eventos Específicos

#### PageView
```bash
curl -X POST http://localhost:3001/api/tracking/pageview \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "utmParams": {
      "utm_source": "facebook",
      "utm_medium": "cpc",
      "utm_campaign": "teste"
    },
    "pageData": {
      "url": "https://seusite.com/teste",
      "title": "Página de Teste"
    }
  }'
```

#### Lead
```bash
curl -X POST http://localhost:3001/api/tracking/lead \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "leadData": {
      "name": "Teste User",
      "email": "teste@email.com",
      "phone": "11999999999"
    }
  }'
```

#### Purchase
```bash
curl -X POST http://localhost:3001/api/tracking/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "purchaseData": {
      "transactionId": "TEST_TXN_123",
      "amount": 197.00,
      "paymentMethod": "PIX"
    }
  }'
```

---

## 📊 Monitoramento e Logs

### 1. Logs do Servidor

```bash
# Acompanhar logs em tempo real
tail -f analytics/logs/analytics.log
```

### 2. Health Check

```bash
curl http://localhost:3001/api/tracking/health
```

### 3. Relatório de Sessão

```bash
curl http://localhost:3001/api/tracking/session/SESSION_ID
```

---

## 🤖 Scripts de Automação

O sistema inclui scripts automatizados para facilitar a instalação, deploy e testes:

### 📦 Instalação Automática

```bash
# Instalação completa do sistema
node install-tracking.js
```

**O que faz:**
- Verifica pré-requisitos (Node.js, npm)
- Coleta configurações do Facebook
- Instala dependências
- Cria arquivo .env
- Testa conexões

### 🚀 Deploy para Produção

```bash
# Deploy automatizado com PM2
node analytics/production-deploy.js
```

**Funcionalidades:**
- Configuração automática do PM2
- Modo cluster para alta performance
- Logs estruturados
- Health checks automáticos
- Configuração de startup

### 🧪 Testes Automatizados

```bash
# Teste completo do sistema
node analytics/test-tracking.js
```

**Testa:**
- Health checks
- Todos os endpoints de tracking
- Integração com Facebook
- Monitoramento e métricas
- Geração de relatórios

### 📊 Comandos PM2 Úteis

```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs funil-spy-analytics

# Reiniciar aplicação
pm2 restart funil-spy-analytics

# Monitor interativo
pm2 monit

# Parar aplicação
pm2 stop funil-spy-analytics
```

---

## 🚨 Troubleshooting

### Problema: Eventos não aparecem no Facebook

**Verificações:**
1. ✅ `FACEBOOK_PIXEL_ID` está correto?
2. ✅ `FACEBOOK_ACCESS_TOKEN` está válido?
3. ✅ Pixel está ativo no Facebook?
4. ✅ Domínio está verificado no Facebook?

### Problema: Erro de CORS

**Solução:** Adicionar domínio nas configurações CORS:

```javascript
// Em analytics/server.js
app.use(cors({
    origin: ['https://seudominio.com', 'http://localhost:3000'],
    credentials: true
}));
```

### Problema: Rate Limit

**Solução:** Ajustar limites em `analytics/routes/tracking-routes.js`:

```javascript
const trackingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 200, // Aumentar limite
    // ...
});
```

---

## 🚀 Deploy em Produção

### 1. Configurações de Segurança

```env
# .env para produção
NODE_ENV=production
PORT=3001

# SSL (recomendado)
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# CORS restritivo
CORS_ORIGIN=https://seudominio.com
```

### 2. PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
cd analytics
pm2 start npm --name "funil-spy-analytics" -- start

# Configurar auto-restart
pm2 startup
pm2 save
```

### 3. Nginx (Proxy Reverso)

```nginx
server {
    listen 80;
    server_name analytics.seudominio.com;
    
    location / {
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
}
```

---

## 📈 Métricas e KPIs

O sistema rastreia automaticamente:

- **📄 Page Views** com origem UTM
- **👤 Leads** capturados por fonte
- **🛒 Checkout** iniciados
- **💰 Purchases** finalizadas
- **🎯 Upsells/Downsells** visualizados
- **📊 ROI** por campanha UTM
- **🔄 Funil de conversão** completo

---

## 🆘 Suporte

Para dúvidas ou problemas:

1. **Verificar logs:** `tail -f analytics/logs/analytics.log`
2. **Testar configuração:** `curl -X POST http://localhost:3001/api/tracking/test`
3. **Verificar Facebook Events Manager**
4. **Usar Meta Pixel Helper**

---

## ✅ Checklist de Implementação

- [ ] Configurar variáveis de ambiente (`.env`)
- [ ] Instalar dependências (`npm install`)
- [ ] Iniciar servidor (`npm start`)
- [ ] Incluir script nas páginas (`advanced-tracking.js`)
- [ ] Configurar formulários com `data-track`
- [ ] Testar eventos no Facebook Events Manager
- [ ] Verificar com Meta Pixel Helper
- [ ] Configurar monitoramento de logs
- [ ] Deploy em produção com PM2/Nginx
- [ ] Configurar backup e monitoramento

**🎉 Sistema pronto para produção!**