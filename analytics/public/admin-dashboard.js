// Dashboard JavaScript - Relatório de Leads
// Global variables
let dashboardData = {
    leads: [],
    stats: {},
    isLoading: false
};

let autoRefreshInterval;

// Use a API base correta para conexão com o backend
const API_BASE = '/api';

// Log da inicialização para debugging
console.log('Dashboard inicializado. API_BASE:', API_BASE);

// Set timezone to São Paulo/Brazil
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupEventListeners();
    startAutoRefresh();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('periodFilter').addEventListener('change', loadDashboardData);
    document.getElementById('statusFilter').addEventListener('change', filterData);
    document.getElementById('searchInput').addEventListener('input', debounce(filterData, 300));
}

// Auto-refresh functionality
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadDashboardData(false); // Silent refresh
    }, 30000); // Refresh every 30 seconds
}

// Load dashboard data from API
async function loadDashboardData(showLoading = true) {
    if (dashboardData.isLoading) return;
    
    dashboardData.isLoading = true;
    
    if (showLoading) {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('leadsTable').style.display = 'none';
    }

    try {
        const period = document.getElementById('periodFilter').value;
        
        // Debug API endpoints
        console.log(`Loading data from API: ${API_BASE}/stats and ${API_BASE}/leads`);
        
        // Fetch stats
        const statsResponse = await fetch(`${API_BASE}/stats?period=${period}`);
        if (!statsResponse.ok) {
            throw new Error(`Stats API error: ${statsResponse.status} ${statsResponse.statusText}`);
        }
        const stats = await statsResponse.json();
        console.log('Stats loaded successfully:', stats);
        
        // Fetch leads data
        const leadsResponse = await fetch(`${API_BASE}/leads?period=${period}`);
        if (!leadsResponse.ok) {
            throw new Error(`Leads API error: ${leadsResponse.status} ${leadsResponse.statusText}`);
        }
        const leads = await leadsResponse.json();
        console.log('Leads loaded successfully:', leads);

        dashboardData.stats = stats;
        dashboardData.leads = leads;

        updateStatsCards(stats);
        updateLeadsTable(leads);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('leadsTableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <strong>❌ Erro ao carregar dados reais:</strong><br>
                    ${error.message}<br><br>
                    <small>Verifique se o serviço de analytics está rodando e acessível.</small>
                </td>
            </tr>
        `;
        
        // Atualizar contador de resultados
        document.getElementById('tableCount').textContent = '0';
        
        // NÃO carregue dados mockados em produção
        // loadMockData();
    } finally {
        dashboardData.isLoading = false;
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('leadsTable').style.display = 'table';
    }
}

// Load mock data for demonstration
function loadMockData() {
    const mockStats = {
        totalLeads: 1247,
        totalConversions: 89,
        conversionRate: 7.1,
        totalRevenue: 2483.10,
        activeUsers: 23,
        totalInvestigations: 1156,
        leadsChange: 12.5,
        conversionsChange: 8.3,
        revenueChange: 15.7
    };

    const mockLeads = [
        {
            session_id: 'session_001',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            name: 'Maria Silva',
            email: 'maria.silva@email.com',
            phone: '(11) 99999-1234',
            cpf: '12345678901',
            investigated_number: '(11) 98765-4321',
            target_type: 'parceiro',
            whatsapp_photo: true,
            funnel_steps: ['page_view_home', 'page_view_numero', 'page_view_carregando', 'page_view_relatorio', 'page_view_checkout', 'form_started', 'qr_generated', 'payment_completed'],
            pages_visited: 5,
            utm_source: 'whatsapp',
            utm_campaign: 'promo_verão',
            device_type: 'mobile',
            browser: 'Chrome',
            os: 'Android',
            converted: true,
            conversion_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            revenue: 27.90,
            order_bump: false,
            current_page: '/checkout/'
        },
        {
            session_id: 'session_002',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            name: 'João Santos',
            email: 'joao.santos@email.com',
            phone: '(21) 88888-5678',
            cpf: '98765432109',
            investigated_number: '(21) 87654-3210',
            target_type: 'parceira',
            whatsapp_photo: true,
            funnel_steps: ['page_view_home', 'page_view_numero', 'page_view_carregando', 'page_view_relatorio'],
            pages_visited: 4,
            utm_source: 'instagram',
            utm_campaign: 'story_ads',
            device_type: 'mobile',
            browser: 'Safari',
            os: 'iOS',
            converted: false,
            abandoned: true,
            revenue: 0,
            current_page: '/relatorio/'
        },
        {
            session_id: 'session_003',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            name: 'Ana Costa',
            email: 'ana.costa@email.com',
            phone: '(31) 77777-9012',
            cpf: '11122233344',
            investigated_number: '(31) 76543-2109',
            target_type: 'parceiro',
            whatsapp_photo: false,
            funnel_steps: ['page_view_home', 'page_view_numero', 'page_view_carregando', 'page_view_relatorio', 'page_view_checkout', 'form_started'],
            pages_visited: 6,
            utm_source: 'facebook',
            utm_campaign: 'retargeting',
            device_type: 'desktop',
            browser: 'Chrome',
            os: 'Windows',
            converted: false,
            active: true,
            revenue: 0,
            current_page: '/checkout/'
        }
    ];

    dashboardData.stats = mockStats;
    dashboardData.leads = mockLeads;

    updateStatsCards(mockStats);
    updateLeadsTable(mockLeads);
}

// Update stats cards
function updateStatsCards(stats) {
    document.getElementById('totalLeads').textContent = formatNumber(stats.totalLeads || 0);
    document.getElementById('totalConversions').textContent = formatNumber(stats.totalConversions || 0);
    document.getElementById('conversionRate').textContent = (stats.conversionRate || 0) + '%';
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
    document.getElementById('activeUsers').textContent = formatNumber(stats.activeUsers || 0);
    document.getElementById('totalInvestigations').textContent = formatNumber(stats.totalInvestigations || 0);

    // Update change indicators
    document.getElementById('leadsChange').innerHTML = 
        `${stats.leadsChange >= 0 ? '↗' : '↘'} ${stats.leadsChange >= 0 ? '+' : ''}${stats.leadsChange || 0}% últimas 24h`;
    
    document.getElementById('conversionsChange').innerHTML = 
        `${stats.conversionsChange >= 0 ? '↗' : '↘'} ${stats.conversionsChange >= 0 ? '+' : ''}${stats.conversionsChange || 0}% últimas 24h`;
    
    document.getElementById('revenueChange').innerHTML = 
        `${stats.revenueChange >= 0 ? '↗' : '↘'} ${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange || 0}% últimas 24h`;
}

// Update leads table
function updateLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    tbody.innerHTML = '';

    if (!leads || leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    📭 Nenhum lead encontrado para os filtros selecionados
                </td>
            </tr>
        `;
        document.getElementById('tableCount').textContent = '0';
        return;
    }

    document.getElementById('tableCount').textContent = leads.length;
    
    leads.forEach(lead => {
        const row = createLeadRow(lead);
        tbody.appendChild(row);
    });
}

// Create lead row
function createLeadRow(lead) {
    const row = document.createElement('tr');
    
    // Format date in São Paulo timezone
    const createdAt = new Date(lead.created_at);
    const formattedDate = createdAt.toLocaleString('pt-BR', {
        timeZone: SAO_PAULO_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format revenue
    const revenue = lead.revenue ? formatCurrency(lead.revenue) : '-';
    
    // Determine status
    let statusText = 'Pendente';
    let statusClass = 'status-pending';
    
    if (lead.converted) {
        statusText = 'Convertido';
        statusClass = 'status-converted';
    } else if (lead.abandoned) {
        statusText = 'Abandonado';
        statusClass = 'status-abandoned';
    } else if (lead.active) {
        statusText = 'Ativo';
        statusClass = 'status-active';
    }
    
    // Device icon
    const deviceIcon = lead.device_type === 'mobile' ? '📱' : '💻';
    const deviceClass = lead.device_type === 'mobile' ? 'device-mobile' : 'device-desktop';
    
    // Funnel progress - show current page instead of number of pages
    const currentPage = lead.current_page || (lead.last_page ? getFriendlyPageName(lead.last_page) : 'Página desconhecida');
    const funnelSteps = lead.funnel_steps ? lead.funnel_steps.length : 0;
    
    row.innerHTML = `
        <td>
            <div style="font-weight: 500;">${formattedDate}</div>
        </td>
        <td>
            <div style="font-weight: 500;">${lead.name || '-'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${lead.email || '-'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${lead.phone || lead.cpf || '-'}</div>
        </td>
        <td>
            <div>${lead.investigated_number || '-'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${lead.target_type || '-'}</div>
        </td>
        <td>
            <div style="font-weight: 500;">${currentPage}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${funnelSteps} etapas</div>
        </td>
        <td>
            <div style="font-weight: 500;">${lead.utm_source || '-'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${lead.utm_campaign || '-'}</div>
        </td>
        <td>
            <div class="${deviceClass}">${deviceIcon} ${lead.device_type === 'mobile' ? 'Mobile' : 'Desktop'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${lead.browser || '-'}</div>
        </td>
        <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${lead.order_bump ? '<span class="status-badge" style="background: rgba(245, 158, 11, 0.1); color: var(--warning-orange); margin-left: 4px;">+ Order Bump</span>' : ''}
        </td>
        <td>
            <div style="font-weight: 600;">${revenue}</div>
        </td>
        <td>
            <button class="action-btn" onclick="viewLeadDetails('${lead.session_id}')">Ver detalhes</button>
        </td>
    `;
    
    return row;
}

// Get friendly page name from URL
function getFriendlyPageName(url) {
    if (!url) return 'Página desconhecida';
    
    if (url.includes('/relatorio/')) return 'Relatório';
    if (url.includes('/checkout/')) return 'Checkout';
    if (url.includes('/carregando/')) return 'Carregando';
    if (url.includes('/numero/')) return 'Número';
    if (url.includes('/obrigado/')) return 'Obrigado';
    if (url.includes('/back-redirect/')) return 'Back Redirect';
    
    // Extract filename if possible
    const urlObj = new URL(url, 'http://example.com');
    const path = urlObj.pathname;
    const parts = path.split('/').filter(part => part.length > 0);
    
    if (parts.length > 0) {
        return parts[parts.length - 1].replace('.html', '').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Página desconhecida';
}

// View lead details
function viewLeadDetails(sessionId) {
    const lead = dashboardData.leads.find(l => l.session_id === sessionId);
    if (!lead) return;
    
    // Create a detailed view of the lead
    let details = `Detalhes do Lead:\n\n`;
    details += `Session ID: ${lead.session_id}\n`;
    details += `Nome: ${lead.name || '-'}\n`;
    details += `Email: ${lead.email || '-'}\n`;
    details += `Telefone: ${lead.phone || '-'}\n`;
    details += `CPF: ${lead.cpf || '-'}\n`;
    details += `Número Investigado: ${lead.investigated_number || '-'}\n`;
    details += `Tipo de Alvo: ${lead.target_type || '-'}\n`;
    details += `Data de Criação: ${formatDateInSaoPaulo(lead.created_at)}\n`;
    details += `Página Atual: ${getFriendlyPageName(lead.current_page || lead.last_page)}\n`;
    details += `Etapas no Funil: ${lead.funnel_steps ? lead.funnel_steps.length : 0}\n`;
    details += `Páginas Visitadas: ${lead.pages_visited || 0}\n`;
    details += `Dispositivo: ${lead.device_type || '-'}\n`;
    details += `Navegador: ${lead.browser || '-'}\n`;
    details += `Status: ${getStatusText(lead)}\n`;
    details += `Receita: ${lead.revenue ? formatCurrency(lead.revenue) : '-'}`;
    
    if (lead.converted && lead.conversion_date) {
        details += `\nData de Conversão: ${formatDateInSaoPaulo(lead.conversion_date)}`;
    }
    
    alert(details);
}

// Format date in São Paulo timezone
function formatDateInSaoPaulo(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        timeZone: SAO_PAULO_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get status text
function getStatusText(lead) {
    if (lead.converted) return 'Convertido';
    if (lead.abandoned) return 'Abandonado';
    if (lead.active) return 'Ativo';
    return 'Pendente';
}

// Filter data based on status and search input
function filterData() {
    // This would implement filtering logic
    console.log('Filtering data...');
}

// Debounce function for search input
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Format number with thousands separator
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Format currency (BRL)
function formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Show error message
function showError(message) {
    console.error(message);
    
    // Adiciona um alerta visual para erros na interface
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background-color: #f8d7da; color: #721c24; padding: 12px; border-radius: 8px; margin: 10px 0; text-align: center;';
    errorDiv.innerHTML = `<strong>Erro:</strong> ${message}`;
    
    // Insere no topo da tabela
    const tableContainer = document.querySelector('.data-table-container');
    if (tableContainer) {
        tableContainer.insertBefore(errorDiv, tableContainer.firstChild);
        
        // Remove o alerta após 10 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
}

// Export data to CSV
function exportData() {
    alert('Funcionalidade de exportação em desenvolvimento');
}