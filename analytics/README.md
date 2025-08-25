# 📊 Funil Spy Analytics System

Um sistema completo de analytics personalizado para seu funil mobile, com dashboard em tempo real e rastreamento detalhado de conversões.

## 🎯 O que este sistema faz

### Rastreamento Completo
- **Eventos de Página**: Visualizações, tempo gasto, profundidade de scroll
- **Interações do Usuário**: Cliques, preenchimento de formulários, seleções
- **Funil de Conversão**: Análise completa do caminho do usuário
- **Campanhas UTM**: Rastreamento de origem e performance por fonte
- **Conversões**: Vendas, order bumps, ofertas especiais

### Dashboard em Tempo Real
- **Métricas ao Vivo**: Atualizações automáticas a cada 30 segundos
- **Análise de Funil**: Taxa de conversão por etapa
- **Performance de Campanha**: ROI por fonte de tráfego
- **Dados de Sessão**: Duração, páginas visitadas, dispositivos

## 🚀 Setup Rápido

### Opção 1: Setup Automático (Recomendado)
1. Abra o terminal na pasta `analytics`
2. Execute: `start.bat` (Windows) ou siga o setup manual abaixo

### Opção 2: Setup Manual
```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
npm run setup

# 3. Iniciar servidor
npm start
```

## 📋 Como Usar

### 1. Iniciar o Sistema Analytics
```bash
cd analytics
npm start
```
O servidor iniciará em: `http://localhost:3001`

### 2. Acessar o Dashboard
Abra: `http://localhost:3001/dashboard.html`

### 3. Iniciar seu Funil
```bash
# Na pasta raiz do projeto
python -m http.server 8000
```
Seu funil estará em: `http://localhost:8000`

### 4. Testar o Rastreamento
- Visite suas páginas do funil
- Interaja com formulários e botões  
- Veja os dados aparecerem no dashboard em tempo real

## 📊 Páginas Rastreadas

O sistema rastreia automaticamente:

### 📄 Relatório (`/relatorio/`)
- Visualizações da página
- Tempo de leitura
- Scroll depth
- Exit intent (back-redirect)

### 🛒 Checkout (`/checkout/`)
- Início do processo de compra
- Preenchimento de formulários
- Seleção de order bump
- Geração de QR Code PIX
- Conversões

### 💰 Ofertas Especiais (`back-redirect.html`)
- Visualizações de ofertas
- Interações com descontos
- Conversões com preços especiais

## 📈 Métricas Disponíveis

### Funil de Conversão
- **Relatório → Checkout**: Taxa de cliques
- **Checkout → QR Code**: Taxa de início de pagamento  
- **QR Code → Conversão**: Taxa de pagamento completo
- **Order Bump**: Taxa de adesão à oferta adicional

### Performance de Campanha
- **ROI por Fonte**: Facebook, Google, TikTok, etc.
- **Custo por Conversão**: CPA por canal
- **LTV Estimado**: Valor vitalício do cliente
- **Dispositivos**: Desktop vs Mobile performance

### Comportamento do Usuário
- **Tempo por Página**: Engajamento médio
- **Abandono**: Onde os usuários saem
- **Scroll Depth**: Profundidade de leitura
- **Interações**: Cliques e formulários

## 🔧 Configurações Avançadas

### Personalizar Rastreamento
Edite `public/tracking.js`:
```javascript
const CONFIG = {
    apiUrl: 'http://localhost:3001/api',
    debug: true, // Ativar logs no console
    autoTrack: true,
    trackScrollDepth: true,
    trackClicks: true,
    trackFormEvents: true
};
```

### Adicionar Eventos Customizados
```javascript
// Em qualquer página
FunnelAnalytics.track('custom_event', {
    property1: 'value1',
    property2: 'value2'
});

// Rastrear conversão manual
FunnelAnalytics.trackConversion(27.90, true, false, {
    customerName: 'João Silva',
    email: 'joao@email.com'
});
```

## 📱 Integração com seu Funil

O sistema já está integrado em todas as páginas:
- ✅ `/relatorio/index.html`
- ✅ `/checkout/index.html` 
- ✅ `/checkout/back-redirect.html`
- ✅ `/back-redirect/index.html`

## 🗃️ Estrutura do Banco de Dados

### Tabela `events`
- Todos os eventos de interação do usuário
- Timestamps, propriedades, dados de sessão

### Tabela `sessions`  
- Informações de sessão por usuário
- UTM parameters, device info, duração

### Tabela `conversions`
- Dados completos de vendas
- Valores, order bumps, ofertas especiais

## 🔍 Troubleshooting

### Servidor não inicia
```bash
# Verificar se a porta 3001 está livre
netstat -an | findstr 3001

# Reinstalar dependências
rm -rf node_modules
npm install
```

### Dashboard não carrega dados
1. Verificar se o servidor analytics está rodando
2. Verificar se há dados no banco: `analytics.db`
3. Testar a API: `http://localhost:3001/api/dashboard-data`

### Eventos não são rastreados
1. Abrir console do navegador (F12)
2. Verificar erros de JavaScript
3. Ativar debug mode no `tracking.js`

## 🎯 Próximos Passos

Com o sistema rodando, você pode:

1. **Monitorar Performance**: Acompanhar conversões em tempo real
2. **Otimizar Funil**: Identificar pontos de abandono
3. **Testar Campanhas**: Comparar ROI por fonte de tráfego
4. **Escalar Tráfego**: Duplicar as fontes com melhor performance

## 📞 Suporte

O sistema está configurado e funcionando. Para customizações específicas:
- Editar `server.js` para novos endpoints
- Modificar `dashboard.html` para novos gráficos  
- Personalizar `tracking.js` para eventos específicos

---

🎉 **Sistema pronto para uso!** Inicie o servidor e comece a rastrear seu funil agora mesmo.