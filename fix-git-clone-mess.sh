#!/bin/bash
# Script para corrigir bagunça do git clone
# Autor: Sistema de Rastreamento Avançado

echo "🔧 Corrigindo estrutura de diretórios após git clone..."
echo "================================================"

# Verificar se estamos no diretório correto
if [ ! -d "funil-spy" ]; then
    echo "❌ Diretório 'funil-spy' não encontrado!"
    echo "Execute este script no diretório onde você fez o git clone"
    exit 1
fi

echo "📁 Estrutura atual detectada:"
ls -la

echo ""
echo "🤔 O que deseja fazer?"
echo "1) Mover conteúdo de funil-spy/ para diretório atual e remover pasta duplicada"
echo "2) Entrar na pasta funil-spy/ e trabalhar a partir dela"
echo "3) Fazer backup e reorganizar completamente"
echo "4) Apenas mostrar estrutura (não fazer alterações)"

read -p "Escolha uma opção (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📦 Movendo arquivos..."
        
        # Fazer backup se já existirem arquivos
        if [ -f "index.html" ] || [ -d "analytics" ]; then
            backup_dir="backup-$(date +%Y%m%d_%H%M%S)"
            echo "📋 Criando backup em: $backup_dir"
            mkdir -p "$backup_dir"
            
            # Mover arquivos existentes para backup (exceto funil-spy/)
            for item in *; do
                if [ "$item" != "funil-spy" ] && [ "$item" != "$backup_dir" ]; then
                    mv "$item" "$backup_dir/"
                fi
            done
        fi
        
        # Mover conteúdo de funil-spy/ para diretório atual
        echo "📁 Movendo conteúdo de funil-spy/ para diretório atual..."
        mv funil-spy/* .
        mv funil-spy/.* . 2>/dev/null || true
        
        # Remover diretório vazio
        rmdir funil-spy
        
        echo "✅ Estrutura reorganizada com sucesso!"
        echo "📁 Estrutura atual:"
        ls -la
        ;;
        
    2)
        echo ""
        echo "📂 Entrando na pasta funil-spy/"
        cd funil-spy
        echo "📁 Você está agora em: $(pwd)"
        echo "📁 Conteúdo:"
        ls -la
        echo ""
        echo "💡 Para continuar trabalhando aqui, execute:"
        echo "   cd funil-spy"
        echo "   ./deploy-server.sh"
        ;;
        
    3)
        echo ""
        echo "📦 Fazendo backup completo e reorganizando..."
        
        # Criar backup completo
        backup_dir="backup-completo-$(date +%Y%m%d_%H%M%S)"
        echo "📋 Criando backup completo em: $backup_dir"
        mkdir -p "$backup_dir"
        
        # Copiar tudo para backup
        cp -r * "$backup_dir/" 2>/dev/null || true
        cp -r .* "$backup_dir/" 2>/dev/null || true
        
        # Limpar diretório atual (exceto backup)
        for item in *; do
            if [ "$item" != "$backup_dir" ]; then
                rm -rf "$item"
            fi
        done
        
        # Mover conteúdo de funil-spy do backup
        if [ -d "$backup_dir/funil-spy" ]; then
            mv "$backup_dir/funil-spy"/* .
            mv "$backup_dir/funil-spy"/.*  . 2>/dev/null || true
        fi
        
        echo "✅ Reorganização completa finalizada!"
        echo "📁 Backup salvo em: $backup_dir"
        echo "📁 Estrutura atual:"
        ls -la
        ;;
        
    4)
        echo ""
        echo "📁 Estrutura atual detalhada:"
        echo "Diretório principal:"
        ls -la
        echo ""
        echo "Conteúdo de funil-spy/:"
        ls -la funil-spy/
        echo ""
        echo "ℹ️  Nenhuma alteração foi feita"
        ;;
        
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "🎉 Operação concluída!"

# Mostrar próximos passos
echo ""
echo "📋 Próximos passos recomendados:"
echo "1. Verificar se a estrutura está correta"
echo "2. Configurar o arquivo .env em analytics/"
echo "3. Executar o deploy: ./deploy-server.sh"
echo "4. Testar o sistema"
echo ""
echo "💡 Dica: Se houver problemas de porta, use: ./fix-port-conflict.sh"
echo ""