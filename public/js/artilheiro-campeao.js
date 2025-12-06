// ✅ ARTILHEIRO-CAMPEAO.JS v4.3.0
// Tabela com Rodadas em Colunas - DESTAQUE 1º LUGAR + RODADA FINAL
console.log("🏆 [ARTILHEIRO] Sistema v4.3.0 carregando...");

const ArtilheiroCampeao = {
    // Configurações
    config: {
        LIGA_ID: "684d821cf1a7ae16d1f89572",
        RODADAS_VISIVEIS: 38,
        RODADA_FINAL: 38, // ✅ v4.3: Constante da rodada final
        API: {
            RANKING: (ligaId) => `/api/artilheiro-campeao/${ligaId}/ranking`,
            DETECTAR_RODADA: (ligaId) =>
                `/api/artilheiro-campeao/${ligaId}/detectar-rodada`,
        },
    },

    // Estado
    estado: {
        ranking: [],
        estatisticas: null,
        rodadaAtual: 38,
        rodadaFim: 37,
        rodadaInicio: 1,
        rodadaNavInicio: 1,
        rodadaParcial: null,
        mercadoAberto: false,
        carregando: false,
        inicializado: false,
        dadosRodadas: {},
    },

    // ==============================
    // INICIALIZAÇÃO
    // ==============================
    async inicializar() {
        if (this._isInitializing) {
            console.log("⏳ [ARTILHEIRO] Já está inicializando, ignorando...");
            return;
        }

        console.log("🚀 [ARTILHEIRO] Inicializando módulo v4.3.0...");
        this._isInitializing = true;

        this.estado = {
            ranking: [],
            inativos: [],
            estatisticas: null,
            rodadaAtual: 38,
            rodadaFim: 37,
            rodadaInicio: 1,
            rodadaNavInicio: 1,
            rodadaParcial: null,
            mercadoAberto: false,
            carregando: false,
            inicializado: false,
            dadosRodadas: {},
            statusMap: {},
        };

        try {
            const loading = document.getElementById("artilheiro-loading");
            if (loading) loading.style.display = "none";

            await this.detectarRodada();
            this.renderizarLayout();
            await this.buscarRanking(false);

            this.estado.inicializado = true;
            console.log("✅ [ARTILHEIRO] Módulo inicializado!");
        } catch (error) {
            console.error("❌ [ARTILHEIRO] Erro na inicialização:", error);
            this.mostrarErro("Erro na inicialização", error.message);
        } finally {
            this._isInitializing = false;
        }
    },

    async detectarRodada() {
        try {
            const response = await fetch(
                this.config.API.DETECTAR_RODADA(this.config.LIGA_ID),
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.estado.rodadaAtual = data.data.rodadaAtual || 38;
                    this.estado.mercadoAberto =
                        data.data.mercadoAberto || false;
                    this.estado.rodadaFim = this.estado.rodadaAtual;

                    this.estado.rodadaNavInicio = Math.max(
                        1,
                        this.estado.rodadaFim -
                            this.config.RODADAS_VISIVEIS +
                            1,
                    );

                    console.log(
                        `📅 Rodada detectada: ${this.estado.rodadaAtual}, Mercado: ${this.estado.mercadoAberto ? "Aberto" : "Fechado"}`,
                    );
                }
            }
        } catch (error) {
            console.warn("⚠️ Erro ao detectar rodada:", error.message);
        }
    },

    // ==============================
    // LAYOUT PRINCIPAL
    // ==============================
    renderizarLayout() {
        const loading = document.getElementById("artilheiro-loading");
        if (loading) loading.style.display = "none";

        let container = document.getElementById("artilheiro-container");
        if (!container) {
            container = document.getElementById("artilheiro-campeao-content");
        }
        if (!container) {
            container = document.getElementById("modulo-content");
        }

        if (!container) {
            console.error("❌ [ARTILHEIRO] Container não encontrado!");
            return;
        }

        container.style.display = "block";

        // ✅ v4.3: Verificar se é rodada final
        const isRodadaFinal =
            this.estado.rodadaAtual === this.config.RODADA_FINAL;
        const isParcial = !this.estado.mercadoAberto;

        container.innerHTML = `
            <div class="artilheiro-container">
                <!-- ✅ v4.3: BANNER RODADA FINAL -->
                <div id="artilheiroBannerRodadaFinal"></div>

                <!-- Header -->
                <div class="artilheiro-header">
                    <div class="artilheiro-title">
                        <span class="artilheiro-icon">🏆</span>
                        <h3>Artilheiro Campeão</h3>
                        <span class="artilheiro-badge">MODULAR</span>
                    </div>
                    <div class="artilheiro-info-rodada">
                        <span id="artilheiroInfoStatus">📊 Dados até a ${this.estado.rodadaFim}ª rodada${isParcial ? " (em andamento)" : ""}</span>
                    </div>
                </div>

                <!-- LEGENDA UX -->
                <div class="artilheiro-legenda">
                    <span class="legenda-item"><span class="legenda-cor gp"></span> GP = Gols Pró</span>
                    <span class="legenda-item"><span class="legenda-cor gc"></span> GC = Gols Contra</span>
                    <span class="legenda-item"><span class="legenda-cor sg-pos"></span> Saldo +</span>
                    <span class="legenda-item"><span class="legenda-cor sg-neg"></span> Saldo -</span>
                </div>

                <!-- Navegação de rodadas -->
                <div class="artilheiro-nav-container">
                    <button class="artilheiro-nav-btn" onclick="ArtilheiroCampeao.navegarRodadas('esquerda')" id="btnNavEsq">
                        ◀
                    </button>
                    <span id="artilheiroNavInfo" class="artilheiro-nav-info">Rodadas 1 - ${this.config.RODADAS_VISIVEIS}</span>
                    <button class="artilheiro-nav-btn" onclick="ArtilheiroCampeao.navegarRodadas('direita')" id="btnNavDir">
                        ▶
                    </button>
                </div>

                <!-- Tabela -->
                <div class="artilheiro-table-container">
                    <table class="artilheiro-ranking-table">
                        <thead id="artilheiroTableHead">
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-escudo"></th>
                                <th class="col-nome">CARTOLEIRO</th>
                                <th class="col-total-gp">GP</th>
                                <th class="col-total-gc">GC</th>
                                <th class="col-total-sg">SG</th>
                            </tr>
                        </thead>
                        <tbody id="artilheiroRankingBody">
                            <tr>
                                <td colspan="20" style="text-align: center; padding: 40px; color: #888;">
                                    <div class="artilheiro-loading">
                                        <div class="spinner"></div>
                                        <p>Carregando dados...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ✅ v4.3: ESTILOS DE DESTAQUE -->
            ${this._injetarEstilosDestaque()}
        `;
    },

    // ==============================
    // ✅ v4.3: BANNER RODADA FINAL
    // ==============================
    _renderizarBannerRodadaFinal() {
        const bannerContainer = document.getElementById(
            "artilheiroBannerRodadaFinal",
        );
        if (!bannerContainer) return;

        const { rodadaAtual, mercadoAberto, ranking } = this.estado;
        const isRodadaFinal = rodadaAtual === this.config.RODADA_FINAL;

        if (!isRodadaFinal) {
            bannerContainer.innerHTML = "";
            return;
        }

        const isParcial = !mercadoAberto;
        const statusTexto = isParcial ? "EM ANDAMENTO" : "ÚLTIMA RODADA";
        const lider = ranking[0];
        const liderNome = lider?.nome || "---";
        const liderGols = lider?.golsPro || 0;

        bannerContainer.innerHTML = `
            <div class="rodada-final-banner ${isParcial ? "parcial-ativo" : ""}">
                <div class="banner-content">
                    <div class="banner-icon">🏁</div>
                    <div class="banner-info">
                        <span class="banner-titulo">RODADA FINAL</span>
                        <span class="banner-status ${isParcial ? "pulsando" : ""}">${statusTexto}</span>
                    </div>
                    ${
                        lider
                            ? `
                        <div class="banner-lider">
                            <span class="lider-label">POSSÍVEL ARTILHEIRO</span>
                            <span class="lider-nome">${liderNome} (${liderGols} gols)</span>
                        </div>
                    `
                            : ""
                    }
                </div>
            </div>
        `;
    },

    // ==============================
    // ✅ v4.3: ESTILOS DE DESTAQUE
    // ==============================
    _injetarEstilosDestaque() {
        return `
            <style id="artilheiro-estilos-destaque">
                /* ✅ BANNER RODADA FINAL */
                .rodada-final-banner {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 2px solid #ffd700;
                    border-radius: 12px;
                    padding: 12px 20px;
                    margin-bottom: 15px;
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                }
                .rodada-final-banner.parcial-ativo {
                    animation: borderPulseArt 2s infinite;
                }
                @keyframes borderPulseArt {
                    0%, 100% { border-color: #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); }
                    50% { border-color: #ff6b6b; box-shadow: 0 4px 20px rgba(255, 107, 107, 0.5); }
                }
                .banner-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    flex-wrap: wrap;
                }
                .banner-icon {
                    font-size: 2rem;
                }
                .banner-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .banner-titulo {
                    color: #ffd700;
                    font-size: 1.2rem;
                    font-weight: bold;
                    letter-spacing: 2px;
                }
                .banner-status {
                    color: #aaa;
                    font-size: 0.8rem;
                    margin-top: 2px;
                }
                .banner-status.pulsando {
                    color: #ff6b6b;
                    animation: textPulseArt 1.5s infinite;
                }
                @keyframes textPulseArt {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .banner-lider {
                    background: linear-gradient(135deg, #ffd700, #ffaa00);
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .lider-label {
                    font-size: 0.65rem;
                    color: #1a1a2e;
                    font-weight: 600;
                    letter-spacing: 1px;
                }
                .lider-nome {
                    font-size: 0.95rem;
                    color: #1a1a2e;
                    font-weight: bold;
                }

                /* ✅ DESTAQUE DO LÍDER/CAMPEÃO - APENAS 1º LUGAR */
                .artilheiro-ranking-row.lider-destaque {
                    background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 255, 255, 0) 100%) !important;
                    border-left: 4px solid #ffd700 !important;
                }

                .pos-badge.pos-campeao {
                    background: linear-gradient(135deg, #ffd700, #ffaa00) !important;
                    color: #1a1a2e !important;
                    font-size: 1.1rem !important;
                    padding: 4px 8px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5) !important;
                    animation: brilhoTrofeuArt 2s infinite;
                }

                @keyframes brilhoTrofeuArt {
                    0%, 100% { box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5); }
                    50% { box-shadow: 0 2px 15px rgba(255, 215, 0, 0.8); }
                }

                /* ✅ POSSÍVEL CAMPEÃO (RODADA FINAL EM ANDAMENTO) */
                .artilheiro-ranking-row.possivel-campeao {
                    animation: destaqueCampeaoArt 1.5s infinite;
                }

                @keyframes destaqueCampeaoArt {
                    0%, 100% { 
                        background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 255, 255, 0) 100%);
                    }
                    50% { 
                        background: linear-gradient(90deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 255, 255, 0) 100%);
                    }
                }

                .coroa-animada {
                    animation: coroaPulseArt 1s infinite;
                    display: inline-block;
                    margin-left: 4px;
                }

                @keyframes coroaPulseArt {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }

                /* ✅ COLUNA RODADA FINAL */
                th.col-rodada.rodada-final {
                    background: linear-gradient(135deg, #ffd700, #ffaa00) !important;
                    color: #1a1a2e !important;
                    font-weight: bold !important;
                }
            </style>
        `;
    },

    // ==============================
    // NAVEGAÇÃO DE RODADAS
    // ==============================
    navegarRodadas(direcao) {
        const { rodadaNavInicio, rodadaFim } = this.estado;
        const { RODADAS_VISIVEIS } = this.config;

        if (direcao === "esquerda") {
            this.estado.rodadaNavInicio = Math.max(
                1,
                rodadaNavInicio - RODADAS_VISIVEIS,
            );
        } else {
            this.estado.rodadaNavInicio = Math.min(
                Math.max(1, rodadaFim - RODADAS_VISIVEIS + 1),
                rodadaNavInicio + RODADAS_VISIVEIS,
            );
        }

        console.log(
            `[ARTILHEIRO] Navegando ${direcao}: início=${this.estado.rodadaNavInicio}`,
        );
        this.renderizarTabela();
    },

    // ==============================
    // BUSCAR RANKING
    // ==============================
    async buscarRanking(forcarColeta = false) {
        if (this.estado.carregando) return;

        try {
            this.estado.carregando = true;
            this.mostrarLoading("Buscando dados do servidor...");

            const params = new URLSearchParams({
                inicio: "1",
                fim: this.estado.rodadaFim.toString(),
                ...(forcarColeta && { forcar_coleta: "true" }),
            });

            const url = `${this.config.API.RANKING(this.config.LIGA_ID)}?${params}`;
            console.log(`📡 [ARTILHEIRO] Buscando: ${url}`);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success)
                throw new Error(data.error || "Erro ao buscar ranking");

            let ranking = data.data.ranking || [];
            this.estado.estatisticas = data.data.estatisticas || null;
            this.estado.rodadaParcial = data.data.rodadaParcial || null;

            // Buscar status de inatividade
            const timeIds = ranking.map((p) => p.timeId);
            let statusMap = {};

            try {
                const statusRes = await fetch("/api/times/batch/status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ timeIds }),
                });

                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    statusMap = statusData.status || {};
                    console.log(
                        `✅ [ARTILHEIRO] Status de inatividade carregado`,
                    );
                }
            } catch (error) {
                console.warn(
                    "[ARTILHEIRO] ⚠️ Falha ao buscar status:",
                    error.message,
                );
            }

            this.estado.statusMap = statusMap;

            ranking = ranking.map((p) => {
                const status = statusMap[p.timeId] || {
                    ativo: true,
                    rodada_desistencia: null,
                };
                return {
                    ...p,
                    ativo: status.ativo,
                    rodada_desistencia: status.rodada_desistencia,
                };
            });

            const ativos = ranking.filter((p) => p.ativo !== false);
            const inativos = ranking.filter((p) => p.ativo === false);

            ativos.sort((a, b) => {
                if (b.saldoGols !== a.saldoGols)
                    return b.saldoGols - a.saldoGols;
                return b.golsPro - a.golsPro;
            });

            inativos.sort(
                (a, b) =>
                    (b.rodada_desistencia || 0) - (a.rodada_desistencia || 0),
            );

            ativos.forEach((p, i) => {
                p.posicao = i + 1;
            });
            inativos.forEach((p) => {
                p.posicao = null;
            });

            this.estado.ranking = ativos;
            this.estado.inativos = inativos;

            console.log(
                `✅ [ARTILHEIRO] Ranking: ${ativos.length} ativos, ${inativos.length} inativos`,
            );

            this.renderizarTabela();
            this._renderizarBannerRodadaFinal(); // ✅ v4.3: Renderizar banner
            this.inicializarEventosModal();
        } catch (error) {
            console.error("❌ [ARTILHEIRO] Erro:", error);
            this.mostrarErro("Erro ao buscar dados", error.message);
        } finally {
            this.estado.carregando = false;
        }
    },

    // ==============================
    // RENDERIZAR TABELA - v4.3 COM DESTAQUE 1º LUGAR
    // ==============================
    renderizarTabela() {
        const loadingHTML = document.getElementById("artilheiro-loading");
        if (loadingHTML) loadingHTML.style.display = "none";

        const container = document.getElementById("artilheiro-container");
        if (container) container.style.display = "block";

        const thead = document.getElementById("artilheiroTableHead");
        const tbody = document.getElementById("artilheiroRankingBody");
        const navInfo = document.getElementById("artilheiroNavInfo");

        if (!thead || !tbody) return;

        const {
            ranking,
            rodadaNavInicio,
            rodadaFim,
            rodadaParcial,
            rodadaAtual,
            mercadoAberto,
        } = this.estado;
        const { RODADAS_VISIVEIS, RODADA_FINAL } = this.config;

        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 40px; color: #e67e22;">Nenhum dado encontrado</td></tr>`;
            return;
        }

        // ✅ v4.3: Verificar se é rodada final com parcial
        const isRodadaFinalParcial =
            rodadaAtual === RODADA_FINAL && !mercadoAberto;

        const rodadaFimVisivel = Math.min(
            rodadaNavInicio + RODADAS_VISIVEIS - 1,
            rodadaFim,
        );
        const rodadasExibir = [];
        for (let r = rodadaNavInicio; r <= rodadaFimVisivel; r++) {
            rodadasExibir.push(r);
        }

        if (navInfo) {
            navInfo.textContent = `Rodadas ${rodadaNavInicio} - ${rodadaFimVisivel}`;
        }

        const btnEsq = document.getElementById("btnNavEsq");
        const btnDir = document.getElementById("btnNavDir");
        if (btnEsq) btnEsq.disabled = rodadaNavInicio <= 1;
        if (btnDir) btnDir.disabled = rodadaFimVisivel >= rodadaFim;

        // ✅ v4.3: Headers das rodadas com marcação de final
        const headersRodadas = rodadasExibir
            .map((r) => {
                const isParcial = r === rodadaParcial;
                const isFinal = r === RODADA_FINAL;
                let classe = "col-rodada";
                if (isParcial) classe += " parcial";
                if (isFinal) classe += " rodada-final";
                return `<th class="${classe}">R${r}${isParcial ? "*" : ""}${isFinal ? "🏁" : ""}</th>`;
            })
            .join("");

        thead.innerHTML = `
            <tr>
                <th class="col-pos">#</th>
                <th class="col-escudo"></th>
                <th class="col-nome">CARTOLEIRO</th>
                <th class="col-total-gp">GP</th>
                <th class="col-total-gc">GC</th>
                <th class="col-total-sg">SG</th>
                ${headersRodadas}
            </tr>
        `;

        // Renderizar linhas
        tbody.innerHTML = ranking
            .map((p, index) => {
                const posicao = p.posicao || index + 1;

                // ✅ v4.3: DESTAQUE APENAS NO 1º LUGAR
                let posIcon;
                let posClass = "";
                let rowClass = "artilheiro-ranking-row";
                let coroaHtml = "";

                if (posicao === 1) {
                    posIcon = "🏆";
                    posClass = "pos-campeao";
                    rowClass += " lider-destaque";

                    if (isRodadaFinalParcial) {
                        rowClass += " possivel-campeao";
                        coroaHtml = '<span class="coroa-animada">👑</span>';
                    }
                } else {
                    // ✅ v4.3: 2º e 3º lugares SEM destaque especial
                    posIcon = `${posicao}º`;
                }

                const sgClass =
                    p.saldoGols > 0
                        ? "positivo"
                        : p.saldoGols < 0
                          ? "negativo"
                          : "zero";

                const golsPorRodada = {};
                if (p.detalhePorRodada && Array.isArray(p.detalhePorRodada)) {
                    p.detalhePorRodada.forEach((r) => {
                        golsPorRodada[r.rodada] = r;
                    });
                }

                const celulasRodadas = rodadasExibir
                    .map((r) => {
                        const rodadaData = golsPorRodada[r];
                        const isParcial =
                            r === rodadaParcial || rodadaData?.parcial === true;
                        const timeId = p.timeId;

                        if (rodadaData && rodadaData.jogadores) {
                            const key = `${timeId}-${r}`;
                            ArtilheiroCampeao.estado.dadosRodadas[key] = {
                                participante: p.nome,
                                nomeTime: p.nomeTime,
                                rodada: r,
                                golsPro: rodadaData.golsPro || 0,
                                golsContra: rodadaData.golsContra || 0,
                                jogadores: rodadaData.jogadores || [],
                                parcial: isParcial,
                            };
                        }

                        if (rodadaData) {
                            const gp = rodadaData.golsPro || 0;
                            const gc = rodadaData.golsContra || 0;
                            const saldo = gp - gc;
                            const saldoClasse =
                                saldo > 0
                                    ? "positivo"
                                    : saldo < 0
                                      ? "negativo"
                                      : "zero";
                            const parcialClass = isParcial ? " parcial" : "";
                            const temGols = gp > 0 || gc > 0;
                            const temGC = gc > 0;
                            const clickClass = temGols ? " clicavel" : "";
                            const gcClass = temGC ? " tem-gc" : "";
                            const dataAttr = temGols
                                ? `data-time="${timeId}" data-rodada="${r}"`
                                : "";

                            if (isParcial && gp === 0 && gc === 0) {
                                return `<td class="col-rodada-gols parcial aguardando">
                                    <div class="gols-celula">
                                        <span class="gols-saldo">⏳</span>
                                    </div>
                                </td>`;
                            }

                            return `<td class="col-rodada-gols${parcialClass}${clickClass}${gcClass}" ${dataAttr} title="GP: ${gp} | GC: ${gc} | Saldo: ${saldo >= 0 ? "+" : ""}${saldo}">
                                <div class="gols-celula">
                                    <span class="gols-saldo ${saldoClasse}">${saldo >= 0 ? "+" : ""}${saldo}</span>
                                    <div class="gols-linha">
                                        <span class="gols-gp">${gp}</span>
                                        <span class="gols-gc${gc === 0 ? " zero" : ""}">${gc}</span>
                                    </div>
                                </div>
                            </td>`;
                        }
                        const parcialClass = isParcial ? " parcial" : "";
                        return `<td class="col-rodada-gols vazio${parcialClass}"><div class="gols-celula"><span class="gols-saldo">—</span></div></td>`;
                    })
                    .join("");

                return `
                <tr class="${rowClass}">
                    <td class="col-pos"><span class="pos-badge ${posClass}">${posIcon}</span></td>
                    <td class="col-escudo">
                        ${p.escudo ? `<img src="${p.escudo}" class="escudo-img" onerror="this.style.display='none'">` : "⚽"}
                    </td>
                    <td class="col-nome">
                        <div class="participante-info">
                            <span class="participante-nome">${p.nome}${coroaHtml}</span>
                            <span class="participante-time">${p.nomeTime}</span>
                        </div>
                    </td>
                    <td class="col-total-gp"><span class="total-gp">${p.golsPro}</span></td>
                    <td class="col-total-gc"><span class="total-gc">${p.golsContra}</span></td>
                    <td class="col-total-sg"><span class="total-sg ${sgClass}">${p.saldoGols >= 0 ? "+" : ""}${p.saldoGols}</span></td>
                    ${celulasRodadas}
                </tr>
            `;
            })
            .join("");

        this.renderizarSecaoInativos(rodadasExibir, rodadaParcial);
    },

    // ==============================
    // RENDERIZAR SEÇÃO DE INATIVOS
    // ==============================
    renderizarSecaoInativos(rodadasExibir, rodadaParcial) {
        const { inativos } = this.estado;

        const secaoExistente = document.getElementById(
            "artilheiro-inativos-section",
        );
        if (secaoExistente) secaoExistente.remove();

        if (!inativos || inativos.length === 0) return;

        const tableContainer = document.querySelector(
            ".artilheiro-table-container",
        );
        if (!tableContainer) return;

        const secaoInativos = document.createElement("div");
        secaoInativos.id = "artilheiro-inativos-section";
        secaoInativos.className = "artilheiro-inativos-section";

        const linhasInativos = inativos
            .map((p) => {
                const sgClass =
                    p.saldoGols > 0
                        ? "positivo"
                        : p.saldoGols < 0
                          ? "negativo"
                          : "zero";

                const golsPorRodada = {};
                if (p.detalhePorRodada && Array.isArray(p.detalhePorRodada)) {
                    p.detalhePorRodada.forEach((r) => {
                        golsPorRodada[r.rodada] = r;
                    });
                }

                const celulasRodadas = rodadasExibir
                    .map((r) => {
                        const rodadaData = golsPorRodada[r];
                        const isParcial =
                            r === rodadaParcial || rodadaData?.parcial === true;

                        if (rodadaData) {
                            const gp = rodadaData.golsPro || 0;
                            const gc = rodadaData.golsContra || 0;
                            const saldo = gp - gc;
                            const saldoClasse =
                                saldo > 0
                                    ? "positivo"
                                    : saldo < 0
                                      ? "negativo"
                                      : "zero";
                            const parcialClass = isParcial ? " parcial" : "";
                            const temGC = gc > 0;
                            const gcClass = temGC ? " tem-gc" : "";

                            return `<td class="col-rodada-gols ${saldoClasse}${parcialClass}${gcClass}">
                                <div class="gols-celula">
                                    <span class="gols-saldo ${saldoClasse}">${saldo >= 0 ? "+" : ""}${saldo}</span>
                                    <div class="gols-linha">
                                        <span class="gols-gp">${gp}</span>
                                        <span class="gols-gc${gc === 0 ? " zero" : ""}">${gc}</span>
                                    </div>
                                </div>
                            </td>`;
                        }
                        return `<td class="col-rodada-gols vazio"><div class="gols-celula"><span class="gols-saldo">—</span></div></td>`;
                    })
                    .join("");

                return `
                <tr class="artilheiro-ranking-row inativo">
                    <td class="col-pos"><span class="pos-badge">—</span></td>
                    <td class="col-escudo">
                        ${p.escudo ? `<img src="${p.escudo}" class="escudo-img" onerror="this.style.display='none'">` : "⚽"}
                    </td>
                    <td class="col-nome">
                        <div class="participante-info">
                            <span class="participante-nome">${p.nome}</span>
                            <span class="participante-time">${p.nomeTime}</span>
                            ${p.rodada_desistencia ? `<span class="desistencia-badge">Saiu R${p.rodada_desistencia}</span>` : ""}
                        </div>
                    </td>
                    <td class="col-total-gp"><span class="total-gp">${p.golsPro}</span></td>
                    <td class="col-total-gc"><span class="total-gc">${p.golsContra}</span></td>
                    <td class="col-total-sg"><span class="total-sg ${sgClass}">${p.saldoGols >= 0 ? "+" : ""}${p.saldoGols}</span></td>
                    ${celulasRodadas}
                </tr>
            `;
            })
            .join("");

        const headersRodadas = rodadasExibir
            .map((r) => `<th class="col-rodada">R${r}</th>`)
            .join("");

        secaoInativos.innerHTML = `
            <div class="inativos-header">
                <span class="inativos-icon">🚫</span>
                <h4>Participantes Inativos</h4>
                <span class="inativos-badge">${inativos.length}</span>
                <span class="inativos-info">Fora da disputa do ranking</span>
            </div>
            <table class="artilheiro-ranking-table inativos-table">
                <thead>
                    <tr>
                        <th class="col-pos">#</th>
                        <th class="col-escudo"></th>
                        <th class="col-nome">CARTOLEIRO</th>
                        <th class="col-total-gp">GP</th>
                        <th class="col-total-gc">GC</th>
                        <th class="col-total-sg">SG</th>
                        ${headersRodadas}
                    </tr>
                </thead>
                <tbody>
                    ${linhasInativos}
                </tbody>
            </table>
        `;

        tableContainer.after(secaoInativos);
    },

    // ==============================
    // LOADING E ERRO
    // ==============================
    mostrarLoading(mensagem) {
        const loadingHTML = document.getElementById("artilheiro-loading");
        if (loadingHTML) loadingHTML.style.display = "none";

        const tbody = document.getElementById("artilheiroRankingBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="20">
                        <div class="artilheiro-loading">
                            <div class="spinner"></div>
                            <p>${mensagem}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    mostrarErro(titulo, mensagem) {
        const loadingHTML = document.getElementById("artilheiro-loading");
        if (loadingHTML) loadingHTML.style.display = "none";

        const container = document.getElementById("artilheiro-container");
        if (container) container.style.display = "block";

        const tbody = document.getElementById("artilheiroRankingBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="20">
                        <div class="artilheiro-erro">
                            <span class="erro-icon">❌</span>
                            <p class="erro-msg">${titulo}</p>
                            <p class="erro-detalhe">${mensagem}</p>
                            <button class="artilheiro-btn primary" onclick="ArtilheiroCampeao.buscarRanking()">
                                🔄 Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    // ==============================
    // UTILITÁRIOS
    // ==============================
    obterContainer() {
        const containers = [
            "artilheiro-container",
            "artilheiro-campeao-content",
            "modulo-content",
        ];
        for (const id of containers) {
            const el = document.getElementById(id);
            if (el) return el;
        }
        return null;
    },

    // ==============================
    // MODAL DE DETALHES DA RODADA
    // ==============================
    mostrarModalRodada(timeId, rodada) {
        const key = `${timeId}-${rodada}`;
        const dados = this.estado.dadosRodadas[key];

        if (!dados) {
            console.warn("Dados não encontrados para:", key);
            return;
        }

        let modal = document.getElementById("artilheiro-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "artilheiro-modal";
            modal.className = "artilheiro-modal-overlay";
            document.body.appendChild(modal);
        }

        const parcialBadge = dados.parcial
            ? '<span class="modal-badge-parcial">EM ANDAMENTO</span>'
            : "";

        const artilheiros = dados.jogadores.filter((j) => j.gols > 0);
        const golsContra = dados.jogadores.filter((j) => j.golsContra > 0);

        let listaArtilheiros = "";
        if (artilheiros.length > 0) {
            listaArtilheiros = `
                <div class="modal-secao">
                    <h4>⚽ Gols Marcados</h4>
                    <ul class="modal-lista-gols">
                        ${artilheiros
                            .map(
                                (j) => `
                            <li class="gol-item positivo">
                                <span class="jogador-nome">${j.nome}</span>
                                <span class="jogador-gols">${j.gols} gol${j.gols > 1 ? "s" : ""}</span>
                            </li>
                        `,
                            )
                            .join("")}
                    </ul>
                </div>
            `;
        }

        let listaGolsContra = "";
        if (golsContra.length > 0) {
            listaGolsContra = `
                <div class="modal-secao">
                    <h4>🥅 Gols Contra</h4>
                    <ul class="modal-lista-gols">
                        ${golsContra
                            .map(
                                (j) => `
                            <li class="gol-item negativo">
                                <span class="jogador-nome">${j.nome}</span>
                                <span class="jogador-gols">${j.golsContra} gol${j.golsContra > 1 ? "s" : ""}</span>
                            </li>
                        `,
                            )
                            .join("")}
                    </ul>
                </div>
            `;
        }

        const saldo = dados.golsPro - dados.golsContra;
        const saldoClass =
            saldo > 0 ? "positivo" : saldo < 0 ? "negativo" : "zero";

        modal.innerHTML = `
            <div class="artilheiro-modal-content">
                <button class="modal-fechar" onclick="ArtilheiroCampeao.fecharModal()">✕</button>
                <div class="modal-header">
                    <h3>Rodada ${rodada} ${parcialBadge}</h3>
                    <p class="modal-participante">${dados.participante}</p>
                    <p class="modal-time">${dados.nomeTime}</p>
                </div>
                <div class="modal-resumo">
                    <div class="resumo-item">
                        <span class="resumo-label">Gols Pró</span>
                        <span class="resumo-valor positivo">${dados.golsPro}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Gols Contra</span>
                        <span class="resumo-valor negativo">${dados.golsContra}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Saldo</span>
                        <span class="resumo-valor ${saldoClass}">${saldo >= 0 ? "+" : ""}${saldo}</span>
                    </div>
                </div>
                ${listaArtilheiros}
                ${listaGolsContra}
                ${artilheiros.length === 0 && golsContra.length === 0 ? '<p class="modal-vazio">Nenhum gol registrado</p>' : ""}
            </div>
        `;

        modal.classList.add("ativo");

        modal.onclick = (e) => {
            if (e.target === modal) this.fecharModal();
        };
    },

    fecharModal() {
        const modal = document.getElementById("artilheiro-modal");
        if (modal) {
            modal.classList.remove("ativo");
        }
    },

    inicializarEventosModal() {
        const tbody = document.getElementById("artilheiroRankingBody");
        if (!tbody) return;

        tbody.addEventListener("click", (e) => {
            const celula = e.target.closest(".col-rodada-gols.clicavel");
            if (celula) {
                const timeId = celula.dataset.time;
                const rodada = parseInt(celula.dataset.rodada);
                if (timeId && rodada) {
                    this.mostrarModalRodada(timeId, rodada);
                }
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.fecharModal();
        });
    },
};

// Expor globalmente
window.ArtilheiroCampeao = ArtilheiroCampeao;

// Compatibilidade
window.coordinator = {
    popularGols: () => ArtilheiroCampeao.buscarRanking(),
};

window.inicializarArtilheiroCampeao = async function () {
    console.log("🔄 [ARTILHEIRO] Inicializando via window...");
    ArtilheiroCampeao._isInitializing = false;
    ArtilheiroCampeao.estado.inicializado = false;
    await ArtilheiroCampeao.inicializar();
};

(function autoInit() {
    setTimeout(async () => {
        const container =
            document.getElementById("artilheiro-container") ||
            document.getElementById("artilheiro-campeao-content");

        if (container) {
            console.log("🚀 [ARTILHEIRO] Auto-inicializando...");
            try {
                await ArtilheiroCampeao.inicializar();
            } catch (e) {
                console.error("❌ [ARTILHEIRO] Erro na auto-inicialização:", e);
            }
        } else {
            console.log(
                "⏳ [ARTILHEIRO] Container não encontrado, aguardando...",
            );
        }
    }, 300);
})();

console.log("✅ [ARTILHEIRO] Módulo v4.3.0 carregado!");
