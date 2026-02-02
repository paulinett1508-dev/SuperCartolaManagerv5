/**
 * Profile Page - Perfil e configurações do admin
 */

import { getUser, logout } from '../auth.js';
import { showToast } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  const user = getUser();

  container.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">👤 Perfil</h2>
        </div>
        <div class="card-body">
          <p><strong>Nome:</strong> ${user?.nome || 'N/A'}</p>
          <p class="mt-sm"><strong>Email:</strong> ${user?.email || 'N/A'}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔔 Notificações</h3>
        </div>
        <div class="card-body">
          <p class="text-muted">Configuração de notificações será implementada na FASE 7</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">ℹ️ Sobre</h3>
        </div>
        <div class="card-body">
          <p><strong>App:</strong> Admin Mobile</p>
          <p class="mt-sm"><strong>Versão:</strong> 1.0.0</p>
          <p class="mt-sm"><strong>Fase:</strong> FASE 1 - Setup PWA ✅</p>
        </div>
      </div>

      <button class="btn btn-danger btn-block mt-lg" onclick="handleLogout()">
        Sair da Conta
      </button>
    </div>
  `;

  // Adiciona handler de logout global
  window.handleLogout = () => {
    showToast('Saindo...', 'info');
    setTimeout(() => {
      logout();
    }, 500);
  };
}
