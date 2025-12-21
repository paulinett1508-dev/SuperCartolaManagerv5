/**
 * Rotas de Usuários Online v1.1
 * Endpoint para admin monitorar usuários ativos no app
 * e histórico de acessos dos últimos 30 dias
 */

import express from 'express';
import UserActivity from '../models/UserActivity.js';
import AccessLog from '../models/AccessLog.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Formata tempo relativo (ex: "2 min atrás", "agora")
 */
function formatarTempoRelativo(data) {
    const agora = Date.now();
    const diff = agora - new Date(data).getTime();
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);

    if (minutos < 1) return 'agora';
    if (minutos === 1) return '1 min atrás';
    if (minutos < 60) return `${minutos} min atrás`;

    const horas = Math.floor(minutos / 60);
    if (horas === 1) return '1 hora atrás';
    return `${horas} horas atrás`;
}

/**
 * GET /api/admin/usuarios-online
 * Retorna lista de usuários online (últimos 5 minutos por padrão)
 *
 * Query params:
 *   - minutos: tempo de inatividade para considerar offline (default: 5)
 *   - liga: filtrar por liga_id específica
 */
router.get('/', verificarAdmin, async (req, res) => {
    try {
        const minutos = parseInt(req.query.minutos) || 5;
        const ligaFiltro = req.query.liga;

        // Buscar usuários online
        let usuarios = await UserActivity.getUsuariosOnline(minutos);

        // Filtrar por liga se especificado
        if (ligaFiltro) {
            usuarios = usuarios.filter(u => u.liga_id === ligaFiltro);
        }

        // Formatar resposta
        const usuariosFormatados = usuarios.map(u => ({
            time_id: u.time_id,
            nome_time: u.nome_time || 'Time',
            nome_cartola: u.nome_cartola || '',
            escudo: u.escudo || '',
            liga_id: u.liga_id,
            liga_nome: u.liga_nome || 'Liga',
            ultimo_acesso: u.ultimo_acesso,
            tempo_online: formatarTempoRelativo(u.ultimo_acesso),
            modulo_atual: u.modulo_atual || 'home',
            dispositivo: u.dispositivo || 'Mobile'
        }));

        res.json({
            success: true,
            total: usuariosFormatados.length,
            minutos_considerados: minutos,
            timestamp: new Date().toISOString(),
            usuarios: usuariosFormatados
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar usuários online',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/usuarios-online/stats
 * Retorna estatísticas agregadas de usuários online
 */
router.get('/stats', verificarAdmin, async (req, res) => {
    try {
        const minutos = parseInt(req.query.minutos) || 5;

        // Buscar contagem por liga
        const porLiga = await UserActivity.contarOnlinePorLiga(minutos);

        // Buscar total geral
        const usuarios = await UserActivity.getUsuariosOnline(minutos);

        // Contar por dispositivo
        const porDispositivo = usuarios.reduce((acc, u) => {
            acc[u.dispositivo] = (acc[u.dispositivo] || 0) + 1;
            return acc;
        }, {});

        // Contar por módulo
        const porModulo = usuarios.reduce((acc, u) => {
            acc[u.modulo_atual] = (acc[u.modulo_atual] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            total: usuarios.length,
            minutos_considerados: minutos,
            timestamp: new Date().toISOString(),
            por_liga: porLiga,
            por_dispositivo: porDispositivo,
            por_modulo: porModulo
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro stats:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas'
        });
    }
});

/**
 * GET /api/admin/usuarios-online/historico
 * Retorna histórico de acessos agrupado por usuário (últimos 30 dias)
 *
 * Query params:
 *   - liga: filtrar por liga_id específica
 *   - dias: período em dias (default: 30)
 *   - page: página (default: 1)
 *   - limit: itens por página (default: 50)
 */
router.get('/historico', verificarAdmin, async (req, res) => {
    try {
        const ligaFiltro = req.query.liga || null;
        const dias = parseInt(req.query.dias) || 30;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Buscar histórico agrupado
        const resultado = await AccessLog.getHistoricoAgrupado(
            { liga_id: ligaFiltro, dias },
            { page, limit }
        );

        // Formatar tempo relativo para cada usuário
        const usuariosFormatados = resultado.usuarios.map(u => ({
            ...u,
            ultimo_acesso_relativo: formatarTempoRelativo(u.ultimo_acesso)
        }));

        res.json({
            success: true,
            ...resultado,
            usuarios: usuariosFormatados,
            periodo: {
                dias,
                inicio: new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString(),
                fim: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro historico:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar histórico de acessos',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/usuarios-online/ligas
 * Retorna lista de ligas com acessos no período
 *
 * Query params:
 *   - dias: período em dias (default: 30)
 */
router.get('/ligas', verificarAdmin, async (req, res) => {
    try {
        const dias = parseInt(req.query.dias) || 30;

        const ligas = await AccessLog.getLigasComAcessos(dias);

        res.json({
            success: true,
            total: ligas.length,
            dias,
            ligas,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro ligas:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar ligas com acessos'
        });
    }
});

export default router;
