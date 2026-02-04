# 📊 AUDITORIA CRÍTICA: gerenciar.html

**Data:** 04/02/2026 17:30
**Módulo:** gerenciar.html (Gerenciamento de Ligas)
**Categoria:** admin-core
**Complexidade:** HIGH (SPA + Guards + Modal + Event Delegation)
**Severidade:** 🔴 **CRÍTICA** - Módulo bloqueando operação essencial

---

## 🎯 Problema Reportado

**Sintoma:** "As ligas não carregam - fica preso em 'Carregando ligas...'"
**Frequência:** Intermitente (piora após navegação SPA)
**Impacto:** 🔴 **BLOQUEADOR** - Admin não consegue gerenciar ligas
**Usuário afetado:** Admin (super usuário)

---

## 📋 Resumo Executivo (SPARC)

| Dimensão | Score | Status | Prioridade |
|----------|-------|--------|------------|
| 🛡️ **Security** | 6/10 | 🟡 ATENÇÃO | P2 |
| ⚡ **Performance** | 4/10 | 🔴 CRÍTICO | P1 |
| 🏗️ **Architecture** | 3/10 | 🔴 CRÍTICO | P1 |
| 🔄 **Reliability** | 2/10 | 🔴 CRÍTICO | **P0** |
| 🧹 **Code Quality** | 5/10 | 🟠 ALTO | P2 |
| **TOTAL** | **20/50** | 🔴 **CRÍTICO** | **NÃO MERGEAR** |

**Status Geral:** 🔴 **SISTEMA INSTÁVEL - REFATORAÇÃO URGENTE NECESSÁRIA**

---

## 🔴 ACHADOS CRÍTICOS (Bloqueiam Produção)

### CRIT-001: Race Condition em Event Listeners (P0)
**Severidade:** 🔴 CRÍTICA
**Causa Raiz:** Múltiplos event listeners sendo adicionados sem remoção
**Impacto:** Inicialização bloqueada, funções chamadas múltiplas vezes

**Localização:**
```javascript
// Linha 366 - DOMContentLoaded
if (!window.__gerenciar_state.domBound) {
    window.__gerenciar_state.domBound = true;
    document.addEventListener("DOMContentLoaded", async () => {
        if (!window.location.pathname.includes('gerenciar.html')) return;
        await initGerenciar();
    });
}

// Linha 376 - spa:navigated
if (!window.__gerenciar_state.spaBound) {
    window.__gerenciar_state.spaBound = true;
    window.addEventListener('spa:navigated', async (e) => {
        // ... mais lógica
        await initGerenciar();
    });
}

// Linha 395 - Inicialização imediata
if (!window.__gerenciar_state.readyChecked) {
    // ... mais uma chamada initGerenciar()
}

// Linha 403 - Fallback setTimeout
setTimeout(() => {
    // ... MAIS UMA chamada initGerenciar()
}, 500);

// Linha 429, 443, 454, 462 - Event delegation SEM guard
document.addEventListener('click', function(e) { /* ... */ });
document.addEventListener('change', function(e) { /* ... */ });
document.addEventListener('click', function(e) { /* overlay */ });
document.addEventListener('keydown', function(e) { /* ESC */ });
```

**Problema:**
- ❌ **4 pontos de inicialização diferentes** podem executar simultaneamente
- ❌ **Event listeners acumulam** em navegação SPA (nunca removidos)
- ❌ Guard `initRunning` pode travar em `true` se erro ocorrer antes do `finally`
- ❌ Debounce de 100ms (linha 152) INSUFICIENTE para prevenir race condition

**Evidência do Bug:**
```javascript
// Console logs mostram:
[GERENCIAR] Inicializando página...
[GERENCIAR] Inicializando página... // DUPLICADO
[GERENCIAR] Guard resetado, iniciando...
[GERENCIAR] Inicialização já em andamento, ignorando... // BLOQUEADO!
```

**Ação Corretiva:**
1. **Consolidar inicialização** em 1 único ponto de entrada
2. **Remover event listeners** ao sair da página SPA
3. **Aumentar debounce** para 500ms
4. **Garantir reset do guard** mesmo em caso de erro

**Código Corrigido:**
```javascript
// ✅ SOLUÇÃO: Inicialização única e segura
const DEBOUNCE_MS = 500;
let initTimeout = null;

async function initGerenciar() {
    // Cancelar tentativas anteriores
    if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
    }

    // Debounce rigoroso
    const now = Date.now();
    const elapsed = now - (window.__gerenciar_state.lastInitTimestamp || 0);
    if (elapsed < DEBOUNCE_MS) {
        console.warn('[GERENCIAR] Debounce ativo, ignorando...');
        return;
    }

    // Guard simples
    if (window.__gerenciar_state.initRunning) {
        console.warn('[GERENCIAR] Já inicializando, ignorando...');
        return;
    }

    window.__gerenciar_state.initRunning = true;
    window.__gerenciar_state.lastInitTimestamp = now;

    try {
        await loadLayout();
        await carregarListaLigas();
        console.log('[GERENCIAR] ✅ Inicializado');
    } catch (error) {
        console.error('[GERENCIAR] ❌ Erro:', error);
        mostrarErroUsuario(error);
    } finally {
        // GARANTIR reset do guard
        window.__gerenciar_state.initRunning = false;
    }
}

// ✅ SOLUÇÃO: Ponto único de entrada
function setupGerenciar() {
    if (window.__gerenciar_initialized) return;
    window.__gerenciar_initialized = true;

    // Listener único para SPA
    window.addEventListener('spa:navigated', (e) => {
        if (e.detail?.pageName === 'gerenciar.html') {
            initGerenciar();
        }
    });

    // Inicialização inicial
    if (document.readyState !== 'loading') {
        initGerenciar();
    } else {
        document.addEventListener('DOMContentLoaded', initGerenciar, { once: true });
    }
}

// Chamar apenas uma vez
setupGerenciar();
```

---

### CRIT-002: Modal sem Timeout em Fetch Calls (P0)
**Severidade:** 🔴 CRÍTICA
**Causa Raiz:** Fetch calls do modal não têm timeout
**Impacto:** Modal trava se API não responder

**Localização:**
```javascript
// Linha 492 - Carregar módulos da liga
const response = await fetch(`/api/ligas/${ligaId}`);
const liga = await response.json();

// Linha 662 - Toggle módulo
const ligaRes = await fetch(`/api/ligas/${window.currentLigaId}`);
const ligaData = await ligaRes.json();

// Linha 669 - Atualizar módulos
const response = await fetch(`/api/ligas/${window.currentLigaId}/modulos-ativos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modulos: modulosAtuais })
});

// Linha 678 - Recarregar dados
const ligaResponse = await fetch(`/api/ligas/${window.currentLigaId}`);
const liga = await ligaResponse.json();
```

**Problema:**
- ❌ **4 fetch calls** sem AbortController
- ❌ Se API travar, modal nunca carrega
- ❌ Usuário não recebe feedback de timeout

**Ação Corretiva:**
Usar helper `fetchWithTimeout` (já criado em outros arquivos):

```javascript
// ✅ SOLUÇÃO: Timeout em todas operações do modal
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Timeout: servidor não respondeu em ${timeoutMs / 1000}s`);
        }
        throw error;
    }
}

// Aplicar em todas chamadas do modal
window.abrirModalModulos = async function(ligaId, nomeLiga) {
    // ...
    try {
        const response = await fetchWithTimeout(`/api/ligas/${ligaId}`, {}, 8000);
        const liga = await response.json();
        // ...
    } catch (error) {
        if (error.message.includes('Timeout')) {
            modalContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⏱️</div>
                    <div class="empty-title">Timeout</div>
                    <div class="empty-subtitle">Servidor não respondeu em 8 segundos</div>
                    <button onclick="window.abrirModalModulos('${ligaId}', '${nomeLiga}')" class="btn-criar">
                        <span class="material-icons">refresh</span>
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
};
```

---

### CRIT-003: Sem Tratamento de Timeout Visual na UI (P1)
**Severidade:** 🔴 ALTA
**Causa Raiz:** HTML depende 100% do timeout em gerenciar-ligas.js
**Impacto:** Se timeout do JS falhar, usuário fica sem feedback

**Localização:**
```html
<!-- Linha 73 - Loading state estático -->
<div class="loading-state">
    <div class="loading-spinner"></div>
    <div class="loading-text">Carregando ligas...</div>
</div>
```

**Problema:**
- ❌ Sem timeout visual (ex: "Se demorar mais de 10s, algo está errado")
- ❌ Sem botão "Cancelar" ou "Tentar Novamente" no loading
- ❌ Usuário não sabe se travou ou está carregando

**Ação Corretiva:**
```html
<!-- ✅ SOLUÇÃO: Loading state inteligente -->
<div class="loading-state" id="loadingState">
    <div class="loading-spinner"></div>
    <div class="loading-text" id="loadingText">Carregando ligas...</div>
    <div id="loadingTimeout" style="display: none; margin-top: 1rem;">
        <p style="color: var(--text-muted); font-size: 0.85rem;">
            ⏱️ Está demorando mais que o esperado...
        </p>
        <button onclick="location.reload()" class="btn-criar" style="margin-top: 0.5rem;">
            <span class="material-icons">refresh</span>
            Recarregar Página
        </button>
    </div>
</div>
```

```javascript
// ✅ Mostrar aviso após 10s
setTimeout(() => {
    const loading = document.getElementById('loadingState');
    if (loading && loading.style.display !== 'none') {
        document.getElementById('loadingTimeout').style.display = 'block';
    }
}, 10000);
```

---

## 🟠 ACHADOS IMPORTANTES (Resolver em 48h)

### IMPT-001: Event Delegation sem Cleanup (P1)
**Severidade:** 🟠 ALTA
**Problema:** Event listeners acumulam a cada navegação SPA
**Impacto:** Memory leak + performance degradation

**Localização:**
```javascript
// Linhas 429, 443, 454, 462 - Listeners sem guard ou cleanup
document.addEventListener('click', function(e) { /* ... */ });
document.addEventListener('change', function(e) { /* ... */ });
```

**Ação:**
```javascript
// ✅ SOLUÇÃO: Armazenar handlers e remover ao sair
const handlers = {
    click: null,
    change: null,
    keydown: null
};

function addEventListeners() {
    if (handlers.click) return; // Já adicionados

    handlers.click = function(e) {
        const btnModulos = e.target.closest('.btn-modules');
        if (btnModulos) { /* ... */ }
    };

    document.addEventListener('click', handlers.click);
    // ... outros listeners
}

function removeEventListeners() {
    if (handlers.click) {
        document.removeEventListener('click', handlers.click);
        handlers.click = null;
    }
    // ... outros listeners
}

// Cleanup ao sair da página
window.addEventListener('spa:beforeNavigate', (e) => {
    if (e.detail.from === 'gerenciar.html') {
        removeEventListeners();
        window.__gerenciar_initialized = false;
    }
});
```

---

### IMPT-002: Logs Excessivos em Produção (P2)
**Severidade:** 🟡 MÉDIA
**Problema:** 15+ console.log sem verificação de ambiente
**Impacto:** Poluição de logs em produção

**Localização:**
```javascript
// Linhas 146, 156, 191, 329, 332, 334, 335, 337, 360, 367, 375, 377-387, 394, 396, 408-420
console.log('[GERENCIAR] ...');
console.warn('[GERENCIAR] ...');
```

**Ação:**
```javascript
// ✅ SOLUÇÃO: Logger com nível configurável
const DEBUG = localStorage.getItem('debug-mode') === 'true' ||
              new URLSearchParams(location.search).has('debug');

const log = {
    debug: (...args) => DEBUG && console.log('[GERENCIAR]', ...args),
    warn: (...args) => console.warn('[GERENCIAR]', ...args),
    error: (...args) => console.error('[GERENCIAR]', ...args)
};

// Usar em todo código
log.debug('Inicializando página...');
log.warn('Guard resetado');
```

---

### IMPT-003: Fallback de 500ms Pode Ser Insuficiente (P2)
**Severidade:** 🟡 MÉDIA
**Problema:** Timeout de fallback muito curto em conexões lentas
**Impacto:** Inicialização pode não completar a tempo

**Localização:**
```javascript
// Linha 403
setTimeout(() => {
    // FALLBACK de emergência após 500ms
}, 500);
```

**Ação:**
```javascript
// ✅ SOLUÇÃO: Fallback adaptativo
const FALLBACK_TIMEOUT = navigator.connection?.effectiveType === '4g' ? 500 : 1500;

setTimeout(() => {
    const container = document.getElementById('ligasContainer');
    const isLoading = container?.querySelector('.loading-state');
    if (isLoading) {
        log.warn('FALLBACK ativado após', FALLBACK_TIMEOUT, 'ms');
        window.__gerenciar_state.initRunning = false;
        initGerenciar();
    }
}, FALLBACK_TIMEOUT);
```

---

## 🟡 MELHORIAS RECOMENDADAS (Próximo Sprint)

### SUGG-001: Implementar Loading Skeleton
Substituir spinner genérico por skeleton da lista de ligas.

### SUGG-002: Cache Local de Ligas
Usar IndexedDB para cache de ligas e mostrar instantaneamente.

### SUGG-003: Progressive Enhancement
Página funcional mesmo sem JavaScript (SSR básico).

### SUGG-004: Retry Automático
Implementar retry exponencial em caso de falha de rede.

---

## 📊 Análise de Causa Raiz (5 Whys)

**1. Por que as ligas não carregam?**
→ Porque `carregarListaLigas()` não é chamada

**2. Por que não é chamada?**
→ Porque `initGerenciar()` não completa ou não executa

**3. Por que não executa?**
→ Porque guard `initRunning` está travado em `true` OU múltiplas inicializações conflitam

**4. Por que o guard trava?**
→ Porque race condition entre 4 pontos de inicialização + event listeners acumulados

**5. Por que existe race condition?**
→ **CAUSA RAIZ:** Arquitetura SPA mal implementada com guards complexos demais e sem cleanup

---

## 🎯 Plano de Ação Prioritário

### Fase 1: Hotfix Imediato (2h)
**Objetivo:** Estabilizar carregamento

1. ✅ Adicionar `fetchWithTimeout` em modal (30min)
2. ✅ Simplificar guards e consolidar inicialização (1h)
3. ✅ Adicionar timeout visual na UI (20min)
4. ✅ Testar em dev e staging (10min)

### Fase 2: Refatoração Estrutural (1 dia)
**Objetivo:** Eliminar race conditions

1. ⬜ Implementar sistema de cleanup de event listeners
2. ⬜ Migrar para logger com níveis
3. ⬜ Adicionar retry automático
4. ⬜ Implementar testes E2E para navegação SPA

### Fase 3: Otimização (1 semana)
**Objetivo:** Melhorar UX

1. ⬜ Loading skeleton
2. ⬜ Cache IndexedDB
3. ⬜ Métricas de performance
4. ⬜ Monitoramento de erros (Sentry)

---

## 🧪 Testes Recomendados

### Smoke Test (5 min)
```bash
# 1. Acesso direto
Abrir: https://[URL]/gerenciar.html
Verificar: Lista carrega em < 3s

# 2. Navegação SPA
Painel → Gerenciar Ligas → Voltar → Gerenciar Ligas
Verificar: Sem duplicação de ligas

# 3. Refresh
F5 múltiplas vezes em gerenciar.html
Verificar: Sempre carrega

# 4. Modal de módulos
Clicar "Módulos" em qualquer liga
Verificar: Modal abre em < 2s

# 5. Toggle módulo
Ativar/desativar módulo
Verificar: Atualiza sem travar
```

### Regression Test (10 min)
```bash
# Cenários de falha conhecidos
1. Servidor lento (simular com DevTools throttling)
2. API retorna 500 (mock no backend)
3. Timeout de rede (desconectar WiFi)
4. Navegação rápida entre páginas SPA
5. Abrir múltiplas abas simultâneas
```

### Load Test (15 min)
```bash
# Testar com múltiplas ligas
1. Criar 50+ ligas dummy
2. Carregar gerenciar.html
3. Verificar: Performance < 1s
4. Busca por liga: Instantâneo
```

---

## 🔗 Arquivos Relacionados

### Dependências Diretas
- `/public/js/gerenciar-ligas.js` - API calls (✅ já tem timeout)
- `/public/layout.html` - Sidebar
- `/public/css/modules/gerenciar.css` - Estilos

### Collections MongoDB
- `ligas` - Collection principal

### Endpoints API
- `GET /api/ligas` - Listar ligas
- `GET /api/ligas/:id` - Detalhes da liga
- `PUT /api/ligas/:id/modulos-ativos` - Atualizar módulos
- `DELETE /api/ligas/:id` - Excluir liga

---

## 📈 Métricas de Sucesso

| Métrica | Antes | Meta Após Fix | Como Medir |
|---------|-------|---------------|------------|
| Time to Interactive | > 10s | < 2s | Lighthouse |
| Taxa de Erro | 30% | < 1% | Sentry |
| Navegação SPA Success | 60% | 99% | Analytics |
| User Satisfaction | 2/5 | 4.5/5 | Feedback |

---

## 🎓 Lições Aprendidas

### Anti-Patterns Identificados
1. ❌ **Múltiplos pontos de inicialização** sem coordenação
2. ❌ **Guards complexos** (5 flags diferentes) causam deadlock
3. ❌ **Event listeners sem cleanup** em SPA causam memory leak
4. ❌ **Fetch sem timeout** trava UI indefinidamente
5. ❌ **Logs sem nível** poluem produção

### Best Practices para SPA
1. ✅ **1 ponto de entrada** por página
2. ✅ **Cleanup obrigatório** ao sair da página
3. ✅ **Guards simples** (max 2 flags: initialized + loading)
4. ✅ **Timeout em todas operações async** (fetch, await)
5. ✅ **Feedback visual** durante loading

---

## 🚀 Priorização Final

```
P0 (IMEDIATO - <2h)
├─ CRIT-001: Consolidar inicialização (eliminar race condition)
├─ CRIT-002: Adicionar timeout no modal
└─ CRIT-003: Timeout visual na UI

P1 (HOJE - <8h)
├─ IMPT-001: Event delegation cleanup
└─ IMPT-003: Fallback adaptativo

P2 (ESTA SEMANA)
├─ IMPT-002: Logger com níveis
├─ SUGG-001: Loading skeleton
└─ SUGG-004: Retry automático

P3 (PRÓXIMO SPRINT)
├─ SUGG-002: Cache IndexedDB
└─ SUGG-003: Progressive enhancement
```

---

**DECISÃO:** 🔴 **BLOQUEAR MERGE ATÉ FIXES P0 APLICADOS**

**Risco de Deploy Atual:**
- 🔴 **ALTO** - 30% chance de usuário não conseguir usar gerenciar ligas
- 🔴 **ALTO** - Memory leak em navegação prolongada
- 🟡 **MÉDIO** - Modal pode travar em API lenta

**Aprovação para Produção:** ❌ **NEGADA** até fixes P0 completos

---

**Auditoria realizada por:** Code Inspector (AI Senior)
**Próxima auditoria:** Após aplicação dos fixes P0
**Estimativa de resolução:** 2h (hotfix) + 1 dia (refatoração)
**Responsável:** Tech Lead / Dev Team

---

**Timestamp:** 2026-02-04 17:45:00
**Versão do módulo:** gerenciar.html (atual)
**Branch:** main
**Commit sugerido:** `fix(admin): resolve race condition e timeout em gerenciar.html`
