/**
 * Routes: Module Config
 *
 * API para gerenciar configuracao de modulos por liga.
 * Permite ativar/desativar modulos e configurar via wizard.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import express from 'express';
import { verificarAdmin } from '../middleware/auth.js';
import ModuleConfig, { MODULOS_DISPONIVEIS } from '../models/ModuleConfig.js';
import { getRuleById, allRules } from '../config/rules/index.js';
import { CURRENT_SEASON } from '../config/seasons.js';
import Liga from '../models/Liga.js';

const router = express.Router();

// =============================================================================
// PROPAGAÇÃO: moduleconfigs → liga.configuracoes (ranking_rodada)
// =============================================================================

/**
 * Propaga valores_manual do moduleconfig para liga.configuracoes.ranking_rodada
 * Necessário para que o backend (rodadaController) encontre os valores financeiros
 */
async function propagarRankingRodadaParaLiga(ligaId, wizardRespostas) {
    const valoresManuais = wizardRespostas?.valores_manual;
    if (!valoresManuais || Object.keys(valoresManuais).length === 0) {
        console.warn('[MODULE-CONFIG] Sem valores_manual para propagar');
        return false;
    }

    const valores = {};
    let inicioCredito = null, fimCredito = null;
    let inicioNeutro = null, fimNeutro = null;
    let inicioDebito = null, fimDebito = null;

    const posicoes = Object.keys(valoresManuais).map(Number).sort((a, b) => a - b);
    const totalParticipantes = posicoes.length;

    for (const pos of posicoes) {
        const val = Number(valoresManuais[pos]) || 0;
        valores[String(pos)] = val;

        if (val > 0) {
            if (inicioCredito === null) inicioCredito = pos;
            fimCredito = pos;
        } else if (val < 0) {
            if (inicioDebito === null) inicioDebito = pos;
            fimDebito = pos;
        } else {
            if (inicioNeutro === null) inicioNeutro = pos;
            fimNeutro = pos;
        }
    }

    const faixas = {
        credito: { inicio: inicioCredito || 1, fim: fimCredito || 1 },
        neutro: { inicio: inicioNeutro || (fimCredito || 0) + 1, fim: fimNeutro || (inicioDebito || totalParticipantes) - 1 },
        debito: { inicio: inicioDebito || totalParticipantes, fim: fimDebito || totalParticipantes }
    };

    const rankingRodadaConfig = {
        descricao: 'Bônus/ônus por posição na rodada',
        configurado: true,
        total_participantes: totalParticipantes,
        valores,
        faixas
    };

    const result = await Liga.updateOne(
        { _id: ligaId },
        { $set: { 'configuracoes.ranking_rodada': rankingRodadaConfig } }
    );

    console.log(`[MODULE-CONFIG] ranking_rodada propagado para liga ${ligaId}: ${totalParticipantes} posições, ${result.modifiedCount} doc atualizado`);
    return result.modifiedCount > 0;
}

// =============================================================================
// LISTAR MODULOS
// =============================================================================

/**
 * GET /api/liga/:ligaId/modulos
 * Lista todos os modulos disponiveis e seu status para a liga
 */
router.get('/liga/:ligaId/modulos', async (req, res) => {
    try {
        const { ligaId } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        // Buscar configs existentes para a liga
        const configsExistentes = await ModuleConfig.listarTodosModulos(ligaId, temporada);

        // Mapear configs por modulo
        const configMap = {};
        configsExistentes.forEach(cfg => {
            configMap[cfg.modulo] = cfg;
        });

        // Montar lista completa com todos os modulos disponiveis
        const modulos = MODULOS_DISPONIVEIS.map(moduloId => {
            const regrasJson = getRuleById(moduloId);
            const configDb = configMap[moduloId];

            return {
                id: moduloId,
                nome: regrasJson?.nome || moduloId,
                descricao: regrasJson?.descricao || '',
                tipo: regrasJson?.tipo || 'desconhecido',
                status_json: regrasJson?.status || 'desconhecido',
                ativo: configDb?.ativo ?? false,
                ativado_em: configDb?.ativado_em || null,
                configurado: !!configDb,
                wizard_disponivel: !!regrasJson?.wizard,
                wizard: regrasJson?.wizard || null
            };
        });

        res.json({
            sucesso: true,
            liga_id: ligaId,
            temporada,
            total: modulos.length,
            ativos: modulos.filter(m => m.ativo).length,
            modulos
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao listar modulos:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao listar modulos',
            detalhes: error.message
        });
    }
});

/**
 * GET /api/liga/:ligaId/modulos/:modulo
 * Retorna config detalhada de um modulo especifico
 */
router.get('/liga/:ligaId/modulos/:modulo', async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        // Validar modulo
        if (!MODULOS_DISPONIVEIS.includes(modulo)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Modulo invalido',
                modulos_validos: MODULOS_DISPONIVEIS
            });
        }

        // Buscar regras do JSON
        const regrasJson = getRuleById(modulo);
        if (!regrasJson) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Regras do modulo nao encontradas'
            });
        }

        // Buscar config do banco
        const configDb = await ModuleConfig.buscarConfig(ligaId, modulo, temporada);

        res.json({
            sucesso: true,
            liga_id: ligaId,
            temporada,
            modulo: {
                id: modulo,
                nome: regrasJson.nome,
                descricao: regrasJson.descricao,
                tipo: regrasJson.tipo,
                status_json: regrasJson.status
            },
            config: configDb || {
                ativo: false,
                configurado: false
            },
            regras_default: regrasJson,
            wizard: regrasJson.wizard || null
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao buscar modulo:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar modulo',
            detalhes: error.message
        });
    }
});

// =============================================================================
// ATIVAR / DESATIVAR MODULO
// =============================================================================

/**
 * POST /api/liga/:ligaId/modulos/:modulo/ativar
 * Ativa um modulo para a liga com as configuracoes do wizard
 */
router.post('/liga/:ligaId/modulos/:modulo/ativar', verificarAdmin, async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        const temporada = Number(req.body.temporada) || CURRENT_SEASON;
        const { wizard_respostas, financeiro_override, regras_override } = req.body;

        // Validar modulo
        if (!MODULOS_DISPONIVEIS.includes(modulo)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Modulo invalido',
                modulos_validos: MODULOS_DISPONIVEIS
            });
        }

        // Usuario que está ativando (se autenticado)
        const usuario = req.session?.usuario?.email || 'sistema';

        // Montar config
        const config = {
            wizard_respostas: wizard_respostas || {},
            financeiro_override: financeiro_override || null,
            regras_override: regras_override || null
        };

        // Ativar modulo
        const resultado = await ModuleConfig.ativarModulo(
            ligaId,
            modulo,
            config,
            usuario,
            temporada
        );

        // Propagar ranking_rodada para liga.configuracoes (se aplicável)
        if (modulo === 'ranking_rodada' && wizard_respostas?.valores_manual) {
            await propagarRankingRodadaParaLiga(ligaId, wizard_respostas);
        }

        console.log(`[MODULE-CONFIG] Modulo ${modulo} ativado para liga ${ligaId} por ${usuario}`);

        res.json({
            sucesso: true,
            mensagem: `Modulo ${modulo} ativado com sucesso`,
            config: resultado
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao ativar modulo:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao ativar modulo',
            detalhes: error.message
        });
    }
});

/**
 * POST /api/liga/:ligaId/modulos/:modulo/desativar
 * Desativa um modulo para a liga
 */
router.post('/liga/:ligaId/modulos/:modulo/desativar', verificarAdmin, async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        const temporada = Number(req.body.temporada) || CURRENT_SEASON;

        // Validar modulo
        if (!MODULOS_DISPONIVEIS.includes(modulo)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Modulo invalido'
            });
        }

        // Usuario
        const usuario = req.session?.usuario?.email || 'sistema';

        // Desativar
        const resultado = await ModuleConfig.desativarModulo(
            ligaId,
            modulo,
            usuario,
            temporada
        );

        if (!resultado) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Modulo nao estava configurado'
            });
        }

        console.log(`[MODULE-CONFIG] Modulo ${modulo} desativado para liga ${ligaId} por ${usuario}`);

        res.json({
            sucesso: true,
            mensagem: `Modulo ${modulo} desativado`,
            config: resultado
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao desativar modulo:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao desativar modulo',
            detalhes: error.message
        });
    }
});

// =============================================================================
// ATUALIZAR CONFIGURACAO
// =============================================================================

/**
 * PUT /api/liga/:ligaId/modulos/:modulo/config
 * Atualiza configuracao de um modulo (sem mudar status ativo/inativo)
 */
router.put('/liga/:ligaId/modulos/:modulo/config', verificarAdmin, async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        const temporada = Number(req.body.temporada) || CURRENT_SEASON;
        const { wizard_respostas, financeiro_override, regras_override, calendario_override } = req.body;

        // Validar modulo
        if (!MODULOS_DISPONIVEIS.includes(modulo)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Modulo invalido'
            });
        }

        // Usuario
        const usuario = req.session?.usuario?.email || 'sistema';

        // Atualizar apenas respostas wizard
        if (wizard_respostas) {
            await ModuleConfig.salvarRespostasWizard(
                ligaId,
                modulo,
                wizard_respostas,
                usuario,
                temporada
            );

            // Propagar ranking_rodada para liga.configuracoes
            if (modulo === 'ranking_rodada' && wizard_respostas.valores_manual) {
                await propagarRankingRodadaParaLiga(ligaId, wizard_respostas);
            }
        }

        // Buscar config atualizada
        const configAtualizada = await ModuleConfig.buscarConfig(ligaId, modulo, temporada);

        res.json({
            sucesso: true,
            mensagem: 'Configuracao atualizada',
            config: configAtualizada
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao atualizar config:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao atualizar configuracao',
            detalhes: error.message
        });
    }
});

// =============================================================================
// VERIFICAR STATUS
// =============================================================================

/**
 * GET /api/liga/:ligaId/modulos/:modulo/status
 * Verifica se modulo esta ativo
 */
router.get('/liga/:ligaId/modulos/:modulo/status', async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        const temporada = Number(req.query.temporada) || CURRENT_SEASON;

        const ativo = await ModuleConfig.isModuloAtivo(ligaId, modulo, temporada);

        res.json({
            sucesso: true,
            modulo,
            liga_id: ligaId,
            temporada,
            ativo
        });

    } catch (error) {
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao verificar status',
            detalhes: error.message
        });
    }
});

// =============================================================================
// WIZARD - OBTER PERGUNTAS
// =============================================================================

/**
 * GET /api/modulos/:modulo/wizard
 * Retorna as perguntas do wizard para um modulo
 */
router.get('/modulos/:modulo/wizard', async (req, res) => {
    try {
        const { modulo } = req.params;

        // Validar modulo
        if (!MODULOS_DISPONIVEIS.includes(modulo)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Modulo invalido'
            });
        }

        // Buscar regras do JSON
        const regrasJson = getRuleById(modulo);
        if (!regrasJson) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Regras do modulo nao encontradas'
            });
        }

        if (!regrasJson.wizard) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Modulo nao possui wizard configurado'
            });
        }

        res.json({
            sucesso: true,
            modulo: {
                id: modulo,
                nome: regrasJson.nome,
                descricao: regrasJson.descricao
            },
            wizard: regrasJson.wizard
        });

    } catch (error) {
        console.error('[MODULE-CONFIG] Erro ao buscar wizard:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar wizard',
            detalhes: error.message
        });
    }
});

export default router;
