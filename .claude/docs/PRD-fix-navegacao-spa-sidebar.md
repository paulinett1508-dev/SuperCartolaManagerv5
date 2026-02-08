# PRD: Fix Navegacao SPA - Sidebar Travando na Segunda Tentativa

**Data:** 2026-02-08
**Severidade:** CRITICA - Bloqueia fluxo de trabalho admin
**Fase:** PESQUISA (Workflow High Senior Protocol)

---

## Resumo Executivo

A navegacao SPA entre paginas admin (gerenciar.html, detalhe-liga.html, etc.) funciona apenas na **primeira tentativa**. Na segunda navegacao, a pagina destino fica presa em "Carregando ligas..." sem nunca resolver. O bug afeta TODA navegacao via sidebar que use o sistema SPA.

---

## Sintomas Observados

1. Admin clica em item da sidebar (ex: "Gerenciar Modulos" em Operacoes) -> funciona
2. Admin navega para outra pagina (ex: detalhe-liga.html) -> funciona
3. Admin tenta voltar para "Gerenciar Modulos" -> **TRAVA em "Carregando ligas..."**
4. Console mostra: `[ORQUESTRADOR] Init ja em andamento, pulando...`
5. Console mostra: `[LAYOUT] AccordionManager ja inicializado, pulando...`
6. Nenhum erro de rede, nenhum HTTP 4xx/5xx

---

## Causa Raiz (3 problemas interligados)

### CAUSA 1 (PRINCIPAL): Filtro de Scripts SPA Bloqueia Inicializacao da Pagina

**Arquivo:** `public/layout.html` - linhas 1045-1048
```javascript
const newScripts = Array.from(doc.querySelectorAll('script:not([src])')).filter(s => {
    const text = s.textContent || '';
    return !text.includes('CacheManager') && !text.includes('SPANavigation') && !text.includes('loadLayout');
});
```

**O que acontece:**
- O filtro remove scripts inline que contenham a string `loadLayout`
- O `gerenciar.html` tem uma funcao `loadLayout()` no seu script inline (linha 209)
- Resultado: **TODO o script module do gerenciar.html e descartado** na navegacao SPA
- As funcoes `setupGerenciarPage()`, `initGerenciar()`, `carregarListaLigas()` nunca executam
- O loading state "Carregando ligas..." permanece para sempre

**Evidencia:** O filtro usa `text.includes('loadLayout')` que e muito abrangente - captura qualquer script que mencione `loadLayout`, nao apenas o script do layout.html.

### CAUSA 2: Listener `spa:navigated` So Existe Se Pagina Foi Carregada Diretamente

**Arquivo:** `public/gerenciar.html` - linhas 459-475
```javascript
window.addEventListener('spa:navigated', (e) => {
    const { pageName } = e.detail || {};
    if (pageName === 'gerenciar.html') {
        initGerenciar();
    }
});
```

**O que acontece:**
- Este listener e registrado dentro de `setupGerenciarPage()` (executada no script inline)
- Se a primeira visita a `gerenciar.html` for via SPA, o script e filtrado (Causa 1)
- Logo, `setupGerenciarPage()` nunca roda e o listener nunca e registrado
- Mesmo que o evento `spa:navigated` dispare, ninguem escuta para `gerenciar.html`

### CAUSA 3: Guards Globais de Estado Nunca Resetam na Navegacao SPA

**Arquivo:** `public/layout.html` - multiplas localizacoes

| Flag Global | Valor Apos 1a Carga | Reset na Nav SPA? | Impacto |
|---|---|---|---|
| `window.__layout_state.ligasCarregadas` | `true` (L817) | NAO | Bloqueia `carregarLigasLayout()` |
| `window.AccordionManager._initialized` | `true` (L474) | NAO | Bloqueia re-bind de eventos |
| `window._layoutInicializado` | `true` (L1762) | NAO | Bloqueia `tentarInicializarLayout()` |
| `window.__gerenciar_setup_done` | `true` (L456) | NAO | Bloqueia `setupGerenciarPage()` |
| `window._layoutScriptsInjected` | `true` (L811) | NAO | Bloqueia re-injecao de scripts |

**O que acontece:**
- Na primeira carga, todos os flags sao setados para `true`
- Na navegacao SPA, o `<main>` e substituido (DOM novo), mas os flags permanecem
- O DOM novo tem loading state, mas os guards impedem que qualquer inicializacao rode
- Resultado: loading state eterno

---

## Fluxo do Bug (Passo a Passo)

```
1. PRIMEIRA CARGA (gerenciar.html - via page load)
   -> loadLayout() injeta sidebar + scripts
   -> __layout_state.ligasCarregadas = true
   -> _layoutInicializado = true
   -> __gerenciar_setup_done = true
   -> AccordionManager._initialized = true
   -> Tudo funciona OK

2. NAVEGACAO SPA (gerenciar -> detalhe-liga)
   -> SPANavigation.navigate('detalhe-liga.html?id=xxx')
   -> <main> substituido com conteudo da detalhe-liga
   -> Sidebar permanece no DOM (fora do <main>)
   -> Orquestrador inicializa
   -> Flags globais permanecem todos TRUE

3. NAVEGACAO SPA DE VOLTA (detalhe-liga -> gerenciar)
   -> SPANavigation.navigate('gerenciar.html')
   -> Fetch gerenciar.html HTML
   -> Extrair <main> (com "Carregando ligas..." no ligasContainer)
   -> Substituir <main> atual
   -> Filtrar scripts inline -> script do gerenciar.html REMOVIDO (contem 'loadLayout')
   -> Disparar evento spa:navigated { pageName: 'gerenciar.html' }
   -> Listener NAO existe (nunca foi registrado via SPA) OU
      Listener existe mas initGerenciar() falha pelos guards
   -> "Carregando ligas..." permanece para sempre
```

---

## Arquivos Envolvidos

### Arquivos com Problemas (a modificar)

| Arquivo | Problema | Prioridade |
|---|---|---|
| `public/layout.html` (L1045-1048) | Filtro de scripts muito abrangente | CRITICA |
| `public/layout.html` (L660) | Guard `ligasCarregadas` nunca reseta | ALTA |
| `public/layout.html` (L466) | AccordionManager guard nunca reseta | MEDIA |
| `public/layout.html` (L1753) | `_layoutInicializado` nunca reseta | MEDIA |
| `public/gerenciar.html` (L452-456) | `__gerenciar_setup_done` impede re-setup | ALTA |

### Arquivos Dependentes (impactados)

| Arquivo | Relacao |
|---|---|
| `public/js/detalhe-liga-orquestrador.js` | Tem proprio loadLayout(), mesmo padrao |
| `public/js/gerenciar-ligas.js` | Modulo ES6 importado pelo gerenciar.html |
| `public/js/navigation.js` | Navegacao interna da detalhe-liga (nao SPA) |
| `public/gerenciar-modulos.html` | Mesma pattern - provavel mesmo bug |

### Arquivos Auxiliares (consultar)

| Arquivo | Uso |
|---|---|
| `public/css/modules/dashboard-redesign.css` | Estilos do sidebar redesign |
| `public/js/cards-condicionais.js` | Sistema de cards que tambem tem guards SPA |

---

## Solucao Proposta

### Fix 1 (CRITICO): Corrigir Filtro de Scripts SPA

**Onde:** `public/layout.html` linhas 1045-1048

**De:**
```javascript
const newScripts = Array.from(doc.querySelectorAll('script:not([src])')).filter(s => {
    const text = s.textContent || '';
    return !text.includes('CacheManager') && !text.includes('SPANavigation') && !text.includes('loadLayout');
});
```

**Para:**
```javascript
const newScripts = Array.from(doc.querySelectorAll('script:not([src])')).filter(s => {
    const text = s.textContent || '';
    // Filtrar APENAS scripts que sao do proprio layout.html (verificar marcadores unicos)
    const isLayoutScript = text.includes('__layout_state') ||
                           text.includes('SPANavigation') ||
                           text.includes('CacheManager') && text.includes('AccordionManager');
    return !isLayoutScript;
});
```

**Logica:** Em vez de filtrar qualquer script que contenha `loadLayout` (muito generico), filtrar apenas scripts que contenham marcadores unicos do `layout.html` como `__layout_state` combinado com `SPANavigation`.

### Fix 2 (ALTO): Resetar Guards na Navegacao SPA

**Onde:** `public/layout.html` - dentro do `SPANavigation.navigate()`

Apos substituir o `<main>` e antes de executar scripts, resetar guards relevantes:
```javascript
// Resetar guards de pagina ao navegar via SPA
window.__gerenciar_setup_done = false;
window.__gerenciar_state = undefined;
// NÃO resetar __layout_state pois o sidebar persiste
```

### Fix 3 (MEDIO): Garantir Que Sidebar Nao Fique Em Loading

**Onde:** `public/layout.html` - funcao `carregarLigasLayout()`

O guard de `ligasCarregadas` deve verificar se o DOM do sidebar ainda tem os dados renderizados:
```javascript
if (!forceRefresh && window.__layout_state && window.__layout_state.ligasCarregadas) {
    // Verificar se o DOM ainda tem ligas renderizadas
    const ligasList = document.getElementById("ligasList");
    if (ligasList && !ligasList.querySelector('.sidebar-ligas-loading')) {
        console.log('[LAYOUT] Ligas ja carregadas, usando cache de estado...');
        return;
    }
    // DOM foi substituido, forcar reload
    console.log('[LAYOUT] DOM mudou, recarregando ligas...');
}
```

---

## Impactos Previstos

### Positivos
- Navegacao SPA funciona ida e volta sem travar
- Sidebar atualiza corretamente ao trocar de pagina
- Admin pode navegar livremente entre gerenciar e detalhe-liga

### Riscos
- Possivel dupla inicializacao se guards forem removidos sem cuidado
- Performance: se `carregarLigasLayout()` rodar toda vez, aumenta chamadas API
  - Mitigacao: manter CacheManager (TTL 2min) para evitar chamadas redundantes
- Possivel regredir idempotencia em operacoes financeiras
  - Mitigacao: NAO mexer em guards de controllers financeiros

### Multi-tenant
- Fixes sao puramente frontend (navegacao)
- Nao afetam `liga_id` isolation no backend
- Nao afetam autenticacao ou autorizacao

---

## Testes Necessarios

1. **Navegacao Ida/Volta:** gerenciar -> detalhe-liga -> gerenciar (3x seguidas)
2. **Troca de Liga:** detalhe-liga(A) -> detalhe-liga(B) -> gerenciar
3. **Sidebar Accordions:** Expandir/colapsar apos navegacao SPA
4. **Modal Modulos:** Abrir modal de modulos apos voltar via SPA
5. **Botao Voltar:** Usar back do browser apos navegacao SPA
6. **Refresh:** F5 em qualquer ponto apos navegacao SPA
7. **Multiplas abas:** Duas abas abertas navegando simultaneamente

---

## Proxima Acao

```
PRD gerado com sucesso!

LIMPAR CONTEXTO:
1. Feche esta conversa
2. Abra nova conversa
3. Execute: /workflow ler PRD-fix-navegacao-spa-sidebar.md e gerar Spec
```
