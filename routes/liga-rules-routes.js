/**
 * Rotas: Liga Rules
 *
 * API para gerenciar regras de inscrição por liga e temporada.
 * Permite configurar taxa, prazo, permissões de renovação.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import express from "express";
import LigaRules from "../models/LigaRules.js";
import Liga from "../models/Liga.js";
import { CURRENT_SEASON } from "../config/seasons.js";

const router = express.Router();

// =============================================================================
// GET /api/liga-rules/:ligaId/:temporada
// Buscar regras de uma liga para uma temporada
// =============================================================================
router.get("/:ligaId/:temporada?", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = Number(req.params.temporada) || CURRENT_SEASON;

        console.log(`[LIGA-RULES] GET regras liga=${ligaId} temporada=${temporada}`);

        // Verificar se liga existe
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({
                success: false,
                error: "Liga não encontrada"
            });
        }

        // Buscar regras
        let rules = await LigaRules.buscarPorLiga(ligaId, temporada);

        // Se não existir, retornar template com valores default
        if (!rules) {
            rules = {
                liga_id: ligaId,
                temporada,
                inscricao: {
                    taxa: 0,
                    prazo_renovacao: new Date('2026-01-27T23:59:59'),
                    permitir_devedor_renovar: true,
                    aproveitar_saldo_positivo: true,
                    permitir_parcelamento: false,
                    max_parcelas: 1
                },
                status: 'rascunho',
                mensagens: {
                    boas_vindas: '',
                    aviso_devedor: '',
                    confirmacao: ''
                },
                _isDefault: true // Flag para indicar que são valores default
            };
        }

        res.json({
            success: true,
            ligaId,
            ligaNome: liga.nome,
            temporada,
            rules
        });

    } catch (error) {
        console.error("[LIGA-RULES] Erro ao buscar regras:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar regras da liga"
        });
    }
});

// =============================================================================
// POST /api/liga-rules/:ligaId/:temporada
// Criar ou atualizar regras de uma liga
// =============================================================================
router.post("/:ligaId/:temporada?", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = Number(req.params.temporada) || CURRENT_SEASON;
        const { inscricao, status, mensagens, criado_por } = req.body;

        console.log(`[LIGA-RULES] POST regras liga=${ligaId} temporada=${temporada}`);

        // Verificar se liga existe
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({
                success: false,
                error: "Liga não encontrada"
            });
        }

        // Validar dados obrigatórios
        if (inscricao?.taxa !== undefined && inscricao.taxa < 0) {
            return res.status(400).json({
                success: false,
                error: "Taxa de inscrição não pode ser negativa"
            });
        }

        if (inscricao?.prazo_renovacao) {
            const prazo = new Date(inscricao.prazo_renovacao);
            if (isNaN(prazo.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: "Data de prazo inválida"
                });
            }
        }

        // Preparar dados para upsert
        const dadosAtualizacao = {
            liga_id: ligaId,
            temporada,
            atualizado_por: criado_por || 'admin'
        };

        if (inscricao) {
            dadosAtualizacao.inscricao = {
                taxa: inscricao.taxa ?? 0,
                prazo_renovacao: inscricao.prazo_renovacao ? new Date(inscricao.prazo_renovacao) : new Date('2026-01-27T23:59:59'),
                permitir_devedor_renovar: inscricao.permitir_devedor_renovar ?? true,
                aproveitar_saldo_positivo: inscricao.aproveitar_saldo_positivo ?? true,
                permitir_parcelamento: inscricao.permitir_parcelamento ?? false,
                max_parcelas: inscricao.max_parcelas ?? 1
            };
        }

        if (status) {
            dadosAtualizacao.status = status;
        }

        if (mensagens) {
            dadosAtualizacao.mensagens = mensagens;
        }

        // Upsert
        const rules = await LigaRules.upsert(ligaId, temporada, dadosAtualizacao);

        console.log(`[LIGA-RULES] Regras salvas para liga=${ligaId} temporada=${temporada}`);

        res.json({
            success: true,
            message: "Regras salvas com sucesso",
            rules
        });

    } catch (error) {
        console.error("[LIGA-RULES] Erro ao salvar regras:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao salvar regras da liga"
        });
    }
});

// =============================================================================
// PATCH /api/liga-rules/:ligaId/:temporada/status
// Alterar status do processo de renovação (rascunho -> aberto -> encerrado)
// =============================================================================
router.patch("/:ligaId/:temporada/status", async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const { status, atualizado_por } = req.body;

        console.log(`[LIGA-RULES] PATCH status liga=${ligaId} temporada=${temporada} -> ${status}`);

        // Validar status
        const statusValidos = ['rascunho', 'aberto', 'encerrado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Status inválido. Use: ${statusValidos.join(', ')}`
            });
        }

        // Buscar regras existentes
        const rules = await LigaRules.findOne({
            liga_id: ligaId,
            temporada: Number(temporada)
        });

        if (!rules) {
            return res.status(404).json({
                success: false,
                error: "Regras não encontradas. Configure as regras primeiro."
            });
        }

        // Validar transição de status
        const transicoes = {
            'rascunho': ['aberto'],
            'aberto': ['encerrado', 'rascunho'],
            'encerrado': ['aberto'] // Pode reabrir se necessário
        };

        if (!transicoes[rules.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Transição inválida: ${rules.status} -> ${status}`
            });
        }

        // Atualizar
        rules.status = status;
        rules.atualizado_por = atualizado_por || 'admin';
        await rules.save();

        console.log(`[LIGA-RULES] Status atualizado: ${rules.status}`);

        res.json({
            success: true,
            message: `Status alterado para: ${status}`,
            rules
        });

    } catch (error) {
        console.error("[LIGA-RULES] Erro ao alterar status:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao alterar status"
        });
    }
});

// =============================================================================
// GET /api/liga-rules/:ligaId/:temporada/preview
// Preview do cálculo de inscrição para um participante
// =============================================================================
router.get("/:ligaId/:temporada/preview/:timeId", async (req, res) => {
    try {
        const { ligaId, temporada, timeId } = req.params;

        console.log(`[LIGA-RULES] Preview inscricao liga=${ligaId} time=${timeId} temporada=${temporada}`);

        // Buscar regras
        const rules = await LigaRules.findOne({
            liga_id: ligaId,
            temporada: Number(temporada)
        });

        if (!rules) {
            return res.status(404).json({
                success: false,
                error: "Regras não configuradas para esta temporada"
            });
        }

        // Buscar saldo do participante na temporada anterior
        // Importar dinamicamente para evitar dependência circular
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;

        // Buscar extrato da temporada anterior
        const temporadaAnterior = Number(temporada) - 1;
        const extrato = await db.collection('extratofinanceirocaches').findOne({
            $or: [
                { liga_id: ligaId },
                { liga_id: new mongoose.Types.ObjectId(ligaId) }
            ],
            time_id: Number(timeId),
            temporada: temporadaAnterior
        });

        // Buscar acertos da temporada anterior
        const acertos = await db.collection('acertofinanceiros').find({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporadaAnterior,
            ativo: true
        }).toArray();

        // Calcular saldo de acertos
        let saldoAcertos = 0;
        acertos.forEach(a => {
            if (a.tipo === 'pagamento') saldoAcertos += a.valor || 0;
            else if (a.tipo === 'recebimento') saldoAcertos -= a.valor || 0;
        });

        // ✅ v1.2: Buscar campos manuais da temporada anterior
        const camposManuais = await db.collection('fluxofinanceirocampos').findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporadaAnterior
        });

        let totalCamposManuais = 0;
        if (camposManuais?.campos) {
            camposManuais.campos.forEach(c => {
                totalCamposManuais += parseFloat(c.valor) || 0;
            });
        }

        const saldoExtrato = extrato?.saldo_consolidado || 0;
        const saldoFinal = saldoExtrato + saldoAcertos + totalCamposManuais;

        // Determinar status de quitação
        let statusQuitacao = 'quitado';
        if (saldoFinal > 0.01) statusQuitacao = 'credor';
        else if (saldoFinal < -0.01) statusQuitacao = 'devedor';

        // ✅ v1.1: Buscar dados de quitação do extrato (se existir)
        const quitacaoInfo = extrato?.quitacao || null;

        // ✅ v1.1: Buscar inscrição existente para verificar legado_manual
        const inscricaoExistente = await db.collection('inscricoestemporada').findOne({
            $or: [
                { liga_id: ligaId },
                { liga_id: new mongoose.Types.ObjectId(ligaId) }
            ],
            time_id: Number(timeId),
            temporada: Number(temporada)
        });

        // ✅ v1.1: Se tem legado_manual definido (via quitação ou outro), usar esse valor
        // ao invés do saldo calculado automaticamente
        let saldoParaCalculo = saldoFinal;
        let usandoLegadoManual = false;

        if (inscricaoExistente?.legado_manual?.valor_definido !== undefined) {
            saldoParaCalculo = inscricaoExistente.legado_manual.valor_definido;
            usandoLegadoManual = true;
            console.log(`[LIGA-RULES] Usando legado_manual: ${saldoParaCalculo} (origem: ${inscricaoExistente.legado_manual.origem})`);
        } else if (quitacaoInfo?.quitado && quitacaoInfo.valor_legado !== undefined) {
            // Se extrato foi quitado mas ainda não tem inscrição com legado_manual
            saldoParaCalculo = quitacaoInfo.valor_legado;
            usandoLegadoManual = true;
            console.log(`[LIGA-RULES] Usando valor_legado da quitação: ${saldoParaCalculo}`);
        }

        // Calcular cenários: pagou vs não pagou
        // Default: pagouInscricao = true (não gera débito de taxa)
        const calculoPagou = rules.calcularValorInscricao(saldoParaCalculo, { pagouInscricao: true });
        const calculoNaoPagou = rules.calcularValorInscricao(saldoParaCalculo, { pagouInscricao: false });

        res.json({
            success: true,
            timeId,
            temporadaOrigem: temporadaAnterior,
            temporadaDestino: Number(temporada),
            saldoTemporadaAnterior: {
                extrato: saldoExtrato,
                acertos: saldoAcertos,
                camposManuais: totalCamposManuais,
                final: saldoFinal,
                status: statusQuitacao,
                // ✅ v1.1: Indicar se está usando legado manual
                saldoUsado: saldoParaCalculo,
                usandoLegadoManual
            },
            // Calculo default (pagouInscricao=true)
            calculo: {
                taxa: calculoPagou.taxa,
                credito: calculoPagou.credito,
                divida: calculoPagou.divida,
                total: calculoPagou.total
            },
            // Cenários para preview dinâmico no frontend
            cenarios: {
                pagou: {
                    taxaComoDivida: calculoPagou.taxaComoDivida,
                    credito: calculoPagou.credito,
                    divida: calculoPagou.divida,
                    total: calculoPagou.total
                },
                naoPagou: {
                    taxaComoDivida: calculoNaoPagou.taxaComoDivida,
                    credito: calculoNaoPagou.credito,
                    divida: calculoNaoPagou.divida,
                    total: calculoNaoPagou.total
                }
            },
            regras: {
                permitir_devedor_renovar: rules.inscricao.permitir_devedor_renovar,
                aproveitar_saldo_positivo: rules.inscricao.aproveitar_saldo_positivo,
                taxa: rules.inscricao.taxa
            },
            podeRenovar: statusQuitacao !== 'devedor' || rules.inscricao.permitir_devedor_renovar,

            // ✅ v1.1: Dados de quitação para integração entre modais
            quitacao: quitacaoInfo ? {
                quitado: quitacaoInfo.quitado,
                data_quitacao: quitacaoInfo.data_quitacao,
                tipo: quitacaoInfo.tipo,
                valor_legado: quitacaoInfo.valor_legado,
                admin_responsavel: quitacaoInfo.admin_responsavel,
                observacao: quitacaoInfo.observacao
            } : null,

            // ✅ v1.1: Inscrição existente na temporada destino
            inscricaoExistente: inscricaoExistente ? {
                status: inscricaoExistente.status,
                processado: inscricaoExistente.processado,
                pagou_inscricao: inscricaoExistente.pagou_inscricao,
                taxa_inscricao: inscricaoExistente.taxa_inscricao,
                legado_manual: inscricaoExistente.legado_manual || null,
                saldo_transferido: inscricaoExistente.saldo_transferido,
                divida_anterior: inscricaoExistente.divida_anterior,
                data_decisao: inscricaoExistente.data_decisao
            } : null
        });

    } catch (error) {
        console.error("[LIGA-RULES] Erro no preview:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao calcular preview"
        });
    }
});

export default router;
