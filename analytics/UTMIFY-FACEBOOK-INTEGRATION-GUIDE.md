# 🚀 Guia de Integração UTMify + Facebook Conversions API

Este guia explica como implementar a integração completa entre UTMify e Facebook Conversions API para tracking de eventos de Purchase no checkout.

## 📋 Visão Geral

A integração permite:
- ✅ Capturar dados do checkout automaticamente
- ✅ Coletar parâmetros UTM via UTMify
- ✅ Enviar eventos Purchase para Facebook CAPI
- ✅ Validação robusta de dados
- ✅ Logs detalhados para debugging
- ✅ Tratamento de erros completo

## 🛠️ Arquivos Criados

### 1. Serviço Principal
```
analytics/services/utmify-checkout-integration.js
```
Classe principal que gerencia toda a integração.

### 2. API Routes
```
analytics/routes/utmify-checkout-api.js
```
Endpoints REST para processar checkout via API.

### 3. Exemplo HTML
```
checkout/utmify-facebook-checkout-example.html
```
Página de checkout completa com integração frontend.

### 4. Testes
```
analytics/test-utmify-checkout.js
```
Testes automatizados da integração.

## 🔧 Configuração

### 1. Variáveis de Ambiente

Certifique-se de que seu `.env` contém:

```env
# Facebook Configuration
FACEBOOK_PIXEL_ID=seu_pixel_id
FACEBOOK_ACCESS_TOKEN=seu_system_user_token

# Server Configuration
PORT=3001
CORS_ORIGIN=*
```

### 2. Dependências

As seguintes dependências são necessárias:

```json
{
  "axios": "^1.0.0",
  "crypto": "built-in",
  "express": "^4.18.0"
}
```

## 📡 Endpoints da API

### POST /api/utmify-checkout

Processa checkout e envia para Facebook CAPI.

**Request Body:**
```json
{
  "checkout": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999",
    "total": "297.00"
  },
  "utm": {
    "source": "facebook",
    "medium": "paid-social",
    "campaign": "lancamento-produto",
    "content": "video-vendas",
    "term": "marketing-digital"
  },
  "clientData": {
    "fbp": "fb.1.1703123456789.1234567890",
    "fbc": "fb.1.1703123456789.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
    "fbclid": "IwAR1234567890"
  },
  "options": {
    "currency": "BRL",
    "contentName": "Produto Digital",
    "contentCategory": "Curso"
  }
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "eventId": "87e266ef4caeb16c8303b28be3e841af",
  "response": {
    "events_received": 1,
    "fbtrace_id": "AkMvlb3LjpU7viGmYsJbeSa"
  },
  "userData": {
    "email_sent": true,
    "phone_sent": true,
    "name_sent": true
  },
  "utmParams": {
    "utm_source": "facebook",
    "utm_medium": "paid-social",
    "utm_campaign": "lancamento-produto",
    "utm_content": "video-vendas",
    "utm_term": "marketing-digital"
  },
  "fbc_sent": true,
  "timestamp": "2024-01-28T15:30:45.123Z"
}
```

### GET /api/utmify-checkout/test

Testa a integração sem enviar dados reais.

### GET /api/utmify-checkout/status

Verifica status da configuração Facebook.

## 💻 Implementação Frontend

### 1. HTML Básico

```html
<!DOCTYPE html>
<html>
<head>
    <title>Checkout</title>
    <!-- Facebook Pixel -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', 'SEU_PIXEL_ID');
    fbq('track', 'PageView');
    </script>
</head>
<body>
    <form id="checkout-form">
        <input type="text" id="name" placeholder="Nome" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="tel" id="phone" placeholder="Telefone" required>
        <select id="product" required>
            <option value="curso-basico" data-price="197.00">Curso Básico - R$ 197</option>
            <option value="curso-avancado" data-price="297.00">Curso Avançado - R$ 297</option>
        </select>
        <button type="submit">Finalizar Compra</button>
    </form>

    <script src="checkout-integration.js"></script>
</body>
</html>
```

### 2. JavaScript de Integração

```javascript
// Capturar cookies do Facebook
function getFacebookCookies() {
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }
    
    return {
        fbp: getCookie('_fbp'), // Facebook Browser ID
        fbc: getCookie('_fbc')  // Facebook Click ID
    };
}

// Obter fbclid da URL
function getFbclid() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fbclid');
}

// Capturar parâmetros UTM
function getUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        source: urlParams.get('utm_source') || 'direct',
        medium: urlParams.get('utm_medium') || 'none',
        campaign: urlParams.get('utm_campaign') || 'organic',
        content: urlParams.get('utm_content') || '',
        term: urlParams.get('utm_term') || ''
    };
}

// Enviar para API
async function processCheckout(checkoutData, utmData, options) {
    try {
        const response = await fetch('/api/utmify-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                checkout: checkoutData,
                utm: utmData,
                clientData: options.clientData,
                options: {
                    currency: options.currency,
                    contentName: options.contentName,
                    contentCategory: options.contentCategory
                }
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Erro:', error);
        return { success: false, error: error.message };
    }
}

// Processar formulário
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productSelect = document.getElementById('product');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    
    // Capturar dados do Facebook
    const facebookCookies = getFacebookCookies();
    const fbclid = getFbclid();
    
    const checkoutData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        total: selectedOption.getAttribute('data-price')
    };
    
    const utmData = getUTMParameters();
    
    // Incluir dados do Facebook
    const clientData = {
        fbp: facebookCookies.fbp,
        fbc: facebookCookies.fbc,
        fbclid: fbclid
    };
    
    const options = {
        currency: 'BRL',
        contentName: selectedOption.text.split(' - ')[0],
        contentCategory: 'Curso Online'
    };
    
    const result = await processCheckout(checkoutData, utmData, { ...options, clientData });
    
    if (result.success) {
        alert('Compra realizada com sucesso!');
        // Redirecionar para página de obrigado
        window.location.href = '/obrigado.html';
    } else {
        alert('Erro ao processar compra: ' + result.error);
    }
});
```

## 🧪 Testando a Integração

### 1. Teste Automatizado

```bash
cd analytics
node test-utmify-checkout.js
```

### 2. Teste via API

```bash
# Testar endpoint
curl -X POST http://localhost:3001/api/utmify-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkout": {
      "name": "Teste Usuario",
      "email": "teste@email.com",
      "phone": "+5511999999999",
      "total": "197.00"
    },
    "utm": {
      "source": "test",
      "medium": "api",
      "campaign": "test-campaign"
    }
  }'

# Verificar status
curl http://localhost:3001/api/utmify-checkout/status
```

### 3. Teste Frontend

Abra o arquivo `checkout/utmify-facebook-checkout-example.html` no navegador com parâmetros UTM:

```
http://localhost:3001/checkout/utmify-facebook-checkout-example.html?utm_source=facebook&utm_medium=paid-social&utm_campaign=test&fbclid=IwAR123456
```

## 📊 Estrutura do Payload Facebook

O payload enviado para Facebook segue exatamente a estrutura solicitada:

```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1756446899,
      "event_id": "87e266ef4caeb16c8303b28be3e841af",
      "user_data": {
        "em": "[HASH_SHA256_EMAIL]",
        "ph": "[HASH_SHA256_PHONE]",
        "fn": "[HASH_SHA256_FIRSTNAME]",
        "fbp": "fb.1.1756446899.1234567890",
        "fbc": "fb.1.1756446899.IwAR1234567890"
      },
      "custom_data": {
        "currency": "BRL",
        "value": 297,
        "content_name": "Produto Digital",
        "content_category": "Curso",
        "utm_source": "facebook",
        "utm_medium": "paid-social",
        "utm_campaign": "lancamento-produto",
        "utm_content": "video-vendas",
        "utm_term": "marketing-digital"
      },
      "action_source": "website"
    }
  ],
  "access_token": "[SEU_SYSTEM_USER_TOKEN]"
}
```

### Parâmetros FBP e FBC

- **FBP (Facebook Browser ID)**: Identificador único do navegador gerado pelo Facebook Pixel
- **FBC (Facebook Click ID)**: Parâmetro que rastreia cliques em anúncios do Facebook

Ambos são importantes para melhorar a atribuição e o matching de eventos no Facebook.

### 🍪 Captura de Cookies do Facebook

Para capturar automaticamente os cookies `_fbp` e `_fbc` no frontend:

```javascript
// Função para capturar cookies do Facebook
function getFacebookCookies() {
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }
    
    return {
        fbp: getCookie('_fbp'), // Facebook Browser ID
        fbc: getCookie('_fbc')  // Facebook Click ID
    };
}

// Obter fbclid da URL
function getFbclid() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fbclid');
}

// Usar no checkout
const facebookData = {
    ...getFacebookCookies(),
    fbclid: getFbclid()
};
```

**Importante**: Certifique-se de que o Facebook Pixel está instalado na página para que os cookies `_fbp` e `_fbc` sejam criados automaticamente.

## 🔍 Logs e Debugging

A integração gera logs detalhados:

```
🛒 Processando checkout com UTMify + Facebook CAPI...
📊 Dados do Checkout: { name: 'João', email: 'joa***', phone: '+55***', value: 297 }
🎯 Parâmetros UTM: { utm_source: 'facebook', utm_medium: 'paid-social', ... }
🔑 Event ID: 87e266ef4caeb16c8303b28be3e841af
🔗 FBC Parameter: fb.1.1756446899.IwAR1234567890
✅ Evento Purchase enviado com sucesso!
📈 Resposta Facebook: { events_received: 1, fbtrace_id: 'AkMvlb3LjpU7viGmYsJbeSa' }
```

## ⚠️ Validações Implementadas

### Dados Obrigatórios
- ✅ Email OU telefone (pelo menos um)
- ✅ Valor da compra > 0
- ✅ Nome do cliente

### Validações Facebook
- ✅ Token de acesso válido
- ✅ Acesso ao Pixel ID
- ✅ Formato correto do FBC
- ✅ Hash SHA256 dos dados do usuário

### Tratamento de Erros
- ✅ Timeout de requisições (10s)
- ✅ Retry automático em falhas
- ✅ Logs detalhados de erros
- ✅ Códigos de erro específicos

## 🚀 Próximos Passos

1. **Implementar no seu checkout**: Use o exemplo HTML como base
2. **Configurar webhooks**: Para confirmação de pagamentos
3. **Adicionar outros eventos**: ViewContent, AddToCart, etc.
4. **Monitoramento**: Implementar alertas para falhas
5. **A/B Testing**: Testar diferentes configurações

## 📞 Suporte

Em caso de dúvidas:
1. Verifique os logs do servidor
2. Teste os endpoints de status
3. Valide as configurações do Facebook
4. Execute os testes automatizados

---

✅ **Integração UTMify + Facebook CAPI implementada com sucesso!**

Todos os arquivos estão prontos para produção e seguem as melhores práticas de segurança e performance.