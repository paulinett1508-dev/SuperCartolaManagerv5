/**
 * Controller: Quitação de Temporada
 *
 * Gerencia a quitação de saldos de uma temporada e definição de legado
 * para a próxima temporada.
 *
 * @version 1.1.0
 * @since 2026-01-10
 *
 * Changelog:
 * - v1.1.0 (2026-01-11): Suporte a participantes sem cache (calcula direto das rodadas)
 * - v1.0.0 (2026-01-10): Versão inicial
 */

import mongoose from "mongoose";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import { CURRENT_SEASON, getFinancialSeason } from "../config/seasons.js";

/**
 * Busca dados do participante para exibir no modal de quitação
 * GET /api/quitacao/:ligaId/:timeId/dados
 */
export async function buscarDadosParaQuitacao(req, res) {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = parseInt(req.query.temporada) || getFinancialSeason();

        // Buscar cache do extrato
        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: temporada
        }).lean();

        // Verificar se já foi quitado (só se tiver cache)
        if (cache?.quitacao?.quitado) {
            return res.status(400).json({
                success: false,
                error: 'Este extrato já foi quitado',
                quitacao: cache.quitacao
            });
        }

        // Buscar acertos financeiros para calcular saldo completo
        const AcertoFinanceiro = mongoose.model('AcertoFinanceiro');
        const acertos = await AcertoFinanceiro.find({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporada,
            ativo: true
        }).lean();

        // Calcular saldo de acertos
        let totalPago = 0;
        let totalRecebido = 0;
        acertos.forEach(a => {
            if (a.tipo === 'pagamento') totalPago += a.valor;
            else if (a.tipo === 'recebimento') totalRecebido += a.valor;
        });
        const saldoAcertos = totalPago - totalRecebido;

        // Buscar campos manuais
        const FluxoFinanceiroCampos = mongoose.model('FluxoFinanceiroCampos');
        const camposManuais = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporada
        }).lean();

        let totalCamposManuais = 0;
        if (camposManuais?.campos) {
            camposManuais.campos.forEach(c => {
                totalCamposManuais += parseFloat(c.valor) || 0;
            });
        }

        // v1.1: Se não há cache, calcular saldo das rodadas diretamente
        let saldoRodadas = 0;
        let semCache = false;

        if (cache) {
            saldoRodadas = cache.saldo_consolidado || 0;
        } else {
            // Calcular diretamente da collection rodadas
            semCache = true;
            const Rodada = mongoose.model('Rodada');
            const rodadas = await Rodada.find({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: temporada,
                consolidada: true
            }).lean();

            rodadas.forEach(r => {
                saldoRodadas += (r.bonus || 0) - (r.onus || 0);
            });

            console.log(`[QUITACAO] Cache não encontrado para time ${timeId}/temporada ${temporada}. Calculado diretamente: saldoRodadas=${saldoRodadas}`);
        }

        // Calcular saldo final
        const saldoFinal = saldoRodadas + totalCamposManuais + saldoAcertos;

        // Buscar nome do participante
        const Time = mongoose.model('Time');
        const time = await Time.findOne({ id: Number(timeId) }).lean();

        // ✅ v1.1: Buscar status da inscrição na próxima temporada (integração com modal de Renovação)
        const proximaTemporada = temporada + 1;
        const inscricao2026 = await InscricaoTemporada.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: proximaTemporada
        }).lean();

        // Verificar se já tem renovação processada
        const jaRenovou = inscricao2026?.status === 'renovado' || inscricao2026?.status === 'novo';
        const jaProcessado = inscricao2026?.processado === true;

        return res.json({
            success: true,
            dados: {
                time_id: Number(timeId),
                nome_cartoleiro: time?.nome_cartoleiro || time?.nome_cartola || 'Desconhecido',
                nome_time: time?.nome_time || 'Desconhecido',
                temporada: temporada,
                sem_cache: semCache, // v1.1: Flag indicando se dados foram calculados sem cache
                detalhes: {
                    saldo_rodadas: saldoRodadas,
                    campos_manuais: totalCamposManuais,
                    acertos: saldoAcertos,
                    total_pago: totalPago,
                    total_recebido: totalRecebido
                },
                saldo_final: saldoFinal,
                status: saldoFinal < -0.01 ? 'devedor' : (saldoFinal > 0.01 ? 'credor' : 'quitado'),
                // ✅ v1.1: Dados da inscrição na próxima temporada
                inscricao_proxima_temporada: inscricao2026 ? {
                    temporada: proximaTemporada,
                    status: inscricao2026.status,
                    processado: jaProcessado,
                    ja_renovou: jaRenovou,
                    pagou_inscricao: inscricao2026.pagou_inscricao,
                    taxa_inscricao: inscricao2026.taxa_inscricao,
                    // Se já tem legado_manual definido, avisar
                    legado_manual_existente: inscricao2026.legado_manual?.origem ? true : false,
                    legado_manual: inscricao2026.legado_manual
                } : null
            }
        });

    } catch (error) {
        console.error('[QUITACAO] Erro ao buscar dados:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados para quitação',
            message: error.message
        });
    }
}

/**
 * Executa a quitação de uma temporada
 * POST /api/quitacao/:ligaId/:timeId/quitar-temporada
 */
export async function quitarTemporada(req, res) {
    try {
        const { ligaId, timeId } = req.params;
        const {
            temporada_origem,
            temporada_destino,
            saldo_original,
            tipo_quitacao,
            valor_legado,
            observacao
        } = req.body;

        // Validações
        if (!observacao || observacao.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: 'Observação é obrigatória (mínimo 5 caracteres)'
            });
        }

        if (!['zerado', 'integral', 'customizado'].includes(tipo_quitacao)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de quitação inválido'
            });
        }

        const admin = req.session?.admin?.email || req.session?.admin?.nome || 'admin';

        // Buscar cache da temporada origem (pode não existir)
        const cacheOrigem = await ExtratoFinanceiroCache.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: Number(temporada_origem)
        });

        // Se existe cache, verificar se já foi quitado
        if (cacheOrigem?.quitacao?.quitado) {
            return res.status(400).json({
                success: false,
                error: 'Este extrato já foi quitado anteriormente',
                quitacao: cacheOrigem.quitacao
            });
        }

        // 1. Marcar extrato da temporada origem como quitado (se existir cache)
        if (cacheOrigem) {
            cacheOrigem.quitacao = {
                quitado: true,
                data_quitacao: new Date(),
                admin_responsavel: admin,
                saldo_no_momento: saldo_original,
                tipo: tipo_quitacao,
                valor_legado: tipo_quitacao === 'zerado' ? 0 : (tipo_quitacao === 'integral' ? saldo_original : valor_legado),
                observacao: observacao.trim()
            };
            await cacheOrigem.save();
            console.log(`[QUITACAO] Extrato ${temporada_origem} marcado como quitado para time ${timeId}`);
        } else {
            // v1.1: Se não há cache, criar um registro mínimo de quitação
            await ExtratoFinanceiroCache.create({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: Number(temporada_origem),
                saldo_consolidado: saldo_original,
                quitacao: {
                    quitado: true,
                    data_quitacao: new Date(),
                    admin_responsavel: admin,
                    saldo_no_momento: saldo_original,
                    tipo: tipo_quitacao,
                    valor_legado: tipo_quitacao === 'zerado' ? 0 : (tipo_quitacao === 'integral' ? saldo_original : valor_legado),
                    observacao: observacao.trim(),
                    criado_sem_cache: true // Flag para auditoria
                }
            });
            console.log(`[QUITACAO] Cache criado e marcado como quitado para time ${timeId}/temporada ${temporada_origem} (sem cache anterior)`);
        }

        // 2. Criar/atualizar inscrição na temporada destino com legado manual
        const valorLegadoFinal = tipo_quitacao === 'zerado' ? 0 :
                                 (tipo_quitacao === 'integral' ? saldo_original : valor_legado);

        const inscricaoUpdate = {
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: Number(temporada_destino),
            temporada_anterior: {
                temporada: Number(temporada_origem),
                saldo_final: saldo_original,
                status_quitacao: 'quitado'  // Sempre quitado após esta ação
            },
            legado_manual: {
                origem: 'quitacao_admin',
                valor_original: saldo_original,
                valor_definido: valorLegadoFinal,
                tipo_quitacao: tipo_quitacao,
                observacao: observacao.trim(),
                admin_responsavel: admin,
                data_quitacao: new Date()
            }
        };

        // Se valor_legado != 0, definir como saldo_transferido ou divida_anterior
        if (valorLegadoFinal !== 0) {
            if (valorLegadoFinal > 0) {
                // Crédito a carregar
                inscricaoUpdate.saldo_transferido = valorLegadoFinal;
                inscricaoUpdate.divida_anterior = 0;
            } else {
                // Dívida a carregar
                inscricaoUpdate.saldo_transferido = 0;
                inscricaoUpdate.divida_anterior = Math.abs(valorLegadoFinal);
            }
        } else {
            inscricaoUpdate.saldo_transferido = 0;
            inscricaoUpdate.divida_anterior = 0;
        }

        await InscricaoTemporada.findOneAndUpdate(
            {
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: Number(temporada_destino)
            },
            { $set: inscricaoUpdate },
            { upsert: true, new: true }
        );
        console.log(`[QUITACAO] Inscricao ${temporada_destino} atualizada com legado manual para time ${timeId}`);

        // 3. Registrar log de atividade
        try {
            const UserActivity = mongoose.model('UserActivity');
            await UserActivity.create({
                usuario: admin,
                tipo: 'quitacao_temporada',
                descricao: `Quitação ${temporada_origem}: ${tipo_quitacao} | Original: R$${saldo_original} | Legado: R$${valorLegadoFinal}`,
                detalhes: {
                    liga_id: ligaId,
                    time_id: timeId,
                    temporada_origem,
                    temporada_destino,
                    saldo_original,
                    tipo_quitacao,
                    valor_legado: valorLegadoFinal,
                    observacao
                },
                ip: req.ip
            });
        } catch (logError) {
            console.warn('[QUITACAO] Erro ao registrar log (não crítico):', logError.message);
        }

        return res.json({
            success: true,
            message: `Temporada ${temporada_origem} quitada com sucesso`,
            quitacao: {
                temporada_origem,
                temporada_destino,
                saldo_original,
                tipo_quitacao,
                valor_legado: valorLegadoFinal,
                admin: admin,
                data: new Date()
            }
        });

    } catch (error) {
        console.error('[QUITACAO] Erro ao quitar temporada:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao processar quitação',
            message: error.message
        });
    }
}

/**
 * Verifica status de quitação de um participante
 * GET /api/quitacao/:ligaId/:timeId/status
 */
export async function verificarStatusQuitacao(req, res) {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = parseInt(req.query.temporada) || getFinancialSeason();

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: temporada
        }).lean();

        if (!cache) {
            return res.json({
                success: true,
                quitado: false,
                motivo: 'cache_nao_encontrado'
            });
        }

        return res.json({
            success: true,
            quitado: cache.quitacao?.quitado || false,
            quitacao: cache.quitacao || null
        });

    } catch (error) {
        console.error('[QUITACAO] Erro ao verificar status:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao verificar status',
            message: error.message
        });
    }
}

export default {
    buscarDadosParaQuitacao,
    quitarTemporada,
    verificarStatusQuitacao
};
