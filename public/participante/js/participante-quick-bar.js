// =====================================================================
// QUICK ACCESS BAR v2.8 - Menu Dinâmico + Ao Vivo Robusto
// =====================================================================
// 4 botões: Início (home), Ranking, Menu (sheet), Financeiro
// GPU-accelerated, 60fps guaranteed, DOM caching
// v2.8: Fix "Ao Vivo" - polling robusto aguarda selecionarRodada (até 3s)
// v2.7: Módulo inicial agora é "home" (temporada 2026 em andamento - rodada 1+)
// v2.6: Botão "Ao Vivo" funcional - navega para rodadas com parciais
// v2.5: Menu dinâmico baseado em modulosAtivos e isLigaEstreante
//       - Hall da Fama oculto para ligas estreantes
//       - Módulos não configurados mostram "Aguarde"
// v2.2: Aguarda splash fechar antes de renderizar (evita conflito)
// =====================================================================

if (window.Log) Log.info('QUICK-BAR', '🚀 Carregando Quick Access Bar v2.7...');

class QuickAccessBar {
    constructor() {
        this.menuAberto = false;
        this.modulosAtivos = {};
        // ✅ v2.7: Módulo inicial agora é "home" (temporada 2026 em andamento)
        this.moduloAtual = 'home';

        // DOM Cache - populated on render
        this._dom = {
            bottomNav: null,
            menuOverlay: null,
            menuSheet: null,
            menuButton: null,
            navItems: null
        };

        this.statusMercado = null;
        this.mercadoAberto = false;
        this._ultimaStatusAtualizado = 0;

        // Touch state
        this._touchStartY = 0;
        this._isAnimating = false;
    }

    async inicializar() {
        if (window.Log) Log.info('QUICK-BAR', 'Inicializando...');

        // ✅ v2.2: Aguardar splash fechar na primeira visita
        await this.aguardarSplashFechar();

        await this.aguardarNavegacao();
        await this.carregarModulosAtivos();

        this.renderizar();
        this.cacheDOM();
        this.configurarEventos();

        if (window.Log) Log.info('QUICK-BAR', '✅ Quick Access Bar v2.2 pronta');
    }

    /**
     * ✅ v2.2: Aguarda splash fechar antes de renderizar a barra
     * Evita conflito visual onde a barra aparece por cima da splash
     */
    async aguardarSplashFechar() {
        const STORAGE_KEY = 'participante_app_loaded';
        const isReload = sessionStorage.getItem(STORAGE_KEY);

        // Em reload, splash não aparece - continuar imediatamente
        if (isReload) {
            if (window.Log) Log.debug('QUICK-BAR', 'Reload detectado - inicializando imediatamente');
            return;
        }

        // Primeira visita: aguardar splash fechar
        if (window.Log) Log.info('QUICK-BAR', 'Primeira visita - aguardando splash fechar...');

        return new Promise((resolve) => {
            // Verificar se SplashScreen existe e está visível
            const checkSplash = () => {
                // Se SplashScreen não existe ou não está visível, continuar
                if (!window.SplashScreen || !window.SplashScreen.isVisible) {
                    if (window.Log) Log.debug('QUICK-BAR', 'Splash fechou - continuando inicialização');
                    resolve();
                    return true;
                }
                return false;
            };

            // Verificar imediatamente
            if (checkSplash()) return;

            // Polling a cada 100ms até splash fechar (max 8s)
            const interval = setInterval(() => {
                if (checkSplash()) {
                    clearInterval(interval);
                }
            }, 100);

            // Timeout de segurança (8s)
            setTimeout(() => {
                clearInterval(interval);
                if (window.Log) Log.warn('QUICK-BAR', 'Timeout aguardando splash - forçando inicialização');
                resolve();
            }, 8000);
        });
    }

    async aguardarNavegacao() {
        if (window.participanteNav) return;

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
            }, 3000);
        });
    }

    async carregarModulosAtivos() {
        if (window.participanteNav?.modulosAtivos) {
            this.modulosAtivos = window.participanteNav.modulosAtivos;
        }
    }

    async atualizarStatusMercado(force = false) {
        const agora = Date.now();
        if (
            !force &&
            this._ultimaStatusAtualizado &&
            agora - this._ultimaStatusAtualizado < 60000
        ) {
            return this.statusMercado;
        }

        let sucesso = false;
        try {
            const response = await fetch('/api/cartola/mercado/status');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const status = await response.json();
            this.statusMercado = status;
            this.mercadoAberto = status?.status_mercado === 1;
            sucesso = true;
            return status;
        } catch (error) {
            if (window.Log) Log.warn('QUICK-BAR', 'Erro ao carregar status do mercado', error);
            return this.statusMercado;
        } finally {
            if (sucesso) {
                this._ultimaStatusAtualizado = agora;
            }
        }
    }

    renderizar() {
        // Skip if already rendered
        if (document.querySelector('.bottom-nav')) {
            if (window.Log) Log.warn('QUICK-BAR', 'Já existe');
            return;
        }

        // Create fragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        // Menu Overlay
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        fragment.appendChild(menuOverlay);

        // Menu Sheet (lazy content - rendered on first open)
        const menuSheet = document.createElement('div');
        menuSheet.className = 'menu-sheet';
        menuSheet.id = 'menuSheet';
        menuSheet.innerHTML = '<div class="menu-handle"></div>';
        fragment.appendChild(menuSheet);

        // Bottom Navigation
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = `
            <div class="nav-container">
                <button class="nav-item active" data-page="home" type="button" aria-current="page">
                    <span class="material-icons nav-icon">home</span>
                    <span class="nav-label">Início</span>
                </button>
                <button class="nav-item" data-page="ranking" type="button">
                    <span class="material-icons nav-icon">trending_up</span>
                    <span class="nav-label">Ranking Geral</span>
                </button>
                <button class="nav-item" data-page="menu" id="menuButton" type="button">
                    <span class="material-icons nav-icon">apps</span>
                    <span class="nav-label">Menu</span>
                </button>
                <button class="nav-item" data-page="extrato" type="button">
                    <span class="material-icons nav-icon">account_balance_wallet</span>
                    <span class="nav-label">Financeiro</span>
                </button>
            </div>
        `;
        fragment.appendChild(bottomNav);

        // Single DOM insertion
        document.body.appendChild(fragment);

        if (window.Log) Log.debug('QUICK-BAR', '✅ Renderizado');
    }

    cacheDOM() {
        this._dom.bottomNav = document.querySelector('.bottom-nav');
        this._dom.menuOverlay = document.getElementById('menuOverlay');
        this._dom.menuSheet = document.getElementById('menuSheet');
        this._dom.menuButton = document.getElementById('menuButton');
        this._dom.navItems = document.querySelectorAll('.nav-item');
    }

    /**
     * ✅ v2.5: Menu dinâmico baseado em modulosAtivos e isLigaEstreante
     * - Módulos base (extrato, ranking, rodadas) sempre visíveis
     * - historico (Hall da Fama) oculto para ligas estreantes
     * - Módulos opcionais não configurados mostram badge "Aguarde"
     */
    renderizarMenuContent() {
        const modulosAtivos = this.modulosAtivos || {};
        const isLigaEstreante = window.isLigaEstreante || false;

        // Módulos base sempre visíveis (configurações agora está no header da tela Início)
        const modulosBase = ['extrato', 'ranking', 'rodadas'];

        // Helper: verifica se módulo está ativo
        const isAtivo = (configKey) => {
            if (modulosBase.includes(configKey)) return true;
            return modulosAtivos[configKey] === true;
        };

        // Helper: verifica se módulo base está em manutenção (admin desativou)
        // ✅ v4.10: Premium bypass - participantes premium veem módulos normalmente
        const isPremium = window.participanteNav?._isPremium === true;
        const isEmManutencao = (configKey) => {
            if (isPremium) return false;
            return modulosBase.includes(configKey) && modulosAtivos[configKey] === false;
        };

        // Helper: renderiza card do módulo
        const renderCard = (moduleId, configKey, icon, label) => {
            const manutencao = isEmManutencao(configKey);
            const ativo = isAtivo(configKey);
            const aguarde = !ativo && !manutencao;

            if (manutencao) {
                return `
                    <div class="menu-card manutencao"
                         data-module="${moduleId}"
                         data-disabled="true"
                         data-disabled-message="O módulo ${label} está em manutenção."
                         style="opacity:0.45;filter:grayscale(0.5)">
                        <span class="material-icons">${icon}</span>
                        <span class="menu-card-label">${label}</span>
                        <span class="badge-aguarde" style="background:rgba(255,85,0,0.2);color:var(--app-primary)">Em manutenção</span>
                    </div>
                `;
            }

            return `
                <div class="menu-card${aguarde ? ' aguarde' : ''}"
                     data-module="${moduleId}"
                     ${aguarde ? 'data-action="aguarde-config"' : ''}>
                    <span class="material-icons">${icon}</span>
                    <span class="menu-card-label">${label}</span>
                    ${aguarde ? '<span class="badge-aguarde">Aguarde</span>' : ''}
                </div>
            `;
        };

        const escapeAttr = (value) =>
            String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;');
        const mercadoAberto = this.mercadoAberto === true;
        const aoVivoMessageEnabled = 'Acompanhar a rodada atual em tempo real.';
        const aoVivoMessageDisabled = 'Ao Vivo só fica ativo quando o mercado estiver fechado e a rodada estiver em andamento.';
        const aoVivoTooltip = mercadoAberto ? aoVivoMessageDisabled : aoVivoMessageEnabled;
        const aoVivoAttributes = [
            'data-action="ao-vivo"',
            `title="${escapeAttr(aoVivoTooltip)}"`,
            `aria-label="${escapeAttr(aoVivoTooltip)}"`,
            `aria-disabled="${mercadoAberto ? 'true' : 'false'}"`
        ];
        if (mercadoAberto) {
            aoVivoAttributes.push('data-disabled="true"');
            aoVivoAttributes.push(`data-disabled-message="${escapeAttr(aoVivoMessageDisabled)}"`);
        }

        // Hall da Fama: ocultar completamente para ligas estreantes
        const hallDaFamaCard = isLigaEstreante ? '' : `
            <div class="menu-card" data-module="historico">
                <span class="material-icons">history</span>
                <span class="menu-card-label">Hall da Fama</span>
            </div>
        `;

        return `
            <div class="menu-handle"></div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">emoji_events</span>
                    Competições
                </div>
                <div class="menu-grid">
                    <div class="menu-card" data-module="rodadas">
                        <span class="material-icons">view_week</span>
                        <span class="menu-card-label">Rodadas</span>
                    </div>
                    <div class="menu-card ao-vivo-card${mercadoAberto ? ' desativado' : ''}"
                         ${aoVivoAttributes.join(' ')}>
                        <span class="material-icons">sensors</span>
                        <span class="menu-card-label">Ao Vivo</span>
                        <span class="live-indicator"></span>
                    </div>
                    ${renderCard('pontos-corridos', 'pontosCorridos', 'format_list_numbered', 'Pontos Corridos')}
                    ${renderCard('mata-mata', 'mataMata', 'military_tech', 'Mata-Mata')}
                    ${renderCard('top10', 'top10', 'leaderboard', 'TOP 10')}
                    ${renderCard('campinho', 'campinho', 'sports_soccer', 'Meu Time da Rodada')}
                </div>
            </div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">workspace_premium</span>
                    Prêmios & Estatísticas
                </div>
                <div class="menu-grid">
                    ${renderCard('artilheiro', 'artilheiro', 'sports_soccer', 'Artilheiro')}
                    ${renderCard('luva-ouro', 'luvaOuro', 'sports_handball', 'Luva de Ouro')}
                    ${renderCard('capitao', 'capitaoLuxo', 'emoji_events', 'Capitão de Luxo')}
                    ${renderCard('melhor-mes', 'melhorMes', 'calendar_month', 'Melhor do Mês')}
                    ${hallDaFamaCard}
                </div>
            </div>

            <div class="menu-category">
                <div class="menu-category-title">
                    <span class="material-icons">upcoming</span>
                    Em Breve
                </div>
                <div class="menu-grid">
                    <div class="menu-card copa-times-card" data-module="copa-times-sc">
                        <span class="material-icons" style="color: var(--app-gold);">emoji_events</span>
                        <span class="menu-card-label">Copa de Times SC</span>
                        <span class="badge-aguarde" style="background:rgba(255,215,0,0.2);color:var(--app-gold);border:1px solid var(--app-gold);padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;">EM BREVE</span>
                    </div>
                    <div class="menu-card disabled" data-action="em-breve">
                        <span class="material-icons">sports</span>
                        <span class="menu-card-label">Bolão Copa</span>
                    </div>
                    <div class="menu-card disabled" data-action="em-breve">
                        <span class="material-icons">stadium</span>
                        <span class="menu-card-label">Bolão Libertadores</span>
                    </div>
                </div>
            </div>
        `;
    }

    configurarEventos() {
        const { menuOverlay, menuSheet, bottomNav } = this._dom;

        // Event Delegation for nav items (single listener)
        if (bottomNav) {
            bottomNav.addEventListener('click', (e) => {
                const navItem = e.target.closest('.nav-item');
                if (!navItem) return;

                const page = navItem.dataset.page;
                if (page === 'menu') {
                    this.toggleMenu();
                } else {
                    this.navegarPara(page);
                    this.atualizarNavAtivo(page);
                }
            }, { passive: true });
        }

        // Overlay click
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => this.fecharMenu(), { passive: true });
        }

        // Menu sheet - Event Delegation + Swipe
        if (menuSheet) {
            // Click delegation for menu cards
            menuSheet.addEventListener('click', (e) => {
                const card = e.target.closest('.menu-card');
                const handle = e.target.closest('.menu-handle');

                if (handle) {
                    this.fecharMenu();
                    return;
                }

                if (!card) return;

                const module = card.dataset.module;
                const action = card.dataset.action;
                if (card.dataset.disabled === 'true') {
                    const message =
                        card.dataset.disabledMessage ||
                        'Ao Vivo só fica ativo quando o mercado estiver fechado.';
                    this.mostrarToast(message, 'info');
                    return;
                }

                if (action === 'em-breve') {
                    this.mostrarToast('Em breve!');
                    return;
                }

                // ✅ v2.6: Ao Vivo - navega para rodadas e seleciona rodada atual
                if (action === 'ao-vivo') {
                    this.navegarParaAoVivo();
                    return;
                }

                // ✅ v2.5: Módulo não configurado pelo admin
                if (action === 'aguarde-config') {
                    this.mostrarModalAguardeConfig(module);
                    return;
                }

                if (module) {
                    this.fecharMenu();
                    this.navegarPara(module);
                    // Clear nav active states
                    this._dom.navItems.forEach(nav => nav.classList.remove('active'));
                }
            }, { passive: true });

            // Swipe down to close
            menuSheet.addEventListener('touchstart', (e) => {
                this._touchStartY = e.touches[0].clientY;
            }, { passive: true });

            menuSheet.addEventListener('touchend', (e) => {
                const deltaY = e.changedTouches[0].clientY - this._touchStartY;
                if (deltaY > 60) {
                    this.fecharMenu();
                }
            }, { passive: true });
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuAberto) {
                this.fecharMenu();
            }
        });

        if (window.Log) Log.debug('QUICK-BAR', '✅ Eventos configurados');
    }

    toggleMenu() {
        if (this._isAnimating) return;
        this.menuAberto ? this.fecharMenu() : this.abrirMenu();
    }

    /**
     * ✅ v2.9: Recarrega modulosAtivos do backend via participanteNav
     * Garante que o menu sempre mostra o estado real dos módulos.
     */
    async _refreshModulosAtivos() {
        if (window.participanteNav?.refreshModulosAtivos) {
            await window.participanteNav.refreshModulosAtivos();
            this.modulosAtivos = window.participanteNav.modulosAtivos;
        }
    }

    async abrirMenu() {
        if (this._isAnimating) return;
        this._isAnimating = true;

        const { menuOverlay, menuSheet } = this._dom;

        // ✅ v2.9: Atualizar status do mercado e módulos ativos em paralelo
        try {
            await Promise.all([
                this.atualizarStatusMercado(),
                this._refreshModulosAtivos()
            ]);
        } catch (error) {
            if (window.Log) Log.warn('QUICK-BAR', 'Erro ao atualizar dados antes do menu', error);
        }

        if (menuSheet) {
            menuSheet.innerHTML = this.renderizarMenuContent();
        }

        // Use RAF for smooth animation start
        requestAnimationFrame(() => {
            if (menuOverlay) menuOverlay.classList.add('visible');
            if (menuSheet) menuSheet.classList.add('visible');
            this.menuAberto = true;

            setTimeout(() => {
                this._isAnimating = false;
            }, 350);
        });
    }

    fecharMenu() {
        if (this._isAnimating) return;
        this._isAnimating = true;

        const { menuOverlay, menuSheet } = this._dom;

        requestAnimationFrame(() => {
            if (menuOverlay) menuOverlay.classList.remove('visible');
            if (menuSheet) menuSheet.classList.remove('visible');
            this.menuAberto = false;

            setTimeout(() => {
                this._isAnimating = false;
            }, 350);
        });
    }

    navegarPara(modulo) {
        if (window.participanteNav) {
            window.participanteNav.navegarPara(modulo);
            this.moduloAtual = modulo;
        }
    }

    /**
     * ✅ v2.8: Navegar para módulo de rodadas e abrir rodada atual (parciais)
     * Usa polling robusto para aguardar selecionarRodada estar disponível
     */
    async navegarParaAoVivo() {
        this.fecharMenu();

        try {
            const status =
                (await this.atualizarStatusMercado(true)) ||
                this.statusMercado ||
                { status_mercado: 2 };

            if (window.Log) Log.info('QUICK-BAR', 'Status mercado:', status);

            const rodadaEmAndamento = status.status_mercado === 2 || status.bola_rolando;

            if (!rodadaEmAndamento) {
                this.mostrarToast('Nenhuma rodada em andamento no momento', 'info');
                // Navegar para rodadas mesmo assim
                this.navegarPara('rodadas');
                return;
            }

            // Navegar para rodadas
            this.navegarPara('rodadas');
            this._dom.navItems.forEach(nav => nav.classList.remove('active'));

            // ✅ v2.8: Polling robusto - aguarda função estar disponível (max 3s)
            const rodadaAtual = status.rodada_atual;
            const maxTentativas = 15; // 15 x 200ms = 3 segundos
            let tentativa = 0;

            const tentarSelecionarRodada = () => {
                tentativa++;

                // Tentar selecionar a rodada atual via função global
                if (typeof window.selecionarRodada === 'function') {
                    window.selecionarRodada(rodadaAtual, true);
                    if (window.Log) Log.info('QUICK-BAR', `✅ Selecionando rodada ${rodadaAtual} (ao vivo) - tentativa ${tentativa}`);
                    this.mostrarToast(`Rodada ${rodadaAtual} - Ao Vivo`, 'success');
                    return;
                }

                if (typeof window.RodadasModule?.selecionarRodada === 'function') {
                    window.RodadasModule.selecionarRodada(rodadaAtual, true);
                    if (window.Log) Log.info('QUICK-BAR', `✅ RodadasModule.selecionarRodada rodada ${rodadaAtual}`);
                    this.mostrarToast(`Rodada ${rodadaAtual} - Ao Vivo`, 'success');
                    return;
                }

                // Se não encontrou a função, tentar novamente ou usar fallback
                if (tentativa < maxTentativas) {
                    if (window.Log) Log.debug('QUICK-BAR', `Aguardando selecionarRodada... (${tentativa}/${maxTentativas})`);
                    setTimeout(tentarSelecionarRodada, 200);
                } else {
                    // Fallback final: clicar no card da rodada atual
                    if (window.Log) Log.warn('QUICK-BAR', 'selecionarRodada não encontrada, usando fallback de click');
                    const rodadaCard = document.querySelector(`[data-rodada="${rodadaAtual}"]`);
                    if (rodadaCard) {
                        rodadaCard.click();
                        this.mostrarToast(`Rodada ${rodadaAtual} - Ao Vivo`, 'success');
                    } else {
                        this.mostrarToast('Rodada carregada', 'info');
                    }
                }
            };

            // Iniciar polling após pequeno delay inicial (200ms)
            setTimeout(tentarSelecionarRodada, 200);

        } catch (error) {
            if (window.Log) Log.error('QUICK-BAR', 'Erro ao buscar status:', error);
            this.mostrarToast('Erro ao verificar status da rodada', 'warning');
            this.navegarPara('rodadas');
        }
    }

    atualizarNavAtivo(page) {
        this._dom.navItems.forEach(item => {
            const isActive = item.dataset.page === page;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    mostrarToast(mensagem, tipo = 'info') {
        // Remove existing
        const existente = document.querySelector('.quick-toast');
        if (existente) existente.remove();

        const toast = document.createElement('div');
        toast.className = 'quick-toast';

        // Configuracao por tipo
        const configs = {
            info: { icone: 'info', cor: 'var(--app-info)', duracao: 2500 },
            success: { icone: 'check_circle', cor: 'var(--app-success-light)', duracao: 2500 },
            warning: { icone: 'warning', cor: 'var(--app-amber)', duracao: 3500 },
            urgente: { icone: 'alarm', cor: 'var(--app-pos-gol)', duracao: 4500 },
            critico: { icone: 'alarm_on', cor: 'var(--app-danger)', duracao: 5500 }
        };
        const config = configs[tipo] || configs.info;

        // Adicionar classe de tipo para estilos customizados
        toast.classList.add(`toast-${tipo}`);

        toast.innerHTML = `
            <span class="material-icons" style="color: ${config.cor}">${config.icone}</span>
            <span>${mensagem}</span>
        `;

        document.body.appendChild(toast);

        // RAF for animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        // Auto hide com duracao variavel por tipo
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, config.duracao);
    }

    atualizarModulosAtivos(modulosAtivos) {
        this.modulosAtivos = modulosAtivos;
        if (window.Log) Log.debug('QUICK-BAR', 'Módulos atualizados');

        // v4.7: Aplicar/remover visual de manutenção nos botões da bottom nav
        // ✅ v4.10: Premium bypass - sem visual de manutenção para premium
        const isPremiumNav = window.participanteNav?._isPremium === true;
        const modulosBase = ['extrato', 'ranking', 'rodadas'];
        modulosBase.forEach(key => {
            const btn = document.querySelector(`.nav-item[data-page="${key}"]`);
            if (!btn) return;
            if (modulosAtivos[key] === false && !isPremiumNav) {
                btn.style.opacity = '0.35';
                btn.style.filter = 'grayscale(0.5)';
            } else {
                btn.style.opacity = '';
                btn.style.filter = '';
            }
        });
        // ✅ v2.9: Removido renderizarMenuContent() que era no-op (descartava HTML).
        // O menu é re-renderizado de fato em abrirMenu() a cada abertura.
    }

    /**
     * ✅ v2.5: Modal para módulos não configurados pelo admin
     */
    mostrarModalAguardeConfig(moduloId) {
        const nomesModulos = {
            'pontos-corridos': 'Pontos Corridos',
            'mata-mata': 'Mata-Mata',
            'top10': 'TOP 10',
            'melhor-mes': 'Melhor do Mês',
            'artilheiro': 'Artilheiro',
            'luva-ouro': 'Luva de Ouro',
            'campinho': 'Meu Time da Rodada',
            'dicas': 'Dicas'
        };

        const nomeModulo = nomesModulos[moduloId] || moduloId;

        // Verificar se já existe modal no DOM
        let modal = document.getElementById('modal-aguarde-config');
        if (!modal) {
            // Criar modal
            modal = document.createElement('div');
            modal.id = 'modal-aguarde-config';
            modal.className = 'fixed inset-0 flex items-center justify-center z-[99999999] px-4';
            modal.style.background = 'rgba(0,0,0,0.85)';
            modal.style.backdropFilter = 'blur(8px)';
            modal.innerHTML = `
                <div class="bg-gray-900 rounded-2xl p-6 max-w-xs w-full text-center border border-gray-700/50 shadow-2xl">
                    <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <span class="material-icons text-3xl text-amber-500">hourglass_empty</span>
                    </div>
                    <h3 id="aguarde-titulo" class="text-lg font-bold text-white mb-2" style="font-family: 'Russo One', sans-serif;">
                        ${nomeModulo}
                    </h3>
                    <p class="text-gray-400 text-sm mb-5">
                        Aguarde o administrador<br>configurar este módulo
                    </p>
                    <button onclick="document.getElementById('modal-aguarde-config').remove()"
                            class="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors">
                        Entendi
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            // Atualizar título e mostrar
            const titulo = modal.querySelector('#aguarde-titulo');
            if (titulo) titulo.textContent = nomeModulo;
            modal.classList.remove('hidden');
        }

        // Click fora fecha
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        }, { once: true });

        if (window.Log) Log.debug('QUICK-BAR', `Modal "Aguarde" exibido para: ${moduloId}`);
    }
}

// Singleton instance
const quickAccessBar = new QuickAccessBar();

// Global exports
window.quickAccessBar = quickAccessBar;
window.QuickBar = quickAccessBar;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => quickAccessBar.inicializar());
} else {
    quickAccessBar.inicializar();
}

if (window.Log) Log.info('QUICK-BAR', '✅ v2.8 carregado (Ao Vivo robusto)');
