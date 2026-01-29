// =====================================================================
// CALENDARIO RODADAS CONTROLLER - v1.0
// Gerencia calendário de jogos por rodada para polling inteligente
// =====================================================================

import CalendarioRodada from '../models/CalendarioRodada.js';

// =====================================================================
// GET /api/calendario-rodadas/:temporada/:rodada
// Buscar calendário de uma rodada específica
// =====================================================================
export const buscarCalendario = async (req, res) => {
    try {
        const { temporada, rodada } = req.params;

        const calendario = await CalendarioRodada.findOne({
            temporada: Number(temporada),
            rodada: Number(rodada)
        });

        if (!calendario) {
            return res.status(404).json({
                success: false,
                message: 'Calendário não encontrado para esta rodada'
            });
        }

        // Calcular informações úteis
        const temJogosAoVivo = calendario.temJogosAoVivo();
        const proximoJogo = calendario.obterProximoJogo();
        const proximoDisparo = calendario.calcularProximoDisparo();

        res.json({
            success: true,
            calendario: {
                temporada: calendario.temporada,
                rodada: calendario.rodada,
                partidas: calendario.partidas,
                atualizado_em: calendario.atualizado_em,
                fonte_principal: calendario.fonte_principal
            },
            status: {
                tem_jogos_ao_vivo: temJogosAoVivo,
                proximo_jogo: proximoJogo,
                proximo_disparo: proximoDisparo,
                deve_ativar_polling: temJogosAoVivo || (proximoDisparo && proximoDisparo <= new Date())
            }
        });
    } catch (error) {
        console.error('[CALENDARIO-CONTROLLER] Erro ao buscar calendário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar calendário',
            error: error.message
        });
    }
};

// =====================================================================
// GET /api/calendario-rodadas/:temporada/:rodada/status
// Verificar apenas status (sem retornar partidas)
// =====================================================================
export const verificarStatus = async (req, res) => {
    try {
        const { temporada, rodada } = req.params;

        const calendario = await CalendarioRodada.findOne({
            temporada: Number(temporada),
            rodada: Number(rodada)
        });

        if (!calendario) {
            return res.json({
                success: true,
                existe: false,
                deve_ativar_polling: false
            });
        }

        const temJogosAoVivo = calendario.temJogosAoVivo();
        const proximoJogo = calendario.obterProximoJogo();
        const proximoDisparo = calendario.calcularProximoDisparo();

        res.json({
            success: true,
            existe: true,
            temporada: calendario.temporada,
            rodada: calendario.rodada,
            tem_jogos_ao_vivo: temJogosAoVivo,
            proximo_jogo: proximoJogo ? {
                data: proximoJogo.data,
                horario: proximoJogo.horario,
                time_casa: proximoJogo.time_casa,
                time_fora: proximoJogo.time_fora
            } : null,
            proximo_disparo: proximoDisparo,
            deve_ativar_polling: temJogosAoVivo || (proximoDisparo && proximoDisparo <= new Date()),
            atualizado_em: calendario.atualizado_em
        });
    } catch (error) {
        console.error('[CALENDARIO-CONTROLLER] Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar status',
            error: error.message
        });
    }
};

// =====================================================================
// POST /api/calendario-rodadas/:temporada/:rodada
// Criar ou atualizar calendário (ADMIN)
// =====================================================================
export const salvarCalendario = async (req, res) => {
    try {
        const { temporada, rodada } = req.params;
        const { partidas, fonte_principal } = req.body;

        if (!Array.isArray(partidas) || partidas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Partidas inválidas ou vazias'
            });
        }

        // Validar estrutura das partidas
        const partidasValidas = partidas.every(p =>
            p.data && p.horario && p.time_casa && p.time_fora
        );

        if (!partidasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Partidas com campos obrigatórios faltando'
            });
        }

        const calendario = await CalendarioRodada.findOneAndUpdate(
            { temporada: Number(temporada), rodada: Number(rodada) },
            {
                temporada: Number(temporada),
                rodada: Number(rodada),
                partidas,
                fonte_principal: fonte_principal || 'manual',
                atualizado_em: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Calendário salvo com sucesso',
            calendario: {
                temporada: calendario.temporada,
                rodada: calendario.rodada,
                total_partidas: calendario.partidas.length
            }
        });
    } catch (error) {
        console.error('[CALENDARIO-CONTROLLER] Erro ao salvar calendário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar calendário',
            error: error.message
        });
    }
};

// =====================================================================
// PUT /api/calendario-rodadas/:temporada/:rodada/partida/:index/status
// Atualizar status de uma partida específica
// =====================================================================
export const atualizarStatusPartida = async (req, res) => {
    try {
        const { temporada, rodada, index } = req.params;
        const { status } = req.body;

        const statusValidos = ['agendado', 'ao_vivo', 'encerrado', 'adiado', 'cancelado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }

        const calendario = await CalendarioRodada.findOne({
            temporada: Number(temporada),
            rodada: Number(rodada)
        });

        if (!calendario) {
            return res.status(404).json({
                success: false,
                message: 'Calendário não encontrado'
            });
        }

        const partidaIndex = Number(index);
        if (partidaIndex < 0 || partidaIndex >= calendario.partidas.length) {
            return res.status(400).json({
                success: false,
                message: 'Índice de partida inválido'
            });
        }

        calendario.partidas[partidaIndex].status = status;
        calendario.atualizado_em = new Date();
        await calendario.save();

        res.json({
            success: true,
            message: 'Status da partida atualizado',
            partida: calendario.partidas[partidaIndex]
        });
    } catch (error) {
        console.error('[CALENDARIO-CONTROLLER] Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status',
            error: error.message
        });
    }
};

export default {
    buscarCalendario,
    verificarStatus,
    salvarCalendario,
    atualizarStatusPartida
};
