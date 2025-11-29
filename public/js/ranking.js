// 🔧 RANKING.JS - COM SUPORTE A PARTICIPANTES INATIVOS
// Visual diferenciado para inativos + pontuação congelada na rodada de saída

// 🛡️ SISTEMA DE PROTEÇÃO CONTRA LOOP
let rankingProcessando = false;
let ultimoProcessamento = 0;
const INTERVALO_MINIMO_PROCESSAMENTO = 3000; // 3 segundos

// ==============================
// FUNÇÃO PRINCIPAL DE RANKING (OTIMIZADA COM CACHE)
// ==============================
async function carregarRankingGeral() {
    // 🛡️ PROTEÇÃO CONTRA MÚLTIPLAS EXECUÇÕES
    const agora = Date.now();
    if (rankingProcessando) {
        console.log("[RANKING] ⏳ Já está processando, ignorando nova chamada");
        return;
    }

    if (agora - ultimoProcessamento < INTERVALO_MINIMO_PROCESSAMENTO) {
        console.log("[RANKING] ⏱️ Intervalo mínimo não atingido");
        return;
    }

    // 🔒 MARCAR COMO PROCESSANDO
    rankingProcessando = true;
    ultimoProcessamento = agora;

    const rankingContainer = document.getElementById("ranking-geral");
    if (!rankingContainer || !rankingContainer.classList.contains("active")) {
        rankingProcessando = false;
        return;
    }

    rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">⚙️ Carregando classificação geral...</div>`;

    try {
        console.log(
            "[RANKING] 🚀 Iniciando carregamento otimizado via API de cache",
        );

        // 1. Obter ID da liga
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        if (!ligaId) {
            throw new Error("ID da liga não encontrado na URL");
        }

        // 2. Buscar ranking consolidado da API de cache (1 requisição)
        const response = await fetch(`/api/ranking-cache/${ligaId}`);

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        console.log(
            `[RANKING] ✅ Ranking recebido via cache: ${data.ranking.length} participantes`,
        );
        console.log(`[RANKING] 📊 Rodada final: ${data.rodadaFinal}`);
        console.log(
            `[RANKING] 💾 Cache: ${data.cached ? "HIT" : "MISS (calculado)"}`,
        );

        // 3. Buscar status de inatividade de todos os participantes
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

        // 4. Converter formato da API para formato esperado + adicionar status
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
                pontos: p.pontos_totais,
                rodadas_jogadas: p.rodadas_jogadas,
                posicao: p.posicao,
                // ✅ NOVO: Dados de inatividade
                ativo: status.ativo,
                rodada_desistencia: status.rodada_desistencia,
            };
        });

        // 5. Separar ativos e inativos para ordenação especial
        const ativos = participantesOrdenados.filter((p) => p.ativo !== false);
        const inativos = participantesOrdenados.filter(
            (p) => p.ativo === false,
        );

        // Ordenar ativos por pontos (decrescente)
        ativos.sort((a, b) => b.pontos - a.pontos);

        // Ordenar inativos por rodada de desistência (mais recente primeiro)
        inativos.sort(
            (a, b) => (b.rodada_desistencia || 0) - (a.rodada_desistencia || 0),
        );

        // Combinar: ativos primeiro, depois inativos
        const participantesFinais = [...ativos, ...inativos];

        // 6. Armazenar dados globalmente
        window.rankingData = participantesFinais;
        window.rankingGeral = participantesFinais;
        window.ultimoRanking = participantesFinais;

        // 7. Gerar HTML da tabela
        const tabelaHTML = criarTabelaRanking(
            participantesFinais,
            data.rodadaFinal,
            ligaId,
            ativos.length, // Passar quantidade de ativos para posicionamento correto
        );
        rankingContainer.innerHTML = tabelaHTML;

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
        // 🔓 SEMPRE LIBERAR O PROCESSAMENTO
        rankingProcessando = false;
        console.log("[RANKING] Processamento finalizado");
    }
}

// ==============================
// FUNÇÃO PARA CRIAR HTML DA TABELA
// ==============================
function criarTabelaRanking(participantes, ultimaRodada, ligaId, totalAtivos) {
    const temInativos = participantes.some((p) => p.ativo === false);

    return `
        <style>
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
        </style>
        <div style="max-width: 700px; margin: 0 auto;">
            <div style="text-align: center;">
                <h2 style="margin-bottom: 2px; font-size: 2rem;">🏆 Sistema de Classificação</h2>
                <div style="font-size: 1rem; color: #888; margin-bottom: 18px; font-weight: 400;">
                    pontuação acumulada até a ${ultimaRodada}ª rodada
                </div>
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
                <tbody>
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
// FUNÇÃO PARA CRIAR LINHA DE PARTICIPANTE
// ==============================
function criarLinhaParticipante(participante, index, ligaId, totalAtivos) {
    const estaInativo = participante.ativo === false;

    // Se é inativo, verificar se é o primeiro inativo (para separador)
    const ePrimeiroInativo = estaInativo && index === totalAtivos;

    // Posição real (apenas entre ativos)
    const posicaoReal = estaInativo ? "-" : index + 1;

    // Classes CSS
    const classeInativo = estaInativo ? "participante-inativo" : "";
    const classeCSS = estaInativo ? "" : obterClassePosicao(index);
    const estiloEspecial = estaInativo
        ? ""
        : obterEstiloEspecial(index, totalAtivos);

    // Label da posição
    const labelPosicao = estaInativo
        ? `<span class="posicao-inativo">—</span>`
        : obterLabelPosicao(index, ligaId);

    // Badge de inativo
    const badgeInativo = estaInativo
        ? `<span class="badge-inativo">INATIVO R${participante.rodada_desistencia || "?"}</span>`
        : "";

    // Separador antes dos inativos
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
    // Estilo especial para último lugar ativo
    const ultimoAtivo = totalAtivos - 1;
    if (index === ultimoAtivo && totalAtivos >= 10) {
        return "background:#8b0000;color:#fff;font-weight:bold;border-radius:4px;";
    }
    return "";
}

// ==============================
// FUNÇÃO PARA RESETAR SISTEMA (DEBUG)
// ==============================
function resetarSistemaRanking() {
    console.log("[RANKING] 🔄 Resetando sistema de proteção...");
    rankingProcessando = false;
    ultimoProcessamento = 0;
    console.log("[RANKING] ✅ Sistema resetado");
}

// ==============================
// EXPORTS E FUNÇÕES GLOBAIS
// ==============================
export { carregarRankingGeral, resetarSistemaRanking };

// 🔧 DISPONIBILIZAR FUNÇÃO DE RESET GLOBALMENTE
window.resetarSistemaRanking = resetarSistemaRanking;

// ==============================
// EXPOR FUNÇÕES GLOBALMENTE
// ==============================
window.carregarRankingGeral = carregarRankingGeral;
window.criarTabelaRanking = criarTabelaRanking;
window.resetarSistemaRanking = resetarSistemaRanking;

// Garantir que módulos carregados tenha a função
if (!window.modulosCarregados) {
    window.modulosCarregados = {};
}

window.modulosCarregados.ranking = {
    carregarRankingGeral: carregarRankingGeral,
};

console.log(
    "✅ [RANKING] Módulo carregado com suporte a participantes inativos",
);
