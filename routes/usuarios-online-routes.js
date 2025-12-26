/**
 * Rotas de Usuários Online v2.0
 * Endpoint para admin monitorar usuários ativos no app
 * e histórico de acessos (24h, semana, mês, temporada)
 */

import express from 'express';
import UserActivity from '../models/UserActivity.js';
import AccessLog from '../models/AccessLog.js';
import { verificarAdmin } from '../middleware/auth.js';

// Constantes de períodos
const PERIODOS = {
    '24h': 1,
    'semana': 7,
    'mes': 30,
    'temporada': 365
};

const router = express.Router();

/**
 * Formata tempo relativo no formato dd:hh:mm:ss
 * Ex: "0d 02:15:30" ou "3d 14:22:05"
 */
function formatarTempoRelativo(data) {
    const agora = Date.now();
    const diff = agora - new Date(data).getTime();

    if (diff < 1000) return 'agora';

    const totalSegundos = Math.floor(diff / 1000);
    const dias = Math.floor(totalSegundos / 86400);
    const horas = Math.floor((totalSegundos % 86400) / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (dias > 0) {
        return `${dias}d ${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    }
    return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
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

/**
 * GET /api/admin/usuarios-online/dashboard
 * Retorna estatísticas completas para dashboard de acessos
 * Inclui: 24h, semana, mês e temporada
 */
router.get('/dashboard', verificarAdmin, async (req, res) => {
    try {
        const ligaFiltro = req.query.liga || null;

        // Calcular estatísticas para cada período
        const estatisticas = {};

        for (const [periodo, dias] of Object.entries(PERIODOS)) {
            const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

            const matchStage = { data_acesso: { $gte: dataLimite } };
            if (ligaFiltro) matchStage.liga_id = ligaFiltro;

            // Total de acessos no período
            const totalAcessos = await AccessLog.countDocuments(matchStage);

            // Usuários únicos no período
            const usuariosUnicos = await AccessLog.distinct('time_id', matchStage);

            // Acessos por dia (para gráfico)
            const acessosPorDia = await AccessLog.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$data_acesso' }
                        },
                        acessos: { $sum: 1 },
                        usuarios: { $addToSet: '$time_id' }
                    }
                },
                {
                    $project: {
                        data: '$_id',
                        acessos: 1,
                        usuarios_unicos: { $size: '$usuarios' }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            estatisticas[periodo] = {
                total_acessos: totalAcessos,
                usuarios_unicos: usuariosUnicos.length,
                media_diaria: dias > 0 ? Math.round(totalAcessos / dias) : totalAcessos,
                por_dia: acessosPorDia
            };
        }

        // Top 10 usuários mais ativos (último mês)
        const topUsuarios = await AccessLog.aggregate([
            {
                $match: {
                    data_acesso: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    ...(ligaFiltro ? { liga_id: ligaFiltro } : {})
                }
            },
            {
                $group: {
                    _id: '$time_id',
                    nome_cartola: { $first: '$nome_cartola' },
                    nome_time: { $first: '$nome_time' },
                    escudo: { $first: '$escudo' },
                    liga_nome: { $first: '$liga_nome' },
                    total_acessos: { $sum: 1 },
                    ultimo_acesso: { $max: '$data_acesso' }
                }
            },
            { $sort: { total_acessos: -1 } },
            { $limit: 10 }
        ]);

        // Acessos por hora do dia (padrão de uso)
        const acessosPorHora = await AccessLog.aggregate([
            {
                $match: {
                    data_acesso: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    ...(ligaFiltro ? { liga_id: ligaFiltro } : {})
                }
            },
            {
                $group: {
                    _id: { $hour: '$data_acesso' },
                    acessos: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Acessos por dia da semana
        const acessosPorDiaSemana = await AccessLog.aggregate([
            {
                $match: {
                    data_acesso: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    ...(ligaFiltro ? { liga_id: ligaFiltro } : {})
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$data_acesso' },
                    acessos: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        res.json({
            success: true,
            estatisticas,
            top_usuarios: topUsuarios.map(u => ({
                time_id: u._id,
                nome_cartola: u.nome_cartola || 'Participante',
                nome_time: u.nome_time || '',
                escudo: u.escudo || '',
                liga_nome: u.liga_nome || '',
                total_acessos: u.total_acessos,
                ultimo_acesso: u.ultimo_acesso,
                ultimo_acesso_relativo: formatarTempoRelativo(u.ultimo_acesso)
            })),
            padroes: {
                por_hora: acessosPorHora.map(h => ({
                    hora: h._id,
                    label: `${String(h._id).padStart(2, '0')}:00`,
                    acessos: h.acessos
                })),
                por_dia_semana: acessosPorDiaSemana.map(d => ({
                    dia: d._id,
                    label: diasSemana[d._id - 1] || 'N/A',
                    acessos: d.acessos
                }))
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro dashboard:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar dashboard de acessos',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/usuarios-online/usuario/:timeId
 * Retorna histórico detalhado de um usuário específico
 */
router.get('/usuario/:timeId', verificarAdmin, async (req, res) => {
    try {
        const timeId = parseInt(req.params.timeId);
        const dias = parseInt(req.query.dias) || 30;

        if (isNaN(timeId)) {
            return res.status(400).json({
                success: false,
                error: 'ID do time inválido'
            });
        }

        const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

        // Buscar todos os acessos do usuário
        const acessos = await AccessLog.find({
            time_id: timeId,
            data_acesso: { $gte: dataLimite }
        }).sort({ data_acesso: -1 });

        // Estatísticas do usuário
        const totalAcessos = acessos.length;
        const primeiroAcesso = acessos.length > 0 ? acessos[acessos.length - 1].data_acesso : null;
        const ultimoAcesso = acessos.length > 0 ? acessos[0].data_acesso : null;

        // Agrupar por dia
        const acessosPorDia = {};
        acessos.forEach(a => {
            const dia = a.data_acesso.toISOString().split('T')[0];
            acessosPorDia[dia] = (acessosPorDia[dia] || 0) + 1;
        });

        // Dispositivos usados
        const dispositivos = [...new Set(acessos.map(a => a.dispositivo))];

        // Info do usuário
        const infoUsuario = acessos.length > 0 ? {
            nome_cartola: acessos[0].nome_cartola,
            nome_time: acessos[0].nome_time,
            escudo: acessos[0].escudo,
            liga_nome: acessos[0].liga_nome,
            liga_id: acessos[0].liga_id
        } : null;

        res.json({
            success: true,
            time_id: timeId,
            usuario: infoUsuario,
            estatisticas: {
                total_acessos: totalAcessos,
                primeiro_acesso: primeiroAcesso,
                ultimo_acesso: ultimoAcesso,
                ultimo_acesso_relativo: ultimoAcesso ? formatarTempoRelativo(ultimoAcesso) : null,
                dispositivos,
                dias_ativos: Object.keys(acessosPorDia).length,
                media_acessos_por_dia: Object.keys(acessosPorDia).length > 0
                    ? Math.round(totalAcessos / Object.keys(acessosPorDia).length)
                    : 0
            },
            acessos_por_dia: Object.entries(acessosPorDia).map(([data, count]) => ({
                data,
                acessos: count
            })).sort((a, b) => b.data.localeCompare(a.data)),
            ultimos_acessos: acessos.slice(0, 20).map(a => ({
                data: a.data_acesso,
                dispositivo: a.dispositivo,
                modulo: a.modulo_entrada
            })),
            periodo: { dias },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[UsuariosOnline] Erro usuario:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar histórico do usuário',
            message: error.message
        });
    }
});

export default router;
