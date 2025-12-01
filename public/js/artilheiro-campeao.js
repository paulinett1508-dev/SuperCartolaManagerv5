// ✅ ARTILHEIRO-CAMPEAO.JS v4.0.0
// Tabela com Rodadas em Colunas Navegáveis (Estilo Luva de Ouro)
console.log("🏆 [ARTILHEIRO] Sistema v4.0.0 carregando...");

const ArtilheiroCampeao = {
    // Configurações
    config: {
        LIGA_ID: "684d821cf1a7ae16d1f89572",
        RODADAS_VISIVEIS: 38, // ✅ Campeonato completo
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
        rodadaAtual: 36,
        rodadaFim: 35,
        rodadaInicio: 1,
        rodadaNavInicio: 1,
        rodadaParcial: null,
        mercadoAberto: false,
        carregando: false,
        inicializado: false,
        dadosRodadas: {}, // ✅ Cache dos dados por participante/rodada
    },

    // ==============================
    // INICIALIZAÇÃO
    // ==============================
    async inicializar() {
        // ✅ Evitar inicializações simultâneas
        if (this._isInitializing) {
            console.log("⏳ [ARTILHEIRO] Já está inicializando, ignorando...");
            return;
        }

        console.log("🚀 [ARTILHEIRO] Inicializando módulo v4.0.0...");
        this._isInitializing = true;

        // ✅ SEMPRE resetar estado ao reinicializar
        this.estado = {
            ranking: [],
            inativos: [], // ✅ Participantes inativos (calculado no frontend)
            estatisticas: null,
            rodadaAtual: 36,
            rodadaFim: 35,
            rodadaInicio: 1,
            rodadaNavInicio: 1,
            rodadaParcial: null,
            mercadoAberto: false,
            carregando: false,
            inicializado: false,
            dadosRodadas: {}, // ✅ Cache dos dados por participante/rodada
            statusMap: {}, // ✅ Status de inatividade dos participantes
        };

        try {
            // ✅ Esconder loading ANTES de tudo
            const loading = document.getElementById("artilheiro-loading");
            if (loading) loading.style.display = "none";

            await this.detectarRodada();
            this.renderizarLayout();

            // ✅ AUTO-CARREGAR RANKING (igual Luva de Ouro)
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
                    this.estado.rodadaAtual = data.data.rodadaAtual || 36;
                    this.estado.mercadoAberto =
                        data.data.mercadoAberto || false;

                    // ✅ LÓGICA IGUAL LUVA DE OURO:
                    // Se mercado aberto: rodadaFim = rodadaAtual (parcial)
                    // Se mercado fechado: rodadaFim = rodadaAtual (em andamento)
                    this.estado.rodadaFim = this.estado.rodadaAtual;

                    // Posicionar navegação para mostrar últimas rodadas
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
        // ✅ Esconder loading
        const loading = document.getElementById("artilheiro-loading");
        if (loading) loading.style.display = "none";

        // ✅ Tentar múltiplos containers
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

        // ✅ Mostrar container
        container.style.display = "block";

        container.innerHTML = `
            <div class="artilheiro-container">
                <!-- Header -->
                <div class="artilheiro-header">
                    <div class="artilheiro-title">
                        <span class="artilheiro-icon">🏆</span>
                        <h3>Artilheiro Campeão</h3>
                        <span class="artilheiro-badge">MODULAR</span>
                    </div>
                    <div class="artilheiro-info-rodada">
                        <span id="artilheiroInfoStatus">📊 Dados até a ${this.estado.rodadaFim}ª rodada${!this.estado.mercadoAberto ? " (em andamento)" : ""}</span>
                    </div>
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

                <!-- Mini Dashboard -->
                <div class="artilheiro-mini-dashboard" id="artilheiroMiniDashboard">
                    <div class="mini-dash-card lider">
                        <span class="mini-dash-icon">🏆</span>
                        <div class="mini-dash-content">
                            <span class="mini-dash-valor" id="dashLiderSaldo">--</span>
                            <span class="mini-dash-label">LÍDER</span>
                            <span class="mini-dash-nome" id="dashLiderNome">--</span>
                        </div>
                    </div>
                    <div class="mini-dash-card ativos">
                        <span class="mini-dash-icon">👥</span>
                        <div class="mini-dash-content">
                            <span class="mini-dash-valor" id="dashAtivos">--</span>
                            <span class="mini-dash-label">ATIVOS</span>
                            <span class="mini-dash-nome" id="dashInativos">-- inativo(s)</span>
                        </div>
                    </div>
                    <div class="mini-dash-card destaque">
                        <span class="mini-dash-icon">⭐</span>
                        <div class="mini-dash-content">
                            <span class="mini-dash-valor" id="dashMelhorRodadaGols">--</span>
                            <span class="mini-dash-label">MELHOR RODADA</span>
                            <span class="mini-dash-nome" id="dashMelhorRodadaInfo">--</span>
                        </div>
                    </div>
                </div>
            </div>
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

            // ✅ Buscar status de inatividade (igual ranking.js)
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

            // ✅ Adicionar status a cada participante
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

            // ✅ Separar ativos e inativos
            const ativos = ranking.filter((p) => p.ativo !== false);
            const inativos = ranking.filter((p) => p.ativo === false);

            // Ordenar ativos por saldo de gols (desc), depois por gols pró (desc)
            ativos.sort((a, b) => {
                if (b.saldoGols !== a.saldoGols)
                    return b.saldoGols - a.saldoGols;
                return b.golsPro - a.golsPro;
            });

            // Ordenar inativos por rodada de desistência (mais recente primeiro)
            inativos.sort(
                (a, b) =>
                    (b.rodada_desistencia || 0) - (a.rodada_desistencia || 0),
            );

            // Atribuir posições apenas aos ativos
            ativos.forEach((p, i) => {
                p.posicao = i + 1;
            });
            inativos.forEach((p) => {
                p.posicao = null;
            });

            // Guardar no estado
            this.estado.ranking = ativos;
            this.estado.inativos = inativos;

            console.log(
                `✅ [ARTILHEIRO] Ranking: ${ativos.length} ativos, ${inativos.length} inativos`,
            );
            if (this.estado.rodadaParcial) {
                console.log(
                    `⏳ Rodada ${this.estado.rodadaParcial} em andamento (parcial)`,
                );
            }

            this.renderizarTabela();
            this.inicializarEventosModal(); // ✅ Ativar cliques nas células
        } catch (error) {
            console.error("❌ [ARTILHEIRO] Erro:", error);
            this.mostrarErro("Erro ao buscar dados", error.message);
        } finally {
            this.estado.carregando = false;
        }
    },

    // ==============================
    // RENDERIZAR TABELA
    // ==============================
    renderizarTabela() {
        // ✅ Esconder loading inicial do HTML
        const loadingHTML = document.getElementById("artilheiro-loading");
        if (loadingHTML) loadingHTML.style.display = "none";

        // ✅ Garantir container visível
        const container = document.getElementById("artilheiro-container");
        if (container) container.style.display = "block";

        const thead = document.getElementById("artilheiroTableHead");
        const tbody = document.getElementById("artilheiroRankingBody");
        const navInfo = document.getElementById("artilheiroNavInfo");

        if (!thead || !tbody) return;

        const { ranking, rodadaNavInicio, rodadaFim, rodadaParcial } =
            this.estado;
        const { RODADAS_VISIVEIS } = this.config;

        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 40px; color: #e67e22;">Nenhum dado encontrado</td></tr>`;
            return;
        }

        // Calcular rodadas visíveis
        const rodadaFimVisivel = Math.min(
            rodadaNavInicio + RODADAS_VISIVEIS - 1,
            rodadaFim,
        );
        const rodadasExibir = [];
        for (let r = rodadaNavInicio; r <= rodadaFimVisivel; r++) {
            rodadasExibir.push(r);
        }

        // Atualizar info de navegação
        if (navInfo) {
            navInfo.textContent = `Rodadas ${rodadaNavInicio} - ${rodadaFimVisivel}`;
        }

        // Atualizar botões de navegação
        const btnEsq = document.getElementById("btnNavEsq");
        const btnDir = document.getElementById("btnNavDir");
        if (btnEsq) btnEsq.disabled = rodadaNavInicio <= 1;
        if (btnDir) btnDir.disabled = rodadaFimVisivel >= rodadaFim;

        // ✅ Headers das rodadas (com marcação de parcial)
        const headersRodadas = rodadasExibir
            .map((r) => {
                const isParcial = r === rodadaParcial;
                const classe = isParcial ? "col-rodada parcial" : "col-rodada";
                return `<th class="${classe}">R${r}${isParcial ? "*" : ""}</th>`;
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
                const posIcon =
                    posicao === 1
                        ? "🏆"
                        : posicao === 2
                          ? "🥈"
                          : posicao === 3
                            ? "🥉"
                            : `${posicao}º`;
                const posClass = posicao <= 3 ? `pos-${posicao}` : "";

                const sgClass =
                    p.saldoGols > 0
                        ? "positivo"
                        : p.saldoGols < 0
                          ? "negativo"
                          : "zero";

                // Criar mapa de gols por rodada
                const golsPorRodada = {};
                if (p.detalhePorRodada && Array.isArray(p.detalhePorRodada)) {
                    p.detalhePorRodada.forEach((r) => {
                        golsPorRodada[r.rodada] = r;
                    });
                }

                // ✅ Células de rodadas (com marcação de parcial e clique)
                const celulasRodadas = rodadasExibir
                    .map((r) => {
                        const rodadaData = golsPorRodada[r];
                        const isParcial =
                            r === rodadaParcial || rodadaData?.parcial === true;
                        const timeId = p.timeId;

                        // ✅ Armazenar dados para o modal
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
                            const classe =
                                saldo > 0
                                    ? "positivo"
                                    : saldo < 0
                                      ? "negativo"
                                      : "zero";
                            const parcialClass = isParcial ? " parcial" : "";
                            const temGols = gp > 0 || gc > 0;
                            const clickClass = temGols ? " clicavel" : "";
                            const dataAttr = temGols
                                ? `data-time="${timeId}" data-rodada="${r}"`
                                : "";

                            // ✅ Se é parcial e não tem gols, mostrar indicador ⏳
                            if (isParcial && gp === 0 && gc === 0) {
                                return `<td class="col-rodada-gols parcial aguardando">
                            <span class="gols-valor">⏳</span>
                            <span class="gols-detalhe">aguard.</span>
                        </td>`;
                            }

                            return `<td class="col-rodada-gols ${classe}${parcialClass}${clickClass}" ${dataAttr}>
                        <span class="gols-valor">${saldo >= 0 ? "+" : ""}${saldo}</span>
                        <span class="gols-detalhe">${gp}-${gc}</span>
                    </td>`;
                        }
                        const parcialClass = isParcial ? " parcial" : "";
                        return `<td class="col-rodada-gols vazio${parcialClass}"><span class="gols-valor">—</span></td>`;
                    })
                    .join("");

                return `
                <tr class="artilheiro-ranking-row ${posClass}">
                    <td class="col-pos"><span class="pos-badge">${posIcon}</span></td>
                    <td class="col-escudo">
                        ${p.escudo ? `<img src="${p.escudo}" class="escudo-img" onerror="this.style.display='none'">` : "⚽"}
                    </td>
                    <td class="col-nome">
                        <div class="participante-info">
                            <span class="participante-nome">${p.nome}</span>
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

        // ✅ Renderizar seção de inativos (se houver)
        this.renderizarSecaoInativos(rodadasExibir, rodadaParcial);

        // ✅ Renderizar mini dashboard
        this.renderizarMiniDashboard();
    },

    // ==============================
    // RENDERIZAR SEÇÃO DE INATIVOS
    // ==============================
    renderizarSecaoInativos(rodadasExibir, rodadaParcial) {
        const { inativos } = this.estado;

        // Remover seção existente (se houver)
        const secaoExistente = document.getElementById(
            "artilheiro-inativos-section",
        );
        if (secaoExistente) secaoExistente.remove();

        // Se não houver inativos, não renderizar
        if (!inativos || inativos.length === 0) return;

        // Criar container para a seção de inativos
        const tableContainer = document.querySelector(
            ".artilheiro-table-container",
        );
        if (!tableContainer) return;

        const secaoInativos = document.createElement("div");
        secaoInativos.id = "artilheiro-inativos-section";
        secaoInativos.className = "artilheiro-inativos-section";
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
                        ${rodadasExibir
                            .map((r) => {
                                const isParcial = r === rodadaParcial;
                                return `<th class="col-rodada${isParcial ? " parcial" : ""}">R${r}${isParcial ? "*" : ""}</th>`;
                            })
                            .join("")}
                    </tr>
                </thead>
                <tbody>
                    ${inativos
                        .map((p) => {
                            const sgClass =
                                p.saldoGols > 0
                                    ? "positivo"
                                    : p.saldoGols < 0
                                      ? "negativo"
                                      : "zero";

                            // Criar mapa de gols por rodada
                            const golsPorRodada = {};
                            if (
                                p.detalhePorRodada &&
                                Array.isArray(p.detalhePorRodada)
                            ) {
                                p.detalhePorRodada.forEach((r) => {
                                    golsPorRodada[r.rodada] = r;
                                });
                            }

                            // Células de rodadas
                            const celulasRodadas = rodadasExibir
                                .map((r) => {
                                    const rodadaData = golsPorRodada[r];
                                    const isParcial =
                                        r === rodadaParcial ||
                                        rodadaData?.parcial === true;

                                    if (rodadaData) {
                                        const gp = rodadaData.golsPro || 0;
                                        const gc = rodadaData.golsContra || 0;
                                        const saldo = gp - gc;
                                        const classe =
                                            saldo > 0
                                                ? "positivo"
                                                : saldo < 0
                                                  ? "negativo"
                                                  : "zero";
                                        const parcialClass = isParcial
                                            ? " parcial"
                                            : "";

                                        return `<td class="col-rodada-gols ${classe}${parcialClass}">
                                    <span class="gols-valor">${saldo >= 0 ? "+" : ""}${saldo}</span>
                                    <span class="gols-detalhe">${gp}-${gc}</span>
                                </td>`;
                                    }
                                    return `<td class="col-rodada-gols vazio"><span class="gols-valor">—</span></td>`;
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
                        .join("")}
                </tbody>
            </table>
        `;

        tableContainer.after(secaoInativos);
    },

    // ==============================
    // MINI DASHBOARD
    // ==============================
    renderizarMiniDashboard() {
        const { ranking, inativos } = this.estado;

        if (!ranking || ranking.length === 0) return;

        // ✅ LÍDER: Maior saldo de gols
        const lider = ranking[0]; // Já está ordenado por saldo
        const dashLiderSaldo = document.getElementById("dashLiderSaldo");
        const dashLiderNome = document.getElementById("dashLiderNome");
        if (dashLiderSaldo && dashLiderNome && lider) {
            const saldoFormatado =
                lider.saldoGols >= 0 ? `+${lider.saldoGols}` : lider.saldoGols;
            dashLiderSaldo.textContent = saldoFormatado;
            dashLiderNome.textContent = lider.nome;
        }

        // ✅ ATIVOS
        const dashAtivos = document.getElementById("dashAtivos");
        const dashInativos = document.getElementById("dashInativos");
        if (dashAtivos && dashInativos) {
            dashAtivos.textContent = ranking.length;
            const qtdInativos = inativos ? inativos.length : 0;
            dashInativos.textContent = `${qtdInativos} inativo(s)`;
        }

        // ✅ MELHOR RODADA: Maior número de gols pró em uma única rodada
        let melhorRodada = { gols: 0, rodada: 0, participante: "--" };

        ranking.forEach((p) => {
            if (p.detalhePorRodada && Array.isArray(p.detalhePorRodada)) {
                p.detalhePorRodada.forEach((r) => {
                    const golsPro = r.golsPro || 0;
                    if (golsPro > melhorRodada.gols) {
                        melhorRodada = {
                            gols: golsPro,
                            rodada: r.rodada,
                            participante: p.nome,
                        };
                    }
                });
            }
        });

        const dashMelhorGols = document.getElementById("dashMelhorRodadaGols");
        const dashMelhorInfo = document.getElementById("dashMelhorRodadaInfo");
        if (dashMelhorGols && dashMelhorInfo) {
            dashMelhorGols.textContent = `${melhorRodada.gols} GP`;
            dashMelhorInfo.textContent =
                melhorRodada.gols > 0
                    ? `${melhorRodada.participante} (R${melhorRodada.rodada})`
                    : "--";
        }
    },

    // ==============================
    // LOADING E ERRO
    // ==============================
    mostrarLoading(mensagem) {
        // ✅ Esconder loading inicial do HTML
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
        // ✅ Esconder loading inicial do HTML
        const loadingHTML = document.getElementById("artilheiro-loading");
        if (loadingHTML) loadingHTML.style.display = "none";

        // ✅ Garantir container visível
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

        // Criar modal se não existir
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

        // Listar artilheiros
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
                        <span class="resumo-label">GP</span>
                        <span class="resumo-valor positivo">${dados.golsPro}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">GC</span>
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

        // Fechar ao clicar fora
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

    // Inicializar event listeners do modal
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

        // Fechar modal com ESC
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

// ✅ Função para inicialização externa (chamada pelo orquestrador)
window.inicializarArtilheiroCampeao = async function () {
    console.log("🔄 [ARTILHEIRO] Inicializando via window...");
    // ✅ Resetar flags para garantir re-inicialização
    ArtilheiroCampeao._isInitializing = false;
    ArtilheiroCampeao.estado.inicializado = false;
    await ArtilheiroCampeao.inicializar();
};

// ✅ Auto-inicialização simples (só na primeira carga do script)
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

console.log("✅ [ARTILHEIRO] Módulo v4.0.0 carregado!");
