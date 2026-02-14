/**
 * Ligas Gerenciar Page - Lista e acoes rapidas sobre ligas
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  updateTopBar('Gerenciar Ligas', 'Editar e configurar ligas');

  showLoading(container);

  try {
    const response = await API.getLigas();
    const ligas = Array.isArray(response) ? response : (response.ligas || []);
    renderPage(container, ligas);
  } catch (error) {
    console.error('Erro ao carregar ligas:', error);
    showError(container, error.message || 'Erro ao carregar ligas.');
  }
}

function updateTopBar(title, subtitle) {
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const backBtn = document.getElementById('btn-back');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle || '';
  if (backBtn) backBtn.classList.remove('hidden');
}

function renderPage(container, ligas) {
  if (ligas.length === 0) {
    container.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-state-icon"><span class="material-icons mi-xl">emoji_events</span></div>
          <h3 class="empty-state-title">Nenhuma liga encontrada</h3>
          <p class="empty-state-text">Crie sua primeira liga pelo painel web</p>
          <button class="btn btn-primary" onclick="window.open('/criar-liga.html','_blank')">
            Criar Liga (Web)
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="container">
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${ligas.map(liga => renderLigaManageCard(liga)).join('')}
      </div>

      <div style="margin-top:var(--spacing-lg);text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/criar-liga.html','_blank')" style="gap:6px;">
          <span class="material-icons mi-inline">add</span>
          Criar Nova Liga (Web)
        </button>
      </div>
    </div>
  `;
}

function renderLigaManageCard(liga) {
  const modulosCount = liga.modulosAtivos ? liga.modulosAtivos.length : 0;
  const participantesAtivos = liga.participantesAtivos || 0;
  const participantesTotais = liga.participantesTotais || 0;

  return `
    <div class="card" style="padding:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="material-icons" style="font-size:22px;color:var(--accent-warning);">emoji_events</span>
          <div>
            <div style="font-size:15px;font-weight:600;color:var(--text-primary);">${liga.nome}</div>
            <div style="font-size:12px;color:var(--text-muted);">Temporada ${liga.temporada}</div>
          </div>
        </div>
        <span class="badge badge-info" style="font-size:10px;">${participantesAtivos}/${participantesTotais}</span>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" style="flex:1;min-width:0;font-size:12px;padding:8px 10px;"
          onclick="window.router.navigate('/ligas', { ligaId: '${liga.id}' })">
          Detalhes
        </button>
        <button class="btn btn-ghost btn-sm" style="flex:1;min-width:0;font-size:12px;padding:8px 10px;"
          onclick="window.open('/editar-liga.html?id=${liga.id}','_blank')">
          Editar
        </button>
        <button class="btn btn-ghost btn-sm" style="flex:1;min-width:0;font-size:12px;padding:8px 10px;"
          onclick="window.open('/gerenciar.html?liga=${liga.id}','_blank')">
          Modulos
        </button>
        <button class="btn btn-primary btn-sm" style="flex:1;min-width:0;font-size:12px;padding:8px 10px;"
          onclick="window.syncLiga('${liga.id}')">
          Sincronizar
        </button>
      </div>
    </div>
  `;
}

// Sync global handler
window.syncLiga = async function(ligaId) {
  try {
    showToast('Sincronizando participantes...', 'info');
    const resp = await fetch(`/api/ligas/${ligaId}/sincronizar-participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    if (data.success || resp.ok) {
      showToast('Participantes sincronizados!', 'success');
    } else {
      showToast(data.error || 'Erro ao sincronizar', 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
};
