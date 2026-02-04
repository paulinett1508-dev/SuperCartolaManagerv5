# PRD - Mata-Mata: Filtro de Temporada + Estrutura 2026

**Data:** 04/02/2026
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** 🔴 CRÍTICA (Bug em produção - dados incorretos)

---

## Resumo Executivo

O módulo **Mata-Mata** está exibindo dados de **2025** para participantes mesmo quando a temporada atual é **2026**. Isso ocorre porque o endpoint usado pelo app participante (`/api/mata-mata/cache/:ligaId/edicoes`) **NÃO filtra por temporada**, retornando TODAS as edições históricas da liga.

Além disso, a **estrutura de edições para 2026** precisa ser atualizada para refletir os novos requisitos de negócio:
- **7 edições** por temporada (anteriormente 5)
- **5 fases** por edição (classificação, 16avos, quartas, semis, final)
- **Rodada 2** é fase classificatória para ambas as ligas

**Impacto atual:**
- ❌ Participantes veem edições de temporadas anteriores
- ❌ Histórico de participação mostra dados de 2025 misturados com 2026
- ❌ Impossível criar/visualizar corretamente as 7 edições de 2026

---

## Contexto e Análise

### Arquitetura Atual

#### Backend (API)
1. **Route (CORRETO):** `/api/ligas/:id/mata-mata` (`routes/ligas.js:457`)
   - ✅ **JÁ FILTRA** por temporada (linha 469)
   - ✅ Usado pelo admin
   - ✅ Retorna dados corretos segregados por temporada

2. **Route (BUG):** `/api/mata-mata/cache/:ligaId/edicoes` (`routes/mataMataCacheRoutes.js:14`)
   - ❌ **NÃO FILTRA** por temporada (linha 26)
   - ❌ Usado pelo app participante
   - ❌ Retorna TODAS edições históricas

3. **Controller:** `mataMataCacheController.js`
   - ❌ Funções não recebem parâmetro `temporada`
   - ❌ Query MongoDB sem filtro: `{ liga_id: ligaId }` (linha 26)

4. **Model:** `MataMataCache.js`
   - ✅ Possui campo `temporada` com índice (linha 10-15)
   - ✅ Índice único: `{ liga_id, edicao, temporada }` (linha 26)

#### Frontend
1. **Participante:** `participante-mata-mata.js`
   - ❌ Chama rota SEM temporada: `/api/mata-mata/cache/${ligaId}/edicoes` (linha 204)
   - ❌ Não envia parâmetro `?temporada=2026`

2. **Hardcoded 5 edições:** `EDICOES_MATA_MATA` (linhas 11-17)
   - ❌ Apenas 5 edições configuradas
   - ❌ Datas hardcoded ao invés de dinâmicas

#### Config
3. **Rules:** `config/rules/mata_mata.json`
   - ❌ Apenas 5 edições no `calendario.edicoes` (linhas 15-86)
   - ✅ Wizard permite configurar 1-10 edições (linha 158)

---

### Módulos Identificados

#### Backend
- `routes/mataMataCacheRoutes.js` - Rotas de cache do Mata-Mata
- `controllers/mataMataCacheController.js` - Controller de cache
- `models/MataMataCache.js` - Model MongoDB (✅ JÁ tem campo temporada)
- `config/rules/mata_mata.json` - Config padrão de edições

#### Frontend
- `public/participante/js/modules/participante-mata-mata.js` - App participante
- `public/participante/fronts/mata-mata.html` - Template HTML

---

### Dependências Mapeadas

```
participante-mata-mata.js (linha 204)
  ↓ fetch()
mataMataCacheRoutes.js (linha 14)
  ↓ await MataMataCache.find()
mataMataCacheController.js (linha 26)
  ↓ MongoDB Query
MataMataCache collection
```

**Impacto:**
- ✅ Mudança **não quebra** outras funcionalidades
- ✅ Admin JÁ usa rota correta (`/api/ligas/:id/mata-mata`)
- ⚠️ Cache IndexedDB do participante pode conter dados de 2025 (precisa invalidar)

---

### Padrões Existentes

**Filtro de temporada** já implementado em:
- `routes/ligas.js:460` - GET `/api/ligas/:id/mata-mata`
- `routes/ligas.js:252` - GET `/api/ligas/:id/ranking`
- `routes/ligas.js:338` - GET `/api/ligas/:id/melhor-mes`
- `routes/ligas.js:407` - GET `/api/ligas/:id/ranking/:rodada`

**Padrão consistente:**
```javascript
const { temporada } = req.query;
const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON;

const docs = await Model.find({
  liga_id: ligaId,
  temporada: temporadaFiltro
});
```

---

## Solução Proposta

### Abordagem Escolhida

**Fase 1: Corrigir Filtro de Temporada (Bug Fix - P0)**
1. Adicionar parâmetro `?temporada` nas rotas de cache
2. Atualizar controller para filtrar por temporada
3. Modificar frontend para enviar temporada atual
4. Invalidar cache IndexedDB antigo

**Fase 2: Atualizar Estrutura 2026 (Feature - P1)**
1. Atualizar `mata_mata.json` com 7 edições
2. Tornar `EDICOES_MATA_MATA` dinâmico (buscar de config)
3. Validar wizard de configuração (aceita 7 edições)

---

### Arquivos a Modificar

#### FASE 1: Bug Fix Temporada

1. **`routes/mataMataCacheRoutes.js`** (linhas 14-59)
   ```javascript
   // ANTES (linha 14-26):
   router.get("/cache/:ligaId/edicoes", async (req, res) => {
     const { ligaId } = req.params;
     const edicoes = await MataMataCache.find({ liga_id: ligaId })

   // DEPOIS:
   router.get("/cache/:ligaId/edicoes", async (req, res) => {
     const { ligaId } = req.params;
     const { temporada } = req.query;
     const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON;
     const edicoes = await MataMataCache.find({
       liga_id: ligaId,
       temporada: temporadaFiltro
     })
   ```

2. **`controllers/mataMataCacheController.js`** (linhas 33-56)
   ```javascript
   // ANTES (linha 37-40):
   export const lerCacheMataMata = async (req, res) => {
     const { ligaId, edicao } = req.params;
     const cache = await MataMataCache.findOne({
       liga_id: ligaId,
       edicao: Number(edicao),
     });

   // DEPOIS:
   export const lerCacheMataMata = async (req, res) => {
     const { ligaId, edicao } = req.params;
     const { temporada } = req.query;
     const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON;
     const cache = await MataMataCache.findOne({
       liga_id: ligaId,
       edicao: Number(edicao),
       temporada: temporadaFiltro
     });
   ```

3. **Adicionar função:** `obterConfrontosMataMataComTemporada()` no controller
   ```javascript
   // Nova função para consolidação com filtro de temporada
   export const obterConfrontosMataMata = async (ligaId, rodadaNumero, temporada = CURRENT_SEASON) => {
     const caches = await MataMataCache.find({
       liga_id: ligaId,
       temporada: temporada  // ✅ NOVO FILTRO
     }).sort({ edicao: 1 });
     // ... resto da lógica
   }
   ```

4. **`public/participante/js/modules/participante-mata-mata.js`** (linhas 204, 277)
   ```javascript
   // ANTES (linha 204):
   const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes`);

   // DEPOIS:
   const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON;
   const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes?temporada=${temporada}`);

   // ANTES (linha 277):
   const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/${edicao}`);

   // DEPOIS:
   const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/${edicao}?temporada=${temporada}`);
   ```

5. **Invalidar cache IndexedDB** (adicionar no `participante-mata-mata.js`)
   ```javascript
   // Após modificar estrutura, limpar cache antigo
   if (window.OfflineCache) {
     await window.OfflineCache.remove('mataMata', estado.ligaId);
     console.log('[MATA-MATA] 🧹 Cache antigo removido (força reload)');
   }
   ```

#### FASE 2: Estrutura 2026

6. **`config/rules/mata_mata.json`** (adicionar 6ª e 7ª edição)
   ```json
   {
     "id": 6,
     "nome": "6ª Edição",
     "rodadaInicial": 27,
     "rodadaFinal": 30,
     "rodadaDefinicao": 26,
     "fases": {
       "primeira": 27,
       "oitavas": 28,
       "quartas": 29,
       "semis": 29,
       "final": 30
     }
   },
   {
     "id": 7,
     "nome": "7ª Edição",
     "rodadaInicial": 36,
     "rodadaFinal": 38,
     "rodadaDefinicao": 35,
     "fases": {
       "primeira": 36,
       "oitavas": 37,
       "quartas": 37,
       "semis": 38,
       "final": 38
     }
   }
   ```

7. **`public/participante/js/modules/participante-mata-mata.js`** (remover hardcode)
   ```javascript
   // ANTES (linha 11-17):
   const EDICOES_MATA_MATA = [
     { id: 1, nome: "1ª Edição", rodadaInicial: 3, rodadaFinal: 7 },
     // ...
   ];

   // DEPOIS:
   let EDICOES_MATA_MATA = []; // ✅ Será populado dinamicamente da API
   ```

---

### Regras de Negócio

#### RN-001: Segregação por Temporada
- **Descrição:** Cada temporada (2025, 2026, etc.) possui suas próprias edições de Mata-Mata
- **Validação:** Query MongoDB DEVE incluir `{ temporada: YYYY }`
- **Motivo:** Evitar dados históricos misturados

#### RN-002: Temporada Default
- **Descrição:** Se parâmetro `?temporada` não for enviado, usar `CURRENT_SEASON`
- **Fonte:** `config/seasons.js`
- **Comportamento:** Garante retro-compatibilidade

#### RN-003: Estrutura Dinâmica de Edições
- **Descrição:** Número de edições por temporada é configurável via wizard
- **Range:** 1-10 edições (wizard permite configurar)
- **Default 2026:** 7 edições (especificado pelo usuário)

#### RN-004: Fase Classificatória
- **Descrição:** Rodada anterior à `rodadaInicial` define chaveamento
- **Exemplo 2026:** Rodada 2 classifica para 1ª edição (que inicia na R3)
- **Regra:** `rodadaDefinicao = rodadaInicial - 1`

#### RN-005: Formato por Tamanho
- **Descrição:** Número de times define quantas fases existem
- **8 times:** 3 fases (quartas, semis, final)
- **16 times:** 4 fases (oitavas, quartas, semis, final)
- **32 times:** 5 fases (primeira, oitavas, quartas, semis, final)

---

## Riscos e Considerações

### Impactos Previstos

**Positivo:**
- ✅ Participantes veem apenas dados da temporada correta
- ✅ Estrutura flexível permite 7+ edições por temporada
- ✅ Consistente com outros módulos (ranking, melhor-mês, top10)

**Atenção:**
- ⚠️ Cache IndexedDB antigo precisa ser invalidado (pode ter dados de 2025)
- ⚠️ Admin precisa recriar edições para 2026 (cache atual é 2025)
- ⚠️ Queries sem filtro de temporada retornarão apenas CURRENT_SEASON (pode surpreender em histórico)

**Risco:**
- 🔴 **BAIXO** - Mudança cirúrgica em 3 arquivos
- 🔴 **BAIXO** - Padrão já usado em 4+ endpoints
- 🔴 **BAIXO** - Backwards-compatible (default = CURRENT_SEASON)

### Multi-Tenant

- ✅ **Isolamento garantido:** `liga_id` sempre presente nas queries
- ✅ **Índice único:** `{ liga_id, edicao, temporada }` previne duplicatas
- ✅ **Sem impacto cross-liga:** Cada liga tem configurações independentes

---

## Testes Necessários

### Cenários de Teste

#### CT-001: Filtro de Temporada Funciona
**Pré-condição:** Existem edições de 2025 e 2026 no MongoDB
**Ação:** Participante acessa Mata-Mata em 2026
**Esperado:** Apenas edições de 2026 são exibidas
**Query MongoDB:**
```javascript
db.matamatacaches.find({ liga_id: "...", temporada: 2026 })
```

#### CT-002: Temporada Default (Sem Parâmetro)
**Pré-condição:** `CURRENT_SEASON = 2026`
**Ação:** API chamada sem `?temporada`
**Esperado:** Retorna dados de 2026
**Request:** `GET /api/mata-mata/cache/:ligaId/edicoes`

#### CT-003: Histórico de Temporadas Anteriores
**Pré-condição:** Admin quer ver Mata-Mata de 2025
**Ação:** `GET /api/ligas/:id/mata-mata?temporada=2025`
**Esperado:** Retorna edições de 2025

#### CT-004: Cache IndexedDB Invalidado
**Pré-condição:** Cache contém dados de 2025
**Ação:** Participante abre app em 2026
**Esperado:** Cache limpo, busca dados frescos da API
**Log:** `[MATA-MATA] 🧹 Cache antigo removido`

#### CT-005: 7 Edições Configuradas
**Pré-condição:** Admin configura 7 edições via wizard
**Ação:** Salvar configuração
**Esperado:** `ModuleConfig.configuracao_override.calendario.edicoes.length === 7`

#### CT-006: Rodada 2 Classifica para 1ª Edição
**Pré-condição:** Rodada 2 finalizada
**Ação:** Admin processa 1ª edição (inicia R3)
**Esperado:** Chaveamento baseado no ranking da R2
**Validação:** `config.edicoes[0].rodadaDefinicao === 2`

---

## Próximos Passos

### Workflow High Senior Protocol

1. ✅ **FASE 1 (Pesquisa):** PRD gerado
2. ⏭️ **FASE 2 (Spec):** Executar `/spec .claude/docs/PRD-mata-mata-filtro-temporada-2026.md`
3. ⏭️ **FASE 3 (Code):** Executar `/code .claude/docs/SPEC-mata-mata-filtro-temporada-2026.md`

### Ordem de Implementação

**Sprint 1 (Bug Fix - CRÍTICO):**
1. Modificar `mataMataCacheRoutes.js` (filtro temporada)
2. Modificar `mataMataCacheController.js` (filtro temporada)
3. Modificar `participante-mata-mata.js` (enviar temporada)
4. Testar com dados reais de 2025 + 2026

**Sprint 2 (Feature - ALTA):**
5. Atualizar `mata_mata.json` (7 edições)
6. Tornar edições dinâmicas no frontend
7. Validar wizard de configuração

---

## Apêndice: Estrutura de Dados

### MongoDB Document (MataMataCache)
```javascript
{
  _id: ObjectId("..."),
  liga_id: "684cb1c8af923da7c7df51de",
  edicao: 1,
  temporada: 2026,  // ✅ FILTRO CRÍTICO
  rodada_atual: 3,
  dados_torneio: {
    primeira: [ /* confrontos */ ],
    oitavas: [ /* confrontos */ ],
    quartas: [ /* confrontos */ ],
    semis: [ /* confrontos */ ],
    final: [ /* confrontos */ ],
    campeao: { timeId: "123", nome_time: "..." }
  },
  ultima_atualizacao: ISODate("2026-02-04T...")
}
```

### Índices MongoDB
```javascript
// Índice único (previne duplicatas)
{ liga_id: 1, edicao: 1, temporada: 1 } (unique)

// Índices de busca
{ liga_id: 1 }
{ temporada: 1 }
```

---

**Gerado por:** Pesquisa Protocol v1.0
**Próximo passo:** `/spec .claude/docs/PRD-mata-mata-filtro-temporada-2026.md`
**Estimativa de complexidade:** MÉDIA (3 arquivos backend, 1 frontend, 1 config)
**Impacto de negócio:** 🔴 ALTO (bug em produção afeta experiência do usuário)
