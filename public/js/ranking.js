// 🔧 RANKING.JS - v2.6 COM MATERIAL ICONS FORÇADO
// v2.6: Mensagem contextualizada para pré-temporada (azul + ícone calendário)
// v2.5: Multi-Temporada - tela de pré-temporada quando não há dados
// v2.4: Refatorado para SaaS - usa totalParticipantes em vez de liga ID hardcoded
// Visual diferenciado para inativos + filtros 1º/2º turno/Geral
// ✅ NOVO: Card destaque do líder + Card "Seu Desempenho" + Posições por turno
// ✅ FIX: Material Icons via FontFace API

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
// FUNÇÃO PARA TRUNCAR PONTOS (2 casas decimais, sem arredondamento)
// Ex: 105.456 → "105,45" (não "105,46")
// ==============================
function truncarPontos(valor) {
    const num = parseFloat(valor) || 0;
    const truncado = Math.trunc(num * 100) / 100;
    return truncado.toFixed(2);
}

// ==============================
// CARREGAR MATERIAL ICONS (FORÇADO VIA FONTFACE API)
// ==============================
(async function () {
    // 1. Adicionar preconnect para acelerar
    if (
        !document.querySelector(
            'link[href*="fonts.gstatic.com"][rel="preconnect"]',
        )
    ) {
        const preconnect = document.createElement("link");
        preconnect.rel = "preconnect";
        preconnect.href = "https://fonts.gstatic.com";
        preconnect.crossOrigin = "anonymous";
        document.head.insertBefore(preconnect, document.head.firstChild);
    }

    // 2. Adicionar link do Google Fonts
    if (
        !document.querySelector(
            'link[href*="fonts.googleapis.com"][href*="Material"]',
        )
    ) {
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
        link.rel = "stylesheet";
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
        console.log("[RANKING] Material Icons link adicionado");
    }

    // 3. CSS de estilo obrigatório
    if (!document.getElementById("material-icons-css-ranking")) {
        const style = document.createElement("style");
        style.id = "material-icons-css-ranking";
        style.textContent = `
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

    // 4. Forçar carregamento via FontFace API
    try {
        if (document.fonts && document.fonts.load) {
            await document.fonts.load("24px Material Icons");
            console.log(
                "[RANKING] ✅ Material Icons carregado via FontFace API",
            );
        }
    } catch (e) {
        console.warn("[RANKING] FontFace API não disponível, usando fallback");

        // 5. Fallback: @font-face direto
        if (!document.getElementById("material-icons-fontface")) {
            const fontStyle = document.createElement("style");
            fontStyle.id = "material-icons-fontface";
            fontStyle.textContent = `
                @font-face {
                    font-family: 'Material Icons';
                    font-style: normal;
                    font-weight: 400;
                    font-display: block;
                    src: url(https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
                }
            `;
            document.head.insertBefore(fontStyle, document.head.firstChild);
        }
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

    // Multi-Temporada: usar contexto global
    const temporada = window.temporadaAtual || new Date().getFullYear();

    try {
        // Buscar 1º e 2º turno em paralelo (com temporada)
        const [resp1, resp2] = await Promise.all([
            fetch(`/api/ranking-turno/${ligaId}?turno=1&temporada=${temporada}`),
            fetch(`/api/ranking-turno/${ligaId}?turno=2&temporada=${temporada}`),
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
        // Multi-Temporada: usar contexto global ou parâmetro da URL
        const temporada = window.temporadaAtual || urlParams.get("temporada") || new Date().getFullYear();

        if (!ligaId) {
            throw new Error("ID da liga não encontrado na URL");
        }

        estadoRankingAdmin.ligaId = ligaId;

        // Buscar ranking do turno via nova API (com temporada)
        const response = await fetch(
            `/api/ranking-turno/${ligaId}?turno=${turno}&temporada=${temporada}`,
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

        // 🔍 DEBUG: Log completo da resposta
        console.log(`[RANKING] 📡 Resposta da API:`, {
            success: data.success,
            status: data.status,
            turno: data.turno,
            ranking_length: data.ranking?.length || 0,
            message: data.message,
            parcial: data.parcial,
        });

        if (!data.success || !data.ranking) {
            // Pode ser pré-temporada ou dados ainda não consolidados
            console.log(`[RANKING] ⚠️ Sem dados - success: ${data.success}, ranking: ${!!data.ranking}`);
            mostrarSemDados(rankingContainer, temporada, data?.message, data?.status);
            return;
        }

        // Se ranking está vazio, mostrar estado sem dados
        if (data.ranking.length === 0) {
            console.log(`[RANKING] ℹ️ Ranking vazio - exibindo tela contextualizada`);
            mostrarSemDados(rankingContainer, temporada, data?.message, data?.status);
            return;
        }

        // ✅ v2.6: Detectar se são dados parciais (rodada em andamento)
        const isParcial = data.parcial === true || data.status === "parcial";

        console.log(
            `[RANKING] ✅ Ranking recebido: ${data.total_times} participantes ${isParcial ? '(PARCIAL)' : ''}`,
        );
        console.log(
            `[RANKING] 📊 Turno: ${data.turno} | Status: ${data.status}`,
        );
        console.log(
            `[RANKING] 📋 Rodadas: ${data.rodada_inicio}-${data.rodada_fim} (atual: ${data.rodada_atual})`,
        );

        // Guardar info de parcial no estado
        estadoRankingAdmin.isParcial = isParcial;
        estadoRankingAdmin.rodadaAtual = data.rodada_atual;
        estadoRankingAdmin.mensagemParcial = data.message;

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
            isParcial,
            data.message,
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
    // Multi-Temporada: verificar se é pré-temporada
    const temporada = window.temporadaAtual || new Date().getFullYear();

    try {
        const response = await fetch(`/api/ranking-cache/${ligaId}?temporada=${temporada}`);

        // Se 404, pode ser pré-temporada
        if (!response.ok) {
            if (response.status === 404) {
                mostrarPreTemporada(rankingContainer, temporada);
                return;
            }
            throw new Error(`Erro: ${response.status}`);
        }

        const data = await response.json();

        // Se não há ranking, mostrar estado sem dados
        if (!data.ranking || data.ranking.length === 0) {
            const motivo = data.message || "Dados ainda não consolidados";
            mostrarSemDados(rankingContainer, temporada, motivo);
            return;
        }

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
        // Em caso de erro, verificar se é pré-temporada
        mostrarPreTemporada(rankingContainer, temporada);
    } finally {
        rankingProcessando = false;
    }
}

// ==============================
// MOSTRAR TELA PRÉ-TEMPORADA
// ==============================
function mostrarPreTemporada(container, temporada) {
    console.log(`[RANKING] 📅 Pré-temporada ${temporada} - sem dados disponíveis`);

    container.innerHTML = `
        <div style="max-width: 500px; margin: 0 auto; text-align: center; padding: 40px 20px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);">
                <span class="material-icons" style="font-size: 40px; color: #fff;">schedule</span>
            </div>

            <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin: 0 0 8px;">Classificação indisponível</h2>
            <p style="font-size: 0.95rem; color: rgba(255, 255, 255, 0.6); margin: 0 0 24px;">Temporada ${temporada} • Pré-temporada</p>

            <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(255, 255, 255, 0.05); border-radius: 20px; font-size: 0.85rem; color: rgba(255, 255, 255, 0.8);">
                    <span class="material-icons" style="font-size: 18px; color: #3b82f6;">event</span>
                    <span>Pré-temporada</span>
                </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; border-left: 3px solid #3b82f6; text-align: left; margin-bottom: 24px;">
                <span class="material-icons" style="font-size: 20px; color: #3b82f6; flex-shrink: 0; margin-top: 2px;">info</span>
                <p style="margin: 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); line-height: 1.5;">
                    A classificação estará disponível quando as rodadas da temporada ${temporada} começarem e forem consolidadas.
                </p>
            </div>

            <button onclick="window.orquestrador?.voltarParaCards()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #ff5c00 0%, #ff8c00 100%); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(255, 92, 0, 0.3);">
                <span class="material-icons" style="font-size: 20px;">arrow_back</span>
                Voltar aos Módulos
            </button>
        </div>
    `;
}

// ==============================
// MOSTRAR ESTADO SEM DADOS
// ==============================
function mostrarSemDados(container, temporada, motivo, status) {
    console.log(`[RANKING] ℹ️ Sem dados - temporada ${temporada}, status: ${status}, motivo: ${motivo}`);

    // Detectar o tipo de estado baseado no status e motivo
    let titulo, icone, corGradient, corShadow, corBgBox, corBorderBox, detalhe;

    if (status === "mercado_aberto") {
        // Mercado aberto - rodada ainda não começou
        titulo = "Mercado Aberto";
        icone = "storefront";
        corGradient = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
        corShadow = "rgba(34, 197, 94, 0.3)";
        corBgBox = "rgba(34, 197, 94, 0.1)";
        corBorderBox = "rgba(34, 197, 94, 0.3)";
        detalhe = motivo || `O mercado está aberto. O Ranking será atualizado assim que a rodada iniciar e os primeiros pontos forem computados.`;
    } else if (status === "sem_pontuacao") {
        // Rodada começou mas jogos ainda não pontuaram
        titulo = "Aguardando Jogos";
        icone = "sports_soccer";
        corGradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        corShadow = "rgba(245, 158, 11, 0.3)";
        corBgBox = "rgba(245, 158, 11, 0.1)";
        corBorderBox = "rgba(245, 158, 11, 0.3)";
        detalhe = motivo || `A rodada está em andamento. Aguarde os primeiros jogos começarem para ver as pontuações.`;
    } else if (!motivo || motivo.includes("Nenhum dado") || status === "aguardando") {
        // Pré-temporada - nenhuma rodada ainda
        titulo = `Aguardando Temporada ${temporada}`;
        icone = "event_upcoming";
        corGradient = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
        corShadow = "rgba(59, 130, 246, 0.3)";
        corBgBox = "rgba(59, 130, 246, 0.1)";
        corBorderBox = "rgba(59, 130, 246, 0.3)";
        detalhe = `O Ranking Geral estará disponível assim que a <strong>Rodada 1</strong> do Brasileirão ${temporada} iniciar e os primeiros pontos forem computados.`;
    } else {
        // Outro erro ou estado desconhecido
        titulo = "Classificação indisponível";
        icone = "hourglass_empty";
        corGradient = "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)";
        corShadow = "rgba(107, 114, 128, 0.3)";
        corBgBox = "rgba(107, 114, 128, 0.1)";
        corBorderBox = "rgba(107, 114, 128, 0.3)";
        detalhe = motivo || "Aguarde os primeiros pontos serem computados para exibir a classificação.";
    }

    container.innerHTML = `
        <div style="max-width: 520px; margin: 0 auto; text-align: center; padding: 40px 20px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: ${corGradient}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px ${corShadow};">
                <span class="material-icons" style="font-size: 40px; color: #fff;">${icone}</span>
            </div>

            <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin: 0 0 8px;">${titulo}</h2>
            <p style="color: #cbd5f5; margin: 0 0 16px;">Temporada ${temporada}</p>
            <div style="background: ${corBgBox}; border: 1px solid ${corBorderBox}; border-radius: 12px; padding: 16px; color: #e2e8f0;">
                ${detalhe}
            </div>
            <div style="margin-top: 24px;">
                <button onclick="window.orquestrador?.voltarParaCards()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #ff5c00 0%, #ff8c00 100%); color: #fff; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(255, 92, 0, 0.3);">
                    <span class="material-icons" style="font-size: 20px;">arrow_back</span>
                    Voltar aos Módulos
                </button>
            </div>
        </div>
    `;
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
                <span class="lider-pontos-valor">${truncarPontos(lider.pontos)}</span>
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
                    <span class="seu-pontos-valor">${truncarPontos(meusDados.pontos)}</span>
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
                    <span class="diff-valor negativo">-${truncarPontos(diffLider)}</span>
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
    isParcial = false,
    mensagemParcial = "",
) {
    const temInativos = participantes.some((p) => p.ativo === false);
    const turnoLabel = turno === "geral" ? "Geral" : `${turno}º Turno`;

    // ✅ v2.6: Badge de status com suporte a parciais
    let statusLabel;
    if (isParcial || status === "parcial") {
        statusLabel = '<span style="color:#ef4444; font-size:0.8em; display:inline-flex; align-items:center; gap:4px; background:rgba(239,68,68,0.15); padding:4px 10px; border-radius:20px; animation:pulse 2s infinite;"><span class="material-icons" style="font-size:14px;">sensors</span> AO VIVO</span>';
    } else if (status === "consolidado") {
        statusLabel = '<span style="color:#22c55e; font-size:0.8em;"><span class="material-icons" style="font-size:14px; vertical-align:middle;">check_circle</span> Consolidado</span>';
    } else if (status === "em_andamento") {
        statusLabel = '<span style="color:#facc15; font-size:0.8em;"><span class="material-icons" style="font-size:14px; vertical-align:middle;">schedule</span> Em andamento</span>';
    } else {
        statusLabel = "";
    }

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

    // ✅ v2.6: Barra de info para parciais
    const infoParcialHTML = isParcial ? `
        <div style="background: linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <span class="material-icons" style="color: #ef4444; font-size: 20px; animation: pulse 2s infinite;">sensors</span>
            <div style="flex: 1;">
                <div style="color: #fff; font-weight: 600; font-size: 0.9rem;">Ranking Parcial - Rodada ${ultimaRodada}</div>
                <div style="color: #9ca3af; font-size: 0.8rem;">${mensagemParcial || 'Dados em tempo real. Posições podem mudar durante a rodada.'}</div>
            </div>
        </div>
    ` : '';

    return `
        <style>
            /* ✅ v2.6: Animação para badge AO VIVO */
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
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
            }
            .seu-footer {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #334155;
            }
            .seu-diff {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .diff-label {
                font-size: 0.75rem;
                color: #64748b;
            }
            .diff-valor {
                font-size: 0.9rem;
                font-weight: 600;
            }
            .diff-valor.negativo {
                color: #ef4444;
            }
            .seu-footer.lider {
                text-align: center;
            }
            .lider-badge {
                font-size: 0.8rem;
                color: #ffd700;
                font-weight: 600;
            }

            /* TABS DE TURNO */
            .ranking-turno-tabs {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 16px;
            }
            .ranking-turno-tab {
                padding: 8px 20px;
                border: 1px solid #333;
                background: #1a1a1a;
                color: #888;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s;
            }
            .ranking-turno-tab:hover {
                background: #252525;
                color: #fff;
            }
            .ranking-turno-tab.active {
                background: linear-gradient(135deg, #ff4500, #ff6b3d);
                border-color: #ff4500;
                color: #fff;
                font-weight: 600;
            }
            .ranking-info-turno {
                text-align: center;
                margin-bottom: 16px;
                font-size: 0.85rem;
                color: #888;
            }

            /* TABELA */
            .ranking-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.9rem;
            }
            .ranking-table thead th {
                padding: 10px 4px;
                background: #1a1a1a;
                border-bottom: 2px solid #333;
                color: #888;
                font-weight: 600;
                font-size: 0.75rem;
                text-transform: uppercase;
            }
            .ranking-table tbody tr {
                border-bottom: 1px solid #222;
                transition: background 0.2s;
            }
            .ranking-table tbody tr:hover {
                background: #1a1a1a;
            }

            /* POSIÇÕES ESPECIAIS */
            .ranking-primeiro {
                background: linear-gradient(90deg, rgba(255,215,0,0.15) 0%, transparent 100%);
            }
            .ranking-ultimo {
                background: linear-gradient(90deg, rgba(220,38,38,0.15) 0%, transparent 100%);
            }

            /* INATIVOS */
            .participante-inativo {
                opacity: 0.5;
                background: #0a0a0a !important;
            }
            .badge-inativo {
                font-size: 0.6rem;
                background: #dc2626;
                color: #fff;
                padding: 1px 4px;
                border-radius: 3px;
                margin-left: 6px;
                vertical-align: middle;
            }
            .posicao-inativo {
                color: #444;
                font-style: italic;
            }
            .separador-inativos {
                background: #1a1a1a !important;
            }
            .separador-inativos td {
                text-align: center;
                padding: 8px;
                color: #666;
                font-size: 0.75rem;
                font-style: italic;
            }

            /* MINHA LINHA */
            .minha-linha {
                background: linear-gradient(90deg, rgba(59,130,246,0.2) 0%, transparent 100%) !important;
                border-left: 3px solid #3b82f6;
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

            <!-- ✅ v2.6: INFO PARCIAIS (se rodada em andamento) -->
            ${infoParcialHTML}

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
    const classeCSS = estaInativo ? "" : obterClassePosicao(index, totalAtivos);
    const classeMinha = ehMinhaLinha ? "minha-linha" : "";
    const estiloEspecial = estaInativo
        ? ""
        : obterEstiloEspecial(index, totalAtivos);

    const labelPosicao = estaInativo
        ? `<span class="posicao-inativo">—</span>`
        : obterLabelPosicao(index, ligaId, totalAtivos);

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
                    ${truncarPontos(participante.pontos)}
                </span>
            </td>
        </tr>
    `;
}

// ==============================
// FUNÇÕES AUXILIARES
// ==============================
function obterClassePosicao(index, totalAtivos) {
    // Último colocado ativo = destaque vermelho
    if (totalAtivos > 1 && index === totalAtivos - 1) return "ranking-ultimo";
    switch (index) {
        case 0:
            return "ranking-primeiro";
        default:
            if (index >= 1 && index <= 9) return "ranking-top10";
            return "";
    }
}

// v2.4: Usar config dinamica em vez de ID hardcoded
async function obterConfigLiga(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
        if (response.ok) {
            const config = await response.json();
            return config;
        }
    } catch (e) {
        console.warn('[RANKING] Erro ao buscar config:', e.message);
    }
    return null;
}

function obterLabelPosicao(index, ligaId, totalParticipantes = 32) {
    switch (index) {
        case 0:
            return `<span class="trofeu-ouro" title="Campeão"><span class="material-icons" style="color:#ffd700;">emoji_events</span></span>`;
        default:
            return `${index + 1}º`;
    }
}

function obterEstiloEspecial(index, totalAtivos) {
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
    "✅ [RANKING] Módulo v2.6 carregado - Mensagem pré-temporada contextualizada",
);
