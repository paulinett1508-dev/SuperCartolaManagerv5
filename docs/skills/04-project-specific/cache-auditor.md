# SKILL: Cache Auditor (Auditor de Cache)

## Visão Geral

Skill especialista que vasculha e audita **toda a infraestrutura de cache** dos 3 ambientes do Super Cartola Manager. Detecta cache stale/morto, valida coerência com o código mais recente, e otimiza para velocidade suprema.

**Filosofia:** A verdade absoluta é a última alteração no código. Cache NUNCA sobrepõe a realidade. Alimenta-se de atualizações, descarta antiguidade.

---

## Princípios Fundamentais

1. **Verdade = Código Atual** — Cache serve o código, nunca o contrário
2. **Zero Cache Morto** — Detecta e elimina cache stale, órfão e obsoleto
3. **Velocidade Suprema** — Otimiza TTLs e estratégias para performance máxima nos apps
4. **Persistência** — Salva resultados no MongoDB (`cache_auditorias`) para histórico e comparação
5. **3 Ambientes** — Cobertura total: participante app, admin web, admin mobile app

---

## 3 Modos de Operação

| Comando | Ambiente | Alvo |
|---------|----------|------|
| `/cache-auditor CACHE-APP --participante` | PWA Participante | Service Worker + IndexedDB (12 stores) + Memory Cache + Module Caches + App Version |
| `/cache-auditor CACHE-WEB --admin` | Admin Desktop | CacheManager + Ferramentas Cache Admin + MongoDB Caches + Cache Invalidator |
| `/cache-auditor CACHE-APP --admin` | PWA Admin Mobile | Service Worker + Runtime Cache + Pages API |

---

## Arquitetura de Cache do Sistema (Mapa Completo)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPER CARTOLA - CACHE LAYERS                     │
├──────────────────┬──────────────────────┬──────────────────────────────┤
│  CACHE-APP       │  CACHE-WEB           │  CACHE-APP                   │
│  --participante  │  --admin             │  --admin                     │
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ Service Worker   │ (sem SW)             │ Service Worker               │
│ v18-copa-sc      │                      │ scm-admin-v1.0.0             │
├──────────────────┤                      ├──────────────────────────────┤
│ IndexedDB        │ CacheManager         │ Runtime Cache                │
│ SuperCartolaOff  │ CartolaCache v1      │ scm-admin-runtime            │
│ (12 stores)      │ (6 stores)           │                              │
├──────────────────┤                      ├──────────────────────────────┤
│ Memory Cache     │ Admin Cache Tools    │ Direct API Calls             │
│ Map + IDB dual   │ ferramentas-cache    │ (pages/*.js)                 │
├──────────────────┤                      ├──────────────────────────────┤
│ Module Caches    │                      │                              │
│ rodadas/artil/   │                      │                              │
│ luva/pontos/etc  │                      │                              │
├──────────────────┼──────────────────────┼──────────────────────────────┤
│                    SERVER-SIDE (COMPARTILHADO)                          │
│  MongoDB Caches: extrato, ranking, top10, pontos-corridos,             │
│  mata-mata, melhor-mes, capitao                                        │
│  Cache Invalidator: cascata de dependências                            │
│  Cache Routes: universal + por módulo                                  │
│  App Version: force-update por scope                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Inventário de Arquivos por Modo

### CACHE-APP --participante

| Camada | Arquivo | Tecnologia |
|--------|---------|-----------|
| Service Worker | `public/participante/service-worker.js` | Cache API (`super-cartola-v18-copa-sc`) |
| IndexedDB Offline | `public/participante/js/participante-offline-cache.js` | IDB `SuperCartolaOffline` v2 |
| Memory Cache | `public/js/core/cache-manager.js` | IDB `CartolaCache` + Map |
| Rodadas Cache | `public/js/rodadas/rodadas-cache.js` | Map (100 max, 5min) |
| Artilheiro Cache | `public/js/artilheiro-campeao/artilheiro-campeao-cache.js` | Map (100 max, 50MB) |
| Luva de Ouro Cache | `public/js/luva-de-ouro/luva-de-ouro-cache.js` | Map |
| Pontos Corridos Cache | `public/js/pontos-corridos/pontos-corridos-cache.js` | Map |
| Fluxo Financeiro Cache | `public/js/fluxo-financeiro/fluxo-financeiro-cache.js` | Map + cacheManager |
| App Version | `public/js/app/app-version.js` | localStorage |

### CACHE-WEB --admin

| Camada | Arquivo | Tecnologia |
|--------|---------|-----------|
| CacheManager | `public/js/core/cache-manager.js` | IDB + Map (compartilhado) |
| Admin Cache Tools | `public/js/ferramentas/ferramentas-cache-admin.js` | Buttons manuais |
| Cache Invalidator | `utils/cache-invalidator.js` | Server-side cascading |
| Cache Routes | `routes/cache-universal-routes.js` | Express endpoints |
| Ranking Cache Routes | `routes/ranking-geral-cache-routes.js` | Express endpoints |
| Extrato Cache Routes | `routes/extratoFinanceiroCacheRoutes.js` | Express endpoints |

### CACHE-APP --admin

| Camada | Arquivo | Tecnologia |
|--------|---------|-----------|
| Service Worker | `public/admin-mobile/service-worker.js` | Cache API (`scm-admin-v1.0.0` + `scm-admin-runtime`) |
| Pages JS | `public/admin-mobile/js/pages/*.js` | Direct API calls |
| App Config | `public/admin-mobile/js/app.js` | App lifecycle |

### MongoDB Caches (Server-Side — todos os modos)

| Collection | Model | Propósito |
|-----------|-------|-----------|
| `extratofinanceirocaches` | `models/ExtratoFinanceiroCache.js` | Extrato financeiro consolidado |
| `rankinggeralcaches` | `models/RankingGeralCache.js` | Ranking geral da liga |
| `top10caches` | `models/Top10Cache.js` | Top 10 por rodada |
| `pontoscorridoscaches` | `models/PontosCorridosCache.js` | Classificação pontos corridos |
| `matamatacaches` | `models/MataMataCache.js` | Torneio mata-mata |
| `melhor_mes_cache` | `models/MelhorMesCache.js` | Performance mensal |
| `capitao_caches` | `models/CapitaoCaches.js` | Capitão de luxo |

---

## Checklists de Auditoria

### Modo 1: CACHE-APP --participante (26 checks)

#### Service Worker (6 checks)
1. **SW-01** Extrair `CACHE_NAME` e verificar se corresponde à versão mais recente
2. **SW-02** Verificar se `STATIC_ASSETS` está completo (comparar com arquivos reais em `/participante/`)
3. **SW-03** Confirmar estratégia fetch: API = NETWORK-ONLY, HTML = NETWORK-ONLY, static = NETWORK-FIRST
4. **SW-04** Verificar que `activate` limpa caches antigos corretamente
5. **SW-05** Confirmar `skipWaiting()` no evento install
6. **SW-06** Confirmar bypass de ES6 modules (fix v4.0 — mobile dynamic imports)

#### IndexedDB OfflineCache (6 checks)
7. **IDB-01** Cross-reference stores com módulos ativos de `modules-registry.json` — detectar stores órfãos
8. **IDB-02** Validar TTLs: ranking/extrato < 1h durante temporada ativa; config/participante pode ser 24h
9. **IDB-03** Verificar lógica `TEMPORADA_ENCERRADA` usa `ParticipanteConfig.SEASON_STATUS` corretamente
10. **IDB-04** Confirmar `DB_VERSION` foi incrementado quando stores mudaram
11. **IDB-05** Verificar proteção de race condition (`_initPromise` pattern)
12. **IDB-06** Validar que `cleanExpired()` roda automaticamente e remove entries > 2x TTL

#### CacheManager (4 checks)
13. **CM-01** Extrair stores e TTLs do CacheManager
14. **CM-02** Detectar overlap/conflito entre CacheManager e OfflineCache
15. **CM-03** Verificar consistência de TTLs entre os dois sistemas
16. **CM-04** Confirmar eviction strategy e `cleanExpired` automático

#### Module Caches (4 checks)
17. **MC-01** Scan `public/js/**/*cache*.js` — inventariar todos os caches de módulo
18. **MC-02** Verificar TTLs razoáveis (dado frequência de atualização dos dados)
19. **MC-03** Verificar max entries e cleanup strategy de cada cache
20. **MC-04** Confirmar que `temporada` está nos cache keys (segregação por temporada)

#### App Version (4 checks)
21. **AV-01** Verificar `CACHE_TTL` e `CHECK_INTERVAL_MS` são razoáveis (mobile: 60s/300s)
22. **AV-02** Verificar que `limparCachesAntigos()` identifica nomes de cache SW obsoletos
23. **AV-03** Cross-check `CURRENT_SW_CACHE` hardcoded em app-version.js vs `CACHE_NAME` real no SW
24. **AV-04** Verificar que `version-scope.json` inclui todos os arquivos relevantes do participante

#### Performance (2 checks)
25. **PERF-01** Estimar tamanho total de cache (stores x entries estimados)
26. **PERF-02** Detectar patterns N+1 (lista no cache, items individuais buscados separadamente)

---

### Modo 2: CACHE-WEB --admin (12 checks)

#### Confirmação sem SW (2 checks)
1. **NSW-01** Verificar ausência de registro de Service Worker em arquivos HTML do admin
2. **NSW-02** Confirmar que é intencional (admin desktop sempre precisa de dados frescos)

#### CacheManager (4 checks)
3. **CM-01** Mesmos checks do participante (módulo compartilhado)
4. **CM-02** Verificar que páginas admin invalidam cache após operações de escrita
5. **CM-03** Verificar que admin não herda TTLs longos do participante
6. **CM-04** Confirmar cleanExpired automático

#### Admin Cache Tools (3 checks)
7. **ACT-01** Verificar que "Limpar IndexedDB" realmente limpa TODOS os databases relevantes
8. **ACT-02** Verificar que "RESETAR CACHE COMPLETO" dispara invalidação server-side
9. **ACT-03** Verificar que "RECALCULAR TUDO" tem confirmação e rate limiting

#### MongoDB Caches (3 checks)
10. **MDB-01** Para cada model de cache: verificar índices corretos e `temporada` indexado
11. **MDB-02** Verificar `CACHE_DEPENDENCIES` em `cache-invalidator.js` está completo (todos eventos cobertos)
12. **MDB-03** Verificar que TODAS operações de escrita nos controllers disparam invalidação

---

### Modo 3: CACHE-APP --admin (12 checks)

#### Service Worker (6 checks)
1. **SW-01** Extrair `CACHE_NAME` e `RUNTIME_CACHE` e verificar versões
2. **SW-02** Verificar `STATIC_ASSETS` completo (comparar com `ls /admin-mobile/`)
3. **SW-03** Verificar CDNs em STATIC_ASSETS ainda são válidos (TailwindCSS, Google Fonts)
4. **SW-04** Confirmar estratégia: GET-only, Network-first para API, Cache-first para static
5. **SW-05** Verificar cleanup de caches antigos no `activate`
6. **SW-06** Confirmar `skipWaiting()` e `clients.claim()` presentes

#### Pages (4 checks)
7. **PG-01** Scan `admin-mobile/js/pages/*.js` — inventariar uso de cache local
8. **PG-02** Verificar se alguma page implementa cache (localStorage/sessionStorage)
9. **PG-03** Verificar que chamadas API usam headers de cache apropriados
10. **PG-04** Confirmar que operações financeiras NUNCA são cacheadas client-side

#### Version (2 checks)
11. **VER-01** Verificar que `appVersion.js` detecta corretamente scope admin-mobile
12. **VER-02** Verificar que `version-scope.json` inclui arquivos do admin-mobile

---

## Schema MongoDB — Collection `cache_auditorias`

```javascript
{
  // Identificação
  modo: String,              // "CACHE-APP-participante" | "CACHE-WEB-admin" | "CACHE-APP-admin"
  data_auditoria: Date,      // Timestamp da auditoria

  // Scores
  score_geral: Number,       // 0-100
  score_por_categoria: {
    service_worker: Number,   // 0-100 (null se N/A)
    indexeddb: Number,        // 0-100 (null se N/A)
    memory_cache: Number,     // 0-100
    module_caches: Number,    // 0-100
    mongodb_caches: Number,   // 0-100
    invalidation: Number,     // 0-100
    version_system: Number,   // 0-100
    performance: Number       // 0-100
  },

  // Status
  status: String,            // "excelente" | "bom" | "atencao" | "critico"

  // Achados
  achados: [{
    codigo: String,          // Ex: "SW-03", "IDB-01"
    categoria: String,       // "service_worker" | "indexeddb" | "memory_cache" | etc.
    severidade: String,      // "critico" | "alto" | "medio" | "baixo"
    descricao: String,       // O que foi encontrado
    arquivo: String,         // Caminho do arquivo
    linha: Number,           // Linha (opcional)
    acao_recomendada: String, // Correção sugerida
    auto_corrigivel: Boolean  // A skill pode corrigir automaticamente?
  }],

  // Inventário (snapshot das camadas de cache)
  inventario: {
    service_workers: [{
      arquivo: String,
      cache_name: String,
      static_assets_count: Number,
      estrategia: String     // "network-first" | "cache-first" | "network-only"
    }],
    indexeddb_stores: [{
      db_name: String,
      db_version: Number,
      stores: [{
        nome: String,
        ttl_ms: Number,
        ttl_legivel: String  // "30 minutos"
      }]
    }],
    memory_caches: [{
      arquivo: String,
      tipo: String,          // "Map" | "Object"
      max_entries: Number,
      ttl_ms: Number
    }],
    mongodb_caches: [{
      collection: String,
      model: String,
      indices: [String],
      temporada_filtrada: Boolean
    }]
  },

  // Cache Morto Detectado
  cache_morto: [{
    tipo: String,            // "orphan_store" | "stale_sw_cache" | "orphan_mongodb" | "dead_entry"
    descricao: String,
    tamanho_estimado: String, // "~150KB"
    acao: String             // "remover" | "atualizar" | "investigar"
  }],

  // Validação de Coerência
  coerencia: {
    sw_cache_name_sincronizado: Boolean,
    indexeddb_stores_match_modules: Boolean,
    ttls_consistentes: Boolean,
    invalidation_chain_completa: Boolean,
    version_system_ativo: Boolean
  },

  // Metadata
  versao_skill: String,      // "1.0.0"
  duracao_auditoria_ms: Number,
  auditor: String,           // "cache-auditor"
  createdAt: Date,
  updatedAt: Date
}
```

**Índice recomendado:** `{ modo: 1, data_auditoria: -1 }`

---

## Formato do Relatório de Saída

```markdown
# AUDITORIA DE CACHE: CACHE-APP --participante

**Data:** 05/02/2026 14:30
**Modo:** CACHE-APP --participante
**Score Geral:** 82/100 (Bom)
**Status:** BOM

---

## Resumo por Categoria

| Categoria | Score | Checks | Status |
|-----------|-------|--------|--------|
| Service Worker | 5/6 | 83% | Atenção |
| IndexedDB | 6/6 | 100% | Excelente |
| Memory Cache | 3/4 | 75% | Atenção |
| Module Caches | 4/4 | 100% | Excelente |
| App Version | 3/4 | 75% | Atenção |
| Performance | 2/2 | 100% | Excelente |

---

## Achados

### ATENÇÃO (3 issues)

**[SW-03]** Service Worker: CURRENT_SW_CACHE em app-version.js não sincronizado
- Arquivo: public/js/app/app-version.js
- Valor hardcoded: `super-cartola-v17-module-fix`
- Valor real do SW: `super-cartola-v18-copa-sc`
- Ação: Atualizar CURRENT_SW_CACHE para valor correto

**[CM-02]** CacheManager: overlap com OfflineCache no store "ranking"
- CacheManager TTL: 10min
- OfflineCache TTL: 30min
- Ação: Unificar TTLs ou documentar razão da diferença

**[AV-03]** App Version: CURRENT_SW_CACHE desatualizado
- Mesmo issue do SW-03 (dependência)

---

## Cache Morto Detectado

| Tipo | Descrição | Ação |
|------|-----------|------|
| stale_sw_cache | `super-cartola-v17-module-fix` referenciado mas inexistente | Atualizar referência |

---

## Coerência

| Check | Status |
|-------|--------|
| SW cache name sincronizado | FALHA |
| IndexedDB stores = módulos | OK |
| TTLs consistentes | ATENÇÃO |
| Invalidation chain completa | OK |
| Version system ativo | OK |

---

**Salvo em:** cache_auditorias (MongoDB)
**Skill version:** 1.0.0
**Duração:** 4200ms
```

---

## Severidades

| Nível | Critério | Ação |
|-------|----------|------|
| CRÍTICO | Cache servindo dados incorretos, SW bloqueando atualizações | Corrigir imediatamente |
| ALTO | TTLs muito longos para dados voláteis, invalidation chain quebrada | Corrigir antes do deploy |
| MÉDIO | Overlap de caches, stores órfãos, CDNs deprecados | Corrigir no sprint |
| BAIXO | Otimizações de performance, sugestões de melhoria | Backlog |

---

## Quando Auditar

1. **Após alterar qualquer arquivo de cache** — Validar coerência
2. **Após adicionar/remover módulo** — Verificar stores IndexedDB
3. **Após atualizar Service Worker** — Verificar CACHE_NAME e STATIC_ASSETS
4. **Antes de releases** — Auditoria completa dos 3 modos
5. **Mensal** — Detectar cache morto acumulado

---

## Agnóstico de IA

### Claude
```bash
/cache-auditor CACHE-APP --participante
/cache-auditor CACHE-WEB --admin
/cache-auditor CACHE-APP --admin
```

### Outras IAs
```
Audite o cache do participante app usando o Cache Auditor skill
```

**Requisito:** IA deve ter acesso a Read, Grep, Glob e Bash para executar os checks.

---

**Última atualização:** 05/02/2026
**Versão:** 1.0.0
**Autor:** Sistema Super Cartola Manager
