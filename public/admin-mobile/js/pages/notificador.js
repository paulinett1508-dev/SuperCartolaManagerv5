/**
 * Notificador Page - Envio de notificacoes push
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  updateTopBar('Notificador', 'Enviar avisos push');

  showLoading(container);

  try {
    const [ligasResp, statsResp] = await Promise.all([
      API.getLigas(),
      fetch('/api/notifications/stats').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const ligas = Array.isArray(ligasResp) ? ligasResp : (ligasResp.ligas || []);
    renderPage(container, ligas, statsResp);
  } catch (error) {
    console.error('Erro ao carregar notificador:', error);
    showError(container, error.message || 'Erro ao carregar notificador.');
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

function renderPage(container, ligas, stats) {
  const totalSubs = stats?.totalSubscriptions || stats?.total || 0;

  container.innerHTML = `
    <div class="container">
      <!-- Stats -->
      <div class="card" style="margin-bottom:var(--spacing-md);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:var(--radius-md);background:rgba(236,72,153,0.15);display:flex;align-items:center;justify-content:center;">
            <span class="material-icons" style="color:#ec4899;">notifications_active</span>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">Push Subscribers</div>
            <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);color:var(--accent-primary);">${totalSubs}</div>
          </div>
        </div>
      </div>

      <!-- Formulario -->
      <div class="card">
        <h3 style="font-size:16px;font-family:var(--font-russo);margin-bottom:var(--spacing-md);">Enviar Notificacao</h3>

        <div class="form-group">
          <label class="form-label" style="font-size:13px;">Liga (opcional)</label>
          <select id="notif-liga" class="form-input" style="font-size:14px;">
            <option value="">Todas as ligas</option>
            ${ligas.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px;">Titulo</label>
          <input type="text" id="notif-titulo" class="form-input" style="font-size:14px;" placeholder="Ex: Rodada consolidada!" maxlength="100">
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px;">Mensagem</label>
          <textarea id="notif-mensagem" class="form-textarea" style="font-size:14px;min-height:80px;" placeholder="Corpo da notificacao..." maxlength="300"></textarea>
        </div>

        <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--spacing-md);">
          <span id="char-count" style="font-size:11px;color:var(--text-muted);">0/300</span>
        </div>

        <button id="btn-enviar" class="btn btn-primary btn-block" onclick="window.enviarNotificacao()" disabled>
          Enviar Notificacao
        </button>
      </div>

      <!-- Link para versao completa -->
      <div style="margin-top:var(--spacing-lg);text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/notificador.html','_blank')">
          Notificador completo (Web)
        </button>
      </div>
    </div>
  `;

  setupFormListeners();
}

function setupFormListeners() {
  const titulo = document.getElementById('notif-titulo');
  const mensagem = document.getElementById('notif-mensagem');
  const btn = document.getElementById('btn-enviar');
  const charCount = document.getElementById('char-count');

  const validate = () => {
    const valid = titulo.value.trim().length > 0 && mensagem.value.trim().length > 0;
    btn.disabled = !valid;
    charCount.textContent = `${mensagem.value.length}/300`;
  };

  titulo.addEventListener('input', validate);
  mensagem.addEventListener('input', validate);
}

window.enviarNotificacao = async function() {
  const titulo = document.getElementById('notif-titulo').value.trim();
  const mensagem = document.getElementById('notif-mensagem').value.trim();
  const ligaId = document.getElementById('notif-liga').value || null;
  const btn = document.getElementById('btn-enviar');

  if (!titulo || !mensagem) return;

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const body = { titulo, mensagem };
    if (ligaId) body.ligaId = ligaId;

    const resp = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao enviar');
    }

    const data = await resp.json();
    const enviadas = data.enviadas || data.sent || 0;
    showToast(`Notificacao enviada para ${enviadas} dispositivo(s)!`, 'success');

    // Limpa formulario
    document.getElementById('notif-titulo').value = '';
    document.getElementById('notif-mensagem').value = '';
    document.getElementById('char-count').textContent = '0/300';
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Notificacao';
  }
};
