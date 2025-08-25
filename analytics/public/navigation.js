/**
 * Navegação Analytics - Sistema de Menu Unificado
 * Adiciona navegação consistente entre todas as páginas do analytics
 */

(function() {
    'use strict';

    // Configuração da navegação
    const NAVIGATION_CONFIG = {
        brand: {
            name: 'Funil Analytics',
            icon: '📊'
        },
        pages: [
            {
                name: 'Dashboard Principal',
                url: 'admin-dashboard.html',
                icon: '📊',
                description: 'Relatório completo de leads e conversões'
            },
            {
                name: 'Dashboard Simplificado',
                url: 'dashboard-simple.html',
                icon: '📈',
                description: 'Métricas básicas em tempo real'
            },
            {
                name: 'Dashboard Completo',
                url: 'dashboard.html',
                icon: '📋',
                description: 'Analytics completo com gráficos avançados'
            },
            {
                name: 'Remarketing',
                url: 'remarketing-dashboard.html',
                icon: '🎯',
                description: 'Campanhas de remarketing e reengajamento'
            },
            {
                name: 'Pixel Tracking',
                url: 'pixel-tracking.js',
                icon: '📡',
                description: 'Script de rastreamento (view source)',
                target: '_blank'
            }
        ]
    };

    // CSS para o menu de navegação
    const navigationCSS = `
        <style>
        .analytics-nav {
            background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
            color: white;
            padding: 0;
            margin: 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .analytics-nav-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 60px;
        }

        .analytics-nav-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            font-size: 1.2rem;
            text-decoration: none;
            color: white;
        }

        .analytics-nav-brand:hover {
            color: #e0e7ff;
        }

        .analytics-nav-menu {
            display: flex;
            align-items: center;
            gap: 0;
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .analytics-nav-item {
            position: relative;
        }

        .analytics-nav-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 12px 16px;
            color: white;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
            border-radius: 6px;
            margin: 0 2px;
        }

        .analytics-nav-link:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #e0e7ff;
            transform: translateY(-1px);
        }

        .analytics-nav-link.active {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            font-weight: 600;
        }

        .analytics-nav-mobile-toggle {
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }

        .analytics-nav-mobile-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .analytics-nav-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            min-width: 200px;
            padding: 8px 0;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            z-index: 1001;
        }

        .analytics-nav-item:hover .analytics-nav-dropdown {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .analytics-nav-dropdown-item {
            display: block;
            padding: 10px 16px;
            color: #374151;
            text-decoration: none;
            font-size: 0.85rem;
            transition: background 0.2s ease;
        }

        .analytics-nav-dropdown-item:hover {
            background: #f3f4f6;
            color: #1d4ed8;
        }

        .analytics-nav-dropdown-description {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 2px;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
            .analytics-nav-mobile-toggle {
                display: block;
            }

            .analytics-nav-menu {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #1e3a8a;
                flex-direction: column;
                padding: 20px;
                gap: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                display: none;
            }

            .analytics-nav-menu.active {
                display: flex;
            }

            .analytics-nav-link {
                width: 100%;
                justify-content: flex-start;
                padding: 12px 16px;
            }

            .analytics-nav-dropdown {
                position: static;
                opacity: 1;
                visibility: visible;
                transform: none;
                background: rgba(255, 255, 255, 0.05);
                box-shadow: none;
                margin-top: 8px;
            }

            .analytics-nav-dropdown-item {
                color: #e0e7ff;
                padding-left: 32px;
            }

            .analytics-nav-dropdown-item:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
        }

        /* Breadcrumb */
        .analytics-breadcrumb {
            background: #f8fafc;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .analytics-breadcrumb-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #64748b;
        }

        .analytics-breadcrumb-link {
            color: #1d4ed8;
            text-decoration: none;
            font-weight: 500;
        }

        .analytics-breadcrumb-link:hover {
            text-decoration: underline;
        }

        .analytics-breadcrumb-separator {
            color: #94a3b8;
        }

        .analytics-breadcrumb-current {
            color: #374151;
            font-weight: 600;
        }
        </style>
    `;

    // Função para detectar a página atual
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        return filename;
    }

    // Função para gerar o HTML da navegação
    function generateNavigationHTML() {
        const currentPage = getCurrentPage();
        
        const menuItems = NAVIGATION_CONFIG.pages.map(page => {
            const isActive = currentPage === page.url;
            const activeClass = isActive ? 'active' : '';
            const targetAttr = page.target ? `target="${page.target}"` : '';
            
            return `
                <li class="analytics-nav-item">
                    <a href="${page.url}" class="analytics-nav-link ${activeClass}" title="${page.description}" ${targetAttr}>
                        <span>${page.icon}</span>
                        <span>${page.name}</span>
                    </a>
                </li>
            `;
        }).join('');

        return `
            <nav class="analytics-nav">
                <div class="analytics-nav-container">
                    <a href="admin-dashboard.html" class="analytics-nav-brand">
                        <span>${NAVIGATION_CONFIG.brand.icon}</span>
                        <span>${NAVIGATION_CONFIG.brand.name}</span>
                    </a>
                    
                    <button class="analytics-nav-mobile-toggle" onclick="toggleMobileMenu()">
                        ☰
                    </button>
                    
                    <ul class="analytics-nav-menu" id="analyticsNavMenu">
                        ${menuItems}
                        <li class="analytics-nav-item">
                            <a href="/" class="analytics-nav-link" title="Voltar ao site principal">
                                <span>🏠</span>
                                <span>Site Principal</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        `;
    }

    // Função para gerar breadcrumb
    function generateBreadcrumb() {
        const currentPage = getCurrentPage();
        const page = NAVIGATION_CONFIG.pages.find(p => p.url === currentPage);
        
        if (!page) return '';

        return `
            <div class="analytics-breadcrumb">
                <div class="analytics-breadcrumb-container">
                    <a href="admin-dashboard.html" class="analytics-breadcrumb-link">Analytics</a>
                    <span class="analytics-breadcrumb-separator">›</span>
                    <span class="analytics-breadcrumb-current">${page.name}</span>
                </div>
            </div>
        `;
    }

    // Função para toggle do menu mobile
    window.toggleMobileMenu = function() {
        const menu = document.getElementById('analyticsNavMenu');
        if (menu) {
            menu.classList.toggle('active');
        }
    };

    // Função para inserir a navegação
    function insertNavigation() {
        // Verifica se já existe navegação
        if (document.querySelector('.analytics-nav')) {
            return;
        }

        // Adiciona CSS
        document.head.insertAdjacentHTML('beforeend', navigationCSS);

        // Adiciona navegação no topo da página
        const navigationHTML = generateNavigationHTML();
        const breadcrumbHTML = generateBreadcrumb();
        
        document.body.insertAdjacentHTML('afterbegin', navigationHTML + breadcrumbHTML);

        // Adiciona event listeners para mobile
        setupMobileNavigation();
    }

    // Configuração da navegação mobile
    function setupMobileNavigation() {
        // Fecha menu ao clicar fora
        document.addEventListener('click', function(event) {
            const nav = document.querySelector('.analytics-nav');
            const menu = document.getElementById('analyticsNavMenu');
            const toggle = document.querySelector('.analytics-nav-mobile-toggle');
            
            if (nav && menu && toggle) {
                if (!nav.contains(event.target)) {
                    menu.classList.remove('active');
                }
            }
        });

        // Fecha menu ao redimensionar
        window.addEventListener('resize', function() {
            const menu = document.getElementById('analyticsNavMenu');
            if (menu && window.innerWidth > 768) {
                menu.classList.remove('active');
            }
        });
    }

    // Função para destacar link ativo
    function highlightActiveLink() {
        const currentPage = getCurrentPage();
        const links = document.querySelectorAll('.analytics-nav-link');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Função para adicionar informações da página atual
    function addPageInfo() {
        const currentPage = getCurrentPage();
        const page = NAVIGATION_CONFIG.pages.find(p => p.url === currentPage);
        
        if (page && !document.querySelector('.page-info-added')) {
            // Marca que a informação foi adicionada
            document.body.classList.add('page-info-added');
            
            // Adiciona meta informações
            document.title = `${page.name} - ${NAVIGATION_CONFIG.brand.name}`;
            
            // Adiciona descrição se não existir
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.name = 'description';
                metaDescription.content = page.description;
                document.head.appendChild(metaDescription);
            }
        }
    }

    // Inicialização
    function initializeNavigation() {
        // Aguarda DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeNavigation, 50);
            });
            return;
        }

        // Insere navegação
        insertNavigation();
        
        // Destacar link ativo
        highlightActiveLink();
        
        // Adicionar informações da página
        addPageInfo();
        
        console.log('📊 Analytics Navigation initialized successfully');
    }

    // Exposição global para uso manual
    window.analyticsNavigation = {
        init: initializeNavigation,
        toggle: window.toggleMobileMenu,
        getCurrentPage: getCurrentPage
    };

    // Auto-inicialização
    initializeNavigation();

})();