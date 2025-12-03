// services/melhorMesService.js
import MelhorMesCache, {
    MELHOR_MES_EDICOES,
} from "../models/MelhorMesCache.js";
import Rodada from "../models/Rodada.js";
import mongoose from "mongoose";

const LOG_PREFIX = "[MELHOR-MES-SERVICE]";

// =====================================================================
// BUSCAR MELHOR MÊS (PRINCIPAL)
// =====================================================================

/**
 * Busca dados do Melhor do Mês para uma liga
 * - Se cache consolidado existe, retorna direto (imutável)
 * - Se não existe ou desatualizado, consolida automaticamente
 *
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaAtual - Rodada atual do sistema (da API Cartola)
 * @returns {Object} Cache com todas as edições
 */
export async function buscarMelhorMes(ligaId, rodadaAtual) {
    console.log(
        `${LOG_PREFIX} Buscando Melhor do Mês para liga ${ligaId} (rodada ${rodadaAtual})`,
    );

    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    // Buscar cache existente
    let cache = await MelhorMesCache.findOne({ ligaId: ligaObjectId });

    // Se temporada encerrada, retorna direto (100% imutável)
    if (cache?.temporada_encerrada) {
        console.log(
            `${LOG_PREFIX} ✅ Temporada encerrada - retornando cache permanente`,
        );
        return formatarResposta(cache);
    }

    // Verificar se precisa atualizar
    const precisaAtualizar = verificarNecessidadeAtualizacao(
        cache,
        rodadaAtual,
    );

    if (precisaAtualizar) {
        console.log(`${LOG_PREFIX} 🔄 Atualizando cache...`);
        cache = await consolidarMelhorMes(ligaObjectId, rodadaAtual);
    }

    return formatarResposta(cache);
}

// =====================================================================
// CONSOLIDAR MELHOR MÊS
// =====================================================================

/**
 * Consolida todas as edições do Melhor do Mês
 * - Edições já consolidadas NÃO são recalculadas
 * - Apenas edições em andamento ou pendentes são processadas
 */
export async function consolidarMelhorMes(ligaId, rodadaAtual) {
    console.log(
        `${LOG_PREFIX} 🔄 Consolidando Melhor do Mês (rodada ${rodadaAtual})`,
    );

    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    // Buscar cache existente
    let cache = await MelhorMesCache.findOne({ ligaId: ligaObjectId });

    // Criar cache se não existe
    if (!cache) {
        cache = new MelhorMesCache({
            ligaId: ligaObjectId,
            edicoes: [],
            rodada_sistema: 0,
        });
    }

    // Processar cada edição
    for (const configEdicao of MELHOR_MES_EDICOES) {
        // Buscar edição no cache
        let edicaoCache = cache.edicoes.find((e) => e.id === configEdicao.id);

        // Se edição já consolidada, pular (IMUTÁVEL)
        if (edicaoCache?.status === "consolidado") {
            console.log(
                `${LOG_PREFIX} ⏭️ ${configEdicao.nome} já consolidada - pulando`,
            );
            continue;
        }

        // Determinar status da edição
        const status = MelhorMesCache.getStatusEdicao(
            configEdicao.id,
            rodadaAtual,
        );

        // Se pendente (não iniciou), criar/atualizar com dados vazios
        if (status === "pendente") {
            if (!edicaoCache) {
                cache.edicoes.push({
                    id: configEdicao.id,
                    nome: configEdicao.nome,
                    inicio: configEdicao.inicio,
                    fim: configEdicao.fim,
                    status: "pendente",
                    rodada_atual: 0,
                    ranking: [],
                    campeao: null,
                    total_participantes: 0,
                });
            }
            continue;
        }

        // Calcular ranking da edição
        console.log(`${LOG_PREFIX} 📊 Calculando ${configEdicao.nome}...`);
        const dadosEdicao = await calcularRankingEdicao(
            ligaObjectId,
            configEdicao,
            rodadaAtual,
        );

        // Atualizar ou criar edição no cache
        if (edicaoCache) {
            Object.assign(edicaoCache, dadosEdicao);
        } else {
            cache.edicoes.push(dadosEdicao);
        }
    }

    // Ordenar edições por ID
    cache.edicoes.sort((a, b) => a.id - b.id);

    // Verificar se temporada encerrada (todas consolidadas)
    const todasConsolidadas = cache.edicoes.every(
        (e) => e.status === "consolidado",
    );
    cache.temporada_encerrada =
        todasConsolidadas && cache.edicoes.length === MELHOR_MES_EDICOES.length;

    // Atualizar timestamps
    cache.rodada_sistema = rodadaAtual;
    cache.atualizado_em = new Date();

    // Salvar
    await cache.save();

    console.log(
        `${LOG_PREFIX} ✅ Cache salvo - ${cache.edicoes.length} edições`,
    );
    if (cache.temporada_encerrada) {
        console.log(
            `${LOG_PREFIX} 🏁 TEMPORADA ENCERRADA - Cache permanente ativado`,
        );
    }

    return cache;
}

// =====================================================================
// CALCULAR RANKING DE UMA EDIÇÃO
// =====================================================================

/**
 * Calcula ranking de uma edição específica
 */
async function calcularRankingEdicao(ligaId, configEdicao, rodadaAtual) {
    const { id, nome, inicio, fim } = configEdicao;

    // Determinar rodada final para cálculo
    const rodadaFinal = Math.min(fim, rodadaAtual);

    // Buscar rodadas da edição
    const rodadas = await Rodada.find({
        ligaId,
        rodada: { $gte: inicio, $lte: rodadaFinal },
    }).lean();

    // Se não há dados
    if (!rodadas || rodadas.length === 0) {
        return {
            id,
            nome,
            inicio,
            fim,
            status: rodadaAtual >= inicio ? "em_andamento" : "pendente",
            rodada_atual: 0,
            ranking: [],
            campeao: null,
            total_participantes: 0,
            atualizado_em: new Date(),
        };
    }

    // Agrupar por time
    const timesPontos = {};

    rodadas.forEach((r) => {
        const timeId = r.timeId;
        const pontos = r.rodadaNaoJogada ? 0 : parseFloat(r.pontos) || 0;

        if (!timesPontos[timeId]) {
            timesPontos[timeId] = {
                timeId,
                nome_time: r.nome_time || r.nome || "N/D",
                nome_cartola: r.nome_cartola || "N/D",
                escudo: r.escudo || "",
                clube_id: r.clube_id,
                pontos_total: 0,
                rodadas_jogadas: 0,
            };
        }

        timesPontos[timeId].pontos_total += pontos;
        if (!r.rodadaNaoJogada && pontos !== 0) {
            timesPontos[timeId].rodadas_jogadas++;
        }
    });

    // Converter para array e ordenar
    const ranking = Object.values(timesPontos)
        .sort((a, b) => b.pontos_total - a.pontos_total)
        .map((time, index) => ({
            posicao: index + 1,
            ...time,
            media:
                time.rodadas_jogadas > 0
                    ? parseFloat(
                          (time.pontos_total / time.rodadas_jogadas).toFixed(2),
                      )
                    : 0,
        }));

    // Determinar status
    const status = rodadaAtual >= fim ? "consolidado" : "em_andamento";

    // Campeão (primeiro lugar)
    const campeao =
        ranking.length > 0
            ? {
                  timeId: ranking[0].timeId,
                  nome_time: ranking[0].nome_time,
                  nome_cartola: ranking[0].nome_cartola,
                  pontos_total: ranking[0].pontos_total,
              }
            : null;

    return {
        id,
        nome,
        inicio,
        fim,
        status,
        rodada_atual: rodadaFinal,
        ranking,
        campeao,
        total_participantes: ranking.length,
        consolidado_em: status === "consolidado" ? new Date() : null,
        atualizado_em: new Date(),
    };
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

/**
 * Verifica se o cache precisa ser atualizado
 */
function verificarNecessidadeAtualizacao(cache, rodadaAtual) {
    // Se não existe cache, precisa criar
    if (!cache) return true;

    // Se temporada encerrada, não atualiza
    if (cache.temporada_encerrada) return false;

    // Se rodada do sistema avançou, precisa atualizar
    if (cache.rodada_sistema < rodadaAtual) return true;

    // Verificar se alguma edição precisa ser consolidada
    for (const configEdicao of MELHOR_MES_EDICOES) {
        const edicaoCache = cache.edicoes.find((e) => e.id === configEdicao.id);

        // Se edição não existe no cache
        if (!edicaoCache) return true;

        // Se edição deveria estar consolidada mas não está
        if (
            rodadaAtual >= configEdicao.fim &&
            edicaoCache.status !== "consolidado"
        ) {
            return true;
        }

        // Se edição em andamento e rodada avançou
        if (
            edicaoCache.status === "em_andamento" &&
            edicaoCache.rodada_atual < rodadaAtual
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Formata resposta para a API
 */
function formatarResposta(cache) {
    if (!cache) {
        return {
            edicoes: [],
            totalEdicoes: 0,
            temporada_encerrada: false,
        };
    }

    return {
        edicoes: cache.edicoes.map((e) => ({
            id: e.id,
            nome: e.nome,
            inicio: e.inicio,
            fim: e.fim,
            status: e.status,
            rodada_atual: e.rodada_atual,
            ranking: e.ranking,
            campeao: e.campeao,
            totalParticipantes: e.total_participantes,
        })),
        totalEdicoes: cache.edicoes.length,
        ligaId: cache.ligaId,
        rodada_sistema: cache.rodada_sistema,
        temporada_encerrada: cache.temporada_encerrada,
        atualizado_em: cache.atualizado_em,
    };
}

// =====================================================================
// FUNÇÕES DE MANUTENÇÃO
// =====================================================================

/**
 * Força reconsolidação de uma liga (ignora cache)
 */
export async function forcarReconsolidacao(ligaId, rodadaAtual) {
    console.log(`${LOG_PREFIX} ⚠️ Forçando reconsolidação para liga ${ligaId}`);

    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    // Buscar cache existente
    let cache = await MelhorMesCache.findOne({ ligaId: ligaObjectId });

    if (cache) {
        // Resetar todas as edições NÃO consolidadas
        cache.edicoes.forEach((e) => {
            if (e.status !== "consolidado") {
                e.ranking = [];
                e.campeao = null;
                e.total_participantes = 0;
                e.rodada_atual = 0;
            }
        });

        cache.temporada_encerrada = false;
        await cache.save();
    }

    // Reconsolidar
    return await consolidarMelhorMes(ligaObjectId, rodadaAtual);
}

/**
 * Invalida cache de uma liga (remove completamente)
 * CUIDADO: Isso remove edições já consolidadas!
 */
export async function invalidarCache(ligaId) {
    console.log(`${LOG_PREFIX} 🗑️ Invalidando cache para liga ${ligaId}`);

    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    const resultado = await MelhorMesCache.deleteOne({ ligaId: ligaObjectId });

    console.log(
        `${LOG_PREFIX} Cache removido: ${resultado.deletedCount} documento(s)`,
    );

    return resultado;
}

/**
 * Busca dados de um participante específico no Melhor do Mês
 */
export async function buscarParticipanteMelhorMes(ligaId, timeId, rodadaAtual) {
    const dados = await buscarMelhorMes(ligaId, rodadaAtual);

    const timeIdNum = parseInt(timeId);

    const resultado = {
        timeId: timeIdNum,
        edicoes: [],
        conquistas: [],
    };

    dados.edicoes.forEach((edicao) => {
        const posicaoTime = edicao.ranking.find((r) => r.timeId === timeIdNum);

        if (posicaoTime) {
            resultado.edicoes.push({
                id: edicao.id,
                nome: edicao.nome,
                status: edicao.status,
                posicao: posicaoTime.posicao,
                pontos_total: posicaoTime.pontos_total,
                rodadas_jogadas: posicaoTime.rodadas_jogadas,
                eh_campeao: edicao.campeao?.timeId === timeIdNum,
            });

            // Se é campeão de edição concluída, adicionar às conquistas
            if (
                edicao.campeao?.timeId === timeIdNum &&
                edicao.status === "consolidado"
            ) {
                resultado.conquistas.push({
                    edicao_id: edicao.id,
                    nome: edicao.nome,
                    pontos: posicaoTime.pontos_total,
                });
            }
        }
    });

    return resultado;
}

// =====================================================================
// EXPORT
// =====================================================================

export default {
    buscarMelhorMes,
    consolidarMelhorMes,
    forcarReconsolidacao,
    invalidarCache,
    buscarParticipanteMelhorMes,
};

console.log(`${LOG_PREFIX} ✅ Service carregado`);
