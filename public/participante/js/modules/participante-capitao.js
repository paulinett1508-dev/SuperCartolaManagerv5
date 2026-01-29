// participante-capitao.js - Módulo Capitão de Luxo Frontend
if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Módulo carregando...');

let estadoCapitao = {
  ligaId: null,
  timeId: null,
  temporada: null,
  rankingAtual: null,
  modeLive: false
};

export async function inicializarCapitaoParticipante(params) {
  if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Inicializando...', params);

  estadoCapitao.ligaId = params.ligaId;
  estadoCapitao.timeId = params.timeId;
  estadoCapitao.temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

  // Verificar se matchday está ativo
  if (window.MatchdayService && window.MatchdayService.isActive) {
    estadoCapitao.modeLive = true;
    subscribeMatchdayEvents();
  }

  await carregarRanking();
}

async function carregarRanking() {
  const container = document.getElementById('capitaoRankingContainer');
  if (!container) return;

  container.innerHTML = '<div class="loading">Carregando ranking...</div>';

  try {
    const endpoint = estadoCapitao.modeLive
      ? `/api/capitao/${estadoCapitao.ligaId}/ranking-live`
      : `/api/capitao/${estadoCapitao.ligaId}/ranking?temporada=${estadoCapitao.temporada}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!data.success || !data.ranking) {
      container.innerHTML = '<div class="empty">Sem dados disponíveis</div>';
      return;
    }

    estadoCapitao.rankingAtual = data.ranking;
    renderizarRanking(data.ranking);
  } catch (error) {
    console.error('[PARTICIPANTE-CAPITAO] Erro:', error);
    container.innerHTML = '<div class="error">Erro ao carregar ranking</div>';
  }
}

function renderizarRanking(ranking) {
  const container = document.getElementById('capitaoRankingContainer');
  if (!container) return;

  let html = '<div class="capitao-ranking-lista">';

  ranking.forEach((participante, index) => {
    const posicao = index + 1;
    const isMeuTime = String(participante.timeId) === String(estadoCapitao.timeId);

    html += `
      <div class="capitao-ranking-item ${isMeuTime ? 'meu-time' : ''}">
        <div class="capitao-posicao">${posicao}º</div>
        <div class="capitao-info">
          <div class="capitao-nome">${participante.nome_cartola}</div>
          <div class="capitao-time">${participante.nome_time}</div>
        </div>
        <div class="capitao-pontos">
          ${participante.pontuacao_total?.toFixed(2) || '0.00'}
          <span class="capitao-badge">[C]</span>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function subscribeMatchdayEvents() {
  if (!window.MatchdayService) return;

  window.MatchdayService.on('data:parciais', (data) => {
    if (window.Log) Log.info('PARTICIPANTE-CAPITAO', '🔄 Atualizando com parciais');
    carregarRanking();
  });

  window.MatchdayService.on('matchday:stop', () => {
    estadoCapitao.modeLive = false;
    carregarRanking(); // Recarregar modo consolidado
  });
}

window.inicializarCapitaoParticipante = inicializarCapitaoParticipante;

if (window.Log) Log.info('PARTICIPANTE-CAPITAO', '✅ Módulo pronto');
