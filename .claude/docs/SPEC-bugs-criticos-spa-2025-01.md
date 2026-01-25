# SPEC - Bugs Criticos SPA (25/01/2026)

## Resumo da Especificacao

Este documento especifica as **mudancas cirurgicas** para corrigir os 5 bugs criticos do sistema SPA do painel administrativo. Todas as correcoes preservam a logica existente e focam em prevenir re-execucao de scripts.

---

## Bugs e Correcoes

### BUG-001: Re-declaracao de Variaveis (detalhe-liga.html)
**Status:** JA CORRIGIDO PARCIALMENTE
**Acao:** Verificar se a correcao existente funciona

**Localizacao:** `public/detalhe-liga.html` linhas 130-156

**Correcao Existente (Validar):**
```javascript
// Linhas 130-132 - JA CORRIGIDO
if (typeof window.ligaIdCache === 'undefined') {
    window.ligaIdCache = null;
}

// Linhas 154-156 - JA CORRIGIDO
if (typeof window.temporadaCache === 'undefined') {
    window.temporadaCache = null;
}
```

**Teste:** Navegar entre paginas no sidebar e voltar para `detalhe-liga.html`. Nao deve aparecer erro de re-declaracao.

---

### BUG-002 e BUG-003: Modulos Nao Clicaveis (cards-condicionais.js)
**Status:** CORRECAO NECESSARIA
**Causa Raiz:** A funcao `aplicarEstadoDesabilitado()` clona os cards para remover listeners, mas isso remove TODOS os listeners, inclusive os de navegacao.

**Arquivo:** `public/js/cards-condicionais.js`
**Linhas Afetadas:** 88-98

**Codigo Atual (PROBLEMA):**
```javascript
// Linha 88-98
function aplicarEstadoDesabilitado(card, moduleId) {
    // Adicionar classe CSS
    card.classList.add("disabled");

    // Remover event listeners existentes clonando o elemento
    const newCard = card.cloneNode(true);       // <-- PROBLEMA: Remove listeners de navegacao tambem
    card.parentNode.replaceChild(newCard, card);

    console.log(`[CARDS-CONDICIONAIS] Card "${moduleId}" desabilitado`);
    return newCard;
}
```

**Mudanca Cirurgica:**
```javascript
// Linha 88-98 - SUBSTITUIR FUNCAO INTEIRA
function aplicarEstadoDesabilitado(card, moduleId) {
    // v2.1 FIX: NAO clonar cards - apenas desabilitar visualmente
    // A clonagem removia os event listeners de navegacao do orquestrador

    // Adicionar classe CSS para estilo visual
    card.classList.add("disabled");

    // Adicionar atributo data para identificacao
    card.dataset.disabledBy = 'cards-condicionais';

    // Bloquear pointer events via CSS (mais seguro que clonar)
    card.style.pointerEvents = "none";
    card.style.opacity = "0.5";

    console.log(`[CARDS-CONDICIONAIS] Card "${moduleId}" desabilitado (v2.1)`);
    return card; // Retorna o mesmo card, nao um clone
}
```

**Motivo:** A clonagem (`cloneNode(true)`) remove TODOS os event listeners, inclusive os adicionados pelo `detalhe-liga-orquestrador.js` para navegacao. A nova abordagem desabilita via CSS sem remover listeners.

---

### BUG-004: Menu Ferramentas Sem Renderizacao (ferramentas.html)
**Status:** CORRECAO NECESSARIA
**Causa Raiz:** O script `ferramentas-pesquisar-time.js` e carregado normalmente, mas a funcao `loadLayout()` tenta re-executar scripts do `layout.html` que contem `type="module"`, causando erro.

**Arquivo:** `public/ferramentas.html`
**Linhas Afetadas:** 457-517 (script type="module" interno)

**Problema Identificado:**
- O `<script type="module">` na linha 457 funciona corretamente na carga inicial
- O problema ocorre quando `loadLayout()` tenta re-executar scripts do `layout.html`
- O layout.html tem scripts inline que sao re-executados sem `type="module"`

**Arquivo a Modificar:** `public/layout.html`
**Linhas Afetadas:** 683-691 (dentro de carregarLigasLayout) - NAO APLICAVEL

**Correcao Real:** Proteger o script principal em `ferramentas.html`

**Mudanca Cirurgica em `public/ferramentas.html` linha 457:**

**Codigo Atual:**
```html
<!-- Linha 457 -->
<script type="module">
    // Carregamento do layout
    async function loadLayout() {
```

**Adicionar Protecao Anti-Dupla-Execucao (antes da linha 459):**
```javascript
<script type="module">
    // === PROTECAO ANTI RE-EXECUCAO SPA ===
    if (window._ferramentasModuleLoaded) {
        console.log('[FERRAMENTAS] Modulo ja carregado, ignorando re-execucao');
    } else {
        window._ferramentasModuleLoaded = true;

    // Carregamento do layout
    async function loadLayout() {
```

**Adicionar Fechamento (antes do `</script>` final, linha ~517):**
```javascript
    // ... resto do codigo existente ...

    } // Fecha o else da protecao anti re-execucao
</script>
```

**Estrutura Final:**
```javascript
<script type="module">
    // === PROTECAO ANTI RE-EXECUCAO SPA ===
    if (window._ferramentasModuleLoaded) {
        console.log('[FERRAMENTAS] Modulo ja carregado, ignorando re-execucao');
    } else {
        window._ferramentasModuleLoaded = true;

        // Carregamento do layout
        async function loadLayout() { ... }

        // Carregar estatisticas
        async function carregarEstatisticas() { ... }

        document.addEventListener("DOMContentLoaded", () => { ... });
    } // Fecha o else
</script>
```

---

### BUG-005: Erro Import Statement no Painel (painel.html)
**Status:** CORRECAO NECESSARIA
**Causa Raiz:** Similar ao BUG-004 - o script `type="module"` funciona na carga inicial, mas pode haver problemas com a re-injecao de scripts via SPA.

**Arquivo:** `public/painel.html`
**Linhas Afetadas:** 254-1237 (script type="module" interno)

**Mudanca Cirurgica em `public/painel.html` linha 254:**

**Codigo Atual:**
```html
<!-- Linha 254 -->
<script type="module">
    import { carregarLigas as carregarLigasAPI } from "./js/gerenciar-ligas.js";
```

**Adicionar Protecao (substituir linha 254-257):**
```javascript
<script type="module">
    // === PROTECAO ANTI RE-EXECUCAO SPA ===
    if (window._painelModuleLoaded) {
        console.log('[PAINEL] Modulo ja carregado, ignorando re-execucao');
    } else {
        window._painelModuleLoaded = true;

        import { carregarLigas as carregarLigasAPI } from "./js/gerenciar-ligas.js";
        import { cacheManager } from "./js/core/cache-manager.js";
```

**NOTA IMPORTANTE:** Em ES6 modules, `import` DEVE estar no nivel superior do modulo, NAO pode estar dentro de blocos `if/else`.

**SOLUCAO ALTERNATIVA - Verificacao no DOMContentLoaded:**

Em vez de envolver TODO o modulo, adicionar verificacao no ponto de inicializacao:

**Mudanca Cirurgica em `public/painel.html` linha 1218:**

**Codigo Atual:**
```javascript
// Linha 1218-1233
// === Inicializar quando a pagina carregar ===
document.addEventListener("DOMContentLoaded", async () => {
    console.log("[DASHBOARD] Inicializando dashboard...");

    const autenticado = await verificarAutenticacao();

    if (autenticado) {
        console.log(
            "[DASHBOARD] Usuario autenticado, carregando ligas...",
        );
        await loadLayout();
        await carregarDadosLigas();
        iniciarAtualizacaoUsuariosOnline();
    } else {
        console.log("[DASHBOARD] Autenticacao falhou");
    }
});
```

**Codigo Corrigido:**
```javascript
// Linha 1218-1233 - SUBSTITUIR BLOCO INTEIRO
// === Inicializar quando a pagina carregar ===
document.addEventListener("DOMContentLoaded", async () => {
    // === PROTECAO ANTI RE-EXECUCAO SPA ===
    if (window._painelInitialized) {
        console.log("[DASHBOARD] Ja inicializado, ignorando re-execucao");
        return;
    }
    window._painelInitialized = true;

    console.log("[DASHBOARD] Inicializando dashboard...");

    const autenticado = await verificarAutenticacao();

    if (autenticado) {
        console.log(
            "[DASHBOARD] Usuario autenticado, carregando ligas...",
        );
        await loadLayout();
        await carregarDadosLigas();
        iniciarAtualizacaoUsuariosOnline();
    } else {
        console.log("[DASHBOARD] Autenticacao falhou");
    }
});
```

---

### Correcao Adicional: ferramentas.html DOMContentLoaded
**Arquivo:** `public/ferramentas.html`
**Linhas Afetadas:** 514-517

**Codigo Atual:**
```javascript
// Linha 514-517
document.addEventListener("DOMContentLoaded", () => {
    loadLayout();
    carregarEstatisticas();
});
```

**Codigo Corrigido:**
```javascript
// Linha 514-517 - SUBSTITUIR BLOCO INTEIRO
document.addEventListener("DOMContentLoaded", () => {
    // === PROTECAO ANTI RE-EXECUCAO SPA ===
    if (window._ferramentasInitialized) {
        console.log("[FERRAMENTAS] Ja inicializado, ignorando re-execucao");
        return;
    }
    window._ferramentasInitialized = true;

    loadLayout();
    carregarEstatisticas();
});
```

---

## Resumo das Mudancas por Arquivo

### 1. `public/js/cards-condicionais.js`
| Linha | Acao | Descricao |
|-------|------|-----------|
| 88-98 | SUBSTITUIR | Remover clonagem, usar CSS para desabilitar |

### 2. `public/painel.html`
| Linha | Acao | Descricao |
|-------|------|-----------|
| 1218-1233 | SUBSTITUIR | Adicionar protecao anti re-execucao no DOMContentLoaded |

### 3. `public/ferramentas.html`
| Linha | Acao | Descricao |
|-------|------|-----------|
| 514-517 | SUBSTITUIR | Adicionar protecao anti re-execucao no DOMContentLoaded |

### 4. `public/detalhe-liga.html`
| Linha | Acao | Descricao |
|-------|------|-----------|
| N/A | VERIFICAR | Correcao ja aplicada, apenas validar funcionamento |

---

## Dependencias Validadas (S.D.A)

```
cards-condicionais.js
├── Usado por: detalhe-liga.html (linha 1051)
├── Funcao afetada: aplicarEstadoDesabilitado()
├── Impacto: Navegacao dos cards de modulo
└── Consumidores: detalhe-liga-orquestrador.js (initializeNavigation)

painel.html
├── Importa: js/gerenciar-ligas.js (carregarLigas)
├── Importa: js/core/cache-manager.js (cacheManager)
├── Carrega: layout.html via loadLayout()
└── Re-executa scripts do layout (PROBLEMA)

ferramentas.html
├── Importa: (nenhum no modulo principal)
├── Carrega: layout.html via loadLayout()
├── Script externo: js/ferramentas/ferramentas-pesquisar-time.js
└── Re-executa scripts do layout (PROBLEMA)

layout.html
├── Define: AccordionManager, SPANavigation, CacheManager
├── Define: carregarLigasLayout(), verificarMenuSuperAdmin()
├── Scripts inline: Re-executados por todas as paginas
└── Scripts podem ser duplicados se executados multiplas vezes
```

---

## Testes de Validacao

### Teste 1: Navegacao SPA (BUG-001, BUG-004, BUG-005)
1. Acessar `painel.html`
2. Clicar em "Ferramentas" no sidebar
3. Clicar em uma liga no sidebar
4. Clicar em "Dashboard" no sidebar
5. **Esperado:** Nenhum erro no console, todas as paginas carregam corretamente

### Teste 2: Cards de Modulos (BUG-002, BUG-003)
1. Acessar `detalhe-liga.html?id=[ID_LIGA]`
2. Clicar no card "Classificacao"
3. Voltar aos cards
4. Clicar no card "Rodadas"
5. **Esperado:** Todos os cards respondem ao clique

### Teste 3: Temporadas Historicas (BUG-002)
1. No sidebar, expandir grupo "2025" (temporada historica)
2. Clicar em uma liga de 2025
3. Clicar nos cards de modulos
4. **Esperado:** Cards funcionam mesmo em temporada historica

### Teste 4: Cards Desabilitados
1. Acessar liga com modulos desabilitados
2. Cards desabilitados devem ter opacidade reduzida
3. Clicar em card desabilitado NAO deve navegar
4. Clicar em card habilitado DEVE navegar
5. **Esperado:** Comportamento correto em ambos os casos

---

## Rollback Plan

Caso as correcoes causem regressoes:

### cards-condicionais.js
Reverter para versao anterior que usa clonagem:
```javascript
function aplicarEstadoDesabilitado(card, moduleId) {
    card.classList.add("disabled");
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
    console.log(`[CARDS-CONDICIONAIS] Card "${moduleId}" desabilitado`);
    return newCard;
}
```

### painel.html / ferramentas.html
Remover as linhas de protecao anti re-execucao adicionadas.

---

## Ordem de Implementacao

1. **cards-condicionais.js** - Correcao mais critica (afeta BUG-002 e BUG-003)
2. **painel.html** - Segunda prioridade (BUG-005)
3. **ferramentas.html** - Terceira prioridade (BUG-004)
4. **Validar detalhe-liga.html** - Apenas teste (BUG-001 ja corrigido)

---

## Commits Sugeridos

```bash
# Commit 1 - Correcao principal
fix(spa): remove clonagem de cards em cards-condicionais.js

A clonagem removia event listeners de navegacao.
Nova abordagem usa CSS para desabilitar visualmente.
Corrige BUG-002 e BUG-003.

# Commit 2 - Protecao painel
fix(spa): adiciona protecao anti re-execucao em painel.html

Previne inicializacao duplicada quando SPA re-carrega pagina.
Corrige BUG-005.

# Commit 3 - Protecao ferramentas
fix(spa): adiciona protecao anti re-execucao em ferramentas.html

Previne inicializacao duplicada quando SPA re-carrega pagina.
Corrige BUG-004.
```

---

---

## Implementação (25/01/2026)

### Correção Aplicada: cards-condicionais.js v2.3

**Problema identificado:** O mapeamento de `modulos_ativos` para `data-module` estava incorreto.

Exemplo:
- `artilheiro` no banco → código tentava encontrar `[data-module="artilheiro"]`
- HTML real: `[data-module="artilheiro-campeao"]`

**Solução:** Criado `MODULO_TO_CARD_MAP` com mapeamento explícito:

```javascript
const MODULO_TO_CARD_MAP = {
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    'top10': 'top10',
    'melhorMes': 'melhor-mes',
    'pontosCorridos': 'pontos-corridos',
    'mataMata': 'mata-mata',
    // ... etc
};
```

**Arquivos modificados:**
- `public/js/cards-condicionais.js` (v2.2 → v2.3)

---

*SPEC gerado em: 25/01/2026*
*Fase: SPECIFICATION (2 de 3) → IMPLEMENTATION (3 de 3)*
*Workflow: High Senior Protocol*
*PRD de origem: PRD-bugs-criticos-spa-2025-01.md*
