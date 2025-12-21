// =====================================================================
// QUICK ACCESS BAR - Sistema de Navegação Expansível
// =====================================================================
// Funcionalidades:
// - 5 botões fixos (Competições, Financeiro, Bolões, Meu Time, Ao Vivo)
// - Painel expansível com grid de módulos por categorias
// - Integração com sistema de navegação existente
// - Toasts de feedback
// - Gestures (swipe, overlay click)
// =====================================================================

if (window.Log) Log.info('QUICK-BAR', '🚀 Carregando Quick Access Bar...');

class QuickAccessBar {
    constructor() {
        this.painelAberto = false;
        this.categoriaAtual = null;
        this.modulosAtivos = {};
        
        // Configuração de categorias e módulos
        this.config = {
            competicoes: {
                title: "Competições",
                icon: "sports_score",
                modules: [
                    { id: "rodadas", icon: "target", label: "Rodadas", config: "rodadas" },
                    { id: "pontos-corridos", icon: "sync", label: "Pontos Corridos", config: "pontosCorridos" },
                    { id: "mata-mata", icon: "military_tech", label: "Mata-Mata", config: "mataMata" },
                    { id: "top10", icon: "format_list_numbered", label: "Top 10", config: "top10" }
                ]
            },
            financeiro: {
                title: "Financeiro",
                icon: "payments",
                modules: [
                    { id: "extrato", icon: "receipt_long", label: "Extrato", config: "extrato" },
                    { id: "ranking", icon: "leaderboard", label: "Ranking", config: "ranking" }
                ]
            },
            premiacoes: {
                title: "Premiações",
                icon: "workspace_premium",
                modules: [
                    { id: "melhor-mes", icon: "calendar_month", label: "Melhor do Mês", config: "melhorMes" },
                    { id: "artilheiro", icon: "sports_soccer", label: "Artilheiro", config: "artilheiro" },
                    { id: "luva-ouro", icon: "front_hand", label: "Luva de Ouro", config: "luvaOuro" },
                    { id: "historico", icon: "emoji_events", label: "Hall da Fama", config: "historico" }
                ]
            },
            boloes: {
                title: "Bolões",
                icon: "sports_soccer",
                modules: [
                    { id: "bolao-copa", icon: "emoji_events", label: "Bolão Copa", placeholder: true },
                    { id: "bolao-liberta", icon: "emoji_events", label: "Bolão Libertadores", placeholder: true }
                ]
            },
            meuTime: {
                title: "Meu Time",
                icon: "shield",
                modules: [
                    { id: "boas-vindas", icon: "home", label: "Início", config: "extrato" }
                ]
            }
        };

        // Controles de gesture
        this._touchStartY = 0;
        this._touchEndY = 0;
    }

    async inicializar() {
        if (window.Log) Log.info('QUICK-BAR', 'Inicializando Quick Access Bar...');
        
        await this.aguardarNavegacao();
        await this.carregarModulosAtivos();
        
        this.renderizar();
        this.configurarEventos();
        
        if (window.Log) Log.info('QUICK-BAR', '✅ Quick Access Bar pronta');
    }

    async aguardarNavegacao() {
        // Aguardar sistema de navegação estar pronto
        if (window.participanteNav) {
            return;
        }

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (window.participanteNav) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        });
    }

    async carregarModulosAtivos() {
        // Obter módulos ativos da liga atual
        if (window.participanteNav && window.participanteNav.modulosAtivos) {
            this.modulosAtivos = window.participanteNav.modulosAtivos;
            if (window.Log) Log.debug('QUICK-BAR', 'Módulos ativos carregados:', this.modulosAtivos);
        }
    }

    renderizar() {
        // Verificar se já existe
        if (document.querySelector('.quick-access-bar')) {
            if (window.Log) Log.warn('QUICK-BAR', 'Quick Bar já existe, não renderizar novamente');
            return;
        }

        const quickBar = document.createElement('div');
        quickBar.className = 'quick-access-bar';
        quickBar.innerHTML = `
            <!-- Overlay -->
            <div class="quick-bar-overlay" id="quickBarOverlay"></div>
            
            <!-- Painel Expansível -->
            <div class="quick-bar-panel" id="quickBarPanel">
                <div class="quick-bar-handle" id="quickBarHandle"></div>
                <div class="quick-bar-categories" id="quickBarCategories">
                    <!-- Categorias serão renderizadas aqui -->
                </div>
            </div>
            
            <!-- Botões Fixos -->
            <div class="quick-bar-buttons">
                <button class="quick-btn" data-category="competicoes">
                    <span class="material-icons">emoji_events</span>
                    <span class="quick-btn-label">Competições</span>
                </button>
                
                <button class="quick-btn" data-category="financeiro">
                    <span class="material-icons">payments</span>
                    <span class="quick-btn-label">Financeiro</span>
                </button>
                
                <button class="quick-btn" data-category="boloes">
                    <span class="material-icons">sports_soccer</span>
                    <span class="quick-btn-label">Bolões</span>
                </button>
                
                <button class="quick-btn" data-category="meuTime">
                    <span class="material-icons">shield</span>
                    <span class="quick-btn-label">Meu Time</span>
                </button>
                
                <button class="quick-btn quick-btn-live" data-action="ao-vivo">
                    <span class="quick-live-pulse"></span>
                    <span class="material-icons">sensors</span>
                    <span class="quick-btn-label">Ao Vivo</span>
                </button>
            </div>
        `;

        document.body.appendChild(quickBar);
        if (window.Log) Log.debug('QUICK-BAR', '✅ Estrutura HTML renderizada');
    }

    configurarEventos() {
        // Botões fixos
        document.querySelectorAll('.quick-btn[data-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoria = btn.dataset.category;
                this.abrirCategoria(categoria);
            });
        });

        // Botão "Ao Vivo"
        const btnAoVivo = document.querySelector('.quick-btn[data-action="ao-vivo"]');
        if (btnAoVivo) {
            btnAoVivo.addEventListener('click', () => {
                this.mostrarToast('Em breve na temporada 2026', 'info');
            });
        }

        // Overlay - fechar ao clicar
        const overlay = document.getElementById('quickBarOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.fecharPainel();
            });
        }

        // Handle - swipe down para fechar
        const handle = document.getElementById('quickBarHandle');
        if (handle) {
            handle.addEventListener('touchstart', (e) => {
                this._touchStartY = e.touches[0].clientY;
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                this._touchEndY = e.touches[0].clientY;
            }, { passive: true });

            handle.addEventListener('touchend', () => {
                const deltaY = this._touchEndY - this._touchStartY;
                if (deltaY > 50) {
                    this.fecharPainel();
                }
            }, { passive: true });
        }

        if (window.Log) Log.debug('QUICK-BAR', '✅ Eventos configurados');
    }

    abrirCategoria(categoria) {
        if (window.Log) Log.debug('QUICK-BAR', `Abrindo categoria: ${categoria}`);
        
        this.categoriaAtual = categoria;
        this.renderizarCategorias();
        this.abrirPainel();
        
        // Marcar botão como ativo
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.quick-btn[data-category="${categoria}"]`)?.classList.add('active');
    }

    abrirPainel() {
        this.painelAberto = true;
        document.getElementById('quickBarOverlay')?.classList.add('active');
        document.getElementById('quickBarPanel')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    fecharPainel() {
        this.painelAberto = false;
        document.getElementById('quickBarOverlay')?.classList.remove('active');
        document.getElementById('quickBarPanel')?.classList.remove('active');
        document.body.style.overflow = '';
        
        // Desmarcar botão ativo
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    renderizarCategorias() {
        const container = document.getElementById('quickBarCategories');
        if (!container) return;

        let html = '';

        // Renderizar categoria atual + outras relacionadas
        const categoriasParaExibir = this.obterCategoriasParaExibir(this.categoriaAtual);

        categoriasParaExibir.forEach(catKey => {
            const cat = this.config[catKey];
            if (!cat) return;

            html += `
                <div class="quick-category">
                    <h3 class="quick-category-title">
                        <span class="material-icons">${cat.icon}</span>
                        ${cat.title}
                    </h3>
                    <div class="quick-category-grid">
                        ${this.renderizarModulos(cat.modules)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Configurar eventos dos módulos
        this.configurarEventosModulos();
    }

    obterCategoriasParaExibir(categoriaAtual) {
        // Lógica para decidir quais categorias exibir
        if (categoriaAtual === 'competicoes') {
            return ['competicoes', 'premiacoes'];
        } else if (categoriaAtual === 'financeiro') {
            return ['financeiro', 'premiacoes'];
        } else if (categoriaAtual === 'boloes') {
            return ['boloes'];
        } else if (categoriaAtual === 'meuTime') {
            return ['meuTime', 'financeiro'];
        }
        return [categoriaAtual];
    }

    renderizarModulos(modules) {
        return modules.map(mod => {
            const isPlaceholder = mod.placeholder === true;
            const isAtivo = this.verificarModuloAtivo(mod.config);
            const isDisabled = !isPlaceholder && !isAtivo;

            let classes = 'quick-module-item';
            if (isDisabled) classes += ' disabled';
            if (isPlaceholder) classes += ' placeholder';

            return `
                <button class="${classes}" 
                        data-module="${mod.id}" 
                        data-placeholder="${isPlaceholder}"
                        data-config="${mod.config || ''}"
                        ${isDisabled ? 'disabled' : ''}>
                    <div class="quick-module-icon">
                        <span class="material-icons">${mod.icon || 'apps'}</span>
                    </div>
                    <span class="quick-module-label">${mod.label}</span>
                    ${isPlaceholder ? '<span class="quick-module-badge">Em breve</span>' : ''}
                </button>
            `;
        }).join('');
    }

    verificarModuloAtivo(configKey) {
        if (!configKey) return true;
        
        // Módulos base sempre ativos
        const modulosBase = ["extrato", "ranking", "rodadas", "historico"];
        if (modulosBase.includes(configKey)) return true;
        
        // Verificar na configuração da liga
        return this.modulosAtivos[configKey] === true;
    }

    configurarEventosModulos() {
        document.querySelectorAll('.quick-module-item').forEach(item => {
            item.addEventListener('click', () => {
                const moduloId = item.dataset.module;
                const isPlaceholder = item.dataset.placeholder === 'true';
                const isDisabled = item.disabled;

                if (isPlaceholder) {
                    this.mostrarToast('Em breve na temporada 2026', 'info');
                    return;
                }

                if (isDisabled) {
                    this.mostrarToast('Módulo não disponível nesta liga', 'warning');
                    return;
                }

                // Navegar para o módulo
                this.navegarParaModulo(moduloId);
            });
        });
    }

    navegarParaModulo(moduloId) {
        if (window.Log) Log.info('QUICK-BAR', `Navegando para módulo: ${moduloId}`);
        
        // Fechar painel
        this.fecharPainel();
        
        // Aguardar animação e navegar
        setTimeout(() => {
            if (window.participanteNav && window.participanteNav.navegarPara) {
                window.participanteNav.navegarPara(moduloId);
            } else {
                if (window.Log) Log.error('QUICK-BAR', 'Sistema de navegação não disponível');
                this.mostrarToast('Erro ao navegar', 'error');
            }
        }, 200);
    }

    mostrarToast(mensagem, tipo = 'info') {
        // Remover toast anterior se existir
        const toastExistente = document.querySelector('.quick-toast');
        if (toastExistente) {
            toastExistente.remove();
        }

        const icones = {
            info: 'info',
            warning: 'warning',
            error: 'error',
            success: 'check_circle'
        };

        const toast = document.createElement('div');
        toast.className = 'quick-toast';
        toast.innerHTML = `
            <span class="material-icons">${icones[tipo] || 'info'}</span>
            <span>${mensagem}</span>
        `;

        document.body.appendChild(toast);

        // Mostrar
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Esconder após 2.5s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2500);
    }

    // Método público para atualizar módulos ativos (quando trocar de liga)
    atualizarModulosAtivos(modulosAtivos) {
        this.modulosAtivos = modulosAtivos;
        if (window.Log) Log.debug('QUICK-BAR', 'Módulos ativos atualizados:', modulosAtivos);
        
        // Re-renderizar se painel estiver aberto
        if (this.painelAberto && this.categoriaAtual) {
            this.renderizarCategorias();
        }
    }
}

// Instância global
const quickAccessBar = new QuickAccessBar();

// Expor globalmente
window.quickAccessBar = quickAccessBar;
window.QuickBar = quickAccessBar;

// Inicializar após DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        quickAccessBar.inicializar();
    });
} else {
    quickAccessBar.inicializar();
}

if (window.Log) Log.info('QUICK-BAR', '✅ Sistema carregado e pronto');

