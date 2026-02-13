/**
 * Dashboard Page - Página principal do admin mobile
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

let refreshing = false;
let orchestratorData = null;

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
    // Carrega dashboard + orchestrator em paralelo
    const [data, orchData] = await Promise.all([
      API.getDashboard(),
      fetchOrchestratorStatus(),
    ]);

    orchestratorData = orchData;
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
      <!-- Botão de Atualizar -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
        <button
          onclick="window.location.reload()"
          class="btn btn-ghost btn-sm"
          style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(255, 255, 255, 0.25)'; this.style.color='rgba(255, 255, 255, 0.9)';"
          onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='rgba(255, 255, 255, 0.15)'; this.style.color='rgba(255, 255, 255, 0.7)';"
        >
          <span style="font-size: 16px;">↻</span>
          Atualizar
        </button>
      </div>

      <!-- Orchestrator Status Card -->
      ${renderOrchestratorCard()}

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
    <div class="card card-clickable" onclick="window.router.navigate('/ligas', { ligaId: '${liga.id}' })">
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

// ========== ORCHESTRATOR HELPERS ==========

const MARKET_LABELS = {
  1: 'ABERTO', 2: 'FECHADO', 3: 'DESBLOQUEADO',
  4: 'ENCERRADO', 5: 'FUTURO', 6: 'TEMPORADA ENCERRADA',
};

async function fetchOrchestratorStatus() {
  try {
    const resp = await fetch('/api/orchestrator/status');
    const data = await resp.json();
    return data.success ? data : null;
  } catch (err) {
    console.warn('Orchestrator status indisponivel:', err.message);
    return null;
  }
}

function renderOrchestratorCard() {
  if (!orchestratorData) {
    return `
      <div class="card card-clickable" onclick="window.router.navigate('/orchestrator')" style="margin-bottom: var(--spacing-md); opacity: 0.6;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px;">⚠️</span>
          <div style="flex: 1;">
            <h3 class="card-title" style="margin: 0; font-size: 15px;">Orchestrator</h3>
            <p style="margin: 2px 0 0; font-size: 13px; color: var(--text-muted);">Indisponivel - toque para detalhes</p>
          </div>
        </div>
      </div>
    `;
  }

  const live = orchestratorData.live || {};
  const db = orchestratorData.persistido || {};
  const statusNum = live.statusMercado;
  const statusLabel = live.statusMercadoLabel || MARKET_LABELS[statusNum] || '?';
  const fase = live.faseRodada || 'aguardando';

  // Semaforo
  let semaforoEmoji = '❓';
  let semaforoShadow = 'rgba(0,0,0,0.2)';
  if (statusNum === 1) { semaforoEmoji = '🟢'; semaforoShadow = 'rgba(34, 197, 94, 0.3)'; }
  else if (statusNum === 2) { semaforoEmoji = '🔴'; semaforoShadow = 'rgba(239, 68, 68, 0.3)'; }
  else if (statusNum === 4) { semaforoEmoji = '🟡'; semaforoShadow = 'rgba(245, 158, 11, 0.3)'; }

  // Acao status
  let acaoEmoji, acaoTexto, acaoCor;
  if (fase === 'erro') {
    acaoEmoji = '🚨'; acaoTexto = 'Acao necessaria'; acaoCor = 'var(--accent-danger)';
  } else if (live.consolidandoAgora) {
    acaoEmoji = '⏳'; acaoTexto = 'Consolidando...'; acaoCor = 'var(--accent-warning)';
  } else if (statusNum === 1 && (fase === 'concluida' || fase === 'aguardando')) {
    acaoEmoji = '✅'; acaoTexto = 'Tudo automatico'; acaoCor = 'var(--accent-success)';
  } else if (statusNum === 2) {
    acaoEmoji = '⚽'; acaoTexto = 'Rodada em andamento'; acaoCor = 'var(--accent-info)';
  } else {
    acaoEmoji = '📡'; acaoTexto = 'Monitorando'; acaoCor = 'var(--text-muted)';
  }

  // Ultima consolidacao
  let ultimaConsol = 'Nunca';
  if (db.ultima_consolidacao) {
    const diff = Date.now() - new Date(db.ultima_consolidacao).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (min < 1) ultimaConsol = 'Agora';
    else if (min < 60) ultimaConsol = `ha ${min}min`;
    else if (hrs < 24) ultimaConsol = `ha ${hrs}h`;
    else ultimaConsol = `ha ${dias}d`;
  }

  return `
    <div class="card card-clickable" onclick="window.router.navigate('/orchestrator')" style="margin-bottom: var(--spacing-md);">
      <div style="display: flex; align-items: center; gap: 14px;">
        <!-- Semaforo -->
        <div style="
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          box-shadow: 0 0 16px ${semaforoShadow};
          flex-shrink: 0;
        ">${semaforoEmoji}</div>

        <!-- Info -->
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            <h3 class="card-title" style="margin: 0; font-size: 15px;">Mercado ${statusLabel}</h3>
            <span class="badge" style="font-size: 10px; padding: 2px 8px; background: rgba(59,130,246,0.15); color: var(--accent-primary);">
              R${live.rodadaAtual || '?'}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">${acaoEmoji}</span>
            <span style="font-size: 13px; color: ${acaoCor}; font-weight: 500;">${acaoTexto}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
            Consolidacao: ${ultimaConsol}
          </div>
        </div>

        <!-- Seta -->
        <span style="color: var(--accent-primary); font-weight: 600; font-size: 14px; flex-shrink: 0;">
          →
        </span>
      </div>
    </div>
  `;
}

// ========== FAB ==========

function setupFAB() {
  const fabMenu = document.getElementById('fab-menu');

  fabMenu.innerHTML = `
    <div class="fab-menu-item">
      <div class="fab-menu-label">Orchestrator</div>
      <button class="fab-menu-button" onclick="window.router.navigate('/orchestrator')">
        📡
      </button>
    </div>
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
