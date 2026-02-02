/**
 * Dashboard Page - Página principal do admin mobile
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

export async function render() {
  const container = document.getElementById('page-content');

  showLoading(container);

  try {
    // TODO FASE 2: Implementar dashboard completo
    const data = await API.getDashboard();

    container.innerHTML = `
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">🎉 Bem-vindo ao Admin Mobile!</h2>
          </div>
          <div class="card-body">
            <p>Este é o dashboard do App Mobile Admin.</p>
            <p class="mt-sm"><strong>Status:</strong> FASE 1 concluída ✅</p>
            <p class="mt-sm"><strong>Próxima fase:</strong> Implementação do dashboard com cards de ligas e health score.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📱 PWA Funcional</h3>
          </div>
          <div class="card-body">
            <ul style="padding-left: 20px; color: var(--text-secondary);">
              <li>✅ Service Worker registrado</li>
              <li>✅ Manifest.json configurado</li>
              <li>✅ Bottom Navigation</li>
              <li>✅ Routing SPA</li>
              <li>✅ Dark Mode</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🚀 Próximas Funcionalidades</h3>
          </div>
          <div class="card-body">
            <ul style="padding-left: 20px; color: var(--text-secondary);">
              <li>Cards de ligas com resumo</li>
              <li>Health score badge</li>
              <li>Timeline de últimas ações</li>
              <li>Pull-to-refresh</li>
              <li>Gestão de ligas</li>
              <li>Consolidação manual</li>
              <li>Acertos financeiros</li>
              <li>Push notifications</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    showToast('Dashboard carregado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showError(container, 'Erro ao carregar dashboard. Tente novamente.');
  }
}
