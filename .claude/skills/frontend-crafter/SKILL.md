---
name: frontend-crafter
description: Especialista em Frontend Mobile-First, UX Black & Orange, Sistema de Cache Offline (IndexedDB), Navegação SPA v3.0 e Performance. Use para criar/ajustar telas, componentes, otimizar CSS/JS, implementar patterns de cache ou debugging de frontend issues.
allowed-tools: Read, Grep, LS, Bash, Edit
---

# Frontend Crafter Skill (Mobile-First Master)

## 🎯 Missão
Criar experiências frontend excepcionais para o Super Cartola Manager com foco em mobile-first, performance e UX consistente.

---

## 1. 🎨 Design System - Black & Orange

### 1.1 Paleta de Cores

```css
:root {
  /* === PRIMÁRIAS === */
  --laranja: #FF4500;           /* Cor principal */
  --laranja-hover: #FF5500;     /* Hover states */
  --laranja-dark: #CC3700;      /* Variação escura */
  
  /* === BACKGROUNDS === */
  --bg-card: #1a1a1a;           /* Cards dark */
  --bg-secondary: #2a2a2a;      /* Seções alternadas */
  --bg-overlay: rgba(0,0,0,0.8);/* Modals/overlays */
  
  /* === STATUS === */
  --verde-lucro: #10b981;       /* Lucro/Vitória */
  --vermelho-prejuizo: #ef4444; /* Prejuízo/Derrota */
  --amarelo-neutro: #f59e0b;    /* Neutro/Atenção */
  
  /* === TEXTOS === */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  
  /* === BORDAS === */
  --border-color: #333333;
  --border-radius: 12px;
}
```

### 1.2 Typography

```css
/* OBRIGATÓRIO: Usar Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Hierarquia */
.h1 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.h2 { font-size: 24px; font-weight: 700; line-height: 1.3; }
.h3 { font-size: 20px; font-weight: 600; line-height: 1.4; }
.body { font-size: 16px; font-weight: 400; line-height: 1.5; }
.small { font-size: 14px; font-weight: 400; line-height: 1.5; }
.caption { font-size: 12px; font-weight: 500; line-height: 1.4; }
```

### 1.3 Componentes Base

```html
<!-- Card Padrão -->
<div class="card">
  <div class="card-header">
    <h3>Título</h3>
  </div>
  <div class="card-body">
    <!-- Conteúdo -->
  </div>
</div>

<style>
.card {
  background: var(--bg-card);
  border-radius: var(--border-radius);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
</style>

<!-- Botão Primário -->
<button class="btn-primary">
  <i class="material-icons">check</i>
  Confirmar
</button>

<style>
.btn-primary {
  background: linear-gradient(135deg, var(--laranja), var(--laranja-dark));
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 69, 0, 0.4);
}
</style>
```

### 1.4 Icons - Material Icons OBRIGATÓRIO

```html
<!-- NUNCA usar emojis, SEMPRE Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

<!-- Exemplos -->
<i class="material-icons">home</i>
<i class="material-icons">trophy</i>
<i class="material-icons">account_balance_wallet</i>
<i class="material-icons">bar_chart</i>
```

---

## 2. 📱 Arquitetura Mobile SPA v3.0

### 2.1 Estrutura de Fragmentos

```
public/participante/
├── fronts/                    # Templates (fragmentos HTML)
│   ├── home.html
│   ├── ranking.html
│   ├── extrato.html
│   └── perfil.html
├── core/
│   ├── navigation.js          # Sistema de navegação v3.0
│   ├── cache-manager.js       # IndexedDB manager
│   └── api-client.js          # HTTP client
└── modules/
    ├── ranking/
    │   ├── ranking.js         # Lógica do módulo
    │   └── ranking.css        # Estilos específicos
    └── extrato/
        └── ...
```

**IMPORTANTE:** Fragmentos são HTML puro sem `<html>`, `<head>` ou `<body>`.

```html
<!-- ✅ CORRETO: fronts/ranking.html -->
<div id="ranking-container">
  <h2>Ranking</h2>
  <div class="ranking-list"></div>
</div>

<!-- ❌ ERRADO -->
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>...</body>
</html>
```

### 2.2 Navegação SPA v3.0

```javascript
// participante-navigation.js
class NavigationManager {
  constructor() {
    this.currentPage = null;
    this.debounceTimer = null;
    this.DEBOUNCE_DELAY = 100; // ms
  }
  
  async navigate(page, skipHistory = false) {
    // Debounce - NUNCA usar flag de travamento
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      await this._doNavigate(page, skipHistory);
    }, this.DEBOUNCE_DELAY);
  }
  
  async _doNavigate(page, skipHistory) {
    // Validar página
    const validPages = ['home', 'ranking', 'extrato', 'perfil'];
    if (!validPages.includes(page)) {
      console.error('Página inválida:', page);
      return;
    }
    
    // Evitar navegação duplicada
    if (this.currentPage === page) return;
    
    try {
      // 1. Loading state
      this.showLoading();
      
      // 2. Carregar fragmento
      const html = await fetch(`/participante/fronts/${page}.html`).then(r => r.text());
      
      // 3. Renderizar
      document.getElementById('main-content').innerHTML = html;
      
      // 4. Executar módulo específico
      await this.loadModule(page);
      
      // 5. Atualizar history
      if (!skipHistory) {
        window.history.pushState({ page }, '', `#${page}`);
      }
      
      // 6. Atualizar nav
      this.updateActiveNav(page);
      this.currentPage = page;
      
    } catch (error) {
      console.error('Erro ao navegar:', error);
      this.showError();
    } finally {
      this.hideLoading();
    }
  }
  
  async loadModule(page) {
    // Carregar script do módulo dinamicamente
    if (typeof window[`${page}Module`] === 'object') {
      await window[`${page}Module`].init();
    }
  }
  
  showLoading() {
    // Glass overlay - OBRIGATÓRIO em reloads
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'glass-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }
  
  hideLoading() {
    document.getElementById('loading-overlay')?.remove();
  }
}

// Interceptar botão voltar
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    navManager.navigate(e.state.page, true);
  }
});
```

### 2.3 Loading States

```html
<!-- Splash Screen (apenas 1ª visita) -->
<div id="splash-screen" class="splash">
  <img src="/img/logo.png" alt="Super Cartola">
  <div class="spinner"></div>
</div>

<!-- Glass Overlay (reloads/PTR) -->
<div class="glass-overlay">
  <div class="spinner"></div>
</div>

<style>
.splash {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.glass-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 69, 0, 0.3);
  border-top-color: var(--laranja);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

---

## 3. 💾 Performance & Cache (IndexedDB)

### 3.1 Cache Strategy - Cache-First

```javascript
// cache-manager.js
class CacheManager {
  constructor() {
    this.dbName = 'super_cartola_cache';
    this.version = 1;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Criar stores
        if (!db.objectStoreNames.contains('participante')) {
          db.createObjectStore('participante', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('ranking')) {
          db.createObjectStore('ranking', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('extrato')) {
          db.createObjectStore('extrato', { keyPath: 'key' });
        }
      };
    });
  }
  
  async get(store, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);
      
      request.onsuccess = () => {
        const data = request.result;
        
        // Verificar TTL
        if (data && this.isExpired(data)) {
          this.delete(store, key);
          resolve(null);
        } else {
          resolve(data);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async set(store, data, ttl = null) {
    const record = {
      ...data,
      _timestamp: Date.now(),
      _ttl: ttl || this.getTTL(store)
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  isExpired(data) {
    if (!data._timestamp || !data._ttl) return false;
    return Date.now() - data._timestamp > data._ttl;
  }
  
  getTTL(store) {
    const TTL_MAP = {
      participante: 24 * 60 * 60 * 1000,  // 24h
      liga: 24 * 60 * 60 * 1000,          // 24h
      ranking: 60 * 60 * 1000,            // 1h
      extrato: 30 * 60 * 1000             // 30min
    };
    return TTL_MAP[store] || 60 * 60 * 1000; // default 1h
  }
}

// Cache-First Pattern
async function loadRanking() {
  // 1. Tentar cache (render instantâneo)
  const cached = await cacheManager.get('ranking', 'current');
  if (cached) {
    renderRanking(cached.data);
  }
  
  // 2. Fetch fresh (background)
  try {
    const fresh = await fetch('/api/ranking').then(r => r.json());
    await cacheManager.set('ranking', { key: 'current', data: fresh });
    
    // 3. Re-render se mudou
    if (!cached || JSON.stringify(cached.data) !== JSON.stringify(fresh)) {
      renderRanking(fresh);
    }
  } catch (error) {
    // Se fetch falhar e temos cache, continuar com cache
    if (!cached) {
      showError('Não foi possível carregar dados');
    }
  }
}
```

### 3.2 TTL por Módulo

```javascript
const CACHE_TTL = {
  // Dados estáticos/semi-estáticos
  participante: 24 * 60 * 60 * 1000,    // 24h
  liga: 24 * 60 * 60 * 1000,            // 24h
  config: 7 * 24 * 60 * 60 * 1000,      // 7 dias
  
  // Dados dinâmicos
  ranking: 60 * 60 * 1000,              // 1h
  extrato: 30 * 60 * 1000,              // 30min
  rodadaAtual: 10 * 60 * 1000,          // 10min
  
  // Dados em tempo real
  liveFeed: 60 * 1000                   // 1min
};
```

---

## 4. 🎭 Admin UI (Desktop)

### 4.1 Layout Padrão

```html
<div class="admin-layout">
  <aside class="sidebar">
    <div class="logo">
      <img src="/img/logo.png" alt="SC">
      <h3>Super Cartola</h3>
    </div>
    <nav>
      <a href="#dashboard" class="nav-item active">
        <i class="material-icons">dashboard</i>
        Dashboard
      </a>
      <a href="#ligas" class="nav-item">
        <i class="material-icons">emoji_events</i>
        Ligas
      </a>
      <!-- ... -->
    </nav>
  </aside>
  
  <main class="main-content">
    <header class="topbar">
      <h1>Dashboard</h1>
      <div class="user-menu">...</div>
    </header>
    
    <div class="content">
      <!-- Módulo renderizado aqui -->
    </div>
  </main>
</div>

<style>
.admin-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
}

.sidebar {
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  padding: 24px;
  overflow-y: auto;
}

.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  height: 64px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}
</style>
```

### 4.2 Módulos Admin

```javascript
// Padrão de módulo admin
const adminTesouraria = {
  currentLigaId: null,
  currentTemporada: null,
  
  async render(container, ligaId, temporada) {
    this.currentLigaId = ligaId;
    this.currentTemporada = temporada;
    
    // Carregar template
    const template = await fetch('/admin/modules/tesouraria.html').then(r => r.text());
    document.querySelector(container).innerHTML = template;
    
    // Carregar dados
    await this.loadData();
    
    // Bind events
    this.bindEvents();
  },
  
  async loadData() {
    const data = await fetch(`/api/tesouraria/${this.currentLigaId}/${this.currentTemporada}`)
      .then(r => r.json());
    
    this.renderTable(data);
    this.renderStats(data);
  },
  
  renderTable(data) {
    const tbody = document.querySelector('#tesouraria-table tbody');
    tbody.innerHTML = data.participantes.map(p => `
      <tr>
        <td>${p.nome}</td>
        <td class="${p.saldo >= 0 ? 'positivo' : 'negativo'}">
          R$ ${p.saldo.toFixed(2).replace('.', ',')}
        </td>
        <td>
          <button onclick="adminTesouraria.verExtrato('${p.id}')">
            Ver Extrato
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  bindEvents() {
    // ...
  },
  
  // API pública
  async recarregar() {
    await this.loadData();
  },
  
  mudarTemporada(temporada) {
    this.currentTemporada = temporada;
    this.recarregar();
  }
};
```

---

## 5. 📤 Export System (Mobile Dark HD)

### 5.1 Configuração Padrão

```javascript
const EXPORT_CONFIG = {
  backgroundColor: '#000000',
  scale: 2,                    // Retina
  useCORS: true,
  logging: false,
  width: 1080,
  height: 1920,
  pixelRatio: 2
};

async function exportarModulo(elementId, filename) {
  const element = document.getElementById(elementId);
  
  // Aplicar classe de export (mobile otimizado)
  element.classList.add('export-mode');
  
  try {
    const canvas = await html2canvas(element, EXPORT_CONFIG);
    
    // Download
    const link = document.createElement('a');
    link.download = `${filename}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // Feedback
    showToast('✅ Imagem exportada com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar:', error);
    showToast('🔴 Erro ao exportar imagem');
  } finally {
    element.classList.remove('export-mode');
  }
}
```

### 5.2 CSS para Export

```css
/* Otimizações para export */
.export-mode {
  width: 1080px !important;
  min-height: 1920px !important;
  padding: 40px !important;
  background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%) !important;
}

.export-mode .card {
  box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
}

.export-mode .text {
  -webkit-font-smoothing: antialiased !important;
  text-rendering: optimizeLegibility !important;
}
```

---

## 6. 🛠️ Debugging & Tools

### 6.1 Performance Monitoring

```javascript
// Adicionar no index.html
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;
    
    console.log('📊 Performance Metrics:');
    console.log(`  Page Load: ${pageLoadTime}ms`);
    console.log(`  Connect: ${connectTime}ms`);
    console.log(`  Render: ${renderTime}ms`);
    
    // Enviar para analytics (se configurado)
    if (window.analytics) {
      window.analytics.track('page_performance', {
        pageLoadTime,
        connectTime,
        renderTime
      });
    }
  });
}
```

### 6.2 Responsive Debug

```html
<!-- Adicionar no footer -->
<div id="debug-viewport" style="position: fixed; bottom: 0; right: 0; padding: 8px; background: rgba(0,0,0,0.8); color: lime; font-size: 12px; z-index: 10000;">
  <script>
    function updateViewport() {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      document.getElementById('debug-viewport').textContent = `${vw}x${vh}`;
    }
    window.addEventListener('resize', updateViewport);
    updateViewport();
  </script>
</div>
```

---

## 7. 📋 Checklists

### 7.1 Novo Módulo Mobile

```markdown
□ Criar fragmento em /fronts/
□ Criar arquivo JS do módulo
□ Implementar Cache-First pattern
□ Adicionar rota no navigation.js
□ Criar ícone Material Icons
□ Testar em viewport mobile (360x640)
□ Validar TTL do cache
□ Implementar loading states
□ Testar offline
□ Validar export (se aplicável)
```

### 7.2 CSS Performance

```markdown
□ Evitar seletores complexos (> 3 níveis)
□ Usar transform para animações (não top/left)
□ Adicionar will-change em elementos animados
□ Minificar antes de deploy
□ Verificar bundle size (<100KB)
□ Usar CSS Grid/Flexbox (não floats)
□ Lazy load imagens (loading="lazy")
```

---

**STATUS:** 🎨 Frontend Crafter - READY TO CRAFT

**Versão:** 3.0 (Mobile-First Master)

**Última atualização:** 2026-01-17
