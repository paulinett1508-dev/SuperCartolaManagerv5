// 🔧 RANKING.JS - v2.0 COM FILTROS DE TURNO
// Visual diferenciado para inativos + filtros 1º/2º turno/Geral

// 🛡️ SISTEMA DE PROTEÇÃO CONTRA LOOP
let rankingProcessando = false;
let ultimoProcessamento = 0;
const INTERVALO_MINIMO_PROCESSAMENTO = 3000;

// 🎯 ESTADO DO MÓDULO
let estadoRankingAdmin = {
    ligaId: null,
    turnoAtivo: "geral",
    dadosOriginais: null,
};

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
        rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">⚙️ Carregando classificação...</div>`;
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
                <h4>⚠️ Erro ao carregar classificação</h4>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" 
                        style="background:#ff4500; color:white; border:none; padding:10px 20px; 
                               border-radius:5px; cursor:pointer; margin-top:10px;">
                    🔄 Recarregar Página
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
            ? '<span style="color:#22c55e; font-size:0.8em;">✅ Consolidado</span>'
            : status === "em_andamento"
              ? '<span style="color:#facc15; font-size:0.8em;">⏳ Em andamento</span>'
              : "";

    return `
        <style>
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
        </style>
        <div style="max-width: 700px; margin: 0 auto;">
            <div style="text-align: center;">
                <h2 style="margin-bottom: 2px; font-size: 2rem;">🏆 Sistema de Classificação</h2>
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

            <table id="rankingGeralTable" class="ranking-table">
                <thead>
                    <tr>
                        <th style="width: 36px; text-align: center">Pos</th>
                        <th style="width: 40px; text-align: center">❤️</th>
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
                        ⏸️ Participantes inativos exibidos ao final com pontuação congelada
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
function criarLinhaParticipante(participante, index, ligaId, totalAtivos) {
    const estaInativo = participante.ativo === false;
    const ePrimeiroInativo = estaInativo && index === totalAtivos;
    const posicaoReal = estaInativo ? "-" : index + 1;

    const classeInativo = estaInativo ? "participante-inativo" : "";
    const classeCSS = estaInativo ? "" : obterClassePosicao(index);
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
               <td colspan="5">⏸️ Participantes que desistiram da competição</td>
           </tr>`
        : "";

    return `
        ${separador}
        <tr class="${classeCSS} ${classeInativo}" style="${estiloEspecial}">
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
                        : "❤"
                }
            </td>
            <td style="text-align:left; padding:8px 4px;">
                ${participante.nome_cartola || "N/D"}${badgeInativo}
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
            return `<span class="trofeu-ouro" title="Campeão">🏆</span>`;
        case 1:
            return `<span class="trofeu-prata" title="Vice-Campeão">🥈</span>`;
        case 2:
            return isLigaSobral
                ? `${index + 1}º`
                : `<span class="trofeu-bronze" title="Terceiro Lugar">🥉</span>`;
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

console.log("✅ [RANKING] Módulo v2.0 carregado com filtros de turno");
