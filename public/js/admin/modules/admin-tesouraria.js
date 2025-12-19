/**
 * ADMIN TESOURARIA - Modulo Financeiro Oficial (SaaS Ready)
 *
 * Dashboard de fechamento financeiro para gestao de caixa da liga.
 * Consolida: Saldo do Sistema (bonus/onus) + Acertos Manuais = Saldo Final
 *
 * @version 2.0.0 - Layout com Badges Financeiros Dinamicos
 * @author Product Team
 * @date 2025-12-18
 *
 * CHANGELOG v2.0:
 * - Novo layout de linha com breakdown financeiro por modulo
 * - Badges dinamicos condicionais (mostra apenas modulos ativos da liga)
 * - Cores semanticas: verde=ganho, vermelho=perda, cinza=zerado
 * - Scroll horizontal para extrato em telas menores
 */

class AdminTesouraria {
    constructor() {
        this.ligaId = null;
        this.season = '2025';
        this.participantes = [];
        this.filtroStatus = 'todos';
        this.container = null;
        this.isLoading = false;

        // ✅ v2.0: Modulos ativos da liga (carregados da API)
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
            campos: { icon: 'edit_note', label: 'Ajustes', color: 'muted' },
        };

        // Cores do tema
        this.cores = {
            bgCard: '#1a1a1a',
            bgPage: '#121212',
            border: '#2d2d2d',
            laranja: '#FF5500',
            verde: '#10b981',
            vermelho: '#ef4444',
            amarelo: '#f59e0b',
            cinza: '#6b7280',
            texto: '#ffffff',
            textoMuted: '#9ca3af',
            azul: '#3b82f6',
            roxo: '#8b5cf6',
            gold: '#ffd700',
        };
    }

    /**
     * Renderiza o modulo de tesouraria
     * @param {string} containerId - ID do container HTML
     * @param {string} ligaId - ID da liga
     * @param {string} season - Temporada (default: 2025)
     */
    async render(containerId, ligaId, season = '2025') {
        this.container = document.getElementById(containerId.replace('#', ''));
        this.ligaId = ligaId;
        this.season = season;

        if (!this.container) {
            console.error('[TESOURARIA] Container nao encontrado:', containerId);
            return;
        }

        // Renderizar estrutura base com loading
        this.container.innerHTML = this._renderLayout();

        // Injetar CSS
        this._injectStyles();

        // Carregar dados
        await this._carregarDados();
    }

    /**
     * Estrutura HTML base do modulo
     */
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
                        <button class="btn-secondary-dark" onclick="adminTesouraria.exportarRelatorio()">
                            <span class="material-icons">share</span>
                            Exportar WhatsApp
                        </button>
                    </div>
                </div>

                <!-- KPIs -->
                <div class="kpi-grid" id="kpi-container">
                    ${this._renderKPIsLoading()}
                </div>

                <!-- Toolbar de Filtros -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="filter-group">
                            <label>Temporada</label>
                            <select id="filtro-temporada" onchange="adminTesouraria.mudarTemporada(this.value)">
                                <option value="2025" ${this.season === '2025' ? 'selected' : ''}>2025</option>
                                <option value="2026" ${this.season === '2026' ? 'selected' : ''}>2026</option>
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
        `;
    }

    /**
     * KPIs em estado de loading
     */
    _renderKPIsLoading() {
        const kpis = [
            { icon: 'trending_up', label: 'Total Bonus', color: this.cores.verde },
            { icon: 'trending_down', label: 'Total Onus', color: this.cores.vermelho },
            { icon: 'account_balance_wallet', label: 'Saldo Geral', color: this.cores.laranja },
            { icon: 'warning', label: 'Inadimplentes', color: this.cores.amarelo }
        ];

        return kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-icon" style="background: ${kpi.color}20; color: ${kpi.color}">
                    <span class="material-icons">${kpi.icon}</span>
                </div>
                <div class="kpi-content">
                    <span class="kpi-value loading-pulse">R$ --</span>
                    <span class="kpi-label">${kpi.label}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Tabela em estado de loading
     */
    _renderTableLoading() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando dados financeiros...</p>
            </div>
        `;
    }

    /**
     * Carrega todos os dados necessarios
     * ✅ v2.0: Usa nova rota otimizada /api/tesouraria/liga/:ligaId
     */
    async _carregarDados() {
        this.isLoading = true;

        try {
            // ✅ v2.0: Usar rota otimizada que retorna tudo de uma vez
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

            // ✅ v2.0: Armazenar modulos ativos da liga
            if (data.modulosAtivos) {
                this.modulosAtivos = data.modulosAtivos;
                console.log('[TESOURARIA] Modulos ativos:', this.modulosAtivos);
            }

            // Mapear dados para formato interno
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
                // ✅ v2.0: Breakdown por modulo
                breakdown: p.breakdown || {},
            }));

            console.log(`[TESOURARIA] ${this.participantes.length} participantes carregados`);
            
            // 🐛 DEBUG: Log detalhado dos dados carregados
            console.log('[TESOURARIA] 🔍 DEBUG _carregarDados:');
            console.log('  📦 Dados da API:', data.participantes);
            console.log('  📦 Participantes mapeados:', this.participantes);
            console.log('  📊 Análise de saldos:');
            this.participantes.forEach(p => {
                console.log(`    ${p.nome}: saldoFinal=${p.saldoFinal} (${typeof p.saldoFinal}) | situacao=${p.situacao}`);
            });

            // Renderizar KPIs
            this._renderKPIs();

            // Renderizar tabela
            this._renderTabela();

            // Atualizar contador
            this._atualizarContador();

        } catch (error) {
            console.error('[TESOURARIA] Erro ao carregar dados:', error);
            this._renderErro('Erro ao carregar dados financeiros');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Renderiza os KPIs com dados reais
     */
    _renderKPIs() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return;

        // 🐛 DEBUG: Log antes do cálculo
        console.log('[TESOURARIA] 🔍 DEBUG _renderKPIs:');
        console.log('  Participantes para KPI:', this.participantes.length);

        // Calcular totais
        const totais = this.participantes.reduce((acc, p) => {
            acc.totalBonus += p.saldoJogo > 0 ? p.saldoJogo : 0;
            acc.totalOnus += p.saldoJogo < 0 ? Math.abs(p.saldoJogo) : 0;
            acc.saldoGeral += p.saldoFinal;
            if (p.saldoFinal < -0.01) acc.inadimplentes++;
            if (p.saldoFinal >= -0.01) acc.quitados++;
            return acc;
        }, { totalBonus: 0, totalOnus: 0, saldoGeral: 0, inadimplentes: 0, quitados: 0 });
        
        // 🐛 DEBUG: Log dos totais calculados
        console.log('  📊 Totais KPI:', {
            inadimplentes: totais.inadimplentes,
            quitados: totais.quitados,
            totalBonus: totais.totalBonus,
            totalOnus: totais.totalOnus,
            saldoGeral: totais.saldoGeral
        });

        const kpis = [
            {
                icon: 'trending_up',
                label: 'Total Bonus',
                value: totais.totalBonus,
                color: this.cores.verde,
                prefix: '+ R$ '
            },
            {
                icon: 'trending_down',
                label: 'Total Onus',
                value: totais.totalOnus,
                color: this.cores.vermelho,
                prefix: '- R$ '
            },
            {
                icon: 'account_balance_wallet',
                label: 'Saldo Geral',
                value: totais.saldoGeral,
                color: totais.saldoGeral >= 0 ? this.cores.verde : this.cores.vermelho,
                prefix: totais.saldoGeral >= 0 ? '+ R$ ' : '- R$ ',
                absValue: true
            },
            {
                icon: 'warning',
                label: 'Inadimplentes',
                value: totais.inadimplentes,
                color: totais.inadimplentes > 0 ? this.cores.amarelo : this.cores.cinza,
                isCount: true
            }
        ];

        kpiContainer.innerHTML = kpis.map(kpi => {
            const displayValue = kpi.isCount
                ? kpi.value
                : (kpi.absValue ? Math.abs(kpi.value) : kpi.value).toFixed(2).replace('.', ',');
            const prefix = kpi.isCount ? '' : kpi.prefix;

            return `
                <div class="kpi-card">
                    <div class="kpi-icon" style="background: ${kpi.color}20; color: ${kpi.color}">
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

    /**
     * Renderiza a tabela de participantes
     * ✅ v2.0: Novo layout com badges financeiros dinamicos
     */
    _renderTabela() {
        const container = document.getElementById('tabela-container');
        if (!container) return;

        // Aplicar filtro
        let dadosFiltrados = [...this.participantes];

        console.log('[TESOURARIA] 🔍 DEBUG _renderTabela:');
        console.log('  Antes do filtro:', dadosFiltrados.length, 'participantes');
        console.log('  Filtro aplicado:', this.filtroStatus);

        if (this.filtroStatus === 'devedores') {
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal < -0.01);
            console.log('  Após filtro devedores:', dadosFiltrados.length);
        } else if (this.filtroStatus === 'credores') {
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal > 0.01);
            console.log('  Após filtro credores:', dadosFiltrados.length);
        } else if (this.filtroStatus === 'quitados') {
            // ✅ FIX: Quitados = saldo >= -0.01 (zerado ou credor)
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal >= -0.01);
            console.log('  Após filtro quitados:', dadosFiltrados.length);
            console.log('  Lista filtrada:', dadosFiltrados.map(p => `${p.nome}: ${p.saldoFinal}`));
        }

        // Ordenar por saldo (devedores primeiro)
        dadosFiltrados.sort((a, b) => a.saldoFinal - b.saldoFinal);

        if (dadosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">search_off</span>
                    <p>Nenhum participante encontrado com o filtro selecionado</p>
                </div>
            `;
            return;
        }

        // ✅ v2.0: Lista de cards ao inves de tabela
        container.innerHTML = `
            <div class="participantes-lista">
                ${dadosFiltrados.map(p => this._renderLinha(p)).join('')}
            </div>
        `;
    }

    /**
     * Renderiza uma linha da tabela
     * ✅ v2.0: Novo layout com badges financeiros dinamicos
     *
     * Layout:
     * [Esquerda] Perfil: Avatar + Nome
     * [Centro] Extrato: Badges de cada modulo ativo
     * [Direita] Saldo Final + Acoes
     */
    _renderLinha(participante) {
        const { timeId, nome, nomeTime, escudo, saldoJogo, saldoAcertos, saldoFinal, breakdown } = participante;

        // Determinar status
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

        // Escudo placeholder
        const escudoUrl = escudo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%232d2d2d"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%236b7280" font-size="24"%3E?%3C/text%3E%3C/svg%3E';

        // ✅ v2.0: Gerar badges financeiros dinamicos
        const badges = this._renderBadgesFinanceiros(breakdown);

        // Formatar saldo final
        const saldoFormatado = this._formatarSaldo(saldoFinal);

        return `
            <div class="linha-financeira ${statusClass}" data-time-id="${timeId}">
                <!-- ESQUERDA: Perfil -->
                <div class="linha-perfil">
                    <img src="${escudoUrl}" alt="" class="escudo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232d2d2d%22/%3E%3C/svg%3E'">
                    <div class="perfil-info">
                        <span class="nome-cartola">${nome}</span>
                        <span class="nome-time">${nomeTime || ''}</span>
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
                        <button class="btn-acao" onclick="adminTesouraria.abrirAcerto('${timeId}', '${nome.replace(/'/g, "\\'")}')" title="Registrar Acerto">
                            <span class="material-icons">payments</span>
                        </button>
                        <button class="btn-acao" onclick="adminTesouraria.verDetalhes('${timeId}')" title="Ver Detalhes">
                            <span class="material-icons">visibility</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * ✅ v2.0: Renderiza badges financeiros dinamicos
     * Mostra apenas modulos ativos da liga com valores != 0
     */
    _renderBadgesFinanceiros(breakdown) {
        if (!breakdown) return '<span class="no-data">Sem dados</span>';

        const badges = [];

        // Ordem de exibicao dos badges
        const ordem = ['banco', 'pontosCorridos', 'mataMata', 'top10', 'melhorMes', 'artilheiro', 'luvaOuro', 'campos'];

        for (const modulo of ordem) {
            // Verificar se modulo esta ativo (exceto 'campos' que sempre mostra se tiver valor)
            const ativo = modulo === 'campos' || this.modulosAtivos[modulo];
            if (!ativo) continue;

            const valor = breakdown[modulo] || 0;

            // Apenas mostrar se tiver valor (diferente de 0)
            if (Math.abs(valor) < 0.01) continue;

            const config = this.badgeConfig[modulo];
            if (!config) continue;

            // Determinar cor baseada no valor (ganho/perda)
            let colorClass = 'badge-neutro';
            if (valor > 0) colorClass = 'badge-ganho';
            else if (valor < 0) colorClass = 'badge-perda';

            // Formatar valor
            const valorFormatado = this._formatarValorBadge(valor);

            badges.push(`
                <div class="badge-financeiro ${colorClass}" title="${config.label}: R$ ${valor.toFixed(2).replace('.', ',')}">
                    <span class="material-icons badge-icon">${config.icon}</span>
                    <span class="badge-valor">${valorFormatado}</span>
                </div>
            `);
        }

        // Se nao tiver nenhum badge, mostrar mensagem
        if (badges.length === 0) {
            return '<span class="no-badges">Sem movimentacoes</span>';
        }

        return badges.join('');
    }

    /**
     * Formata valor para exibicao no badge (compacto)
     */
    _formatarValorBadge(valor) {
        const abs = Math.abs(valor);
        const sinal = valor >= 0 ? '+' : '-';

        if (abs >= 1000) {
            return `${sinal}${(abs / 1000).toFixed(1)}k`;
        }
        return `${sinal}${abs.toFixed(0)}`;
    }

    /**
     * Formata saldo para exibicao principal
     */
    _formatarSaldo(valor) {
        const abs = Math.abs(valor).toFixed(2).replace('.', ',');
        if (valor > 0.01) return `+R$ ${abs}`;
        if (valor < -0.01) return `-R$ ${abs}`;
        return `R$ ${abs}`;
    }

    /**
     * Atualiza contador de participantes
     */
    _atualizarContador() {
        const countEl = document.getElementById('count-value');
        if (countEl) {
            let count = this.participantes.length;
            
            // 🐛 DEBUG: Log do array completo
            console.log('[TESOURARIA] 🔍 DEBUG _atualizarContador:');
            console.log('  Total participantes:', this.participantes.length);
            console.log('  Filtro status atual:', this.filtroStatus);
            console.log('  Array participantes:', this.participantes.map(p => ({
                nome: p.nome,
                saldoFinal: p.saldoFinal,
                tipo: typeof p.saldoFinal
            })));
            
            if (this.filtroStatus !== 'todos') {
                if (this.filtroStatus === 'devedores') {
                    const devedores = this.participantes.filter(p => p.saldoFinal < -0.01);
                    count = devedores.length;
                    console.log('  📊 Devedores:', count, devedores.map(p => `${p.nome}: ${p.saldoFinal}`));
                } else if (this.filtroStatus === 'credores') {
                    const credores = this.participantes.filter(p => p.saldoFinal > 0.01);
                    count = credores.length;
                    console.log('  📊 Credores:', count, credores.map(p => `${p.nome}: ${p.saldoFinal}`));
                } else if (this.filtroStatus === 'quitados') {
                    // ✅ FIX: Quitados = saldo >= -0.01 (zerados + credores = sem dívidas)
                    const quitados = this.participantes.filter(p => p.saldoFinal >= -0.01);
                    count = quitados.length;
                    console.log('  📊 Quitados (saldo >= -0.01):', count);
                    console.log('  Lista quitados:', quitados.map(p => `${p.nome}: ${p.saldoFinal}`));
                }
            }
            countEl.textContent = count;
            console.log('  ✅ Contador atualizado para:', count);
        }
    }

    /**
     * Renderiza estado de erro
     */
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

    // ==========================================================================
    // ACOES PUBLICAS
    // ==========================================================================

    /**
     * Recarrega os dados
     */
    async recarregar() {
        const container = document.getElementById('tabela-container');
        if (container) {
            container.innerHTML = this._renderTableLoading();
        }
        await this._carregarDados();
    }

    /**
     * Muda a temporada
     */
    async mudarTemporada(season) {
        this.season = season;
        await this.recarregar();
    }

    /**
     * Filtra por status
     */
    filtrarStatus(status) {
        this.filtroStatus = status;
        this._renderTabela();
        this._atualizarContador();
    }

    /**
     * Abre modal de acerto
     */
    abrirAcerto(timeId, nomeTime) {
        if (typeof window.abrirModalAcerto === 'function') {
            window.abrirModalAcerto(timeId, nomeTime);
        } else {
            alert(`Registrar acerto para: ${nomeTime}\n\nModal de acerto nao disponivel. Implemente window.abrirModalAcerto(timeId, nomeTime)`);
        }
    }

    /**
     * Ver detalhes do participante
     * ✅ v2.0: Mostra breakdown por modulo
     */
    verDetalhes(timeId) {
        const participante = this.participantes.find(p => p.timeId === timeId);
        if (!participante) return;

        const bd = participante.breakdown || {};

        // Construir lista de modulos com valores
        let modulosStr = '';
        const modulosComValor = [];

        if (this.modulosAtivos.banco && bd.banco) {
            modulosComValor.push(`  Rodada (Banco): R$ ${bd.banco.toFixed(2)}`);
        }
        if (this.modulosAtivos.pontosCorridos && bd.pontosCorridos) {
            modulosComValor.push(`  Pontos Corridos: R$ ${bd.pontosCorridos.toFixed(2)}`);
        }
        if (this.modulosAtivos.mataMata && bd.mataMata) {
            modulosComValor.push(`  Mata-Mata: R$ ${bd.mataMata.toFixed(2)}`);
        }
        if (this.modulosAtivos.top10 && bd.top10) {
            modulosComValor.push(`  Top10 (Mitos/Micos): R$ ${bd.top10.toFixed(2)}`);
        }
        if (this.modulosAtivos.melhorMes && bd.melhorMes) {
            modulosComValor.push(`  Melhor Mes: R$ ${bd.melhorMes.toFixed(2)}`);
        }
        if (this.modulosAtivos.artilheiro && bd.artilheiro) {
            modulosComValor.push(`  Artilheiro: R$ ${bd.artilheiro.toFixed(2)}`);
        }
        if (this.modulosAtivos.luvaOuro && bd.luvaOuro) {
            modulosComValor.push(`  Luva de Ouro: R$ ${bd.luvaOuro.toFixed(2)}`);
        }
        if (bd.campos) {
            modulosComValor.push(`  Ajustes Manuais: R$ ${bd.campos.toFixed(2)}`);
        }

        if (modulosComValor.length > 0) {
            modulosStr = '\nDETALHAMENTO POR MODULO:\n' + modulosComValor.join('\n');
        }

        const msg = `
DETALHES FINANCEIROS - ${participante.nome}
==========================================
${modulosStr}

SALDO TEMPORADA: R$ ${participante.saldoJogo.toFixed(2)}

ACERTOS:
  Pago: R$ ${participante.totalPago.toFixed(2)}
  Recebido: R$ ${participante.totalRecebido.toFixed(2)}
  Saldo Acertos: R$ ${participante.saldoAcertos.toFixed(2)}

==========================================
SALDO FINAL: R$ ${participante.saldoFinal.toFixed(2)}
        `.trim();

        alert(msg);
    }

    /**
     * Exporta relatorio para WhatsApp
     */
    exportarRelatorio() {
        const devedores = this.participantes
            .filter(p => p.saldoFinal < -0.01)
            .sort((a, b) => a.saldoFinal - b.saldoFinal);

        const credores = this.participantes
            .filter(p => p.saldoFinal > 0.01)
            .sort((a, b) => b.saldoFinal - a.saldoFinal);

        // ✅ FIX: Quitados = saldo >= -0.01 (zerado ou credor)
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

        // Copiar para clipboard
        navigator.clipboard.writeText(relatorio).then(() => {
            alert('Relatorio copiado para a area de transferencia!\n\nAgora e so colar no WhatsApp.');
        }).catch(() => {
            // Fallback para browsers antigos
            const textarea = document.createElement('textarea');
            textarea.value = relatorio;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Relatorio copiado para a area de transferencia!');
        });
    }

    // ==========================================================================
    // CSS INJECTION
    // ==========================================================================

    _injectStyles() {
        if (document.getElementById('tesouraria-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'tesouraria-styles';
        styles.textContent = `
            /* ========================================
               ADMIN TESOURARIA v2.0 - Badges Financeiros
               ======================================== */

            .tesouraria-module {
                background: ${this.cores.bgPage};
                min-height: 100%;
                padding: 24px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            /* Header */
            .tesouraria-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 16px;
            }

            .tesouraria-header .header-info h2 {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.75rem;
                font-weight: 700;
                color: ${this.cores.texto};
                margin: 0 0 4px 0;
            }

            .tesouraria-header .header-info h2 .material-icons {
                font-size: 32px;
                color: ${this.cores.laranja};
            }

            .tesouraria-header .header-info p {
                color: ${this.cores.textoMuted};
                font-size: 0.875rem;
                margin: 0;
            }

            .tesouraria-header .header-actions {
                display: flex;
                gap: 12px;
            }

            .btn-icon {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                border: 1px solid ${this.cores.border};
                background: ${this.cores.bgCard};
                color: ${this.cores.textoMuted};
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .btn-icon:hover {
                border-color: ${this.cores.laranja};
                color: ${this.cores.laranja};
            }

            .btn-secondary-dark {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border-radius: 8px;
                border: 1px solid ${this.cores.border};
                background: ${this.cores.bgCard};
                color: ${this.cores.texto};
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-secondary-dark:hover {
                border-color: ${this.cores.laranja};
                background: ${this.cores.laranja}15;
            }

            .btn-primary-dark {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                background: ${this.cores.laranja};
                color: #fff;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-primary-dark:hover {
                background: #e64d00;
                transform: translateY(-1px);
            }

            /* KPI Grid */
            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .kpi-card {
                background: ${this.cores.bgCard};
                border: 1px solid ${this.cores.border};
                border-radius: 12px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .kpi-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .kpi-icon .material-icons {
                font-size: 24px;
            }

            .kpi-content {
                display: flex;
                flex-direction: column;
            }

            .kpi-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: ${this.cores.texto};
            }

            .kpi-value.loading-pulse {
                animation: pulse 1.5s infinite;
            }

            .kpi-label {
                font-size: 0.75rem;
                color: ${this.cores.textoMuted};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* Toolbar */
            .toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: ${this.cores.bgCard};
                border: 1px solid ${this.cores.border};
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 16px;
                flex-wrap: wrap;
                gap: 16px;
            }

            .toolbar-left {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .filter-group label {
                font-size: 0.7rem;
                color: ${this.cores.textoMuted};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .filter-group select {
                background: ${this.cores.bgPage};
                border: 1px solid ${this.cores.border};
                border-radius: 6px;
                padding: 8px 12px;
                color: ${this.cores.texto};
                font-size: 0.875rem;
                min-width: 140px;
                cursor: pointer;
            }

            .filter-group select:focus {
                outline: none;
                border-color: ${this.cores.laranja};
            }

            .toolbar-right {
                display: flex;
                align-items: center;
            }

            .participantes-count {
                display: flex;
                align-items: center;
                gap: 6px;
                color: ${this.cores.textoMuted};
                font-size: 0.875rem;
            }

            .participantes-count .material-icons {
                font-size: 18px;
            }

            /* Table Container */
            .table-container {
                background: ${this.cores.bgCard};
                border: 1px solid ${this.cores.border};
                border-radius: 12px;
                overflow: hidden;
            }

            /* Loading State */
            .loading-state, .empty-state, .error-state {
                padding: 60px 20px;
                text-align: center;
                color: ${this.cores.textoMuted};
            }

            .loading-state .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid ${this.cores.border};
                border-top-color: ${this.cores.laranja};
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .empty-state .material-icons, .error-state .material-icons {
                font-size: 48px;
                margin-bottom: 12px;
                opacity: 0.5;
            }

            .error-state .material-icons {
                color: ${this.cores.vermelho};
            }

            /* ========================================
               v2.0: LINHA FINANCEIRA COM BADGES
               ======================================== */

            .participantes-lista {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            /* Linha Financeira Principal */
            .linha-financeira {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 14px 20px;
                background: ${this.cores.bgCard};
                border-bottom: 1px solid ${this.cores.border};
                transition: background 0.2s;
            }

            .linha-financeira:first-child {
                border-radius: 12px 12px 0 0;
            }

            .linha-financeira:last-child {
                border-radius: 0 0 12px 12px;
                border-bottom: none;
            }

            .linha-financeira:only-child {
                border-radius: 12px;
            }

            .linha-financeira:hover {
                background: ${this.cores.laranja}08;
            }

            /* Status-based styling */
            .linha-financeira.status-devedor {
                background: ${this.cores.vermelho}08;
                border-left: 3px solid ${this.cores.vermelho};
            }

            .linha-financeira.status-devedor:hover {
                background: ${this.cores.vermelho}12;
            }

            .linha-financeira.status-credor {
                border-left: 3px solid ${this.cores.verde};
            }

            .linha-financeira.status-quitado {
                border-left: 3px solid ${this.cores.cinza};
            }

            /* ESQUERDA: Perfil */
            .linha-perfil {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 200px;
                flex-shrink: 0;
            }

            .linha-perfil .escudo {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                background: ${this.cores.border};
                flex-shrink: 0;
            }

            .perfil-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }

            .nome-cartola {
                font-weight: 600;
                color: ${this.cores.texto};
                font-size: 0.9rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .nome-time {
                font-size: 0.75rem;
                color: ${this.cores.textoMuted};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* CENTRO: Extrato (Badges) */
            .linha-extrato {
                flex: 1;
                min-width: 0;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                scrollbar-color: ${this.cores.border} transparent;
            }

            .linha-extrato::-webkit-scrollbar {
                height: 4px;
            }

            .linha-extrato::-webkit-scrollbar-track {
                background: transparent;
            }

            .linha-extrato::-webkit-scrollbar-thumb {
                background: ${this.cores.border};
                border-radius: 4px;
            }

            .badges-container {
                display: flex;
                gap: 8px;
                padding: 4px 0;
            }

            /* Badge Financeiro */
            .badge-financeiro {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 16px;
                font-size: 0.75rem;
                font-weight: 600;
                white-space: nowrap;
                transition: transform 0.2s;
                cursor: default;
            }

            .badge-financeiro:hover {
                transform: scale(1.05);
            }

            .badge-icon {
                font-size: 14px !important;
            }

            .badge-valor {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
            }

            /* Cores dos Badges */
            .badge-ganho {
                background: ${this.cores.verde}20;
                color: ${this.cores.verde};
            }

            .badge-perda {
                background: ${this.cores.vermelho}20;
                color: ${this.cores.vermelho};
            }

            .badge-neutro {
                background: ${this.cores.cinza}20;
                color: ${this.cores.cinza};
            }

            .no-badges, .no-data {
                color: ${this.cores.textoMuted};
                font-size: 0.75rem;
                font-style: italic;
            }

            /* DIREITA: Saldo Final + Acoes */
            .linha-totais {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-shrink: 0;
            }

            .saldo-final-box {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 8px;
                min-width: 140px;
                justify-content: center;
            }

            .saldo-final-box.status-devedor {
                background: ${this.cores.vermelho}15;
            }

            .saldo-final-box.status-credor {
                background: ${this.cores.verde}15;
            }

            .saldo-final-box.status-quitado {
                background: ${this.cores.cinza}15;
            }

            .status-icon {
                font-size: 18px !important;
            }

            .status-devedor .status-icon { color: ${this.cores.vermelho}; }
            .status-credor .status-icon { color: ${this.cores.verde}; }
            .status-quitado .status-icon { color: ${this.cores.cinza}; }

            .saldo-valor {
                font-weight: 700;
                font-size: 1rem;
                font-family: 'JetBrains Mono', monospace;
            }

            .status-devedor .saldo-valor { color: ${this.cores.vermelho}; }
            .status-credor .saldo-valor { color: ${this.cores.verde}; }
            .status-quitado .saldo-valor { color: ${this.cores.cinza}; }

            .linha-acoes {
                display: flex;
                gap: 4px;
            }

            /* Action Buttons */
            .btn-acao {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: 1px solid ${this.cores.border};
                background: transparent;
                color: ${this.cores.textoMuted};
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .btn-acao:hover {
                border-color: ${this.cores.laranja};
                color: ${this.cores.laranja};
                background: ${this.cores.laranja}10;
            }

            .btn-acao .material-icons {
                font-size: 18px;
            }

            /* ========================================
               RESPONSIVE
               ======================================== */

            @media (max-width: 1024px) {
                .linha-perfil {
                    min-width: 160px;
                }

                .saldo-final-box {
                    min-width: 120px;
                    padding: 6px 12px;
                }

                .saldo-valor {
                    font-size: 0.9rem;
                }
            }

            @media (max-width: 768px) {
                .tesouraria-module {
                    padding: 16px;
                }

                .tesouraria-header {
                    flex-direction: column;
                }

                .kpi-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .toolbar {
                    flex-direction: column;
                    align-items: stretch;
                }

                .toolbar-left, .toolbar-right {
                    justify-content: center;
                }

                /* Mobile: Stack vertical */
                .linha-financeira {
                    flex-wrap: wrap;
                    padding: 12px 16px;
                    gap: 12px;
                }

                .linha-perfil {
                    min-width: 100%;
                    order: 1;
                }

                .linha-extrato {
                    order: 3;
                    width: 100%;
                    padding-bottom: 8px;
                }

                .linha-totais {
                    order: 2;
                    margin-left: auto;
                }

                .saldo-final-box {
                    min-width: 110px;
                }
            }

            @media (max-width: 480px) {
                .kpi-grid {
                    grid-template-columns: 1fr 1fr;
                }

                .kpi-card {
                    padding: 12px;
                }

                .kpi-value {
                    font-size: 1.1rem;
                }

                .linha-totais {
                    width: 100%;
                    justify-content: space-between;
                }

                .linha-acoes {
                    margin-left: auto;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// ==========================================================================
// INSTANCIA GLOBAL
// ==========================================================================

window.AdminTesouraria = AdminTesouraria;
window.adminTesouraria = new AdminTesouraria();

// Export para uso como modulo ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminTesouraria;
}

console.log('[TESOURARIA] Modulo AdminTesouraria carregado v2.0.0 (Badges Financeiros)');
