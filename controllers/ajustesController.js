/**
 * Controller: Ajustes Financeiros
 *
 * CRUD para ajustes financeiros dinâmicos (temporada 2026+).
 * Substitui os 4 campos fixos do sistema anterior.
 *
 * @version 1.0.0
 * @since 2026-01-10
 */

import AjusteFinanceiro from "../models/AjusteFinanceiro.js";
import { CURRENT_SEASON } from "../config/seasons.js";

// =============================================================================
// LISTAR AJUSTES DE UM PARTICIPANTE
// =============================================================================

/**
 * GET /api/ajustes/:ligaId/:timeId
 * Lista todos os ajustes ativos de um participante na temporada
 */
export async function listarAjustes(req, res) {
    try {
        const { ligaId, timeId } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        const ajustes = await AjusteFinanceiro.listarPorParticipante(ligaId, timeId, temporada);
        const totais = await AjusteFinanceiro.calcularTotal(ligaId, timeId, temporada);

        res.json({
            success: true,
            temporada,
            ajustes,
            totais
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao listar:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// CRIAR NOVO AJUSTE
// =============================================================================

/**
 * POST /api/ajustes/:ligaId/:timeId
 * Cria um novo ajuste financeiro
 * ✅ v1.1.0: Idempotência via janela de tempo (previne duplicidade)
 */
export async function criarAjuste(req, res) {
    try {
        const { ligaId, timeId } = req.params;
        const { descricao, valor } = req.body;
        const temporada = Number(req.body.temporada) || CURRENT_SEASON;

        // Validações
        if (!descricao || descricao.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Descrição é obrigatória"
            });
        }

        if (valor === undefined || valor === null || valor === 0) {
            return res.status(400).json({
                success: false,
                error: "Valor é obrigatório e não pode ser zero"
            });
        }

        // ✅ v1.1.0: IDEMPOTÊNCIA - Prevenir ajuste duplicado
        // Verifica se já existe ajuste com mesma descrição+valor nos últimos 60 segundos
        const janelaIdempotencia = new Date(Date.now() - 60 * 1000);
        const ajusteDuplicado = await AjusteFinanceiro.findOne({
            liga_id: ligaId,
            time_id: Number(timeId),
            temporada,
            descricao: descricao.trim(),
            valor: Number(valor),
            ativo: true,
            criado_em: { $gte: janelaIdempotencia },
        }).lean();

        if (ajusteDuplicado) {
            console.warn(`[AJUSTES] ⚠️ Ajuste duplicado detectado para time ${timeId} (idempotência)`);
            return res.status(409).json({
                success: false,
                error: "Ajuste duplicado detectado. Um ajuste idêntico foi criado há menos de 60 segundos.",
                ajusteExistente: ajusteDuplicado._id,
            });
        }

        // Obter email do admin (se disponível na sessão)
        const criadoPor = req.session?.admin?.email || req.session?.admin?.email || req.session?.usuario?.email || req.user?.email || '';

        const ajuste = await AjusteFinanceiro.criar({
            liga_id: ligaId,
            time_id: timeId,
            temporada,
            descricao: descricao.trim(),
            valor: Number(valor),
            criado_por: criadoPor
        });

        console.log(`[AJUSTES] Criado: ${descricao} = R$ ${valor} para time ${timeId} por ${criadoPor}`);

        // Retornar ajuste criado + totais atualizados
        const totais = await AjusteFinanceiro.calcularTotal(ligaId, timeId, temporada);

        res.status(201).json({
            success: true,
            ajuste,
            totais
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao criar:", error);

        // Erro de validação do Mongoose
        if (error.name === 'ValidationError') {
            const mensagens = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: mensagens.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// ATUALIZAR AJUSTE
// =============================================================================

/**
 * PATCH /api/ajustes/:id
 * Atualiza um ajuste existente
 */
export async function atualizarAjuste(req, res) {
    try {
        const { id } = req.params;
        const { descricao, valor } = req.body;

        // Validações
        if (descricao !== undefined && descricao.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Descrição não pode ser vazia"
            });
        }

        if (valor !== undefined && valor === 0) {
            return res.status(400).json({
                success: false,
                error: "Valor não pode ser zero"
            });
        }

        // Obter email do admin
        const atualizadoPor = req.session?.admin?.email || req.session?.usuario?.email || req.user?.email || '';

        const ajuste = await AjusteFinanceiro.atualizar(id, {
            descricao: descricao?.trim(),
            valor,
            atualizado_por: atualizadoPor
        });

        if (!ajuste) {
            return res.status(404).json({
                success: false,
                error: "Ajuste não encontrado"
            });
        }

        console.log(`[AJUSTES] Atualizado: ${ajuste._id} por ${atualizadoPor}`);

        // Retornar totais atualizados
        const totais = await AjusteFinanceiro.calcularTotal(
            ajuste.liga_id,
            ajuste.time_id,
            ajuste.temporada
        );

        res.json({
            success: true,
            ajuste,
            totais
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao atualizar:", error);

        if (error.name === 'ValidationError') {
            const mensagens = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: mensagens.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// REMOVER AJUSTE (Soft Delete)
// =============================================================================

/**
 * DELETE /api/ajustes/:id
 * Remove um ajuste (soft delete - marca como inativo)
 */
export async function removerAjuste(req, res) {
    try {
        const { id } = req.params;

        // Obter email do admin
        const removidoPor = req.session?.admin?.email || req.session?.usuario?.email || req.user?.email || '';

        const ajuste = await AjusteFinanceiro.remover(id, removidoPor);

        if (!ajuste) {
            return res.status(404).json({
                success: false,
                error: "Ajuste não encontrado"
            });
        }

        console.log(`[AJUSTES] Removido: ${ajuste._id} (${ajuste.descricao}) por ${removidoPor}`);

        // Retornar totais atualizados
        const totais = await AjusteFinanceiro.calcularTotal(
            ajuste.liga_id,
            ajuste.time_id,
            ajuste.temporada
        );

        res.json({
            success: true,
            message: "Ajuste removido com sucesso",
            totais
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao remover:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// OBTER AJUSTE POR ID
// =============================================================================

/**
 * GET /api/ajustes/detalhe/:id
 * Obtém detalhes de um ajuste específico
 */
export async function obterAjuste(req, res) {
    try {
        const { id } = req.params;

        const ajuste = await AjusteFinanceiro.findById(id).lean();

        if (!ajuste) {
            return res.status(404).json({
                success: false,
                error: "Ajuste não encontrado"
            });
        }

        res.json({
            success: true,
            ajuste
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao obter:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// LISTAR AJUSTES DA LIGA (para relatórios)
// =============================================================================

/**
 * GET /api/ajustes/liga/:ligaId
 * Lista todos os ajustes de uma liga na temporada
 */
export async function listarAjustesLiga(req, res) {
    try {
        const { ligaId } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        const ajustes = await AjusteFinanceiro.listarPorLiga(ligaId, temporada);

        // Agrupar por time
        const porTime = {};
        ajustes.forEach(a => {
            if (!porTime[a.time_id]) {
                porTime[a.time_id] = {
                    time_id: a.time_id,
                    ajustes: [],
                    total: 0
                };
            }
            porTime[a.time_id].ajustes.push(a);
            porTime[a.time_id].total += a.valor;
        });

        res.json({
            success: true,
            temporada,
            total_ajustes: ajustes.length,
            por_time: Object.values(porTime)
        });
    } catch (error) {
        console.error("[AJUSTES] Erro ao listar por liga:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
