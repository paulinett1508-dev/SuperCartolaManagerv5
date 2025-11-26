// 🔧 RANKING.JS CORRIGIDO - SEM LOOP INFINITO
// Versão otimizada e segura do sistema de ranking

// 🛡️ SISTEMA DE PROTEÇÃO CONTRA LOOP
let rankingProcessando = false;
let ultimoProcessamento = 0;
const INTERVALO_MINIMO_PROCESSAMENTO = 3000; // 3 segundos

// ==============================
// FUNÇÃO PRINCIPAL DE RANKING (OTIMIZADA)
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
        rankingProcessando = false; // Liberar se container inválido
        return;
    }

    // 📝 LOGS SEGUROS (sem palavras-chave que disparam interceptação)
    const logSeguro = (mensagem) => {
        console.log(`[RANKING-SEGURO] ${mensagem}`);
    };

    rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">⚙️ Processando dados do sistema...</div>`;

    try {
        logSeguro("Iniciando processamento do sistema");

        // 1. Buscar rodada atual de forma segura
        let rodada_atual = 1;
        try {
            const resMercado = await fetch("/api/cartola/mercado/status");
            if (resMercado.ok) {
                const dados = await resMercado.json();
                rodada_atual = dados.rodada_atual || 1;
            }
        } catch (err) {
            logSeguro("Usando rodada padrão devido a erro na API");
        }

        const ultimaRodadaCompleta = Math.max(1, rodada_atual - 1);

        if (ultimaRodadaCompleta < 1) {
            rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">📊 Aguardando primeira rodada completa para gerar dados.</div>`;
            return;
        }

        // 2. **IMPORTAÇÃO DINÂMICA PARA EVITAR DEPENDÊNCIA CIRCULAR**
        let getRankingRodadaEspecifica;
        try {
            const rodadasModule = await import("./rodadas.js");
            getRankingRodadaEspecifica =
                rodadasModule.getRankingRodadaEspecifica;
        } catch (error) {
            logSeguro("Erro ao importar módulo de rodadas: " + error.message);
            throw new Error("Módulo de rodadas não disponível");
        }

        // 3. Processar dados de forma eficiente
        const pontuacaoTotal = {};
        const todosTimesInfo = {};
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        if (!ligaId) {
            throw new Error("ID da liga não encontrado na URL");
        }

        logSeguro(
            `Processando ${ultimaRodadaCompleta} rodadas para liga ${ligaId}`,
        );

        // 4. Loop otimizado com controle de erro
        for (let r = 1; r <= ultimaRodadaCompleta; r++) {
            try {
                // 📊 LOG SEGURO (sem palavras que disparam interceptação)
                logSeguro(
                    `Processando dados da etapa ${r} de ${ultimaRodadaCompleta}`,
                );

                const dadosDaRodada = await getRankingRodadaEspecifica(
                    ligaId,
                    r,
                );

                if (Array.isArray(dadosDaRodada) && dadosDaRodada.length > 0) {
                    logSeguro(
                        `Etapa ${r}: ${dadosDaRodada.length} participantes processados`,
                    );

                    dadosDaRodada.forEach((participante) => {
                        const id = String(participante.timeId);
                        if (!id) return;

                        if (!pontuacaoTotal[id]) {
                            pontuacaoTotal[id] = 0;
                            todosTimesInfo[id] = {
                                time_id: id,
                                nome_cartola:
                                    participante.nome_cartola ||
                                    participante.nome_cartoleiro ||
                                    "N/D",
                                nome_time:
                                    participante.nome_time ||
                                    participante.nome ||
                                    "N/D",
                                clube_id: participante.clube_id || null,
                            };
                        }

                        pontuacaoTotal[id] += parseFloat(
                            participante.pontos || 0,
                        );

                        // Atualizar informações com dados mais recentes
                        todosTimesInfo[id].nome_cartola =
                            participante.nome_cartola ||
                            participante.nome_cartoleiro ||
                            todosTimesInfo[id].nome_cartola;
                        todosTimesInfo[id].nome_time =
                            participante.nome_time ||
                            participante.nome ||
                            todosTimesInfo[id].nome_time;
                        todosTimesInfo[id].clube_id =
                            participante.clube_id ||
                            todosTimesInfo[id].clube_id;
                    });
                } else {
                    logSeguro(
                        `Etapa ${r}: dados inválidos ou vazios recebidos`,
                    );
                }
            } catch (errorRodada) {
                logSeguro(`Erro na etapa ${r}: ${errorRodada.message}`);
                // Continuar processamento mesmo com erro em uma rodada
            }
        }

        // 5. Criar array final ordenado
        const participantesOrdenados = Object.keys(pontuacaoTotal)
            .map((id) => ({
                ...todosTimesInfo[id],
                pontos: pontuacaoTotal[id],
            }))
            .sort((a, b) => b.pontos - a.pontos);

        logSeguro(
            `Sistema processado: ${participantesOrdenados.length} participantes no total`,
        );

        // 6. Armazenar dados globalmente (para debug e outros usos)
        window.rankingData = participantesOrdenados;
        window.rankingGeral = participantesOrdenados;
        window.ultimoRanking = participantesOrdenados;

        // 7. Gerar HTML da tabela
        const tabelaHTML = criarTabelaRanking(
            participantesOrdenados,
            ultimaRodadaCompleta,
            ligaId,
        );
        rankingContainer.innerHTML = tabelaHTML;

        logSeguro("✅ Processamento concluído com sucesso");
    } catch (error) {
        console.error("[RANKING] ❌ Erro no processamento:", error);
        rankingContainer.innerHTML = `
            <div class="error-message" style="text-align:center; padding:40px; color:#ff4444;">
                <h4>⚠️ Erro ao processar dados</h4>
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
        logSeguro("Processamento finalizado, sistema liberado");
    }
}

// ==============================
// FUNÇÃO PARA CRIAR HTML DA TABELA
// ==============================
function criarTabelaRanking(participantes, ultimaRodada, ligaId) {
    return `
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
                            criarLinhaParticipante(participante, index, ligaId),
                        )
                        .join("")}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================
// FUNÇÃO PARA CRIAR LINHA DE PARTICIPANTE
// ==============================
function criarLinhaParticipante(participante, index, ligaId) {
    const posicao = index + 1;
    const classeCSS = obterClassePosicao(index);
    const labelPosicao = obterLabelPosicao(index, ligaId);
    const estiloEspecial = obterEstiloEspecial(index);

    return `
        <tr class="${classeCSS}" style="${estiloEspecial}">
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
                ${participante.nome_cartola || "N/D"}
            </td>
            <td style="text-align:left; padding:8px 4px;">
                ${participante.nome_time || "N/D"}
            </td>
            <td style="text-align:center; padding:8px 2px;">
                <span style="font-weight:600;">
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

function obterEstiloEspecial(index) {
    // Estilo especial para último lugar (se aplicável)
    if (index === 31) {
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
window.criarTabelaRanking = criarTabelaRanking;  // ← LINHA CRÍTICA QUE FALTAVA
window.resetarSistemaRanking = resetarSistemaRanking;

// Garantir que módulos carregados tenha a função
if (!window.modulosCarregados) {
    window.modulosCarregados = {};
}

window.modulosCarregados.ranking = {
    carregarRankingGeral: carregarRankingGeral
};

console.log("✅ [RANKING] Módulo carregado e funções expostas globalmente");
