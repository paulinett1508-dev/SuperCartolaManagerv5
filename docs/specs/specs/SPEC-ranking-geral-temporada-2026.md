# SPEC - Fix RankingGeralCache Filtro Temporada 2026

**Data:** 2026-01-29
**Fase:** 2 - Specification (S.D.A)
**PRD:** `.claude/docs/PRD-ranking-geral-temporada-2026.md`
**Status:** IMPLEMENTADO

---

## 1. ARQUIVOS A MODIFICAR

| Arquivo | Ação | Linhas Afetadas |
|---------|------|-----------------|
| `controllers/rankingGeralCacheController.js` | EDIT | 5, 12, 20-25, 42-45, 60, 63-75, 98, 104-107, 169-171, 187-189 |

---

## 2. DEPENDÊNCIAS VALIDADAS (S.D.A)

### Quem chama este controller?
- `routes/ranking-geral-cache-routes.js` → passa `req.query` intacto ✅
- Frontend já passa `?temporada=X` ✅

### Model RankingGeralCache
- Campo `temporada` existe ✅
- Index composto inclui `temporada` ✅
- Default: `CURRENT_SEASON` ✅

### Import necessário
- `CURRENT_SEASON` de `config/seasons.js` ✅

---

## 3. MUDANÇAS CIRÚRGICAS

### MUDANÇA 1: Adicionar import CURRENT_SEASON
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linha:** 5 (após imports existentes)

```javascript
// ANTES:
import { obterDadosRodada } from '../utils/smartDataFetcher.js';

// DEPOIS:
import { obterDadosRodada } from '../utils/smartDataFetcher.js';
import { CURRENT_SEASON } from '../config/seasons.js';
```

---

### MUDANÇA 2: Extrair temporada de req.query
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linha:** 12 (dentro de buscarRankingConsolidado)

```javascript
// ANTES:
  const { force = false } = req.query;

// DEPOIS:
  const { force = false, temporada: temporadaParam } = req.query;
  const temporada = parseInt(temporadaParam) || CURRENT_SEASON;
```

---

### MUDANÇA 3: Filtrar busca de última rodada por temporada
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 20-25 (query ultimaRodadaComDados)

```javascript
// ANTES:
    const ultimaRodadaComDados = await Rodada.findOne({
      ligaId: new mongoose.Types.ObjectId(ligaId)
    })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

// DEPOIS:
    const ultimaRodadaComDados = await Rodada.findOne({
      ligaId: new mongoose.Types.ObjectId(ligaId),
      temporada
    })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();
```

---

### MUDANÇA 4: Filtrar cache por temporada
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 42-45 (busca de cache)

```javascript
// ANTES:
      const cacheExistente = await RankingGeralCache.findOne({
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal
      }).lean();

// DEPOIS:
      const cacheExistente = await RankingGeralCache.findOne({
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada
      }).lean();
```

---

### MUDANÇA 5: Passar temporada para calcularRankingConsolidado
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linha:** 60

```javascript
// ANTES:
    const rankingCalculado = await calcularRankingConsolidado(ligaId, rodadaFinal);

// DEPOIS:
    const rankingCalculado = await calcularRankingConsolidado(ligaId, rodadaFinal, temporada);
```

---

### MUDANÇA 6: Salvar cache com temporada
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 63-75 (findOneAndUpdate)

```javascript
// ANTES:
    await RankingGeralCache.findOneAndUpdate(
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal
      },
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        ranking: rankingCalculado,
        atualizadoEm: new Date()
      },
      { upsert: true, new: true }
    );

// DEPOIS:
    await RankingGeralCache.findOneAndUpdate(
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada
      },
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada,
        ranking: rankingCalculado,
        atualizadoEm: new Date()
      },
      { upsert: true, new: true }
    );
```

---

### MUDANÇA 7: Adicionar temporada na assinatura de calcularRankingConsolidado
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linha:** 98

```javascript
// ANTES:
async function calcularRankingConsolidado(ligaId, rodadaFinal) {

// DEPOIS:
async function calcularRankingConsolidado(ligaId, rodadaFinal, temporada) {
```

---

### MUDANÇA 8: Filtrar pipeline por temporada
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 104-107 ($match do pipeline)

```javascript
// ANTES:
    {
      $match: {
        ligaId: ligaObjectId,
        rodada: { $lte: rodadaFinal }
      }
    },

// DEPOIS:
    {
      $match: {
        ligaId: ligaObjectId,
        rodada: { $lte: rodadaFinal },
        temporada
      }
    },
```

---

### MUDANÇA 9: Filtrar invalidação por temporada (opcional mas recomendado)
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 169-171

```javascript
// ANTES:
    const resultado = await RankingGeralCache.deleteMany({
      ligaId: new mongoose.Types.ObjectId(ligaId)
    });

// DEPOIS:
    const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;
    const resultado = await RankingGeralCache.deleteMany({
      ligaId: new mongoose.Types.ObjectId(ligaId),
      temporada
    });
```

---

### MUDANÇA 10: Passar temporada em calcularRankingCompleto
**Arquivo:** `controllers/rankingGeralCacheController.js`
**Linhas:** 187-189

```javascript
// ANTES:
export async function calcularRankingCompleto(ligaId, rodadaFinal) {
    console.log(`[RANKING-COMPLETO] Calculando ranking até rodada ${rodadaFinal} da liga ${ligaId}`);
    return await calcularRankingConsolidado(ligaId, rodadaFinal);
}

// DEPOIS:
export async function calcularRankingCompleto(ligaId, rodadaFinal, temporada = CURRENT_SEASON) {
    console.log(`[RANKING-COMPLETO] Calculando ranking até rodada ${rodadaFinal} da liga ${ligaId} temporada ${temporada}`);
    return await calcularRankingConsolidado(ligaId, rodadaFinal, temporada);
}
```

---

## 4. CÓDIGO FINAL (SEÇÕES MODIFICADAS)

### Seção 1: Imports (topo do arquivo)
```javascript
// controllers/rankingGeralCacheController.js
import RankingGeralCache from "../models/RankingGeralCache.js";
import Rodada from "../models/Rodada.js";
import mongoose from "mongoose";
import { obterDadosRodada } from '../utils/smartDataFetcher.js';
import { CURRENT_SEASON } from '../config/seasons.js';
```

### Seção 2: buscarRankingConsolidado (linhas 10-93)
```javascript
export async function buscarRankingConsolidado(req, res) {
  const { ligaId } = req.params;
  const { force = false, temporada: temporadaParam } = req.query;
  const temporada = parseInt(temporadaParam) || CURRENT_SEASON;

  try {
    if (!mongoose.Types.ObjectId.isValid(ligaId)) {
      return res.status(400).json({ error: "ID de liga inválido" });
    }

    // Determinar rodada final (última rodada com dados DA TEMPORADA)
    const ultimaRodadaComDados = await Rodada.findOne({
      ligaId: new mongoose.Types.ObjectId(ligaId),
      temporada
    })
      .sort({ rodada: -1 })
      .select("rodada")
      .lean();

    if (!ultimaRodadaComDados) {
      // Pré-temporada: sem rodadas consolidadas ainda
      return res.status(200).json({
        cached: false,
        rodadaFinal: 0,
        temporada,
        ranking: [],
        atualizadoEm: null,
        message: "Nenhuma rodada encontrada para esta liga nesta temporada",
      });
    }

    const rodadaFinal = ultimaRodadaComDados.rodada;

    // Tentar buscar do cache (se não forçar recalculo)
    if (!force) {
      const cacheExistente = await RankingGeralCache.findOne({
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada
      }).lean();

      if (cacheExistente) {
        console.log(`[RANKING-CACHE] ✅ Cache encontrado para liga ${ligaId} rodada ${rodadaFinal} temporada ${temporada}`);
        return res.status(200).json({
          cached: true,
          rodadaFinal,
          temporada,
          ranking: cacheExistente.ranking,
          atualizadoEm: cacheExistente.atualizadoEm
        });
      }
    }

    // Cache miss ou forçado - calcular e armazenar
    console.log(`[RANKING-CACHE] 🔄 Calculando ranking consolidado para liga ${ligaId} temporada ${temporada}...`);
    const rankingCalculado = await calcularRankingConsolidado(ligaId, rodadaFinal, temporada);

    // Salvar no cache
    await RankingGeralCache.findOneAndUpdate(
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada
      },
      {
        ligaId: new mongoose.Types.ObjectId(ligaId),
        rodadaFinal,
        temporada,
        ranking: rankingCalculado,
        atualizadoEm: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`[RANKING-CACHE] ✅ Ranking calculado e armazenado (${rankingCalculado.length} participantes)`);

    return res.status(200).json({
      cached: false,
      rodadaFinal,
      temporada,
      ranking: rankingCalculado,
      atualizadoEm: new Date()
    });

  } catch (error) {
    console.error("[RANKING-CACHE] Erro ao buscar ranking consolidado:", error);
    return res.status(500).json({
      error: "Erro ao processar ranking consolidado",
      details: error.message
    });
  }
}
```

### Seção 3: calcularRankingConsolidado (linhas 95-156)
```javascript
async function calcularRankingConsolidado(ligaId, rodadaFinal, temporada) {
  const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

  const pipeline = [
    // Filtrar apenas rodadas da liga, temporada e até a rodada final
    {
      $match: {
        ligaId: ligaObjectId,
        rodada: { $lte: rodadaFinal },
        temporada
      }
    },
    // ... resto do pipeline inalterado
```

### Seção 4: invalidarCacheRanking (linhas 158-184)
```javascript
export async function invalidarCacheRanking(req, res) {
  const { ligaId } = req.params;
  const temporada = parseInt(req.query.temporada) || CURRENT_SEASON;

  try {
    if (!mongoose.Types.ObjectId.isValid(ligaId)) {
      return res.status(400).json({ error: "ID de liga inválido" });
    }

    const resultado = await RankingGeralCache.deleteMany({
      ligaId: new mongoose.Types.ObjectId(ligaId),
      temporada
    });

    console.log(`[RANKING-CACHE] 🗑️ Cache invalidado: ${resultado.deletedCount} registros removidos (temporada ${temporada})`);

    return res.status(200).json({
      message: "Cache de ranking invalidado com sucesso",
      temporada,
      registrosRemovidos: resultado.deletedCount
    });

  } catch (error) {
    console.error("[RANKING-CACHE] Erro ao invalidar cache:", error);
    return res.status(500).json({ error: "Erro ao invalidar cache" });
  }
}
```

### Seção 5: calcularRankingCompleto (linhas 186-190)
```javascript
export async function calcularRankingCompleto(ligaId, rodadaFinal, temporada = CURRENT_SEASON) {
    console.log(`[RANKING-COMPLETO] Calculando ranking até rodada ${rodadaFinal} da liga ${ligaId} temporada ${temporada}`);
    return await calcularRankingConsolidado(ligaId, rodadaFinal, temporada);
}
```

---

## 5. TESTES DE VALIDAÇÃO

### Teste 1: Super Cartola 2026 (deve retornar vazio)
```bash
curl "http://localhost:3000/api/ranking-cache/SUPER_CARTOLA_ID?temporada=2026"
# Esperado: { ranking: [], message: "Nenhuma rodada encontrada..." }
```

### Teste 2: Super Cartola 2025 (histórico)
```bash
curl "http://localhost:3000/api/ranking-cache/SUPER_CARTOLA_ID?temporada=2025"
# Esperado: Ranking com dados de 2025
```

### Teste 3: Default = CURRENT_SEASON
```bash
curl "http://localhost:3000/api/ranking-cache/SUPER_CARTOLA_ID"
# Esperado: Usa 2026 automaticamente
```

---

## 6. ROLLBACK PLAN

```bash
git checkout HEAD~1 -- controllers/rankingGeralCacheController.js
```

---

## 7. CHECKLIST PRÉ-IMPLEMENTAÇÃO

- [x] PRD validado
- [x] Arquivos mapeados
- [x] Dependências verificadas (S.D.A)
- [x] Model suporta temporada
- [x] Index inclui temporada
- [x] Frontend já passa temporada
- [x] Mudanças são cirúrgicas e mínimas

---

## 8. PRÓXIMA FASE

```
SPEC gerado com sucesso!

EXECUTAR: /code .claude/docs/SPEC-ranking-geral-temporada-2026.md
```
