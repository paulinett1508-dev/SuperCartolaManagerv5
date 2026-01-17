// public/participante/js/modules/participante-live-results.js
// Módulo frontend para exibir resultados ao vivo
// v1.1 - Com tratamento de erros e estados de loading

/**
 * Carrega partidas ao vivo de uma liga
 * @param {string} liga_id - ID da liga
 */
export async function carregarLiveResults(liga_id) {
  const container = document.getElementById('live-results-container');
  if (!container) return;

  // Estado de loading
  container.innerHTML = `
    <div class="text-center py-8 text-gray-400">
      <span class="material-icons animate-spin text-4xl">sync</span>
      <p class="mt-2">Carregando partidas...</p>
    </div>
  `;

  try {
    const resp = await fetch(`/api/live-results?liga_id=${encodeURIComponent(liga_id)}`);

    if (!resp.ok) {
      throw new Error(`Erro HTTP: ${resp.status}`);
    }

    const data = await resp.json();

    if (data.success) {
      renderizarPartidas(data.partidas);
    } else {
      mostrarErro(container, data.message || 'Erro ao carregar partidas');
    }
  } catch (err) {
    console.error('[LIVE-RESULTS] Erro:', err);
    mostrarErro(container, 'Não foi possível carregar as partidas. Tente novamente.');
  }
}

/**
 * Renderiza lista de partidas
 * @param {Array} partidas - Array de partidas
 */
function renderizarPartidas(partidas) {
  const container = document.getElementById('live-results-container');
  if (!container) return;

  // Sem partidas
  if (!partidas || partidas.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <span class="material-icons text-4xl">sports_soccer</span>
        <p class="mt-2">Nenhuma partida ao vivo no momento</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  partidas.forEach(partida => {
    const statusClass = getStatusClass(partida.status);
    const statusLabel = getStatusLabel(partida.status);

    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-lg p-4 mb-4 border-l-4 ' + statusClass;
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex-1 text-right">
          <span class="font-bold text-white">${escapeHtml(partida.timeCasa)}</span>
        </div>
        <div class="px-4 text-center">
          <span class="text-2xl font-bold text-white">${partida.placarCasa} x ${partida.placarFora}</span>
        </div>
        <div class="flex-1 text-left">
          <span class="font-bold text-white">${escapeHtml(partida.timeFora)}</span>
        </div>
      </div>
      <div class="text-center mt-2">
        <span class="text-xs px-2 py-1 rounded ${statusClass}">${statusLabel}</span>
      </div>
      ${renderizarEventos(partida.eventos)}
    `;
    container.appendChild(div);
  });
}

/**
 * Renderiza eventos da partida (gols, cartões, etc)
 * @param {Array} eventos - Array de eventos
 */
function renderizarEventos(eventos) {
  if (!eventos || eventos.length === 0) return '';

  const eventosHtml = eventos.slice(0, 5).map(e => `
    <div class="text-xs text-gray-400">
      <span class="text-orange-400">${e.minuto || '--'}'</span>
      ${escapeHtml(e.descricao || e.tipo || '')}
      ${e.jogador ? `- ${escapeHtml(e.jogador)}` : ''}
    </div>
  `).join('');

  return `<div class="mt-3 border-t border-gray-700 pt-2">${eventosHtml}</div>`;
}

/**
 * Retorna classe CSS baseado no status
 * @param {string} status - Status da partida
 */
function getStatusClass(status) {
  const classes = {
    'em-andamento': 'border-green-500 bg-green-900/20',
    'finalizado': 'border-gray-500 bg-gray-900/20',
    'nao-iniciado': 'border-orange-500 bg-orange-900/20'
  };
  return classes[status] || 'border-gray-600';
}

/**
 * Retorna label do status
 * @param {string} status - Status da partida
 */
function getStatusLabel(status) {
  const labels = {
    'em-andamento': 'Ao Vivo',
    'finalizado': 'Finalizado',
    'nao-iniciado': 'Não Iniciado'
  };
  return labels[status] || status;
}

/**
 * Mostra mensagem de erro
 * @param {HTMLElement} container - Container
 * @param {string} mensagem - Mensagem de erro
 */
function mostrarErro(container, mensagem) {
  container.innerHTML = `
    <div class="text-center py-8 text-red-400">
      <span class="material-icons text-4xl">error_outline</span>
      <p class="mt-2">${escapeHtml(mensagem)}</p>
      <button onclick="window.location.reload()"
              class="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded">
        Tentar Novamente
      </button>
    </div>
  `;
}

/**
 * Escape HTML para prevenir XSS
 * @param {string} str - String para escapar
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-carregar ao abrir página (se liga_id disponível)
window.addEventListener('DOMContentLoaded', () => {
  // Tentar obter liga_id de várias fontes
  const liga_id = window.liga_id ||
                  window.CONFIG?.liga_id ||
                  new URLSearchParams(window.location.search).get('liga_id') ||
                  '';

  if (liga_id) {
    carregarLiveResults(liga_id);
  } else {
    // Aguardar até que liga_id esteja disponível
    const container = document.getElementById('live-results-container');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <span class="material-icons text-4xl">info</span>
          <p class="mt-2">Selecione uma liga para ver os resultados</p>
        </div>
      `;
    }
  }
});

// Exportar para uso em outros módulos
export default { carregarLiveResults };
