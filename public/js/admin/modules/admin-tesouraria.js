/**
 * ADMIN TESOURARIA - Modulo Financeiro Oficial (SaaS Ready)
 *
 * Dashboard de fechamento financeiro para gestao de caixa da liga.
 * Consolida: Saldo do Sistema (bonus/onus) + Acertos Manuais = Saldo Final
 *
 * @version 1.0.0
 * @author Product Team
 * @date 2025-12-15
 */

class AdminTesouraria {
    constructor() {
        this.ligaId = null;
        this.season = '2025';
        this.participantes = [];
        this.filtroStatus = 'todos';
        this.container = null;
        this.isLoading = false;

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
            textoMuted: '#9ca3af'
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
     */
    async _carregarDados() {
        this.isLoading = true;

        try {
            // Buscar participantes da liga
            const timesResponse = await fetch(`/api/ligas/${this.ligaId}/times`);
            const timesData = await timesResponse.json();

            if (!timesData || timesData.length === 0) {
                this._renderErro('Nenhum participante encontrado na liga');
                return;
            }

            // Buscar resumo de acertos
            const acertosResponse = await fetch(`/api/acertos/admin/${this.ligaId}/resumo?temporada=${this.season}`);
            const acertosData = await acertosResponse.json();

            // Mapear acertos por timeId
            const acertosPorTime = {};
            if (acertosData.success && acertosData.times) {
                acertosData.times.forEach(t => {
                    acertosPorTime[t.timeId] = t;
                });
            }

            // Buscar extrato de cada participante (em paralelo, max 5 concorrentes)
            const participantesCompletos = [];
            const chunks = this._chunkArray(timesData, 5);

            for (const chunk of chunks) {
                const promises = chunk.map(async (time) => {
                    try {
                        const extratoResp = await fetch(`/api/fluxo-financeiro/${this.ligaId}/extrato/${time.id || time.time_id}`);
                        const extratoData = await extratoResp.json();

                        const timeId = String(time.id || time.time_id);
                        const acertos = acertosPorTime[timeId] || { saldoAcertos: 0, totalPago: 0, totalRecebido: 0 };

                        return {
                            timeId: timeId,
                            nome: time.nome || time.nomeTime || 'Time sem nome',
                            escudo: time.url_escudo_png || time.escudo || null,
                            saldoJogo: extratoData.saldo_temporada || extratoData.saldo || 0,
                            saldoAcertos: acertos.saldoAcertos || 0,
                            totalPago: acertos.totalPago || 0,
                            totalRecebido: acertos.totalRecebido || 0,
                            saldoFinal: (extratoData.saldo_temporada || extratoData.saldo || 0) + (acertos.saldoAcertos || 0),
                            detalhes: extratoData
                        };
                    } catch (err) {
                        console.warn(`[TESOURARIA] Erro ao buscar extrato de ${time.id}:`, err);
                        const timeId = String(time.id || time.time_id);
                        const acertos = acertosPorTime[timeId] || { saldoAcertos: 0 };
                        return {
                            timeId: timeId,
                            nome: time.nome || time.nomeTime || 'Time sem nome',
                            escudo: time.url_escudo_png || time.escudo || null,
                            saldoJogo: 0,
                            saldoAcertos: acertos.saldoAcertos || 0,
                            totalPago: 0,
                            totalRecebido: 0,
                            saldoFinal: acertos.saldoAcertos || 0,
                            detalhes: null
                        };
                    }
                });

                const results = await Promise.all(promises);
                participantesCompletos.push(...results);
            }

            this.participantes = participantesCompletos;

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

        // Calcular totais
        const totais = this.participantes.reduce((acc, p) => {
            acc.totalBonus += p.saldoJogo > 0 ? p.saldoJogo : 0;
            acc.totalOnus += p.saldoJogo < 0 ? Math.abs(p.saldoJogo) : 0;
            acc.saldoGeral += p.saldoFinal;
            if (p.saldoFinal < 0) acc.inadimplentes++;
            return acc;
        }, { totalBonus: 0, totalOnus: 0, saldoGeral: 0, inadimplentes: 0 });

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
     */
    _renderTabela() {
        const container = document.getElementById('tabela-container');
        if (!container) return;

        // Aplicar filtro
        let dadosFiltrados = [...this.participantes];

        if (this.filtroStatus === 'devedores') {
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal < 0);
        } else if (this.filtroStatus === 'credores') {
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal > 0);
        } else if (this.filtroStatus === 'quitados') {
            dadosFiltrados = dadosFiltrados.filter(p => p.saldoFinal === 0);
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

        container.innerHTML = `
            <table class="tesouraria-table">
                <thead>
                    <tr>
                        <th class="col-participante">Participante</th>
                        <th class="col-jogo">Saldo Jogo</th>
                        <th class="col-acertos">Acertos</th>
                        <th class="col-final">Saldo Final</th>
                        <th class="col-status">Status</th>
                        <th class="col-acoes">Acoes</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosFiltrados.map(p => this._renderLinha(p)).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Renderiza uma linha da tabela
     */
    _renderLinha(participante) {
        const { timeId, nome, escudo, saldoJogo, saldoAcertos, saldoFinal } = participante;

        // Determinar status e cores
        let statusClass, statusLabel, statusIcon;
        if (saldoFinal < 0) {
            statusClass = 'status-devedor';
            statusLabel = 'Devedor';
            statusIcon = 'arrow_downward';
        } else if (saldoFinal > 0) {
            statusClass = 'status-credor';
            statusLabel = 'Credor';
            statusIcon = 'arrow_upward';
        } else {
            statusClass = 'status-quitado';
            statusLabel = 'Quitado';
            statusIcon = 'check_circle';
        }

        // Formatar valores
        const formatarValor = (valor) => {
            const abs = Math.abs(valor).toFixed(2).replace('.', ',');
            if (valor > 0) return `<span class="valor-positivo">+R$ ${abs}</span>`;
            if (valor < 0) return `<span class="valor-negativo">-R$ ${abs}</span>`;
            return `<span class="valor-neutro">R$ ${abs}</span>`;
        };

        // Escudo placeholder
        const escudoUrl = escudo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%232d2d2d"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%236b7280" font-size="24"%3E?%3C/text%3E%3C/svg%3E';

        return `
            <tr class="linha-participante ${statusClass}">
                <td class="col-participante">
                    <div class="participante-info">
                        <img src="${escudoUrl}" alt="" class="escudo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232d2d2d%22/%3E%3C/svg%3E'">
                        <span class="nome">${nome}</span>
                    </div>
                </td>
                <td class="col-jogo">${formatarValor(saldoJogo)}</td>
                <td class="col-acertos">${formatarValor(saldoAcertos)}</td>
                <td class="col-final">
                    <strong class="saldo-final ${statusClass}">${formatarValor(saldoFinal)}</strong>
                </td>
                <td class="col-status">
                    <span class="badge ${statusClass}">
                        <span class="material-icons">${statusIcon}</span>
                        ${statusLabel}
                    </span>
                </td>
                <td class="col-acoes">
                    <button class="btn-acao" onclick="adminTesouraria.abrirAcerto('${timeId}', '${nome.replace(/'/g, "\\'")}')" title="Registrar Acerto">
                        <span class="material-icons">payments</span>
                    </button>
                    <button class="btn-acao" onclick="adminTesouraria.verDetalhes('${timeId}')" title="Ver Detalhes">
                        <span class="material-icons">visibility</span>
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Atualiza contador de participantes
     */
    _atualizarContador() {
        const countEl = document.getElementById('count-value');
        if (countEl) {
            let count = this.participantes.length;
            if (this.filtroStatus !== 'todos') {
                if (this.filtroStatus === 'devedores') {
                    count = this.participantes.filter(p => p.saldoFinal < 0).length;
                } else if (this.filtroStatus === 'credores') {
                    count = this.participantes.filter(p => p.saldoFinal > 0).length;
                } else if (this.filtroStatus === 'quitados') {
                    count = this.participantes.filter(p => p.saldoFinal === 0).length;
                }
            }
            countEl.textContent = count;
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

    /**
     * Divide array em chunks
     */
    _chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
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
     */
    verDetalhes(timeId) {
        const participante = this.participantes.find(p => p.timeId === timeId);
        if (!participante) return;

        const detalhes = participante.detalhes || {};
        const msg = `
DETALHES FINANCEIROS - ${participante.nome}
==========================================

Saldo do Jogo: R$ ${participante.saldoJogo.toFixed(2)}
Acertos (Pago): R$ ${participante.totalPago.toFixed(2)}
Acertos (Recebido): R$ ${participante.totalRecebido.toFixed(2)}
Saldo Acertos: R$ ${participante.saldoAcertos.toFixed(2)}

SALDO FINAL: R$ ${participante.saldoFinal.toFixed(2)}
        `.trim();

        alert(msg);
    }

    /**
     * Exporta relatorio para WhatsApp
     */
    exportarRelatorio() {
        const devedores = this.participantes
            .filter(p => p.saldoFinal < 0)
            .sort((a, b) => a.saldoFinal - b.saldoFinal);

        const credores = this.participantes
            .filter(p => p.saldoFinal > 0)
            .sort((a, b) => b.saldoFinal - a.saldoFinal);

        const quitados = this.participantes.filter(p => p.saldoFinal === 0);

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
               ADMIN TESOURARIA - Enterprise Dark Theme
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

            /* Table */
            .tesouraria-table {
                width: 100%;
                border-collapse: collapse;
            }

            .tesouraria-table thead {
                background: ${this.cores.bgPage};
            }

            .tesouraria-table th {
                padding: 14px 16px;
                text-align: left;
                font-size: 0.75rem;
                font-weight: 600;
                color: ${this.cores.textoMuted};
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid ${this.cores.border};
            }

            .tesouraria-table td {
                padding: 14px 16px;
                border-bottom: 1px solid ${this.cores.border};
                color: ${this.cores.texto};
                font-size: 0.875rem;
            }

            .tesouraria-table tbody tr:last-child td {
                border-bottom: none;
            }

            .tesouraria-table tbody tr:hover {
                background: ${this.cores.laranja}08;
            }

            /* Status-based row styling */
            .linha-participante.status-devedor {
                background: ${this.cores.vermelho}08;
            }

            .linha-participante.status-devedor:hover {
                background: ${this.cores.vermelho}12;
            }

            /* Participante Info */
            .participante-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .participante-info .escudo {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                object-fit: cover;
                background: ${this.cores.border};
            }

            .participante-info .nome {
                font-weight: 500;
            }

            /* Values */
            .valor-positivo {
                color: ${this.cores.verde};
                font-weight: 500;
            }

            .valor-negativo {
                color: ${this.cores.vermelho};
                font-weight: 500;
            }

            .valor-neutro {
                color: ${this.cores.cinza};
            }

            .saldo-final {
                font-size: 1rem;
            }

            /* Badge */
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .badge .material-icons {
                font-size: 14px;
            }

            .badge.status-devedor {
                background: ${this.cores.vermelho}20;
                color: ${this.cores.vermelho};
            }

            .badge.status-credor {
                background: ${this.cores.verde}20;
                color: ${this.cores.verde};
            }

            .badge.status-quitado {
                background: ${this.cores.cinza}20;
                color: ${this.cores.cinza};
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
                margin-right: 4px;
            }

            .btn-acao:hover {
                border-color: ${this.cores.laranja};
                color: ${this.cores.laranja};
                background: ${this.cores.laranja}10;
            }

            .btn-acao .material-icons {
                font-size: 18px;
            }

            /* Responsive */
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

                .tesouraria-table {
                    font-size: 0.8rem;
                }

                .col-jogo, .col-acertos {
                    display: none;
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

console.log('[TESOURARIA] Modulo AdminTesouraria carregado v1.0.0');
