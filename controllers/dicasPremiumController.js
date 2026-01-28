/**
 * DICAS PREMIUM CONTROLLER v1.0
 * Endpoints da API para o modulo Dicas Premium
 *
 * ACESSO: Exclusivo para participantes com premium: true
 * (Nao confundir com assinante Cartola FC da Globo)
 */

import dicasPremiumService from '../services/dicasPremiumService.js';
import { verificarParticipantePremium } from '../utils/premium-participante.js';

/**
 * Verifica se o participante logado e premium
 * @returns {Object} { isPremium, participante, error }
 */
async function verificarAcessoPremium(req) {
    const acesso = await verificarParticipantePremium(req);

    if (!acesso.isPremium) {
        return {
            isPremium: false,
            error: acesso.error || 'Acesso exclusivo para participantes Premium',
            code: acesso.code || 403,
            participante: acesso.participante
        };
    }

    return { isPremium: true, participante: acesso.participante };
}

/**
 * GET /api/dicas-premium/jogadores
 * Lista jogadores com filtros
 * ACESSO: Premium only
 */
export async function listarJogadores(req, res) {
    try {
        // Verificar acesso premium
        const acesso = await verificarAcessoPremium(req);
        if (!acesso.isPremium) {
            return res.status(acesso.code).json({
                sucesso: false,
                erro: acesso.error,
                premium: false
            });
        }

        const filtros = {
            posicao: req.query.posicao,
            precoMin: req.query.precoMin,
            precoMax: req.query.precoMax,
            mando: req.query.mando,
            ordem: req.query.ordem || 'media',
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        console.log('[DICAS-PREMIUM] Buscando jogadores com filtros:', filtros);

        const resultado = await dicasPremiumService.buscarJogadores(filtros);

        res.json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao listar jogadores:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar jogadores',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/jogador/:id
 * Detalhes de um jogador especifico
 * ACESSO: Premium only
 */
export async function obterJogador(req, res) {
    try {
        // Verificar acesso premium
        const acesso = await verificarAcessoPremium(req);
        if (!acesso.isPremium) {
            return res.status(acesso.code).json({
                sucesso: false,
                erro: acesso.error,
                premium: false
            });
        }

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                sucesso: false,
                erro: 'ID do jogador e obrigatorio'
            });
        }

        const jogador = await dicasPremiumService.buscarJogador(id);

        if (!jogador) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Jogador nao encontrado'
            });
        }

        res.json({
            sucesso: true,
            jogador
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao obter jogador:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar jogador',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/confrontos
 * Pontuacao cedida por times
 * ACESSO: Premium only
 */
export async function listarConfrontos(req, res) {
    try {
        // Verificar acesso premium
        const acesso = await verificarAcessoPremium(req);
        if (!acesso.isPremium) {
            return res.status(acesso.code).json({
                sucesso: false,
                erro: acesso.error,
                premium: false
            });
        }

        const posicao = parseInt(req.query.posicao) || 5; // Default: Atacantes
        const periodo = parseInt(req.query.periodo) || 5; // Default: 5 rodadas

        const confrontos = await dicasPremiumService.buscarPontuacaoCedida(posicao, periodo);

        res.json({
            sucesso: true,
            confrontos,
            posicao,
            periodo
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao listar confrontos:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar confrontos',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/calculadora-mpv
 * Calcula MPV e tabela de valorizacao
 * ACESSO: Premium only
 */
export async function calcularMPV(req, res) {
    try {
        // Verificar acesso premium
        const acesso = await verificarAcessoPremium(req);
        if (!acesso.isPremium) {
            return res.status(acesso.code).json({
                sucesso: false,
                erro: acesso.error,
                premium: false
            });
        }

        const preco = parseFloat(req.query.preco);

        if (!preco || preco <= 0) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Preco invalido'
            });
        }

        const mpv = dicasPremiumService.calcularMPV(preco);
        const tabela = dicasPremiumService.calcularTabelaValorizacao(preco);

        res.json({
            sucesso: true,
            preco,
            mpv,
            tabela
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao calcular MPV:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao calcular MPV',
            mensagem: error.message
        });
    }
}

/**
 * POST /api/dicas-premium/sugestao
 * Gera sugestao de escalacao otimizada
 * ACESSO: Premium only
 */
export async function gerarSugestao(req, res) {
    try {
        // Verificar acesso premium
        const acesso = await verificarAcessoPremium(req);
        if (!acesso.isPremium) {
            return res.status(acesso.code).json({
                sucesso: false,
                erro: acesso.error,
                premium: false
            });
        }

        const { patrimonio, pesoValorizacao = 50 } = req.body;

        if (!patrimonio || patrimonio <= 0) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Patrimonio invalido'
            });
        }

        if (patrimonio < 50) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Patrimonio minimo de C$ 50.00 para gerar sugestao'
            });
        }

        console.log('[DICAS-PREMIUM] Gerando sugestao:', { patrimonio, pesoValorizacao });

        const sugestao = await dicasPremiumService.gerarSugestaoEscalacao(
            parseFloat(patrimonio),
            parseInt(pesoValorizacao)
        );

        res.json({
            sucesso: true,
            ...sugestao
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao gerar sugestao:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao gerar sugestao',
            mensagem: error.message
        });
    }
}

export default {
    listarJogadores,
    obterJogador,
    listarConfrontos,
    calcularMPV,
    gerarSugestao
};
