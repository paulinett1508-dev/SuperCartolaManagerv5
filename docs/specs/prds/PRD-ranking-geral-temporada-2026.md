# PRD - Fix RankingGeralCache Filtro Temporada 2026

**Data:** 2026-01-29
**Fase:** 1 - Pesquisa (S.A.I.S)
**Status:** Completo

---

## 1. RESUMO EXECUTIVO

### Problema
O módulo RankingGeral (`rankingGeralCacheController.js`) não filtra por temporada nas queries MongoDB, causando:
1. **Liga "Super Cartola"** - temporada 2026 mostra dados de 2025 (cache contaminado)
2. **Liga "Os Fuleros"** - problema secundário, usa `rankingTurnoService` que funciona corretamente

### Causa Raiz
Enquanto `rankingTurnoService.js` foi corrigido (commit f6e753f), o `rankingGeralCacheController.js` ficou sem o filtro de temporada em 3 pontos críticos.

### Impacto
- Dados financeiros/ranking de 2025 aparecem em 2026
- Usuários veem pontuação incorreta
- Cache servindo dados de temporada errada

---

## 2. ARQUIVOS IDENTIFICADOS

### Backend (MODIFICAR)
| Arquivo | Função | Status |
|---------|--------|--------|
| `controllers/rankingGeralCacheController.js` | Controller principal | **BUGADO** |
| `routes/ranking-geral-cache-routes.js` | Rotas do cache | OK (passa params) |

### Models (VERIFICAR)
| Arquivo | Status |
|---------|--------|
| `models/RankingGeralCache.js` | OK - tem campo `temporada` e index |

### Frontend (VERIFICAR)
| Arquivo | Status |
|---------|--------|
| `public/js/ranking.js` | OK - passa `temporada` via URL |
| `public/participante/js/modules/participante-ranking.js` | OK - v3.11 FIX |

### Referência (padrão correto)
| Arquivo | Função |
|---------|--------|
| `services/rankingTurnoService.js` | Implementação CORRETA com temporada |

---

## 3. BUGS ESPECÍFICOS

### BUG 1: Função `buscarRankingConsolidado()` (linhas 10-92)
```javascript
// ATUAL - NÃO extrai temporada de req.query
export async function buscarRankingConsolidado(req, res) {
  const { ligaId } = req.params;
  const { rodada } = req.query;
  // FALTA: const temporada = req.query.temporada || new Date().getFullYear();
```

### BUG 2: Busca de cache sem temporada (linhas 42-45)
```javascript
// ATUAL - Cache pode retornar 2025!
const cacheExistente = await RankingGeralCache.findOne({
  ligaId: new mongoose.Types.ObjectId(ligaId),
  rodadaFinal
  // FALTA: temporada
}).lean();
```

### BUG 3: Função `calcularRankingConsolidado()` (linhas 98-156)
```javascript
// ATUAL - Não recebe temporada
async function calcularRankingConsolidado(ligaId, rodadaFinal) {
  const pipeline = [
    {
      $match: {
        ligaId: ligaObjectId,
        rodada: { $lte: rodadaFinal }
        // FALTA: temporada: temporada
      }
    },
```

### BUG 4: Salvamento de cache sem temporada (linhas ~145)
```javascript
// ATUAL - Não salva temporada no documento
await RankingGeralCache.findOneAndUpdate(
  { ligaId: ligaObjectId, rodadaFinal },
  // FALTA: temporada no filtro e no $set
```

---

## 4. SOLUCAO PROPOSTA

### 4.1 Adicionar parâmetro `temporada` em todo o fluxo

**Passo 1:** Extrair temporada de `req.query` em `buscarRankingConsolidado()`
```javascript
const temporada = parseInt(req.query.temporada) || new Date().getFullYear();
```

**Passo 2:** Passar temporada para `calcularRankingConsolidado()`
```javascript
const rankingCalculado = await calcularRankingConsolidado(ligaId, rodadaFinal, temporada);
```

**Passo 3:** Adicionar temporada na assinatura de `calcularRankingConsolidado()`
```javascript
async function calcularRankingConsolidado(ligaId, rodadaFinal, temporada) {
```

**Passo 4:** Filtrar cache por temporada
```javascript
const cacheExistente = await RankingGeralCache.findOne({
  ligaId: new mongoose.Types.ObjectId(ligaId),
  rodadaFinal,
  temporada  // ADICIONAR
}).lean();
```

**Passo 5:** Filtrar agregação por temporada
```javascript
$match: {
  ligaId: ligaObjectId,
  rodada: { $lte: rodadaFinal },
  temporada: temporada  // ADICIONAR
}
```

**Passo 6:** Salvar cache com temporada
```javascript
await RankingGeralCache.findOneAndUpdate(
  { ligaId: ligaObjectId, rodadaFinal, temporada },  // ADICIONAR temporada
  { $set: { ranking: sortedRanking, temporada, ... } },
```

---

## 5. COLLECTIONS MONGODB

### rankinggeralcaches
```javascript
// Schema atual (OK - já tem temporada)
{
  ligaId: ObjectId,
  rodadaFinal: Number,
  temporada: Number,  // JÁ EXISTE
  ranking: Array,
  createdAt: Date
}

// Index (OK - já tem temporada)
{ ligaId: 1, rodadaFinal: 1, temporada: 1 } // unique
```

### Ação necessária: Limpar cache de 2025
```javascript
db.rankinggeralcaches.deleteMany({ temporada: 2025 });
// Ou manter para histórico, mas garantir que 2026 não puxe
```

---

## 6. DEPENDENCIAS (S.D.A)

### Quem chama rankingGeralCacheController?
- `routes/ranking-geral-cache-routes.js` → Rota `/api/ranking-cache/:ligaId`
- Frontend: `public/js/ranking.js` → Passa `?temporada=X` ✅

### Quem importa RankingGeralCache model?
- Apenas `rankingGeralCacheController.js`

### CSS/HTML afetados?
- Nenhum - mudança apenas no backend

---

## 7. TESTES NECESSARIOS

### Teste 1: Liga Super Cartola
```bash
curl "http://localhost:3000/api/ranking-cache/LIGA_ID?rodada=1&temporada=2026"
# Esperado: ranking vazio ou apenas dados de 2026
```

### Teste 2: Liga com dados
```bash
curl "http://localhost:3000/api/ranking-cache/LIGA_ID?rodada=38&temporada=2025"
# Esperado: dados de 2025 (histórico)
```

### Teste 3: Temporada default
```bash
curl "http://localhost:3000/api/ranking-cache/LIGA_ID?rodada=1"
# Esperado: usa ano atual (2026)
```

---

## 8. ROLLBACK PLAN

Se der problema:
1. Reverter `rankingGeralCacheController.js` via git
2. Cache antigo ainda funciona (sem temporada = retorna tudo)
3. Nenhuma migration destrutiva

---

## 9. RESUMO DE MUDANÇAS

| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `controllers/rankingGeralCacheController.js` | EDIT | ~15 linhas |

### Mudanças específicas:
1. Extrair `temporada` de `req.query` (1 linha)
2. Adicionar `temporada` no findOne do cache (1 linha)
3. Passar `temporada` para função interna (1 linha)
4. Adicionar parâmetro na assinatura (1 linha)
5. Filtrar pipeline por `temporada` (1 linha)
6. Salvar cache com `temporada` (2 linhas)

---

## 10. PROXIMA FASE

```
PRD gerado com sucesso!

EXECUTAR: /spec .claude/docs/PRD-ranking-geral-temporada-2026.md
```
