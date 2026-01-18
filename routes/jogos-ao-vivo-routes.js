// routes/jogos-ao-vivo-routes.js
// v3.1 - Jogos do Dia Completo + Eventos (API-Football)
// ✅ v3.1: Correção do mapeamento de ligas brasileiras (IDs corretos)
// ✅ v3.0: Campos extras: golsMandante, golsVisitante, placarHT, estadio, cidade, tempoExtra
// ✅ v3.0: Nova rota GET /:fixtureId/eventos para buscar gols, cartoes, escalacoes
// ✅ v2.0: Cache inteligente - 2min com jogos ao vivo, 10min sem jogos ao vivo
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// IDs de ligas principais (mapeamento fixo)
// Para estaduais, usamos formatarNomeLiga() que limpa o nome original da API
const LIGAS_PRINCIPAIS = {
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  618: 'Copinha'
};

/**
 * Formata nome da liga da API para exibição
 * Ex: "Paulista - A1" → "Paulista A1"
 * Ex: "Mineiro - 1" → "Mineiro"
 * Ex: "São Paulo Youth Cup" → "Copinha"
 */
function formatarNomeLiga(nome) {
  if (!nome) return 'Liga Brasileira';

  // Mapeamentos especiais de nome
  const mapeamentos = {
    'São Paulo Youth Cup': 'Copinha',
    'Brazil Serie A': 'Brasileirão A',
    'Brazil Serie B': 'Brasileirão B',
    'Brazil Cup': 'Copa do Brasil'
  };

  if (mapeamentos[nome]) return mapeamentos[nome];

  // Limpar sufixos comuns
  return nome
    .replace(/ - 1$/, '')       // "Mineiro - 1" → "Mineiro"
    .replace(/ - 2$/, ' B')     // "Mineiro - 2" → "Mineiro B"
    .replace(/ - A1$/, ' A1')   // "Paulista - A1" → "Paulista A1"
    .replace(/ - A2$/, ' A2')
    .replace(/ - B$/, ' B')
    .replace(/^Brazil /, '');   // "Brazil X" → "X"
}

/**
 * Retorna nome da liga: primeiro tenta mapeamento fixo, senão formata o original
 */
function getNomeLiga(ligaId, nomeOriginal) {
  return LIGAS_PRINCIPAIS[ligaId] || formatarNomeLiga(nomeOriginal);
}

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

    // Filtrar apenas jogos do Brasil (pelo país da liga)
    const jogosBrasil = (data.response || []).filter(jogo => {
      const pais = jogo.league?.country?.toLowerCase();
      return pais === 'brazil';
    });

    console.log(`[JOGOS-DIA] ${jogosBrasil.length} jogos brasileiros encontrados`);

    // Debug: mostrar ligas encontradas
    const ligasEncontradas = [...new Set(jogosBrasil.map(j => `${j.league.id}:${j.league.name}`))];
    console.log(`[JOGOS-DIA] Ligas:`, ligasEncontradas.slice(0, 10));

    // Mapear jogos - v3.1 com formatação inteligente de nomes
    const jogos = jogosBrasil.map(jogo => ({
      id: jogo.fixture.id,
      mandante: jogo.teams.home.name,
      visitante: jogo.teams.away.name,
      logoMandante: jogo.teams.home.logo,
      logoVisitante: jogo.teams.away.logo,
      // Placar separado para formatacao flexivel
      golsMandante: jogo.goals.home ?? 0,
      golsVisitante: jogo.goals.away ?? 0,
      placar: `${jogo.goals.home ?? 0} x ${jogo.goals.away ?? 0}`,
      // Placar do primeiro tempo
      placarHT: jogo.score?.halftime?.home !== null
        ? `(${jogo.score.halftime.home}-${jogo.score.halftime.away})`
        : null,
      tempo: jogo.fixture.status.elapsed ? `${jogo.fixture.status.elapsed}'` : '',
      tempoExtra: jogo.fixture.status.extra || null,
      status: mapearStatus(jogo.fixture.status.short),
      statusRaw: jogo.fixture.status.short,
      liga: getNomeLiga(jogo.league.id, jogo.league.name),
      ligaId: jogo.league.id,
      ligaOriginal: jogo.league.name,
      ligaLogo: jogo.league.logo,
      // Estadio
      estadio: jogo.fixture.venue?.name || null,
      cidade: jogo.fixture.venue?.city || null,
      // Horario
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
 * Busca eventos de um jogo especifico (gols, cartoes, substituicoes)
 * Endpoint: GET /api/jogos-ao-vivo/:fixtureId/eventos
 */
async function buscarEventosJogo(fixtureId) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return { eventos: [] };

  try {
    const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });

    const data = await response.json();
    const fixture = data.response?.[0];
    if (!fixture) return { eventos: [] };

    // Mapear eventos
    const eventos = (fixture.events || []).map(e => ({
      tempo: e.time.elapsed,
      tempoExtra: e.time.extra || null,
      tipo: mapearTipoEvento(e.type, e.detail),
      tipoRaw: e.type,
      detalhe: e.detail,
      time: e.team.name,
      timeId: e.team.id,
      timeLogo: e.team.logo,
      jogador: e.player?.name || null,
      jogadorId: e.player?.id || null,
      assistencia: e.assist?.name || null
    }));

    // Extrair lineups se disponiveis
    const escalacoes = fixture.lineups?.map(l => ({
      timeId: l.team.id,
      time: l.team.name,
      formacao: l.formation,
      tecnico: l.coach?.name || null,
      titulares: l.startXI?.map(p => ({
        nome: p.player.name,
        numero: p.player.number,
        posicao: p.player.pos
      })) || []
    })) || [];

    // Estatisticas
    const estatisticas = fixture.statistics?.map(s => ({
      timeId: s.team.id,
      time: s.team.name,
      stats: s.statistics?.reduce((acc, stat) => {
        acc[stat.type] = stat.value;
        return acc;
      }, {}) || {}
    })) || [];

    return {
      eventos,
      escalacoes,
      estatisticas,
      fixture: {
        id: fixture.fixture.id,
        arbitro: fixture.fixture.referee,
        estadio: fixture.fixture.venue?.name,
        cidade: fixture.fixture.venue?.city
      }
    };
  } catch (err) {
    console.error('[JOGOS-EVENTOS] Erro:', err.message);
    return { eventos: [] };
  }
}

/**
 * Mapeia tipo de evento para icone/texto
 */
function mapearTipoEvento(type, detail) {
  const mapa = {
    'Goal': detail === 'Penalty' ? 'gol_penalti' : detail === 'Own Goal' ? 'gol_contra' : 'gol',
    'Card': detail === 'Yellow Card' ? 'cartao_amarelo' : detail === 'Red Card' ? 'cartao_vermelho' : 'cartao_segundo_amarelo',
    'subst': 'substituicao',
    'Var': 'var'
  };
  return mapa[type] || type.toLowerCase();
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

// GET /api/jogos-ao-vivo/:fixtureId/eventos - Eventos de um jogo especifico
router.get('/:fixtureId/eventos', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    if (!fixtureId || isNaN(fixtureId)) {
      return res.status(400).json({ error: 'fixtureId invalido' });
    }

    const result = await buscarEventosJogo(fixtureId);
    res.json(result);
  } catch (err) {
    console.error('[JOGOS-EVENTOS] Erro na rota:', err);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

export default router;
