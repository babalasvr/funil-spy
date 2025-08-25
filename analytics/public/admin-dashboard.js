// Dashboard JavaScript - Relatório de Leads
// Global variables
let dashboardData = {
    leads: [],
    stats: {},
    isLoading: false
};

let autoRefreshInterval;
const API_BASE = '/api';

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
        
        // Fetch stats
        const statsResponse = await fetch(`${API_BASE}/stats?period=${period}`);
        const stats = await statsResponse.json();
        
        // Fetch leads data
        const leadsResponse = await fetch(`${API_BASE}/leads?period=${period}`);
        const leads = await leadsResponse.json();

        dashboardData.stats = stats;
        dashboardData.leads = leads;

        updateStatsCards(stats);
        updateLeadsTable(leads);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Erro ao carregar dados do dashboard');
        
        // Load mock data for demonstration
        loadMockData();
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
            order_bump: false
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
            revenue: 0
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
            revenue: 0
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

    leads.forEach(lead => {
        const row = createLeadRow(lead);
        tbody.appendChild(row);
    });

    document.getElementById('tableCount').textContent = leads.length;
}

// Create lead table row
function createLeadRow(lead) {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td>
            <div style="font-weight: 500;">${formatDateTime(lead.created_at)}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${getTimeAgo(lead.created_at)}</div>
        </td>
        <td>
            <div style="font-weight: 500; margin-bottom: 4px;">${lead.name || 'N/A'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-600);">${lead.email || 'N/A'}</div>
            <div style="font-size: 0.75rem; color: var(--gray-600);">${lead.phone || 'N/A'}</div>
            ${lead.cpf ? `<div style="font-size: 0.75rem; color: var(--gray-600);">CPF: ${formatCPF(lead.cpf)}</div>` : ''}
        </td>
        <td>
            <div style="font-weight: 500; font-family: monospace;">${lead.investigated_number || 'N/A'}</div>
            ${lead.target_type ? `<div style="font-size: 0.75rem; color: var(--gray-600);">Alvo: ${lead.target_type}</div>` : ''}
            ${lead.whatsapp_photo ? `<div style="font-size: 0.75rem; color: var(--gray-600);">📸 Foto encontrada</div>` : ''}
        </td>
        <td>
            <div style="font-size: 0.75rem;">
                ${lead.funnel_steps ? formatFunnelSteps(lead.funnel_steps) : 'N/A'}
            </div>
            <div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 4px;">
                ${lead.pages_visited || 0} páginas visitadas
            </div>
        </td>
        <td>
            <div style="font-size: 0.75rem;">
                ${lead.utm_source || 'Direto'}
                ${lead.utm_campaign ? `<br><span style="color: var(--gray-600);">${lead.utm_campaign}</span>` : ''}
            </div>
        </td>
        <td>
            <span class="device-badge device-${lead.device_type || 'desktop'}">
                ${lead.device_type === 'mobile' ? '📱' : '🖥️'} ${lead.device_type || 'Desktop'}
            </span>
            <div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 4px;">
                ${lead.browser || 'N/A'} • ${lead.os || 'N/A'}
            </div>
        </td>
        <td>
            <span class="status-badge status-${getLeadStatus(lead)}">
                ${getLeadStatusText(lead)}
            </span>
            ${lead.conversion_date ? `<div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 4px;">${formatDateTime(lead.conversion_date)}</div>` : ''}
        </td>
        <td>
            <div style="font-weight: 500;">
                ${lead.revenue ? formatCurrency(lead.revenue) : '-'}
            </div>
            ${lead.order_bump ? '<div style="font-size: 0.75rem; color: var(--success-green);">+ Order Bump</div>' : ''}
        </td>
        <td>
            <button class="btn btn-secondary" onclick="viewLeadDetails('${lead.session_id}')" style="font-size: 0.75rem; padding: 6px 12px;">
                👁️ Ver
            </button>
        </td>
    `;

    return tr;
}

// Helper functions
function formatNumber(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateTime(dateString) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${diffDays}d`;
}

function formatCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatFunnelSteps(steps) {
    const stepNames = {
        'page_view_home': '🏠 Início',
        'page_view_numero': '📱 Número',
        'page_view_carregando': '⏳ Carregando',
        'page_view_relatorio': '📊 Relatório',
        'page_view_checkout': '💳 Checkout',
        'form_started': '📝 Formulário',
        'qr_generated': '📱 QR Code',
        'payment_completed': '✅ Pagamento'
    };

    if (typeof steps === 'string') {
        try {
            steps = JSON.parse(steps);
        } catch {
            return 'N/A';
        }
    }

    if (Array.isArray(steps)) {
        return steps.map(step => stepNames[step] || step).join(' → ');
    }

    return 'N/A';
}

function getLeadStatus(lead) {
    if (lead.converted) return 'converted';
    if (lead.abandoned) return 'abandoned';
    if (lead.active) return 'active';
    return 'pending';
}

function getLeadStatusText(lead) {
    if (lead.converted) return 'Convertido';
    if (lead.abandoned) return 'Abandonado';
    if (lead.active) return 'Ativo';
    return 'Pendente';
}

// Filter and search functions
function filterData() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredLeads = [...dashboardData.leads];

    // Apply status filter
    if (statusFilter !== 'all') {
        filteredLeads = filteredLeads.filter(lead => {
            const status = getLeadStatus(lead);
            return status === statusFilter;
        });
    }

    // Apply search filter
    if (searchQuery) {
        filteredLeads = filteredLeads.filter(lead => {
            const searchFields = [
                lead.name,
                lead.email,
                lead.phone,
                lead.investigated_number,
                lead.cpf
            ];
            
            return searchFields.some(field => 
                field && field.toLowerCase().includes(searchQuery)
            );
        });
    }

    updateLeadsTable(filteredLeads);
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    alert(message); // Simple error display, can be enhanced
}

// View lead details
function viewLeadDetails(sessionId) {
    const lead = dashboardData.leads.find(l => l.session_id === sessionId);
    if (lead) {
        const details = `
Detalhes do Lead:

📊 Informações Gerais:
• Nome: ${lead.name || 'N/A'}
• E-mail: ${lead.email || 'N/A'}
• Telefone: ${lead.phone || 'N/A'}
• CPF: ${lead.cpf ? formatCPF(lead.cpf) : 'N/A'}

📱 Número Investigado: ${lead.investigated_number || 'N/A'}
👥 Tipo de Alvo: ${lead.target_type || 'N/A'}
📸 Foto do WhatsApp: ${lead.whatsapp_photo ? 'Encontrada' : 'Não encontrada'}

🚀 Funil de Conversão:
${formatFunnelSteps(lead.funnel_steps)}

📈 Origem do Tráfego:
• Fonte: ${lead.utm_source || 'Direto'}
• Campanha: ${lead.utm_campaign || 'N/A'}

💻 Informações Técnicas:
• Dispositivo: ${lead.device_type || 'N/A'}
• Navegador: ${lead.browser || 'N/A'}
• Sistema: ${lead.os || 'N/A'}

💰 Status: ${getLeadStatusText(lead)}
💵 Receita: ${lead.revenue ? formatCurrency(lead.revenue) : 'R$ 0,00'}
        `;
        
        alert(details);
    }
}

// Export data to CSV
function exportData() {
    const period = document.getElementById('periodFilter').value;
    const csvContent = generateCSV(dashboardData.leads);
    downloadCSV(csvContent, `leads-relatorio-${period}-${new Date().toISOString().split('T')[0]}.csv`);
}

function generateCSV(leads) {
    const headers = [
        'Data/Hora',
        'Nome',
        'E-mail',
        'Telefone',
        'CPF',
        'Número Investigado',
        'Tipo Alvo',
        'Foto WhatsApp',
        'Páginas Visitadas',
        'Fonte UTM',
        'Campanha UTM',
        'Dispositivo',
        'Navegador',
        'Sistema',
        'Status',
        'Receita',
        'Order Bump'
    ].join(',');

    const rows = leads.map(lead => [
        formatDateTime(lead.created_at),
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.cpf || '',
        lead.investigated_number || '',
        lead.target_type || '',
        lead.whatsapp_photo ? 'Sim' : 'Não',
        lead.pages_visited || 0,
        lead.utm_source || '',
        lead.utm_campaign || '',
        lead.device_type || '',
        lead.browser || '',
        lead.os || '',
        getLeadStatusText(lead),
        lead.revenue || 0,
        lead.order_bump ? 'Sim' : 'Não'
    ].map(field => `"${field}"`).join(','));

    return [headers, ...rows].join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}