/**
 * Admin Gestao Page - Gerenciamento de administradores
 */

import { showLoading, showError, showToast } from '../app.js';

let isSuperAdmin = false;
let admins = [];

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  updateTopBar('Administradores', 'Gestao de acesso');

  showLoading(container);

  try {
    // Verifica se e super admin
    const checkResp = await fetch('/api/admin/gestao/check-super');
    const checkData = await checkResp.json();
    isSuperAdmin = checkData.isSuperAdmin || checkData.superAdmin || false;

    if (isSuperAdmin) {
      const adminsResp = await fetch('/api/admin/gestao/admins');
      const adminsData = await adminsResp.json();
      admins = adminsData.admins || adminsData || [];
    }

    renderPage(container);
  } catch (error) {
    console.error('Erro ao carregar gestao admin:', error);
    showError(container, error.message || 'Erro ao carregar gestao de admins.');
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

function renderPage(container) {
  if (!isSuperAdmin) {
    container.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <h3 class="empty-state-title">Acesso Restrito</h3>
          <p class="empty-state-text">Apenas Super Admins podem gerenciar administradores</p>
          <button class="btn btn-ghost" onclick="window.router.navigate('/')">Voltar</button>
        </div>
      </div>
    `;
    return;
  }

  const adminsList = Array.isArray(admins) ? admins : [];

  container.innerHTML = `
    <div class="container">
      <!-- Contagem -->
      <div class="card" style="margin-bottom:var(--spacing-md);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:var(--radius-md);background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">Administradores</div>
            <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);color:var(--accent-primary);">${adminsList.length}</div>
          </div>
        </div>
      </div>

      <!-- Lista -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:var(--spacing-lg);">
        ${adminsList.map(admin => renderAdminCard(admin)).join('')}
      </div>

      <!-- Adicionar -->
      <div class="card">
        <h3 style="font-size:16px;font-family:var(--font-russo);margin-bottom:var(--spacing-md);">Adicionar Admin</h3>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-size:13px;">Email</label>
          <input type="email" id="new-admin-email" class="form-input" style="font-size:14px;" placeholder="email@exemplo.com">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-size:13px;">Nome</label>
          <input type="text" id="new-admin-nome" class="form-input" style="font-size:14px;" placeholder="Nome do admin">
        </div>
        <button id="btn-add-admin" class="btn btn-primary btn-block" onclick="window.addAdmin()">
          Adicionar Administrador
        </button>
      </div>

      <!-- Link web -->
      <div style="margin-top:var(--spacing-lg);text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/admin-gestao.html','_blank')">
          Gestao completa (Web)
        </button>
      </div>
    </div>
  `;
}

function renderAdminCard(admin) {
  const ativo = admin.ativo !== false;
  const email = admin.email || 'N/A';
  const nome = admin.nome || admin.name || email;
  const isSA = admin.superAdmin || admin.isSuperAdmin || false;

  return `
    <div class="card" style="padding:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${ativo ? 'var(--accent-success)' : 'var(--accent-danger)'};flex-shrink:0;"></span>
            <span style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${nome}
            </span>
            ${isSA ? '<span class="badge badge-warning" style="font-size:9px;padding:2px 6px;">SUPER</span>' : ''}
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;padding-left:16px;">${email}</div>
        </div>
        ${!isSA ? `
          <button class="btn btn-ghost btn-sm" style="padding:6px 10px;font-size:11px;"
            onclick="window.toggleAdmin('${admin._id || admin.id}', ${!ativo})">
            ${ativo ? 'Desativar' : 'Ativar'}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

window.addAdmin = async function() {
  const email = document.getElementById('new-admin-email')?.value?.trim();
  const nome = document.getElementById('new-admin-nome')?.value?.trim();

  if (!email) {
    showToast('Informe o email', 'warning');
    return;
  }

  const btn = document.getElementById('btn-add-admin');
  btn.disabled = true;
  btn.textContent = 'Adicionando...';

  try {
    const resp = await fetch('/api/admin/gestao/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao adicionar');
    }

    showToast('Admin adicionado!', 'success');
    // Recarrega pagina
    const container = document.getElementById('page-content');
    await render();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Adicionar Administrador';
  }
};

window.toggleAdmin = async function(adminId, ativar) {
  try {
    const resp = await fetch(`/api/admin/gestao/admins/${adminId}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: ativar })
    });

    if (!resp.ok) throw new Error('Erro ao alterar status');

    showToast(ativar ? 'Admin ativado!' : 'Admin desativado!', 'success');
    await render();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
};
