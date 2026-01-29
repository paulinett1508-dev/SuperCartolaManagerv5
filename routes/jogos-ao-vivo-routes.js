// routes/jogos-ao-vivo-routes.js
// v3.6 - Invalidação de cache por mudança de data
// ✅ v3.6: Cache invalida automaticamente quando data muda (virou o dia)
//          Corrige bug: jogos de ontem apareciam hoje
// ✅ v3.5: SoccerDataAPI - fallback entre API-Football e Cache Stale
// ✅ v3.4: Cache stale - quando API falhar, usa ultimo cache valido com aviso
// ✅ v3.3: Fix LIGAS_PRINCIPAIS - removido IDs de estaduais (variam entre temporadas)
//          Estaduais tratados via formatarNomeLiga() por nome
// ✅ v3.2: Nomes populares de estaduais (Paulistão, Cariocão, etc)
//          + resumoStats para modal com tabs
// ✅ v3.1: Correção do mapeamento de ligas brasileiras (IDs corretos)
// ✅ v3.0: Campos extras: golsMandante, golsVisitante, placarHT, estadio, cidade, tempoExtra
// ✅ v3.0: Nova rota GET /:fixtureId/eventos para buscar gols, cartoes, escalacoes
// ✅ v2.0: Cache inteligente - 2min com jogos ao vivo, 10min sem jogos ao vivo
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// ┌──────────────────────────────────────────────────────────────────────┐
// │ MAPEAMENTO DE LIGAS - IDs ESTÁVEIS DA API-FOOTBALL                   │
// │ Documentação: docs/JOGOS-DO-DIA-API.md                               │
// ├──────────────────────────────────────────────────────────────────────┤
// │ APENAS ligas com IDs que NÃO mudam entre temporadas.                 │
// │                                                                      │
// │ ⚠️  ESTADUAIS NÃO DEVEM SER ADICIONADOS AQUI!                        │
// │     IDs de estaduais VARIAM a cada temporada na API-Football.        │
// │     Tratá-los via formatarNomeLiga() pelo NOME, não pelo ID.         │
// │                                                                      │
// │ Exemplo de problema se adicionar estaduais:                          │
// │   - 2025: Cariocão tinha ID 123                                      │
// │   - 2026: Cariocão passou a ter ID 456                               │
// │   - Resultado: mapeamento quebra silenciosamente                     │
// └──────────────────────────────────────────────────────────────────────┘
const LIGAS_PRINCIPAIS = {
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  75: 'Série C',
  76: 'Série D',
  77: 'Supercopa',
  618: 'Copinha'
  // ⛔ NÃO adicionar estaduais - usar formatarNomeLiga() para eles
};

/**
 * Formata nome da liga da API para exibicao amigavel
 * Trata padroes da API-Football como "Paulista - A1", "Carioca - 1"
 *
 * @param {string} nome - Nome original da API
 * @returns {string} Nome formatado para exibicao
 */
function formatarNomeLiga(nome) {
  if (!nome) return 'Liga Brasileira';

  // Mapeamentos especiais de nome (prioridade maxima)
  const mapeamentos = {
    // Copas e nomes em ingles
    'São Paulo Youth Cup': 'Copinha',
    'Copa Sao Paulo de Futebol Junior': 'Copinha',
    'Brazil Serie A': 'Brasileirão A',
    'Brazil Serie B': 'Brasileirão B',
    'Brazil Serie C': 'Série C',
    'Brazil Serie D': 'Série D',
    'Brazil Cup': 'Copa do Brasil',
    'Copa do Nordeste': 'Copa do Nordeste',
    'Supercopa do Brasil': 'Supercopa'
  };

  // Verificar mapeamento exato primeiro
  if (mapeamentos[nome]) return mapeamentos[nome];

  // Transformacoes em cadeia para padroes da API
  let resultado = nome
    // Remover prefixos
    .replace(/^Brazil(ian)?\s+/i, '')
    .replace(/^Campeonato\s+/i, '')

    // Tratar divisoes - remover sufixos de primeira divisao
    .replace(/\s+-\s+1$/, '')           // "Mineiro - 1" → "Mineiro"
    .replace(/\s+-\s+A1$/i, '')         // "Paulista - A1" → "Paulista"
    .replace(/\s+-\s+2$/, ' B')         // "Mineiro - 2" → "Mineiro B"
    .replace(/\s+-\s+A2$/i, ' A2')      // "Paulista - A2" → "Paulista A2"
    .replace(/\s+-\s+B$/i, ' B')

    .trim();

  // Aplicar nomes populares apos limpeza
  const nomesPopulares = {
    'Paulista': 'Paulistão',
    'Carioca': 'Cariocão',
    'Gaucho': 'Gauchão',
    'Gaúcho': 'Gauchão',
    'Mineiro': 'Mineirão',
    'Baiano': 'Baianão',
    'Pernambucano': 'Pernambucano',
    'Cearense': 'Cearense',
    'Paranaense': 'Paranaense',
    'Catarinense': 'Catarinense',
    'Goiano': 'Goianão',
    'Sergipano': 'Sergipano',
    'Paraibano': 'Paraibano',
    'Potiguar': 'Potiguar',
    'Alagoano': 'Alagoano',
    'Maranhense': 'Maranhense',
    'Piauiense': 'Piauiense',
    'Amazonense': 'Amazonense',
    'Paraense': 'Paraense',
    'Capixaba': 'Capixaba',
    'Brasiliense': 'Brasiliense'
  };

  return nomesPopulares[resultado] || resultado || 'Liga Brasileira';
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
let cacheFonte = 'soccerdata'; // ✅ Fonte do cache atual (SoccerDataAPI agora é PRINCIPAL)
let cacheDataReferencia = null;  // ✅ v3.5: Data de referência do cache (YYYY-MM-DD)

// TTL dinâmico baseado em jogos ao vivo
const CACHE_TTL_AO_VIVO = 2 * 60 * 1000;    // 2 minutos se tem jogos ao vivo
const CACHE_TTL_SEM_JOGOS = 10 * 60 * 1000; // 10 minutos se não tem jogos ao vivo
const CACHE_STALE_MAX = 30 * 60 * 1000;     // 30 minutos máximo para cache stale

// Path do scraper Globo (fallback)
const GLOBO_CACHE_PATH = path.join(process.cwd(), 'data', 'jogos-globo.json');

/**
 * Retorna a data atual no formato YYYY-MM-DD (timezone São Paulo)
 */
function getDataHoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/**
 * ❌ API-FOOTBALL REMOVIDA - Usuário banido
 * Função desativada. SoccerDataAPI agora é a fonte principal.
 */
// async function buscarJogosDoDia() { ... CÓDIGO REMOVIDO ... }

/**
 * ❌ API-FOOTBALL REMOVIDA - Eventos de jogo desabilitados
 * Endpoint: GET /api/jogos-ao-vivo/:fixtureId/eventos (DESABILITADO)
 */
async function buscarEventosJogo(fixtureId) {
  console.warn('[JOGOS-DIA] Eventos desabilitados - API-Football removida');
  return { eventos: [], mensagem: 'Feature desabilitada (API-Football removida)' };
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
 * Extrai resumo das estatisticas principais para exibicao no modal
 * @param {Array} statistics - Array de estatisticas da API
 * @returns {Object|null} Objeto com stats organizadas por time ou null
 */
function extrairResumoStats(statistics) {
  if (!statistics || statistics.length < 2) return null;

  const homeStats = statistics[0]?.statistics || [];
  const awayStats = statistics[1]?.statistics || [];

  /**
   * Busca valor de uma estatistica especifica
   */
  const getStat = (stats, type) => {
    const stat = stats.find(s => s.type === type);
    return stat?.value ?? null;
  };

  return {
    mandante: {
      posse: getStat(homeStats, 'Ball Possession'),
      chutesTotal: getStat(homeStats, 'Total Shots'),
      chutesGol: getStat(homeStats, 'Shots on Goal'),
      escanteios: getStat(homeStats, 'Corner Kicks'),
      faltas: getStat(homeStats, 'Fouls'),
      impedimentos: getStat(homeStats, 'Offsides'),
      defesas: getStat(homeStats, 'Goalkeeper Saves')
    },
    visitante: {
      posse: getStat(awayStats, 'Ball Possession'),
      chutesTotal: getStat(awayStats, 'Total Shots'),
      chutesGol: getStat(awayStats, 'Shots on Goal'),
      escanteios: getStat(awayStats, 'Corner Kicks'),
      faltas: getStat(awayStats, 'Fouls'),
      impedimentos: getStat(awayStats, 'Offsides'),
      defesas: getStat(awayStats, 'Goalkeeper Saves')
    }
  };
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
 * Busca jogos ao vivo do SoccerDataAPI (fallback secundário)
 * Free tier: 75 req/dia, sem cartão de crédito
 * Cobre: Brasileirão A, B e outras ligas
 */
async function buscarJogosSoccerDataAPI() {
  const apiKey = process.env.SOCCERDATA_API_KEY;
  if (!apiKey) {
    console.warn('[JOGOS-DIA] SOCCERDATA_API_KEY não configurada');
    return { jogos: [], temAoVivo: false };
  }

  try {
    const url = `https://api.soccerdataapi.com/livescores/?auth_token=${apiKey}`;

    console.log('[JOGOS-DIA] Tentando SoccerDataAPI...');

    const response = await fetch(url, {
      headers: {
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error(`[JOGOS-DIA] SoccerDataAPI erro HTTP: ${response.status}`);
      return { jogos: [], temAoVivo: false };
    }

    const data = await response.json();

    // A API retorna array de jogos ou objeto com 'data'
    const jogosRaw = Array.isArray(data) ? data : (data.data || []);

    // Filtrar apenas jogos do Brasil
    const jogosBrasil = jogosRaw.filter(jogo => {
      const pais = (jogo.country || jogo.league_country || '').toLowerCase();
      return pais === 'brazil' || pais === 'brasil';
    });

    console.log(`[JOGOS-DIA] SoccerDataAPI: ${jogosBrasil.length} jogos brasileiros`);

    if (jogosBrasil.length === 0) {
      return { jogos: [], temAoVivo: false };
    }

    // Mapear para formato padrão
    const jogos = jogosBrasil.map(jogo => {
      const statusRaw = mapearStatusSoccerData(jogo.status || jogo.match_status);

      return {
        id: jogo.match_id || jogo.id,
        mandante: jogo.home_team || jogo.home_name,
        visitante: jogo.away_team || jogo.away_name,
        logoMandante: jogo.home_logo || null,
        logoVisitante: jogo.away_logo || null,
        golsMandante: parseInt(jogo.home_score || jogo.home_goals || 0),
        golsVisitante: parseInt(jogo.away_score || jogo.away_goals || 0),
        placar: `${jogo.home_score || 0} x ${jogo.away_score || 0}`,
        placarHT: jogo.ht_score || null,
        tempo: jogo.elapsed || jogo.minute || '',
        tempoExtra: null,
        status: mapearStatus(statusRaw),
        statusRaw,
        liga: formatarNomeLiga(jogo.league || jogo.league_name),
        ligaId: jogo.league_id || null,
        ligaOriginal: jogo.league || jogo.league_name,
        ligaLogo: jogo.league_logo || null,
        estadio: jogo.stadium || jogo.venue || null,
        cidade: jogo.city || null,
        horario: jogo.time || jogo.match_time || '--:--',
        timestamp: jogo.timestamp ? jogo.timestamp * 1000 : Date.now(),
        fonte: 'soccerdata'
      };
    });

    // Ordenar: Ao vivo primeiro, depois agendados, depois encerrados
    jogos.sort((a, b) => {
      const aVivo = STATUS_AO_VIVO.includes(a.statusRaw) ? 0 : 1;
      const bVivo = STATUS_AO_VIVO.includes(b.statusRaw) ? 0 : 1;
      if (aVivo !== bVivo) return aVivo - bVivo;

      const aEncerrado = STATUS_ENCERRADO.includes(a.statusRaw) ? 1 : 0;
      const bEncerrado = STATUS_ENCERRADO.includes(b.statusRaw) ? 1 : 0;
      if (aEncerrado !== bEncerrado) return aEncerrado - bEncerrado;

      return a.timestamp - b.timestamp;
    });

    const temAoVivo = jogos.some(j => STATUS_AO_VIVO.includes(j.statusRaw));

    return { jogos, temAoVivo };
  } catch (err) {
    console.error('[JOGOS-DIA] SoccerDataAPI erro:', err.message);
    return { jogos: [], temAoVivo: false };
  }
}

/**
 * Mapeia status do SoccerDataAPI para padrão API-Football
 */
function mapearStatusSoccerData(status) {
  if (!status) return 'NS';

  const s = status.toLowerCase();

  if (s.includes('live') || s.includes('playing') || s === '1h') return '1H';
  if (s === '2h' || s.includes('second')) return '2H';
  if (s.includes('half') || s === 'ht') return 'HT';
  if (s.includes('finished') || s.includes('ended') || s === 'ft') return 'FT';
  if (s.includes('postponed')) return 'PST';
  if (s.includes('cancelled') || s.includes('canceled')) return 'CANC';
  if (s.includes('scheduled') || s.includes('not started') || s === 'ns') return 'NS';
  if (s.includes('extra')) return 'ET';
  if (s.includes('penalty') || s.includes('penalties')) return 'P';

  return 'NS';
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

// ✅ v3.6: Rota para limpar cache manualmente
// DELETE /api/jogos-ao-vivo/cache
router.delete('/cache', (req, res) => {
  const cacheAnterior = {
    dataReferencia: cacheDataReferencia,
    timestamp: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null,
    qtdJogos: cacheJogosDia?.length || 0
  };

  // Limpar todas as variáveis de cache
  cacheJogosDia = null;
  cacheTimestamp = 0;
  cacheTemJogosAoVivo = false;
  cacheDataReferencia = null;

  console.log('[JOGOS-DIA] Cache limpo manualmente');

  res.json({
    sucesso: true,
    mensagem: 'Cache limpo com sucesso',
    cacheAnterior,
    dataAtual: getDataHoje()
  });
});

// GET /api/jogos-ao-vivo
router.get('/', async (req, res) => {
  try {
    const agora = Date.now();
    const dataHoje = getDataHoje();

    // ✅ v3.5: Invalidar cache se a data mudou (virou o dia)
    if (cacheDataReferencia && cacheDataReferencia !== dataHoje) {
      console.log(`[JOGOS-DIA] Data mudou de ${cacheDataReferencia} para ${dataHoje} - invalidando cache`);
      cacheJogosDia = null;
      cacheTimestamp = 0;
      cacheDataReferencia = null;
    }

    // Calcular TTL baseado em jogos ao vivo
    const ttlAtual = cacheTemJogosAoVivo ? CACHE_TTL_AO_VIVO : CACHE_TTL_SEM_JOGOS;
    const cacheValido = cacheJogosDia && (agora - cacheTimestamp) < ttlAtual;
    const cacheStaleValido = cacheJogosDia && (agora - cacheTimestamp) < CACHE_STALE_MAX;

    // 1º Cache válido (fresh)
    if (cacheValido) {
      const stats = calcularEstatisticas(cacheJogosDia);
      return res.json({
        jogos: cacheJogosDia,
        fonte: cacheFonte,
        aoVivo: cacheTemJogosAoVivo,
        estatisticas: stats,
        cache: true,
        ttl: ttlAtual / 1000,
        atualizadoEm: new Date(cacheTimestamp).toISOString()
      });
    }

    // 2º Tentar: SoccerDataAPI (PRINCIPAL - API-Football REMOVIDA)
    console.log('[JOGOS-DIA] Buscando jogos via SoccerDataAPI (principal)...');
    const soccerData = await buscarJogosSoccerDataAPI();

    if (soccerData.jogos.length > 0) {
      cacheJogosDia = soccerData.jogos;
      cacheTimestamp = agora;
      cacheTemJogosAoVivo = soccerData.temAoVivo;
      cacheDataReferencia = dataHoje; // ✅ v3.5: Salvar data de referência
      cacheFonte = 'soccerdata';

      const stats = calcularEstatisticas(soccerData.jogos);

      console.log(`[JOGOS-DIA] ✅ SoccerDataAPI retornou ${soccerData.jogos.length} jogos`);

      return res.json({
        jogos: soccerData.jogos,
        fonte: 'soccerdata',
        aoVivo: soccerData.temAoVivo,
        estatisticas: stats,
        quantidade: soccerData.jogos.length,
        mensagem: 'Dados via SoccerDataAPI (API-Football indisponível)'
      });
    }

    // 4º Cache stale (APIs falharam mas temos cache antigo válido até 30min)
    console.warn('[JOGOS-DIA] ⚠️ SoccerDataAPI também falhou/vazia. Tentando cache stale...');
    if (cacheStaleValido) {
      const stats = calcularEstatisticas(cacheJogosDia);
      const idadeMinutos = Math.round((agora - cacheTimestamp) / 60000);

      console.warn(`[JOGOS-DIA] ✅ Usando cache stale (${idadeMinutos}min atrás) - Fonte: ${cacheFonte}`);

      return res.json({
        jogos: cacheJogosDia,
        fonte: cacheFonte,
        aoVivo: cacheTemJogosAoVivo,
        estatisticas: stats,
        cache: true,
        stale: true,
        idadeMinutos,
        mensagem: `Dados de ${idadeMinutos} min atrás (limite de requisições atingido)`,
        atualizadoEm: new Date(cacheTimestamp).toISOString()
      });
    }

    // 5º Fallback final: Globo Esporte (apenas agenda)
    console.warn('[JOGOS-DIA] ⚠️ Cache stale expirado/vazio. Tentando fallback final: Globo Esporte...');
    const jogosGlobo = await buscarJogosGlobo();

    if (jogosGlobo.length > 0) {
      console.log(`[JOGOS-DIA] ✅ Globo Esporte retornou ${jogosGlobo.length} jogos (apenas agenda)`);
    } else {
      console.warn('[JOGOS-DIA] ⚠️ Nenhuma fonte disponível. Sem jogos brasileiros hoje.');
    }

    return res.json({
      jogos: jogosGlobo,
      fonte: 'globo',
      aoVivo: false,
      estatisticas: calcularEstatisticas(jogosGlobo),
      mensagem: jogosGlobo.length > 0
        ? 'Dados do Globo Esporte (agenda)'
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
  const soccerDataKey = process.env.SOCCERDATA_API_KEY;
  const agora = Date.now();

  // Calcular idade do cache
  const cacheIdadeMs = cacheTimestamp ? agora - cacheTimestamp : null;
  const cacheIdadeMin = cacheIdadeMs ? Math.round(cacheIdadeMs / 60000) : null;
  const cacheStale = cacheIdadeMs && cacheIdadeMs > (cacheTemJogosAoVivo ? CACHE_TTL_AO_VIVO : CACHE_TTL_SEM_JOGOS);

  const resultado = {
    fluxo: '✅ SoccerDataAPI (PRINCIPAL) → Cache Stale (30min) → Globo',
    observacao: 'API-Football REMOVIDA (usuário banido) — todo o tráfego migrou para SoccerDataAPI',
    fontes: {
      'api-football': {
        ordem: 0,
        configurado: false,
        tipo: '🚫 REMOVIDA',
        descricao: 'API-Football foi banida e não participa mais do fluxo',
        alerta: 'Bloqueada / Usuário banido',
        plano: 'REMOVIDA',
        conta: 'Banida',
        requisicoes: {
          atual: 0,
          limite: 0
        }
      },
      'soccerdata': {
        ordem: 1,
        configurado: !!soccerDataKey,
        tipo: '🟢 PRINCIPAL',
        limite: '75 req/dia (free)',
        descricao: 'Fonte principal de dados'
      },
      'cache-stale': {
        ordem: 2,
        ativo: cacheStale && cacheJogosDia?.length > 0,
        tipo: 'fallback-1',
        maxIdade: '30 min',
        descricao: 'Ultimo cache valido quando SoccerDataAPI falhar'
      },
      'globo': {
        ordem: 3,
        configurado: true,
        tipo: 'fallback-final',
        limite: 'Ilimitado (scraper)',
        descricao: 'Apenas agenda (sem placares ao vivo)'
      }
    },
    cache: {
      temJogosAoVivo: cacheTemJogosAoVivo,
      fonte: cacheFonte,
      ttlAtual: cacheTemJogosAoVivo ? '2 min' : '10 min',
      idadeMinutos: cacheIdadeMin,
      stale: cacheStale,
      jogosEmCache: cacheJogosDia?.length || 0,
      ultimaAtualizacao: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null
    }
  };

  // Info do SoccerDataAPI
  if (!soccerDataKey) {
    resultado.fontes['soccerdata'].aviso = '⚠️ SOCCERDATA_API_KEY nao configurada - Configure URGENTE!';
    resultado.fontes['soccerdata'].statusCritico = true;
  } else {
    resultado.fontes['soccerdata'].statusOk = true;
    resultado.fontes['soccerdata'].mensagem = '✅ Configurado e operacional';
  }

  res.json(resultado);
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
