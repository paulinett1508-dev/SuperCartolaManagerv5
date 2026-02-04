# PRD - Módulos Opcionais Desabilitados por Padrão em Ligas 2026

**Data:** 2026-01-26
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O sistema deve garantir que ligas criadas na temporada 2026 tenham **TODOS os módulos opcionais desabilitados por padrão**. Atualmente, embora o schema e wizard estejam configurados corretamente, existem endpoints e controllers que **não filtram por temporada** ao buscar dados de caches (Top10, etc.), fazendo com que dados de temporadas anteriores (2025) sejam retornados para ligas 2026.

**Problema principal:** Controllers de cache não filtram por `temporada`, retornando dados de 2025 para ligas que existem em 2026.

---

## Contexto e Análise

### O que JÁ está correto

1. **Model Liga.js** (linha 97-115): Schema define `modulos_ativos` com todos opcionais como `false` por padrão
2. **config/modulos-defaults.js**: MODULOS_DEFAULTS tem todos opcionais como `false`
3. **wizard-primeira-liga.js** (linha 19-38): Wizard cria liga com módulos opcionais desabilitados
4. **Ligas no banco 2026**: Verificado que ligas têm `modulos_ativos` corretos (todos opcionais = false)
5. **participante-historico.js** (linha 282-288): Verifica `modulos.{modulo} === true` antes de buscar

### Problemas Identificados

#### PROBLEMA 1: Top10CacheController não filtra temporada
**Arquivo:** `controllers/top10CacheController.js`

```javascript
// Linha 44-50 - Query SEM filtro de temporada
const query = { liga_id: ligaIdQuery };
if (rodada) query.rodada_consolidada = Number(rodada);
const cache = await Top10Cache.findOne(query).sort({
    rodada_consolidada: -1,
});
```

**Impacto:** Busca cache mais recente da liga independente da temporada. Se existir cache de 2025, ele será retornado para uma requisição de 2026.

#### PROBLEMA 2: salvarCacheTop10 não salva temporada
**Arquivo:** `controllers/top10CacheController.js`

```javascript
// Linha 17-27 - Upsert SEM campo temporada explícito
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
```

**Impacto:** Depende do default do schema. Se temporada não for passada, usa `CURRENT_SEASON`, mas o índice único inclui temporada, então pode causar conflitos.

#### PROBLEMA 3: limparCacheTop10 limpa TODAS as temporadas
**Arquivo:** `controllers/top10CacheController.js`

```javascript
// Linha 72 - Delete SEM filtro de temporada
const result = await Top10Cache.deleteMany({ liga_id: ligaIdQuery });
```

**Impacto:** Ao limpar cache de uma liga, apaga histórico de todas as temporadas.

### Módulos Identificados

- **Backend:**
  - `controllers/top10CacheController.js` - Precisa filtrar temporada em todas as operações
  - `routes/top10CacheRoutes.js` - Pode receber `?temporada=` como query param
  - `models/Top10Cache.js` - Schema já tem campo temporada ✅

- **Frontend (verificações corretas):**
  - `public/participante/js/modules/participante-historico.js` - Usa `=== true` ✅
  - `public/participante/js/participante-navigation.js` - Fallback correto ✅
  - `routes/tesouraria-routes.js` - Usa `=== true` para opcionais ✅

### Dependências Mapeadas

```
Liga.modulos_ativos (fonte da verdade)
    ↓
participante-navigation.js → carrega módulos
    ↓
participante-historico.js → verifica === true → buscarTop10()
    ↓
/api/top10/cache/:ligaId → top10CacheController.lerCacheTop10()
    ↓
Top10Cache.findOne({ liga_id }) ← FALTA temporada!
```

---

## Solução Proposta

### Abordagem Escolhida

Adicionar filtro de temporada em **todas as operações** do `top10CacheController.js`, usando `CURRENT_SEASON` como default e permitindo override via query param.

### Arquivos a Modificar

1. **`controllers/top10CacheController.js`**
   - `lerCacheTop10`: Adicionar `temporada` na query
   - `salvarCacheTop10`: Incluir `temporada` explicitamente no upsert
   - `limparCacheTop10`: Filtrar por temporada (ou adicionar flag para limpar todas)

2. **`routes/top10CacheRoutes.js`** (opcional)
   - Documentar parâmetro `?temporada=` nas rotas

### Regras de Negócio

1. **Módulos BASE** (sempre ativos): `extrato`, `ranking`, `rodadas`, `historico`
2. **Módulos OPCIONAIS** (admin configura): `top10`, `melhorMes`, `pontosCorridos`, `mataMata`, `artilheiro`, `luvaOuro`, `campinho`, `dicas`
3. **Liga nova 2026**: Todos opcionais = `false` por padrão
4. **Busca de cache**: Deve filtrar por `temporada` para evitar retornar dados de anos anteriores

---

## Riscos e Considerações

### Impactos Previstos

- **Positivo:** Ligas 2026 não receberão dados fantasmas de 2025
- **Positivo:** Dados históricos de 2025 permanecem acessíveis com `?temporada=2025`
- **Atenção:** Scripts de consolidação devem passar temporada explicitamente

### Multi-Tenant
- [x] Validado isolamento liga_id
- [x] Temporada como dimensão adicional de segregação

---

## Mudanças Específicas

### top10CacheController.js

```javascript
// ANTES (lerCacheTop10)
const query = { liga_id: ligaIdQuery };

// DEPOIS
import { CURRENT_SEASON } from "../config/seasons.js";
const temporada = req.query.temporada ? Number(req.query.temporada) : CURRENT_SEASON;
const query = { liga_id: ligaIdQuery, temporada };
```

```javascript
// ANTES (salvarCacheTop10)
await Top10Cache.findOneAndUpdate(
    { liga_id: ligaIdQuery, rodada_consolidada: rodada },
    { mitos, micos, ... }
);

// DEPOIS
const temporada = req.body.temporada || CURRENT_SEASON;
await Top10Cache.findOneAndUpdate(
    { liga_id: ligaIdQuery, rodada_consolidada: rodada, temporada },
    { mitos, micos, temporada, ... }
);
```

```javascript
// ANTES (limparCacheTop10)
await Top10Cache.deleteMany({ liga_id: ligaIdQuery });

// DEPOIS
const temporada = req.query.temporada ? Number(req.query.temporada) : CURRENT_SEASON;
const clearAll = req.query.all === 'true';
const deleteQuery = clearAll
    ? { liga_id: ligaIdQuery }
    : { liga_id: ligaIdQuery, temporada };
await Top10Cache.deleteMany(deleteQuery);
```

---

## Testes Necessários

### Cenários de Teste

1. **Liga nova 2026 sem cache**: Deve retornar 404, não dados de 2025
2. **Liga existente com cache 2025 e 2026**: Deve retornar apenas da temporada solicitada
3. **Salvar cache 2026**: Não deve sobrescrever cache 2025
4. **Limpar cache com temporada**: Deve limpar apenas temporada especificada
5. **Limpar cache com `?all=true`**: Deve limpar todas as temporadas

---

## Próximos Passos

1. Validar PRD com usuário
2. Gerar SPEC: Executar `/spec` com este PRD
3. Implementar: Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0
