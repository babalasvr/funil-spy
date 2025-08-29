# Teste Manual do Evento Purchase

Este guia mostra como testar o evento Purchase diretamente no navegador, sem usar scripts.

## Pré-requisitos

1. Certifique-se de que o serviço analytics está rodando na VPS
2. Remova o `FACEBOOK_TEST_EVENT_CODE` do arquivo `.env` (para produção)
3. Tenha acesso ao Facebook Events Manager

## Método 1: Teste via Checkout Real

### Passo 1: Acesse a página de checkout
```
https://descubra-zap.top/checkout/
```

### Passo 2: Complete uma compra real
- Preencha todos os dados do formulário
- Use um cartão de teste ou dados reais (dependendo do ambiente)
- Complete o processo até a página de obrigado

### Passo 3: Verifique no Facebook Events Manager
1. Acesse: https://business.facebook.com/events_manager2/
2. Selecione seu Pixel ID
3. Vá em "Test Events" ou "Eventos de Teste"
4. Procure pelo evento "Purchase" nos últimos minutos

## Método 2: Teste via Console do Navegador

### Passo 1: Abra a página de checkout
```
https://descubra-zap.top/checkout/
```

### Passo 2: Abra o Console do Navegador
- Pressione F12
- Vá na aba "Console"

### Passo 3: Execute o código de teste
```javascript
// Simular dados de compra
const purchaseData = {
    eventName: 'Purchase',
    userData: {
        email: 'teste@exemplo.com',
        phone: '+5511999999999',
        firstName: 'João',
        lastName: 'Silva',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
        zipCode: '01234-567'
    },
    customData: {
        currency: 'BRL',
        value: 97.00,
        content_type: 'product',
        content_ids: ['produto-descubra-zap'],
        content_name: 'Descubra Zap - Curso Completo',
        num_items: 1
    },
    utmData: {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'descubra-zap-vendas',
        utm_content: 'video-vsl',
        utm_term: 'whatsapp-automacao'
    }
};

// Enviar evento via fetch
fetch('/api/track-purchase', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(purchaseData)
})
.then(response => response.json())
.then(data => {
    console.log('Resposta do servidor:', data);
    if (data.success) {
        console.log('✅ Evento Purchase enviado com sucesso!');
        console.log('📊 Verifique no Facebook Events Manager');
    } else {
        console.error('❌ Erro ao enviar evento:', data.error);
    }
})
.catch(error => {
    console.error('❌ Erro na requisição:', error);
});
```

## Método 3: Teste via URL com Parâmetros

### Acesse a URL com parâmetros UTM:
```
https://descubra-zap.top/checkout/?utm_source=facebook&utm_medium=cpc&utm_campaign=teste-manual&utm_content=teste-purchase&fbclid=IwAR1234567890abcdef
```

Depois complete uma compra normalmente.

## Verificação dos Resultados

### No Facebook Events Manager:
1. **Event Name**: Deve aparecer como "Purchase"
2. **Event Time**: Timestamp atual
3. **Event Source**: "website"
4. **Event Source URL**: URL da página de checkout
5. **Custom Data**: Valor da compra, moeda, etc.
6. **User Data**: Email, telefone (hasheados)
7. **FBC Parameter**: Deve estar presente se houver fbclid na URL
8. **FBP Parameter**: Cookie do Facebook Pixel

### Logs do Servidor (opcional):
```bash
# Na VPS, verifique os logs do PM2
pm2 logs analytics

# Ou logs específicos do Node.js
tail -f /var/log/analytics.log
```

## Troubleshooting

### Se o evento não aparecer:
1. Verifique se o serviço analytics está rodando: `pm2 status`
2. Verifique os logs: `pm2 logs analytics`
3. Confirme se o FACEBOOK_ACCESS_TOKEN está correto no .env
4. Verifique se o FACEBOOK_PIXEL_ID está correto
5. Teste a conectividade com a API do Facebook

### Se aparecer erro 400:
1. Verifique se todos os campos obrigatórios estão presentes
2. Confirme se o event_name não está undefined
3. Verifique se o timestamp do FBC está em milissegundos

### Para debug avançado:
1. Ative temporariamente o FACEBOOK_TEST_EVENT_CODE no .env
2. Use o Test Events do Facebook para ver detalhes dos erros
3. Verifique a estrutura do payload no console do navegador

## Comandos Úteis na VPS

```bash
# Verificar status do serviço
pm2 status

# Ver logs em tempo real
pm2 logs analytics --lines 50

# Reiniciar serviço se necessário
pm2 restart analytics

# Verificar variáveis de ambiente
cat .env | grep FACEBOOK
```

## Próximos Passos

Após confirmar que o evento Purchase está funcionando:
1. Teste outros eventos (InitiateCheckout, AddToCart, etc.)
2. Verifique a deduplicação entre Pixel e CAPI
3. Configure campanhas de remarketing no Facebook Ads
4. Monitore as conversões em tempo real