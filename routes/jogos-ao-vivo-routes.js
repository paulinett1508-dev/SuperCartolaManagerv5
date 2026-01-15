// routes/jogos-ao-vivo-routes.js
// v1.0 - Jogos ao vivo usando API-Football (api-sports.io)
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// IDs de ligas brasileiras na API-Football
const LIGAS_BRASIL = {
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  475: 'Carioca',
  76: 'Paulista',
  629: 'Copa Verde',
  630: 'Copa do Nordeste',
  618: 'Copinha'
};

// Cache em memória (5 minutos)
let cacheJogosAoVivo = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Path do scraper Globo (fallback)
const GLOBO_CACHE_PATH = path.join(process.cwd(), 'data', 'jogos-globo.json');

/**
 * Busca jogos ao vivo da API-Football
 */
async function buscarJogosAoVivo() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn('[JOGOS-AO-VIVO] API_FOOTBALL_KEY não configurada');
    return [];
  }

  try {
    const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[JOGOS-AO-VIVO] Erro API:', data.errors);
      return [];
    }

    // Filtrar apenas jogos do Brasil
    const jogosBrasil = (data.response || []).filter(jogo =>
      LIGAS_BRASIL[jogo.league?.id]
    );

    return jogosBrasil.map(jogo => ({
      id: jogo.fixture.id,
      mandante: jogo.teams.home.name,
      visitante: jogo.teams.away.name,
      logoMandante: jogo.teams.home.logo,
      logoVisitante: jogo.teams.away.logo,
      placar: `${jogo.goals.home ?? 0} x ${jogo.goals.away ?? 0}`,
      tempo: jogo.fixture.status.elapsed ? `${jogo.fixture.status.elapsed}'` : '',
      status: mapearStatus(jogo.fixture.status.short),
      statusRaw: jogo.fixture.status.short,
      liga: LIGAS_BRASIL[jogo.league.id] || jogo.league.name,
      ligaLogo: jogo.league.logo,
      horario: new Date(jogo.fixture.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      })
    }));
  } catch (err) {
    console.error('[JOGOS-AO-VIVO] Erro ao buscar:', err.message);
    return [];
  }
}

/**
 * Mapeia status da API para texto amigável
 */
function mapearStatus(status) {
  const mapa = {
    '1H': 'Ao vivo - 1º tempo',
    '2H': 'Ao vivo - 2º tempo',
    'HT': 'Intervalo',
    'ET': 'Prorrogação',
    'P': 'Pênaltis',
    'BT': 'Intervalo Prorrog.',
    'SUSP': 'Suspenso',
    'INT': 'Interrompido',
    'FT': 'Encerrado',
    'AET': 'Encerrado (Prorrog.)',
    'PEN': 'Encerrado (Pên.)',
    'NS': 'Não iniciado',
    'TBD': 'A definir',
    'PST': 'Adiado',
    'CANC': 'Cancelado',
    'ABD': 'Abandonado',
    'AWD': 'W.O.',
    'WO': 'W.O.',
    'LIVE': 'Ao vivo'
  };
  return mapa[status] || status;
}

/**
 * Busca jogos do dia do scraper Globo (fallback)
 */
async function buscarJogosGlobo() {
  try {
    const raw = await fs.readFile(GLOBO_CACHE_PATH, 'utf-8');
    const jogos = JSON.parse(raw);
    return jogos.map(j => ({
      ...j,
      status: j.status || 'Em breve',
      fonte: 'globo'
    }));
  } catch (err) {
    return [];
  }
}

// GET /api/jogos-ao-vivo
router.get('/', async (req, res) => {
  try {
    const agora = Date.now();

    // Verificar cache
    if (cacheJogosAoVivo && (agora - cacheTimestamp) < CACHE_TTL) {
      return res.json({
        jogos: cacheJogosAoVivo,
        fonte: 'api-football',
        cache: true,
        atualizadoEm: new Date(cacheTimestamp).toISOString()
      });
    }

    // Buscar jogos ao vivo
    const jogosAoVivo = await buscarJogosAoVivo();

    // Se há jogos ao vivo, usar eles
    if (jogosAoVivo.length > 0) {
      cacheJogosAoVivo = jogosAoVivo;
      cacheTimestamp = agora;

      return res.json({
        jogos: jogosAoVivo,
        fonte: 'api-football',
        aoVivo: true,
        quantidade: jogosAoVivo.length
      });
    }

    // Fallback: jogos do Globo (agenda do dia)
    const jogosGlobo = await buscarJogosGlobo();

    return res.json({
      jogos: jogosGlobo,
      fonte: 'globo',
      aoVivo: false,
      mensagem: 'Sem jogos ao vivo no momento. Mostrando agenda do dia.'
    });

  } catch (err) {
    console.error('[JOGOS-AO-VIVO] Erro na rota:', err);
    res.status(500).json({
      error: 'Erro ao buscar jogos',
      detalhes: err.message
    });
  }
});

// GET /api/jogos-ao-vivo/status
router.get('/status', async (req, res) => {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return res.json({
      configurado: false,
      mensagem: 'API_FOOTBALL_KEY não configurada'
    });
  }

  try {
    const response = await fetch('https://v3.football.api-sports.io/status', {
      headers: { 'x-apisports-key': apiKey }
    });
    const data = await response.json();

    res.json({
      configurado: true,
      conta: data.response?.account?.firstname || 'Free',
      plano: data.response?.subscription?.plan || 'Free',
      requisicoes: {
        atual: data.response?.requests?.current || 0,
        limite: data.response?.requests?.limit_day || 100
      }
    });
  } catch (err) {
    res.status(500).json({
      configurado: true,
      erro: err.message
    });
  }
});

export default router;
