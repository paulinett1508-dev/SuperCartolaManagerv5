// ✅ ARTILHEIRO-CAMPEAO.JS v4.6.0 SaaS
// Tabela com Rodadas em Colunas - DESTAQUE 1º LUGAR + RODADA FINAL + Material Icons
// v4.6.0: FIX CRÍTICO - Removido fallback || 38 que causava loop de requisições
// v4.5.0: Removido liga ID hardcoded - usa URL dinamicamente
// v4.4.1: Fix temporada encerrada (não mostrar como parcial após R38)
console.log("🏆 [ARTILHEIRO] Sistema v4.6.0 SaaS carregando...");

const ArtilheiroCampeao = {
    // Configurações
    config: {
        // v4.5.0: Liga ID obtido dinamicamente da URL
        getLigaId: function() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get("id");
        },
        RODADAS_VISIVEIS: 38,
        RODADA_FINAL: 38, // ✅ v4.3: Constante da rodada final
        API: {
            RANKING: (ligaId) => `/api/artilheiro-campeao/${ligaId}/ranking`,
            DETECTAR_RODADA: (ligaId) =>
                `/api/artilheiro-campeao/${ligaId}/detectar-rodada`,
            ESTATISTICAS: (ligaId) => `/api/artilheiro-campeao/${ligaId}/estatisticas`,
            PREMIAR: (ligaId) => `/api/artilheiro-campeao/${ligaId}/premiar`,
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
        temporadaEncerrada: true, // v4.4.1: Flag para temporada encerrada
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

        console.log("🚀 [ARTILHEIRO] Inicializando módulo v4.4.1...");
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
            temporadaEncerrada: true, // v4.4.1: Flag para temporada encerrada
            carregando: false,
            inicializado: false,
            dadosRodadas: {},
            statusMap: {},
        };

        try {
            const loading = document.getElementById("artilheiro-loading");
            if (loading) loading.style.display = "none";

            await this.detectarRodada();

            // ✅ v4.5: Verificar se é início de temporada (sem dados ainda)
            if (this.isAguardandoDados()) {
                console.log("⏳ [ARTILHEIRO] Aguardando início do campeonato...");
                this.renderizarAguardandoDados();
                this.estado.inicializado = true;
                return;
            }

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
                this.config.API.DETECTAR_RODADA(this.config.getLigaId()),
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // ✅ v4.6: Usar || 1 em vez de || 38 para evitar loop de requisições
                    this.estado.rodadaAtual = data.data.rodadaAtual || 1;
                    this.estado.mercadoAberto =
                        data.data.mercadoAberto ?? true; // Se não informado, assume aberto (mais seguro)
                    this.estado.temporadaEncerrada =
                        data.data.temporadaEncerrada || false;

                    // v4.6: Calcular rodadaFim de forma segura
                    // Se mercado aberto e rodada 1, rodadaFim = 0 (sem dados ainda)
                    if (this.estado.mercadoAberto && this.estado.rodadaAtual <= 1) {
                        this.estado.rodadaFim = 0;
                    } else if (this.estado.mercadoAberto) {
                        this.estado.rodadaFim = this.estado.rodadaAtual - 1;
                    } else {
                        this.estado.rodadaFim = this.estado.rodadaAtual;
                    }

                    this.estado.rodadaNavInicio = Math.max(
                        1,
                        this.estado.rodadaFim -
                            this.config.RODADAS_VISIVEIS +
                            1,
                    );

                    console.log(
                        `📅 Rodada detectada: ${this.estado.rodadaAtual}, RodadaFim: ${this.estado.rodadaFim}, Mercado: ${this.estado.mercadoAberto ? "Aberto" : "Fechado"}, Temporada: ${this.estado.temporadaEncerrada ? "ENCERRADA" : "ATIVA"}`,
                    );
                }
            }
        } catch (error) {
            console.warn("⚠️ Erro ao detectar rodada:", error.message);
        }
    },

    // ==============================
    // v4.5: VERIFICAR SE AGUARDA DADOS
    // ==============================
    isAguardandoDados() {
        // Considera "aguardando" se:
        // - Rodada atual é 1 E mercado está aberto (campeonato não começou)
        // - OU rodadaFim é 0 ou undefined
        const rodada = this.estado.rodadaAtual || 1;
        const mercadoAberto = this.estado.mercadoAberto === true;
        const rodadaFim = this.estado.rodadaFim || 0;

        // Se rodada 1 e mercado aberto, ainda não teve jogos
        if (rodada <= 1 && mercadoAberto) {
            return true;
        }

        // Se rodadaFim é 0, não há dados
        if (rodadaFim <= 0) {
            return true;
        }

        return false;
    },

    renderizarAguardandoDados() {
        let container = document.getElementById("artilheiro-container");
        if (!container) container = document.getElementById("artilheiro-campeao-content");
        if (!container) container = document.getElementById("modulo-content");
        if (!container) container = document.getElementById("dynamic-content-area");

        if (!container) {
            console.error("❌ [ARTILHEIRO] Container não encontrado!");
            return;
        }

        console.log(`✅ [ARTILHEIRO] Container encontrado: ${container.id}`);

        container.innerHTML = `
            <div class="artilheiro-aguardando">
                <div class="artilheiro-aguardando-content">
                    <div class="artilheiro-aguardando-icon">
                        <span class="material-icons">sports_soccer</span>
                    </div>
                    <h2 class="artilheiro-aguardando-title">Aguardando Início do Campeonato</h2>
                    <p class="artilheiro-aguardando-desc">
                        O ranking de artilheiros será atualizado assim que a primeira rodada for concluída.
                    </p>
                    <div class="artilheiro-aguardando-info">
                        <span class="material-icons">info</span>
                        <span>Os dados de gols serão coletados automaticamente após cada rodada.</span>
                    </div>
                </div>
            </div>
            <style>
                .artilheiro-aguardando {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    padding: 2rem;
                }
                .artilheiro-aguardando-content {
                    text-align: center;
                    max-width: 400px;
                }
                .artilheiro-aguardando-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #ff6b00, #ff8c00);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s infinite;
                }
                .artilheiro-aguardando-icon .material-icons {
                    font-size: 40px;
                    color: white;
                }
                .artilheiro-aguardando-title {
                    font-family: 'Russo One', sans-serif;
                    font-size: 1.5rem;
                    color: #fff;
                    margin-bottom: 0.75rem;
                }
                .artilheiro-aguardando-desc {
                    color: #9ca3af;
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }
                .artilheiro-aguardando-info {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: rgba(255, 107, 0, 0.1);
                    border: 1px solid rgba(255, 107, 0, 0.3);
                    border-radius: 8px;
                    color: #ff8c00;
                    font-size: 0.875rem;
                }
                .artilheiro-aguardando-info .material-icons {
                    font-size: 18px;
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
            </style>
        `;
    },

    // ==============================
    // LAYOUT PRINCIPAL - v4.4 Material Icons
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
            container = document.getElementById("dynamic-content-area");
        }

        if (!container) {
            console.error("❌ [ARTILHEIRO] Container não encontrado!");
            return;
        }

        console.log("✅ [ARTILHEIRO] Container encontrado:", container.id);

        container.style.display = "block";

        // ✅ v4.4.1: Verificar se é rodada final E se é parcial
        const isRodadaFinal =
            this.estado.rodadaAtual === this.config.RODADA_FINAL;
        // ✅ v4.4.1: Só é parcial se mercado fechado E temporada NÃO encerrada
        const isParcial =
            !this.estado.mercadoAberto && !this.estado.temporadaEncerrada;

        container.innerHTML = `
            <div id="artilheiro-container" class="artilheiro-container">
                <!-- ✅ v4.3: BANNER RODADA FINAL -->
                <div id="artilheiroBannerRodadaFinal"></div>

                <!-- Header -->
                <div class="artilheiro-header">
                    <div class="artilheiro-title">
                        <span class="material-icons artilheiro-icon" style="font-size: 20px; color: #ffd700;">emoji_events</span>
                        <h3>Artilheiro Campeão</h3>
                        <span class="artilheiro-badge">${this.estado.temporadaEncerrada ? "CONSOLIDADO" : "MODULAR"}</span>
                    </div>
                    <div class="artilheiro-info-rodada">
                        <span class="material-icons" style="font-size: 14px;">leaderboard</span>
                        <span id="artilheiroInfoStatus">Dados até a ${this.estado.rodadaFim}ª rodada${isParcial ? " (em andamento)" : this.estado.temporadaEncerrada ? " (TEMPORADA ENCERRADA)" : ""}</span>
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
                        <span class="material-icons" style="font-size: 16px;">chevron_left</span>
                    </button>
                    <span id="artilheiroNavInfo" class="artilheiro-nav-info">Rodadas 1 - ${this.config.RODADAS_VISIVEIS}</span>
                    <button class="artilheiro-nav-btn" onclick="ArtilheiroCampeao.navegarRodadas('direita')" id="btnNavDir">
                        <span class="material-icons" style="font-size: 16px;">chevron_right</span>
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

                <!-- ✅ v5.2: PAINEL GESTÃO ADMIN -->
                <div class="artilheiro-admin-panel" style="margin-top: 24px; background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.2); border-radius: 12px; padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span class="material-icons" style="color: #22c55e; font-size: 20px;">admin_panel_settings</span>
                        <h4 style="margin: 0; color: #fff; font-size: 16px;">Gestão do Módulo</h4>
                    </div>

                    <div id="artilheiroAdminStats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
                        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Registros</div>
                            <div id="adminStatRegistros" style="font-size: 20px; font-weight: 800; color: #22c55e;">-</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Consolidados</div>
                            <div id="adminStatConsolidados" style="font-size: 20px; font-weight: 800; color: #3b82f6;">-</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Parciais</div>
                            <div id="adminStatParciais" style="font-size: 20px; font-weight: 800; color: #f59e0b;">-</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Participantes</div>
                            <div id="adminStatParticipantes" style="font-size: 20px; font-weight: 800; color: #fff;">-</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-sm" style="background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="ArtilheiroCampeao.carregarEstatisticas()">
                            <span class="material-icons" style="font-size: 14px;">assessment</span> Atualizar Stats
                        </button>
                        <button class="btn btn-sm" style="background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="ArtilheiroCampeao.premiarArtilheiro()">
                            <span class="material-icons" style="font-size: 14px;">emoji_events</span> Consolidar Premiação
                        </button>
                    </div>
                    <div id="artilheiroPremiacaoMsg" style="margin-top: 8px;"></div>
                </div>
            </div>

            <!-- ✅ v4.3: ESTILOS DE DESTAQUE -->
            ${this._injetarEstilosDestaque()}
        `;

        // ✅ v5.2: Carregar stats automaticamente
        this.carregarEstatisticas();
    },

    // ==============================
    // ✅ v4.4: BANNER RODADA FINAL - Material Icons
    // ==============================
    _renderizarBannerRodadaFinal() {
        const bannerContainer = document.getElementById(
            "artilheiroBannerRodadaFinal",
        );
        if (!bannerContainer) return;

        const { rodadaAtual, mercadoAberto, temporadaEncerrada, ranking } =
            this.estado;
        const isRodadaFinal = rodadaAtual === this.config.RODADA_FINAL;

        if (!isRodadaFinal) {
            bannerContainer.innerHTML = "";
            return;
        }

        // ✅ v4.4.1: Só é parcial se mercado fechado E temporada NÃO encerrada
        const isParcial = !mercadoAberto && !temporadaEncerrada;
        const statusTexto = temporadaEncerrada
            ? "TEMPORADA ENCERRADA"
            : isParcial
              ? "EM ANDAMENTO"
              : "ÚLTIMA RODADA";
        const lider = ranking[0];
        const liderNome = lider?.nome || "---";
        const liderGols = lider?.golsPro || 0;

        // ✅ v4.4.1: Se temporada encerrada, mostrar CAMPEÃO ao invés de POSSÍVEL
        const liderLabel = temporadaEncerrada
            ? "🏆 ARTILHEIRO CAMPEÃO"
            : "POSSÍVEL ARTILHEIRO";

        bannerContainer.innerHTML = `
            <div class="rodada-final-banner ${isParcial ? "parcial-ativo" : ""} ${temporadaEncerrada ? "temporada-encerrada" : ""}">
                <div class="banner-content">
                    <span class="material-icons banner-icon" style="font-size: 2rem; color: #ffd700;">${temporadaEncerrada ? "emoji_events" : "sports_score"}</span>
                    <div class="banner-info">
                        <span class="banner-titulo">RODADA FINAL</span>
                        <span class="banner-status ${isParcial ? "pulsando" : ""}">${statusTexto}</span>
                    </div>
                    ${
                        lider
                            ? `
                        <div class="banner-lider ${temporadaEncerrada ? "campeao" : ""}">
                            <span class="lider-label">${liderLabel}</span>
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
    // ✅ v4.4: ESTILOS DE DESTAQUE
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
                    color: #ffd700;
                    font-size: 14px;
                    vertical-align: middle;
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

            const url = `${this.config.API.RANKING(this.config.getLigaId())}?${params}`;
            console.log(`📡 [ARTILHEIRO] Buscando: ${url}`);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success)
                throw new Error(data.error || "Erro ao buscar ranking");

            let ranking = data.data.ranking || [];
            this.estado.estatisticas = data.data.estatisticas || null;
            this.estado.rodadaParcial = data.data.rodadaParcial || null;
            // ✅ v4.4.1: Capturar temporadaEncerrada da resposta
            this.estado.temporadaEncerrada =
                data.data.temporadaEncerrada || false;

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

            // ✅ v5.1: Ordenação com 3 critérios
            // 1º: Saldo de gols (maior)
            // 2º: Gols Pró (maior)
            // 3º: Ranking Geral (melhor posição = menor número)
            ativos.sort((a, b) => {
                if (b.saldoGols !== a.saldoGols)
                    return b.saldoGols - a.saldoGols;
                if (b.golsPro !== a.golsPro)
                    return b.golsPro - a.golsPro;
                // 3º critério: ranking geral (menor é melhor)
                const posA = a.posicaoRankingGeral || 999;
                const posB = b.posicaoRankingGeral || 999;
                return posA - posB;
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
    // RENDERIZAR TABELA - v4.4 COM Material Icons
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
            temporadaEncerrada,
        } = this.estado;
        const { RODADAS_VISIVEIS, RODADA_FINAL } = this.config;

        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 40px; color: #e67e22;">Nenhum dado encontrado</td></tr>`;
            return;
        }

        // ✅ v4.4.1: Só é parcial se mercado fechado E temporada NÃO encerrada
        const isRodadaFinalParcial =
            rodadaAtual === RODADA_FINAL &&
            !mercadoAberto &&
            !temporadaEncerrada;

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

        // ✅ v4.4: Headers das rodadas com Material Icons
        const headersRodadas = rodadasExibir
            .map((r) => {
                const isParcial = r === rodadaParcial;
                const isFinal = r === RODADA_FINAL;
                let classe = "col-rodada";
                if (isParcial) classe += " parcial";
                if (isFinal) classe += " rodada-final";
                const finalIcon = isFinal
                    ? '<span class="material-icons" style="font-size: 10px; vertical-align: middle;">sports_score</span>'
                    : "";
                return `<th class="${classe}">R${r}${isParcial ? "*" : ""}${finalIcon}</th>`;
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

                // ✅ v4.4: DESTAQUE APENAS NO 1º LUGAR - Material Icons
                let posIcon;
                let posClass = "";
                let rowClass = "artilheiro-ranking-row";
                let coroaHtml = "";

                if (posicao === 1) {
                    posIcon =
                        '<span class="material-icons" style="font-size: 16px; color: #1a1a2e;">emoji_events</span>';
                    posClass = "pos-campeao";
                    rowClass += " lider-destaque";

                    if (isRodadaFinalParcial) {
                        rowClass += " possivel-campeao";
                        coroaHtml =
                            '<span class="material-icons coroa-animada">workspace_premium</span>';
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
                                        <span class="material-icons gols-saldo" style="font-size: 14px; color: #f39c12;">hourglass_empty</span>
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

                // ✅ v4.4: Escudo fallback com Material Icons
                const escudoHtml = p.escudo
                    ? `<img src="${p.escudo}" class="escudo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'"><span class="material-icons" style="display: none; font-size: 20px; color: #666;">sports_soccer</span>`
                    : '<span class="material-icons" style="font-size: 20px; color: #666;">sports_soccer</span>';

                return `
                <tr class="${rowClass}">
                    <td class="col-pos"><span class="pos-badge ${posClass}">${posIcon}</span></td>
                    <td class="col-escudo">
                        ${escudoHtml}
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
    // RENDERIZAR SEÇÃO DE INATIVOS - v4.4 Material Icons
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

                // ✅ v4.4: Escudo fallback com Material Icons
                const escudoHtml = p.escudo
                    ? `<img src="${p.escudo}" class="escudo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'"><span class="material-icons" style="display: none; font-size: 20px; color: #555;">sports_soccer</span>`
                    : '<span class="material-icons" style="font-size: 20px; color: #555;">sports_soccer</span>';

                return `
                <tr class="artilheiro-ranking-row inativo">
                    <td class="col-pos"><span class="pos-badge">—</span></td>
                    <td class="col-escudo">
                        ${escudoHtml}
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
                <span class="material-icons inativos-icon" style="font-size: 20px; color: #888;">block</span>
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
    // LOADING E ERRO - v4.4 Material Icons
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
                            <span class="material-icons erro-icon" style="font-size: 32px; color: #e74c3c;">cancel</span>
                            <p class="erro-msg">${titulo}</p>
                            <p class="erro-detalhe">${mensagem}</p>
                            <button class="artilheiro-btn primary" onclick="ArtilheiroCampeao.buscarRanking()">
                                <span class="material-icons" style="font-size: 16px; margin-right: 5px;">refresh</span>
                                Tentar Novamente
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
    // MODAL DE DETALHES DA RODADA - v4.4 Material Icons
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
                    <h4><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 5px; color: #28a745;">sports_soccer</span> Gols Marcados</h4>
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
                    <h4><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 5px; color: #dc3545;">sports_handball</span> Gols Contra</h4>
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
                <button class="modal-fechar" onclick="ArtilheiroCampeao.fecharModal()">
                    <span class="material-icons" style="font-size: 18px;">close</span>
                </button>
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

    // ==============================
    // ✅ v5.2: GESTÃO ADMIN - Estatísticas
    // ==============================
    async carregarEstatisticas() {
        const ligaId = this.config.getLigaId();
        if (!ligaId) return;

        try {
            const resp = await fetch(this.config.API.ESTATISTICAS(ligaId));
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            const stats = json.data || json;

            const elRegistros = document.getElementById("adminStatRegistros");
            const elConsolidados = document.getElementById("adminStatConsolidados");
            const elParciais = document.getElementById("adminStatParciais");
            const elParticipantes = document.getElementById("adminStatParticipantes");

            if (elRegistros) elRegistros.textContent = stats.totalRegistros ?? "-";
            if (elConsolidados) elConsolidados.textContent = stats.rodadasConsolidadas ?? "-";
            if (elParciais) elParciais.textContent = stats.rodadasParciais ?? "-";
            if (elParticipantes) elParticipantes.textContent = stats.totalParticipantes ?? "-";
        } catch (err) {
            console.error("❌ [ARTILHEIRO] Erro ao carregar estatísticas admin:", err);
        }
    },

    // ==============================
    // ✅ v5.2: GESTÃO ADMIN - Consolidar Premiação
    // ==============================
    async premiarArtilheiro() {
        const ligaId = this.config.getLigaId();
        if (!ligaId) return;

        const msgEl = document.getElementById("artilheiroPremiacaoMsg");
        if (msgEl) {
            msgEl.innerHTML = '<span style="color: #f59e0b;">⏳ Processando premiação...</span>';
        }

        try {
            const resp = await fetch(this.config.API.PREMIAR(ligaId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const json = await resp.json();

            if (!resp.ok) {
                throw new Error(json.error || json.message || `HTTP ${resp.status}`);
            }

            if (msgEl) {
                const total = json.data?.totalPremiacoes || 0;
                msgEl.innerHTML = `<span style="color: #22c55e;">✅ Premiação consolidada! ${total} registro(s) lançados no extrato.</span>`;
            }
        } catch (err) {
            console.error("❌ [ARTILHEIRO] Erro ao consolidar premiação:", err);
            if (msgEl) {
                msgEl.innerHTML = `<span style="color: #ef4444;">❌ ${err.message}</span>`;
            }
        }
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

// ✅ v4.4: Auto-init removido - módulo será inicializado pelo orquestrador
// Evita erro "Container não encontrado" no carregamento

console.log("✅ [ARTILHEIRO] Módulo v4.4.1 carregado!");
