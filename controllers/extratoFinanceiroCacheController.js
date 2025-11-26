import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";

// ===== BUSCAR EXTRATO EM CACHE (GET) =====
export const getExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        // 🛠️ CORREÇÃO DE TIPAGEM:
        // timeId vem da URL como String, mas no banco é Number.
        // Precisamos converter para Number() para o MongoDB encontrar.
        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: Number(timeId),
        });

        if (!cache) {
            // Retorna 404 silencioso para o frontend saber que precisa calcular
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado para este time",
            });
        }

        // Sucesso! Retorna o JSON pronto
        res.json({
            cached: true,
            data: cache.historico_transacoes || [], // Garante array
            resumo: {
                saldo_final: cache.saldo_consolidado,
                ganhos: cache.ganhos_consolidados,
                perdas: cache.perdas_consolidadas,
            },
            metadados: cache.metadados,
            ultimaRodadaCalculada: cache.ultima_rodada_consolidada,
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao buscar cache:", error);
        res.status(500).json({ error: "Erro interno ao buscar cache" });
    }
};

// ===== SALVAR/ATUALIZAR CACHE (POST) =====
export const salvarExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        // Aceita 'extrato' ou 'historico_transacoes' do frontend
        const {
            extrato,
            historico_transacoes,
            ultimaRodadaCalculada,
            motivoRecalculo,
            saldo,
            resumo,
        } = req.body;

        const dadosParaSalvar = historico_transacoes || extrato || [];

        // Mapeamento seguro para Snake Case (MongoDB)
        const cacheData = {
            liga_id: ligaId,
            time_id: Number(timeId), // Garante Number
            ultima_rodada_consolidada: ultimaRodadaCalculada || 0,
            historico_transacoes: dadosParaSalvar,
            data_ultima_atualizacao: new Date(),

            // Pega do resumo se existir, ou do saldo direto
            saldo_consolidado:
                resumo?.saldo || resumo?.saldo_final || saldo || 0,
            ganhos_consolidados: resumo?.ganhos || 0,
            perdas_consolidadas: resumo?.perdas || resumo?.totalPerdas || 0, // Frontend às vezes manda 'totalPerdas'

            metadados: {
                versaoCalculo: "2.1.0",
                timestampCalculo: new Date(),
                motivoRecalculo: motivoRecalculo || "atualizacao_frontend",
                origem: "participante_app",
            },
        };

        // Upsert: Cria se não existir, Atualiza se existir
        const cache = await ExtratoFinanceiroCache.findOneAndUpdate(
            { liga_id: ligaId, time_id: Number(timeId) },
            cacheData,
            { new: true, upsert: true },
        );

        console.log(
            `[CACHE] Cache salvo com sucesso: Time ${timeId} | Saldo: ${cacheData.saldo_consolidado}`,
        );

        res.json({
            success: true,
            message: "Cache atualizado com sucesso",
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao salvar cache:", error);
        if (error.name === "StrictModeError") {
            console.error(
                "⚠️ ERRO DE SCHEMA: Campo não permitido no Model.",
                error.path,
            );
        }
        res.status(500).json({ error: "Erro ao salvar cache do extrato" });
    }
};

// ===== INVALIDAR CACHE DE UM TIME =====
export const invalidarCacheTime = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        await ExtratoFinanceiroCache.findOneAndDelete({
            liga_id: ligaId,
            time_id: Number(timeId),
        });
        res.json({ success: true, message: "Cache invalidado" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao invalidar cache" });
    }
};

// ===== INVALIDAR CACHE DE TODA A LIGA =====
export const invalidarCacheLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const result = await ExtratoFinanceiroCache.deleteMany({
            liga_id: ligaId,
        });
        res.json({
            success: true,
            message: `${result.deletedCount} caches invalidados`,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao invalidar cache da liga" });
    }
};

// ===== VERIFICAR STATUS DO CACHE (VALIDAÇÃO INTELIGENTE) =====
export const verificarCacheValido = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, mercadoAberto } = req.query;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: Number(timeId),
        });

        if (!cache) {
            return res.json({ valido: false, motivo: "cache_nao_encontrado" });
        }

        const rodadaAtualNum = parseInt(rodadaAtual);
        const mercadoEstaAberto = mercadoAberto === 'true';

        // ✅ REGRA 1: Se mercado está FECHADO e cache está atualizado = VÁLIDO PERMANENTEMENTE
        if (!mercadoEstaAberto && cache.ultima_rodada_consolidada >= rodadaAtualNum) {
            return res.json({
                valido: true,
                permanente: true,
                motivo: "rodada_fechada_cache_permanente",
                ultimaRodada: cache.ultima_rodada_consolidada,
                updatedAt: cache.updatedAt,
            });
        }

        // ✅ REGRA 2: Se mercado está ABERTO, verificar se precisa recalcular apenas rodada atual
        if (mercadoEstaAberto) {
            const rodadaAnterior = Math.max(1, rodadaAtualNum - 1);
            
            // Cache tem rodadas anteriores consolidadas? Reusar!
            if (cache.ultima_rodada_consolidada >= rodadaAnterior) {
                // Verificar idade do cache para rodada em andamento (5 min)
                const idadeCache = Date.now() - new Date(cache.data_ultima_atualizacao).getTime();
                const TTL_RODADA_ABERTA = 5 * 60 * 1000; // 5 minutos

                if (idadeCache < TTL_RODADA_ABERTA) {
                    return res.json({
                        valido: true,
                        permanente: false,
                        motivo: "rodada_aberta_cache_recente",
                        ultimaRodada: cache.ultima_rodada_consolidada,
                        ttlRestante: Math.ceil((TTL_RODADA_ABERTA - idadeCache) / 1000),
                        updatedAt: cache.updatedAt,
                    });
                }

                return res.json({
                    valido: false,
                    motivo: "rodada_aberta_cache_expirado",
                    recalcularApenas: "rodada_atual",
                    rodadasConsolidadas: cache.ultima_rodada_consolidada,
                });
            }
        }

        // ✅ REGRA 3: Cache desatualizado - precisa recalcular rodadas faltantes
        if (cache.ultima_rodada_consolidada < rodadaAtualNum) {
            return res.json({
                valido: false,
                motivo: "rodadas_faltantes",
                cacheRodada: cache.ultima_rodada_consolidada,
                rodadaAtual: rodadaAtualNum,
                rodadasPendentes: rodadaAtualNum - cache.ultima_rodada_consolidada,
            });
        }

        res.json({
            valido: true,
            ultimaRodada: cache.ultima_rodada_consolidada,
            updatedAt: cache.updatedAt,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao verificar cache:", error);
        res.status(500).json({ error: "Erro ao verificar cache" });
    }
};
