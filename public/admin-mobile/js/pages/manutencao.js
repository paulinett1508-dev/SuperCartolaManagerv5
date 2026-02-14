/**
 * Manutencao Page - Toggle modo manutencao
 */

import { showLoading, showError, showToast } from '../app.js';

let statusData = null;

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  updateTopBar('Manutencao', 'Ativar/desativar modo');

  await loadPage(container);
}

function updateTopBar(title, subtitle) {
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const backBtn = document.getElementById('btn-back');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle || '';
  if (backBtn) backBtn.classList.remove('hidden');
}

async function loadPage(container) {
  showLoading(container);

  try {
    const resp = await fetch('/api/admin/manutencao');
    if (!resp.ok) throw new Error('Falha ao buscar status');
    statusData = await resp.json();
    renderPage(container);
  } catch (error) {
    console.error('Erro ao carregar manutencao:', error);
    showError(container, error.message || 'Erro ao carregar status de manutencao.');
  }
}

function renderPage(container) {
  const isAtivo = statusData?.ativo || statusData?.manutencao?.ativo || false;
  const motivo = statusData?.motivo || statusData?.manutencao?.motivo || '';
  const previsao = statusData?.previsao || statusData?.manutencao?.previsao || '';

  const statusColor = isAtivo ? 'var(--accent-danger)' : 'var(--accent-success)';
  const statusLabel = isAtivo ? 'ATIVADO' : 'DESATIVADO';
  const statusIcon = isAtivo ? '<span class="material-icons" style="font-size:48px;color:var(--accent-danger);">error</span>' : '<span class="material-icons" style="font-size:48px;color:var(--accent-success);">check_circle</span>';
  const statusBg = isAtivo ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';

  container.innerHTML = `
    <div class="container">
      <!-- Status Card -->
      <div class="card" style="text-align:center;padding:24px;border:1px solid ${statusColor};background:${statusBg};">
        <div style="margin-bottom:12px;">${statusIcon}</div>
        <h2 style="font-size:20px;font-weight:700;color:${statusColor};margin-bottom:4px;font-family:var(--font-russo);">
          ${statusLabel}
        </h2>
        <p class="text-muted" style="font-size:13px;">Modo de manutencao</p>
      </div>

      ${isAtivo && motivo ? `
        <div class="card" style="margin-top:10px;">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Motivo:</div>
          <div style="font-size:14px;color:var(--text-primary);">${motivo}</div>
        </div>
      ` : ''}

      ${isAtivo && previsao ? `
        <div class="card" style="margin-top:10px;">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Previsao de retorno:</div>
          <div style="font-size:14px;color:var(--text-primary);">${previsao}</div>
        </div>
      ` : ''}

      <!-- Toggle -->
      <div style="margin-top:var(--spacing-lg);">
        ${isAtivo ? `
          <button id="btn-toggle" class="btn btn-success btn-block btn-lg" onclick="window.toggleManutencao(false)">
            Desativar Manutencao
          </button>
        ` : `
          <!-- Config antes de ativar -->
          <div class="card" style="margin-bottom:12px;">
            <div class="form-group">
              <label class="form-label" style="font-size:13px;">Motivo (opcional)</label>
              <input type="text" id="motivo-input" class="form-input" placeholder="Ex: Atualizacao do sistema" style="font-size:14px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:13px;">Previsao de retorno (opcional)</label>
              <input type="text" id="previsao-input" class="form-input" placeholder="Ex: 30 minutos" style="font-size:14px;">
            </div>
          </div>
          <button id="btn-toggle" class="btn btn-danger btn-block btn-lg" onclick="window.toggleManutencao(true)">
            Ativar Manutencao
          </button>
        `}
      </div>

      <!-- Link para versao avancada -->
      <div style="margin-top:var(--spacing-lg);text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/modo-manutencao-avancado.html','_blank')">
          Configuracoes avancadas (Web)
        </button>
      </div>
    </div>
  `;
}

window.toggleManutencao = async function(ativar) {
  const btn = document.getElementById('btn-toggle');
  const container = document.getElementById('page-content');
  btn.disabled = true;
  btn.textContent = ativar ? 'Ativando...' : 'Desativando...';

  try {
    const endpoint = ativar ? '/api/admin/manutencao/ativar' : '/api/admin/manutencao/desativar';
    const body = {};

    if (ativar) {
      const motivo = document.getElementById('motivo-input')?.value || '';
      const previsao = document.getElementById('previsao-input')?.value || '';
      if (motivo) body.motivo = motivo;
      if (previsao) body.previsao = previsao;
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error('Falha na operacao');

    showToast(ativar ? 'Manutencao ativada!' : 'Manutencao desativada!', 'success');
    await loadPage(container);
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = ativar ? 'Ativar Manutencao' : 'Desativar Manutencao';
  }
};
