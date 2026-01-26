# SPEC - Filtro de Temporada no Cache Top10

**Data:** 2026-01-26
**Baseado em:** PRD-modulos-opcionais-2026.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Adicionar filtro de `temporada` em todas as operacoes do `top10CacheController.js` para garantir que dados de temporadas anteriores (2025) nao sejam retornados para ligas 2026. Tambem corrigir o `consolidacaoController.js` para incluir temporada explicita ao salvar o cache durante consolidacao de rodadas.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. controllers/top10CacheController.js - Mudanca Primaria

**Path:** `/home/runner/workspace/controllers/top10CacheController.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** routes/top10CacheRoutes.js (documentacao), public/js/top10.js (cliente admin), public/participante/js/modules/participante-top10.js (cliente participante), public/participante/js/modules/participante-historico.js (cliente)

#### Mudancas Cirurgicas:

**Linha 3: ADICIONAR import CURRENT_SEASON**
```javascript
// ANTES:
const { ObjectId } = mongoose.Types;

// DEPOIS:
const { ObjectId } = mongoose.Types;
import { CURRENT_SEASON } from "../config/seasons.js";
```
**Motivo:** Importar constante de temporada atual para usar como default em todas as operacoes.

---

**Linha 8-9: ADICIONAR extração de temporada no salvarCacheTop10**
```javascript
// ANTES (linha 8-9):
    const { ligaId } = req.params;
    const { rodada, mitos, micos, permanent } = req.body;

// DEPOIS:
    const { ligaId } = req.params;
    const { rodada, mitos, micos, permanent, temporada: bodyTemporada } = req.body;
    const temporada = bodyTemporada ? Number(bodyTemporada) : CURRENT_SEASON;
```
**Motivo:** Permitir que o body especifique temporada; usar CURRENT_SEASON como fallback.

---

**Linha 18-27: MODIFICAR query e update do upsert para incluir temporada**
```javascript
// ANTES (linhas 18-27):
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaIdQuery, rodada_consolidada: rodada },
            {
                mitos,
                micos,
                cache_permanente: permanent || false,
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );

// DEPOIS:
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaIdQuery, rodada_consolidada: rodada, temporada },
            {
                mitos,
                micos,
                temporada,
                cache_permanente: permanent || false,
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );
```
**Motivo:** Incluir temporada na query (para match do indice unico) e no update (para garantir persistencia).

---

**Linha 29-30: MODIFICAR mensagens de log para incluir temporada**
```javascript
// ANTES (linhas 28-31):
        const msg = permanent
            ? `[CACHE-TOP10] Cache PERMANENTE salvo: Liga ${ligaId}, Rodada ${rodada}`
            : `[CACHE-TOP10] Cache temporário salvo: Liga ${ligaId}, Rodada ${rodada}`;

// DEPOIS:
        const msg = permanent
            ? `[CACHE-TOP10] Cache PERMANENTE salvo: Liga ${ligaId}, Rodada ${rodada}, Temp ${temporada}`
            : `[CACHE-TOP10] Cache temporário salvo: Liga ${ligaId}, Rodada ${rodada}, Temp ${temporada}`;
```
**Motivo:** Logs devem indicar temporada para facilitar debug.

---

**Linha 41-46: ADICIONAR extração e uso de temporada no lerCacheTop10**
```javascript
// ANTES (linhas 41-46):
    const { ligaId } = req.params;
    const { rodada } = req.query;
    // Converter para ObjectId se for um ID válido
    const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
    const query = { liga_id: ligaIdQuery };
    if (rodada) query.rodada_consolidada = Number(rodada);

// DEPOIS:
    const { ligaId } = req.params;
    const { rodada, temporada: queryTemporada } = req.query;
    // Converter para ObjectId se for um ID válido
    const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
    const temporada = queryTemporada ? Number(queryTemporada) : CURRENT_SEASON;
    const query = { liga_id: ligaIdQuery, temporada };
    if (rodada) query.rodada_consolidada = Number(rodada);
```
**Motivo:** CRITICO - Este e o principal problema. Query deve filtrar por temporada para nao retornar dados de 2025 para liga 2026.

---

**Linha 54-60: ADICIONAR temporada no response**
```javascript
// ANTES (linhas 54-60):
        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            mitos: cache.mitos,
            micos: cache.micos,
            updatedAt: cache.ultima_atualizacao,
        });

// DEPOIS:
        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            temporada: cache.temporada,
            mitos: cache.mitos,
            micos: cache.micos,
            updatedAt: cache.ultima_atualizacao,
        });
```
**Motivo:** Cliente pode precisar saber de qual temporada veio o cache.

---

**Linha 69-72: MODIFICAR limparCacheTop10 para filtrar por temporada**
```javascript
// ANTES (linhas 67-72):
export const limparCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        // Converter para ObjectId se for um ID válido
        const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;
        const result = await Top10Cache.deleteMany({ liga_id: ligaIdQuery });

// DEPOIS:
export const limparCacheTop10 = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada: queryTemporada, all } = req.query;
        // Converter para ObjectId se for um ID válido
        const ligaIdQuery = ObjectId.isValid(ligaId) ? new ObjectId(ligaId) : ligaId;

        // Se all=true, limpa todas as temporadas; senao, apenas a especificada
        const clearAll = all === 'true';
        const temporada = queryTemporada ? Number(queryTemporada) : CURRENT_SEASON;
        const deleteQuery = clearAll
            ? { liga_id: ligaIdQuery }
            : { liga_id: ligaIdQuery, temporada };
        const result = await Top10Cache.deleteMany(deleteQuery);
```
**Motivo:** Evitar apagar cache historico de temporadas anteriores por acidente.

---

**Linha 73-79: MODIFICAR mensagem e response do limpar**
```javascript
// ANTES (linhas 73-80):
        console.log(
            `[CACHE-TOP10] Cache limpo: Liga ${ligaId}, ${result.deletedCount} registros removidos`,
        );
        res.json({
            success: true,
            message: `Cache limpo para liga ${ligaId}`,
            deletedCount: result.deletedCount,
        });

// DEPOIS:
        const scopeMsg = clearAll ? 'TODAS temporadas' : `Temp ${temporada}`;
        console.log(
            `[CACHE-TOP10] Cache limpo: Liga ${ligaId}, ${scopeMsg}, ${result.deletedCount} registros removidos`,
        );
        res.json({
            success: true,
            message: `Cache limpo para liga ${ligaId} (${scopeMsg})`,
            deletedCount: result.deletedCount,
            temporada: clearAll ? null : temporada,
        });
```
**Motivo:** Mensagens claras sobre escopo da limpeza.

---

### 2. controllers/consolidacaoController.js - Inclusao de Temporada na Consolidacao

**Path:** `/home/runner/workspace/controllers/consolidacaoController.js`
**Tipo:** Modificacao
**Impacto:** Medio
**Dependentes:** Nenhum direto (chamado internamente)

#### Mudancas Cirurgicas:

**Linha 453-462: ADICIONAR temporada no upsert do Top10Cache**
```javascript
// ANTES (linhas 452-462):
        // 12b. Top10 Cache
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodadaNum },
            {
                mitos,
                micos,
                cache_permanente: true,
                ultima_atualizacao: new Date()
            },
            { upsert: true, session }
        );

// DEPOIS:
        // 12b. Top10 Cache - v3.1.1: Incluir temporada para segregacao
        const temporadaAtualConsolidacao = SEASON_CONFIG?.current || new Date().getFullYear();
        await Top10Cache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodadaNum, temporada: temporadaAtualConsolidacao },
            {
                mitos,
                micos,
                temporada: temporadaAtualConsolidacao,
                cache_permanente: true,
                ultima_atualizacao: new Date()
            },
            { upsert: true, session }
        );
```
**Motivo:** Garantir que a consolidacao salve com temporada explicita para evitar conflitos com indices unicos e garantir segregacao de dados.

---

### 3. routes/top10CacheRoutes.js - Documentacao (Opcional)

**Path:** `/home/runner/workspace/routes/top10CacheRoutes.js`
**Tipo:** Modificacao
**Impacto:** Baixo (apenas documentacao)

#### Mudancas Cirurgicas:

**Linha 11-19: ATUALIZAR comentarios para documentar parametros**
```javascript
// ANTES (linhas 11-19):
// Rotas para cache do Top 10
// POST /api/top10/cache/:ligaId - Salvar cache
router.post("/cache/:ligaId", salvarCacheTop10);

// GET /api/top10/cache/:ligaId?rodada=5 - Ler cache
router.get("/cache/:ligaId", lerCacheTop10);

// DELETE /api/top10/cache/:ligaId - Limpar cache da liga
router.delete("/cache/:ligaId", limparCacheTop10);

// DEPOIS:
// Rotas para cache do Top 10
// POST /api/top10/cache/:ligaId - Salvar cache
// Body: { rodada, mitos, micos, permanent?, temporada? }
router.post("/cache/:ligaId", salvarCacheTop10);

// GET /api/top10/cache/:ligaId?rodada=5&temporada=2026 - Ler cache
// Query: rodada (opcional), temporada (opcional, default=CURRENT_SEASON)
router.get("/cache/:ligaId", lerCacheTop10);

// DELETE /api/top10/cache/:ligaId?temporada=2026&all=true - Limpar cache
// Query: temporada (opcional), all=true para limpar todas temporadas
router.delete("/cache/:ligaId", limparCacheTop10);
```
**Motivo:** Documentar novos parametros para futuros desenvolvedores.

---

## Mapa de Dependencias

```
top10CacheController.js (PRINCIPAL)
    |
    |-> routes/top10CacheRoutes.js [DOCUMENTACAO - linhas 11-19]
    |
    |-> public/js/top10.js [LER - linha 150, 219]
    |   └── Ja envia rodada, nao precisa modificar (usa default temporada)
    |
    |-> public/participante/js/modules/participante-top10.js [LER - linha 171]
    |   └── Ja envia rodada, nao precisa modificar (usa default temporada)
    |
    |-> public/participante/js/modules/participante-historico.js [LER - linha 732]
    |   └── Nao envia rodada, usa default (aceita default temporada)
    |
    |-> controllers/fluxoFinanceiroController.js [QUERY DIRETA - linha 216-221]
    |   └── JA FILTRA temporada! Nenhuma mudanca necessaria
    |
    |-> controllers/consolidacaoController.js [UPSERT - linha 453-462]
        └── PRECISA adicionar temporada no upsert
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas queries incluem `liga_id`
- [x] Temporada como dimensao adicional de segregacao
- [x] fluxoFinanceiroController.js ja valida temporada

**Queries Afetadas:**
```javascript
// top10CacheController.js - lerCacheTop10 (MODIFICADO)
Top10Cache.findOne({
  liga_id: ligaIdQuery,
  temporada: temporada,  // ADICIONADO
  // ...
});

// top10CacheController.js - salvarCacheTop10 (MODIFICADO)
Top10Cache.findOneAndUpdate({
  liga_id: ligaIdQuery,
  rodada_consolidada: rodada,
  temporada: temporada,  // ADICIONADO
}, { temporada, /* ... */ });

// consolidacaoController.js (MODIFICADO)
Top10Cache.findOneAndUpdate({
  liga_id: ligaId,
  rodada_consolidada: rodadaNum,
  temporada: temporadaAtualConsolidacao,  // ADICIONADO
}, { temporada: temporadaAtualConsolidacao, /* ... */ });
```

### Autenticacao
- [x] Rotas ja protegidas no arquivo de rotas principal
- [x] Nenhuma mudanca de autenticacao necessaria

---

## Casos de Teste

### Teste 1: Liga nova 2026 sem cache deve retornar 404
**Setup:** Liga criada em 2026, sem dados no Top10Cache para temporada 2026
**Acao:** GET /api/top10/cache/[ligaId]
**Resultado Esperado:** HTTP 404 com `{ cached: false }`

### Teste 2: Liga com cache 2025 e 2026 retorna apenas temporada solicitada
**Setup:** Liga com caches em ambas temporadas
**Acao:** GET /api/top10/cache/[ligaId]?temporada=2025 e GET /api/top10/cache/[ligaId]?temporada=2026
**Resultado Esperado:** Cada request retorna apenas dados da temporada especificada

### Teste 3: Salvar cache 2026 nao sobrescreve cache 2025
**Setup:** Cache existente para temporada 2025
**Acao:** POST /api/top10/cache/[ligaId] com temporada=2026
**Resultado Esperado:** Dois documentos distintos no banco (2025 e 2026)

### Teste 4: Limpar cache com temporada especifica
**Setup:** Caches de 2025 e 2026 existentes
**Acao:** DELETE /api/top10/cache/[ligaId]?temporada=2026
**Resultado Esperado:** Apenas cache 2026 removido; 2025 intacto

### Teste 5: Limpar cache com all=true remove todas temporadas
**Setup:** Caches de 2025 e 2026 existentes
**Acao:** DELETE /api/top10/cache/[ligaId]?all=true
**Resultado Esperado:** Ambos caches removidos

### Teste 6: Consolidacao salva com temporada correta
**Setup:** Liga 2026, rodada para consolidar
**Acao:** POST /api/consolidacao/[ligaId]/[rodada]
**Resultado Esperado:** Top10Cache criado com campo temporada = 2026

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Cache antigo continua funcionando (backwards compatible)
3. Nao ha necessidade de restaurar banco (schema nao alterado)

**Nota:** A mudanca e backwards-compatible porque:
- O schema Top10Cache ja tem campo `temporada` com default
- Caches antigos sem temporada explicita usam default do schema

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados (frontends nao precisam mudar)
- [x] Testes planejados
- [x] Rollback documentado

### Validado no PRD
- [x] Model Top10Cache ja tem campo temporada com default CURRENT_SEASON
- [x] Indice unico ja inclui temporada: `{ liga_id, rodada_consolidada, temporada }`
- [x] fluxoFinanceiroController.js ja filtra por temporada (linha 218)

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - `controllers/top10CacheController.js` - Mudancas principais
   - `controllers/consolidacaoController.js` - Inclusao de temporada no upsert
   - `routes/top10CacheRoutes.js` - Documentacao (opcional)

2. **Frontend depois:**
   - Nenhuma mudanca necessaria! Clientes usam default de temporada

3. **Testes:**
   - Manual via Postman/curl
   - Verificar logs com "[CACHE-TOP10]"
   - Validar no MongoDB que novos caches tem temporada

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-modulos-opcionais-2026.md
```

---

**Gerado por:** Spec Protocol v1.0
**Versao:** 1.0 (High Senior Edition)
