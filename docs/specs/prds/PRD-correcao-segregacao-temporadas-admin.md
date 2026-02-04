# PRD - Correção de Segregação de Temporadas no Admin

## Resumo Executivo

**Problema:** O sistema admin de ligas confunde participantes e dados entre temporadas (2025 vs 2026). Ao acessar temporadas históricas via `?temporada=2025`, os módulos carregam dados da temporada errada.

**Ligas Afetadas:**
- Super Cartola 2026 (ativa)
- Super Cartola 2025 (histórica)
- Cartoleiros 2025 (histórica)

**Impacto:** CRÍTICO - Admin não consegue visualizar dados históricos isolados.

---

## Diagnóstico

### Problema 1: Frontend sobrescreve temporada da URL

**Arquivo:** `public/js/fluxo-financeiro.js:108-118`

**Comportamento atual:**
```javascript
const temporadaSalva = localStorage.getItem('temporadaSelecionada');
if (temporadaSalva) {
    window.temporadaAtual = parseInt(temporadaSalva, 10);  // SOBRESCREVE!
} else {
    window.temporadaAtual = 2026;  // HARDCODED
}
```

**Problema:** Quando admin acessa `?temporada=2025`, o localStorage sobrescreve para 2026.

### Problema 2: Endpoints não filtram por temporada

**Arquivo:** `routes/ligas.js`

**Endpoints afetados:**
- `GET /:id/ranking` (linha 176) - `Rodada.find({ ligaId })`
- `GET /:id/ranking/:rodada` (linha 332)
- `GET /:id/top10` (linha 526)
- `GET /:id/mata-mata` (linha 369)
- `GET /:id/melhor-mes` (linha 253)

**Comportamento:** Retornam dados de TODAS as temporadas misturados.

### Problema 3: Módulos frontend não passam temporada

**Arquivos afetados (App Participante):**
- `participante-top10.js:255`
- `participante-melhor-mes.js:86`
- `participante-historico.js:860, 876`
- `participante-home.js:147`
- `participante-boas-vindas.js:255`
- `participante-cache-manager.js:352`

---

## Solução Implementada

### A.1 - fluxo-financeiro.js
Corrigida prioridade: URL > Orquestrador > localStorage > default

### A.2 - detalhe-liga-orquestrador.js
Adicionada preservação de temporada em `executeModuleScripts()`

### B - routes/ligas.js
Todos os endpoints agora aceitam `?temporada=` query param

### C - Módulos frontend
Todos passam temporada nas requisições

---

## Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `public/js/fluxo-financeiro.js` | Frontend | Prioridade URL sobre localStorage |
| `public/js/detalhe-liga-orquestrador.js` | Frontend | Preservar temporada |
| `routes/ligas.js` | Backend | Filtro temporada em 6 endpoints |
| `services/melhorMesService.js` | Backend | Aceita parâmetro temporada |
| `public/js/rodadas/rodadas-core.js` | Frontend | Adiciona temporada aos endpoints |
| `participante-*.js` (6 arquivos) | Frontend | Passam temporada nas requisições |

---

## Bug Pré-Existente Identificado e CORRIGIDO

**Erro:** `Identifier 'CacheManager' has already been declared`
**Local:** `detalhe-liga-orquestrador.js:719`
**Causa:** O orquestrador reinjetava scripts ao navegar via SPA, causando redeclaração de variáveis globais.

### Correção Aplicada (v9.1)

| Arquivo | Mudança |
|---------|---------|
| `public/layout.html` | Adicionado guard `if (typeof window._layoutCacheManager === 'undefined')` no script inline |
| `public/js/core/cache-manager.js` | Adicionado guard `if (typeof window.CacheManager !== 'undefined')` |

**Status:** CORRIGIDO - Ambos os CacheManager agora verificam se já foram carregados antes de redeclarar.
