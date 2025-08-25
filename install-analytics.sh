#!/bin/bash

echo "🚀 Instalando Funil Spy Analytics System..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js primeiro."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Navigate to analytics directory
cd analytics || exit 1

# Install dependencies
echo "📦 Instalando dependências..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependências instaladas com sucesso!"
else
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

# Create directory structure
echo "📁 Criando estrutura de diretórios..."
mkdir -p public
mkdir -p logs

# Set permissions
chmod +x server.js

echo ""
echo "🎉 Instalação concluída com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "==================="
echo ""
echo "1. Iniciar o servidor de analytics:"
echo "   cd analytics"
echo "   npm start"
echo ""
echo "2. Iniciar o servidor do funil (em outro terminal):"
echo "   cd .."
echo "   python -m http.server 8000"
echo ""
echo "3. Acessar o dashboard:"
echo "   http://localhost:3001/admin"
echo ""
echo "4. Testar o funil:"
echo "   http://localhost:8000/relatorio/"
echo ""
echo "🔧 Configurações:"
echo "=================="
echo "• Analytics API: http://localhost:3001"
echo "• Dashboard: http://localhost:3001/admin"  
echo "• Banco de dados: analytics/analytics.db"
echo "• Logs: analytics/logs/"
echo ""
echo "📊 O sistema irá rastrear automaticamente:"
echo "• Page views e navegação"
echo "• Scroll depth e tempo na página"
echo "• Cliques em botões e links"
echo "• Interações com formulários"
echo "• Conversões e receita"
echo "• Campanhas UTM"
echo ""
echo "✅ Sistema pronto para uso!"