/**
 * App Module - Inicialização e Routing SPA
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

  /**
   * Adiciona rota
   */
  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  /**
   * Gerencia mudança de rota
   */
  async handleRoute() {
    // Verifica autenticação
    const isAuth = await requireAuth();
    if (!isAuth) {
      return;
    }

    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');

    const route = this.routes[path];
    if (route) {
      const params = this.parseQueryString(queryString);
      await route(params);
      this.updateBottomNav(path);
      this.updatePageHeader(path);
    } else {
      // Rota não encontrada - vai para dashboard
      this.navigate('/');
    }
  }

  /**
   * Navega para rota
   */
  navigate(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const hash = queryString ? `${path}?${queryString}` : path;
    window.location.hash = hash;
  }

  /**
   * Parse query string
   */
  parseQueryString(queryString) {
    if (!queryString) return {};

    return queryString.split('&').reduce((acc, param) => {
      const [key, value] = param.split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  }

  /**
   * Atualiza bottom nav ativo
   */
  updateBottomNav(path) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.route === path) {
        item.classList.add('active');
      }
    });
  }

  /**
   * Atualiza header da página
   */
  updatePageHeader(path) {
    const pageHeader = document.getElementById('page-header');
    const pageTitle = document.getElementById('page-title');

    const titles = {
      '/': 'Dashboard',
      '/ligas': 'Ligas',
      '/consolidacao': 'Consolidação',
      '/financeiro': 'Financeiro',
      '/health': 'Saúde do Sistema',
      '/profile': 'Perfil'
    };

    if (titles[path]) {
      pageTitle.textContent = titles[path];
      pageHeader.style.display = 'block';
    }
  }
}

// ========== APP INIT ========== //
const router = new Router();

// Registra rotas (lazy load)
router.addRoute('/', async (params) => {
  const { render } = await import('./pages/dashboard.js');
  await render();
});

router.addRoute('/ligas', async (params) => {
  const { render } = await import('./pages/ligas.js');
  await render(params);
});

router.addRoute('/consolidacao', async (params) => {
  const { render } = await import('./pages/consolidacao.js');
  await render(params);
});

router.addRoute('/financeiro', async (params) => {
  const { render } = await import('./pages/financeiro.js');
  await render(params);
});

router.addRoute('/health', async (params) => {
  const { render } = await import('./pages/health.js');
  await render(params);
});

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
}

// ========== FAB (Floating Action Button) ========== //
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fab-menu');

fab.addEventListener('click', () => {
  fabMenu.classList.toggle('open');
  fab.innerHTML = fabMenu.classList.contains('open') ? '×' : '+';
});

// Fecha menu ao clicar fora
document.addEventListener('click', (e) => {
  if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
    fabMenu.classList.remove('open');
    fab.innerHTML = '+';
  }
});

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

  // Anima entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove após 3s
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

// Exibe indicador de conexão offline/online
window.addEventListener('online', () => {
  showToast('Conexão restaurada', 'success');
});

window.addEventListener('offline', () => {
  showToast('Você está offline', 'warning');
});

// Exporta router e user para uso global
window.router = router;
window.currentUser = getUser();

console.log('App initialized');
