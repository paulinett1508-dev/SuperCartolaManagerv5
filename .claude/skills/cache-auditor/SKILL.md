---
name: cache-auditor
description: Auditor especialista em cache do Super Cartola Manager. Audita 3 ambientes - CACHE-APP --participante (PWA participante), CACHE-WEB --admin (admin desktop), CACHE-APP --admin (admin mobile PWA). Detecta cache stale/morto, valida coerencia com codigo mais recente, verifica Service Workers, IndexedDB schemas, TTLs e MongoDB caches. Foco em velocidade suprema dos ambientes. Salva resultados em cache_auditorias no MongoDB.
allowed-tools: Read, Grep, Glob, Bash
---

# Cache Auditor Skill (Auditor de Cache Multi-Ambiente)

## Missao

Garantir integridade, coerencia e velocidade suprema de TODA a infraestrutura de cache do Super Cartola Manager nos 3 ambientes: participante app, admin web e admin mobile app.

**Principio Central:** A verdade absoluta eh a ultima alteracao no codigo. Cache NUNCA sobrepoe a realidade.

---

## 1. Deteccao de Modo

Ao ser invocado, identificar o modo a partir do comando:

```
/cache-auditor CACHE-APP --participante  → Modo 1: PWA Participante
/cache-auditor CACHE-WEB --admin         → Modo 2: Admin Desktop Web
/cache-auditor CACHE-APP --admin         → Modo 3: PWA Admin Mobile
```

Se nenhum modo especificado, executar os 3 modos sequencialmente.

---

## 2. Modo 1: CACHE-APP --participante

### 2.1 Arquivos a Ler (em paralelo)

```
public/participante/service-worker.js
public/participante/js/participante-offline-cache.js
public/js/core/cache-manager.js
public/js/app/app-version.js
config/appVersion.js
config/version-scope.json
```

### 2.2 Arquivos a Buscar (Glob)

```
public/js/**/*cache*.js
public/js/**/*Cache*.js
public/participante/js/**/*.js
```

### 2.3 Checklist de Auditoria

#### Service Worker (6 checks)

**SW-01: CACHE_NAME atualizado**
- Grep: `CACHE_NAME` em `public/participante/service-worker.js`
- Extrair valor (ex: `super-cartola-v18-copa-sc`)
- Verificar se eh o mais recente (comparar com referencia em app-version.js)
- SEVERIDADE: ALTO se desincronizado

**SW-02: STATIC_ASSETS completo**
- Ler array `STATIC_ASSETS` do service-worker.js
- Comparar com arquivos reais via Glob em `/participante/`
- Detectar assets faltantes
- SEVERIDADE: MEDIO se incompleto

**SW-03: Estrategia fetch correta**
- Verificar no fetch event handler:
  - `/api/*` → NETWORK-ONLY (NUNCA cachear API)
  - `.html` → NETWORK-ONLY (sempre fresco)
  - ES6 modules → NETWORK-ONLY (fix v4.0)
  - Static assets → NETWORK-FIRST com cache fallback
- SEVERIDADE: CRITICO se API cachear

**SW-04: Cleanup de caches antigos**
- Verificar no `activate` event: `caches.keys()` com filtro e `caches.delete()`
- SEVERIDADE: MEDIO se nao limpa

**SW-05: skipWaiting**
- Grep: `self.skipWaiting()` no install event
- SEVERIDADE: BAIXO se ausente

**SW-06: Bypass ES6 modules**
- Verificar que dynamic imports (.js com `type: module`) nao sao interceptados pelo SW
- SEVERIDADE: CRITICO se intercepta (quebra mobile)

#### IndexedDB OfflineCache (6 checks)

**IDB-01: Stores vs modulos ativos**
- Ler stores de `participante-offline-cache.js`
- Ler modulos ativos de `docs/architecture/modules-registry.json`
- Detectar: stores orfaos (store existe mas modulo nao) e modulos sem cache
- SEVERIDADE: MEDIO para orfaos, BAIXO para modulos sem cache

**IDB-02: TTLs apropriados**
- Extrair TTLs de cada store
- Validar regras:
  - ranking/extrato: < 1h durante temporada ativa
  - config/participante/liga: <= 24h
  - modulos de competicao: <= 1h
- SEVERIDADE: ALTO se TTL > regra

**IDB-03: Logica TEMPORADA_ENCERRADA**
- Grep: `isTemporadaEncerrada` ou `SEASON_STATUS`
- Verificar que usa `ParticipanteConfig.SEASON_STATUS === 'encerrada'`
- Verificar que retorna TTL_INFINITO (10 anos)
- SEVERIDADE: ALTO se logica incorreta

**IDB-04: DB_VERSION incrementado**
- Extrair `DB_VERSION` (deve ser Number)
- Verificar se mudou quando stores foram adicionados/removidos
- SEVERIDADE: CRITICO se desatualizado (perda de dados offline)

**IDB-05: Race condition protection**
- Grep: `_initPromise` pattern em `init()`
- Verificar: `if (this.db) return this.db; if (this._initPromise) return this._initPromise;`
- SEVERIDADE: ALTO se ausente

**IDB-06: cleanExpired funcional**
- Verificar que `cleanExpired()` roda automaticamente (setTimeout)
- Verificar que remove entries > 2x TTL
- SEVERIDADE: MEDIO se nao limpa

#### CacheManager (4 checks)

**CM-01: Stores e TTLs**
- Extrair stores e TTLs do cache-manager.js
- Listar: rankings (10min), participantes (5min), extrato (5min), rodadas (15min), status (2min), ligas (20min)

**CM-02: Overlap com OfflineCache**
- Comparar stores do CacheManager com stores do OfflineCache
- Detectar stores com mesmo nome mas TTLs diferentes
- SEVERIDADE: MEDIO se TTLs conflitam

**CM-03: Consistencia de TTLs**
- Verificar que CacheManager TTL <= OfflineCache TTL para mesmos dados
- Memory cache deve ser mais curto que persistent cache

**CM-04: Eviction strategy**
- Verificar `cleanExpired()` automático (setInterval)
- Verificar que memory cache tem limite de tamanho

#### Module Caches (4 checks)

**MC-01: Inventario**
- Glob: `public/js/**/*cache*.js` e `public/js/**/*Cache*.js`
- Para cada arquivo: extrair nome, TTL, max entries, cleanup strategy

**MC-02: TTLs razoaveis**
- TTLs devem ser <= 30min para dados parciais
- TTLs devem ser <= 24h para dados consolidados
- SEVERIDADE: MEDIO se muito longo

**MC-03: Max entries e cleanup**
- Verificar que cada cache tem `maxEntries` ou similar
- Verificar estrategia LRU ou time-based cleanup

**MC-04: Temporada nos cache keys**
- Grep: `temporada` em cache key construction
- CRITICO para caches financeiros (deve segregar por temporada)
- SEVERIDADE: CRITICO se financeiro sem temporada

#### App Version (4 checks)

**AV-01: Intervalos razoaveis**
- `CACHE_TTL` deve ser >= 30s (evitar spam)
- `CHECK_INTERVAL_MS` deve ser >= 60s
- SEVERIDADE: MEDIO se muito agressivo

**AV-02: limparCachesAntigos funcional**
- Verificar que funcao existe e usa `caches.keys()` com filtro
- SEVERIDADE: MEDIO se ausente

**AV-03: CURRENT_SW_CACHE sincronizado**
- Extrair `CURRENT_SW_CACHE` de app-version.js
- Comparar com `CACHE_NAME` real do service-worker.js
- SEVERIDADE: ALTO se diferente (cache morto nao sera limpo)

**AV-04: version-scope.json**
- Ler `config/version-scope.json`
- Verificar que inclui todos os arquivos criticos do participante
- SEVERIDADE: BAIXO se incompleto

#### Performance (2 checks)

**PERF-01: Tamanho total estimado**
- Somar: (stores x TTL x tamanho medio estimado)
- Flag se > 50MB total estimado

**PERF-02: Patterns N+1**
- Buscar patterns onde lista eh cacheada mas items individuais sao buscados separadamente
- Grep: `forEach.*fetch` ou `map.*fetch` em arquivos de cache

---

## 3. Modo 2: CACHE-WEB --admin

### 3.1 Arquivos a Ler

```
public/js/core/cache-manager.js
public/js/ferramentas/ferramentas-cache-admin.js
utils/cache-invalidator.js
routes/cache-universal-routes.js
routes/ranking-geral-cache-routes.js
routes/extratoFinanceiroCacheRoutes.js
```

### 3.2 Checklist de Auditoria

#### Sem Service Worker (2 checks)

**NSW-01:** Grep por `serviceWorker.register` em arquivos HTML do admin (excluindo `/participante/` e `/admin-mobile/`)
- Deve retornar ZERO resultados
- SEVERIDADE: ALTO se encontrar (admin web nao deve ter SW)

**NSW-02:** Confirmar intencionalidade — admin desktop precisa dados sempre frescos

#### CacheManager (4 checks)

**CM-01 a CM-04:** Mesmos checks do Modo 1 (modulo compartilhado)

#### Admin Cache Tools (3 checks)

**ACT-01: Limpar IndexedDB**
- Verificar que `cacheManager.clearAll()` limpa TODOS os databases
- SEVERIDADE: MEDIO se parcial

**ACT-02: Resetar Cache Completo**
- Verificar que dispara `DELETE /api/extrato-cache/{ligaId}/cache`
- SEVERIDADE: ALTO se nao invalida server-side

**ACT-03: Recalcular Tudo**
- Verificar que tem confirmacao (`SuperModal.confirm`)
- Verificar que tem feedback visual (btn.textContent durante processamento)
- SEVERIDADE: MEDIO se sem confirmacao

#### MongoDB Caches (3 checks)

**MDB-01: Indices e temporada**
- Para cada model de cache: ler schema e verificar indices
- `temporada` DEVE estar indexado em todos
- SEVERIDADE: ALTO se temporada nao indexada

**MDB-02: CACHE_DEPENDENCIES completo**
- Ler `cache-invalidator.js`
- Verificar que TODOS os eventos de escrita estao mapeados
- Verificar cascata: FluxoFinanceiroCampos → ExtratoFinanceiroCache → RankingGeralCache
- SEVERIDADE: CRITICO se cadeia quebrada

**MDB-03: Controllers disparam invalidacao**
- Grep: `onCamposSaved|onAcertoCreated|onRodadaUpdated|invalidarPorEvento` em controllers/
- Verificar que TODAS operacoes de escrita chamam invalidacao
- SEVERIDADE: ALTO se faltar

---

## 4. Modo 3: CACHE-APP --admin

### 4.1 Arquivos a Ler

```
public/admin-mobile/service-worker.js
public/admin-mobile/js/app.js
public/admin-mobile/manifest.json
config/appVersion.js
config/version-scope.json
```

### 4.2 Arquivos a Buscar

```
public/admin-mobile/js/pages/*.js
```

### 4.3 Checklist de Auditoria

#### Service Worker (6 checks)

**SW-01:** Extrair `CACHE_NAME` (`scm-admin-v1.0.0`) e `RUNTIME_CACHE` (`scm-admin-runtime`)
**SW-02:** Verificar `STATIC_ASSETS` completo (comparar com `ls /admin-mobile/`)
**SW-03:** Verificar CDNs validos (TailwindCSS, Google Fonts URLs)
**SW-04:** Confirmar: GET-only, Network-first para API, Cache-first para static
**SW-05:** Verificar cleanup no activate
**SW-06:** Verificar `skipWaiting()` + `clients.claim()`

#### Pages (4 checks)

**PG-01:** Scan `admin-mobile/js/pages/*.js`
**PG-02:** Verificar se alguma page usa localStorage/sessionStorage para cache
**PG-03:** Verificar headers de cache em chamadas API
**PG-04:** Confirmar que operacoes financeiras NUNCA sao cacheadas

#### Version (2 checks)

**VER-01:** Verificar que appVersion detecta scope admin-mobile
**VER-02:** Verificar version-scope.json inclui admin-mobile

---

## 5. Classificacao de Severidade

```
CRITICO (0 pontos)  → Cache servindo dados incorretos, SW bloqueando atualizacoes,
                       invalidation chain quebrada, financeiro sem segregacao de temporada
ALTO    (50 pontos) → TTLs excessivos, desincronizacao SW/version, falta de invalidacao
MEDIO   (75 pontos) → Overlap de caches, stores orfaos, CDNs deprecados, cleanup ausente
BAIXO   (100 pontos) → Otimizacoes, sugestoes de melhoria
```

### Score por Categoria

```
Score = soma(pontos_dos_checks) / total_checks_da_categoria
```

### Score Geral

```
Score_Geral = media_ponderada(scores_categorias)
Pesos: service_worker=25%, indexeddb=20%, mongodb=20%, invalidation=15%,
       memory=10%, version=5%, performance=5%
```

### Status Final

```
90-100: "excelente"
70-89:  "bom"
50-69:  "atencao"
0-49:   "critico"
```

---

## 6. Deteccao de Cache Morto

Durante a auditoria, detectar e classificar:

| Tipo | Como Detectar | Acao |
|------|--------------|------|
| `orphan_store` | Store no IDB mas modulo removido do registry | Remover store |
| `stale_sw_cache` | CACHE_NAME referenciado mas nao existe no SW | Atualizar referencia |
| `orphan_mongodb` | Registros para ligas/times que nao existem mais | Limpar com script |
| `dead_entry` | Entries com TTL expirado que nao foram limpas | Forcar cleanExpired |

---

## 7. Template de Relatorio

```markdown
# AUDITORIA DE CACHE: [MODO]

**Data:** DD/MM/AAAA HH:mm
**Modo:** [CACHE-APP --participante | CACHE-WEB --admin | CACHE-APP --admin]
**Score Geral:** XX/100
**Status:** [EXCELENTE | BOM | ATENCAO | CRITICO]

---

## Resumo por Categoria

| Categoria | Score | Checks Passou/Total | Status |
|-----------|-------|---------------------|--------|
| [nome]    | XX%   | X/Y                 | [status] |

---

## Achados

### [SEVERIDADE] (X issues)

**[CODIGO]** [Descricao curta]
- Arquivo: [path]
- Linha: [num] (se aplicavel)
- Valor atual: [valor]
- Valor esperado: [valor]
- Acao: [recomendacao]

---

## Cache Morto Detectado

| Tipo | Descricao | Acao |
|------|-----------|------|
| [tipo] | [desc] | [acao] |

---

## Coerencia

| Check | Status |
|-------|--------|
| SW cache name sincronizado | [OK/FALHA] |
| IndexedDB stores = modulos | [OK/FALHA] |
| TTLs consistentes | [OK/FALHA] |
| Invalidation chain completa | [OK/FALHA] |
| Version system ativo | [OK/FALHA] |

---

**Salvo em:** cache_auditorias (MongoDB)
**Skill version:** 1.0.0
**Duracao:** XXXXms
```

---

## 8. Salvar no MongoDB

Apos gerar o relatorio, salvar resultado usando MCP Mongo `insert_document`:

```javascript
// Collection: cache_auditorias
{
  modo: "CACHE-APP-participante",
  data_auditoria: new Date(),
  score_geral: 82,
  score_por_categoria: { /* scores */ },
  status: "bom",
  achados: [ /* lista de achados */ ],
  inventario: { /* snapshot das camadas */ },
  cache_morto: [ /* lista de cache morto */ ],
  coerencia: { /* booleans */ },
  versao_skill: "1.0.0",
  duracao_auditoria_ms: 4200,
  auditor: "cache-auditor"
}
```

**IMPORTANTE:** MCP Mongo pode conectar a database diferente do app. Para dados ao vivo, preferir `curl localhost:3000/api/...`. Para inserir auditoria, MCP Mongo eh adequado.

---

## 9. Principios de Velocidade na Execucao

1. **Ler arquivos em paralelo** — Multiplas chamadas Read simultaneas
2. **Grep direcionado** — Patterns especificos, nao ler arquivos inteiros
3. **Skip unchanged** — Comparar mtime contra ultima auditoria
4. **Foco nos TTLs e versoes primeiro** — Issues mais comuns
5. **Inventario antes de analise** — Mapear tudo, depois avaliar

---

## 10. Integracao com Outras Skills

| Skill | Relacao |
|-------|---------|
| `auditor-module` | Complementar — auditor-module foca em logica, cache-auditor foca em cache |
| `code-inspector` | cache-auditor pode ser chamado como sub-auditoria de performance |
| `frontend-crafter` | Quando frontend-crafter implementa cache, cache-auditor valida |
| `db-guardian` | Para limpeza de MongoDB caches orfaos |

---

**Versao:** 1.0.0
**Ultima atualizacao:** 05/02/2026
