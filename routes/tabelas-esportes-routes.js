// =====================================================================
// TABELAS ESPORTES ROUTES - v1.0
// Rotas para seção "Tabelas" na home do participante
// - Brasileirão: jogos da rodada atual
// - Jogos do meu time: próximos jogos filtrados por clube
// =====================================================================

import express from 'express';

const router = express.Router();

// Cache simples em memória
let cacheBrasileirao = null;
let cacheBrasileiraoTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * GET /api/tabelas/brasileirao-rodada
 * Retorna jogos da rodada atual do Brasileirão Série A
 * Fonte: reutiliza /api/jogos-ao-vivo (SoccerDataAPI)
 */
router.get('/brasileirao-rodada', async (req, res) => {
    try {
        const agora = Date.now();

        // Cache válido?
        if (cacheBrasileirao && (agora - cacheBrasileiraoTimestamp) < CACHE_TTL) {
            return res.json({
                ...cacheBrasileirao,
                cache: true
            });
        }

        // Buscar jogos do dia via endpoint interno
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const response = await fetch(`${baseUrl}/api/jogos-ao-vivo`);

        if (!response.ok) {
            return res.json({
                jogos: [],
                rodada: null,
                mensagem: 'Sem dados disponíveis no momento',
                fonte: 'indisponivel'
            });
        }

        const data = await response.json();
        const todosJogos = data.jogos || [];

        // Filtrar apenas Brasileirão Série A
        const jogosBrasileirao = todosJogos.filter(j => {
            const liga = (j.liga || j.campeonato || '').toLowerCase();
            return liga.includes('brasileirão a') ||
                   liga.includes('serie a') ||
                   liga.includes('série a') ||
                   liga === 'brasileirão a';
        });

        const resultado = {
            jogos: jogosBrasileirao.map(j => ({
                id: j.id,
                mandante: j.mandante,
                visitante: j.visitante,
                golsMandante: j.golsMandante || 0,
                golsVisitante: j.golsVisitante || 0,
                horario: j.horario || '--:--',
                status: j.status,
                statusRaw: j.statusRaw,
                estadio: j.estadio,
                tempo: j.tempo
            })),
            total: jogosBrasileirao.length,
            fonte: data.fonte,
            mensagem: jogosBrasileirao.length > 0
                ? `${jogosBrasileirao.length} jogos do Brasileirão hoje`
                : 'Nenhum jogo do Brasileirão hoje'
        };

        // Atualizar cache
        cacheBrasileirao = resultado;
        cacheBrasileiraoTimestamp = agora;

        return res.json(resultado);
    } catch (err) {
        console.error('[TABELAS] Erro ao buscar Brasileirão:', err.message);
        return res.status(500).json({
            jogos: [],
            erro: 'Erro ao buscar dados do Brasileirão'
        });
    }
});

/**
 * GET /api/tabelas/jogos-meu-time/:clubeNome
 * Retorna jogos do dia filtrados pelo nome do clube
 * Fonte: reutiliza /api/jogos-ao-vivo (SoccerDataAPI)
 */
router.get('/jogos-meu-time/:clubeNome', async (req, res) => {
    try {
        const clubeNome = decodeURIComponent(req.params.clubeNome).toLowerCase();

        if (!clubeNome || clubeNome.length < 2) {
            return res.json({
                jogos: [],
                mensagem: 'Nome do clube inválido'
            });
        }

        // Buscar jogos do dia via endpoint interno
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const response = await fetch(`${baseUrl}/api/jogos-ao-vivo`);

        if (!response.ok) {
            return res.json({
                jogos: [],
                mensagem: 'Sem dados disponíveis'
            });
        }

        const data = await response.json();
        const todosJogos = data.jogos || [];

        // Filtrar jogos do clube (mandante ou visitante)
        const jogosMeuTime = todosJogos.filter(j => {
            const mandante = (j.mandante || '').toLowerCase();
            const visitante = (j.visitante || '').toLowerCase();
            return mandante.includes(clubeNome) || visitante.includes(clubeNome);
        });

        return res.json({
            jogos: jogosMeuTime.map(j => ({
                id: j.id,
                mandante: j.mandante,
                visitante: j.visitante,
                golsMandante: j.golsMandante || 0,
                golsVisitante: j.golsVisitante || 0,
                horario: j.horario || '--:--',
                status: j.status,
                statusRaw: j.statusRaw,
                campeonato: j.liga || j.campeonato,
                estadio: j.estadio,
                tempo: j.tempo
            })),
            total: jogosMeuTime.length,
            clube: clubeNome,
            fonte: data.fonte,
            mensagem: jogosMeuTime.length > 0
                ? `${jogosMeuTime.length} jogo(s) de ${clubeNome} hoje`
                : `Nenhum jogo de ${clubeNome} hoje`
        });
    } catch (err) {
        console.error('[TABELAS] Erro ao buscar jogos do time:', err.message);
        return res.status(500).json({
            jogos: [],
            erro: 'Erro ao buscar jogos do time'
        });
    }
});

export default router;
