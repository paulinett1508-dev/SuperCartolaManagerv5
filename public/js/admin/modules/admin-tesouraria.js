/**
 * ADMIN TESOURARIA - Modulo Financeiro Oficial (SaaS Ready)
 *
 * Dashboard de fechamento financeiro para gestao de caixa da liga.
 * Consolida: Saldo do Sistema (bonus/onus) + Acertos Manuais = Saldo Final
 *
 * @version 3.0.0 - Redesign: Search, Sort, Detail Panel, Expand, CSV
 * @author Product Team
 * @date 2026-02-08
 *
 * CHANGELOG v3.0:
 * - CSS extraido para admin-tesouraria.css (zero _injectStyles)
 * - Search bar com busca em tempo real (nome/time)
 * - Sort buttons (Nome A-Z, Saldo crescente/decrescente)
 * - Detail panel slide-up substitui SuperModal.toast.info
 * - Expand inline para ver breakdown por modulo
 * - Export CSV download
 *
 * CHANGELOG v2.1:
 * - Renomeado 'Ajustes' para 'Ajustes Manuais' (badge 'Aj. Manuais')
 * - Nova coluna 'Acertos' para exibir pagamentos/recebimentos do participante
 */

class AdminTesouraria {
    constructor() {
        this.ligaId = null;
        this.season = '2026';
        this.participantes = [];
        this.filtroStatus = 'todos';
        this.searchTerm = '';
        this.sortMode = 'saldo-asc'; // saldo-asc | saldo-desc | nome-az
        this.container = null;
        this.isLoading = false;

        // Modulos ativos da liga (carregados da API)
        this.modulosAtivos = {
            banco: true,
            pontosCorridos: false,
            mataMata: false,
            top10: true,
            melhorMes: false,
            artilheiro: false,
            luvaOuro: false,
        };

        // Configuracao dos badges financeiros
        this.badgeConfig = {
            banco: { icon: 'casino', label: 'Rodada', color: 'primary' },
            pontosCorridos: { icon: 'emoji_events', label: 'Pt.Corridos', color: 'info' },
            mataMata: { icon: 'sports_mma', label: 'Mata-Mata', color: 'warning' },
            top10: { icon: 'stars', label: 'Top10', color: 'gold' },
            melhorMes: { icon: 'calendar_month', label: 'Melhor Mes', color: 'purple' },
            artilheiro: { icon: 'sports_soccer', label: 'Artilheiro', color: 'success' },
            luvaOuro: { icon: 'sports_handball', label: 'Luva Ouro', color: 'gold' },
            campos: { icon: 'edit_note', label: 'Aj. Manuais', color: 'muted' },
            acertos: { icon: 'payments', label: 'Acertos', color: 'info' },
        };
    }

    // ==========================================================================
    // RENDER PRINCIPAL
    // ==========================================================================

    async render(containerId, ligaId, season = '2026') {
        this.container = document.getElementById(containerId.replace('#', ''));
        this.ligaId = ligaId;
        this.season = season;

        if (!this.container) {
            console.error('[TESOURARIA] Container nao encontrado:', containerId);
            return;
        }

        this.container.innerHTML = this._renderLayout();
        await this._carregarDados();
    }

    _renderLayout() {
        return `
            <div class="tesouraria-module">
                <!-- Header -->
                <div class="tesouraria-header">
                    <div class="header-info">
                        <h2>
                            <span class="material-icons">account_balance</span>
                            Tesouraria ${this.season}
                        </h2>
                        <p>Gestao financeira e fechamento de caixa da liga</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn-icon" onclick="adminTesouraria.recarregar()" title="Atualizar">
                            <span class="material-icons">refresh</span>
                        </button>
                        <button class="btn-secondary-dark" onclick="adminTesouraria.exportarCSV()" title="Exportar CSV">
                            <span class="material-icons">download</span>
                            CSV
                        </button>
                        <button class="btn-secondary-dark" onclick="adminTesouraria.exportarRelatorio()">
                            <span class="material-icons">share</span>
                            WhatsApp
                        </button>
                    </div>
                </div>

                <!-- KPIs -->
                <div class="kpi-grid" id="kpi-container">
                    ${this._renderKPIsLoading()}
                </div>

                <!-- Toolbar: Filtros + Search + Sort -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="filter-group">
                            <label>Temporada</label>
                            <select id="filtro-temporada" onchange="adminTesouraria.mudarTemporada(this.value)">
                                <option value="2025" ${this.season === '2025' ? 'selected' : ''}>2025 (Aposentada)</option>
                                <option value="2026" ${this.season === '2026' ? 'selected' : ''}>2026 (Atual)</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Status</label>
                            <select id="filtro-status" onchange="adminTesouraria.filtrarStatus(this.value)">
                                <option value="todos">Todos</option>
                                <option value="devedores">Devedores</option>
                                <option value="credores">Credores</option>
                                <option value="quitados">Quitados</option>
                            </select>
                        </div>
                        <div class="filter-group search-group">
                            <label>Buscar</label>
                            <span class="material-icons search-icon">search</span>
                            <input type="text" id="search-participante" placeholder="Nome ou time..."
                                   oninput="adminTesouraria.buscar(this.value)" />
                        </div>
                        <div class="filter-group">
                            <label>Ordenar</label>
                            <div class="sort-group">
                                <button class="sort-btn active" data-sort="saldo-asc" onclick="adminTesouraria.ordenar('saldo-asc')" title="Saldo crescente">
                                    <span class="material-icons">arrow_upward</span> Saldo
                                </button>
                                <button class="sort-btn" data-sort="saldo-desc" onclick="adminTesouraria.ordenar('saldo-desc')" title="Saldo decrescente">
                                    <span class="material-icons">arrow_downward</span> Saldo
                                </button>
                                <button class="sort-btn" data-sort="nome-az" onclick="adminTesouraria.ordenar('nome-az')" title="Nome A-Z">
                                    <span class="material-icons">sort_by_alpha</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <span class="participantes-count" id="count-label">
                            <span class="material-icons">people</span>
                            <span id="count-value">--</span> participantes
                        </span>
                    </div>
                </div>

                <!-- Tabela Principal -->
                <div class="table-container" id="tabela-container">
                    ${this._renderTableLoading()}
                </div>
            </div>

            <!-- Detail Panel Overlay (fora do module para z-index) -->
            <div class="tesouraria-detail-overlay" id="tesouraria-detail-overlay" onclick="adminTesouraria.fecharDetalhes(event)">
                <div class="tesouraria-detail-panel" id="tesouraria-detail-panel">
                    <div class="panel-handle"><div class="panel-handle-bar"></div></div>
                    <div class="panel-header" id="detail-panel-header"></div>
                    <div class="panel-body" id="detail-panel-body"></div>
                </div>
            </div>
        `;
    }

    _renderKPIsLoading() {
        const kpis = [
            { icon: 'trending_up', label: 'Total Bonus' },
            { icon: 'trending_down', label: 'Total Onus' },
            { icon: 'account_balance_wallet', label: 'Saldo Geral' },
            { icon: 'warning', label: 'Inadimplentes' }
        ];

        return kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-icon" style="background: rgba(107,114,128,0.2); color: #6b7280">
                    <span class="material-icons">${kpi.icon}</span>
                </div>
                <div class="kpi-content">
                    <span class="kpi-value loading-pulse">R$ --</span>
                    <span class="kpi-label">${kpi.label}</span>
                </div>
            </div>
        `).join('');
    }

    _renderTableLoading() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando dados financeiros...</p>
            </div>
        `;
    }

    // ==========================================================================
    // DATA LOADING
    // ==========================================================================

    async _carregarDados() {
        this.isLoading = true;

        try {
            const response = await fetch(`/api/tesouraria/liga/${this.ligaId}?temporada=${this.season}`);
            const data = await response.json();

            if (!data.success) {
                this._renderErro(data.error || 'Erro ao carregar dados');
                return;
            }

            if (!data.participantes || data.participantes.length === 0) {
                this._renderErro('Nenhum participante encontrado na liga');
                return;
            }

            if (data.modulosAtivos) {
                this.modulosAtivos = data.modulosAtivos;
            }

            this.participantes = data.participantes.map(p => ({
                timeId: p.timeId,
                nome: p.nomeCartola || p.nomeTime || 'Time sem nome',
                nomeTime: p.nomeTime,
                escudo: p.escudo,
                saldoJogo: p.saldoTemporada,
                saldoAcertos: p.saldoAcertos,
                totalPago: p.totalPago,
                totalRecebido: p.totalRecebido,
                saldoFinal: p.saldoFinal,
                situacao: p.situacao,
                quantidadeAcertos: p.quantidadeAcertos,
                breakdown: p.breakdown || {},
            }));

            console.log(`[TESOURARIA] ${this.participantes.length} participantes carregados`);

            this._renderKPIs();
            this._renderTabela();
            this._atualizarContador();

        } catch (error) {
            console.error('[TESOURARIA] Erro ao carregar dados:', error);
            this._renderErro('Erro ao carregar dados financeiros');
        } finally {
            this.isLoading = false;
        }
    }

    // ==========================================================================
    // KPIs
    // ==========================================================================

    _renderKPIs() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return;

        const totais = this.participantes.reduce((acc, p) => {
            acc.totalBonus += p.saldoJogo > 0 ? p.saldoJogo : 0;
            acc.totalOnus += p.saldoJogo < 0 ? Math.abs(p.saldoJogo) : 0;
            acc.saldoGeral += p.saldoFinal;
            if (p.saldoFinal < -0.01) acc.inadimplentes++;
            return acc;
        }, { totalBonus: 0, totalOnus: 0, saldoGeral: 0, inadimplentes: 0 });

        const kpis = [
            {
                icon: 'trending_up', label: 'Total Bonus',
                value: totais.totalBonus, color: 'var(--color-success)',
                prefix: '+ R$ '
            },
            {
                icon: 'trending_down', label: 'Total Onus',
                value: totais.totalOnus, color: 'var(--color-danger)',
                prefix: '- R$ '
            },
            {
                icon: 'account_balance_wallet', label: 'Saldo Geral',
                value: totais.saldoGeral,
                color: totais.saldoGeral >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                prefix: totais.saldoGeral >= 0 ? '+ R$ ' : '- R$ ',
                absValue: true
            },
            {
                icon: 'warning', label: 'Inadimplentes',
                value: totais.inadimplentes,
                color: totais.inadimplentes > 0 ? 'var(--color-warning)' : 'var(--text-dim)',
                isCount: true
            }
        ];

        kpiContainer.innerHTML = kpis.map(kpi => {
            const displayValue = kpi.isCount
                ? kpi.value
                : (kpi.absValue ? Math.abs(kpi.value) : kpi.value).toFixed(2).replace('.', ',');
            const prefix = kpi.isCount ? '' : kpi.prefix;

            // Dynamic background for icon
            const bgColor = kpi.color.includes('success') ? 'rgba(16,185,129,0.2)'
                          : kpi.color.includes('danger') ? 'rgba(239,68,68,0.2)'
                          : kpi.color.includes('warning') ? 'rgba(234,179,8,0.2)'
                          : 'rgba(107,114,128,0.2)';

            return `
                <div class="kpi-card">
                    <div class="kpi-icon" style="background: ${bgColor}; color: ${kpi.color}">
                        <span class="material-icons">${kpi.icon}</span>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-value" style="color: ${kpi.color}">${prefix}${displayValue}</span>
                        <span class="kpi-label">${kpi.label}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==========================================================================
    // TABELA + FILTRO + SEARCH + SORT
    // ==========================================================================

    _getDadosFiltrados() {
        let dados = [...this.participantes];

        // Filter by status
        if (this.filtroStatus === 'devedores') {
            dados = dados.filter(p => p.saldoFinal < -0.01);
        } else if (this.filtroStatus === 'credores') {
            dados = dados.filter(p => p.saldoFinal > 0.01);
        } else if (this.filtroStatus === 'quitados') {
            dados = dados.filter(p => p.saldoFinal >= -0.01);
        }

        // Search by nome/time
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            dados = dados.filter(p =>
                (p.nome && p.nome.toLowerCase().includes(term)) ||
                (p.nomeTime && p.nomeTime.toLowerCase().includes(term))
            );
        }

        // Sort
        if (this.sortMode === 'saldo-asc') {
            dados.sort((a, b) => a.saldoFinal - b.saldoFinal);
        } else if (this.sortMode === 'saldo-desc') {
            dados.sort((a, b) => b.saldoFinal - a.saldoFinal);
        } else if (this.sortMode === 'nome-az') {
            dados.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
        }

        return dados;
    }

    _renderTabela() {
        const container = document.getElementById('tabela-container');
        if (!container) return;

        const dadosFiltrados = this._getDadosFiltrados();

        if (dadosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">search_off</span>
                    <p>Nenhum participante encontrado${this.searchTerm ? ` para "${this.searchTerm}"` : ''}</p>
                </div>
            `;
            this._atualizarContador(0);
            return;
        }

        container.innerHTML = `
            <div class="participantes-lista">
                ${dadosFiltrados.map(p => this._renderLinha(p)).join('')}
            </div>
        `;

        this._atualizarContador(dadosFiltrados.length);
        this._anexarTooltipsBadges();
    }

    _renderLinha(participante) {
        const { timeId, nome, nomeTime, escudo, saldoFinal, breakdown } = participante;

        let statusClass, statusIcon;
        if (saldoFinal < -0.01) {
            statusClass = 'status-devedor';
            statusIcon = 'arrow_downward';
        } else if (saldoFinal > 0.01) {
            statusClass = 'status-credor';
            statusIcon = 'arrow_upward';
        } else {
            statusClass = 'status-quitado';
            statusIcon = 'check_circle';
        }

        const escudoUrl = escudo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%232d2d2d"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%236b7280" font-size="24"%3E?%3C/text%3E%3C/svg%3E';
        const badges = this._renderBadgesFinanceiros(breakdown);
        const saldoFormatado = this._formatarSaldo(saldoFinal);

        return `
            <div class="linha-financeira ${statusClass}" data-time-id="${timeId}" onclick="adminTesouraria.toggleExpand(this)">
                <!-- ESQUERDA: Perfil -->
                <div class="linha-perfil">
                    <img src="${escudoUrl}" alt="" class="escudo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232d2d2d%22/%3E%3C/svg%3E'">
                    <div class="perfil-info">
                        <span class="nome-cartola">${this._escapeHtml(nome)}</span>
                        <span class="nome-time">${this._escapeHtml(nomeTime || '')}</span>
                    </div>
                </div>

                <!-- CENTRO: Extrato (Badges Financeiros) -->
                <div class="linha-extrato">
                    <div class="badges-container">
                        ${badges}
                    </div>
                </div>

                <!-- DIREITA: Saldo Final + Acoes -->
                <div class="linha-totais">
                    <div class="saldo-final-box ${statusClass}">
                        <span class="material-icons status-icon">${statusIcon}</span>
                        <span class="saldo-valor">${saldoFormatado}</span>
                    </div>
                    <div class="linha-acoes">
                        <button class="btn-acao" onclick="event.stopPropagation(); adminTesouraria.abrirAcerto('${timeId}', '${this._escapeHtml(nome).replace(/'/g, "\\'")}')" title="Registrar Acerto">
                            <span class="material-icons">payments</span>
                        </button>
                        <button class="btn-acao" onclick="event.stopPropagation(); adminTesouraria.verDetalhes('${timeId}')" title="Ver Detalhes">
                            <span class="material-icons">visibility</span>
                        </button>
                    </div>
                    <span class="material-icons expand-indicator">expand_more</span>
                </div>
            </div>
            <div class="linha-expand" data-expand-for="${timeId}">
                ${this._renderExpandContent(participante)}
            </div>
        `;
    }

    // ==========================================================================
    // EXPAND INLINE
    // ==========================================================================

    _renderExpandContent(participante) {
        const bd = participante.breakdown || {};
        const items = [];

        const modulosMapa = [
            ['banco', 'casino', 'Rodada (Banco)'],
            ['pontosCorridos', 'emoji_events', 'Pontos Corridos'],
            ['mataMata', 'sports_mma', 'Mata-Mata'],
            ['top10', 'stars', 'Top10 (Mitos/Micos)'],
            ['melhorMes', 'calendar_month', 'Melhor Mes'],
            ['artilheiro', 'sports_soccer', 'Artilheiro'],
            ['luvaOuro', 'sports_handball', 'Luva de Ouro'],
            ['campos', 'edit_note', 'Ajustes Manuais'],
            ['acertos', 'payments', 'Acertos'],
        ];

        for (const [key, icon, label] of modulosMapa) {
            const ativo = key === 'campos' || key === 'acertos' || this.modulosAtivos[key];
            if (!ativo) continue;

            const valor = bd[key] || 0;
            if (Math.abs(valor) < 0.01) continue;

            const classe = valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'zero';
            const valorFmt = this._formatarSaldo(valor);

            items.push(`
                <div class="breakdown-item">
                    <span class="material-icons" style="color: ${valor > 0 ? 'var(--color-success)' : valor < 0 ? 'var(--color-danger)' : 'var(--text-dim)'}">${icon}</span>
                    <span class="breakdown-label">${label}</span>
                    <span class="breakdown-value ${classe}">${valorFmt}</span>
                </div>
            `);
        }

        if (items.length === 0) {
            items.push('<div class="breakdown-item"><span class="breakdown-label">Sem movimentacoes</span></div>');
        }

        const saldoClasse = participante.saldoFinal > 0.01 ? 'positivo'
                          : participante.saldoFinal < -0.01 ? 'negativo' : 'zero';

        return `
            <div class="expand-content">
                <div class="breakdown-grid">
                    ${items.join('')}
                </div>
                <div class="expand-summary">
                    <span class="expand-summary-label">Saldo Final</span>
                    <span class="expand-summary-value ${saldoClasse}">${this._formatarSaldo(participante.saldoFinal)}</span>
                </div>
            </div>
        `;
    }

    toggleExpand(linhaEl) {
        const timeId = linhaEl.dataset.timeId;
        const expandEl = document.querySelector(`.linha-expand[data-expand-for="${timeId}"]`);
        if (!expandEl) return;

        const isExpanded = expandEl.classList.contains('expanded');

        // Close all others
        document.querySelectorAll('.linha-expand.expanded').forEach(el => {
            el.classList.remove('expanded');
        });
        document.querySelectorAll('.linha-financeira.row-expanded').forEach(el => {
            el.classList.remove('row-expanded');
        });

        // Toggle this one
        if (!isExpanded) {
            expandEl.classList.add('expanded');
            linhaEl.classList.add('row-expanded');
        }
    }

    // ==========================================================================
    // BADGES FINANCEIROS
    // ==========================================================================

    _renderBadgesFinanceiros(breakdown) {
        if (!breakdown) return '<span class="no-data">Sem dados</span>';

        const badges = [];
        const ordem = ['banco', 'pontosCorridos', 'mataMata', 'top10', 'melhorMes', 'artilheiro', 'luvaOuro', 'campos', 'acertos'];

        for (const modulo of ordem) {
            const ativo = modulo === 'campos' || modulo === 'acertos' || this.modulosAtivos[modulo];
            if (!ativo) continue;

            const valor = breakdown[modulo] || 0;
            if (Math.abs(valor) < 0.01) continue;

            const config = this.badgeConfig[modulo];
            if (!config) continue;

            let colorClass = 'badge-neutro';
            if (valor > 0) colorClass = 'badge-ganho';
            else if (valor < 0) colorClass = 'badge-perda';

            const valorFormatado = this._formatarValorBadge(valor);

            badges.push(`
                <div class="badge-financeiro ${colorClass}" data-modulo="${modulo}" title="${config.label}: R$ ${valor.toFixed(2).replace('.', ',')}">
                    <span class="material-icons badge-icon">${config.icon}</span>
                    <span class="badge-valor">${valorFormatado}</span>
                </div>
            `);
        }

        if (badges.length === 0) {
            return '<span class="no-badges">Sem movimentacoes</span>';
        }

        return badges.join('');
    }

    _formatarValorBadge(valor) {
        const abs = Math.abs(valor);
        const sinal = valor >= 0 ? '+' : '-';
        if (abs >= 1000) return `${sinal}${(abs / 1000).toFixed(1)}k`;
        return `${sinal}${abs.toFixed(0)}`;
    }

    async _anexarTooltipsBadges() {
        if (!window.TooltipRegrasFinanceiras) return;

        try {
            const modulosComRegras = ['pontosCorridos', 'mataMata', 'top10', 'melhorMes', 'artilheiro', 'luvaOuro'];
            const badges = document.querySelectorAll('.badge-financeiro[data-modulo]');

            for (const badge of badges) {
                const modulo = badge.getAttribute('data-modulo');
                if (!modulosComRegras.includes(modulo)) continue;

                const tooltip = new TooltipRegrasFinanceiras();
                await tooltip.anexarAoElemento(badge, this.ligaId, modulo, this.season);
            }
        } catch (error) {
            console.error('[TESOURARIA] Erro ao anexar tooltips:', error);
        }
    }

    // ==========================================================================
    // DETAIL PANEL (slide-up)
    // ==========================================================================

    verDetalhes(timeId) {
        const participante = this.participantes.find(p => p.timeId === timeId);
        if (!participante) return;

        const overlay = document.getElementById('tesouraria-detail-overlay');
        const headerEl = document.getElementById('detail-panel-header');
        const bodyEl = document.getElementById('detail-panel-body');
        if (!overlay || !headerEl || !bodyEl) return;

        const bd = participante.breakdown || {};
        const escudoUrl = participante.escudo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%232d2d2d"/%3E%3C/svg%3E';

        const saldoClasse = participante.saldoFinal < -0.01 ? 'devedor'
                          : participante.saldoFinal > 0.01 ? 'credor' : 'quitado';
        const saldoCor = participante.saldoFinal < -0.01 ? 'var(--color-danger)'
                       : participante.saldoFinal > 0.01 ? 'var(--color-success)' : 'var(--text-dim)';

        headerEl.innerHTML = `
            <img src="${escudoUrl}" alt="" class="escudo-lg" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232d2d2d%22/%3E%3C/svg%3E'">
            <div class="panel-header-info">
                <h3>${this._escapeHtml(participante.nome)}</h3>
                <p>${this._escapeHtml(participante.nomeTime || '')}</p>
            </div>
            <button class="panel-close" onclick="adminTesouraria.fecharDetalhes()">
                <span class="material-icons">close</span>
            </button>
        `;

        // Build breakdown rows
        const modulosMapa = [
            ['banco', 'casino', 'Rodada (Banco)'],
            ['pontosCorridos', 'emoji_events', 'Pontos Corridos'],
            ['mataMata', 'sports_mma', 'Mata-Mata'],
            ['top10', 'stars', 'Top10 (Mitos/Micos)'],
            ['melhorMes', 'calendar_month', 'Melhor Mes'],
            ['artilheiro', 'sports_soccer', 'Artilheiro'],
            ['luvaOuro', 'sports_handball', 'Luva de Ouro'],
            ['campos', 'edit_note', 'Ajustes Manuais'],
        ];

        let breakdownRows = '';
        for (const [key, icon, label] of modulosMapa) {
            const ativo = key === 'campos' || this.modulosAtivos[key];
            if (!ativo) continue;

            const valor = bd[key] || 0;
            if (Math.abs(valor) < 0.01) continue;

            const cor = valor > 0 ? 'var(--color-success)' : valor < 0 ? 'var(--color-danger)' : 'var(--text-dim)';
            breakdownRows += `
                <tr>
                    <td><span class="material-icons">${icon}</span> ${label}</td>
                    <td style="color: ${cor}">${this._formatarSaldo(valor)}</td>
                </tr>
            `;
        }

        bodyEl.innerHTML = `
            <!-- Saldo Hero -->
            <div class="panel-saldo-hero ${saldoClasse}">
                <div style="text-align: center">
                    <div class="panel-saldo-label">Saldo Final</div>
                    <div class="panel-saldo-value" style="color: ${saldoCor}">${this._formatarSaldo(participante.saldoFinal)}</div>
                </div>
            </div>

            <!-- Breakdown por Modulo -->
            ${breakdownRows ? `
            <div class="panel-section">
                <div class="panel-section-title">Detalhamento por Modulo</div>
                <table class="breakdown-table">
                    ${breakdownRows}
                    <tr style="border-top: 2px solid var(--border-color)">
                        <td><strong>Saldo Temporada</strong></td>
                        <td><strong style="color: ${participante.saldoJogo >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${this._formatarSaldo(participante.saldoJogo)}</strong></td>
                    </tr>
                </table>
            </div>
            ` : ''}

            <!-- Acertos -->
            <div class="panel-section">
                <div class="panel-section-title">Acertos Financeiros</div>
                <table class="breakdown-table">
                    <tr>
                        <td><span class="material-icons">arrow_upward</span> Total Pago</td>
                        <td style="color: var(--color-success)">+R$ ${participante.totalPago.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                        <td><span class="material-icons">arrow_downward</span> Total Recebido</td>
                        <td style="color: var(--color-danger)">-R$ ${participante.totalRecebido.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                        <td><strong>Saldo Acertos</strong></td>
                        <td><strong style="color: ${participante.saldoAcertos >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${this._formatarSaldo(participante.saldoAcertos)}</strong></td>
                    </tr>
                </table>
            </div>

            <!-- Actions -->
            <div class="panel-actions">
                <button class="btn-primary-dark" onclick="adminTesouraria.abrirAcerto('${participante.timeId}', '${this._escapeHtml(participante.nome).replace(/'/g, "\\'")}'); adminTesouraria.fecharDetalhes();">
                    <span class="material-icons">payments</span>
                    Registrar Acerto
                </button>
                <button class="btn-secondary-dark" onclick="adminTesouraria.fecharDetalhes()">
                    Fechar
                </button>
            </div>
        `;

        // Show overlay
        overlay.classList.add('visible');
    }

    fecharDetalhes(event) {
        if (event && event.target !== event.currentTarget) return;
        const overlay = document.getElementById('tesouraria-detail-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    // ==========================================================================
    // ACOES PUBLICAS
    // ==========================================================================

    async recarregar() {
        const container = document.getElementById('tabela-container');
        if (container) container.innerHTML = this._renderTableLoading();
        await this._carregarDados();
    }

    async mudarTemporada(season) {
        this.season = season;
        await this.recarregar();
    }

    filtrarStatus(status) {
        this.filtroStatus = status;
        this._renderTabela();
    }

    buscar(term) {
        this.searchTerm = term.trim();
        this._renderTabela();
    }

    ordenar(mode) {
        this.sortMode = mode;
        // Update active button
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === mode);
        });
        this._renderTabela();
    }

    abrirAcerto(timeId, nomeTime) {
        if (typeof window.abrirModalAcerto === 'function') {
            window.abrirModalAcerto(timeId, nomeTime);
        } else {
            SuperModal.toast.warning(`Modal de acerto nao disponivel para ${nomeTime}. Implemente window.abrirModalAcerto(timeId, nomeTime)`);
        }
    }

    // ==========================================================================
    // CSV EXPORT
    // ==========================================================================

    exportarCSV() {
        if (!this.participantes.length) {
            SuperModal.toast.warning('Nenhum dado para exportar');
            return;
        }

        const headers = ['Nome', 'Time', 'Status', 'Rodada', 'Pt.Corridos', 'Mata-Mata', 'Top10', 'Melhor Mes', 'Artilheiro', 'Luva Ouro', 'Aj.Manuais', 'Acertos', 'Saldo Jogo', 'Total Pago', 'Total Recebido', 'Saldo Final'];

        const rows = this._getDadosFiltrados().map(p => {
            const bd = p.breakdown || {};
            return [
                `"${(p.nome || '').replace(/"/g, '""')}"`,
                `"${(p.nomeTime || '').replace(/"/g, '""')}"`,
                p.saldoFinal < -0.01 ? 'Devedor' : p.saldoFinal > 0.01 ? 'Credor' : 'Quitado',
                (bd.banco || 0).toFixed(2),
                (bd.pontosCorridos || 0).toFixed(2),
                (bd.mataMata || 0).toFixed(2),
                (bd.top10 || 0).toFixed(2),
                (bd.melhorMes || 0).toFixed(2),
                (bd.artilheiro || 0).toFixed(2),
                (bd.luvaOuro || 0).toFixed(2),
                (bd.campos || 0).toFixed(2),
                (bd.acertos || 0).toFixed(2),
                (p.saldoJogo || 0).toFixed(2),
                (p.totalPago || 0).toFixed(2),
                (p.totalRecebido || 0).toFixed(2),
                (p.saldoFinal || 0).toFixed(2),
            ].join(';');
        });

        const csvContent = [headers.join(';'), ...rows].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `tesouraria_${this.season}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        URL.revokeObjectURL(url);
        SuperModal.toast.success('CSV exportado com sucesso!');
    }

    // ==========================================================================
    // WHATSAPP EXPORT
    // ==========================================================================

    exportarRelatorio() {
        const devedores = this.participantes
            .filter(p => p.saldoFinal < -0.01)
            .sort((a, b) => a.saldoFinal - b.saldoFinal);

        const credores = this.participantes
            .filter(p => p.saldoFinal > 0.01)
            .sort((a, b) => b.saldoFinal - a.saldoFinal);

        const quitados = this.participantes.filter(p => p.saldoFinal >= -0.01);

        let relatorio = `*BALANCO FINANCEIRO ${this.season}*\n`;
        relatorio += `_Gerado em ${new Date().toLocaleDateString('pt-BR')}_\n\n`;

        if (devedores.length > 0) {
            relatorio += `*DEVEDORES (${devedores.length}):*\n`;
            devedores.forEach((p, i) => {
                relatorio += `${i + 1}. ${p.nome}: *R$ ${Math.abs(p.saldoFinal).toFixed(2).replace('.', ',')}*\n`;
            });
            relatorio += '\n';
        }

        if (credores.length > 0) {
            relatorio += `*CREDORES (${credores.length}):*\n`;
            credores.forEach((p, i) => {
                relatorio += `${i + 1}. ${p.nome}: R$ ${p.saldoFinal.toFixed(2).replace('.', ',')}\n`;
            });
            relatorio += '\n';
        }

        relatorio += `*QUITADOS:* ${quitados.length} participante(s)\n\n`;

        const totalDevido = devedores.reduce((sum, p) => sum + Math.abs(p.saldoFinal), 0);
        const totalCredito = credores.reduce((sum, p) => sum + p.saldoFinal, 0);

        relatorio += `*RESUMO:*\n`;
        relatorio += `Total a Receber: R$ ${totalDevido.toFixed(2).replace('.', ',')}\n`;
        relatorio += `Total a Pagar: R$ ${totalCredito.toFixed(2).replace('.', ',')}\n`;

        navigator.clipboard.writeText(relatorio).then(() => {
            SuperModal.toast.success('Relatorio copiado! Agora e so colar no WhatsApp.');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = relatorio;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            SuperModal.toast.success('Relatorio copiado para a area de transferencia!');
        });
    }

    // ==========================================================================
    // HELPERS
    // ==========================================================================

    _formatarSaldo(valor) {
        const abs = Math.abs(valor).toFixed(2).replace('.', ',');
        if (valor > 0.01) return `+R$ ${abs}`;
        if (valor < -0.01) return `-R$ ${abs}`;
        return `R$ ${abs}`;
    }

    _atualizarContador(count) {
        const countEl = document.getElementById('count-value');
        if (!countEl) return;

        if (count !== undefined) {
            countEl.textContent = count;
            return;
        }

        countEl.textContent = this._getDadosFiltrados().length;
    }

    _renderErro(mensagem) {
        const container = document.getElementById('tabela-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <span class="material-icons">error_outline</span>
                    <p>${mensagem}</p>
                    <button class="btn-primary-dark" onclick="adminTesouraria.recarregar()">
                        <span class="material-icons">refresh</span>
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// ==========================================================================
// INSTANCIA GLOBAL
// ==========================================================================

window.AdminTesouraria = AdminTesouraria;
window.adminTesouraria = new AdminTesouraria();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminTesouraria;
}

console.log('[TESOURARIA] Modulo AdminTesouraria carregado v3.0.0 (Search, Sort, Detail Panel, Expand, CSV)');
