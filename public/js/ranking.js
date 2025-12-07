// 🔧 RANKING.JS - v2.2 COM DESTAQUES VISUAIS
// Visual diferenciado para inativos + filtros 1º/2º turno/Geral
// ✅ NOVO: Card destaque do líder + Card "Seu Desempenho" + Posições por turno

// 🛡️ SISTEMA DE PROTEÇÃO CONTRA LOOP
let rankingProcessando = false;
let ultimoProcessamento = 0;
const INTERVALO_MINIMO_PROCESSAMENTO = 3000;

// 🎯 ESTADO DO MÓDULO
let estadoRankingAdmin = {
    ligaId: null,
    turnoAtivo: "geral",
    dadosOriginais: null,
    posicoesPorTurno: {
        turno1: null,
        turno2: null,
        geral: null,
    },
};

// ==============================
// CARREGAR MATERIAL ICONS (IMEDIATO + FORÇADO)
// ==============================
(function () {
    // Verificar se já existe no head
    const existente = document.querySelector(
        'link[href*="fonts.googleapis.com"][href*="Material"]',
    );

    if (!existente) {
        // Criar link da fonte
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
        link.rel = "stylesheet";
        link.crossOrigin = "anonymous";

        // Inserir no início do head para carregar primeiro
        if (document.head.firstChild) {
            document.head.insertBefore(link, document.head.firstChild);
        } else {
            document.head.appendChild(link);
        }
        console.log("[RANKING] Material Icons link adicionado");
    }

    // Sempre adicionar CSS de fallback para garantir renderização
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
        console.log("[RANKING] Material Icons CSS inline adicionado");
    }
})();

// ==============================
// CARREGAR POSIÇÕES EM TODOS OS TURNOS
// ==============================
async function carregarPosicoesTurnosAdmin(ligaId) {
    const participanteLogado = obterParticipanteLogado();
    if (!participanteLogado) return;

    const timeId = participanteLogado.time_id;
    if (!timeId) return;

    try {
        // Buscar 1º e 2º turno em paralelo
        const [resp1, resp2] = await Promise.all([
            fetch(`/api/ranking-turno/${ligaId}?turno=1`),
            fetch(`/api/ranking-turno/${ligaId}?turno=2`),
        ]);

        const [data1, data2] = await Promise.all([resp1.json(), resp2.json()]);

        // Extrair posição do participante em cada turno
        if (data1.success && data1.ranking) {
            const meuDado1 = data1.ranking.find(
                (p) => String(p.timeId) === String(timeId),
            );
            estadoRankingAdmin.posicoesPorTurno.turno1 = meuDado1
                ? meuDado1.posicao
                : null;
        }

        if (data2.success && data2.ranking) {
            const meuDado2 = data2.ranking.find(
                (p) => String(p.timeId) === String(timeId),
            );
            estadoRankingAdmin.posicoesPorTurno.turno2 = meuDado2
                ? meuDado2.posicao
                : null;
        }

        console.log(
            "[RANKING] Posições por turno:",
            estadoRankingAdmin.posicoesPorTurno,
        );
    } catch (error) {
        console.error("[RANKING] Erro ao buscar turnos:", error);
    }
}

// ==============================
// FUNÇÃO PRINCIPAL DE RANKING
// ==============================
async function carregarRankingGeral(turnoParam = null) {
    const agora = Date.now();
    if (rankingProcessando) {
        console.log("[RANKING] ⏳ Já está processando, ignorando nova chamada");
        return;
    }

    if (agora - ultimoProcessamento < INTERVALO_MINIMO_PROCESSAMENTO) {
        console.log("[RANKING] ⏱️ Intervalo mínimo não atingido");
        return;
    }

    rankingProcessando = true;
    ultimoProcessamento = agora;

    const rankingContainer = document.getElementById("ranking-geral");
    if (!rankingContainer || !rankingContainer.classList.contains("active")) {
        rankingProcessando = false;
        return;
    }

    // Se não tem turno definido, usar o ativo
    const turno = turnoParam || estadoRankingAdmin.turnoAtivo;

    // Mostrar loading apenas na área da tabela se já tiver estrutura
    const tabelaBody = document.getElementById("rankingGeralTableBody");
    if (tabelaBody) {
        tabelaBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px; color:#888;">
                    <div class="spinner" style="margin: 0 auto 10px;"></div>
                    Carregando ${turno === "geral" ? "classificação geral" : turno + "º turno"}...
                </td>
            </tr>
        `;
    } else {
        rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;"><span class="material-icons" style="animation: spin 1s linear infinite;">settings</span> Carregando classificação...</div>`;
    }

    try {
        console.log(`[RANKING] 🚀 Carregando turno: ${turno}`);

        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        if (!ligaId) {
            throw new Error("ID da liga não encontrado na URL");
        }

        estadoRankingAdmin.ligaId = ligaId;

        // Buscar ranking do turno via nova API
        const response = await fetch(
            `/api/ranking-turno/${ligaId}?turno=${turno}`,
        );

        if (!response.ok) {
            // Fallback para API antiga se nova não existir
            if (response.status === 404) {
                console.log(
                    "[RANKING] ⚠️ API de turno não encontrada, usando fallback",
                );
                await carregarRankingFallback(ligaId, rankingContainer);
                return;
            }
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.ranking) {
            throw new Error("Dados inválidos da API");
        }

        console.log(
            `[RANKING] ✅ Ranking recebido: ${data.total_times} participantes`,
        );
        console.log(
            `[RANKING] 📊 Turno: ${data.turno} | Status: ${data.status}`,
        );
        console.log(
            `[RANKING] 📋 Rodadas: ${data.rodada_inicio}-${data.rodada_fim} (atual: ${data.rodada_atual})`,
        );

        // Buscar status de inatividade
        const timeIds = data.ranking.map((p) => p.timeId);
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
                console.log(`[RANKING] ✅ Status de inatividade carregado`);
            }
        } catch (error) {
            console.warn("[RANKING] ⚠️ Falha ao buscar status:", error.message);
        }

        // Converter formato + adicionar status
        const participantesOrdenados = data.ranking.map((p) => {
            const status = statusMap[p.timeId] || {
                ativo: true,
                rodada_desistencia: null,
            };

            return {
                time_id: p.timeId,
                nome_cartola: p.nome_cartola || "N/D",
                nome_time: p.nome_time || "N/D",
                clube_id: p.clube_id || null,
                pontos: p.pontos,
                rodadas_jogadas: p.rodadas_jogadas,
                posicao: p.posicao,
                ativo: status.ativo,
                rodada_desistencia: status.rodada_desistencia,
            };
        });

        // Se for turno "geral", buscar posições nos outros turnos em paralelo
        if (turno === "geral") {
            await carregarPosicoesTurnosAdmin(ligaId);
        }

        // Separar ativos e inativos
        const ativos = participantesOrdenados.filter((p) => p.ativo !== false);
        const inativos = participantesOrdenados.filter(
            (p) => p.ativo === false,
        );

        ativos.sort((a, b) => b.pontos - a.pontos);
        inativos.sort(
            (a, b) => (b.rodada_desistencia || 0) - (a.rodada_desistencia || 0),
        );

        const participantesFinais = [...ativos, ...inativos];

        // Armazenar dados
        window.rankingData = participantesFinais;
        window.rankingGeral = participantesFinais;
        window.ultimoRanking = participantesFinais;

        // Gerar HTML
        const tabelaHTML = criarTabelaRanking(
            participantesFinais,
            data.rodada_atual,
            ligaId,
            ativos.length,
            turno,
            data.status,
            data.rodada_inicio,
            data.rodada_fim,
        );
        rankingContainer.innerHTML = tabelaHTML;

        // Configurar listeners das tabs
        configurarTabsRanking();

        console.log(
            `[RANKING] ✅ Classificação renderizada: ${ativos.length} ativos, ${inativos.length} inativos`,
        );
    } catch (error) {
        console.error("[RANKING] ❌ Erro no processamento:", error);
        rankingContainer.innerHTML = `
            <div class="error-message" style="text-align:center; padding:40px; color:#ff4444;">
                <h4><span class="material-icons" style="vertical-align:middle;">warning</span> Erro ao carregar classificação</h4>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" 
                        style="background:#ff4500; color:white; border:none; padding:10px 20px; 
                               border-radius:5px; cursor:pointer; margin-top:10px;">
                    <span class="material-icons" style="font-size:16px; vertical-align:middle;">refresh</span> Recarregar Página
                </button>
            </div>
        `;
    } finally {
        rankingProcessando = false;
        console.log("[RANKING] Processamento finalizado");
    }
}

// ==============================
// FALLBACK PARA API ANTIGA
// ==============================
async function carregarRankingFallback(ligaId, rankingContainer) {
    try {
        const response = await fetch(`/api/ranking-cache/${ligaId}`);
        if (!response.ok) throw new Error(`Erro: ${response.status}`);

        const data = await response.json();

        const participantes = data.ranking.map((p) => ({
            time_id: p.timeId,
            nome_cartola: p.nome_cartola || "N/D",
            nome_time: p.nome_time || "N/D",
            clube_id: p.clube_id || null,
            pontos: p.pontos_totais,
            rodadas_jogadas: p.rodadas_jogadas,
            posicao: p.posicao,
            ativo: true,
            rodada_desistencia: null,
        }));

        const tabelaHTML = criarTabelaRanking(
            participantes,
            data.rodadaFinal,
            ligaId,
            participantes.length,
            "geral",
            "fallback",
            1,
            38,
        );
        rankingContainer.innerHTML = tabelaHTML;
        configurarTabsRanking();
    } catch (error) {
        throw error;
    } finally {
        rankingProcessando = false;
    }
}

// ==============================
// CONFIGURAR TABS
// ==============================
function configurarTabsRanking() {
    const tabs = document.querySelectorAll(".ranking-turno-tab");

    tabs.forEach((tab) => {
        tab.addEventListener("click", async (e) => {
            e.preventDefault();

            // Atualizar visual das tabs
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            // Atualizar estado e carregar
            const turno = tab.dataset.turno;
            estadoRankingAdmin.turnoAtivo = turno;

            // Forçar novo carregamento
            rankingProcessando = false;
            ultimoProcessamento = 0;

            await carregarRankingGeral(turno);
        });
    });
}

// ==============================
// ✅ NOVO: OBTER DADOS DO PARTICIPANTE LOGADO
// ==============================
function obterParticipanteLogado() {
    // Verificar se há sessão de participante
    const sessaoParticipante =
        window.participanteSessao ||
        window.sessaoParticipante ||
        JSON.parse(sessionStorage.getItem("participanteSessao") || "null") ||
        JSON.parse(localStorage.getItem("participanteSessao") || "null");

    if (sessaoParticipante && sessaoParticipante.time_id) {
        return sessaoParticipante;
    }

    return null;
}

// ==============================
// ✅ NOVO: CRIAR CARD DESTAQUE DO LÍDER
// ==============================
function criarCardLider(lider, turnoLabel, rodadaAtual) {
    if (!lider) return "";

    const escudoHTML = lider.clube_id
        ? `<img src="/escudos/${lider.clube_id}.png" alt="Escudo" class="lider-escudo" onerror="this.style.display='none'">`
        : "";

    return `
        <div class="card-lider-destaque">
            <div class="lider-crown"><span class="material-icons">workspace_premium</span></div>
            <div class="lider-titulo">LÍDER ${turnoLabel.toUpperCase()}</div>
            <div class="lider-info">
                ${escudoHTML}
                <div class="lider-dados">
                    <div class="lider-nome">${lider.nome_cartola}</div>
                    <div class="lider-time">${lider.nome_time}</div>
                </div>
            </div>
            <div class="lider-pontos">
                <span class="lider-pontos-valor">${lider.pontos.toFixed(2)}</span>
                <span class="lider-pontos-label">pontos</span>
            </div>
            <div class="lider-rodada">até a ${rodadaAtual}ª rodada</div>
        </div>
    `;
}

// ==============================
// ✅ NOVO: CRIAR CARD SEU DESEMPENHO
// ==============================
function criarCardSeuDesempenho(participantes, participanteLogado, turnoLabel) {
    if (!participanteLogado) return "";

    const timeId = String(participanteLogado.time_id);
    const meusDados = participantes.find((p) => String(p.time_id) === timeId);

    if (!meusDados) return "";

    // Encontrar posição real
    const ativos = participantes.filter((p) => p.ativo !== false);
    const posicao = ativos.findIndex((p) => String(p.time_id) === timeId) + 1;

    if (posicao <= 0) return "";

    // Calcular diferença para o líder
    const lider = ativos[0];
    const diffLider = lider ? lider.pontos - meusDados.pontos : 0;

    // Definir cor da posição
    let posicaoClass = "";
    let posicaoIcon = `${posicao}º`;
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
    } else if (posicao === ativos.length) {
        posicaoClass = "posicao-ultimo";
    }

    const escudoHTML = meusDados.clube_id
        ? `<img src="/escudos/${meusDados.clube_id}.png" alt="Escudo" class="seu-escudo" onerror="this.style.display='none'">`
        : "";

    // Linha de posições por turno (só na visão Geral)
    let turnosHTML = "";
    const pos1 = estadoRankingAdmin.posicoesPorTurno.turno1;
    const pos2 = estadoRankingAdmin.posicoesPorTurno.turno2;

    if (estadoRankingAdmin.turnoAtivo === "geral" && (pos1 || pos2)) {
        turnosHTML = `
            <div class="seu-turnos">
                ${
                    pos1
                        ? `<div class="turno-item">
                    <span class="turno-label">1º Turno:</span>
                    <span class="turno-pos">${pos1}º</span>
                </div>`
                        : ""
                }
                ${
                    pos2
                        ? `<div class="turno-item">
                    <span class="turno-label">2º Turno:</span>
                    <span class="turno-pos">${pos2}º</span>
                </div>`
                        : ""
                }
            </div>
        `;
    }

    return `
        <div class="card-seu-desempenho">
            <div class="seu-header">
                <span class="seu-titulo"><span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">leaderboard</span> Seu Desempenho</span>
                <span class="seu-turno">${turnoLabel}</span>
            </div>
            <div class="seu-body">
                <div class="seu-posicao ${posicaoClass}">
                    <span class="seu-posicao-valor">${posicaoIcon}</span>
                    <span class="seu-posicao-label">de ${ativos.length}</span>
                </div>
                <div class="seu-info">
                    ${escudoHTML}
                    <div class="seu-dados">
                        <div class="seu-nome">${meusDados.nome_cartola}</div>
                        <div class="seu-time">${meusDados.nome_time}</div>
                    </div>
                </div>
                <div class="seu-pontos">
                    <span class="seu-pontos-valor">${meusDados.pontos.toFixed(2)}</span>
                    <span class="seu-pontos-label">pts</span>
                </div>
            </div>
            ${turnosHTML}
            ${
                posicao > 1
                    ? `
            <div class="seu-footer">
                <div class="seu-diff">
                    <span class="diff-label">Atrás do líder:</span>
                    <span class="diff-valor negativo">-${diffLider.toFixed(2)}</span>
                </div>
            </div>
            `
                    : `
            <div class="seu-footer lider">
                <span class="lider-badge">
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">emoji_events</span>
                    ${meusDados.nome_time} está sendo o grande campeão do Super Cartola
                </span>
            </div>
            `
            }
        </div>
    `;
}

// ==============================
// CRIAR HTML DA TABELA
// ==============================
function criarTabelaRanking(
    participantes,
    ultimaRodada,
    ligaId,
    totalAtivos,
    turno = "geral",
    status = "",
    rodadaInicio = 1,
    rodadaFim = 38,
) {
    const temInativos = participantes.some((p) => p.ativo === false);
    const turnoLabel = turno === "geral" ? "Geral" : `${turno}º Turno`;
    const statusLabel =
        status === "consolidado"
            ? '<span style="color:#22c55e; font-size:0.8em;"><span class="material-icons" style="font-size:14px; vertical-align:middle;">check_circle</span> Consolidado</span>'
            : status === "em_andamento"
              ? '<span style="color:#facc15; font-size:0.8em;"><span class="material-icons" style="font-size:14px; vertical-align:middle;">schedule</span> Em andamento</span>'
              : "";

    // ✅ NOVO: Obter líder e participante logado
    const ativos = participantes.filter((p) => p.ativo !== false);
    const lider = ativos.length > 0 ? ativos[0] : null;
    const participanteLogado = obterParticipanteLogado();

    // ✅ NOVO: Criar cards de destaque
    const cardLiderHTML = criarCardLider(lider, turnoLabel, ultimaRodada);
    const cardSeuDesempenhoHTML = criarCardSeuDesempenho(
        participantes,
        participanteLogado,
        turnoLabel,
    );

    return `
        <style>
            /* ✅ NOVO: Card Destaque do Líder */
            .card-lider-destaque {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                border: 2px solid #ffd700;
                border-radius: 16px;
                padding: 20px;
                margin: 0 auto 20px;
                max-width: 400px;
                text-align: center;
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
            }
            .card-lider-destaque::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #ffd700, #ffec8b, #ffd700);
            }
            .lider-crown {
                font-size: 2.5rem;
                margin-bottom: 4px;
                color: #ffd700;
            }
            .lider-crown .material-icons {
                font-size: 3rem;
                animation: float 3s ease-in-out infinite;
            }
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            .lider-titulo {
                font-size: 0.75rem;
                font-weight: 700;
                color: #ffd700;
                letter-spacing: 3px;
                margin-bottom: 12px;
            }
            .lider-info {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .lider-escudo {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #fff;
                padding: 4px;
                border: 2px solid #ffd700;
            }
            .lider-dados {
                text-align: left;
            }
            .lider-nome {
                font-size: 1.25rem;
                font-weight: 700;
                color: #fff;
            }
            .lider-time {
                font-size: 0.85rem;
                color: #aaa;
            }
            .lider-pontos {
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 6px;
                margin-top: 8px;
            }
            .lider-pontos-valor {
                font-size: 2rem;
                font-weight: 800;
                color: #ffd700;
                text-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
            }
            .lider-pontos-label {
                font-size: 0.9rem;
                color: #888;
            }
            .lider-rodada {
                font-size: 0.75rem;
                color: #666;
                margin-top: 8px;
            }

            /* ✅ NOVO: Card Seu Desempenho */
            .card-seu-desempenho {
                background: linear-gradient(135deg, #1e3a5f 0%, #1a2d47 100%);
                border: 1px solid #3b82f6;
                border-radius: 12px;
                padding: 16px;
                margin: 0 auto 20px;
                max-width: 400px;
                box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
            }
            .seu-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #334155;
            }
            .seu-titulo {
                font-size: 0.9rem;
                font-weight: 600;
                color: #fff;
            }
            .seu-turno {
                font-size: 0.7rem;
                background: #3b82f6;
                color: #fff;
                padding: 3px 8px;
                border-radius: 4px;
            }
            .seu-body {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .seu-posicao {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 50px;
            }
            .seu-posicao-valor {
                font-size: 1.5rem;
                font-weight: 800;
                color: #fff;
            }
            .seu-posicao-label {
                font-size: 0.65rem;
                color: #64748b;
            }
            .seu-posicao.posicao-ouro .seu-posicao-valor { color: #ffd700; }
            .seu-posicao.posicao-prata .seu-posicao-valor { color: #c0c0c0; }
            .seu-posicao.posicao-bronze .seu-posicao-valor { color: #cd7f32; }
            .seu-posicao.posicao-ultimo .seu-posicao-valor { color: #ef4444; }
            .seu-info {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .seu-escudo {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: #fff;
                padding: 2px;
            }
            .seu-dados {
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
                font-size: 0.75rem;
                color: #94a3b8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .seu-pontos {
                text-align: right;
                min-width: 70px;
            }
            .seu-pontos-valor {
                font-size: 1.3rem;
                font-weight: 700;
                color: #3b82f6;
            }
            .seu-pontos-label {
                font-size: 0.65rem;
                color: #64748b;
            }
            .seu-turnos {
                display: flex;
                justify-content: center;
                gap: 24px;
                margin-top: 12px;
                padding: 10px 0;
                border-top: 1px solid #334155;
                border-bottom: 1px solid #334155;
            }
            .turno-item {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .turno-label {
                font-size: 0.75rem;
                color: #64748b;
            }
            .turno-pos {
                font-size: 0.9rem;
                font-weight: 700;
                color: #fff;
                background: rgba(59, 130, 246, 0.2);
                padding: 2px 8px;
                border-radius: 4px;
            }
            .seu-footer {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid #334155;
                display: flex;
                justify-content: space-between;
                gap: 16px;
            }
            .card-seu-desempenho .seu-turnos + .seu-footer {
                border-top: none;
                padding-top: 0;
            }
            .seu-footer.lider {
                justify-content: center;
            }
            .lider-badge {
                background: linear-gradient(135deg, #ffd700, #ffaa00);
                color: #1a1a1a;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 700;
            }
            .seu-diff {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .diff-label {
                font-size: 0.65rem;
                color: #64748b;
            }
            .diff-valor {
                font-size: 0.85rem;
                font-weight: 600;
                color: #94a3b8;
            }
            .diff-valor.negativo {
                color: #ef4444;
            }

            /* Tabs de Turno */
            .ranking-turno-tabs {
                display: flex;
                gap: 8px;
                margin: 0 auto 16px;
                padding: 4px;
                background: #2a2a2a;
                border-radius: 8px;
                width: fit-content;
            }
            .ranking-turno-tab {
                padding: 10px 20px;
                border: none;
                background: transparent;
                color: #888;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            .ranking-turno-tab:hover {
                background: #333;
                color: #fff;
            }
            .ranking-turno-tab.active {
                background: #ff5c00;
                color: #fff;
            }
            .ranking-info-turno {
                text-align: center;
                margin-bottom: 12px;
                font-size: 0.85em;
                color: #888;
            }
            /* Estilos para participantes inativos */
            .participante-inativo {
                filter: grayscale(100%);
                opacity: 0.6;
                font-size: 0.85em !important;
                background: linear-gradient(to right, #2a2a2a, #1a1a1a) !important;
                border-left: 3px solid #555 !important;
            }
            .participante-inativo td {
                color: #888 !important;
                font-weight: 400 !important;
            }
            .participante-inativo .pontos-valor {
                color: #666 !important;
                text-decoration: line-through;
                font-weight: 400 !important;
            }
            .badge-inativo {
                display: inline-block;
                background: #444;
                color: #999;
                font-size: 0.65em;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 6px;
                vertical-align: middle;
                font-weight: 500;
                letter-spacing: 0.5px;
            }
            .separador-inativos {
                background: #333 !important;
                border-top: 2px dashed #555;
            }
            .separador-inativos td {
                padding: 8px !important;
                text-align: center !important;
                color: #777 !important;
                font-size: 0.8em !important;
                font-style: italic;
            }
            .posicao-inativo {
                color: #555 !important;
                font-style: italic;
            }
            .spinner {
                width: 24px;
                height: 24px;
                border: 3px solid rgba(255, 92, 0, 0.2);
                border-top-color: #ff5c00;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* ✅ Destaque visual na linha do participante logado */
            .minha-linha {
                background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent) !important;
                border-left: 3px solid #3b82f6 !important;
            }
            .minha-linha td {
                font-weight: 600 !important;
            }
        </style>
        <div style="max-width: 700px; margin: 0 auto;">
            <div style="text-align: center;">
                <h2 style="margin-bottom: 2px; font-size: 2rem;"><span class="material-icons" style="font-size:2rem; vertical-align:middle; color:#ffd700;">emoji_events</span> Sistema de Classificação</h2>
                <div style="font-size: 1rem; color: #888; margin-bottom: 18px; font-weight: 400;">
                    pontuação acumulada até a ${ultimaRodada}ª rodada
                </div>
            </div>

            <!-- TABS DE TURNO -->
            <div class="ranking-turno-tabs">
                <button class="ranking-turno-tab ${turno === "1" ? "active" : ""}" data-turno="1">1º Turno</button>
                <button class="ranking-turno-tab ${turno === "2" ? "active" : ""}" data-turno="2">2º Turno</button>
                <button class="ranking-turno-tab ${turno === "geral" ? "active" : ""}" data-turno="geral">Geral</button>
            </div>

            <!-- INFO DO TURNO -->
            <div class="ranking-info-turno">
                ${turnoLabel} (Rodadas ${rodadaInicio}-${rodadaFim}) ${statusLabel}
            </div>

            <!-- ✅ NOVO: CARD DO LÍDER -->
            ${cardLiderHTML}

            <!-- ✅ NOVO: CARD SEU DESEMPENHO (se logado como participante) -->
            ${cardSeuDesempenhoHTML}

            <table id="rankingGeralTable" class="ranking-table">
                <thead>
                    <tr>
                        <th style="width: 36px; text-align: center">Pos</th>
                        <th style="width: 40px; text-align: center"><span class="material-icons" style="font-size:16px; color:#e74c3c;">favorite</span></th>
                        <th style="min-width: 180px; text-align: left">Cartoleiro</th>
                        <th style="min-width: 110px; text-align: left">Time</th>
                        <th style="width: 80px; text-align: center">Pontos</th>
                    </tr>
                </thead>
                <tbody id="rankingGeralTableBody">
                    ${participantes
                        .map((participante, index) =>
                            criarLinhaParticipante(
                                participante,
                                index,
                                ligaId,
                                totalAtivos,
                                participanteLogado,
                            ),
                        )
                        .join("")}
                </tbody>
            </table>
            ${
                temInativos
                    ? `
                <div style="text-align: center; margin-top: 12px; padding: 8px; background: #1a1a1a; border-radius: 6px;">
                    <span style="color: #666; font-size: 0.8em;">
                        <span class="material-icons" style="font-size:14px; vertical-align:middle;">pause_circle</span> Participantes inativos exibidos ao final com pontuação congelada
                    </span>
                </div>
            `
                    : ""
            }
        </div>
    `;
}

// ==============================
// CRIAR LINHA DE PARTICIPANTE
// ==============================
function criarLinhaParticipante(
    participante,
    index,
    ligaId,
    totalAtivos,
    participanteLogado = null,
) {
    const estaInativo = participante.ativo === false;
    const ePrimeiroInativo = estaInativo && index === totalAtivos;
    const posicaoReal = estaInativo ? "-" : index + 1;

    // ✅ NOVO: Verificar se é a linha do participante logado
    const timeIdLogado = participanteLogado
        ? String(participanteLogado.time_id)
        : null;
    const ehMinhaLinha =
        timeIdLogado && String(participante.time_id) === timeIdLogado;

    const classeInativo = estaInativo ? "participante-inativo" : "";
    const classeCSS = estaInativo ? "" : obterClassePosicao(index);
    const classeMinha = ehMinhaLinha ? "minha-linha" : "";
    const estiloEspecial = estaInativo
        ? ""
        : obterEstiloEspecial(index, totalAtivos);

    const labelPosicao = estaInativo
        ? `<span class="posicao-inativo">—</span>`
        : obterLabelPosicao(index, ligaId);

    const badgeInativo = estaInativo
        ? `<span class="badge-inativo">INATIVO R${participante.rodada_desistencia || "?"}</span>`
        : "";

    const separador = ePrimeiroInativo
        ? `<tr class="separador-inativos">
               <td colspan="5"><span class="material-icons" style="font-size:14px; vertical-align:middle;">pause_circle</span> Participantes que desistiram da competição</td>
           </tr>`
        : "";

    return `
        ${separador}
        <tr class="${classeCSS} ${classeInativo} ${classeMinha}" style="${estiloEspecial}">
            <td style="text-align:center; padding:8px 2px;">
                ${labelPosicao}
            </td>
            <td style="text-align:center;">
                ${
                    participante.clube_id
                        ? `<img src="/escudos/${participante.clube_id}.png" 
                       alt="Time do Coração" 
                       style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;"
                       onerror="this.style.display='none'"/>`
                        : '<span class="material-icons" style="font-size:18px; color:#e74c3c;">favorite</span>'
                }
            </td>
            <td style="text-align:left; padding:8px 4px;">
                ${participante.nome_cartola || "N/D"}${badgeInativo}${ehMinhaLinha ? ' <span style="color:#3b82f6; font-size:0.7em; display:inline-flex; align-items:center;"><span class="material-icons" style="font-size:14px;">person</span> VOCÊ</span>' : ""}
            </td>
            <td style="text-align:left; padding:8px 4px;">
                ${participante.nome_time || "N/D"}
            </td>
            <td style="text-align:center; padding:8px 2px;">
                <span class="pontos-valor" style="font-weight:${estaInativo ? "400" : "600"};">
                    ${participante.pontos.toFixed(2)}
                </span>
            </td>
        </tr>
    `;
}

// ==============================
// FUNÇÕES AUXILIARES
// ==============================
function obterClassePosicao(index) {
    switch (index) {
        case 0:
            return "ranking-primeiro";
        case 1:
            return "ranking-segundo";
        case 2:
            return "ranking-terceiro";
        default:
            return "";
    }
}

function obterLabelPosicao(index, ligaId) {
    const isLigaSobral = ligaId === "684d821cf1a7ae16d1f89572";

    switch (index) {
        case 0:
            return `<span class="trofeu-ouro" title="Campeão"><span class="material-icons" style="color:#ffd700;">emoji_events</span></span>`;
        case 1:
            return `<span class="trofeu-prata" title="Vice-Campeão"><span class="material-icons" style="color:#c0c0c0;">military_tech</span></span>`;
        case 2:
            return isLigaSobral
                ? `${index + 1}º`
                : `<span class="trofeu-bronze" title="Terceiro Lugar"><span class="material-icons" style="color:#cd7f32;">military_tech</span></span>`;
        default:
            return `${index + 1}º`;
    }
}

function obterEstiloEspecial(index, totalAtivos) {
    const ultimoAtivo = totalAtivos - 1;
    if (index === ultimoAtivo && totalAtivos >= 10) {
        return "background:#8b0000;color:#fff;font-weight:bold;border-radius:4px;";
    }
    return "";
}

// ==============================
// FUNÇÃO PARA RESETAR SISTEMA
// ==============================
function resetarSistemaRanking() {
    console.log("[RANKING] 🔄 Resetando sistema de proteção...");
    rankingProcessando = false;
    ultimoProcessamento = 0;
    estadoRankingAdmin.turnoAtivo = "geral";
    console.log("[RANKING] ✅ Sistema resetado");
}

// ==============================
// EXPORTS E FUNÇÕES GLOBAIS
// ==============================
export { carregarRankingGeral, resetarSistemaRanking };

window.resetarSistemaRanking = resetarSistemaRanking;
window.carregarRankingGeral = carregarRankingGeral;
window.criarTabelaRanking = criarTabelaRanking;

if (!window.modulosCarregados) {
    window.modulosCarregados = {};
}

window.modulosCarregados.ranking = {
    carregarRankingGeral: carregarRankingGeral,
};

console.log(
    "✅ [RANKING] Módulo v2.2 carregado com destaque do líder + Seu Desempenho + Posições por turno",
);
