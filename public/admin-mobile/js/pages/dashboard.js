/**
 * Dashboard Page - Grid de blocos por categorias
 * Redesign v2 - Material Icons, sem emojis
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

// ========== MATERIAL ICON HELPER ========== //
const mi = (name, cls = '') => `<span class="material-icons${cls ? ' ' + cls : ''}">${name}</span>`;
const mio = (name, cls = '') => `<span class="material-icons-outlined${cls ? ' ' + cls : ''}">${name}</span>`;

// ========== BLOCK ICON MAP (Material Icons) ========== //
const BLOCK_ICONS = {
  consolidacao: 'sync',
  ligas: 'emoji_events',
  rodadas: 'calendar_month',
  modulos: 'grid_view',
  acertos: 'payments',
  fluxo: 'bar_chart',
  auditoria: 'fact_check',
  notificador: 'notifications_active',
  manutencao: 'build',
  saude: 'monitor_heart',
  admins: 'admin_panel_settings',
  participantes: 'groups',
  historico: 'schedule',
  github: 'code',
  football: 'sports_soccer',
};

// ========== MARKET STATUS LABELS ========== //
const MARKET_LABELS = {
  1: 'ABERTO', 2: 'FECHADO', 3: 'DESBLOQUEADO',
  4: 'ENCERRADO', 5: 'FUTURO', 6: 'TEMPORADA ENCERRADA',
};

let orchestratorData = null;

// ========== RENDER ========== //
export async function render() {
  const container = document.getElementById('page-content');

  updateTopBar({ title: 'Super Cartola', subtitle: 'Painel Admin', showBack: false });

  await loadDashboard(container);
  setupScrollToTop();
}

function updateTopBar({ title, subtitle, showBack }) {
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const backBtn = document.getElementById('btn-back');

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle || '';
  if (backBtn) backBtn.classList.toggle('hidden', !showBack);
}

async function loadDashboard(container) {
  showLoading(container);

  try {
    const [data, orchData] = await Promise.all([
      API.getDashboard(),
      fetchOrchestratorStatus(),
    ]);

    orchestratorData = orchData;
    renderDashboard(container, data);
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showError(container, error.message || 'Erro ao carregar dashboard.');
  }
}

// ========== MAIN RENDER ========== //
function renderDashboard(container, data) {
  const { healthScore, healthStatus, ligas } = data;

  container.innerHTML = `
    <div class="container">
      <!-- Status Duo: Orchestrator + Health -->
      <div class="status-duo">
        ${renderOrchestratorBanner()}
        ${renderHealthBanner(healthScore, healthStatus)}
      </div>

      <!-- Ligas Rapidas -->
      ${ligas.length > 0 ? `
        <div class="blocks-section">
          <div class="blocks-section-title">Suas Ligas</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${ligas.map(liga => renderLigaQuickCard(liga)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Operacoes -->
      <div class="blocks-section">
        <div class="blocks-section-title">Operacoes</div>
        <div class="blocks-grid">
          ${renderBlock({ icon: BLOCK_ICONS.consolidacao, label: 'Consolidacao', desc: 'Consolidar rodadas', color: 'blue', route: '/consolidacao' })}
          ${renderBlock({ icon: BLOCK_ICONS.ligas, label: 'Gerenciar Ligas', desc: 'Editar e configurar', color: 'amber', route: '/ligas-gerenciar' })}
          ${renderBlock({ icon: BLOCK_ICONS.rodadas, label: 'Ferramentas', desc: 'Rodadas e tools', color: 'purple', route: '/ferramentas', external: true })}
          ${renderBlock({ icon: BLOCK_ICONS.modulos, label: 'Modulos', desc: 'Ativar/desativar', color: 'teal', route: '/modulos', external: true })}
        </div>
      </div>

      <!-- Financeiro -->
      <div class="blocks-section">
        <div class="blocks-section-title">Financeiro</div>
        <div class="blocks-grid">
          ${renderBlock({ icon: BLOCK_ICONS.acertos, label: 'Acertos', desc: 'Pagamentos e recebimentos', color: 'green', route: '/financeiro' })}
          ${renderBlock({ icon: BLOCK_ICONS.fluxo, label: 'Fluxo Financeiro', desc: 'Extrato geral', color: 'cyan', route: '/fluxo', external: true })}
          ${renderBlock({ icon: BLOCK_ICONS.auditoria, label: 'Auditoria', desc: 'Auditoria de extratos', color: 'orange', route: '/auditoria' })}
        </div>
      </div>

      <!-- Comunicacao -->
      <div class="blocks-section">
        <div class="blocks-section-title">Comunicacao</div>
        <div class="blocks-grid">
          ${renderBlock({ icon: BLOCK_ICONS.notificador, label: 'Notificador', desc: 'Enviar avisos', color: 'pink', route: '/notificador' })}
          ${renderBlock({ icon: BLOCK_ICONS.manutencao, label: 'Manutencao', desc: 'Modo on/off', color: 'red', route: '/manutencao' })}
        </div>
      </div>

      <!-- Sistema -->
      <div class="blocks-section">
        <div class="blocks-section-title">Sistema</div>
        <div class="blocks-grid">
          ${renderBlock({ icon: BLOCK_ICONS.saude, label: 'Saude', desc: 'Monitoramento', color: 'green', route: '/health' })}
          ${renderBlock({ icon: BLOCK_ICONS.admins, label: 'Administradores', desc: 'Gestao de acesso', color: 'blue', route: '/admin-gestao' })}
          ${renderBlock({ icon: BLOCK_ICONS.participantes, label: 'Participantes', desc: 'Analisar times', color: 'purple', route: '/participantes', external: true })}
          ${renderBlock({ icon: BLOCK_ICONS.historico, label: 'Historico', desc: 'Acessos recentes', color: 'slate', route: '/historico', external: true })}
        </div>
      </div>

      <!-- Analytics -->
      <div class="blocks-section">
        <div class="blocks-section-title">Analytics</div>
        <div class="blocks-grid">
          ${renderBlock({ icon: BLOCK_ICONS.github, label: 'GitHub', desc: 'Commits e PRs', color: 'slate', route: '/github-analytics', external: true })}
          ${renderBlock({ icon: BLOCK_ICONS.football, label: 'API Football', desc: 'Dados e stats', color: 'cyan', route: '/api-football', external: true })}
        </div>
      </div>
    </div>
  `;
}

// ========== BLOCK RENDERER ========== //
function renderBlock({ icon, label, desc, color, route, external, badge }) {
  const onClick = external
    ? `window.open('${getExternalUrl(route)}', '_blank')`
    : `window.router.navigate('${route}')`;

  const badgeHtml = badge
    ? `<span class="block-card-badge badge-${badge.type}">${badge.text}</span>`
    : '';

  const externalIndicator = external
    ? `<span style="position:absolute;top:10px;right:10px;color:var(--text-muted);opacity:0.5;">${mi('open_in_new', 'mi-xs')}</span>`
    : '';

  return `
    <div class="block-card block-card--${color}" onclick="${onClick}" role="button" tabindex="0">
      <div class="block-card-icon">${mi(icon)}</div>
      <div class="block-card-label">${label}</div>
      ${desc ? `<div class="block-card-desc">${desc}</div>` : ''}
      ${badgeHtml}
      ${externalIndicator}
    </div>
  `;
}

function getExternalUrl(route) {
  const map = {
    '/ferramentas': '/ferramentas-rodadas.html',
    '/modulos': '/gerenciar.html',
    '/fluxo': '/fluxo-financeiro.html',
    '/participantes': '/analisar-participantes.html',
    '/historico': '/historico-acessos.html',
    '/github-analytics': '/github-analytics-unified.html',
    '/api-football': '/api-football-analytics.html',
  };
  return map[route] || route;
}

// ========== STATUS BANNERS ========== //
function renderOrchestratorBanner() {
  if (!orchestratorData) {
    return `
      <div class="status-banner" onclick="window.router.navigate('/orchestrator')">
        <div class="status-banner-row">
          <div class="status-banner-indicator" style="background:rgba(148,163,184,0.15);">
            ${mi('warning', 'mi-md')}
          </div>
          <div class="status-banner-info">
            <div class="status-banner-title">Orchestrator</div>
            <div class="status-banner-detail">Indisponivel</div>
          </div>
        </div>
      </div>
    `;
  }

  const live = orchestratorData.live || {};
  const statusNum = live.statusMercado;
  const statusLabel = live.statusMercadoLabel || MARKET_LABELS[statusNum] || '?';
  const rodada = live.rodadaAtual || '?';

  let dotClass = 'mi-dot--muted', bgColor = 'rgba(148,163,184,0.15)';
  if (statusNum === 1) { dotClass = 'mi-dot--success'; bgColor = 'rgba(34,197,94,0.15)'; }
  else if (statusNum === 2) { dotClass = 'mi-dot--danger'; bgColor = 'rgba(239,68,68,0.15)'; }
  else if (statusNum === 4) { dotClass = 'mi-dot--warning'; bgColor = 'rgba(245,158,11,0.15)'; }

  return `
    <div class="status-banner" onclick="window.router.navigate('/orchestrator')">
      <div class="status-banner-row">
        <div class="status-banner-indicator" style="background:${bgColor};">
          <span class="mi-dot ${dotClass}" style="width:14px;height:14px;"></span>
        </div>
        <div class="status-banner-info">
          <div class="status-banner-title">${statusLabel}</div>
          <div class="status-banner-detail">R${rodada}</div>
        </div>
      </div>
    </div>
  `;
}

function renderHealthBanner(healthScore, healthStatus) {
  let dotClass = 'mi-dot--success', bgColor = 'rgba(34,197,94,0.15)';
  if (healthStatus === 'warning') { dotClass = 'mi-dot--warning'; bgColor = 'rgba(245,158,11,0.15)'; }
  else if (healthStatus === 'critical') { dotClass = 'mi-dot--danger'; bgColor = 'rgba(239,68,68,0.15)'; }

  const label = healthStatus === 'healthy' ? 'Saudavel' :
                healthStatus === 'warning' ? 'Atencao' : 'Critico';

  return `
    <div class="status-banner" onclick="window.router.navigate('/health')">
      <div class="status-banner-row">
        <div class="status-banner-indicator" style="background:${bgColor};">
          <span class="mi-dot ${dotClass}" style="width:14px;height:14px;"></span>
        </div>
        <div class="status-banner-info">
          <div class="status-banner-title">${label}</div>
          <div class="status-banner-detail" style="font-family:var(--font-mono);font-weight:600;">${healthScore}/100</div>
        </div>
      </div>
    </div>
  `;
}

// ========== LIGA QUICK CARD ========== //
function renderLigaQuickCard(liga) {
  const saldoFormatted = (liga.saldoTotal || 0).toFixed(2).replace('.', ',');
  const saldoColor = (liga.saldoTotal || 0) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
  const inadimplentes = liga.inadimplentes > 0
    ? `<span class="badge badge-warning" style="font-size:10px;padding:2px 6px;">${liga.inadimplentes} inadimpl.</span>`
    : '';

  return `
    <div class="liga-quick-card" onclick="window.router.navigate('/ligas', { ligaId: '${liga.id}' })">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
            ${mi('emoji_events', 'mi-sm')}
            <span style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${liga.nome}</span>
            ${inadimplentes}
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:12px;color:var(--text-muted);">${liga.participantesAtivos}/${liga.participantesTotais} part.</span>
            <span style="font-size:12px;color:var(--text-muted);">R${liga.rodadaAtual}</span>
            <span style="font-size:12px;color:var(--text-muted);">T${liga.temporada}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:15px;font-weight:700;font-family:var(--font-mono);color:${saldoColor};">
            R$ ${saldoFormatted}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ========== ORCHESTRATOR FETCH ========== //
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

// ========== SCROLL TO TOP ========== //
function setupScrollToTop() {
  const btn = document.getElementById('btn-scroll-top');
  if (!btn) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        btn.classList.toggle('hidden', window.scrollY < 300);
        ticking = false;
      });
      ticking = true;
    }
  });
}
