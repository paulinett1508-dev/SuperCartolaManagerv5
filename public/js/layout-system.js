// Sistema de Layout Hierárquico
class LayoutSystem {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.ligaId = new URLSearchParams(window.location.search).get('id');
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'painel.html';
        return filename.replace('.html', '');
    }

    async init() {
        await this.loadLayout();
        this.updatePageInfo();
        this.updateBreadcrumb();
        this.setActiveNavigation();
        await this.loadSidebarData();
    }

    async loadLayout() {
        try {
            // Criar estrutura base se não existir
            if (!document.querySelector('.app-container')) {
                const body = document.body;
                body.innerHTML = `
                    <div class="app-container">
                        <aside class="app-sidebar" id="appSidebar">
                            ${this.getSidebarHtml()}
                        </aside>
                        <main class="app-main">
                            <header class="page-header">
                                <nav class="breadcrumb" id="breadcrumb"></nav>
                                <h1 class="page-title" id="pageTitle">Dashboard</h1>
                                <p class="page-subtitle" id="pageSubtitle">Visão geral do sistema</p>
                            </header>
                            <div class="page-content" id="pageContent">
                                ${body.innerHTML}
                            </div>
                        </main>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar layout:', error);
        }
    }

    getSidebarHtml() {
        return `
            <div class="sidebar-logo">
                <h2><span class="material-symbols-outlined" style="vertical-align: middle; color: #ffd700;">emoji_events</span> Super Cartola Manager</h2>
            </div>

            <div class="sidebar-section">
                <h3>Navegação</h3>
                <ul class="sidebar-menu">
                    <li><a href="painel.html" data-nav="dashboard"><span class="icon material-symbols-outlined">bar_chart</span>Dashboard</a></li>
                    <li><a href="criar-liga.html" data-nav="criar-liga"><span class="icon material-symbols-outlined">add</span>Criar Liga</a></li>
                    <li><a href="buscar-times.html" data-nav="buscar-times"><span class="icon material-symbols-outlined">search</span>Buscar Times</a></li>
                    <li><a href="painel.html" data-nav="admin"><span class="icon material-symbols-outlined">settings</span>Administração</a></li>
                </ul>
            </div>

            <div class="sidebar-section">
                <h3>Ligas Disponíveis</h3>
                <div id="ligasContainer">
                    <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6); font-size: 12px;">
                        Carregando ligas...
                    </div>
                </div>
            </div>
        `;
    }

    async loadSidebarData() {
        try {
            const response = await fetch('/api/ligas');
            const ligas = await response.json();
            this.renderLigasInSidebar(ligas);
        } catch (error) {
            console.error('Erro ao carregar ligas:', error);
            const container = document.getElementById('ligasContainer');
            if (container) {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6); font-size: 12px;">Erro ao carregar ligas</div>';
            }
        }
    }

    renderLigasInSidebar(ligas) {
        const container = document.getElementById('ligasContainer');
        if (!container) return;

        if (ligas.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6); font-size: 12px;">Nenhuma liga encontrada</div>';
            return;
        }

        const ligasHtml = ligas.map(liga => `
            <div class="liga-item">
                <h4>${liga.nome}</h4>
                <p>ID: ${liga._id.substring(0, 8)}...</p>
                <p>Times: ${liga.times ? liga.times.length : 0}</p>
                <div class="liga-actions">
                    <a href="detalhe-liga.html?id=${liga._id}"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">visibility</span> Ver</a>
                    <a href="editar-liga.html?id=${liga._id}"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">edit</span> Editar</a>
                    <a href="ferramentas-rodadas.html?id=${liga._id}"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">settings</span> Rodadas</a>
                </div>
            </div>
        `).join('');

        container.innerHTML = ligasHtml;
    }

    setActiveNavigation() {
        // Remove active de todos os links
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });

        // Adiciona active ao link atual
        const currentNav = document.querySelector(`[data-nav="${this.currentPage}"]`);
        if (currentNav) {
            currentNav.classList.add('active');
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        let breadcrumbHtml = '<a href="painel.html">Dashboard</a>';

        const pageMap = {
            'criar-liga': 'Criar Liga',
            'buscar-times': 'Buscar Times',
            'admin': 'Administração',
            'detalhe-liga': 'Detalhes da Liga',
            'editar-liga': 'Editar Liga',
            'parciais': 'Resultados Parciais'
        };

        if (this.currentPage !== 'painel') {
            breadcrumbHtml += ' <span class="separator">›</span> ';

            if (this.ligaId && ['detalhe-liga', 'editar-liga', 'admin', 'parciais'].includes(this.currentPage)) {
                breadcrumbHtml += '<a href="painel.html">Ligas</a> <span class="separator">›</span> ';
            }

            breadcrumbHtml += `<span class="current">${pageMap[this.currentPage] || this.currentPage}</span>`;
        }

        breadcrumb.innerHTML = breadcrumbHtml;
    }

    updatePageInfo() {
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');

        if (!pageTitle || !pageSubtitle) return;

        const pageInfo = {
            'painel': {
                title: 'Dashboard Geral',
                subtitle: 'Visão geral das suas ligas e estatísticas'
            },
            'criar-liga': {
                title: 'Criar Nova Liga',
                subtitle: 'Configure uma nova liga do Cartola FC'
            },
            'buscar-times': {
                title: 'Buscar Times',
                subtitle: 'Encontre times do Cartola FC'
            },
            'admin': {
                title: this.ligaId ? 'Administração da Liga' : 'Administração',
                subtitle: this.ligaId ? 'Gerencie participantes e configurações' : 'Ferramentas administrativas'
            },
            'detalhe-liga': {
                title: 'Detalhes da Liga',
                subtitle: 'Informações completas e estatísticas'
            },
            'editar-liga': {
                title: 'Editar Liga',
                subtitle: 'Modifique as configurações da liga'
            },
            'parciais': {
                title: 'Resultados Parciais',
                subtitle: 'Acompanhe os resultados em tempo real'
            }
        };

        const info = pageInfo[this.currentPage] || pageInfo['painel'];
        pageTitle.textContent = info.title;
        pageSubtitle.textContent = info.subtitle;
    }
}

// Função para inicializar o layout em qualquer página
window.initLayout = async function() {
    const layout = new LayoutSystem();
    await layout.init();
    return layout;
};

// Auto-inicializar se não for o dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('painel.html')) {
        window.initLayout();
    }

    // Event listeners dos botões de exportação
    document.getElementById("btn-exportar-consolidado")?.addEventListener("click", () => {
      console.log("Exportar consolidado - funcionalidade futura");
    });

    // Limpar cache
    document.getElementById("btn-limpar-cache")?.addEventListener("click", async () => {
      const confirmou = await SuperModal.confirm({
        title: 'Limpar Cache',
        message: 'Tem certeza que deseja limpar todo o cache? Isso pode deixar o carregamento mais lento temporariamente.',
        variant: 'danger',
        confirmText: 'Limpar Cache'
      });
      if (confirmou) {
        await window.cacheManager.clearAll();
        SuperModal.toast.success("Cache limpo com sucesso! Recarregando a página...");
        setTimeout(() => location.reload(), 1000);
      }
    });
});