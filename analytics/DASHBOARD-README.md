# Dashboard de Relatório de Leads

## 📊 Visão Geral

O Dashboard de Leads é um sistema completo de monitoramento que coleta e exibe informações detalhadas sobre todos os usuários que passam pelo funil de conversão. Ele captura dados de cada etapa do processo, desde a página inicial até a conversão final.

## 🎯 Funcionalidades Principais

### 📈 Métricas em Tempo Real
- **Total de Leads**: Número total de usuários que entraram no funil
- **Conversões**: Quantas vendas foram realizadas
- **Taxa de Conversão**: Percentual de conversão do funil
- **Receita Total**: Valor total gerado pelas vendas
- **Usuários Online**: Quantos usuários estão ativos no momento
- **Números Investigados**: Quantos números de WhatsApp foram pesquisados

### 📋 Dados Detalhados dos Leads
Para cada lead, o sistema captura:

#### 👤 Informações Pessoais
- Nome completo
- E-mail
- Telefone/WhatsApp
- CPF (quando fornecido)

#### 📱 Dados de Investigação
- Número do WhatsApp investigado
- Tipo de alvo (parceiro/parceira)
- Se a foto do WhatsApp foi encontrada
- Status do WhatsApp do número investigado

#### 🚀 Jornada do Funil
- Todas as páginas visitadas
- Ordem de navegação pelo funil
- Tempo gasto em cada etapa
- Ponto de abandono (se aplicável)

#### 📊 Origem do Tráfego
- Fonte UTM (WhatsApp, Instagram, Facebook, etc.)
- Campanha específica
- Meio de aquisição
- Parâmetros de rastreamento completos

#### 💻 Informações Técnicas
- Tipo de dispositivo (Mobile/Desktop)
- Navegador utilizado
- Sistema operacional
- Resolução da tela

#### 💰 Dados de Conversão
- Status atual (Pendente, Convertido, Abandonado, Ativo)
- Valor da compra
- Se incluiu order bump
- Data e hora da conversão

## 🔧 Como Acessar

### Acesso Local
1. Navegue até: `http://localhost:3001/admin-dashboard.html`
2. Ou acesse: `http://[seu-dominio.com]/analytics/public/admin-dashboard.html`

### Acesso em Produção
- URL: `https://whatspy.pro/analytics/public/admin-dashboard.html`

## 📊 Usando o Dashboard

### Filtros Disponíveis
- **Período**: Últimas 24h, 7 dias, 30 dias ou todos os dados
- **Status**: Todos, Pendente, Convertido, Abandonado
- **Busca**: Por nome, e-mail, telefone ou número investigado

### 📥 Exportação de Dados
- Clique em "Exportar CSV" para baixar todos os dados filtrados
- O arquivo inclui todas as informações coletadas
- Formato compatível com Excel e Google Sheets

### 🔄 Atualização Automática
- O dashboard atualiza automaticamente a cada 30 segundos
- Indicador visual mostra que está sincronizando
- Botão "Atualizar" para refresh manual

## 🛠️ Configuração Técnica

### Scripts de Tracking
O sistema utiliza dois scripts principais:

1. **tracking.js**: Script básico de analytics
2. **enhanced-tracking.js**: Script avançado que captura dados do localStorage

### Endpoints da API
- `GET /api/stats`: Estatísticas gerais
- `GET /api/leads`: Dados detalhados dos leads
- `POST /api/track-enhanced`: Eventos de tracking aprimorado

### Armazenamento de Dados
Os dados são armazenados em:
- **SQLite Database**: `analytics.db` (produção)
- **JSON File**: `simple-analytics.json` (fallback)
- **LocalStorage**: Dados temporários no navegador

## 📱 Dados Coletados do LocalStorage

O sistema captura automaticamente:
- `alvoMonitoramento`: Tipo de pessoa sendo investigada
- `numeroClonado`: Número inserido para investigação
- `fotoperfil`: URL da foto do WhatsApp encontrada
- `Status`: Status do WhatsApp do número
- `customerData`: Dados do formulário de checkout
- `currentTransaction`: Informações da transação de pagamento
- `funil_user_*`: Dados de identificação do usuário

## 🔄 Fluxo de Dados

1. **Usuário acessa a página inicial** → Sistema gera session_id
2. **Escolhe tipo de investigação** → Salva no localStorage
3. **Insere número para investigar** → Registra evento de busca
4. **Navegação pelo funil** → Tracking de cada página
5. **Preenchimento de formulários** → Captura dados pessoais
6. **Conversão** → Registra venda e dados de pagamento

## 📊 Interpretação dos Status

- **Pendente**: Usuário iniciou o processo, mas não avançou muito
- **Ativo**: Usuário está navegando ativamente pelo funil
- **Abandonado**: Usuário parou de interagir por mais de 24h sem converter
- **Convertido**: Usuário completou uma compra

## 🚨 Troubleshooting

### Dashboard não carrega dados
1. Verifique se o serviço analytics está rodando (`pm2 status`)
2. Confirme acesso ao banco de dados
3. Verifique logs em `/var/log/` ou console do navegador

### Dados incompletos
1. Confirme que o script `enhanced-tracking.js` está carregando
2. Verifique se não há erros de CORS
3. Teste os endpoints da API diretamente

### Performance lenta
1. Limite o período de dados (use filtros)
2. Considere paginar resultados para muitos registros
3. Otimize queries do banco de dados

## 📈 Métricas Importantes

### Taxa de Conversão Esperada
- **Boa**: 5-10% de conversão geral
- **Excelente**: 10-15% ou mais
- **Pontos críticos**: Transição número → relatório e relatório → checkout

### Análise de Abandono
- **Página inicial**: Normal ter alta taxa de saída
- **Página do número**: Se alta saída, revisar UX
- **Relatório**: Principal ponto de conversão
- **Checkout**: Crítico otimizar processo de pagamento

## 🔐 Considerações de Privacidade

- Dados pessoais são criptografados
- Acesso restrito por autenticação
- Logs de acesso ao dashboard
- Conformidade com LGPD

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do sistema
2. Consultar documentação da API
3. Contatar administrador do sistema

---

**Última atualização**: Versão 1.0 - Dashboard implementado com tracking completo do funil