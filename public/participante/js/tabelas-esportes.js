// =====================================================================
// tabelas-esportes.js - Seção "Tabelas" na Home do Participante v1.0
// =====================================================================
// Componente com abas: Meu Time | Brasileirão | Copa BR | Libertadores | Copa do Mundo
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

const TabelasEsportes = {
    _containerId: null,
    _clubeId: null,
    _clubeNome: null,
    _abaAtiva: 'meu-time',
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
                        <button class="tabelas-tab" data-tab="brasileirao">
                            <span class="material-icons" style="font-size:14px;">emoji_events</span>
                            <span>Brasileirão</span>
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
            case 'brasileirao':
                await this._carregarBrasileirao(conteudo);
                break;
            case 'copa-brasil':
                this._renderAguarde(conteudo, 'Copa do Brasil', 'flag', '#22c55e');
                break;
            case 'libertadores':
                this._renderAguarde(conteudo, 'Libertadores', 'public', '#ffd700');
                break;
            case 'copa-mundo':
                this._renderAguarde(conteudo, 'Copa do Mundo', 'language', '#3b82f6');
                break;
        }
    },

    // =================================================================
    // ABA: MEU TIME - Jogos do dia do meu clube
    // =================================================================
    async _carregarJogosMeuTime(conteudo) {
        try {
            // Usar o endpoint de jogos ao vivo e filtrar pelo clube
            const response = await fetch('/api/jogos-ao-vivo');
            if (!response.ok) throw new Error('Falha ao buscar jogos');

            const data = await response.json();
            const todosJogos = data.jogos || [];
            const nomeClube = this._clubeNome.toLowerCase();

            // Filtrar jogos do meu clube
            const jogosMeuTime = todosJogos.filter(j => {
                const mandante = (j.mandante || '').toLowerCase();
                const visitante = (j.visitante || '').toLowerCase();
                return mandante.includes(nomeClube) || visitante.includes(nomeClube);
            });

            if (jogosMeuTime.length === 0) {
                conteudo.innerHTML = this._renderSemJogosMeuTime(todosJogos.length);
                return;
            }

            conteudo.innerHTML = this._renderJogosMeuTime(jogosMeuTime);
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

    // =================================================================
    // ABA: BRASILEIRÃO - Jogos da rodada
    // =================================================================
    async _carregarBrasileirao(conteudo) {
        try {
            const response = await fetch('/api/jogos-ao-vivo');
            if (!response.ok) throw new Error('Falha ao buscar jogos');

            const data = await response.json();
            const todosJogos = data.jogos || [];

            // Filtrar Brasileirão Série A
            const jogosBrasileirao = todosJogos.filter(j => {
                const liga = (j.liga || j.campeonato || '').toLowerCase();
                return liga.includes('brasileirão a') ||
                       liga.includes('serie a') ||
                       liga.includes('série a') ||
                       liga === 'brasileirão a';
            });

            if (jogosBrasileirao.length === 0) {
                conteudo.innerHTML = this._renderSemJogosBrasileirao();
                return;
            }

            conteudo.innerHTML = this._renderBrasileirao(jogosBrasileirao);
        } catch (err) {
            console.error('[TABELAS] Erro Brasileirão:', err);
            conteudo.innerHTML = this._renderErro('Erro ao carregar dados do Brasileirão');
        }
    },

    _renderBrasileirao(jogos) {
        // Separar por status
        const aoVivo = jogos.filter(j => ['1H','2H','HT','ET','P','BT','LIVE'].includes(j.statusRaw));
        const agendados = jogos.filter(j => ['NS','TBD'].includes(j.statusRaw));
        const encerrados = jogos.filter(j => ['FT','AET','PEN'].includes(j.statusRaw));

        let html = `
            <div class="tabelas-brasileirao-header">
                <span style="font-size:18px;">🏆</span>
                <span>Brasileirão Série A — Jogos de Hoje</span>
            </div>
        `;

        if (aoVivo.length > 0) {
            html += `<div class="tabelas-secao-label tabelas-secao-aovivo">
                        <div class="tabelas-live-dot"></div> Ao Vivo
                     </div>`;
            html += `<div class="tabelas-jogos-lista">${aoVivo.map(j => this._renderCardJogo(j)).join('')}</div>`;
        }

        if (agendados.length > 0) {
            html += `<div class="tabelas-secao-label">Agendados</div>`;
            html += `<div class="tabelas-jogos-lista">${agendados.map(j => this._renderCardJogo(j)).join('')}</div>`;
        }

        if (encerrados.length > 0) {
            html += `<div class="tabelas-secao-label tabelas-secao-encerrado">Encerrados</div>`;
            html += `<div class="tabelas-jogos-lista">${encerrados.map(j => this._renderCardJogo(j)).join('')}</div>`;
        }

        return html;
    },

    _renderSemJogosBrasileirao() {
        return `
            <div class="tabelas-sem-jogos">
                <span style="font-size:40px;opacity:0.4;">🏆</span>
                <p class="tabelas-sem-jogos-titulo">Sem jogos do Brasileirão hoje</p>
                <p class="tabelas-sem-jogos-sub">A próxima rodada será exibida automaticamente no dia dos jogos</p>
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
            ? `<div class="tabelas-badge-live"><div class="tabelas-live-dot-sm"></div>${jogo.tempo || 'AO VIVO'}</div>`
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
                <span class="material-icons" style="font-size:32px;color:#ef4444;">error_outline</span>
                <p class="tabelas-sem-jogos-titulo">${mensagem}</p>
                <p class="tabelas-sem-jogos-sub">Tente novamente em alguns instantes</p>
            </div>
        `;
    }
};

// Expor globalmente
window.TabelasEsportes = TabelasEsportes;

console.log('[TABELAS-ESPORTES] Componente v1.0 carregado');
