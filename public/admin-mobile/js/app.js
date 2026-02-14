/**
 * App Module - Inicializacao e Routing SPA
 * v2 - Redesign com blocos (sem bottom-nav)
 */

import { requireAuth, getUser } from './auth.js';

// ========== ROUTER ========== //
class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  async handleRoute() {
    const isAuth = await requireAuth();
    if (!isAuth) return;

    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');

    const route = this.routes[path];
    if (route) {
      const params = this.parseQueryString(queryString);
      this.currentPage = path;
      await route(params);
    } else {
      this.navigate('/');
    }
  }

  navigate(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const hash = queryString ? `${path}?${queryString}` : path;
    window.location.hash = hash;
  }

  parseQueryString(queryString) {
    if (!queryString) return {};
    return queryString.split('&').reduce((acc, param) => {
      const [key, value] = param.split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  }
}

// ========== APP INIT ========== //
const router = new Router();

// ========== ROTAS ========== //

// Dashboard (Home com blocos)
router.addRoute('/', async (params) => {
  const { render } = await import('./pages/dashboard.js');
  await render();
});

// Liga detalhes
router.addRoute('/ligas', async (params) => {
  const { render } = await import('./pages/ligas.js');
  await render(params);
});

// Gerenciar ligas
router.addRoute('/ligas-gerenciar', async (params) => {
  const { render } = await import('./pages/ligas-gerenciar.js');
  await render(params);
});

// Consolidacao
router.addRoute('/consolidacao', async (params) => {
  const { render } = await import('./pages/consolidacao.js');
  await render(params);
});

// Financeiro (Acertos)
router.addRoute('/financeiro', async (params) => {
  const { render } = await import('./pages/financeiro.js');
  await render(params);
});

// Auditoria
router.addRoute('/auditoria', async (params) => {
  const { render } = await import('./pages/auditoria.js');
  await render(params);
});

// Notificador
router.addRoute('/notificador', async (params) => {
  const { render } = await import('./pages/notificador.js');
  await render(params);
});

// Manutencao
router.addRoute('/manutencao', async (params) => {
  const { render } = await import('./pages/manutencao.js');
  await render(params);
});

// Saude
router.addRoute('/health', async (params) => {
  const { render } = await import('./pages/health.js');
  await render(params);
});

// Admin Gestao
router.addRoute('/admin-gestao', async (params) => {
  const { render } = await import('./pages/admin-gestao.js');
  await render(params);
});

// Orchestrator
router.addRoute('/orchestrator', async (params) => {
  const { render } = await import('./pages/orchestrator.js');
  await render(params);
});

// Perfil
router.addRoute('/profile', async (params) => {
  const { render } = await import('./pages/profile.js');
  await render(params);
});

// ========== ATALHOS (SHORTCUTS) ========== //
const params = new URLSearchParams(window.location.search);
const action = params.get('action');

if (action === 'consolidar') {
  const ligaId = params.get('ligaId');
  const rodada = params.get('rodada');
  if (ligaId && rodada) {
    router.navigate('/consolidacao', { ligaId, rodada });
  } else {
    router.navigate('/consolidacao');
  }
} else if (action === 'acerto') {
  router.navigate('/financeiro');
} else if (action === 'health') {
  router.navigate('/health');
} else if (action === 'manutencao') {
  router.navigate('/manutencao');
} else if (action === 'notificar') {
  router.navigate('/notificador');
}

// ========== TOAST HELPER ========== //
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ========== LOADING HELPER ========== //
export function showLoading(container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
}

export function hideLoading(container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  const loading = container.querySelector('.loading');
  if (loading) {
    loading.remove();
  }
}

// ========== ERROR HELPER ========== //
export function showError(container, message) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  container.innerHTML = `
    <div class="error-message">
      ❌ ${message}
    </div>
  `;
}

// ========== EMPTY STATE HELPER ========== //
export function showEmptyState(container, { icon, title, text, action }) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  let html = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-text">${text}</p>
  `;

  if (action) {
    html += `
      <button class="btn btn-primary" onclick="${action.onClick}">
        ${action.label}
      </button>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// ========== EVENT LISTENERS ========== //

// Atualiza dados quando app volta para foreground
window.addEventListener('app-foreground', () => {
  console.log('App foreground - atualizando dados');
  router.handleRoute();
});

// Exibe indicador de conexao offline/online
window.addEventListener('online', () => {
  showToast('Conexao restaurada', 'success');
});

window.addEventListener('offline', () => {
  showToast('Voce esta offline', 'warning');
});

// Exporta router e user para uso global
window.router = router;
window.currentUser = getUser();

console.log('Admin App v2 initialized - Block Dashboard');
