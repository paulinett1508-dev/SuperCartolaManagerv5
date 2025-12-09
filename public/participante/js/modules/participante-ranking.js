// =====================================================
// MÓDULO: RANKING PARTICIPANTE - v3.6 PRO
// Usa API de snapshots /api/ranking-turno
// ✅ v3.6: Detecção de CAMPEÃO (R38 encerrada) + Card menor
// ✅ v3.5: Card Seu Desempenho ao final + Vezes Líder
// =====================================================

console.log("[PARTICIPANTE-RANKING] Módulo v3.6 PRO carregando...");

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
        console.log("[PARTICIPANTE-RANKING] Material Icons link adicionado");
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
};

export async function inicializarRankingParticipante(params, timeIdParam) {
    console.log("[PARTICIPANTE-RANKING] Inicializando módulo...", params);

    let ligaId, timeId;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
    } else {
        ligaId = params;
        timeId = timeIdParam;
    }

    if (!ligaId) {
        console.error("[PARTICIPANTE-RANKING] Liga ID inválido");
        return;
    }

    estadoRanking.ligaId = ligaId;
    estadoRanking.timeId = timeId;

    console.log("[PARTICIPANTE-RANKING] Dados:", { ligaId, timeId });

    const container = document.getElementById("rankingLista");
    if (!container) {
        console.error("[PARTICIPANTE-RANKING] Container não encontrado");
        return;
    }

    // ✅ v3.6: Detectar status do mercado antes de carregar
    await detectarStatusTemporada();

    // Injetar estilos dos cards uma única vez
    injetarEstilosCards();

    configurarTabs();

    try {
        await carregarRanking(estadoRanking.turnoAtivo);
        console.log("[PARTICIPANTE-RANKING] Ranking carregado");
    } catch (error) {
        console.error("[PARTICIPANTE-RANKING] Erro:", error);
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

            // Temporada encerrada: status_mercado = 6 OU (rodada >= 38 E mercado fechado)
            estadoRanking.temporadaEncerrada =
                statusMercado === 6 ||
                (rodadaAtual >= RODADA_FINAL && statusMercado !== 1);

            console.log("[PARTICIPANTE-RANKING] 📊 Status:", {
                rodadaAtual,
                statusMercado,
                temporadaEncerrada: estadoRanking.temporadaEncerrada,
            });
        }
    } catch (error) {
        console.warn(
            "[PARTICIPANTE-RANKING] ⚠️ Erro ao detectar status:",
            error,
        );
    }
}

// ===== CARREGAR RANKING VIA API =====
async function carregarRanking(turno) {
    const container = document.getElementById("rankingLista");
    const ligaId = estadoRanking.ligaId;
    const timeId = estadoRanking.timeId;

    // Loading
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando ranking...</p>
        </div>
    `;

    try {
        console.log("[PARTICIPANTE-RANKING] Buscando turno " + turno + "...");

        // Buscar turno principal
        const response = await fetch(
            "/api/ranking-turno/" + ligaId + "?turno=" + turno,
        );
        const data = await response.json();

        if (!data.success || !data.ranking) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">event_busy</span>
                    <p>Sem dados para este turno</p>
                </div>
            `;
            return;
        }

        estadoRanking.dadosAtuais = data;

        // Se for turno "geral", buscar posições nos outros turnos em paralelo
        if (turno === "geral" && timeId) {
            await carregarPosicoesTurnos();
        }

        console.log(
            "[PARTICIPANTE-RANKING] " +
                data.total_times +
                " times - Status: " +
                data.status,
        );

        renderizarRankingPro(container, data.ranking, data.rodada_atual);
    } catch (error) {
        console.error("[PARTICIPANTE-RANKING] Erro:", error);
        container.innerHTML = renderizarErro();
    }
}

// ===== CARREGAR POSIÇÕES EM TODOS OS TURNOS =====
async function carregarPosicoesTurnos() {
    const ligaId = estadoRanking.ligaId;
    const timeId = estadoRanking.timeId;

    if (!ligaId || !timeId) return;

    try {
        // Buscar 1º e 2º turno + rodadas em paralelo
        const [resp1, resp2, respRodadas] = await Promise.all([
            fetch("/api/ranking-turno/" + ligaId + "?turno=1"),
            fetch("/api/ranking-turno/" + ligaId + "?turno=2"),
            fetch("/api/rodadas/" + ligaId + "/rodadas?inicio=1&fim=38"),
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
            console.log(
                "[PARTICIPANTE-RANKING] 🏆 Vezes líder:",
                estadoRanking.vezesLider,
            );
        }

        console.log(
            "[PARTICIPANTE-RANKING] Posições por turno:",
            estadoRanking.posicoesPorTurno,
        );
    } catch (error) {
        console.error("[PARTICIPANTE-RANKING] Erro ao buscar turnos:", error);
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

    const pontosFormatados = parseFloat(lider.pontos).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
    });

    // ✅ v3.6: Determinar se é CAMPEÃO ou LÍDER
    const isCampeao =
        estadoRanking.temporadaEncerrada &&
        estadoRanking.turnoAtivo === "geral";
    const titulo = isCampeao ? "CAMPEÃO" : "LÍDER " + turnoLabel.toUpperCase();
    const subtitulo = isCampeao
        ? "Temporada 2025 encerrada"
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

    const pontosFormatados = parseFloat(meusDados.pontos).toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 },
    );

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
            ? "🏆 Você é o CAMPEÃO do Super Cartola!"
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
            diffLider.toFixed(2) +
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

    const totalTimes = ranking.length;
    const timeId = estadoRanking.timeId;
    const turnoLabel =
        estadoRanking.turnoAtivo === "geral"
            ? "Geral"
            : estadoRanking.turnoAtivo + "º Turno";

    // Criar cards de destaque
    const lider = ranking[0];
    const cardLiderHTML = criarCardLider(lider, turnoLabel, rodadaAtual);
    const cardSeuDesempenhoHTML = criarCardSeuDesempenho(ranking, turnoLabel);

    const listaHTML = ranking
        .map(function (time) {
            const posicao = time.posicao;
            const isMeuTime = String(time.timeId) === String(timeId);
            const isPodio = posicao <= 3;
            const isZonaRebaixamento =
                posicao > totalTimes - 3 && totalTimes > 6;

            let classes = ["ranking-item"];
            if (posicao === 1) classes.push("podio-1");
            else if (posicao === 2) classes.push("podio-2");
            else if (posicao === 3) classes.push("podio-3");
            if (isMeuTime) classes.push("meu-time");
            if (isZonaRebaixamento && !isPodio)
                classes.push("zona-rebaixamento");

            const pontosFormatados = parseFloat(time.pontos).toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                },
            );

            const podioIcon = isPodio
                ? '<span class="material-icons podio-icon">military_tech</span>'
                : "";

            // Tag "VOCÊ" se for meu time
            const tagVoce = isMeuTime
                ? ' <span class="tag-voce"><span class="material-icons">person</span> VOCÊ</span>'
                : "";

            return (
                '<div class="' +
                classes.join(" ") +
                '" ' +
                'data-posicao="' +
                posicao +
                '" ' +
                'data-time-id="' +
                time.timeId +
                '" ' +
                (isPodio
                    ? 'onclick="mostrarPremiacaoPro(' + posicao + ')"'
                    : "") +
                ">" +
                '<div class="posicao-container">' +
                '<span class="posicao-badge">' +
                posicao +
                "</span>" +
                podioIcon +
                "</div>" +
                '<div class="time-info-container">' +
                '<span class="time-nome">' +
                (time.nome_time || "Time") +
                tagVoce +
                "</span>" +
                '<span class="time-cartoleiro">' +
                (time.nome_cartola || "Cartoleiro") +
                "</span>" +
                "</div>" +
                '<div class="pontos-valor">' +
                pontosFormatados +
                "</div>" +
                "</div>"
            );
        })
        .join("");

    // Remover cards anteriores se existirem
    const cardsAnteriores = document.querySelectorAll(
        ".cards-destaque-container",
    );
    cardsAnteriores.forEach(function (el) {
        el.remove();
    });

    // Montar HTML - Líder no topo, Seu Desempenho ao final
    let htmlFinal = "";

    // Card Líder permanece no topo
    if (cardLiderHTML) {
        htmlFinal +=
            '<div class="cards-destaque-container">' + cardLiderHTML + "</div>";
    }

    htmlFinal += '<div class="ranking-lista-items">' + listaHTML + "</div>";

    // Inserir no container
    container.innerHTML = htmlFinal;

    // Renderizar card Seu Desempenho no container externo (final)
    const cardDesempenhoContainer = document.getElementById(
        "rankingCardDesempenho",
    );
    if (cardDesempenhoContainer && cardSeuDesempenhoHTML) {
        cardDesempenhoContainer.innerHTML = cardSeuDesempenhoHTML;
    } else if (cardDesempenhoContainer) {
        cardDesempenhoContainer.innerHTML = "";
    }

    // Scroll para meu time
    setTimeout(function () {
        const meuTimeEl = container.querySelector(".meu-time");
        if (meuTimeEl) {
            const containerRect = container.getBoundingClientRect();
            const itemRect = meuTimeEl.getBoundingClientRect();

            if (
                itemRect.top > containerRect.bottom ||
                itemRect.bottom < containerRect.top
            ) {
                meuTimeEl.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }
    }, 100);
}

// ===== INJETAR ESTILOS DOS CARDS =====
function injetarEstilosCards() {
    if (document.getElementById("ranking-cards-styles")) return;

    const style = document.createElement("style");
    style.id = "ranking-cards-styles";
    style.textContent = `
        /* Container da lista de items */
        .ranking-lista-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* Container dos cards */
        .cards-destaque-container {
            padding: 0 12px;
            margin-bottom: 12px;
        }

        /* ✅ v3.6: Card Líder/Campeão COMPACTO */
        .card-lider-compacto {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(255, 215, 0, 0.4);
            border-radius: 12px;
            padding: 12px;
            position: relative;
            overflow: hidden;
        }
        .card-lider-compacto::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #ffd700, #ffaa00, #ffd700);
        }
        .lider-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .lider-icon-box {
            width: 36px;
            height: 36px;
            background: rgba(255, 215, 0, 0.15);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .lider-icon-box .material-icons {
            font-size: 20px;
            color: #ffd700;
        }
        .lider-header-info {
            flex: 1;
            min-width: 0;
        }
        .lider-titulo {
            font-size: 10px;
            font-weight: 700;
            color: #ffd700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        .lider-subtitulo {
            font-size: 9px;
            color: #888;
        }
        .lider-pontos-box {
            text-align: right;
            flex-shrink: 0;
        }
        .lider-pontos-valor {
            font-size: 16px;
            font-weight: 800;
            color: #ffd700;
            display: block;
        }
        .lider-pontos-label {
            font-size: 9px;
            color: #888;
        }
        .lider-body {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .lider-nome {
            font-size: 13px;
            font-weight: 600;
            color: #fff;
        }
        .lider-time {
            font-size: 11px;
            color: #aaa;
        }
        .lider-badge-campeao {
            margin-top: 8px;
            padding: 6px 10px;
            background: rgba(255, 215, 0, 0.12);
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            color: #ffd700;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .lider-badge-campeao .material-icons {
            font-size: 14px;
        }

        /* Card Seu Desempenho */
        .card-seu-desempenho {
            background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
            border: 1px solid rgba(255, 92, 0, 0.3);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .seu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .seu-titulo {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            color: #ff5c00;
        }
        .seu-titulo .material-icons {
            font-size: 20px;
        }
        .seu-turno {
            font-size: 0.7rem;
            color: #888;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 10px;
            border-radius: 12px;
        }
        .seu-body {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .seu-posicao {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 60px;
            padding: 10px;
            background: rgba(255, 92, 0, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(255, 92, 0, 0.2);
        }
        .seu-posicao.posicao-ouro {
            background: rgba(255, 215, 0, 0.15);
            border-color: rgba(255, 215, 0, 0.3);
        }
        .seu-posicao.posicao-prata {
            background: rgba(192, 192, 192, 0.15);
            border-color: rgba(192, 192, 192, 0.3);
        }
        .seu-posicao.posicao-bronze {
            background: rgba(205, 127, 50, 0.15);
            border-color: rgba(205, 127, 50, 0.3);
        }
        .seu-posicao.posicao-ultimo {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
        }
        .seu-posicao-valor {
            font-size: 1.6rem;
            font-weight: 800;
            color: #ff5c00;
        }
        .posicao-ouro .seu-posicao-valor { color: #ffd700; }
        .posicao-prata .seu-posicao-valor { color: #c0c0c0; }
        .posicao-bronze .seu-posicao-valor { color: #cd7f32; }
        .posicao-ultimo .seu-posicao-valor { color: #ef4444; }
        .seu-posicao-label {
            font-size: 0.65rem;
            color: #888;
            margin-top: 2px;
        }
        .seu-info {
            flex: 1;
            min-width: 0;
        }
        .seu-nome {
            font-size: 0.95rem;
            font-weight: 600;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .seu-time {
            font-size: 0.8rem;
            color: #888;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .seu-pontos {
            text-align: right;
            flex-shrink: 0;
        }
        .seu-pontos-valor {
            font-size: 1.3rem;
            font-weight: 800;
            color: #ff5c00;
        }
        .seu-pontos-label {
            font-size: 0.7rem;
            color: #888;
            display: block;
        }
        .seu-footer {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .seu-footer.lider {
            background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
            border-radius: 8px;
            padding: 10px 12px;
            margin-top: 12px;
            border-top: none;
        }
        .lider-badge {
            display: flex;
            align-items: center;
            gap: 6px;
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
            font-size: 0.75rem;
            color: #888;
        }
        .diff-valor {
            font-size: 0.9rem;
            font-weight: 700;
        }
        .diff-valor.negativo {
            color: #ef4444;
        }

        /* Posições por turno */
        .seu-turnos {
            display: flex;
            gap: 12px;
            margin-top: 12px;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
        }
        .turno-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .turno-label {
            font-size: 0.7rem;
            color: #888;
        }
        .turno-pos {
            font-size: 0.85rem;
            font-weight: 700;
            color: #ff5c00;
        }

        /* Vezes líder */
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
window.mostrarPremiacaoPro = function (posicaoClicada) {
    const existente = document.getElementById("modalPremiacoes");
    if (existente) existente.remove();

    const premiacoes = [
        {
            posicao: 1,
            label: "CAMPEÃO",
            icon: "emoji_events",
            cor: RANK_COLORS.gold,
        },
        {
            posicao: 2,
            label: "2º LUGAR",
            icon: "military_tech",
            cor: RANK_COLORS.silver,
        },
        {
            posicao: 3,
            label: "3º LUGAR",
            icon: "military_tech",
            cor: RANK_COLORS.bronze,
        },
    ];

    const modal = document.createElement("div");
    modal.id = "modalPremiacoes";

    let premiacoesHTML = premiacoes
        .map(function (p) {
            const isDestaque = p.posicao === posicaoClicada;
            const bgColor =
                p.posicao === 1
                    ? RANK_COLORS.goldBg
                    : p.posicao === 2
                      ? RANK_COLORS.silverBg
                      : RANK_COLORS.bronzeBg;
            const borderColor = isDestaque ? p.cor : "transparent";
            return (
                '<div class="premiacao-item ' +
                (isDestaque ? "destaque" : "") +
                '" style="background: ' +
                bgColor +
                "; border: 2px solid " +
                borderColor +
                ';">' +
                '<div class="premiacao-icon" style="background: ' +
                p.cor +
                '20;">' +
                '<span class="material-icons" style="color: ' +
                p.cor +
                ';">' +
                p.icon +
                "</span>" +
                "</div>" +
                '<div class="premiacao-info">' +
                '<div class="premiacao-label" style="color: ' +
                p.cor +
                ';">' +
                p.label +
                "</div>" +
                '<div class="premiacao-valor">Premiação: (função sendo desenvolvida)</div>' +
                "</div>" +
                "</div>"
            );
        })
        .join("");

    modal.innerHTML =
        "<style>" +
        "#modalPremiacoes { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s ease; }" +
        "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }" +
        "@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }" +
        "@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }" +
        "@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }" +
        "#modalPremiacoes .modal-content { background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%); border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 100%; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); animation: slideUp 0.3s ease; }" +
        "#modalPremiacoes .modal-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 24px; }" +
        "#modalPremiacoes .modal-header .material-icons { font-size: 28px; color: " +
        RANK_COLORS.gold +
        "; }" +
        "#modalPremiacoes .modal-header h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }" +
        "#modalPremiacoes .premiacao-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 14px; margin-bottom: 12px; transition: transform 0.2s ease; }" +
        "#modalPremiacoes .premiacao-item.destaque { transform: scale(1.02); }" +
        "#modalPremiacoes .premiacao-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }" +
        "#modalPremiacoes .premiacao-icon .material-icons { font-size: 28px; }" +
        "#modalPremiacoes .premiacao-info { flex: 1; text-align: left; }" +
        "#modalPremiacoes .premiacao-label { font-size: 14px; font-weight: 700; margin-bottom: 4px; }" +
        "#modalPremiacoes .premiacao-valor { font-size: 14px; font-weight: 500; color: #9ca3af; font-style: italic; }" +
        "#modalPremiacoes .dev-notice { margin-top: 20px; padding: 16px; background: rgba(255, 92, 0, 0.1); border: 1px solid rgba(255, 92, 0, 0.3); border-radius: 12px; }" +
        "#modalPremiacoes .dev-notice-icon { margin-bottom: 8px; }" +
        "#modalPremiacoes .dev-notice-icon .material-icons { font-size: 32px; color: #ff5c00; }" +
        "#modalPremiacoes .dev-notice-text { font-size: 13px; color: #ff5c00; font-weight: 500; }" +
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
        premiacoesHTML +
        '<div class="dev-notice">' +
        '<div class="dev-notice-icon"><span class="material-icons">engineering</span></div>' +
        '<div class="dev-notice-text">Os valores de premiação serão configurados pelo administrador da liga</div>' +
        "</div>" +
        '<button class="btn-fechar" onclick="document.getElementById(\'modalPremiacoes\').remove()">Fechar</button>' +
        "</div>";

    modal.onclick = function () {
        modal.remove();
    };
    document.body.appendChild(modal);
};

console.log(
    "[PARTICIPANTE-RANKING] ✅ Módulo v3.6 PRO carregado (Campeão + Card Compacto)",
);
