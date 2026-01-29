// =====================================================
// MÓDULO: RANKING PARTICIPANTE - v3.10 PRO (TEMPORADA FIX)
// Usa API de snapshots /api/ranking-turno
// ✅ v3.10: FIX - Temporada dinâmica (corrigir hardcode 2025) + passar temporada na API
// ✅ v3.9: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v3.8: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// ✅ v3.7: Separação de participantes inativos (desistentes)
// ✅ v3.6: Detecção de CAMPEÃO (R38 encerrada) + Card menor
// ✅ v3.5: Card Seu Desempenho ao final + Vezes Líder
// =====================================================

if (window.Log) Log.info('PARTICIPANTE-RANKING', 'Módulo v3.10 PRO (TEMPORADA FIX) carregando...');

// ==============================
// CONSTANTES
// ==============================
const RODADA_FINAL = 38;

// ==============================
// CARREGAR MATERIAL ICONS (IMEDIATO + FORÇADO)
// ==============================
(function () {
    const existente = document.querySelector(
        'link[href*="fonts.googleapis.com"][href*="Material"]',
    );

    if (!existente) {
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
        link.rel = "stylesheet";
        link.crossOrigin = "anonymous";

        if (document.head.firstChild) {
            document.head.insertBefore(link, document.head.firstChild);
        } else {
            document.head.appendChild(link);
        }
        if (window.Log) Log.debug('PARTICIPANTE-RANKING', 'Material Icons link adicionado');
    }

    if (!document.getElementById("material-icons-css")) {
        const style = document.createElement("style");
        style.id = "material-icons-css";
        style.textContent = `
            @font-face {
                font-family: 'Material Icons';
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
            }
            .material-icons {
                font-family: 'Material Icons' !important;
                font-weight: normal;
                font-style: normal;
                font-size: 24px;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: 'liga';
                font-feature-settings: 'liga';
                -webkit-font-smoothing: antialiased;
                text-rendering: optimizeLegibility;
            }
        `;
        document.head.appendChild(style);
    }
})();

const RANK_COLORS = {
    gold: "#facc15",
    goldBg: "rgba(250, 204, 21, 0.1)",
    silver: "#a1a1aa",
    silverBg: "rgba(161, 161, 170, 0.1)",
    bronze: "#d97706",
    bronzeBg: "rgba(217, 119, 6, 0.1)",
    primary: "#ff5c00",
    danger: "rgba(239, 68, 68, 0.15)",
};

// ==============================
// FUNÇÃO PARA TRUNCAR PONTOS (2 casas decimais, sem arredondamento)
// Ex: 105.456 → "105,45" (não "105,46")
// ==============================
function truncarPontos(valor) {
    const num = parseFloat(valor) || 0;
    const truncado = Math.trunc(num * 100) / 100;
    return truncado.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatarMoedaBR(valor) {
    const num = Number(valor) || 0;
    const abs = Math.abs(num).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    if (num > 0) return `+R$ ${abs}`;
    if (num < 0) return `-R$ ${abs}`;
    return `R$ ${abs}`;
}

function getEscudoTimeUrl(time) {
    const escudo =
        time?.escudo ||
        time?.url_escudo_png ||
        time?.url_escudo_svg ||
        "";
    if (escudo) return escudo;
    if (time?.clube_id) return `/escudos/${time.clube_id}.png`;
    return "/escudos/default.png";
}

function getEscudoClubeUrl(time) {
    if (!time?.clube_id) return "";
    return `/escudos/${time.clube_id}.png`;
}

// Estado do módulo
let estadoRanking = {
    ligaId: null,
    timeId: null,
    turnoAtivo: "geral",
    dadosAtuais: null,
    posicoesPorTurno: {
        turno1: null,
        turno2: null,
        geral: null,
    },
    vezesLider: 0,
    temporadaEncerrada: false, // ✅ v3.6: Flag de temporada encerrada
    rodadaAtual: null,
    statusMercado: null,
    configRankingRodada: null,
    liveCountsRodada: null,
    liveCounts: {},
    liveCountsLoading: false,
};

export async function inicializarRankingParticipante(params, timeIdParam) {
    if (window.Log) Log.info('PARTICIPANTE-RANKING', 'Inicializando módulo...', params);

    let ligaId, timeId;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
    } else {
        ligaId = params;
        timeId = timeIdParam;
    }

    if (!ligaId) {
        if (window.Log) Log.error('PARTICIPANTE-RANKING', 'Liga ID inválido');
        return;
    }

    estadoRanking.ligaId = ligaId;
    estadoRanking.timeId = timeId;

    if (window.Log) Log.debug('PARTICIPANTE-RANKING', 'Dados:', { ligaId, timeId });

    // ✅ v3.9: Aguardar DOM estar renderizado (double RAF)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    let container = document.getElementById("rankingLista");

    // ✅ v3.9: Retry com polling se container não encontrado imediatamente
    if (!container) {
        if (window.Log) Log.warn('PARTICIPANTE-RANKING', 'Container não encontrado - aguardando...');
        container = await new Promise((resolve) => {
            let tentativas = 0;
            const maxTentativas = 10;
            const interval = setInterval(() => {
                tentativas++;
                const el = document.getElementById("rankingLista");
                if (el) {
                    clearInterval(interval);
                    resolve(el);
                } else if (tentativas >= maxTentativas) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 100);
        });
    }

    if (!container) {
        if (window.Log) Log.error('PARTICIPANTE-RANKING', 'Container não encontrado após retry');
        return;
    }

    // ✅ v3.6: Detectar status do mercado antes de carregar
    await detectarStatusTemporada();

    // Injetar estilos dos cards uma única vez
    injetarEstilosCards();

    configurarTabs();

    try {
        await carregarRanking(estadoRanking.turnoAtivo);
        if (window.Log) Log.info('PARTICIPANTE-RANKING', 'Ranking carregado');
    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-RANKING', 'Erro:', error);
        container.innerHTML = renderizarErro();
    }
}

window.inicializarRankingParticipante = inicializarRankingParticipante;

// ✅ v3.6: DETECTAR STATUS DA TEMPORADA
async function detectarStatusTemporada() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const mercado = await response.json();
            const rodadaAtual =
                mercado.rodada_atual || mercado.rodadaAtual || 1;
            const statusMercado = mercado.status_mercado;

            estadoRanking.rodadaAtual = rodadaAtual;
            estadoRanking.statusMercado = statusMercado;

            // Temporada encerrada: status_mercado = 6 OU (rodada >= 38 E mercado fechado)
            estadoRanking.temporadaEncerrada =
                statusMercado === 6 ||
                (rodadaAtual >= RODADA_FINAL && statusMercado !== 1);

            if (window.Log) Log.debug('PARTICIPANTE-RANKING', '📊 Status:', {
                rodadaAtual,
                statusMercado,
                temporadaEncerrada: estadoRanking.temporadaEncerrada,
            });
        }
    } catch (error) {
        if (window.Log) Log.warn('PARTICIPANTE-RANKING', '⚠️ Erro ao detectar status:', error);
    }
}

async function obterConfigRankingRodada() {
    const ligaId = estadoRanking.ligaId;
    if (!ligaId) return null;

    const rodadaAtual = estadoRanking.rodadaAtual || 1;
    if (
        estadoRanking.configRankingRodada &&
        estadoRanking.configRankingRodada.rodadaRef === rodadaAtual
    ) {
        return estadoRanking.configRankingRodada;
    }

    try {
        const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
        if (!response.ok) return null;
        const data = await response.json();

        const config =
            data?.configuracoes?.ranking_rodada || data?.ranking_rodada || null;

        if (!config) {
            estadoRanking.configRankingRodada = {
                valores: {},
                totalParticipantes: data?.total_participantes || 0,
                rodadaRef: rodadaAtual,
                temporal: false,
            };
            return estadoRanking.configRankingRodada;
        }

        if (config.temporal) {
            const rodadaTransicao = config.rodada_transicao || 30;
            const fase = rodadaAtual < rodadaTransicao ? "fase1" : "fase2";
            const faseConfig = config[fase] || {};

            estadoRanking.configRankingRodada = {
                valores: faseConfig.valores || {},
                faixas: faseConfig.faixas || null,
                totalParticipantes: faseConfig.total_participantes || 0,
                temporal: true,
                fase,
                rodadaTransicao,
                rodadaRef: rodadaAtual,
            };
            return estadoRanking.configRankingRodada;
        }

        estadoRanking.configRankingRodada = {
            valores: config.valores || {},
            faixas: config.faixas || null,
            totalParticipantes: config.total_participantes || 0,
            temporal: false,
            rodadaRef: rodadaAtual,
        };
        return estadoRanking.configRankingRodada;
    } catch (error) {
        if (window.Log)
            Log.warn("PARTICIPANTE-RANKING", "Erro ao buscar config rodada:", error);
        return null;
    }
}

// ===== CARREGAR RANKING VIA API - v3.8 CACHE-FIRST =====
async function carregarRanking(turno) {
    const container = document.getElementById("rankingLista");
    const ligaId = estadoRanking.ligaId;
    const timeId = estadoRanking.timeId;
    const cache = window.ParticipanteCache;
    const cacheKey = `ranking_turno_${turno}`;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================
    let usouCache = false;
    let dadosCache = null;

    if (cache && turno === "geral") {
        // Tentar buscar do cache persistente
        const rankingCache = await (cache.getRankingAsync ? cache.getRankingAsync(ligaId) : cache.getRanking(ligaId));

        if (rankingCache && Array.isArray(rankingCache) && rankingCache.length > 0) {
            usouCache = true;
            dadosCache = {
                success: true,
                ranking: rankingCache,
                rodada_atual: rankingCache[0]?.rodada_atual || 38,
                total_times: rankingCache.length
            };

            if (window.Log) Log.info('PARTICIPANTE-RANKING', '⚡ INSTANT LOAD - dados do cache!');

            // Renderizar IMEDIATAMENTE com dados do cache
            estadoRanking.dadosAtuais = dadosCache;
            renderizarRankingPro(container, dadosCache.ranking, dadosCache.rodada_atual);

            // Carregar posições de turnos em background
            if (timeId) {
                carregarPosicoesTurnos();
            }
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando ranking...</p>
            </div>
        `;
    }

    // =========================================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
    // =========================================================================
    try {
        if (window.Log) Log.debug('PARTICIPANTE-RANKING', 'Buscando turno ' + turno + ' da API...');

        // ✅ v3.10: Passar temporada correta na API
        const temporadaAPI = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

        // Buscar turno principal
        const response = await fetch(
            "/api/ranking-turno/" + ligaId + "?turno=" + turno + "&temporada=" + temporadaAPI,
        );
        const data = await response.json();

        if (!data.success || !data.ranking) {
            if (!usouCache) {
                // Detectar se é pré-temporada usando config global
                const config = window.ParticipanteConfig;
                const isPreTemporada = config && config.isPreparando && config.isPreparando();

                const icone = isPreTemporada ? 'schedule' : 'event_busy';
                const mensagem = isPreTemporada
                    ? 'Campeonato ainda não iniciou. Aguarde a rodada 1!'
                    : 'Sem dados para este turno';

                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">${icone}</span>
                        <p>${mensagem}</p>
                    </div>
                `;
            }
            return;
        }

        // Atualizar cache com dados frescos (apenas turno geral)
        if (cache && turno === "geral") {
            cache.setRanking(ligaId, data.ranking);
        }

        estadoRanking.dadosAtuais = data;

        // Se for turno "geral", buscar posições nos outros turnos em paralelo
        if (turno === "geral" && timeId && !usouCache) {
            await carregarPosicoesTurnos();
        }

        if (window.Log) Log.debug('PARTICIPANTE-RANKING', data.total_times + ' times - Status: ' + data.status);

        // Só re-renderizar se não usou cache OU se dados mudaram
        if (!usouCache) {
            renderizarRankingPro(container, data.ranking, data.rodada_atual);
        } else {
            // Verificar se posição do meu time mudou
            const meuTimeCache = dadosCache?.ranking?.find(t => String(t.timeId) === String(timeId));
            const meuTimeFresh = data.ranking?.find(t => String(t.timeId) === String(timeId));

            if (meuTimeCache?.posicao !== meuTimeFresh?.posicao ||
                meuTimeCache?.pontos !== meuTimeFresh?.pontos) {
                if (window.Log) Log.info('PARTICIPANTE-RANKING', '🔄 Atualizando UI com dados frescos');
                renderizarRankingPro(container, data.ranking, data.rodada_atual);
            }
        }
    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-RANKING', 'Erro:', error);
        // Só mostrar erro se não tiver dados do cache
        if (!usouCache) {
            container.innerHTML = renderizarErro();
        }
    }
}

// ===== CARREGAR POSIÇÕES EM TODOS OS TURNOS =====
async function carregarPosicoesTurnos() {
    const ligaId = estadoRanking.ligaId;
    const timeId = estadoRanking.timeId;

    if (!ligaId || !timeId) return;

    try {
        // ✅ v3.10: Passar temporada correta em todas as chamadas
        const temporadaAPI = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

        // Buscar 1º e 2º turno + rodadas em paralelo
        const [resp1, resp2, respRodadas] = await Promise.all([
            fetch("/api/ranking-turno/" + ligaId + "?turno=1&temporada=" + temporadaAPI),
            fetch("/api/ranking-turno/" + ligaId + "?turno=2&temporada=" + temporadaAPI),
            fetch("/api/rodadas/" + ligaId + "/rodadas?inicio=1&fim=38&temporada=" + temporadaAPI),
        ]);

        const [data1, data2, dataRodadas] = await Promise.all([
            resp1.json(),
            resp2.json(),
            respRodadas.json(),
        ]);

        // Extrair posição do participante em cada turno
        if (data1.success && data1.ranking) {
            const meuDado1 = data1.ranking.find(function (p) {
                return String(p.timeId) === String(timeId);
            });
            estadoRanking.posicoesPorTurno.turno1 = meuDado1
                ? meuDado1.posicao
                : null;
        }

        if (data2.success && data2.ranking) {
            const meuDado2 = data2.ranking.find(function (p) {
                return String(p.timeId) === String(timeId);
            });
            estadoRanking.posicoesPorTurno.turno2 = meuDado2
                ? meuDado2.posicao
                : null;
        }

        // Contar vezes que foi líder
        if (dataRodadas.success && dataRodadas.rodadas) {
            estadoRanking.vezesLider = contarVezesLider(
                dataRodadas.rodadas,
                timeId,
            );
            if (window.Log) Log.debug('PARTICIPANTE-RANKING', '🏆 Vezes líder:', estadoRanking.vezesLider);
        }

        if (window.Log) Log.debug('PARTICIPANTE-RANKING', 'Posições por turno:', estadoRanking.posicoesPorTurno);
    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-RANKING', 'Erro ao buscar turnos:', error);
    }
}

// ===== CONTAR QUANTAS VEZES FOI LÍDER =====
function contarVezesLider(rodadas, meuTimeId) {
    // Agrupar por rodada
    const rodadasMap = new Map();

    rodadas.forEach((r) => {
        const rodadaNum = r.rodada || r.rodada_atual;
        if (!rodadaNum) return;

        if (!rodadasMap.has(rodadaNum)) {
            rodadasMap.set(rodadaNum, []);
        }
        rodadasMap.get(rodadaNum).push(r);
    });

    let vezesLider = 0;

    // Para cada rodada, verificar se o participante foi líder
    rodadasMap.forEach((participantes, rodadaNum) => {
        // Ordenar por pontos (decrescente)
        const ordenados = [...participantes]
            .filter((p) => p.pontos != null && !p.rodadaNaoJogada)
            .sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

        if (ordenados.length === 0) return;

        // Verificar se meu time foi o líder (posição 1)
        const lider = ordenados[0];
        const liderTimeId = String(lider.time_id || lider.timeId);

        if (liderTimeId === String(meuTimeId)) {
            vezesLider++;
        }
    });

    return vezesLider;
}

// ===== CONFIGURAR TABS =====
function configurarTabs() {
    const tabs = document.querySelectorAll(".ranking-tabs .tab-btn");

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            estadoRanking.turnoAtivo = tab.dataset.turno;
            await carregarRanking(estadoRanking.turnoAtivo);
        });
    });
}

// ✅ v3.6: CRIAR CARD DO LÍDER/CAMPEÃO (COMPACTO)
function criarCardLider(lider, turnoLabel, rodadaAtual) {
    if (!lider) return "";

    const pontosFormatados = truncarPontos(lider.pontos);

    // ✅ v3.6: Determinar se é CAMPEÃO ou LÍDER
    const isCampeao =
        estadoRanking.temporadaEncerrada &&
        estadoRanking.turnoAtivo === "geral";
    const titulo = isCampeao ? "CAMPEÃO" : "LÍDER " + turnoLabel.toUpperCase();
    // ✅ v3.10: Usar temporada dinâmica do config (remover hardcode 2025)
    const temporadaAtualConfig = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();
    const subtitulo = isCampeao
        ? "Temporada " + temporadaAtualConfig + " encerrada"
        : "até a " + (rodadaAtual || "?") + "ª rodada";
    const mensagem = isCampeao
        ? lider.nome_time + " é o grande campeão do Super Cartola!"
        : lider.nome_time + " lidera o Super Cartola";

    // ✅ v3.6: Card compacto
    return (
        '<div class="card-lider-compacto">' +
        '<div class="lider-header">' +
        '<div class="lider-icon-box">' +
        '<span class="material-icons">emoji_events</span>' +
        "</div>" +
        '<div class="lider-header-info">' +
        '<div class="lider-titulo">' +
        titulo +
        "</div>" +
        '<div class="lider-subtitulo">' +
        subtitulo +
        "</div>" +
        "</div>" +
        '<div class="lider-pontos-box">' +
        '<span class="lider-pontos-valor">' +
        pontosFormatados +
        "</span>" +
        '<span class="lider-pontos-label">pts</span>' +
        "</div>" +
        "</div>" +
        '<div class="lider-body">' +
        '<div class="lider-nome">' +
        (lider.nome_cartola || lider.nome_time) +
        "</div>" +
        '<div class="lider-time">' +
        lider.nome_time +
        "</div>" +
        "</div>" +
        (isCampeao
            ? '<div class="lider-badge-campeao"><span class="material-icons">verified</span> ' +
              mensagem +
              "</div>"
            : "") +
        "</div>"
    );
}

// ===== CRIAR CARD SEU DESEMPENHO =====
function criarCardSeuDesempenho(ranking, turnoLabel) {
    const timeId = estadoRanking.timeId;
    if (!timeId) return "";

    const meusDados = ranking.find(function (p) {
        return String(p.timeId) === String(timeId);
    });
    if (!meusDados) return "";

    const posicao = meusDados.posicao;
    const totalTimes = ranking.length;

    // Calcular diferença para o líder
    const lider = ranking[0];
    const diffLider = lider ? lider.pontos - meusDados.pontos : 0;

    // ✅ v3.6: Verificar se é campeão
    const isCampeao =
        estadoRanking.temporadaEncerrada &&
        estadoRanking.turnoAtivo === "geral";

    // Definir cor da posição
    let posicaoClass = "";
    let posicaoIcon = posicao + "º";
    if (posicao === 1) {
        posicaoClass = "posicao-ouro";
        posicaoIcon =
            '<span class="material-icons" style="color:#ffd700; font-size:1.5rem;">emoji_events</span>';
    } else if (posicao === 2) {
        posicaoClass = "posicao-prata";
        posicaoIcon =
            '<span class="material-icons" style="color:#c0c0c0; font-size:1.5rem;">military_tech</span>';
    } else if (posicao === 3) {
        posicaoClass = "posicao-bronze";
        posicaoIcon =
            '<span class="material-icons" style="color:#cd7f32; font-size:1.5rem;">military_tech</span>';
    } else if (posicao === totalTimes) {
        posicaoClass = "posicao-ultimo";
    }

    const pontosFormatados = truncarPontos(meusDados.pontos);

    // Linha de posições por turno (só na visão Geral)
    let turnosHTML = "";
    const pos1 = estadoRanking.posicoesPorTurno.turno1;
    const pos2 = estadoRanking.posicoesPorTurno.turno2;

    if (estadoRanking.turnoAtivo === "geral" && (pos1 || pos2)) {
        turnosHTML =
            '<div class="seu-turnos">' +
            (pos1
                ? '<div class="turno-item">' +
                  '<span class="turno-label">1º Turno:</span>' +
                  '<span class="turno-pos">' +
                  pos1 +
                  "º</span>" +
                  "</div>"
                : "") +
            (pos2
                ? '<div class="turno-item">' +
                  '<span class="turno-label">2º Turno:</span>' +
                  '<span class="turno-pos">' +
                  pos2 +
                  "º</span>" +
                  "</div>"
                : "") +
            "</div>";
    }

    // Linha de vezes líder (se tiver pelo menos 1)
    let vezesLiderHTML = "";
    const vezesLider = estadoRanking.vezesLider || 0;
    if (vezesLider > 0) {
        vezesLiderHTML =
            '<div class="seu-vezes-lider">' +
            '<span class="material-icons">workspace_premium</span>' +
            "<span>Você foi líder em <strong>" +
            vezesLider +
            "</strong> rodada" +
            (vezesLider > 1 ? "s" : "") +
            "</span>" +
            "</div>";
    }

    // ✅ v3.6: Footer diferente se for campeão, líder ou não
    let footerHTML = "";
    if (posicao === 1) {
        const textoFooter = isCampeao
            ? "Você é o CAMPEÃO do Super Cartola!"
            : "Você está liderando o Super Cartola";
        footerHTML =
            '<div class="seu-footer lider">' +
            '<span class="lider-badge">' +
            '<span class="material-icons">emoji_events</span>' +
            textoFooter +
            "</span>" +
            "</div>";
    } else {
        footerHTML =
            '<div class="seu-footer">' +
            '<div class="seu-diff">' +
            '<span class="diff-label">Atrás do ' +
            (isCampeao ? "campeão" : "líder") +
            ":</span>" +
            '<span class="diff-valor negativo">-' +
            truncarPontos(diffLider) +
            "</span>" +
            "</div>" +
            "</div>";
    }

    return (
        '<div class="card-seu-desempenho">' +
        '<div class="seu-header">' +
        '<span class="seu-titulo">' +
        '<span class="material-icons">leaderboard</span>' +
        "Seu Desempenho" +
        "</span>" +
        '<span class="seu-turno">' +
        turnoLabel +
        "</span>" +
        "</div>" +
        '<div class="seu-body">' +
        '<div class="seu-posicao ' +
        posicaoClass +
        '">' +
        '<span class="seu-posicao-valor">' +
        posicaoIcon +
        "</span>" +
        '<span class="seu-posicao-label">de ' +
        totalTimes +
        "</span>" +
        "</div>" +
        '<div class="seu-info">' +
        '<div class="seu-dados">' +
        '<div class="seu-nome">' +
        (meusDados.nome_cartola || "Você") +
        "</div>" +
        '<div class="seu-time">' +
        (meusDados.nome_time || "Seu Time") +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="seu-pontos">' +
        '<span class="seu-pontos-valor">' +
        pontosFormatados +
        "</span>" +
        '<span class="seu-pontos-label">pts</span>' +
        "</div>" +
        "</div>" +
        turnosHTML +
        vezesLiderHTML +
        footerHTML +
        "</div>"
    );
}

// ===== RENDERIZAR RANKING =====
function renderizarRankingPro(container, ranking, rodadaAtual) {
    if (!ranking || ranking.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
            '<span class="material-icons">inbox</span>' +
            "<p>Nenhum time encontrado</p>" +
            "</div>";
        return;
    }

    // ✅ v3.7: Separar ativos e inativos
    const ativos = ranking.filter(function (t) {
        return t.ativo !== false && !t.inativo;
    });
    const inativos = ranking.filter(function (t) {
        return t.ativo === false || t.inativo;
    });

    const totalAtivos = ativos.length;
    const timeId = estadoRanking.timeId;
    const turnoLabel =
        estadoRanking.turnoAtivo === "geral"
            ? "Geral"
            : estadoRanking.turnoAtivo + "º Turno";

    // Criar cards de destaque (usando apenas ativos)
    const lider = ativos[0];
    const cardLiderHTML = criarCardLider(lider, turnoLabel, rodadaAtual);
    const cardSeuDesempenhoHTML = criarCardSeuDesempenho(ativos, turnoLabel);

    // ✅ v3.7: Renderizar lista de ativos
    const listaAtivosHTML = ativos
        .map(function (time, index) {
            const posicao = index + 1; // Reordenar posições para ativos
            const isMeuTime = String(time.timeId) === String(timeId);
            const isPodio = posicao <= 3;
            const isZonaRebaixamento =
                posicao > totalAtivos - 3 && totalAtivos > 6;

            let classes = ["ranking-item"];
            if (posicao === 1) classes.push("podio-1");
            else if (posicao === 2) classes.push("podio-2");
            else if (posicao === 3) classes.push("podio-3");
            if (isMeuTime) classes.push("meu-time");
            if (isZonaRebaixamento && !isPodio)
                classes.push("zona-rebaixamento");

            // Ícone de posição
            let iconePosicao = posicao + "º";
            if (posicao === 1)
                iconePosicao =
                    '<span class="material-icons podio-icon">emoji_events</span>';
            else if (posicao === 2)
                iconePosicao =
                    '<span class="material-icons podio-icon">military_tech</span>';
            else if (posicao === 3)
                iconePosicao =
                    '<span class="material-icons podio-icon">military_tech</span>';

            const pontosFormatados = truncarPontos(time.pontos);
            const escudoUrl = getEscudoTimeUrl(time);
            const clubeEscudoUrl = getEscudoClubeUrl(time);
            const mostrarClube =
                clubeEscudoUrl &&
                !escudoUrl.includes(`/escudos/${time.clube_id}.png`);

            return (
                '<div class="' +
                classes.join(" ") +
                '" onclick="mostrarPremiacaoPro(' +
                posicao +
                ')">' +
                '<div class="ranking-posicao">' +
                '<div class="posicao-badge">' +
                iconePosicao +
                "</div>" +
                '<div class="ranking-escudo-wrap">' +
                '<img class="ranking-escudo" src="' +
                escudoUrl +
                '" onerror="this.src=\'/escudos/default.png\'" alt="Escudo">' +
                (mostrarClube
                    ? '<img class="ranking-clube-escudo" src="' +
                      clubeEscudoUrl +
                      '" onerror="this.style.display=\'none\'" alt="Clube">'
                    : "") +
                "</div>" +
                "</div>" +
                '<div class="ranking-info">' +
                '<div class="ranking-cartola">' +
                (time.nome_cartola || "N/D") +
                (isMeuTime
                    ? '<span class="tag-voce"><span class="material-icons">person</span>VOCÊ</span>'
                    : "") +
                "</div>" +
                '<div class="ranking-time">' +
                (time.nome_time || "N/D") +
                "</div>" +
                "</div>" +
                '<div class="ranking-pontos">' +
                '<div class="ranking-pontos-valor">' +
                pontosFormatados +
                "</div>" +
                '<div class="ranking-live-badge is-loading" data-time-id="' +
                time.timeId +
                '">—</div>' +
                "</div>" +
                "</div>"
            );
        })
        .join("");

    // ✅ v3.7: Renderizar seção de inativos (se houver)
    let secaoInativosHTML = "";
    if (inativos.length > 0) {
        const listaInativosHTML = inativos
            .map(function (time, index) {
                const posicaoGrupo = index + 1;
                const isMeuTime = String(time.timeId) === String(timeId);
                const rodadaDesistencia = time.rodada_desistencia || "?";

                const pontosFormatados = truncarPontos(time.pontos);
                const escudoUrl = getEscudoTimeUrl(time);
                const clubeEscudoUrl = getEscudoClubeUrl(time);
                const mostrarClube =
                    clubeEscudoUrl &&
                    !escudoUrl.includes(`/escudos/${time.clube_id}.png`);

                return (
                    '<div class="ranking-item inativo' +
                    (isMeuTime ? " meu-time" : "") +
                    '">' +
                    '<div class="ranking-posicao inativo-pos">' +
                    '<div class="posicao-badge">' +
                    posicaoGrupo +
                    "º</div>" +
                    '<div class="ranking-escudo-wrap">' +
                    '<img class="ranking-escudo" src="' +
                    escudoUrl +
                    '" onerror="this.src=\'/escudos/default.png\'" alt="Escudo">' +
                    (mostrarClube
                        ? '<img class="ranking-clube-escudo" src="' +
                          clubeEscudoUrl +
                          '" onerror="this.style.display=\'none\'" alt="Clube">'
                        : "") +
                    "</div>" +
                    "</div>" +
                    '<div class="ranking-info">' +
                    '<div class="ranking-cartola">' +
                    (time.nome_cartola || "N/D") +
                    (isMeuTime
                        ? '<span class="tag-voce"><span class="material-icons">person</span>VOCÊ</span>'
                        : "") +
                    "</div>" +
                    '<div class="ranking-time">' +
                    (time.nome_time || "N/D") +
                    '<span class="tag-inativo">Saiu na R' +
                    rodadaDesistencia +
                    "</span>" +
                    "</div>" +
                    "</div>" +
                    '<div class="ranking-pontos inativo-pontos">' +
                    '<div class="ranking-pontos-valor">' +
                    pontosFormatados +
                    "</div>" +
                    "</div>" +
                    "</div>"
                );
            })
            .join("");

        secaoInativosHTML =
            '<div class="secao-inativos">' +
            '<div class="inativos-header">' +
            '<span class="material-icons">person_off</span>' +
            "<span>Participantes Inativos (" +
            inativos.length +
            ")</span>" +
            "</div>" +
            '<div class="ranking-lista inativos-lista">' +
            listaInativosHTML +
            "</div>" +
            "</div>";
    }

    container.innerHTML =
        '<div class="cards-destaque-container">' +
        cardLiderHTML +
        "</div>" +
        '<div class="ranking-lista">' +
        listaAtivosHTML +
        "</div>" +
        secaoInativosHTML +
        '<div class="card-desempenho-container">' +
        cardSeuDesempenhoHTML +
        "</div>";

    carregarJogadoresEmCampo(ativos);
}

// ===== INJETAR ESTILOS =====
function injetarEstilosCards() {
    if (document.getElementById("ranking-cards-styles")) return;

    const style = document.createElement("style");
    style.id = "ranking-cards-styles";
    style.textContent = `
        /* Card Líder Compacto */
        .card-lider-compacto {
            background: linear-gradient(135deg, rgba(250, 204, 21, 0.08) 0%, rgba(250, 204, 21, 0.03) 100%);
            border: 1px solid rgba(250, 204, 21, 0.25);
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 12px;
        }
        .lider-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .lider-icon-box {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .lider-icon-box .material-icons {
            font-size: 22px;
            color: #1a1a1a;
        }
        .lider-header-info {
            flex: 1;
        }
        .lider-titulo {
            font-size: 0.7rem;
            font-weight: 700;
            color: #ffd700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .lider-subtitulo {
            font-size: 0.65rem;
            color: rgba(255,255,255,0.5);
            margin-top: 1px;
        }
        .lider-pontos-box {
            text-align: right;
        }
        .lider-pontos-valor {
            font-size: 1.2rem;
            font-weight: 800;
            color: #fff;
        }
        .lider-pontos-label {
            font-size: 0.6rem;
            color: rgba(255,255,255,0.5);
            display: block;
        }
        .lider-body {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .lider-nome {
            font-size: 0.95rem;
            font-weight: 700;
            color: #fff;
        }
        .lider-time {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.6);
        }
        .lider-badge-campeao {
            margin-top: 10px;
            padding: 8px 12px;
            background: linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,170,0,0.1) 100%);
            border-radius: 8px;
            font-size: 0.7rem;
            color: #ffd700;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .lider-badge-campeao .material-icons {
            font-size: 14px;
        }

        /* Card Seu Desempenho */
        .card-seu-desempenho {
            background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
            border: 1px solid rgba(255, 92, 0, 0.3);
            border-radius: 14px;
            padding: 14px;
            margin-top: 16px;
        }
        .seu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .seu-titulo {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #ff5c00;
        }
        .seu-titulo .material-icons {
            font-size: 18px;
        }
        .seu-turno {
            font-size: 0.65rem;
            color: rgba(255,255,255,0.5);
            background: rgba(255,255,255,0.1);
            padding: 4px 8px;
            border-radius: 4px;
        }
        .seu-body {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .seu-posicao {
            width: 50px;
            text-align: center;
        }
        .seu-posicao-valor {
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
            display: block;
        }
        .seu-posicao-label {
            font-size: 0.6rem;
            color: rgba(255,255,255,0.5);
        }
        .seu-posicao.posicao-ouro .seu-posicao-valor { color: #ffd700; }
        .seu-posicao.posicao-prata .seu-posicao-valor { color: #c0c0c0; }
        .seu-posicao.posicao-bronze .seu-posicao-valor { color: #cd7f32; }
        .seu-posicao.posicao-ultimo .seu-posicao-valor { color: #ef4444; }
        .seu-info {
            flex: 1;
        }
        .seu-nome {
            font-size: 0.9rem;
            font-weight: 700;
            color: #fff;
        }
        .seu-time {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.6);
        }
        .seu-pontos {
            text-align: right;
        }
        .seu-pontos-valor {
            font-size: 1.1rem;
            font-weight: 800;
            color: #ff5c00;
        }
        .seu-pontos-label {
            font-size: 0.6rem;
            color: rgba(255,255,255,0.5);
            display: block;
        }
        .seu-turnos {
            display: flex;
            gap: 16px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .turno-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .turno-label {
            font-size: 0.7rem;
            color: rgba(255,255,255,0.5);
        }
        .turno-pos {
            font-size: 0.8rem;
            font-weight: 700;
            color: #fff;
        }
        .seu-footer {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .seu-footer.lider {
            text-align: center;
        }
        .lider-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,170,0,0.1) 100%);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #ffd700;
        }
        .lider-badge .material-icons {
            font-size: 16px;
        }
        .seu-diff {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .diff-label {
            font-size: 0.7rem;
            color: rgba(255,255,255,0.5);
        }
        .diff-valor {
            font-size: 0.85rem;
            font-weight: 700;
        }
        .diff-valor.negativo {
            color: #ef4444;
        }
        .seu-vezes-lider {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 12px;
            padding: 10px 14px;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 170, 0, 0.1) 100%);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 10px;
            font-size: 0.8rem;
            color: #ffd700;
        }
        .seu-vezes-lider .material-icons {
            font-size: 18px;
            color: #ffd700;
        }
        .seu-vezes-lider strong {
            font-weight: 700;
            color: #fff;
        }

        /* Tag VOCÊ na lista */
        .tag-voce {
            color: #3b82f6;
            font-size: 0.65rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 2px;
            margin-left: 6px;
        }
        .tag-voce .material-icons {
            font-size: 12px;
        }

        /* ✅ v3.7: Seção de Inativos */
        .secao-inativos {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed rgba(255, 255, 255, 0.15);
        }
        .inativos-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            margin-bottom: 10px;
            background: rgba(107, 114, 128, 0.15);
            border: 1px solid rgba(107, 114, 128, 0.3);
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 600;
            color: #9ca3af;
        }
        .inativos-header .material-icons {
            font-size: 18px;
            color: #9ca3af;
        }
        .inativos-lista .ranking-item.inativo {
            opacity: 0.7;
            background: rgba(107, 114, 128, 0.08);
            border-left: 3px solid #6b7280;
        }
        .inativos-lista .ranking-item.inativo:hover {
            opacity: 0.85;
        }
        .ranking-posicao.inativo-pos {
            color: #9ca3af;
            font-weight: 600;
        }
        .ranking-pontos.inativo-pontos {
            color: #9ca3af;
        }
        .ranking-escudo {
            filter: grayscale(0.2);
        }
        .ranking-item.inativo .ranking-escudo {
            filter: grayscale(1) opacity(0.7);
        }
        .tag-inativo {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 6px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 4px;
            font-size: 0.6rem;
            font-weight: 600;
            color: #f87171;
            vertical-align: middle;
        }

        /* Responsivo */
        @media (min-width: 768px) {
            .cards-destaque-container {
                max-width: 600px;
                margin: 0 auto 12px;
            }
        }
    `;
    document.head.appendChild(style);
}

async function carregarJogadoresEmCampo(ranking) {
    if (!Array.isArray(ranking) || ranking.length === 0) return;
    if (estadoRanking.liveCountsLoading) return;

    const rodadaAtual = estadoRanking.rodadaAtual || 1;
    const statusMercado = estadoRanking.statusMercado;

    const badges = document.querySelectorAll(".ranking-live-badge");
    if (!badges.length) return;

    if (statusMercado !== 2) {
        badges.forEach((badge) => {
            badge.textContent = "0 em campo";
            badge.classList.remove("is-loading", "is-live");
            badge.classList.add("is-off");
        });
        return;
    }

    if (estadoRanking.liveCountsRodada === rodadaAtual) {
        atualizarBadgesJogadoresEmCampo(estadoRanking.liveCounts);
        return;
    }

    estadoRanking.liveCountsLoading = true;

    try {
        const response = await fetch(
            `/api/cartola/atletas/pontuados?_t=${Date.now()}`,
            {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            },
        );

        const data = response.ok ? await response.json() : null;
        const atletasPontuados = data?.atletas || {};

        if (!Object.keys(atletasPontuados).length) {
            badges.forEach((badge) => {
                badge.textContent = "0 em campo";
                badge.classList.remove("is-loading", "is-live");
                badge.classList.add("is-off");
            });
            return;
        }

        const timeIds = ranking
            .map((t) => t.timeId)
            .filter((tid) => tid !== undefined && tid !== null);

        const resultados = await processarComLimite(
            timeIds,
            6,
            (timeId) =>
                contarJogadoresEmCampo(timeId, rodadaAtual, atletasPontuados),
        );

        const liveCounts = {};
        resultados.forEach((item) => {
            if (!item) return;
            liveCounts[String(item.timeId)] = item.emCampo;
        });

        estadoRanking.liveCounts = liveCounts;
        estadoRanking.liveCountsRodada = rodadaAtual;
        atualizarBadgesJogadoresEmCampo(liveCounts);
    } catch (error) {
        if (window.Log)
            Log.warn("PARTICIPANTE-RANKING", "Erro ao buscar ao vivo:", error);
    } finally {
        estadoRanking.liveCountsLoading = false;
    }
}

function atualizarBadgesJogadoresEmCampo(liveCounts = {}) {
    const badges = document.querySelectorAll(".ranking-live-badge");
    badges.forEach((badge) => {
        const timeId = badge.dataset.timeId;
        const count = liveCounts[String(timeId)] ?? 0;
        badge.textContent = `${count} em campo`;
        badge.classList.remove("is-loading");
        badge.classList.toggle("is-live", count > 0);
        badge.classList.toggle("is-off", count === 0);
    });
}

async function contarJogadoresEmCampo(timeId, rodada, atletasPontuados) {
    const response = await fetch(
        `/api/cartola/time/id/${timeId}/${rodada}?_t=${Date.now()}`,
        {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
        },
    );

    if (!response.ok) {
        return { timeId, emCampo: 0 };
    }

    const dadosEscalacao = await response.json();
    const atletas = Array.isArray(dadosEscalacao.atletas)
        ? dadosEscalacao.atletas
        : [];
    const reservas = Array.isArray(dadosEscalacao.reservas)
        ? dadosEscalacao.reservas
        : [];

    let emCampo = 0;
    atletas.concat(reservas).forEach((atleta) => {
        const parcial = atletasPontuados[atleta.atleta_id];
        if (parcial?.entrou_em_campo || parcial?.pontuacao !== 0) {
            emCampo += 1;
        }
    });

    return { timeId, emCampo };
}

async function processarComLimite(items, limite, worker) {
    const resultados = [];
    let index = 0;
    let ativos = 0;

    return new Promise((resolve) => {
        const iniciar = () => {
            while (ativos < limite && index < items.length) {
                const item = items[index++];
                ativos += 1;
                worker(item)
                    .then((res) => resultados.push(res))
                    .catch(() => {})
                    .finally(() => {
                        ativos -= 1;
                        if (index >= items.length && ativos === 0) {
                            resolve(resultados);
                        } else {
                            iniciar();
                        }
                    });
            }
        };
        iniciar();
    });
}

// ===== ERRO =====
function renderizarErro() {
    return (
        '<div class="loading-state">' +
        '<span class="material-icons" style="font-size: 48px; color: #ef4444;">error_outline</span>' +
        '<p style="color: #ef4444;">Erro ao carregar ranking</p>' +
        '<button onclick="location.reload()" ' +
        'style="margin-top: 16px; padding: 10px 20px; background: ' +
        RANK_COLORS.primary +
        "; " +
        'color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">' +
        '<span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">refresh</span>' +
        "Tentar Novamente" +
        "</button>" +
        "</div>"
    );
}

// ===== COMPARTILHAR =====
window.compartilharRanking = async function () {
    mostrarToast("Função em desenvolvimento");
};

function copiarParaClipboard(texto) {
    navigator.clipboard
        .writeText(texto + "\n" + window.location.href)
        .then(function () {
            mostrarToast("Link copiado!");
        });
}

function mostrarToast(mensagem) {
    const toast = document.createElement("div");
    toast.style.cssText =
        "position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);" +
        "background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px;" +
        "font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500;" +
        "z-index: 10000; animation: fadeInUp 0.3s ease;" +
        "border: 1px solid #334155; box-shadow: 0 10px 40px rgba(0,0,0,0.4);";
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(function () {
        toast.style.animation = "fadeOut 0.3s ease";
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, 2000);
}

// ===== MODAL DE PREMIAÇÕES =====
window.mostrarPremiacaoPro = async function (posicaoClicada) {
    const existente = document.getElementById("modalPremiacoes");
    if (existente) existente.remove();

    const configRodada = await obterConfigRankingRodada();
    const valores = configRodada?.valores || {};
    const rodadaRef = configRodada?.rodadaRef || estadoRanking.rodadaAtual || "?";
    const faseLabel = configRodada?.temporal
        ? configRodada?.fase === "fase1"
            ? "Fase 1"
            : "Fase 2"
        : null;

    const posicoes = Object.keys(valores)
        .map((p) => parseInt(p, 10))
        .filter((p) => !Number.isNaN(p))
        .sort((a, b) => a - b);

    if (posicoes.length > 0 && !posicoes.includes(posicaoClicada)) {
        posicoes.push(posicaoClicada);
        posicoes.sort((a, b) => a - b);
    }

    const modal = document.createElement("div");
    modal.id = "modalPremiacoes";

    let premiacoesHTML = "";
    if (posicoes.length === 0) {
        premiacoesHTML =
            '<div class="premiacao-vazio">' +
            '<span class="material-icons">info</span>' +
            "<p>Sem valores financeiros configurados para esta rodada.</p>" +
            "</div>";
    } else {
        premiacoesHTML = posicoes
            .map(function (posicao) {
                const valor = valores[posicao] || valores[String(posicao)] || 0;
                const isDestaque = posicao === posicaoClicada;
                const cor =
                    posicao === 1
                        ? RANK_COLORS.gold
                        : posicao === 2
                          ? RANK_COLORS.silver
                          : posicao === 3
                            ? RANK_COLORS.bronze
                            : RANK_COLORS.primary;
                const bgColor =
                    posicao === 1
                        ? RANK_COLORS.goldBg
                        : posicao === 2
                          ? RANK_COLORS.silverBg
                          : posicao === 3
                            ? RANK_COLORS.bronzeBg
                            : "rgba(255,255,255,0.03)";
                const borderColor = isDestaque ? cor : "transparent";
                const label =
                    posicao === 1
                        ? "CAMPEÃO"
                        : posicao === 2
                          ? "2º LUGAR"
                          : posicao === 3
                            ? "3º LUGAR"
                            : `${posicao}º LUGAR`;
                return (
                    '<div class="premiacao-item ' +
                    (isDestaque ? "destaque" : "") +
                    '" style="background: ' +
                    bgColor +
                    "; border: 2px solid " +
                    borderColor +
                    ';">' +
                    '<div class="premiacao-icon" style="background: ' +
                    cor +
                    '20;">' +
                    '<span class="material-icons" style="color: ' +
                    cor +
                    ';">' +
                    (posicao === 1
                        ? "emoji_events"
                        : posicao <= 3
                          ? "military_tech"
                          : "payments") +
                    "</span>" +
                    "</div>" +
                    '<div class="premiacao-info">' +
                    '<div class="premiacao-label" style="color: ' +
                    cor +
                    ';">' +
                    label +
                    "</div>" +
                    '<div class="premiacao-valor">' +
                    formatarMoedaBR(valor) +
                    "</div>" +
                    "</div>" +
                    "</div>"
                );
            })
            .join("");
    }

    modal.innerHTML =
        "<style>" +
        "#modalPremiacoes { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s ease; }" +
        "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }" +
        "@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }" +
        "@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }" +
        "@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }" +
        "#modalPremiacoes .modal-content { background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%); border-radius: 20px; padding: 28px 24px; max-width: 420px; width: 100%; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); animation: slideUp 0.3s ease; }" +
        "#modalPremiacoes .modal-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }" +
        "#modalPremiacoes .modal-header .material-icons { font-size: 28px; color: " +
        RANK_COLORS.gold +
        "; }" +
        "#modalPremiacoes .modal-header h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }" +
        "#modalPremiacoes .premiacao-subtitle { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 18px; }" +
        "#modalPremiacoes .premiacao-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 14px; margin-bottom: 12px; transition: transform 0.2s ease; }" +
        "#modalPremiacoes .premiacao-item.destaque { transform: scale(1.02); }" +
        "#modalPremiacoes .premiacao-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }" +
        "#modalPremiacoes .premiacao-icon .material-icons { font-size: 26px; }" +
        "#modalPremiacoes .premiacao-info { flex: 1; text-align: left; }" +
        "#modalPremiacoes .premiacao-label { font-size: 14px; font-weight: 700; margin-bottom: 4px; }" +
        "#modalPremiacoes .premiacao-valor { font-size: 14px; font-weight: 600; color: #e5e7eb; }" +
        "#modalPremiacoes .premiacao-vazio { padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }" +
        "#modalPremiacoes .premiacao-vazio .material-icons { font-size: 20px; margin-bottom: 6px; }" +
        "#modalPremiacoes .premiacao-nota { margin-top: 18px; padding: 12px 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; font-size: 12px; color: rgba(255,255,255,0.55); }" +
        "#modalPremiacoes .btn-fechar { margin-top: 20px; padding: 12px 32px; background: " +
        RANK_COLORS.primary +
        "; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }" +
        "#modalPremiacoes .btn-fechar:active { transform: scale(0.98); }" +
        "</style>" +
        '<div class="modal-content" onclick="event.stopPropagation()">' +
        '<div class="modal-header">' +
        '<span class="material-icons">emoji_events</span>' +
        "<h2>Premiações da Liga</h2>" +
        "</div>" +
        '<div class="premiacao-subtitle">Rodada ' +
        rodadaRef +
        (faseLabel ? " • " + faseLabel : "") +
        "</div>" +
        premiacoesHTML +
        '<div class="premiacao-nota">Valores definidos no módulo de gerenciamento da liga (ranking de rodada).</div>' +
        '<button class="btn-fechar" onclick="document.getElementById(\'modalPremiacoes\').remove()">Fechar</button>' +
        "</div>";

    modal.onclick = function () {
        modal.remove();
    };
    document.body.appendChild(modal);
};

if (window.Log) Log.info('PARTICIPANTE-RANKING', '✅ Módulo v3.9 PRO carregado (CACHE-FIRST + Fix Container Refresh)');
