// routes/jogos-ao-vivo-routes.js
// v2.0 - Jogos do Dia Completo (API-Football)
// ✅ v2.0: Mudança de ?live=all para ?date={hoje} - mostra todos os jogos do dia
// ✅ v2.0: Cache inteligente - 2min com jogos ao vivo, 10min sem jogos ao vivo
// ✅ v2.0: Ordenação: Ao vivo > Agendados > Encerrados
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

// Status que indicam jogo ao vivo
const STATUS_AO_VIVO = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
const STATUS_ENCERRADO = ['FT', 'AET', 'PEN'];
const STATUS_AGENDADO = ['NS', 'TBD'];

// Cache inteligente
let cacheJogosDia = null;
let cacheTimestamp = 0;
let cacheTemJogosAoVivo = false;

// TTL dinâmico baseado em jogos ao vivo
const CACHE_TTL_AO_VIVO = 2 * 60 * 1000;    // 2 minutos se tem jogos ao vivo
const CACHE_TTL_SEM_JOGOS = 10 * 60 * 1000; // 10 minutos se não tem jogos ao vivo

// Path do scraper Globo (fallback)
const GLOBO_CACHE_PATH = path.join(process.cwd(), 'data', 'jogos-globo.json');

/**
 * Retorna a data atual no formato YYYY-MM-DD (timezone São Paulo)
 */
function getDataHoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Busca todos os jogos do dia da API-Football
 */
async function buscarJogosDoDia() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn('[JOGOS-DIA] API_FOOTBALL_KEY não configurada');
    return { jogos: [], temAoVivo: false };
  }

  try {
    const dataHoje = getDataHoje();
    const url = `https://v3.football.api-sports.io/fixtures?date=${dataHoje}`;

    console.log(`[JOGOS-DIA] Buscando jogos de ${dataHoje}...`);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[JOGOS-DIA] Erro API:', data.errors);
      return { jogos: [], temAoVivo: false };
    }

    // Filtrar apenas jogos do Brasil
    const jogosBrasil = (data.response || []).filter(jogo =>
      LIGAS_BRASIL[jogo.league?.id]
    );

    console.log(`[JOGOS-DIA] ${jogosBrasil.length} jogos brasileiros encontrados`);

    // Mapear jogos
    const jogos = jogosBrasil.map(jogo => ({
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
      }),
      timestamp: new Date(jogo.fixture.date).getTime()
    }));

    // Ordenar: Ao vivo primeiro, depois agendados por horário, depois encerrados
    jogos.sort((a, b) => {
      const aVivo = STATUS_AO_VIVO.includes(a.statusRaw) ? 0 : 1;
      const bVivo = STATUS_AO_VIVO.includes(b.statusRaw) ? 0 : 1;

      if (aVivo !== bVivo) return aVivo - bVivo;

      const aEncerrado = STATUS_ENCERRADO.includes(a.statusRaw) ? 1 : 0;
      const bEncerrado = STATUS_ENCERRADO.includes(b.statusRaw) ? 1 : 0;

      if (aEncerrado !== bEncerrado) return aEncerrado - bEncerrado;

      // Mesmo grupo: ordenar por horário
      return a.timestamp - b.timestamp;
    });

    const temAoVivo = jogos.some(j => STATUS_AO_VIVO.includes(j.statusRaw));

    return { jogos, temAoVivo };
  } catch (err) {
    console.error('[JOGOS-DIA] Erro ao buscar:', err.message);
    return { jogos: [], temAoVivo: false };
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
    'NS': 'Agendado',
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
      status: j.status || 'Agendado',
      statusRaw: 'NS',
      fonte: 'globo'
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Calcula estatísticas dos jogos
 */
function calcularEstatisticas(jogos) {
  return {
    total: jogos.length,
    aoVivo: jogos.filter(j => STATUS_AO_VIVO.includes(j.statusRaw)).length,
    agendados: jogos.filter(j => STATUS_AGENDADO.includes(j.statusRaw)).length,
    encerrados: jogos.filter(j => STATUS_ENCERRADO.includes(j.statusRaw)).length
  };
}

// GET /api/jogos-ao-vivo
router.get('/', async (req, res) => {
  try {
    const agora = Date.now();

    // Calcular TTL baseado em jogos ao vivo
    const ttlAtual = cacheTemJogosAoVivo ? CACHE_TTL_AO_VIVO : CACHE_TTL_SEM_JOGOS;
    const cacheValido = cacheJogosDia && (agora - cacheTimestamp) < ttlAtual;

    // Verificar cache
    if (cacheValido) {
      const stats = calcularEstatisticas(cacheJogosDia);
      return res.json({
        jogos: cacheJogosDia,
        fonte: 'api-football',
        aoVivo: cacheTemJogosAoVivo,
        estatisticas: stats,
        cache: true,
        ttl: ttlAtual / 1000,
        atualizadoEm: new Date(cacheTimestamp).toISOString()
      });
    }

    // Buscar jogos do dia
    const { jogos, temAoVivo } = await buscarJogosDoDia();

    // Se há jogos, usar eles
    if (jogos.length > 0) {
      cacheJogosDia = jogos;
      cacheTimestamp = agora;
      cacheTemJogosAoVivo = temAoVivo;

      const stats = calcularEstatisticas(jogos);

      return res.json({
        jogos,
        fonte: 'api-football',
        aoVivo: temAoVivo,
        estatisticas: stats,
        quantidade: jogos.length
      });
    }

    // Fallback: jogos do Globo (agenda do dia)
    const jogosGlobo = await buscarJogosGlobo();

    return res.json({
      jogos: jogosGlobo,
      fonte: 'globo',
      aoVivo: false,
      estatisticas: calcularEstatisticas(jogosGlobo),
      mensagem: jogosGlobo.length > 0
        ? 'Dados do Globo Esporte'
        : 'Sem jogos brasileiros hoje'
    });

  } catch (err) {
    console.error('[JOGOS-DIA] Erro na rota:', err);
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
      },
      cache: {
        temJogosAoVivo: cacheTemJogosAoVivo,
        ttlAtual: cacheTemJogosAoVivo ? '2 min' : '10 min',
        ultimaAtualizacao: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null
      }
    });
  } catch (err) {
    res.status(500).json({
      configurado: true,
      erro: err.message
    });
  }
});

// GET /api/jogos-ao-vivo/invalidar - Força refresh do cache
router.get('/invalidar', async (req, res) => {
  cacheJogosDia = null;
  cacheTimestamp = 0;
  cacheTemJogosAoVivo = false;

  res.json({
    success: true,
    mensagem: 'Cache invalidado. Próxima requisição buscará dados frescos.'
  });
});

export default router;
