/**
 * Dashboard Page - Página principal do admin mobile
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

let refreshing = false;

export async function render() {
  const container = document.getElementById('page-content');

  // Mostra FAB
  document.getElementById('fab').classList.remove('hidden');
  setupFAB();

  await loadDashboard(container);
}

async function loadDashboard(container, isRefresh = false) {
  if (!isRefresh) {
    showLoading(container);
  }

  try {
    const data = await API.getDashboard();

    renderDashboard(container, data);

    if (isRefresh) {
      showToast('Dashboard atualizado!', 'success');
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showError(container, error.message || 'Erro ao carregar dashboard. Tente novamente.');
  }
}

function renderDashboard(container, data) {
  const { healthScore, healthStatus, ligas, ultimasAcoes } = data;

  // Health badge class e ícone
  const healthClass = healthStatus === 'healthy' ? 'badge-success' :
                     healthStatus === 'warning' ? 'badge-warning' : 'badge-danger';
  const healthIcon = healthStatus === 'healthy' ? '🟢' :
                    healthStatus === 'warning' ? '🟡' : '🔴';

  container.innerHTML = `
    <div class="container">
      <!-- Health Badge -->
      <div class="card" style="margin-bottom: var(--spacing-md);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">${healthIcon}</span>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 16px;">Sistema ${healthStatus === 'healthy' ? 'Saudável' : healthStatus === 'warning' ? 'Atenção' : 'Crítico'}</h3>
              <p class="text-muted" style="margin: 0; font-size: 13px;">Health Score: ${healthScore}/100</p>
            </div>
          </div>
          <a href="#/health" class="btn btn-ghost btn-sm" style="padding: 8px 12px;">
            Ver Detalhes →
          </a>
        </div>
      </div>

      <!-- Ligas -->
      <h2 class="card-title" style="margin-bottom: var(--spacing-md); font-size: 18px;">🏆 Suas Ligas</h2>

      ${ligas.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <h3 class="empty-state-title">Nenhuma liga encontrada</h3>
          <p class="empty-state-text">Crie sua primeira liga para começar</p>
        </div>
      ` : ligas.map(liga => renderLigaCard(liga)).join('')}

      <!-- Últimas Ações -->
      ${ultimasAcoes.length > 0 ? `
        <h2 class="card-title" style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); font-size: 18px;">📊 Últimas Ações</h2>
        <div class="card">
          ${ultimasAcoes.map(acao => renderAcaoItem(acao)).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Setup pull-to-refresh
  setupPullToRefresh(container);
}

function renderLigaCard(liga) {
  const consolidacaoStatus = liga.ultimaConsolidacao
    ? `Rodada ${liga.ultimaConsolidacao.rodada} consolidada ✅`
    : 'Nenhuma consolidação ainda';

  const saldoClass = liga.saldoTotal >= 0 ? 'text-success' : 'text-danger';
  const inadimplentesWarning = liga.inadimplentes > 0
    ? `<span class="badge badge-warning" style="margin-left: 8px;">${liga.inadimplentes} inadimplente${liga.inadimplentes > 1 ? 's' : ''}</span>`
    : '';

  return `
    <div class="card card-clickable" onclick="window.router.navigate('/ligas', { ligaId: ${liga.id} })">
      <div class="card-header">
        <div>
          <h3 class="card-title">${liga.nome}</h3>
          <p class="card-subtitle">Temporada ${liga.temporada}</p>
        </div>
        <span style="font-size: 32px;">🏆</span>
      </div>

      <div class="card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <p class="text-muted" style="font-size: 13px; margin: 0;">Participantes</p>
            <p style="font-size: 20px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono);">
              ${liga.participantesAtivos}/${liga.participantesTotais}
            </p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 13px; margin: 0;">Rodada Atual</p>
            <p style="font-size: 20px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono);">
              ${liga.rodadaAtual}
            </p>
          </div>
        </div>

        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 12px;">
          <p class="text-muted" style="font-size: 13px; margin: 0 0 4px 0;">Saldo Total</p>
          <p class="${saldoClass}" style="font-size: 24px; font-weight: 700; margin: 0; font-family: var(--font-mono);">
            R$ ${liga.saldoTotal.toFixed(2).replace('.', ',')}
          </p>
          ${inadimplentesWarning}
        </div>

        <p class="text-muted" style="font-size: 13px; margin: 0;">
          <span style="margin-right: 8px;">⏱️</span>
          ${consolidacaoStatus}
        </p>
      </div>

      <div class="card-footer">
        <span class="text-muted" style="font-size: 12px;">
          ${liga.modulosAtivos.length} módulo${liga.modulosAtivos.length !== 1 ? 's' : ''} ativo${liga.modulosAtivos.length !== 1 ? 's' : ''}
        </span>
        <span style="color: var(--accent-primary); font-weight: 600; font-size: 14px;">
          Ver Detalhes →
        </span>
      </div>
    </div>
  `;
}

function renderAcaoItem(acao) {
  const icons = {
    consolidacao: '⚙️',
    acerto: '💰',
    quitacao: '✅',
    login: '🔐',
    outro: '📝'
  };

  const icon = icons[acao.tipo] || icons.outro;

  const timeString = new Date(acao.timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  let descricao = '';
  if (acao.tipo === 'consolidacao') {
    descricao = `Rodada ${acao.rodada} consolidada - ${acao.ligaNome}`;
  } else if (acao.tipo === 'acerto') {
    descricao = `${acao.participante} - R$ ${acao.valor?.toFixed(2)}`;
  } else if (acao.tipo === 'quitacao') {
    descricao = `Quitação aprovada - ${acao.participante}`;
  } else if (acao.tipo === 'login') {
    descricao = `Login no app mobile`;
  } else {
    descricao = `Ação realizada`;
  }

  return `
    <div class="list-item" style="border-bottom: 1px solid var(--border-color); margin-bottom: 0; border-radius: 0;">
      <div style="font-size: 20px; flex-shrink: 0;">${icon}</div>
      <div class="list-item-content">
        <div class="list-item-title" style="font-size: 14px;">${descricao}</div>
        <div class="list-item-subtitle">${timeString}</div>
      </div>
      ${acao.status === 'success' ? '<span style="font-size: 16px;">✅</span>' : '<span style="font-size: 16px;">❌</span>'}
    </div>
  `;
}

function setupPullToRefresh(container) {
  let startY = 0;
  let pullDistance = 0;
  const threshold = 80;

  let indicator = container.querySelector('.pull-to-refresh');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh';
    indicator.innerHTML = '<div class="pull-to-refresh-icon">↓</div>';
    container.style.position = 'relative';
    container.insertBefore(indicator, container.firstChild);
  }

  container.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0 && !refreshing) {
      startY = e.touches[0].pageY;
    }
  });

  container.addEventListener('touchmove', (e) => {
    if (startY > 0 && !refreshing) {
      pullDistance = e.touches[0].pageY - startY;
      if (pullDistance > 0 && pullDistance < 150) {
        indicator.style.transform = `translateY(${pullDistance}px)`;
        indicator.querySelector('.pull-to-refresh-icon').style.transform =
          `rotate(${pullDistance * 2}deg)`;
      }
    }
  });

  container.addEventListener('touchend', async () => {
    if (pullDistance > threshold && !refreshing) {
      refreshing = true;
      indicator.classList.add('visible');
      indicator.querySelector('.pull-to-refresh-icon').innerHTML = '⟳';

      await loadDashboard(container, true);

      setTimeout(() => {
        indicator.classList.remove('visible');
        indicator.style.transform = '';
        indicator.querySelector('.pull-to-refresh-icon').innerHTML = '↓';
        indicator.querySelector('.pull-to-refresh-icon').style.transform = '';
        refreshing = false;
      }, 300);
    } else {
      indicator.style.transform = '';
      indicator.querySelector('.pull-to-refresh-icon').style.transform = '';
    }

    startY = 0;
    pullDistance = 0;
  });
}

function setupFAB() {
  const fabMenu = document.getElementById('fab-menu');

  fabMenu.innerHTML = `
    <div class="fab-menu-item">
      <div class="fab-menu-label">Consolidar Rodada</div>
      <button class="fab-menu-button" onclick="window.router.navigate('/consolidacao')">
        ⚙️
      </button>
    </div>
    <div class="fab-menu-item">
      <div class="fab-menu-label">Novo Acerto</div>
      <button class="fab-menu-button" onclick="window.router.navigate('/financeiro')">
        💰
      </button>
    </div>
    <div class="fab-menu-item">
      <div class="fab-menu-label">Ver Saúde</div>
      <button class="fab-menu-button" onclick="window.router.navigate('/health')">
        🏥
      </button>
    </div>
  `;
}
