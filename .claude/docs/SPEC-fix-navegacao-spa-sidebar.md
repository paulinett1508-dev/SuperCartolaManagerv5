# SPEC: Fix Navegacao SPA - Sidebar Travando na Segunda Tentativa

**Data:** 2026-02-08
**PRD:** PRD-fix-navegacao-spa-sidebar.md
**Fase:** SPECIFICATION (Workflow High Senior Protocol)

---

## Resumo da Solucao

3 mudancas cirurgicas em 1 arquivo principal (`layout.html`) + 1 mudanca defensiva no `gerenciar.html`. Zero risco de regressao financeira, zero impacto multi-tenant.

---

## MUDANCA 1 (CRITICA): Corrigir Filtro de Scripts SPA

**Arquivo:** `public/layout.html`
**Linhas:** 1044-1048
**Tipo:** Bug fix - filtro de string muito abrangente

### Codigo Atual (BUGADO)
```javascript
// Extrair scripts inline da nova página (exceto layout.html e layout loaders)
const newScripts = Array.from(doc.querySelectorAll('script:not([src])')).filter(s => {
    const text = s.textContent || '';
    return !text.includes('CacheManager') && !text.includes('SPANavigation') && !text.includes('loadLayout');
});
```

### Problema
- `!text.includes('loadLayout')` filtra QUALQUER script que tenha a string `loadLayout`
- 9 paginas tem `async function loadLayout()` nos seus scripts inline:
  - `gerenciar.html`, `painel.html`, `ferramentas-rodadas.html`, `gerenciar-modulos.html`, `preencher-liga.html`, `analisar-participantes.html`, `api-football-analytics.html`, `modo-manutencao.html`, `ferramentas.html`
- 7 dessas estao na lista `supportedPages` do SPA
- Resultado: script de inicializacao de 7+ paginas e descartado na navegacao SPA

### Codigo Novo (FIX)
```javascript
// Extrair scripts inline da nova página (exceto o script de infraestrutura do layout.html)
const newScripts = Array.from(doc.querySelectorAll('script:not([src])')).filter(s => {
    const text = s.textContent || '';
    // Filtrar APENAS o script do layout.html (contém marcadores únicos de infraestrutura)
    const isLayoutInfraScript = text.includes('__layout_state') || text.includes('SPANavigation');
    return !isLayoutInfraScript;
});
```

### Justificativa
- `__layout_state` e `SPANavigation` sao marcadores **unicos** do script de infraestrutura do layout.html
- Nenhuma pagina individual usa essas strings nos seus scripts
- Isso permite que scripts de paginas como `gerenciar.html` (que tem `loadLayout`) passem pelo filtro
- O script do layout.html (que tem `__layout_state` E `SPANavigation`) continua sendo corretamente filtrado

### Verificacao de Dependencias (S.D.A)
- `__layout_state` aparece APENAS em `layout.html` (confirmado via grep)
- `SPANavigation` aparece APENAS em `layout.html` (confirmado via grep)
- Nenhum script de pagina individual referencia `__layout_state` ou `SPANavigation`
- Scripts de pagina referenciam: `loadLayout`, `__gerenciar_state`, `initGerenciar`, etc.

---

## MUDANCA 2 (ALTA): Resetar Guards de Pagina na Navegacao SPA

**Arquivo:** `public/layout.html`
**Linhas:** 1086-1092 (dentro de `SPANavigation.navigate()`)
**Tipo:** Enhancement - limpeza de estado entre navegacoes

### Codigo Atual
```javascript
// ✅ FIX: Disparar evento para reinicializar módulos após navegação SPA
const pageName = url?.split('?')[0]?.split('/').pop();
setTimeout(() => {
    window.dispatchEvent(new CustomEvent('spa:navigated', {
        detail: { url, pageName }
    }));
}, 100);
```

### Codigo Novo (FIX)
```javascript
// ✅ FIX: Limpar guards de página antes de reinicializar
const pageName = url?.split('?')[0]?.split('/').pop();

// Resetar guards de páginas específicas para permitir re-inicialização
// Cada página usa __[nome]_setup_done para evitar dupla inicialização
// Ao navegar via SPA, esses guards devem ser limpos
if (window.__gerenciar_setup_done) {
    window.__gerenciar_setup_done = false;
}
if (window.__gerenciar_state) {
    window.__gerenciar_state.initRunning = false;
    window.__gerenciar_state.initialized = false;
    window.__gerenciar_state.lastInitTimestamp = 0;
}

setTimeout(() => {
    window.dispatchEvent(new CustomEvent('spa:navigated', {
        detail: { url, pageName }
    }));
}, 100);
```

### Justificativa
- Quando o SPA substitui `<main>`, os scripts da pagina re-executam (apos Fix 1)
- Mas flags globais como `__gerenciar_setup_done = true` bloqueiam `setupGerenciarPage()`
- Resetar ANTES de executar scripts garante que a pagina inicializa corretamente
- Resetar `initRunning` e `lastInitTimestamp` evita debounce falso-positivo
- Se o script da pagina nao re-executar (edge case), o listener `spa:navigated` serve de fallback

### Verificacao de Dependencias (S.D.A)
- `__gerenciar_setup_done` usado em `gerenciar.html` L452, L456, L541
- `__gerenciar_state` usado em `gerenciar.html` L190-197, L384-401, L441-446
- Resetar esses valores e seguro pois a pagina vai re-inicializar imediatamente
- Nenhum modulo financeiro usa essas flags

---

## MUDANCA 3 (MEDIA): Safety Net para Sidebar Ligas

**Arquivo:** `public/layout.html`
**Linhas:** 659-663 (dentro de `carregarLigasLayout()`)
**Tipo:** Defensive fix - verificar DOM alem da flag

### Codigo Atual
```javascript
// ✅ GUARD: Evita re-execuções em navegação SPA (exceto se forceRefresh)
if (!forceRefresh && window.__layout_state && window.__layout_state.ligasCarregadas) {
    console.log('[LAYOUT] Ligas já carregadas, usando cache de estado...');
    return;
}
```

### Codigo Novo (FIX)
```javascript
// ✅ GUARD: Evita re-execuções em navegação SPA (exceto se forceRefresh)
if (!forceRefresh && window.__layout_state && window.__layout_state.ligasCarregadas) {
    // Verificar se o DOM do sidebar realmente tem ligas renderizadas
    const ligasList = document.getElementById("ligasList");
    if (ligasList && !ligasList.querySelector('.sidebar-ligas-loading')) {
        console.log('[LAYOUT] Ligas já carregadas, usando cache de estado...');
        return;
    }
    // Se o DOM ainda mostra loading, forçar recarregamento
    console.log('[LAYOUT] Guard ativo mas DOM em loading, forçando recarga...');
}
```

### Justificativa
- O guard `ligasCarregadas = true` persiste via `window.__layout_state`
- Se por qualquer razao o sidebar DOM for substituido (edge case), o guard bloquearia a recarga
- A verificacao adicional `!querySelector('.sidebar-ligas-loading')` garante que so pula se o DOM realmente tem conteudo
- Zero impacto em performance (querySelector e O(1) no scope de `ligasList`)

### Verificacao de Dependencias (S.D.A)
- `.sidebar-ligas-loading` definida em `layout.html` L126 (o loading placeholder do sidebar)
- Apos `carregarLigasLayout()` executar, esse elemento e substituido por ligas reais
- A verificacao e idempotente - se loading existe, forca recarga; se nao existe, usa guard

---

## MUDANCA 4 (DEFENSIVA): Limpeza de Modulos Acumulados no DOM

**Arquivo:** `public/layout.html`
**Linhas:** 1131-1149 (dentro de `executeScripts()`)
**Tipo:** Defensive - prevenir acumulo de script modules no DOM

### Codigo Atual
```javascript
inlineScripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    const isModule = oldScript.getAttribute('type') === 'module';
    if (isModule) {
        newScript.type = 'module';
    }
    newScript.textContent = oldScript.textContent;
    document.body.appendChild(newScript);
    if (!isModule) {
        setTimeout(() => newScript.remove(), 100);
    }
    // Módulos permanecem no DOM para manter contexto dos imports
});
```

### Codigo Novo (FIX)
```javascript
inlineScripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    const isModule = oldScript.getAttribute('type') === 'module';
    if (isModule) {
        newScript.type = 'module';
    }
    // ✅ FIX: Marcar scripts SPA para cleanup na próxima navegação
    newScript.setAttribute('data-spa-injected', 'true');
    newScript.textContent = oldScript.textContent;
    document.body.appendChild(newScript);
    if (!isModule) {
        setTimeout(() => newScript.remove(), 100);
    }
    // Módulos permanecem no DOM para manter contexto dos imports
});
```

E no inicio de `executeScripts`, ANTES de injetar novos:
```javascript
executeScripts(externalScripts, inlineScripts) {
    // ✅ FIX: Remover scripts de módulos SPA da navegação anterior
    document.querySelectorAll('script[data-spa-injected="true"][type="module"]').forEach(s => s.remove());

    // Carregar scripts externos
    const loadScript = (scriptEl) => {
    ...
```

### Justificativa
- Scripts `type="module"` ficam no DOM permanentemente (nao sao removidos)
- A cada navegacao SPA, um novo `<script type="module">` e adicionado
- Apos 10 navegacoes, 10 scripts identicos no DOM (leak de memoria)
- Marcar com `data-spa-injected` e remover antes de injetar novos previne acumulo
- Os imports do modulo ja foram resolvidos e cacheados pelo browser

### Verificacao de Dependencias (S.D.A)
- Nenhum codigo depende de scripts `data-spa-injected` existirem no DOM
- Modulos ES6 sao cacheados pelo browser apos primeiro import
- Remover o `<script>` nao invalida o cache do modulo

---

## LISTA PRECISA DE ARQUIVOS A MODIFICAR

| # | Arquivo | Linhas | Mudanca | Risco |
|---|---------|--------|---------|-------|
| 1 | `public/layout.html` | 1044-1048 | Fix filtro scripts SPA | Baixo |
| 2 | `public/layout.html` | 1086-1092 | Reset guards pagina | Baixo |
| 3 | `public/layout.html` | 659-663 | Safety net sidebar DOM | Zero |
| 4 | `public/layout.html` | 1104+, 1131 | Cleanup script modules | Zero |

**Total: 1 arquivo modificado, 4 regioes cirurgicas.**

---

## DEPENDENCIAS VALIDADAS (S.D.A)

### Quem importa layout.html?
- `gerenciar.html` via `loadLayout()` → fetch + DOMParser
- `detalhe-liga-orquestrador.js` via `loadLayout()` → fetch + DOMParser
- `painel.html` via `loadLayout()` → fetch + DOMParser
- Todas as paginas admin via `loadLayout()` (pattern universal)
- **Impacto:** TODOS se beneficiam do fix

### Quais IDs/classes CSS sao usados?
- `.sidebar-ligas-loading` → usado na Mudanca 3 para verificar DOM
- `[data-spa-injected]` → NOVO atributo introduzido na Mudanca 4
- **Conflito:** Nenhum

### Ha formularios que submitam para rotas?
- **Nao.** Todas as mudancas sao em logica de navegacao client-side

### Multi-tenant (liga_id) afetado?
- **Nao.** Nenhuma mudanca toca `liga_id`, autenticacao, ou backend

---

## TESTES NECESSARIOS

### Teste 1: Navegacao Ida/Volta Basica
```
1. Abrir gerenciar.html (carga direta)
2. Clicar numa liga no sidebar → detalhe-liga.html
3. Clicar "Gerenciar Modulos" no sidebar → gerenciar.html
4. VERIFICAR: Lista de ligas carrega (nao fica em "Carregando ligas...")
5. Repetir passos 2-4 mais 3 vezes
6. VERIFICAR: Funciona em todas as tentativas
```

### Teste 2: Primeira Visita via SPA
```
1. Abrir painel.html (dashboard - carga direta)
2. Clicar "Gerenciar Ligas" no sidebar → gerenciar.html (via SPA)
3. VERIFICAR: Lista de ligas carrega corretamente
4. Clicar numa liga → detalhe-liga.html
5. Clicar "Gerenciar Ligas" novamente → gerenciar.html
6. VERIFICAR: Lista carrega novamente
```

### Teste 3: Sidebar Accordions
```
1. Navegar entre paginas via SPA
2. VERIFICAR: Accordions expandem/colapsam normalmente
3. VERIFICAR: Estado do accordion persiste entre navegacoes
```

### Teste 4: Modal de Modulos
```
1. Ir para gerenciar.html
2. Clicar "Modulos" numa liga → modal abre
3. Fechar modal
4. Navegar para outra pagina via sidebar
5. Voltar para gerenciar.html
6. Clicar "Modulos" novamente → modal DEVE abrir
```

### Teste 5: Botao Voltar (Browser)
```
1. gerenciar.html → detalhe-liga.html → clicar voltar
2. VERIFICAR: gerenciar.html carrega corretamente
```

### Teste 6: Refresh (F5)
```
1. Navegar via SPA: gerenciar → detalhe-liga → gerenciar
2. Pressionar F5
3. VERIFICAR: Pagina carrega normalmente (sem restos de estado SPA)
```

### Teste 7: Console (Sem Erros)
```
1. Abrir DevTools > Console
2. Executar testes 1-6
3. VERIFICAR: Nenhum erro JavaScript
4. VERIFICAR: Logs mostram fluxo correto:
   - [SPA] Navegação concluída: gerenciar.html
   - [GERENCIAR] Inicializando página...
   - [GERENCIAR] Lista de ligas carregada
```

---

## ROLLBACK PLAN

### Se algo der errado:
1. Reverter as 4 mudancas em `layout.html` (git checkout public/layout.html)
2. Testar navegacao basica
3. Comportamento volta ao estado anterior (bug existe mas nao regride)

### Se regressao parcial:
- Mudanca 1 e a CRITICA. Se causar problema, reverter apenas ela
- Mudancas 2-4 sao defensivas e podem ser revertidas independentemente

---

## ORDEM DE IMPLEMENTACAO

1. **Mudanca 3** (safety net sidebar) - menor risco, resultado imediato
2. **Mudanca 1** (filtro scripts) - fix principal, resolve 90% do problema
3. **Mudanca 2** (reset guards) - complementa Fix 1, garante 100%
4. **Mudanca 4** (cleanup modules) - preventivo, evita memory leak

---

## Proxima Acao

```
SPEC gerado com sucesso!

Para implementar:
/workflow ler SPEC-fix-navegacao-spa-sidebar.md e implementar

Ou na mesma sessao:
Solicitar FASE 3: CODE
```
