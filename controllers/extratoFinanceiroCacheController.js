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
        // Garantir que todos os campos sejam retornados
        const dadosCompletos = cache.toObject ? cache.toObject() : cache;

        res.json({
            cached: true,
            data: dadosCompletos.historico_transacoes || [], // Garante array
            resumo: {
                saldo_final: dadosCompletos.saldo_consolidado,
                ganhos: dadosCompletos.ganhos_consolidados,
                perdas: dadosCompletos.perdas_consolidadas,
            },
            metadados: dadosCompletos.metadados,
            ultimaRodadaCalculada: dadosCompletos.ultima_rodada_consolidada,
            updatedAt: dadosCompletos.updatedAt,
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

        // Buscar cache existente - SEM .lean() para preservar todos os campos
        const cacheExistente = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: Number(timeId),
        });

        if (!cacheExistente) {
            return res.json({ valido: false, motivo: "cache_nao_encontrado" });
        }

        const rodadaAtualNum = parseInt(rodadaAtual);
        const mercadoEstaAberto = mercadoAberto === 'true';

        // Simula a validação que ocorreria em outro controller (para ter os mesmos resultados)
        // Esta é uma simplificação, em um cenário real, esta lógica estaria em um service/util
        let validacao = { valido: false, motivo: "erro_simulacao" };
        const rodadaAtualInt = parseInt(rodadaAtual);

        // ✅ REGRA 1: Se mercado está FECHADO e cache está atualizado = VÁLIDO PERMANENTEMENTE
        if (!mercadoEstaAberto && cacheExistente.ultima_rodada_consolidada >= rodadaAtualInt) {
            validacao = {
                valido: true,
                permanente: true,
                motivo: "rodada_fechada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                mercadoStatus: "fechado",
                updatedAt: cacheExistente.updatedAt,
            };
        }
        // ✅ REGRA 2: Se mercado está ABERTO, verificar se precisa recalcular apenas rodada atual
        else if (mercadoEstaAberto) {
            const rodadaAnterior = Math.max(1, rodadaAtualInt - 1);

            // Cache tem rodadas anteriores consolidadas? Reusar!
            if (cacheExistente.ultima_rodada_consolidada >= rodadaAnterior) {
                // Verificar idade do cache para rodada em andamento (5 min)
                const timestampCache = cacheExistente.updatedAt || cacheExistente.data_ultima_atualizacao;
                const idadeCache = Date.now() - new Date(timestampCache).getTime();
                const TTL_RODADA_ABERTA = 5 * 60 * 1000; // 5 minutos

                if (idadeCache < TTL_RODADA_ABERTA) {
                    validacao = {
                        valido: true,
                        permanente: false,
                        motivo: "rodada_aberta_cache_recente",
                        ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                        ttlRestante: Math.ceil((TTL_RODADA_ABERTA - idadeCache) / 1000),
                        mercadoStatus: "aberto",
                        updatedAt: cacheExistente.updatedAt,
                    };
                } else {
                    // ✅ CACHE EXPIRADO MAS AINDA VÁLIDO (apenas refresh parcial)
                    validacao = {
                        valido: true, // ← MUDOU DE FALSE PARA TRUE!
                        permanente: false,
                        motivo: "rodada_aberta_cache_expirado_mas_valido",
                        recalcularApenas: "rodada_atual",
                        rodadasConsolidadas: cacheExistente.ultima_rodada_consolidada,
                        usarCacheAntigo: true, // ← NOVO FLAG
                        mercadoStatus: "aberto",
                        updatedAt: cacheExistente.updatedAt,
                    };
                }
            }
        }

        // ✅ REGRA 3: Cache desatualizado - precisa recalcular rodadas faltantes
        if (!validacao.valido && cacheExistente.ultima_rodada_consolidada < rodadaAtualInt) {
            validacao = {
                valido: false,
                motivo: "rodadas_faltantes",
                cacheRodada: cacheExistente.ultima_rodada_consolidada,
                rodadaAtual: rodadaAtualInt,
                rodadasPendentes: rodadaAtualInt - cacheExistente.ultima_rodada_consolidada,
            };
        } else if (!validacao.valido) {
            // Caso geral de cache inválido não coberto pelas regras anteriores
            validacao = {
                valido: false,
                motivo: "cache_desatualizado_ou_invalido",
                cacheRodada: cacheExistente.ultima_rodada_consolidada,
                rodadaAtual: rodadaAtualInt,
            };
        }


        // ✅ SEMPRE RETORNAR ESTRUTURA DE VALIDAÇÃO CONSISTENTE
        if (validacao.valido && cacheExistente) {
            console.log('  ✅ Cache válido encontrado - retornando validação + dados');

            // Retornar validação + dados do cache
            return res.json({
                valido: true,
                cached: true,
                motivo: validacao.motivo,
                permanente: validacao.permanente || false,
                mercadoStatus: validacao.mercadoStatus,
                ultimaRodadaCalculada: cacheExistente.ultima_rodada_consolidada,
                rodadaAtual: rodadaAtualInt,
                updatedAt: cacheExistente.updatedAt,
                // Dados completos do cache
                data: cacheExistente.historico_transacoes || [],
                resumo: {
                    saldo: cacheExistente.saldo_consolidado,
                    ganhos: cacheExistente.ganhos_consolidados,
                    perdas: cacheExistente.perdas_consolidadas
                },
                metadados: cacheExistente.metadados
            });
        } else {
            // Se não é válido, retorna informações da validação
            console.log(`  ❌ Cache inválido: ${validacao.motivo}`);
            return res.json({
                valido: false,
                cached: false,
                motivo: validacao.motivo,
                cacheRodada: cacheExistente?.ultima_rodada_consolidada || 0,
                rodadaAtual: rodadaAtualInt,
                rodadasPendentes: validacao.rodadasPendentes || 0,
                mercadoStatus: validacao.mercadoStatus,
                updatedAt: cacheExistente?.updatedAt
            });
        }
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao verificar cache:", error);
        res.status(500).json({ error: "Erro ao verificar cache" });
    }
};

// ===== FUNÇÃO DE LEITURA DE CACHE COM VALIDAÇÃO INTELIGENTE =====
export const lerCacheExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, statusMercado } = req.query;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: ligaId,
            time_id: timeId,
        });

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        // ✅ VALIDAÇÃO INTELIGENTE: Cache é válido se:
        // 1. Rodada calculada está atualizada OU
        // 2. Mercado está ABERTO e cache é da rodada anterior (esperando consolidação)
        const rodadaAtualNum = parseInt(rodadaAtual) || 0;
        const mercadoFechado = parseInt(statusMercado) === 2;

        let cacheValido = false;

        if (mercadoFechado) {
            // Mercado FECHADO: cache deve estar na rodada atual
            cacheValido = cache.rodada_calculada === rodadaAtualNum;
        } else {
            // Mercado ABERTO: cache pode ser da rodada anterior (até consolidar)
            cacheValido = cache.rodada_calculada >= rodadaAtualNum - 1;
        }

        if (!cacheValido) {
            console.log(`[CACHE-EXTRATO] ❌ Cache desatualizado: calculado até R${cache.rodada_calculada}, esperado R${rodadaAtualNum}`);
            return res.status(404).json({
                cached: false,
                reason: 'outdated',
                cachedUntil: cache.rodada_calculada,
                expectedUntil: rodadaAtualNum
            });
        }

        console.log(`[CACHE-EXTRATO] ✅ Cache válido: R${cache.rodada_calculada} (atual: R${rodadaAtualNum})`);

        res.json({
            cached: true,
            rodada_calculada: cache.rodada_calculada,
            dados: cache.dados_extrato,
            saldo_total: cache.saldo_total,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-EXTRATO] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};