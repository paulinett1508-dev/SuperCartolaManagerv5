// routes/jogos-hoje-routes.js
// v1.1 - Jogos do dia com mock para premium
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Campeonato Brasileiro Série A (BSA)
const COMPETICAO_ID = 'BSA';

// Participantes premium que podem ver jogos (mesmo mock)
const PREMIUM_TIME_IDS = [13935277]; // Paulinett Miranda

// Jogos mock para pré-temporada
const JOGOS_MOCK = [
    { mandante: 'Flamengo', visitante: 'Botafogo', horario: '16:00', status: 'Em breve', placar: '-' },
    { mandante: 'Palmeiras', visitante: 'São Paulo', horario: '18:30', status: 'Em breve', placar: '-' },
    { mandante: 'Corinthians', visitante: 'Santos', horario: '21:00', status: 'Em breve', placar: '-' },
];

router.get('/', async (req, res) => {
    try {
        const timeId = Number(req.query.timeId);
        const isPremium = PREMIUM_TIME_IDS.includes(timeId);

        // Buscar jogos reais da API
        const dataHoje = new Date().toISOString().split('T')[0];
        const url = `https://api.football-data.org/v4/competitions/${COMPETICAO_ID}/matches?dateFrom=${dataHoje}&dateTo=${dataHoje}`;

        let jogos = [];
        try {
            const response = await fetch(url, {
                headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || 'cc99ba935fe4423fa2c3e46b5de636df' },
                timeout: 5000
            });
            const data = await response.json();
            jogos = (data.matches || []).map(f => ({
                mandante: f.homeTeam.shortName || f.homeTeam.name,
                visitante: f.awayTeam.shortName || f.awayTeam.name,
                horario: f.utcDate ? new Date(f.utcDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
                status: f.status === 'LIVE' ? 'Ao vivo' : (f.status === 'FINISHED' ? 'Encerrado' : 'Em breve'),
                placar: f.status === 'FINISHED' || f.status === 'LIVE'
                    ? `${f.score.fullTime.home ?? 0} x ${f.score.fullTime.away ?? 0}`
                    : '-'
            }));
        } catch (apiErr) {
            console.log('[JOGOS-HOJE] API indisponível, usando fallback');
        }

        // Se não tem jogos reais e é premium, usar mock
        if (jogos.length === 0 && isPremium) {
            jogos = JOGOS_MOCK;
        }

        // Se não é premium e não tem jogos reais, retorna vazio
        if (!isPremium && jogos.length === 0) {
            return res.json({ jogos: [], premium: false });
        }

        res.json({
            jogos,
            premium: isPremium,
            fonte: jogos === JOGOS_MOCK ? 'mock' : 'api',
            data: dataHoje
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar jogos do dia', detalhes: err.message });
    }
});

export default router;
