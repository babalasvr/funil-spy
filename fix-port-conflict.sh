#!/bin/bash

# Script para resolver conflito de porta na VPS
# Autor: Sistema de Rastreamento Avançado
# Data: $(date)

echo "🔍 Verificando conflitos de porta..."

# Função para encontrar processo na porta 3001
find_port_process() {
    local port=$1
    echo "Verificando porta $port..."
    
    # Encontrar processo usando a porta
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo "⚠️  Processo encontrado na porta $port (PID: $pid)"
        
        # Mostrar informações do processo
        echo "Detalhes do processo:"
        ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null || echo "Processo não encontrado"
        
        return 0
    else
        echo "✅ Porta $port está livre"
        return 1
    fi
}

# Função para parar processo na porta
stop_port_process() {
    local port=$1
    echo "🛑 Parando processo na porta $port..."
    
    # Encontrar e parar processo
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo "Parando processo PID: $pid"
        kill -TERM $pid 2>/dev/null
        
        # Aguardar 5 segundos
        sleep 5
        
        # Verificar se ainda está rodando
        if kill -0 $pid 2>/dev/null; then
            echo "⚠️  Processo ainda ativo, forçando parada..."
            kill -KILL $pid 2>/dev/null
            sleep 2
        fi
        
        echo "✅ Processo parado com sucesso"
    else
        echo "ℹ️  Nenhum processo encontrado na porta $port"
    fi
}

# Função para parar PM2 processes relacionados
stop_pm2_processes() {
    echo "🔄 Verificando processos PM2..."
    
    # Verificar se PM2 está instalado
    if command -v pm2 >/dev/null 2>&1; then
        echo "PM2 encontrado, verificando processos..."
        
        # Listar processos PM2
        pm2 list 2>/dev/null | grep -E "(analytics|tracking|funil)" && {
            echo "⚠️  Processos relacionados encontrados no PM2"
            echo "Parando processos PM2..."
            
            # Parar processos específicos
            pm2 stop analytics 2>/dev/null || true
            pm2 stop tracking 2>/dev/null || true
            pm2 stop funil-spy 2>/dev/null || true
            
            # Aguardar
            sleep 3
            
            echo "✅ Processos PM2 parados"
        } || {
            echo "ℹ️  Nenhum processo relacionado no PM2"
        }
    else
        echo "ℹ️  PM2 não instalado"
    fi
}

# Função para encontrar porta livre
find_free_port() {
    local start_port=$1
    local max_attempts=50
    local current_port=$start_port
    
    echo "🔍 Procurando porta livre a partir de $start_port..."
    
    for ((i=0; i<max_attempts; i++)); do
        if ! lsof -i:$current_port >/dev/null 2>&1; then
            echo "✅ Porta livre encontrada: $current_port"
            echo $current_port
            return 0
        fi
        ((current_port++))
    done
    
    echo "❌ Nenhuma porta livre encontrada no range $start_port-$((start_port + max_attempts))"
    return 1
}

# Função para atualizar porta no arquivo de configuração
update_port_config() {
    local new_port=$1
    local env_file="/var/www/funil-spy/analytics/.env"
    
    echo "📝 Atualizando configuração de porta para $new_port..."
    
    if [ -f "$env_file" ]; then
        # Backup do arquivo original
        cp "$env_file" "${env_file}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Atualizar ou adicionar PORT
        if grep -q "^PORT=" "$env_file"; then
            sed -i "s/^PORT=.*/PORT=$new_port/" "$env_file"
        else
            echo "PORT=$new_port" >> "$env_file"
        fi
        
        echo "✅ Arquivo .env atualizado"
    else
        echo "⚠️  Arquivo .env não encontrado em $env_file"
        echo "Criando arquivo .env com porta $new_port..."
        
        # Criar diretório se não existir
        mkdir -p "$(dirname "$env_file")"
        
        # Criar arquivo básico
        cat > "$env_file" << EOF
# Configuração do Servidor
PORT=$new_port
NODE_ENV=production

# Facebook Pixel (CONFIGURE SUAS CREDENCIAIS)
FACEBOOK_PIXEL_ID=seu_pixel_id_aqui
FACEBOOK_ACCESS_TOKEN=seu_access_token_aqui
FACEBOOK_AD_ACCOUNT_ID=seu_ad_account_id_aqui

# Alertas por Email (OPCIONAL)
ALERT_EMAIL=seu_email@exemplo.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app

# Banco de Dados
DB_PATH=./analytics.db

# Segurança
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EOF
        
        echo "✅ Arquivo .env criado"
    fi
}

# Função principal
main() {
    echo "🚀 Iniciando resolução de conflito de porta..."
    echo "================================================"
    
    # Verificar se está rodando como root/sudo
    if [ "$EUID" -ne 0 ]; then
        echo "⚠️  Recomendado executar com sudo para melhor controle dos processos"
        echo "Continuando mesmo assim..."
    fi
    
    # 1. Verificar porta 3001
    if find_port_process 3001; then
        echo ""
        echo "🤔 O que deseja fazer?"
        echo "1) Parar processo na porta 3001 e usar esta porta"
        echo "2) Encontrar uma porta livre e atualizar configuração"
        echo "3) Apenas mostrar informações (não fazer alterações)"
        
        read -p "Escolha uma opção (1-3): " choice
        
        case $choice in
            1)
                echo ""
                echo "🛑 Parando processos..."
                stop_pm2_processes
                stop_port_process 3001
                
                # Verificar se porta está livre agora
                if ! find_port_process 3001; then
                    echo "✅ Porta 3001 liberada com sucesso!"
                    echo "Você pode agora iniciar o servidor na porta 3001"
                else
                    echo "❌ Não foi possível liberar a porta 3001"
                    echo "Tente a opção 2 para usar uma porta diferente"
                fi
                ;;
            2)
                echo ""
                echo "🔍 Procurando porta livre..."
                new_port=$(find_free_port 3002)
                
                if [ $? -eq 0 ]; then
                    update_port_config $new_port
                    echo ""
                    echo "✅ Configuração atualizada!"
                    echo "Nova porta: $new_port"
                    echo "Arquivo .env atualizado"
                else
                    echo "❌ Não foi possível encontrar porta livre"
                fi
                ;;
            3)
                echo ""
                echo "ℹ️  Apenas mostrando informações, nenhuma alteração feita"
                ;;
            *)
                echo "❌ Opção inválida"
                exit 1
                ;;
        esac
    else
        echo "✅ Porta 3001 está livre, nenhuma ação necessária"
    fi
    
    echo ""
    echo "================================================"
    echo "🎉 Resolução de conflito concluída!"
    
    # Mostrar próximos passos
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Configure suas credenciais no arquivo .env"
    echo "2. Teste o servidor: cd /var/www/funil-spy/analytics && npm test"
    echo "3. Inicie em produção: npm run production"
    echo ""
}

# Executar função principal
main "$@"