# 🎯 Lead Tracker - Guia de Implementação

## 🚀 Novidade: Versão UTMify Edition

**Agora disponível:** `utmify-lead-tracker.js` - versão otimizada especificamente para integração com UTMify, incluindo:
- Detecção automática do UTMify
- Rastreamento de progresso de formulário
- Eventos específicos para UTMify
- Persistência de UTMs por 30 dias
- Compatibilidade com SPAs (Single Page Applications)

## Visão Geral

O Lead Tracker é uma solução completa para capturar automaticamente dados de leads em checkouts e integrá-los com informações de UTM da UTMify. O sistema funciona em tempo real, capturando dados conforme o usuário preenche os formulários.

## 📋 Funcionalidades

- ✅ **Captura automática em tempo real** de dados de formulários
- ✅ **Integração com UTMs** (utm_source, utm_medium, utm_campaign, etc.)
- ✅ **Detecção inteligente de campos** (nome, email, telefone, etc.)
- ✅ **Qualificação automática de leads** baseada na completude dos dados
- ✅ **API completa** para gerenciamento de leads
- ✅ **Armazenamento seguro** em arquivos JSON
- ✅ **Estatísticas e relatórios** de leads capturados

## 🚀 Implementação Rápida

### Opção 1: Versão Padrão
```html
<!-- Adicione antes do fechamento do </body> -->
<script src="/analytics/public/lead-tracker.js"></script>
```

### Opção 2: Versão UTMify (Recomendada)
```html
<!-- Primeiro o script do UTMify -->
<script src="https://cdn.utm.io/utmify.js"></script>
<!-- Depois nosso tracker otimizado -->
<script src="/analytics/public/utmify-lead-tracker.js"></script>
```

### 2. Configuração Básica (Opcional)

```javascript
// Configuração personalizada (opcional)
window.LeadTrackerConfig = {
    apiEndpoint: '/api/capture-lead',
    autoSend: true,
    sendInterval: 5000,
    debug: false,
    utmSource: 'custom_source' // UTM personalizada
};
```

### 3. Pronto! 🎉

O Lead Tracker começará a funcionar automaticamente, capturando:
- Dados de formulários em tempo real
- UTMs da URL atual
- Informações de sessão
- Dados de localStorage/cookies

## 📊 Campos Capturados Automaticamente

### Dados Pessoais
- **Nome**: `name`, `nome`, `first_name`, `last_name`
- **Email**: `email`, `e-mail`, `mail`
- **Telefone**: `phone`, `telefone`, `whatsapp`, `celular`
- **Documento**: `cpf`, `cnpj`, `document`, `documento`

### Endereço
- **Endereço**: `address`, `endereco`, `rua`
- **Cidade**: `city`, `cidade`
- **Estado**: `state`, `estado`, `uf`
- **CEP**: `zipcode`, `cep`, `postal_code`
- **País**: `country`, `pais`

### UTMs e Tracking
- `utm_source`, `utm_medium`, `utm_campaign`
- `utm_term`, `utm_content`
- `gclid`, `fbclid`
- Referrer, User Agent, IP

## 🔧 API Endpoints

### Capturar Lead
```http
POST /api/capture-lead
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 99999-9999",
  "utm_source": "google",
  "utm_medium": "cpc"
}
```

### Listar Leads
```http
GET /api/leads?page=1&limit=10
```

### Estatísticas
```http
GET /api/leads/stats
```

### Lead Específico
```http
GET /api/leads/{sessionId}
```

## 📱 Exemplo de Implementação

```html
<!DOCTYPE html>
<html>
<head>
    <title>Meu Checkout</title>
</head>
<body>
    <form id="checkout-form">
        <input type="text" name="name" placeholder="Nome completo">
        <input type="email" name="email" placeholder="E-mail">
        <input type="tel" name="phone" placeholder="Telefone">
        <button type="submit">Finalizar Compra</button>
    </form>

    <!-- Lead Tracker -->
    <script src="/analytics/public/lead-tracker.js"></script>
    
    <script>
        // Escutar eventos de captura
        window.addEventListener('leadCaptured', function(event) {
            console.log('Lead capturado:', event.detail);
        });
        
        // Manipular submit do formulário
        document.getElementById('checkout-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Obter dados capturados
            const leadData = LeadTracker.getCurrentData();
            console.log('Dados do lead:', leadData);
            
            // Processar pagamento...
        });
    </script>
</body>
</html>
```

## 🎯 Integração com UTMify

### Configuração UTMify Edition
```javascript
// Configuração automática - não requer código adicional
// O script detecta automaticamente o UTMify e se integra

// Eventos disponíveis para UTMify:
window.addEventListener('leadCaptured', function(event) {
    const data = event.detail;
    console.log('Lead capturado:', data);
    
    // Dados disponíveis:
    // - data.lead (dados do formulário)
    // - data.utm (parâmetros UTM)
    // - data.session (ID da sessão)
    // - data.page (informações da página)
    // - data.progress (progresso do formulário)
});
```

### Recursos Específicos UTMify
- **Detecção Automática**: Identifica se UTMify está presente
- **Persistência UTM**: Mantém UTMs por 30 dias no localStorage
- **Progresso de Formulário**: Calcula % de preenchimento
- **Eventos Customizados**: Dispara eventos específicos para UTMify
- **SPA Support**: Funciona em Single Page Applications

## 🎛️ Configurações Avançadas

### Personalizar Campos (Versão Padrão)
```javascript
window.LeadTracker.config({
    apiEndpoint: '/api/capture-lead',
    formSelectors: {
        name: 'input[name="name"], input[name="nome"], #nome',
        email: 'input[type="email"], input[name="email"]',
        phone: 'input[name="phone"], input[name="telefone"]'
    }
});
```

### Personalizar Campos (Versão UTMify)
```javascript
window.UTMifyLeadTracker.config({
    apiEndpoint: '/api/capture-lead',
    utmify: {
        enabled: true,
        trackingId: 'seu-tracking-id',
        events: ['lead_captured', 'form_progress', 'form_completed']
    },
    formSelectors: {
        name: 'input[name="name"], input[name="nome"], #nome',
        email: 'input[type="email"], input[name="email"]',
        phone: 'input[name="phone"], input[name="telefone"]'
    }
});
```

### Personalizar Campos

```javascript
// Adicionar campos personalizados
LeadTracker.addCustomField('produto', 'Curso de Marketing');
LeadTracker.addCustomField('valor', 'R$ 197,00');
```

### Eventos Personalizados

```javascript
// Escutar todos os eventos
window.addEventListener('leadDataChanged', function(event) {
    console.log('Dados alterados:', event.detail);
});

window.addEventListener('leadSent', function(event) {
    console.log('Lead enviado:', event.detail);
});

window.addEventListener('leadError', function(event) {
    console.error('Erro no lead:', event.detail);
});
```

### Controle Manual

```javascript
// Enviar dados manualmente
LeadTracker.sendData();

// Obter dados atuais
const data = LeadTracker.getCurrentData();

// Limpar dados
LeadTracker.clearData();

// Adicionar dados específicos
LeadTracker.addData('campo_personalizado', 'valor');
```

## 📈 Monitoramento e Análise

### Dashboard de Leads

Acesse as estatísticas em:
```
GET /api/leads/stats
```

Retorna:
```json
{
  "total": 150,
  "today": 12,
  "thisWeek": 45,
  "thisMonth": 120,
  "qualified": {
    "high": 80,
    "medium": 50,
    "low": 20
  },
  "sources": {
    "google": 60,
    "facebook": 40,
    "direct": 30,
    "email": 20
  }
}
```

### Arquivos de Dados

Os leads são salvos em:
- `captured-leads.json` - Todos os leads
- `data/leads/daily/YYYY-MM-DD.json` - Leads por dia

## 🔒 Segurança e Privacidade

- ✅ Dados armazenados localmente no servidor
- ✅ Não exposição de informações sensíveis
- ✅ Logs de auditoria para todas as operações
- ✅ Validação de dados no servidor
- ✅ Rate limiting para prevenir spam

## 🐛 Troubleshooting

### Lead Tracker não está funcionando

1. Verifique se o script está carregado:
```javascript
console.log(typeof LeadTracker); // deve retornar 'object'
```

2. Ative o modo debug:
```javascript
window.LeadTrackerConfig = { debug: true };
```

3. Verifique o console do navegador para erros

### Dados não estão sendo capturados

1. Verifique se os campos têm os nomes corretos
2. Confirme se o formulário está dentro do DOM
3. Teste manualmente:
```javascript
LeadTracker.addData('test', 'value');
LeadTracker.sendData();
```

### API não está respondendo

1. Verifique se o servidor está rodando
2. Confirme se as rotas estão registradas
3. Verifique logs do servidor

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console (F12)
2. Ative o modo debug
3. Consulte a documentação da API
4. Teste com dados de exemplo

---

**🎯 Lead Tracker v1.0** - Captura inteligente de leads para checkouts

*Desenvolvido para integração com UTMify e sistemas de analytics*