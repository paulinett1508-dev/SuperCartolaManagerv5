// services/parciaisRankingService.js
// ✅ v1.0: Calcula ranking parcial em tempo real (rodada em andamento)
import axios from "axios";
import Liga from "../models/Liga.js";
import mongoose from "mongoose";

const LOG_PREFIX = "[PARCIAIS-RANKING-SERVICE]";
const CARTOLA_API_BASE = "https://api.cartola.globo.com";
const REQUEST_TIMEOUT = 10000;

// Headers padrão para API Cartola
const CARTOLA_HEADERS = {
    "User-Agent": "Super-Cartola-Manager/1.0.0",
    "Accept": "application/json",
};

/**
 * Busca status do mercado para verificar se rodada está em andamento
 */
async function buscarStatusMercado() {
    try {
        const response = await axios.get(`${CARTOLA_API_BASE}/mercado/status`, {
            timeout: REQUEST_TIMEOUT,
            headers: CARTOLA_HEADERS,
        });
        return response.data;
    } catch (error) {
        console.error(`${LOG_PREFIX} Erro ao buscar status mercado:`, error.message);
        return null;
    }
}

/**
 * Busca atletas pontuados da rodada atual
 */
async function buscarAtletasPontuados(rodada) {
    try {
        const response = await axios.get(`${CARTOLA_API_BASE}/atletas/pontuados/${rodada}`, {
            timeout: REQUEST_TIMEOUT,
            headers: {
                ...CARTOLA_HEADERS,
                "Cache-Control": "no-cache",
            },
        });
        return response.data?.atletas || {};
    } catch (error) {
        console.error(`${LOG_PREFIX} Erro ao buscar atletas pontuados:`, error.message);
        return {};
    }
}

/**
 * Busca escalação de um time em uma rodada específica
 */
async function buscarEscalacaoTime(timeId, rodada) {
    try {
        const response = await axios.get(`${CARTOLA_API_BASE}/time/id/${timeId}/${rodada}`, {
            timeout: REQUEST_TIMEOUT,
            headers: CARTOLA_HEADERS,
        });
        return response.data;
    } catch (error) {
        // Time pode não ter escalado ainda
        return null;
    }
}

/**
 * Calcula pontuação de um time baseado na escalação e atletas pontuados
 */
function calcularPontuacaoTime(escalacao, atletasPontuados) {
    if (!escalacao || !escalacao.atletas || escalacao.atletas.length === 0) {
        return { pontos: 0, calculado: false };
    }

    let pontosTotais = 0;
    const capitaoId = escalacao.capitao_id;

    // Processar atletas titulares (status != 2 = reserva)
    for (const atleta of escalacao.atletas) {
        const atletaId = atleta.atleta_id;
        const atletaPontuado = atletasPontuados[atletaId];

        if (atletaPontuado && atletaPontuado.entrou_em_campo) {
            let pontosAtleta = atletaPontuado.pontuacao || 0;

            // Capitão dobra os pontos
            if (atletaId === capitaoId) {
                pontosAtleta *= 2;
            }

            pontosTotais += pontosAtleta;
        }
    }

    return { pontos: pontosTotais, calculado: true };
}

/**
 * Busca ranking parcial de uma liga (rodada em andamento)
 * @param {string} ligaId - ID da liga
 * @returns {object|null} - Ranking parcial ou null se não disponível
 */
export async function buscarRankingParcial(ligaId) {
    console.log(`${LOG_PREFIX} Buscando ranking parcial para liga ${ligaId}`);

    try {
        // 1. Verificar status do mercado
        const statusMercado = await buscarStatusMercado();

        if (!statusMercado) {
            console.log(`${LOG_PREFIX} ⚠️ Não foi possível obter status do mercado`);
            return null;
        }

        const rodadaAtual = statusMercado.rodada_atual;
        const mercadoAberto = statusMercado.status_mercado === 1; // 1 = aberto, 2 = fechado

        console.log(`${LOG_PREFIX} Rodada: ${rodadaAtual}, Mercado: ${mercadoAberto ? 'ABERTO' : 'FECHADO'}`);

        // Se mercado aberto, não há parciais (rodada não iniciou)
        if (mercadoAberto) {
            console.log(`${LOG_PREFIX} ℹ️ Mercado aberto - sem parciais disponíveis`);
            return {
                disponivel: false,
                motivo: "mercado_aberto",
                rodada: rodadaAtual,
                message: "O mercado está aberto. Aguarde o início da rodada para ver as parciais.",
            };
        }

        // 2. Buscar atletas pontuados
        const atletasPontuados = await buscarAtletasPontuados(rodadaAtual);
        const numAtletasPontuados = Object.keys(atletasPontuados).length;

        console.log(`${LOG_PREFIX} Atletas pontuados: ${numAtletasPontuados}`);

        if (numAtletasPontuados === 0) {
            return {
                disponivel: false,
                motivo: "sem_pontuacao",
                rodada: rodadaAtual,
                message: "Aguardando os jogos começarem para computar os pontos.",
            };
        }

        // 3. Buscar liga e participantes
        const ligaObjectId = typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

        const liga = await Liga.findById(ligaObjectId).lean();

        if (!liga || !liga.participantes || liga.participantes.length === 0) {
            console.log(`${LOG_PREFIX} ⚠️ Liga não encontrada ou sem participantes`);
            return null;
        }

        const participantesAtivos = liga.participantes.filter(p => p.ativo !== false);
        console.log(`${LOG_PREFIX} Processando ${participantesAtivos.length} participantes ativos`);

        // 4. Buscar escalação e calcular pontos de cada time
        const resultados = [];

        // Processar em lotes para não sobrecarregar a API
        const BATCH_SIZE = 5;
        for (let i = 0; i < participantesAtivos.length; i += BATCH_SIZE) {
            const batch = participantesAtivos.slice(i, i + BATCH_SIZE);

            const promessas = batch.map(async (participante) => {
                const escalacao = await buscarEscalacaoTime(participante.time_id, rodadaAtual);
                const { pontos, calculado } = calcularPontuacaoTime(escalacao, atletasPontuados);

                return {
                    timeId: participante.time_id,
                    nome_time: escalacao?.time?.nome || participante.nome_time || "N/D",
                    nome_cartola: escalacao?.time?.nome_cartola || participante.nome_cartola || "N/D",
                    escudo: escalacao?.time?.url_escudo_png || participante.foto_time || "",
                    clube_id: escalacao?.time?.time_id || participante.clube_id,
                    pontos: parseFloat(pontos.toFixed(2)),
                    escalou: calculado,
                    ativo: participante.ativo !== false,
                };
            });

            const resultadosBatch = await Promise.all(promessas);
            resultados.push(...resultadosBatch);

            // Pequeno delay entre batches
            if (i + BATCH_SIZE < participantesAtivos.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // 5. Ordenar por pontos e atribuir posições
        resultados.sort((a, b) => b.pontos - a.pontos);
        resultados.forEach((item, index) => {
            item.posicao = index + 1;
        });

        console.log(`${LOG_PREFIX} ✅ Ranking parcial calculado: ${resultados.length} times`);

        return {
            disponivel: true,
            rodada: rodadaAtual,
            status: "em_andamento",
            parcial: true,
            total_times: resultados.length,
            ranking: resultados,
            atualizado_em: new Date().toISOString(),
            message: `Parciais da Rodada ${rodadaAtual} (atualizado às ${new Date().toLocaleTimeString('pt-BR')})`,
        };

    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro ao buscar ranking parcial:`, error);
        return null;
    }
}

export default {
    buscarRankingParcial,
    buscarStatusMercado,
};
