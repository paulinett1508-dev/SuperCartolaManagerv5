/**
 * Health Page - Dashboard de saúde do sistema
 */

import API from '../api.js';
import { showLoading, showError } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');

  // Esconde FAB
  document.getElementById('fab').classList.add('hidden');

  await loadHealthPage(container);
}

async function loadHealthPage(container) {
  showLoading(container);

  try {
    const data = await API.getHealth();
    renderHealthPage(container, data);
  } catch (error) {
    console.error('Erro ao carregar health:', error);
    showError(container, error.message || 'Erro ao carregar dashboard de saúde.');
  }
}

function renderHealthPage(container, data) {
  const { healthScore, status, components, timestamp } = data;

  const scoreColor = status === 'healthy' ? 'var(--accent-success)' :
                     status === 'warning' ? 'var(--accent-warning)' : 'var(--accent-danger)';

  const statusLabel = status === 'healthy' ? 'Saudável' :
                      status === 'warning' ? 'Atenção' : 'Crítico';

  const statusBadge = status === 'healthy' ? 'badge-success' :
                      status === 'warning' ? 'badge-warning' : 'badge-danger';

  container.innerHTML = `
    <div class="container">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-md);">
        <button onclick="window.router.navigate('/')" class="btn btn-ghost btn-sm" style="min-width: 44px; padding: 8px;">
          ←
        </button>
        <div style="flex: 1;">
          <h2 class="card-title" style="margin: 0; font-size: 20px;">🏥 Saúde do Sistema</h2>
          <p class="text-muted" style="margin: 0; font-size: 14px;">Monitoramento em tempo real</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window.recarregarHealth()" style="min-width: 44px; padding: 8px;">
          ↻
        </button>
      </div>

      <!-- Score Principal -->
      <div class="card" style="text-align: center; padding: 24px;">
        <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 16px;">
          <svg viewBox="0 0 120 120" style="transform: rotate(-90deg);">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="${scoreColor}" stroke-width="10"
              stroke-dasharray="${Math.PI * 100}" stroke-dashoffset="${Math.PI * 100 * (1 - healthScore / 100)}"
              stroke-linecap="round"/>
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
            <span style="font-size: 32px; font-weight: 700; font-family: var(--font-mono); color: ${scoreColor};">${healthScore}</span>
          </div>
        </div>
        <span class="badge ${statusBadge}" style="font-size: 14px; padding: 6px 16px;">${statusLabel}</span>
        ${timestamp ? `<p class="text-muted" style="font-size: 11px; margin-top: 8px;">Atualizado: ${new Date(timestamp).toLocaleString('pt-BR')}</p>` : ''}
      </div>

      <!-- Componentes -->
      <div style="margin-top: var(--spacing-md);">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-sm);">Componentes</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(components || []).map(comp => renderComponentCard(comp)).join('')}
        </div>
      </div>
    </div>
  `;

  window.recarregarHealth = () => loadHealthPage(container);
}

function renderComponentCard(comp) {
  const statusColor = comp.status === 'healthy' ? 'var(--accent-success)' :
                      comp.status === 'warning' ? 'var(--accent-warning)' : 'var(--accent-danger)';

  const statusDot = `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; display: inline-block;"></span>`;

  return `
    <div class="card" style="padding: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">${comp.icone || '📊'}</span>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            ${statusDot}
            <span style="font-size: 14px; font-weight: 600;">${comp.nome}</span>
          </div>
          <p class="text-muted" style="font-size: 12px; margin: 0;">${comp.detalhes}</p>
        </div>
        ${comp.valor ? `<span style="font-size: 13px; font-weight: 600; font-family: var(--font-mono); color: var(--text-muted);">${comp.valor}</span>` : ''}
      </div>
    </div>
  `;
}
