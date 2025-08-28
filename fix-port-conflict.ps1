# Script PowerShell para resolver conflitos de porta
# Autor: Sistema de Rastreamento Avançado
# Data: $(Get-Date)

Write-Host "🔍 Verificando conflitos de porta..." -ForegroundColor Cyan

# Função para encontrar processo na porta
function Find-PortProcess {
    param([int]$Port)
    
    Write-Host "Verificando porta $Port..." -ForegroundColor Yellow
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connections) {
            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "⚠️  Processo encontrado na porta $Port" -ForegroundColor Red
                    Write-Host "   PID: $($process.Id)" -ForegroundColor White
                    Write-Host "   Nome: $($process.ProcessName)" -ForegroundColor White
                    Write-Host "   Caminho: $($process.Path)" -ForegroundColor White
                    return $true
                }
            }
        }
        
        Write-Host "✅ Porta $Port está livre" -ForegroundColor Green
        return $false
    }
    catch {
        Write-Host "❌ Erro ao verificar porta $Port : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para parar processo na porta
function Stop-PortProcess {
    param([int]$Port)
    
    Write-Host "🛑 Parando processo na porta $Port..." -ForegroundColor Yellow
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connections) {
            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Parando processo: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor White
                    
                    # Tentar parar graciosamente
                    $process.CloseMainWindow() | Out-Null
                    Start-Sleep -Seconds 3
                    
                    # Verificar se ainda está rodando
                    if (!$process.HasExited) {
                        Write-Host "⚠️  Forçando parada do processo..." -ForegroundColor Yellow
                        $process.Kill()
                        Start-Sleep -Seconds 2
                    }
                    
                    Write-Host "✅ Processo parado com sucesso" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "ℹ️  Nenhum processo encontrado na porta $Port" -ForegroundColor Blue
        }
    }
    catch {
        Write-Host "❌ Erro ao parar processo na porta $Port : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Função para encontrar porta livre
function Find-FreePort {
    param([int]$StartPort = 3002)
    
    Write-Host "🔍 Procurando porta livre a partir de $StartPort..." -ForegroundColor Cyan
    
    for ($port = $StartPort; $port -lt ($StartPort + 50); $port++) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if (!$connections) {
                Write-Host "✅ Porta livre encontrada: $port" -ForegroundColor Green
                return $port
            }
        }
        catch {
            # Porta provavelmente livre
            Write-Host "✅ Porta livre encontrada: $port" -ForegroundColor Green
            return $port
        }
    }
    
    Write-Host "❌ Nenhuma porta livre encontrada no range $StartPort-$($StartPort + 50)" -ForegroundColor Red
    return $null
}

# Função para atualizar porta no arquivo de configuração
function Update-PortConfig {
    param([int]$NewPort)
    
    $envFile = "analytics\.env"
    
    Write-Host "📝 Atualizando configuração de porta para $NewPort..." -ForegroundColor Cyan
    
    if (Test-Path $envFile) {
        # Backup do arquivo original
        $backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $envFile $backupFile
        Write-Host "📋 Backup criado: $backupFile" -ForegroundColor Blue
        
        # Ler conteúdo atual
        $content = Get-Content $envFile
        $updated = $false
        
        # Atualizar linha PORT existente
        for ($i = 0; $i -lt $content.Length; $i++) {
            if ($content[$i] -match "^PORT=") {
                $content[$i] = "PORT=$NewPort"
                $updated = $true
                break
            }
        }
        
        # Se não encontrou, adicionar
        if (!$updated) {
            $content += "PORT=$NewPort"
        }
        
        # Salvar arquivo
        $content | Set-Content $envFile
        Write-Host "✅ Arquivo .env atualizado" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Arquivo .env não encontrado, criando..." -ForegroundColor Yellow
        
        # Criar arquivo básico
        $envContent = @"
# Configuração do Servidor
PORT=$NewPort
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
"@
        
        $envContent | Set-Content $envFile
        Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
    }
}

# Função principal
function Main {
    Write-Host "🚀 Iniciando resolução de conflito de porta..." -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor White
    
    # Verificar se está no diretório correto
    if (!(Test-Path "analytics")) {
        Write-Host "❌ Diretório 'analytics' não encontrado!" -ForegroundColor Red
        Write-Host "Execute este script na raiz do projeto funil-spy" -ForegroundColor Yellow
        return
    }
    
    # Verificar porta 3001
    if (Find-PortProcess -Port 3001) {
        Write-Host ""
        Write-Host "🤔 O que deseja fazer?" -ForegroundColor Cyan
        Write-Host "1) Parar processo na porta 3001 e usar esta porta" -ForegroundColor White
        Write-Host "2) Encontrar uma porta livre e atualizar configuração" -ForegroundColor White
        Write-Host "3) Apenas mostrar informações (não fazer alterações)" -ForegroundColor White
        
        $choice = Read-Host "Escolha uma opção (1-3)"
        
        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "🛑 Parando processos..." -ForegroundColor Yellow
                Stop-PortProcess -Port 3001
                
                # Verificar se porta está livre agora
                if (!(Find-PortProcess -Port 3001)) {
                    Write-Host "✅ Porta 3001 liberada com sucesso!" -ForegroundColor Green
                    Write-Host "Você pode agora iniciar o servidor na porta 3001" -ForegroundColor White
                } else {
                    Write-Host "❌ Não foi possível liberar a porta 3001" -ForegroundColor Red
                    Write-Host "Tente a opção 2 para usar uma porta diferente" -ForegroundColor Yellow
                }
            }
            "2" {
                Write-Host ""
                Write-Host "🔍 Procurando porta livre..." -ForegroundColor Cyan
                $newPort = Find-FreePort -StartPort 3002
                
                if ($newPort) {
                    Update-PortConfig -NewPort $newPort
                    Write-Host ""
                    Write-Host "✅ Configuração atualizada!" -ForegroundColor Green
                    Write-Host "Nova porta: $newPort" -ForegroundColor White
                    Write-Host "Arquivo .env atualizado" -ForegroundColor White
                } else {
                    Write-Host "❌ Não foi possível encontrar porta livre" -ForegroundColor Red
                }
            }
            "3" {
                Write-Host ""
                Write-Host "ℹ️  Apenas mostrando informações, nenhuma alteração feita" -ForegroundColor Blue
            }
            default {
                Write-Host "❌ Opção inválida" -ForegroundColor Red
                return
            }
        }
    } else {
        Write-Host "✅ Porta 3001 está livre, nenhuma ação necessária" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor White
    Write-Host "🎉 Resolução de conflito concluída!" -ForegroundColor Magenta
    
    # Mostrar próximos passos
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Configure suas credenciais no arquivo analytics\.env" -ForegroundColor White
    Write-Host "2. Teste o servidor: cd analytics && npm test" -ForegroundColor White
    Write-Host "3. Inicie em produção: npm run production" -ForegroundColor White
    Write-Host ""
}

# Executar função principal
Main