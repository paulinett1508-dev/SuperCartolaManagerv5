/**
 * Dashboard Page - Grid de blocos por categorias
 * Redesign v2 - Sistema de blocos (sem bottom-nav)
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

// ========== SVG ICONS ========== //
const ICONS = {
  consolidacao: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"/><path d="M18.5 13h-13"/><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  ligas: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  rodadas: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  modulos: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  acertos: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  fluxo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  auditoria: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  notificador: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  manutencao: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  saude: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  admins: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  participantes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  historico: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  football: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  orchestrator: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  health: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
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

  // Configura top bar para dashboard
  updateTopBar({ title: 'Super Cartola', subtitle: 'Painel Admin', showBack: false });

  await loadDashboard(container);

  // Scroll-to-top listener
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
          ${renderBlock({ id: 'consolidacao', icon: ICONS.consolidacao, label: 'Consolidacao', desc: 'Consolidar rodadas', color: 'blue', route: '/consolidacao' })}
          ${renderBlock({ id: 'ligas', icon: ICONS.ligas, label: 'Gerenciar Ligas', desc: 'Editar e configurar', color: 'amber', route: '/ligas-gerenciar' })}
          ${renderBlock({ id: 'rodadas', icon: ICONS.rodadas, label: 'Ferramentas', desc: 'Rodadas e tools', color: 'purple', route: '/ferramentas', external: true })}
          ${renderBlock({ id: 'modulos', icon: ICONS.modulos, label: 'Modulos', desc: 'Ativar/desativar', color: 'teal', route: '/modulos', external: true })}
        </div>
      </div>

      <!-- Financeiro -->
      <div class="blocks-section">
        <div class="blocks-section-title">Financeiro</div>
        <div class="blocks-grid">
          ${renderBlock({ id: 'acertos', icon: ICONS.acertos, label: 'Acertos', desc: 'Pagamentos e recebimentos', color: 'green', route: '/financeiro' })}
          ${renderBlock({ id: 'fluxo', icon: ICONS.fluxo, label: 'Fluxo Financeiro', desc: 'Extrato geral', color: 'cyan', route: '/fluxo', external: true })}
          ${renderBlock({ id: 'auditoria', icon: ICONS.auditoria, label: 'Auditoria', desc: 'Auditoria de extratos', color: 'orange', route: '/auditoria' })}
        </div>
      </div>

      <!-- Comunicacao -->
      <div class="blocks-section">
        <div class="blocks-section-title">Comunicacao</div>
        <div class="blocks-grid">
          ${renderBlock({ id: 'notificador', icon: ICONS.notificador, label: 'Notificador', desc: 'Enviar avisos', color: 'pink', route: '/notificador' })}
          ${renderBlock({ id: 'manutencao', icon: ICONS.manutencao, label: 'Manutencao', desc: 'Modo on/off', color: 'red', route: '/manutencao' })}
        </div>
      </div>

      <!-- Sistema -->
      <div class="blocks-section">
        <div class="blocks-section-title">Sistema</div>
        <div class="blocks-grid">
          ${renderBlock({ id: 'saude', icon: ICONS.saude, label: 'Saude', desc: 'Monitoramento', color: 'green', route: '/health' })}
          ${renderBlock({ id: 'admins', icon: ICONS.admins, label: 'Administradores', desc: 'Gestao de acesso', color: 'blue', route: '/admin-gestao' })}
          ${renderBlock({ id: 'participantes', icon: ICONS.participantes, label: 'Participantes', desc: 'Analisar times', color: 'purple', route: '/participantes', external: true })}
          ${renderBlock({ id: 'historico', icon: ICONS.historico, label: 'Historico', desc: 'Acessos recentes', color: 'slate', route: '/historico', external: true })}
        </div>
      </div>

      <!-- Analytics -->
      <div class="blocks-section">
        <div class="blocks-section-title">Analytics</div>
        <div class="blocks-grid">
          ${renderBlock({ id: 'github', icon: ICONS.github, label: 'GitHub', desc: 'Commits e PRs', color: 'slate', route: '/github-analytics', external: true })}
          ${renderBlock({ id: 'football', icon: ICONS.football, label: 'API Football', desc: 'Dados e stats', color: 'cyan', route: '/api-football', external: true })}
        </div>
      </div>
    </div>
  `;
}

// ========== BLOCK RENDERER ========== //
function renderBlock({ id, icon, label, desc, color, route, external, badge }) {
  const onClick = external
    ? `window.open('${getExternalUrl(route)}', '_blank')`
    : `window.router.navigate('${route}')`;

  const badgeHtml = badge
    ? `<span class="block-card-badge badge-${badge.type}">${badge.text}</span>`
    : '';

  const externalIndicator = external
    ? '<span style="position:absolute;top:10px;right:10px;color:var(--text-muted);opacity:0.5;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>'
    : '';

  return `
    <div class="block-card block-card--${color}" onclick="${onClick}" role="button" tabindex="0">
      <div class="block-card-icon">${icon}</div>
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
            <span>⚠️</span>
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

  let emoji = '❓', bgColor = 'rgba(148,163,184,0.15)';
  if (statusNum === 1) { emoji = '🟢'; bgColor = 'rgba(34,197,94,0.15)'; }
  else if (statusNum === 2) { emoji = '🔴'; bgColor = 'rgba(239,68,68,0.15)'; }
  else if (statusNum === 4) { emoji = '🟡'; bgColor = 'rgba(245,158,11,0.15)'; }

  return `
    <div class="status-banner" onclick="window.router.navigate('/orchestrator')">
      <div class="status-banner-row">
        <div class="status-banner-indicator" style="background:${bgColor};">
          <span>${emoji}</span>
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
  let emoji = '🟢', bgColor = 'rgba(34,197,94,0.15)';
  if (healthStatus === 'warning') { emoji = '🟡'; bgColor = 'rgba(245,158,11,0.15)'; }
  else if (healthStatus === 'critical') { emoji = '🔴'; bgColor = 'rgba(239,68,68,0.15)'; }

  const label = healthStatus === 'healthy' ? 'Saudavel' :
                healthStatus === 'warning' ? 'Atencao' : 'Critico';

  return `
    <div class="status-banner" onclick="window.router.navigate('/health')">
      <div class="status-banner-row">
        <div class="status-banner-indicator" style="background:${bgColor};">
          <span>${emoji}</span>
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
            <span style="font-size:16px;">🏆</span>
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
