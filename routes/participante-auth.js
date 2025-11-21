import express from 'express';
import Liga from '../models/Liga.js';

const router = express.Router();

/**
 * POST /api/participante/auth/login
 * Rota de login de participante
 * Fluxo: valida credenciais e loga direto na primeira liga encontrada
 */
router.post('/login', async (req, res) => {
    console.log('[PARTICIPANTE-AUTH] ========================================');
    console.log('[PARTICIPANTE-AUTH] Requisição de login recebida');
    
    try {
        const { timeId, senha } = req.body;
        console.log('[PARTICIPANTE-AUTH] Body:', { timeId, senhaLength: senha?.length });

        if (!timeId || !senha) {
            console.log('[PARTICIPANTE-AUTH] ❌ Campos obrigatórios faltando');
            return res.status(400).json({ 
                success: false,
                erro: 'Time ID e senha são obrigatórios' 
            });
        }
        
        console.log('[PARTICIPANTE-AUTH] 🔍 Buscando ligas para timeId:', timeId);

        // Buscar todas as ligas onde o participante está inscrito
        const ligas = await Liga.find({ 
            'participantes.time_id': parseInt(timeId) 
        }).lean();

        console.log('[PARTICIPANTE-AUTH] ✅ Ligas encontradas:', ligas?.length || 0);

        if (!ligas || ligas.length === 0) {
            console.log('[PARTICIPANTE-AUTH] Nenhuma liga encontrada para o time');
            return res.status(404).json({ 
                success: false,
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

        console.log('[PARTICIPANTE-AUTH] Ligas autenticadas:', ligasAutenticadas.length);

        if (ligasAutenticadas.length === 0) {
            console.log('[PARTICIPANTE-AUTH] Senha incorreta');
            return res.status(401).json({ 
                erro: 'Senha incorreta' 
            });
        }

        // Criar sessão com a primeira liga encontrada
        const { ligaId, participante } = ligasAutenticadas[0];
        
        console.log('[PARTICIPANTE-AUTH] Criando sessão para:', { timeId, ligaId });

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
        
        console.log('[PARTICIPANTE-AUTH] Sessão criada com sucesso');
        console.log('[PARTICIPANTE-AUTH] Login bem-sucedido para time:', timeId);

        return res.json({
            success: true,
            participante: req.session.participante,
            message: 'Login realizado com sucesso'
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] ❌❌❌ ERRO CRÍTICO NO LOGIN ❌❌❌');
        console.error('[PARTICIPANTE-AUTH] Tipo:', error.name);
        console.error('[PARTICIPANTE-AUTH] Mensagem:', error.message);
        console.error('[PARTICIPANTE-AUTH] Stack:', error.stack);
        
        // Garantir que não enviamos resposta duplicada
        if (res.headersSent) {
            console.error('[PARTICIPANTE-AUTH] Headers já enviados, não posso responder');
            return;
        }
        
        // Sempre retornar JSON válido
        res.status(500).json({ 
            success: false,
            erro: 'Erro ao processar login',
            detalhes: error.message
        });
    }
});

/**
 * GET /api/participante/auth/ligas
 * Listar todas as ligas onde o participante está inscrito
 */
router.get('/ligas', async (req, res) => {
    try {
        if (!req.session || !req.session.participante) {
            return res.status(401).json({ 
                erro: 'Não autenticado' 
            });
        }

        const { timeId } = req.session.participante;

        // Buscar todas as ligas onde o participante está inscrito
        const ligas = await Liga.find({
            'participantes.time_id': parseInt(timeId)
        });

        const ligasDisponiveis = ligas.map(liga => ({
            ligaId: liga._id.toString(),
            ligaNome: liga.nome,
            isAtual: liga._id.toString() === req.session.participante.ligaId
        }));

        res.json({
            success: true,
            ligas: ligasDisponiveis
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] Erro ao listar ligas:', error);
        res.status(500).json({ 
            erro: 'Erro ao listar ligas',
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
                authenticated: false,
                erro: 'Sessão não encontrada' 
            });
        }

        const { ligaId, timeId } = req.session.participante;

        // Buscar dados atualizados da liga
        const liga = await Liga.findById(ligaId);

        if (!liga) {
            req.session.destroy();
            return res.status(404).json({ 
                authenticated: false,
                erro: 'Liga não encontrada' 
            });
        }

        const participante = liga.participantes.find(
            p => p.time_id === parseInt(timeId)
        );

        if (!participante) {
            req.session.destroy();
            return res.status(404).json({ 
                authenticated: false,
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
            authenticated: true,
            participante: req.session.participante
        });

    } catch (error) {
        console.error('[PARTICIPANTE-AUTH] Erro ao verificar sessão:', error);
        res.status(500).json({ 
            authenticated: false,
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