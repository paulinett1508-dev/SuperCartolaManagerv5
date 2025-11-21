
import express from 'express';
import Liga from '../models/Liga.js';

const router = express.Router();

/**
 * POST /api/participante/auth/login
 * Rota de login de participante
 */
router.post('/login', async (req, res) => {
    try {
        const { timeId, senha } = req.body;

        if (!timeId || !senha) {
            return res.status(400).json({ 
                erro: 'Time ID e senha são obrigatórios' 
            });
        }

        // Buscar todas as ligas onde o participante está inscrito
        const ligas = await Liga.find({
            'participantes.time_id': parseInt(timeId)
        });

        if (!ligas || ligas.length === 0) {
            return res.status(404).json({ 
                erro: 'Time não encontrado em nenhuma liga' 
            });
        }

        // Verificar senha em cada liga
        let ligasAutenticadas = [];
        for (const liga of ligas) {
            const participante = liga.participantes.find(
                p => p.time_id === parseInt(timeId)
            );

            if (participante && participante.senha_acesso === senha) {
                ligasAutenticadas.push({
                    ligaId: liga._id.toString(),
                    ligaNome: liga.nome,
                    participante: participante
                });
            }
        }

        if (ligasAutenticadas.length === 0) {
            return res.status(401).json({ 
                erro: 'Senha incorreta' 
            });
        }

        // Se tem apenas uma liga, logar direto
        if (ligasAutenticadas.length === 1) {
            const { ligaId, participante } = ligasAutenticadas[0];
            
            req.session.participante = {
                timeId: parseInt(timeId),
                ligaId: ligaId,
                nome_cartola: participante.nome_cartola,
                nome_time: participante.nome_time,
                clube_id: participante.clube_id,
                foto_perfil: participante.foto_perfil,
                foto_time: participante.foto_time,
                assinante: participante.assinante
            };

            await req.session.save();

            return res.json({
                success: true,
                participante: req.session.participante,
                message: 'Login realizado com sucesso'
            });
        }

        // Se tem múltiplas ligas, retornar para seleção
        return res.json({
            success: true,
            multiplas_ligas: true,
            ligas: ligasAutenticadas.map(l => ({
                ligaId: l.ligaId,
                ligaNome: l.ligaNome
            })),
            timeId: parseInt(timeId)
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] Erro no login:', error);
        res.status(500).json({ 
            erro: 'Erro ao processar login',
            detalhes: error.message 
        });
    }
});

/**
 * POST /api/participante/auth/select-liga
 * Selecionar liga quando participante está em múltiplas
 */
router.post('/select-liga', async (req, res) => {
    try {
        const { timeId, ligaId, senha } = req.body;

        if (!timeId || !ligaId || !senha) {
            return res.status(400).json({ 
                erro: 'Time ID, Liga ID e senha são obrigatórios' 
            });
        }

        const liga = await Liga.findById(ligaId);

        if (!liga) {
            return res.status(404).json({ 
                erro: 'Liga não encontrada' 
            });
        }

        const participante = liga.participantes.find(
            p => p.time_id === parseInt(timeId)
        );

        if (!participante) {
            return res.status(404).json({ 
                erro: 'Participante não encontrado nesta liga' 
            });
        }

        if (participante.senha_acesso !== senha) {
            return res.status(401).json({ 
                erro: 'Senha incorreta' 
            });
        }

        req.session.participante = {
            timeId: parseInt(timeId),
            ligaId: ligaId,
            nome_cartola: participante.nome_cartola,
            nome_time: participante.nome_time,
            clube_id: participante.clube_id,
            foto_perfil: participante.foto_perfil,
            foto_time: participante.foto_time,
            assinante: participante.assinante
        };

        await req.session.save();

        res.json({
            success: true,
            participante: req.session.participante,
            message: 'Liga selecionada com sucesso'
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] Erro ao selecionar liga:', error);
        res.status(500).json({ 
            erro: 'Erro ao selecionar liga',
            detalhes: error.message 
        });
    }
});

/**
 * GET /api/participante/auth/session
 * Verificar sessão ativa
 */
router.get('/session', async (req, res) => {
    try {
        if (!req.session || !req.session.participante) {
            return res.status(401).json({ 
                autenticado: false,
                erro: 'Sessão não encontrada' 
            });
        }

        const { ligaId, timeId } = req.session.participante;

        // Buscar dados atualizados da liga
        const liga = await Liga.findById(ligaId);

        if (!liga) {
            req.session.destroy();
            return res.status(404).json({ 
                autenticado: false,
                erro: 'Liga não encontrada' 
            });
        }

        const participante = liga.participantes.find(
            p => p.time_id === parseInt(timeId)
        );

        if (!participante) {
            req.session.destroy();
            return res.status(404).json({ 
                autenticado: false,
                erro: 'Participante não encontrado' 
            });
        }

        // Atualizar sessão com dados frescos
        req.session.participante = {
            timeId: parseInt(timeId),
            ligaId: ligaId,
            nome_cartola: participante.nome_cartola,
            nome_time: participante.nome_time,
            clube_id: participante.clube_id,
            foto_perfil: participante.foto_perfil,
            foto_time: participante.foto_time,
            assinante: participante.assinante
        };

        res.json({
            autenticado: true,
            participante: req.session.participante
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] Erro ao verificar sessão:', error);
        res.status(500).json({ 
            autenticado: false,
            erro: 'Erro ao verificar sessão',
            detalhes: error.message 
        });
    }
});

/**
 * POST /api/participante/auth/logout
 * POST /api/auth/logout (compatibilidade)
 * Fazer logout
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('[PARTICIPANTE-AUTH] Erro ao fazer logout:', err);
            return res.status(500).json({ 
                erro: 'Erro ao fazer logout' 
            });
        }
        res.json({ 
            success: true,
            message: 'Logout realizado com sucesso' 
        });
    });
});

export default router;
