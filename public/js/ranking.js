// 🔧 RANKING.JS CORRIGIDO - SEM LOOP INFINITO
// Versão otimizada e segura do sistema de ranking

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
        console.log("[RANKING] 🚀 Iniciando carregamento otimizado via API de cache");

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
        
        console.log(`[RANKING] ✅ Ranking recebido via cache: ${data.ranking.length} participantes`);
        console.log(`[RANKING] 📊 Rodada final: ${data.rodadaFinal}`);
        console.log(`[RANKING] 💾 Cache: ${data.cached ? 'HIT' : 'MISS (calculado)'}`);

        // 3. Converter formato da API para formato esperado
        const participantesOrdenados = data.ranking.map(p => ({
            time_id: p.timeId,
            nome_cartola: p.nome_cartola || "N/D",
            nome_time: p.nome_time || "N/D",
            clube_id: p.clube_id || null,
            pontos: p.pontos_totais,
            rodadas_jogadas: p.rodadas_jogadas,
            posicao: p.posicao
        }));

        // 4. Armazenar dados globalmente
        window.rankingData = participantesOrdenados;
        window.rankingGeral = participantesOrdenados;
        window.ultimoRanking = participantesOrdenados;

        // 5. Gerar HTML da tabela
        const tabelaHTML = criarTabelaRanking(
            participantesOrdenados,
            data.rodadaFinal,
            ligaId,
        );
        rankingContainer.innerHTML = tabelaHTML;

        console.log("[RANKING] ✅ Classificação renderizada com sucesso");

        // 📸 ADICIONAR BOTÃO DE EXPORTAÇÃO
        try {
            const { criarBotaoExportacaoRankingGeral } = await import('./exports/export-ranking-geral.js');
            
            await criarBotaoExportacaoRankingGeral({
                containerId: 'ranking-geral',
                rankings: participantesOrdenados,
                rodada: data.rodadaFinal,
                tipo: 'geral'
            });
            
            console.log("[RANKING] 📸 Botão de exportação Mobile HD adicionado");
        } catch (exportError) {
            console.warn("[RANKING] ⚠️ Erro ao adicionar exportação:", exportError);
        }

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