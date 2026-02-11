// =====================================================================
// tabelas-esportes.js - Seção "Tabelas" na Home do Participante v2.1
// =====================================================================
// v2.1: Exibe período (1º T/2º T) quando minutos não disponíveis
//       Auto-refresh reduzido de 60s para 30s para jogos ao vivo
// v2.0: "Jogos do Dia" com sub-categorias por liga + "Jogos do Mês" no Meu Time
// Componente com abas: Meu Time | Jogos do Dia | Copa BR | Libertadores | Copa do Mundo
// Exibe dados internamente (sem links externos)
// =====================================================================

// Mapa local de clubes (fallback caso clubes-data.js não esteja disponível globalmente)
const _CLUBES_TABELAS = {
    262: 'Flamengo', 263: 'Botafogo', 264: 'Corinthians', 265: 'Bahia',
    266: 'Fluminense', 267: 'Vasco', 275: 'Palmeiras', 276: 'São Paulo',
    277: 'Santos', 280: 'Bragantino', 282: 'Atlético-MG', 283: 'Cruzeiro',
    284: 'Grêmio', 285: 'Internacional', 286: 'Juventude', 287: 'Vitória',
    290: 'Goiás', 292: 'Sport', 293: 'Athletico-PR', 354: 'Ceará',
    356: 'Fortaleza', 1371: 'Cuiabá', 2305: 'Mirassol'
};

function _getNomeClube(clubeId) {
    return _CLUBES_TABELAS[Number(clubeId)] || 'Meu Time';
}

/**
 * Formata o tempo do jogo para exibição
 * Se tem minutos, exibe "45'" ou "45+2'"
 * Se não tem, exibe período baseado no statusRaw (1º T, 2º T, etc.)
 * @param {Object} jogo - Objeto do jogo com tempo, tempoExtra e statusRaw
 * @returns {string} Tempo formatado para exibição
 */
function _formatarTempoJogo(jogo) {
    if (jogo.tempo) {
        return jogo.tempoExtra ? `${jogo.tempo}+${jogo.tempoExtra}'` : `${jogo.tempo}'`;
    }
    // Sem minutos: mostrar período baseado no statusRaw
    switch (jogo.statusRaw) {
        case '1H': return '1º T';
        case '2H': return '2º T';
        case 'HT': return 'Intervalo';
        case 'ET': return 'Prorrog.';
        case 'P': return 'Penaltis';
        case 'BT': return 'Interv. Prorr.';
        case 'LIVE': return 'AO VIVO';
        default: return 'AO VIVO';
    }
}

const TabelasEsportes = {
    _containerId: null,
    _clubeId: null,
    _clubeNome: null,
    _abaAtiva: 'meu-time',
    _filtroAtivo: 'todos',
    _autoRefreshTimer: null,
    _cache: {},

    /**
     * Renderiza o componente de tabelas na home
     * @param {Object} options
     * @param {string} options.containerId - ID do container
     * @param {number|string} options.clubeId - ID do clube do participante
     */
    async renderizar({ containerId, clubeId }) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this._containerId = containerId;
        this._clubeId = clubeId;
        this._clubeNome = _getNomeClube(clubeId);

        container.innerHTML = this._renderEstrutura();
        this._bindEventos();

        // Carregar aba inicial
        await this._carregarAba('meu-time');
    },

    /**
     * Renderiza a estrutura HTML principal com abas
     */
    _renderEstrutura() {
        return `
            <section class="tabelas-section">
                <div class="tabelas-header">
                    <div class="tabelas-header-left">
                        <span class="material-icons" style="font-size:20px;color:#ff6d00;">sports_soccer</span>
                        <h3 class="tabelas-header-title">Tabelas</h3>
                    </div>
                </div>

                <!-- Abas scrolláveis -->
                <div class="tabelas-tabs-scroll">
                    <div class="tabelas-tabs">
                        <button class="tabelas-tab tabelas-tab-active" data-tab="meu-time">
                            <img src="/escudos/${this._clubeId}.png" alt=""
                                 style="width:14px;height:14px;object-fit:contain;"
                                 onerror="this.style.display='none'">
                            <span>Meu Time</span>
                        </button>
                        <button class="tabelas-tab" data-tab="jogos-dia">
                            <span class="material-icons" style="font-size:14px;">today</span>
                            <span>Jogos do Dia</span>
                        </button>
                        <button class="tabelas-tab" data-tab="copa-brasil">
                            <span class="material-icons" style="font-size:14px;">flag</span>
                            <span>Copa do Brasil</span>
                        </button>
                        <button class="tabelas-tab" data-tab="libertadores">
                            <span class="material-icons" style="font-size:14px;">public</span>
                            <span>Libertadores</span>
                        </button>
                        <button class="tabelas-tab" data-tab="copa-mundo">
                            <span class="material-icons" style="font-size:14px;">language</span>
                            <span>Copa do Mundo</span>
                        </button>
                    </div>
                </div>

                <!-- Conteúdo da aba ativa -->
                <div id="tabelas-conteudo" class="tabelas-conteudo">
                    <div class="tabelas-loading">
                        <div class="tabelas-spinner"></div>
                        <span>Carregando...</span>
                    </div>
                </div>
            </section>
        `;
    },

    /**
     * Bind eventos nas abas
     */
    _bindEventos() {
        const container = document.getElementById(this._containerId);
        if (!container) return;

        const tabs = container.querySelectorAll('.tabelas-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const abaId = tab.dataset.tab;
                if (abaId === this._abaAtiva) return;

                // Atualizar visual
                tabs.forEach(t => t.classList.remove('tabelas-tab-active'));
                tab.classList.add('tabelas-tab-active');

                this._abaAtiva = abaId;
                this._pararAutoRefresh();
                this._carregarAba(abaId);
            });
        });
    },

    /**
     * Carrega o conteúdo de uma aba específica
     */
    async _carregarAba(abaId) {
        const conteudo = document.getElementById('tabelas-conteudo');
        if (!conteudo) return;

        // Loading
        conteudo.innerHTML = `
            <div class="tabelas-loading">
                <div class="tabelas-spinner"></div>
                <span>Carregando...</span>
            </div>
        `;

        switch (abaId) {
            case 'meu-time':
                await this._carregarJogosMeuTime(conteudo);
                break;
            case 'jogos-dia':
                await this._carregarJogosDoDia(conteudo);
                break;
            case 'copa-brasil':
                this._renderAguarde(conteudo, 'Copa do Brasil', 'flag', 'var(--app-success-light)');
                break;
            case 'libertadores':
                this._renderAguarde(conteudo, 'Libertadores', 'public', 'var(--app-gold)');
                break;
            case 'copa-mundo':
                this._renderAguarde(conteudo, 'Copa do Mundo', 'language', 'var(--app-info)');
                break;
        }
    },

    // =================================================================
    // ABA: MEU TIME - Jogos do dia + Jogos do Mês
    // =================================================================
    async _carregarJogosMeuTime(conteudo) {
        try {
            // Buscar jogos do dia e jogos do mês em paralelo
            const [resHoje, resMes] = await Promise.all([
                fetch('/api/jogos-ao-vivo'),
                fetch(`/api/jogos-ao-vivo/mes?time=${encodeURIComponent(this._clubeNome)}`)
            ]);

            const dataHoje = resHoje.ok ? await resHoje.json() : { jogos: [] };
            const dataMes = resMes.ok ? await resMes.json() : { jogos: {} };

            const todosJogos = dataHoje.jogos || [];
            const nomeClube = this._clubeNome.toLowerCase();

            // Filtrar jogos do dia do meu clube
            const jogosMeuTime = todosJogos.filter(j => {
                const mandante = (j.mandante || '').toLowerCase();
                const visitante = (j.visitante || '').toLowerCase();
                return mandante.includes(nomeClube) || visitante.includes(nomeClube);
            });

            let html = '';

            // Seção: Jogos de Hoje
            if (jogosMeuTime.length > 0) {
                html += this._renderJogosMeuTime(jogosMeuTime);
            } else {
                html += this._renderSemJogosMeuTime(todosJogos.length);
            }

            // Seção: Jogos do Mês
            html += this._renderJogosDoMes(dataMes.jogos || {});

            conteudo.innerHTML = html;
        } catch (err) {
            console.error('[TABELAS] Erro jogos meu time:', err);
            conteudo.innerHTML = this._renderErro('Erro ao carregar jogos');
        }
    },

    _renderJogosMeuTime(jogos) {
        const cards = jogos.map(j => this._renderCardJogo(j, true)).join('');

        return `
            <div class="tabelas-meutime-header">
                <img src="/escudos/${this._clubeId}.png" alt="${this._clubeNome}"
                     style="width:24px;height:24px;object-fit:contain;"
                     onerror="this.style.display='none'">
                <span>Jogos do ${this._clubeNome} Hoje</span>
            </div>
            <div class="tabelas-jogos-lista">
                ${cards}
            </div>
        `;
    },

    _renderSemJogosMeuTime(totalJogosDia) {
        return `
            <div class="tabelas-sem-jogos">
                <img src="/escudos/${this._clubeId}.png" alt="${this._clubeNome}"
                     style="width:40px;height:40px;object-fit:contain;opacity:0.5;"
                     onerror="this.innerHTML='<span class=\\'material-icons\\' style=\\'font-size:40px;color:#4b5563\\'>shield</span>'">
                <p class="tabelas-sem-jogos-titulo">Sem jogos do ${this._clubeNome} hoje</p>
                <p class="tabelas-sem-jogos-sub">
                    ${totalJogosDia > 0
                        ? `${totalJogosDia} jogo(s) de outros times brasileiros acontecendo hoje`
                        : 'Nenhum jogo brasileiro programado para hoje'}
                </p>
            </div>
        `;
    },

    /**
     * Renderiza seção "Jogos do Mês" do time do coração
     * @param {Object} jogosPorData - Mapa { "YYYY-MM-DD": [jogos] }
     */
    _renderJogosDoMes(jogosPorData) {
        const datas = Object.keys(jogosPorData).sort();
        const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

        // Filtrar apenas datas que NÃO são hoje (hoje já aparece acima)
        const datasRestantes = datas.filter(d => d !== hoje);

        if (datasRestantes.length === 0) {
            // ✅ v2.1: Se não há jogos futuros, verificar se há jogos hoje.
            const jogosHoje = jogosPorData[hoje] || [];
            if (jogosHoje.length > 0) {
                // Reutiliza a mesma lógica de renderização, mas para o dia atual.
                let html = `
                    <div class="tabelas-mes-header">
                        <span class="material-icons" style="font-size:16px;color:#ff6d00;">today</span>
                        <span>Jogos de Hoje</span>
                    </div>
                `;
                const dataFormatada = this._formatarDataMes(hoje, hoje);
                html += `<div class="tabelas-mes-data-header">
                            <span class="material-icons" style="font-size:13px;">event</span>
                            ${dataFormatada}
                         </div>`;
                html += `<div class="tabelas-jogos-lista">`;
                for (const j of jogosHoje) {
                    html += this._renderCardJogoMes(j, false);
                }
                html += `</div>`;
                return html;
            }

            // Se não há jogos futuros nem hoje, exibe a mensagem padrão.
            return `
                <div class="tabelas-mes-header">
                    <span class="material-icons" style="font-size:16px;color:#ff6d00;">date_range</span>
                    <span>Próximos Jogos</span>
                </div>
                <div class="tabelas-sem-jogos" style="padding:20px 16px;">
                    <p class="tabelas-sem-jogos-sub">Nenhum outro jogo do ${this._clubeNome} encontrado nos próximos dias</p>
                </div>
            `;
        }

        let html = `
            <div class="tabelas-mes-header">
                <span class="material-icons" style="font-size:16px;color:#ff6d00;">date_range</span>
                <span>Próximos Jogos</span>
            </div>
        `;

        for (const data of datasRestantes) {
            const jogos = jogosPorData[data];
            const dataFormatada = this._formatarDataMes(data, hoje);
            const isPassado = data < hoje;

            html += `<div class="tabelas-mes-data-header ${isPassado ? 'tabelas-mes-passado' : ''}">
                        <span class="material-icons" style="font-size:13px;">${isPassado ? 'event_available' : 'event'}</span>
                        ${dataFormatada}
                     </div>`;

            html += `<div class="tabelas-jogos-lista">`;
            for (const j of jogos) {
                html += this._renderCardJogoMes(j, isPassado);
            }
            html += `</div>`;
        }

        return html;
    },

    /**
     * Card compacto para jogos do mês (com placar para encerrados)
     */
    _renderCardJogoMes(jogo, isPassado) {
        const isEncerrado = jogo.statusRaw === 'FT' || jogo.statusRaw === 'AET' || jogo.statusRaw === 'PEN' || isPassado;
        const isAoVivo = ['1H','2H','HT','ET','P','BT','LIVE'].includes(jogo.statusRaw);
        const temPlacar = isAoVivo || isEncerrado;

        const statusBadge = isAoVivo
            ? `<span class="tabelas-badge-live"><div class="tabelas-live-dot-sm"></div>${_formatarTempoJogo(jogo)}</span>`
            : isEncerrado
                ? `<span class="tabelas-badge-encerrado">Encerrado</span>`
                : `<span class="tabelas-badge-horario">${jogo.horario || '--:--'}</span>`;

        const centro = temPlacar
            ? `<span class="tabelas-placar-sm">${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}</span>`
            : `<span class="tabelas-vs-sm">VS</span>`;

        return `
            <div class="tabelas-card-jogo tabelas-card-mes ${isEncerrado ? 'tabelas-card-encerrado' : ''} ${isAoVivo ? 'tabelas-card-live' : ''}">
                <div class="tabelas-campeonato-line">${jogo.liga || ''}</div>
                <div class="tabelas-card-jogo-content">
                    <div class="tabelas-time tabelas-time-casa">
                        <span class="tabelas-time-nome">${jogo.mandante || '?'}</span>
                    </div>
                    <div class="tabelas-centro">
                        ${statusBadge}
                        ${centro}
                    </div>
                    <div class="tabelas-time tabelas-time-fora">
                        <span class="tabelas-time-nome">${jogo.visitante || '?'}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Formata data para exibição: "Ter, 05 Fev" / "Amanhã" / "Ontem"
     */
    _formatarDataMes(dataStr, hoje) {
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia);
        const [anoH, mesH, diaH] = hoje.split('-').map(Number);
        const dataHoje = new Date(anoH, mesH - 1, diaH);

        const diff = Math.round((data - dataHoje) / (1000 * 60 * 60 * 24));

        if (diff === 1) return 'Amanhã';
        if (diff === -1) return 'Ontem';

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        return `${diasSemana[data.getDay()]}, ${String(dia).padStart(2, '0')} ${meses[mes - 1]}`;
    },

    // =================================================================
    // ABA: JOGOS DO DIA - Todos os jogos agrupados por liga
    // =================================================================
    async _carregarJogosDoDia(conteudo) {
        try {
            const response = await fetch('/api/jogos-ao-vivo');
            if (!response.ok) throw new Error('Falha ao buscar jogos');

            const data = await response.json();
            const todosJogos = data.jogos || [];

            if (todosJogos.length === 0) {
                conteudo.innerHTML = this._renderSemJogosDia();
                return;
            }

            conteudo.innerHTML = this._renderJogosDoDia(todosJogos);
            this._filtroAtivo = 'todos';
            this._bindFiltros();
            this._iniciarAutoRefresh(todosJogos);
        } catch (err) {
            console.error('[TABELAS] Erro Jogos do Dia:', err);
            conteudo.innerHTML = this._renderErro('Erro ao carregar jogos');
        }
    },

    /**
     * Renderiza todos os jogos do dia agrupados por liga
     */
    _renderJogosDoDia(jogos) {
        // Agrupar jogos por liga
        const porLiga = {};
        for (const j of jogos) {
            const liga = j.liga || j.campeonato || 'Outros';
            if (!porLiga[liga]) porLiga[liga] = [];
            porLiga[liga].push(j);
        }

        // Ordenar ligas: priorizar as que têm jogos ao vivo, depois por quantidade
        const ligasOrdenadas = Object.keys(porLiga).sort((a, b) => {
            const aVivo = porLiga[a].some(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw));
            const bVivo = porLiga[b].some(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw));
            if (aVivo && !bVivo) return -1;
            if (!aVivo && bVivo) return 1;
            return porLiga[b].length - porLiga[a].length;
        });

        // Contar totais
        const totalAoVivo = jogos.filter(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw)).length;
        const totalAgendados = jogos.filter(j => ['NS','TBD'].includes(j.statusRaw)).length;
        const totalEncerrados = jogos.filter(j => ['FT','AET','PEN'].includes(j.statusRaw)).length;

        let html = `
            <div class="tabelas-dia-header">
                <div class="tabelas-dia-header-top">
                    <span class="material-icons" style="font-size:18px;color:#ff6d00;">sports_soccer</span>
                    <span class="tabelas-dia-titulo">Jogos do Dia</span>
                </div>
                <div class="tabelas-dia-resumo">
                    ${totalAoVivo > 0 ? `<span class="tabelas-dia-stat tabelas-stat-live"><div class="tabelas-live-dot-sm"></div>${totalAoVivo} ao vivo</span>` : ''}
                    ${totalAgendados > 0 ? `<span class="tabelas-dia-stat">${totalAgendados} agendado${totalAgendados > 1 ? 's' : ''}</span>` : ''}
                    ${totalEncerrados > 0 ? `<span class="tabelas-dia-stat tabelas-stat-enc">${totalEncerrados} encerrado${totalEncerrados > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <div class="tabelas-filtros">
                <button class="tabelas-filtro-btn tabelas-filtro-btn-active" data-filtro="todos">Todos</button>
                <button class="tabelas-filtro-btn" data-filtro="ao-vivo">
                    <div class="tabelas-filtro-dot"></div> Ao Vivo
                </button>
                <button class="tabelas-filtro-btn" data-filtro="liga">
                    <span class="material-icons" style="font-size:12px;">expand_more</span> Liga
                </button>
            </div>
        `;

        for (const liga of ligasOrdenadas) {
            const jogosLiga = porLiga[liga];
            const temAoVivo = jogosLiga.some(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw));

            html += `
                <div class="tabelas-liga-grupo" data-tem-ao-vivo="${temAoVivo}" data-liga="${liga}">
                    <div class="tabelas-liga-header ${temAoVivo ? 'tabelas-liga-header-live' : ''}">
                        <span class="tabelas-liga-nome">${liga}</span>
                        <span class="tabelas-liga-count">${jogosLiga.length} jogo${jogosLiga.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="tabelas-jogos-lista">
                        ${jogosLiga.map(j => this._renderCardJogo(j)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    },

    _renderSemJogosDia() {
        return `
            <div class="tabelas-sem-jogos">
                <span class="material-icons" style="font-size:40px;opacity:0.4;color:#ff6d00;">sports_soccer</span>
                <p class="tabelas-sem-jogos-titulo">Sem jogos programados para hoje</p>
                <p class="tabelas-sem-jogos-sub">Os jogos serão exibidos automaticamente no dia em que ocorrerem</p>
            </div>
        `;
    },

    // =================================================================
    // CARD DE JOGO (reutilizável)
    // =================================================================
    _renderCardJogo(jogo, mostrarCampeonato = false) {
        const isAoVivo = ['1H','2H','HT','ET','P','BT','LIVE'].includes(jogo.statusRaw);
        const isEncerrado = ['FT','AET','PEN'].includes(jogo.statusRaw);
        const temPlacar = isAoVivo || isEncerrado;

        const mandanteAbrev = (jogo.mandante || '???').substring(0, 3).toUpperCase();
        const visitanteAbrev = (jogo.visitante || '???').substring(0, 3).toUpperCase();

        const statusBadge = isAoVivo
            ? `<div class="tabelas-badge-live"><div class="tabelas-live-dot-sm"></div>${_formatarTempoJogo(jogo)}</div>`
            : isEncerrado
                ? `<div class="tabelas-badge-encerrado">Encerrado</div>`
                : `<div class="tabelas-badge-horario">${jogo.horario || '--:--'}</div>`;

        const placarOuVS = temPlacar
            ? `<span class="tabelas-placar">${jogo.golsMandante ?? jogo.placar_mandante ?? 0} - ${jogo.golsVisitante ?? jogo.placar_visitante ?? 0}</span>`
            : `<span class="tabelas-vs">VS</span>`;

        const campeonatoLine = mostrarCampeonato && jogo.liga
            ? `<div class="tabelas-campeonato-line">${jogo.liga}</div>`
            : '';

        return `
            <div class="tabelas-card-jogo ${isAoVivo ? 'tabelas-card-live' : ''} ${isEncerrado ? 'tabelas-card-encerrado' : ''}">
                ${campeonatoLine}
                <div class="tabelas-card-jogo-content">
                    <div class="tabelas-time tabelas-time-casa">
                        <span class="tabelas-time-nome">${jogo.mandante || 'Time A'}</span>
                        <span class="tabelas-time-abrev">${mandanteAbrev}</span>
                    </div>
                    <div class="tabelas-centro">
                        ${statusBadge}
                        ${placarOuVS}
                    </div>
                    <div class="tabelas-time tabelas-time-fora">
                        <span class="tabelas-time-abrev">${visitanteAbrev}</span>
                        <span class="tabelas-time-nome">${jogo.visitante || 'Time B'}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // =================================================================
    // FILTROS: Todos / Ao Vivo / Liga
    // =================================================================
    _bindFiltros() {
        const container = document.getElementById(this._containerId);
        if (!container) return;

        const btns = container.querySelectorAll('.tabelas-filtro-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filtro = btn.dataset.filtro;
                if (filtro === this._filtroAtivo) return;

                // Atualizar visual
                btns.forEach(b => b.classList.remove('tabelas-filtro-btn-active'));
                btn.classList.add('tabelas-filtro-btn-active');

                this._filtroAtivo = filtro;
                this._aplicarFiltro(filtro);
            });
        });
    },

    _aplicarFiltro(filtro) {
        const container = document.getElementById(this._containerId);
        if (!container) return;

        const grupos = container.querySelectorAll('.tabelas-liga-grupo');

        switch (filtro) {
            case 'todos':
                grupos.forEach(g => g.classList.remove('tabelas-grupo-hidden'));
                break;
            case 'ao-vivo':
                grupos.forEach(g => {
                    const temAoVivo = g.dataset.temAoVivo === 'true';
                    g.classList.toggle('tabelas-grupo-hidden', !temAoVivo);
                });
                break;
            case 'liga':
                // Placeholder para futuro filtro por competição
                console.log('[TABELAS] Filtro por liga: em desenvolvimento');
                break;
        }
    },

    // =================================================================
    // AUTO-REFRESH: Atualiza placares ao vivo a cada 60s
    // =================================================================
    _iniciarAutoRefresh(jogos) {
        this._pararAutoRefresh();

        const temAoVivo = jogos.some(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw));
        if (!temAoVivo) return;

        console.log('[TABELAS] Auto-refresh iniciado (30s)');

        this._autoRefreshTimer = setInterval(async () => {
            try {
                const response = await fetch('/api/jogos-ao-vivo');
                if (!response.ok) return;

                const data = await response.json();
                const jogosAtualizados = data.jogos || [];
                const aoVivo = jogosAtualizados.filter(j =>
                    ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw)
                );

                if (aoVivo.length === 0) {
                    console.log('[TABELAS] Auto-refresh parado (sem jogos ao vivo)');
                    this._pararAutoRefresh();
                    // Re-renderizar para atualizar estados finais
                    const conteudo = document.getElementById('tabelas-conteudo');
                    if (conteudo && this._abaAtiva === 'jogos-dia') {
                        conteudo.innerHTML = this._renderJogosDoDia(jogosAtualizados);
                        this._bindFiltros();
                    }
                    return;
                }

                // Atualizar placares inline (sem recriar HTML)
                this._atualizarPlacaresInline(jogosAtualizados);
                console.log(`[TABELAS] Atualizado ${aoVivo.length} jogo(s) ao vivo`);
            } catch (err) {
                console.warn('[TABELAS] Erro no auto-refresh:', err.message);
            }
        }, 30000); // v2.1: Reduzido de 60s para 30s
    },

    _pararAutoRefresh() {
        if (this._autoRefreshTimer) {
            clearInterval(this._autoRefreshTimer);
            this._autoRefreshTimer = null;
        }
    },

    _atualizarPlacaresInline(jogosAtualizados) {
        const container = document.getElementById(this._containerId);
        if (!container) return;

        const cards = container.querySelectorAll('.tabelas-card-jogo');
        for (const card of cards) {
            const nomeEl = card.querySelector('.tabelas-time-casa .tabelas-time-nome');
            if (!nomeEl) continue;

            const mandanteCard = nomeEl.textContent.trim().toLowerCase();

            // Encontrar jogo correspondente
            const jogo = jogosAtualizados.find(j =>
                (j.mandante || '').toLowerCase() === mandanteCard
            );
            if (!jogo) continue;

            const isAoVivo = ['1H','2H','HT','ET','P','BT','LIVE'].includes(jogo.statusRaw);
            const isEncerrado = ['FT','AET','PEN'].includes(jogo.statusRaw);

            // Atualizar placar
            const placarEl = card.querySelector('.tabelas-placar') || card.querySelector('.tabelas-placar-sm');
            if (placarEl && (isAoVivo || isEncerrado)) {
                placarEl.textContent = `${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}`;
            }

            // Atualizar VS → Placar se jogo começou
            const vsEl = card.querySelector('.tabelas-vs') || card.querySelector('.tabelas-vs-sm');
            if (vsEl && (isAoVivo || isEncerrado)) {
                vsEl.outerHTML = `<span class="tabelas-placar">${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}</span>`;
            }

            // Atualizar badge de status
            const badgeLive = card.querySelector('.tabelas-badge-live');
            const badgeHorario = card.querySelector('.tabelas-badge-horario');
            const badgeEncerrado = card.querySelector('.tabelas-badge-encerrado');
            const targetBadge = badgeLive || badgeHorario || badgeEncerrado;

            if (targetBadge) {
                if (isAoVivo) {
                    targetBadge.outerHTML = `<div class="tabelas-badge-live"><div class="tabelas-live-dot-sm"></div>${_formatarTempoJogo(jogo)}</div>`;
                    card.classList.add('tabelas-card-live');
                    card.classList.remove('tabelas-card-encerrado');
                } else if (isEncerrado) {
                    targetBadge.outerHTML = `<div class="tabelas-badge-encerrado">Encerrado</div>`;
                    card.classList.remove('tabelas-card-live');
                    card.classList.add('tabelas-card-encerrado');
                }
            }
        }

        // Atualizar data-attributes dos grupos para o filtro
        const grupos = container.querySelectorAll('.tabelas-liga-grupo');
        for (const grupo of grupos) {
            const cardsGrupo = grupo.querySelectorAll('.tabelas-card-live');
            grupo.dataset.temAoVivo = cardsGrupo.length > 0 ? 'true' : 'false';
        }

        // Re-aplicar filtro ativo
        if (this._filtroAtivo !== 'todos') {
            this._aplicarFiltro(this._filtroAtivo);
        }
    },

    // =================================================================
    // PLACEHOLDERS (Aguarde...)
    // =================================================================
    _renderAguarde(conteudo, titulo, icone, cor) {
        conteudo.innerHTML = `
            <div class="tabelas-aguarde">
                <div class="tabelas-aguarde-icon" style="background: ${cor}15; border: 1px solid ${cor}30;">
                    <span class="material-icons" style="font-size:32px;color:${cor};">${icone}</span>
                </div>
                <h4 class="tabelas-aguarde-titulo">${titulo}</h4>
                <p class="tabelas-aguarde-sub">Em breve</p>
                <div class="tabelas-aguarde-badge">
                    <span class="material-icons" style="font-size:14px;">construction</span>
                    Aguarde...
                </div>
            </div>
        `;
    },

    // =================================================================
    // ESTADOS AUXILIARES
    // =================================================================
    _renderErro(mensagem) {
        return `
            <div class="tabelas-sem-jogos">
                <span class="material-icons" style="font-size:32px;color:var(--app-danger);">error_outline</span>
                <p class="tabelas-sem-jogos-titulo">${mensagem}</p>
                <p class="tabelas-sem-jogos-sub">Tente novamente em alguns instantes</p>
            </div>
        `;
    }
};

// Expor globalmente
window.TabelasEsportes = TabelasEsportes;

console.log('[TABELAS-ESPORTES] Componente v2.1 carregado (tempo + refresh 30s)');
