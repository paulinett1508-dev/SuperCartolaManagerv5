# PRD - Bugs Criticos SPA (25/01/2026)

## Resumo Executivo

Este PRD documenta 5 bugs criticos relacionados ao sistema SPA (Single Page Application) do Super Cartola Manager. Todos compartilham uma **causa raiz comum**: o sistema SPA re-executa scripts inline sem contexto adequado, causando re-declaracoes de variaveis e erros de importacao de modulos ES6.

---

## Bugs Documentados

### BUG-001: Re-declaracao de Variaveis no SPA
**Status:** CORRECAO PARCIAL APLICADA (25/01)
**Erro:** `Uncaught SyntaxError: Identifier 'ligaIdCache' has already been declared`
**Arquivo:** `public/detalhe-liga.html`
**Correcao aplicada:** Alterado para usar `window.ligaIdCache` e `window.temporadaCache`
**Verificar:** Se corrigiu o problema apos reiniciar servidor

### BUG-002: Modulos Historicos 2025 Nao Funcionam
**Status:** PENDENTE
**Sintomas:** Ao clicar em modulos da temporada 2025, nada acontece. Cards nao respondem ao clique.
**Ligas Afetadas:**
- SuperCartola (684cb1c8af923da7c7df51de)
- Cartoleiros Sobral (684d821cf1a7ae16d1f89572)

### BUG-003: Modulos 2026 Nao Sao Clicaveis
**Status:** PENDENTE
**Sintomas:** Temporada 2026 / Liga SuperCartola - Nenhum modulo e clicavel
**Logs:** `[CARDS-CONDICIONAIS] 6 cards desabilitados`
**Nota:** Modulos nao configurados deveriam estar desabilitados, mas parecem completamente quebrados

### BUG-004: Menu Ferramentas Sem Renderizacao
**Status:** PENDENTE
**Erro:** `Uncaught SyntaxError: Cannot use import statement outside a module`
**Arquivo:** `public/ferramentas.html`
**Causa:** Script com `type="module"` sendo carregado/injetado incorretamente

### BUG-005: Erro Import Statement no Painel
**Status:** PENDENTE
**Erro:** `Uncaught SyntaxError: Cannot use import statement outside a module`
**Arquivo:** `public/painel.html`
**Causa:** Script com `import` sendo executado pelo sistema de layout sem contexto de modulo

---

## Analise Tecnica

### Arquivos do Sistema SPA Admin

| Arquivo | Funcao | Problema |
|---------|--------|----------|
| `public/detalhe-liga.html` | Pagina principal de detalhe da liga | Scripts inline com variaveis re-declaraveis |
| `public/painel.html` | Dashboard admin | `type="module"` + injecao de layout |
| `public/ferramentas.html` | Menu de ferramentas | Script externo `ferramentas-pesquisar-time.js` |
| `public/layout.html` | Layout compartilhado | Scripts injetados sem contexto de modulo |
| `public/js/detalhe-liga-orquestrador.js` | Coordenador de navegacao | Usa `innerHTML` para carregar modulos |
| `public/js/cards-condicionais.js` | Controle de cards por liga | Clona cards para remover listeners |

### Mecanismo de Falha

```
[1] Pagina carrega (ex: painel.html)
    ↓
[2] JavaScript chama loadLayout()
    ↓
[3] fetch("layout.html") carrega HTML do sidebar
    ↓
[4] DOMParser parseia o HTML
    ↓
[5] Scripts do layout sao RE-EXECUTADOS manualmente:
    scripts.forEach(script => {
        const newScript = document.createElement("script");
        newScript.textContent = script.textContent;  // ⚠️ PROBLEMA 1
        document.head.appendChild(newScript);
    })
    ↓
[6] Se script tem `import` → ERRO (nao e modulo ES6)
    Se script tem `let x` e ja existe → ERRO (re-declaracao)
```

### Problemas Identificados

#### Problema 1: Re-execucao Manual de Scripts
Quando `loadLayout()` injeta scripts do `layout.html`, ele cria `<script>` sem `type="module"`, fazendo com que:
- Scripts ES6 falhem (`Cannot use import statement outside a module`)
- Variaveis `let/const` re-declaradas gerem erro

#### Problema 2: Protecao Parcial em detalhe-liga.html
O arquivo `detalhe-liga.html` foi parcialmente corrigido usando:
```javascript
if (typeof window.ligaIdCache === 'undefined') {
    window.ligaIdCache = null;
}
```
Mas outros arquivos nao tem essa protecao.

#### Problema 3: cards-condicionais.js Clonando Cards
A funcao `aplicarEstadoDesabilitado()` clona cards para remover listeners:
```javascript
const newCard = card.cloneNode(true);
card.parentNode.replaceChild(newCard, card);
```
Isso pode estar removendo os event listeners de navegacao dos cards.

#### Problema 4: Modulos ES6 em Contexto Errado
`painel.html` e `ferramentas.html` usam `<script type="module">` que funcionam nativamente, mas quando o sistema tenta reinjetar esses scripts, perde o contexto de modulo.

---

## Arquivos Afetados

### Arquivos a Modificar (Correcoes)

| Arquivo | Mudanca Necessaria |
|---------|-------------------|
| `public/painel.html` | Proteger scripts contra re-execucao |
| `public/ferramentas.html` | Proteger scripts contra re-execucao |
| `public/detalhe-liga.html` | Verificar se correcao BUG-001 funcionou |
| `public/js/cards-condicionais.js` | Investigar se clonagem quebra navegacao |
| `public/js/detalhe-liga-orquestrador.js` | Verificar `handleModuleClick` |

### Arquivos a Verificar (Diagnostico)

| Arquivo | Motivo |
|---------|--------|
| `public/layout.html` | Ver quais scripts sao injetados |
| `public/js/gerenciar-ligas.js` | Dependencia do painel |
| `public/js/core/cache-manager.js` | Dependencia do painel |

---

## Solucao Proposta

### Estrategia 1: Protecao Anti Re-Declaracao (Quick Fix)

Adicionar verificacao antes de declarar variaveis globais:

```javascript
// Antes (ERRO)
let minhaVariavel = null;

// Depois (SEGURO)
if (typeof window.minhaVariavel === 'undefined') {
    window.minhaVariavel = null;
}
// Ou
window.minhaVariavel = window.minhaVariavel ?? null;
```

### Estrategia 2: Evitar Re-Execucao de Scripts

Na funcao `loadLayout()`, verificar se scripts com `type="module"` existem e NAO re-executa-los:

```javascript
scripts.forEach((script) => {
    // SKIP scripts type="module" - eles ja executaram nativamente
    if (script.type === 'module') {
        console.log('[LAYOUT] Pulando script type=module');
        return;
    }

    // Verificar se script ja foi executado
    const scriptId = script.id || btoa(script.textContent.substring(0,50));
    if (window._executedScripts?.has(scriptId)) {
        return;
    }

    // Marcar como executado
    window._executedScripts = window._executedScripts || new Set();
    window._executedScripts.add(scriptId);

    // Executar apenas scripts inline sem module
    if (script.textContent.trim()) {
        const newScript = document.createElement("script");
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
    }
});
```

### Estrategia 3: Investigar cards-condicionais.js

Verificar se a clonagem de cards esta removendo listeners de navegacao:

```javascript
// ANTES (perde listeners)
const newCard = card.cloneNode(true);
card.parentNode.replaceChild(newCard, card);

// DEPOIS (preserva estrutura, apenas adiciona classe)
card.classList.add("disabled");
card.style.pointerEvents = "none";
```

---

## Prioridade de Correcao

| Ordem | Bug | Impacto | Complexidade |
|-------|-----|---------|--------------|
| 1 | BUG-001 | Alto | Baixa (ja parcialmente corrigido) |
| 2 | BUG-005 | Alto | Media (painel admin principal) |
| 3 | BUG-004 | Alto | Media (ferramentas admin) |
| 4 | BUG-002 | Alto | Media (temporadas historicas) |
| 5 | BUG-003 | Alto | Media (relacionado a BUG-002) |

---

## Dependencias Mapeadas (S.D.A)

```
BUG-001 detalhe-liga.html
├── Ja corrigido parcialmente (window.ligaIdCache)
└── Verificar: Funciona apos reiniciar?

BUG-005 painel.html
├── Depende de: layout.html (loadLayout)
├── Depende de: js/gerenciar-ligas.js (import)
├── Depende de: js/core/cache-manager.js (import)
└── Problema: Re-execucao de scripts perde type="module"

BUG-004 ferramentas.html
├── Depende de: layout.html (loadLayout)
├── Depende de: js/ferramentas/ferramentas-pesquisar-time.js
└── Problema: Script externo carregado em contexto errado

BUG-002 & BUG-003 (Modulos nao clicaveis)
├── Depende de: js/cards-condicionais.js (clonagem de cards)
├── Depende de: js/detalhe-liga-orquestrador.js (handleModuleClick)
├── API: /api/ligas/{id}/configuracoes
└── Problema: Clonagem remove event listeners OU config retorna dados errados
```

---

## Metricas de Sucesso

- [ ] BUG-001: `detalhe-liga.html` carrega sem erro de re-declaracao
- [ ] BUG-005: `painel.html` carrega e funciona (sem erro de import)
- [ ] BUG-004: `ferramentas.html` renderiza cards de ferramentas
- [ ] BUG-002: Modulos da temporada 2025 sao clicaveis
- [ ] BUG-003: Modulos da temporada 2026 respondem ao clique

---

## Proximos Passos

1. **FASE 2 (SPEC):** Especificar mudancas cirurgicas por arquivo
2. **FASE 3 (CODE):** Implementar correcoes na ordem de prioridade
3. **VALIDACAO:** Testar cada bug individualmente apos correcao

---

## Referencias

- pending-tasks.md (documentacao original dos bugs)
- Analise do agente Explore (sistema SPA mapeado)
- detalhe-liga.html linhas 130-172 (correcao parcial BUG-001)
- cards-condicionais.js linhas 88-98 (clonagem de cards)

---

*PRD gerado em: 25/01/2026*
*Fase: PESQUISA (1 de 3)*
*Workflow: High Senior Protocol*
