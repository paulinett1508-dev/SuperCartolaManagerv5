# SPEC - Mata-Mata: Filtro de Temporada + Estrutura 2026

**Data:** 04/02/2026
**Baseado em:** PRD-mata-mata-filtro-temporada-2026.md
**Status:** Especificação Técnica - Pronta para Implementação
**Prioridade:** 🔴 CRÍTICA (Bug em produção - dados incorretos)

---

## Resumo da Implementação

Implementar filtro de temporada nas rotas de cache do Mata-Mata (`/api/mata-mata/cache/*`) seguindo o padrão já existente em outras rotas do sistema (`/api/ligas/:id/ranking`, `/api/ligas/:id/melhor-mes`, etc.). Isso corrigirá o bug onde participantes veem edições de **2025** mesmo estando em **2026**.

**Escopo:**
- **FASE 1 (P0 - Bug Fix):** Adicionar filtro `?temporada` nas rotas de cache + controller
- **FASE 2 (P1 - Feature):** Atualizar estrutura de 5 para 7 edições no config JSON

**Padrão de implementação:** Mudanças **cirúrgicas** preservando lógica existente (não reescrever funções).

---

## Arquivos a Modificar (Ordem de Execução)

### 1. `routes/mataMataCacheRoutes.js` - Rota de Listagem (BUG FIX)

**Path:** `/home/runner/workspace/routes/mataMataCacheRoutes.js`
**Tipo:** Modificação
**Impacto:** Alto (corrige bug principal)
**Dependentes:** `public/participante/js/modules/participante-mata-mata.js`

#### Mudanças Cirúrgicas:

**Linha 14-26: ADICIONAR FILTRO DE TEMPORADA**

```javascript
// ANTES (linhas 14-26):
router.get("/cache/:ligaId/edicoes", async (req, res) => {
    try {
        const { ligaId } = req.params;

        console.log(
            `[MATA-CACHE] 📋 Listando edições disponíveis para liga ${ligaId}`,
        );

        const MataMataCache = (await import("../models/MataMataCache.js"))
            .default;

        // Buscar todas as edições desta liga
        const edicoes = await MataMataCache.find({ liga_id: ligaId })

// DEPOIS:
router.get("/cache/:ligaId/edicoes", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada } = req.query; // ✅ NOVO
        const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON; // ✅ NOVO

        console.log(
            `[MATA-CACHE] 📋 Listando edições disponíveis para liga ${ligaId}, temporada ${temporadaFiltro}`,
        );

        const MataMataCache = (await import("../models/MataMataCache.js"))
            .default;

        // ✅ Buscar edições APENAS da temporada especificada
        const edicoes = await MataMataCache.find({
            liga_id: ligaId,
            temporada: temporadaFiltro
        })
```

**Motivo:** Seguir padrão existente em `routes/ligas.js:252-255` (GET `/api/ligas/:id/ranking`).

---

**Linha 1: ADICIONAR IMPORT (TOPO DO ARQUIVO)**

```javascript
// ANTES (linha 1):
import express from "express";

// DEPOIS:
import express from "express";
import { CURRENT_SEASON } from "../config/seasons.js"; // ✅ NOVO IMPORT
```

**Motivo:** Necessário para usar `CURRENT_SEASON` como fallback.

---

### 2. `controllers/mataMataCacheController.js` - Controller (BUG FIX)

**Path:** `/home/runner/workspace/controllers/mataMataCacheController.js`
**Tipo:** Modificação
**Impacto:** Alto
**Dependentes:** `routes/mataMataCacheRoutes.js` (linha 234)

#### Mudanças Cirúrgicas:

**Linha 1: ADICIONAR IMPORT**

```javascript
// ANTES (linha 1):
import MataMataCache from "../models/MataMataCache.js";

// DEPOIS:
import MataMataCache from "../models/MataMataCache.js";
import { CURRENT_SEASON } from "../config/seasons.js"; // ✅ NOVO
```

---

**Linha 33-40: ADICIONAR FILTRO NA FUNÇÃO `lerCacheMataMata`**

```javascript
// ANTES (linhas 33-40):
export const lerCacheMataMata = async (req, res) => {
    try {
        const { ligaId, edicao } = req.params;

        const cache = await MataMataCache.findOne({
            liga_id: ligaId,
            edicao: Number(edicao),
        });

// DEPOIS:
export const lerCacheMataMata = async (req, res) => {
    try {
        const { ligaId, edicao } = req.params;
        const { temporada } = req.query; // ✅ NOVO
        const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON; // ✅ NOVO

        const cache = await MataMataCache.findOne({
            liga_id: ligaId,
            edicao: Number(edicao),
            temporada: temporadaFiltro // ✅ NOVO FILTRO
        });
```

**Motivo:** Garantir que edições específicas também sejam filtradas por temporada.

---

**Linha 81-86: ADICIONAR FILTRO NA FUNÇÃO `obterConfrontosMataMata`**

```javascript
// ANTES (linhas 81-86):
export const obterConfrontosMataMata = async (ligaId, rodadaNumero) => {
    try {
        console.log(`[MATA-CONSOLIDAÇÃO] Processando liga ${ligaId} até R${rodadaNumero}`);

        // Buscar todos os caches de Mata-Mata desta liga
        const caches = await MataMataCache.find({ liga_id: ligaId }).sort({ edicao: 1 });

// DEPOIS:
export const obterConfrontosMataMata = async (ligaId, rodadaNumero, temporada = CURRENT_SEASON) => {
    try {
        console.log(`[MATA-CONSOLIDAÇÃO] Processando liga ${ligaId} até R${rodadaNumero}, temporada ${temporada}`);

        // ✅ Buscar caches APENAS da temporada especificada
        const caches = await MataMataCache.find({
            liga_id: ligaId,
            temporada: temporada // ✅ NOVO FILTRO
        }).sort({ edicao: 1 });
```

**Motivo:** Consolidações devem respeitar segregação de temporadas. Função não é chamada atualmente, mas prevenir bugs futuros.

---

### 3. `public/participante/js/modules/participante-mata-mata.js` - Frontend (BUG FIX)

**Path:** `/home/runner/workspace/public/participante/js/modules/participante-mata-mata.js`
**Tipo:** Modificação
**Impacto:** Alto
**Dependentes:** Nenhum (arquivo final da cadeia)

#### Mudanças Cirúrgicas:

**Linha 202-204: ADICIONAR PARÂMETRO TEMPORADA EM `carregarEdicoesDisponiveis`**

```javascript
// ANTES (linha 202-204):
async function carregarEdicoesDisponiveis(usouCache = false) {
  try {
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes`);

// DEPOIS:
async function carregarEdicoesDisponiveis(usouCache = false) {
  try {
    const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON; // ✅ NOVO
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/edicoes?temporada=${temporada}`); // ✅ NOVO
```

**Motivo:** Enviar temporada selecionada do contexto do participante para API.

---

**Linha 1: ADICIONAR IMPORT NO TOPO**

```javascript
// ANTES (linha 1):
// =====================================================================
// PARTICIPANTE MATA-MATA v7.0 (Cache-First IndexedDB)

// DEPOIS:
// =====================================================================
// PARTICIPANTE MATA-MATA v7.1 (Cache-First + Filtro Temporada) ✅ NOVO
// ✅ v7.1: FIX - Filtro de temporada nas queries de cache
// =====================================================================

import { CURRENT_SEASON } from "/js/config/seasons-client.js"; // ✅ NOVO IMPORT
```

**Motivo:** Necessário para fallback quando `participanteAuth` não estiver disponível.

---

**Linha 275-277: ADICIONAR PARÂMETRO TEMPORADA EM `carregarTodasFases`**

```javascript
// ANTES (linha 275-277):
async function carregarTodasFases(edicao) {
  try {
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/${edicao}`);

// DEPOIS:
async function carregarTodasFases(edicao) {
  try {
    const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON; // ✅ NOVO
    const res = await fetch(`/api/mata-mata/cache/${estado.ligaId}/${edicao}?temporada=${temporada}`); // ✅ NOVO
```

---

**Linha 482-485: ADICIONAR PARÂMETRO TEMPORADA EM `carregarFase`**

```javascript
// ANTES (linha 482-485):
    if (!confrontos) {
      const res = await fetch(
        `/api/mata-mata/cache/${estado.ligaId}/${edicao}`,
      );

// DEPOIS:
    if (!confrontos) {
      const temporada = window.participanteAuth?.temporadaSelecionada || CURRENT_SEASON; // ✅ NOVO
      const res = await fetch(
        `/api/mata-mata/cache/${estado.ligaId}/${edicao}?temporada=${temporada}`, // ✅ NOVO
      );
```

**Motivo:** Garantir que TODAS as chamadas à API incluam filtro de temporada.

---

### 4. `public/js/config/seasons-client.js` - Config Frontend (CRIAR NOVO)

**Path:** `/home/runner/workspace/public/js/config/seasons-client.js`
**Tipo:** Criação
**Impacto:** Baixo (arquivo auxiliar)
**Dependentes:** `participante-mata-mata.js`, outros módulos futuros

#### Conteúdo Completo:

```javascript
/**
 * CONFIGURAÇÃO DE TEMPORADAS - Cliente (Frontend)
 *
 * Espelho do config/seasons.js para uso em módulos ES6 do frontend.
 * Atualizar CURRENT_SEASON aqui quando virar o ano.
 *
 * @version 1.0.0
 */

// =============================================================================
// TEMPORADA ATUAL - MUDE APENAS AQUI PARA VIRAR O ANO
// =============================================================================
export const CURRENT_SEASON = 2026;

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Verifica se uma temporada é a atual
 * @param {number} temporada
 * @returns {boolean}
 */
export const isCurrentSeason = (temporada) => temporada === CURRENT_SEASON;

/**
 * Retorna a temporada anterior
 * @returns {number}
 */
export const getPreviousSeason = () => CURRENT_SEASON - 1;

console.log(`[SEASONS-CLIENT] ⚙️ Temporada atual: ${CURRENT_SEASON}`);
```

**Motivo:** Centralizar constante `CURRENT_SEASON` no frontend (mesmo padrão do backend).

---

### 5. `config/rules/mata_mata.json` - Estrutura 2026 (FEATURE)

**Path:** `/home/runner/workspace/config/rules/mata_mata.json`
**Tipo:** Modificação
**Impacto:** Médio (feature não-bloqueante)
**Dependentes:** Wizard de configuração, Admin

#### Mudanças Cirúrgicas:

**Linha 86: ADICIONAR 6ª e 7ª EDIÇÃO**

```json
// ANTES (linha 86 - fim do array):
      }
    ]
  },

// DEPOIS:
      },
      {
        "id": 6,
        "nome": "6ª Edição",
        "rodadaInicial": 27,
        "rodadaFinal": 31,
        "rodadaDefinicao": 26,
        "fases": {
          "primeira": 27,
          "oitavas": 28,
          "quartas": 29,
          "semis": 30,
          "final": 31
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
    ]
  },
```

**Motivo:** Atualizar estrutura padrão para 2026 (7 edições conforme requisito).

---

## Mapa de Dependências

```
participante-mata-mata.js (linhas 204, 277, 484)
  ↓ fetch(?temporada=2026)
mataMataCacheRoutes.js (linha 14)
  ↓ req.query.temporada
  ↓ await MataMataCache.find({ liga_id, temporada })
MataMataCache collection (MongoDB)
  ↑ índice único: { liga_id, edicao, temporada }

seasons-client.js (NOVO)
  ↑ import { CURRENT_SEASON }
participante-mata-mata.js (linha 1)

config/seasons.js (existente)
  ↑ import { CURRENT_SEASON }
mataMataCacheRoutes.js (linha 1)
mataMataCacheController.js (linha 1)
```

**Isolamento Multi-Tenant:**
- ✅ Todas queries incluem `liga_id` (já validado)
- ✅ Índice único MongoDB previne duplicatas: `{ liga_id: 1, edicao: 1, temporada: 1 }`
- ✅ Sem impacto cross-liga (configurações independentes)

---

## Validações de Segurança

### Multi-Tenant
- [x] Todas queries incluem `liga_id` (linha 26, 38, 86)
- [x] Índice único MongoDB previne duplicatas (`MataMataCache.js:26`)
- [x] Filtro de temporada NÃO remove isolamento de liga

**Queries Afetadas:**
```javascript
// mataMataCacheRoutes.js - Linha 26
MataMataCache.find({
  liga_id: ligaId,        // ✅ Multi-tenant preservado
  temporada: temporadaFiltro // ✅ Segregação temporal
})

// mataMataCacheController.js - Linha 38
MataMataCache.findOne({
  liga_id: ligaId,        // ✅ Multi-tenant preservado
  edicao: Number(edicao),
  temporada: temporadaFiltro // ✅ Segregação temporal
})

// mataMataCacheController.js - Linha 86
MataMataCache.find({
  liga_id: ligaId,        // ✅ Multi-tenant preservado
  temporada: temporada    // ✅ Segregação temporal
})
```

### Autenticação
- [x] Rotas de cache NÃO requerem autenticação (dados públicos para participantes da liga)
- [x] Wizard de configuração protegido por `verificarAdmin` (validado em rota anterior)

---

## Casos de Teste

### Teste 1: Filtro de Temporada Funciona (CT-001)

**Setup:**
- MongoDB contém edições de 2025 E 2026 para mesma liga
- `CURRENT_SEASON = 2026`

**Ação:**
```bash
curl "http://localhost:3000/api/mata-mata/cache/:ligaId/edicoes?temporada=2026"
```

**Resultado Esperado:**
```json
{
  "liga_id": "...",
  "total": 2,
  "edicoes": [
    { "edicao": 1, "rodada_salva": 7, "ultima_atualizacao": "2026-02-04T..." },
    { "edicao": 2, "rodada_salva": 14, "ultima_atualizacao": "2026-02-04T..." }
  ]
}
```

**Validação MongoDB:**
```javascript
db.matamatacaches.find({ liga_id: "...", temporada: 2026 }).count() // Retorna 2
db.matamatacaches.find({ liga_id: "...", temporada: 2025 }).count() // Retorna 5
```

---

### Teste 2: Temporada Default (Sem Parâmetro) (CT-002)

**Setup:**
- `CURRENT_SEASON = 2026`
- Request SEM query parameter `?temporada`

**Ação:**
```bash
curl "http://localhost:3000/api/mata-mata/cache/:ligaId/edicoes"
```

**Resultado Esperado:**
- Backend usa `CURRENT_SEASON` (2026) como fallback
- Retorna apenas edições de 2026

**Log esperado:**
```
[MATA-CACHE] 📋 Listando edições disponíveis para liga ..., temporada 2026
```

---

### Teste 3: Histórico de Temporadas Anteriores (CT-003)

**Setup:**
- Admin quer visualizar Mata-Mata de 2025

**Ação:**
```bash
curl "http://localhost:3000/api/ligas/:id/mata-mata?temporada=2025"
```

**Resultado Esperado:**
- Retorna edições de 2025
- Não interfere com dados de 2026

**Nota:** Rota `/api/ligas/:id/mata-mata` JÁ implementa filtro (linha 469 de `routes/ligas.js`).

---

### Teste 4: Cache IndexedDB Invalidado (CT-004)

**Setup:**
- Cache local contém dados de 2025
- Participante acessa app em 2026

**Ação:**
- Abrir módulo Mata-Mata no app participante

**Resultado Esperado:**
1. Cache carregado instantaneamente (dados de 2025)
2. API retorna dados de 2026
3. Frontend detecta diferença nos dados
4. Re-renderiza com dados frescos de 2026

**Log esperado:**
```
[MATA-MATA] ⚡ Cache IndexedDB: 5 edições
[MATA-MATA] ✅ 2 edições encontradas
[MATA-MATA] 🔄 Re-renderizado com dados frescos
```

**Validação:**
- Verificar que `estado.edicoesDisponiveis.length` passou de 5 para 2
- Nenhum card de edição de 2025 renderizado

---

### Teste 5: 7 Edições Configuradas (CT-005)

**Setup:**
- Admin acessa wizard de Mata-Mata
- Configura `qtd_edicoes = 7`

**Ação:**
1. Salvar configuração via wizard
2. Verificar `ModuleConfig` no MongoDB

**Resultado Esperado:**
```javascript
{
  modulo_id: "mata_mata",
  configuracao_override: {
    calendario: {
      edicoes: [
        { id: 1, nome: "1ª Edição", ... },
        { id: 2, nome: "2ª Edição", ... },
        { id: 3, nome: "3ª Edição", ... },
        { id: 4, nome: "4ª Edição", ... },
        { id: 5, nome: "5ª Edição", ... },
        { id: 6, nome: "6ª Edição", ... },
        { id: 7, nome: "7ª Edição", ... }
      ]
    }
  }
}
```

**Validação:**
- `configuracao_override.calendario.edicoes.length === 7`

---

### Teste 6: Comparação de Tipos (String vs Number) (CT-006)

**Setup:**
- MongoDB contém `time_id` como String ("13935277")
- Frontend compara com Number (13935277)

**Ação:**
```javascript
// participante-mata-mata.js - função extrairTimeId()
const id = extrairTimeId({ timeId: "13935277" });
console.log(id, typeof id); // 13935277, "number"

const meuTimeId = parseInt(estado.timeId);
console.log(id === meuTimeId); // true
```

**Resultado Esperado:**
- ✅ Conversão para `Number` funciona corretamente
- ✅ Comparação `===` retorna `true`
- ✅ Histórico de participação calculado corretamente

**Nota:** Bug JÁ corrigido na v6.8 (linha 22-27), mas validar que continua funcionando.

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversão:**

1. **Reverter código (Git):**
   ```bash
   git log --oneline -5  # Identificar hash do commit
   git revert <hash-do-commit-bugado>
   git push origin main
   ```

2. **Verificar MongoDB:**
   ```javascript
   // Cache NÃO precisa ser restaurado (dados não são modificados, apenas filtrados)
   // Se necessário, re-popular cache com script
   node scripts/regenerar-cache-mata-mata.js --liga=<ligaId> --temporada=2026
   ```

3. **Limpar cache frontend:**
   ```javascript
   // Participante - abrir DevTools console
   await window.OfflineCache.remove('mataMata', '<ligaId>');
   location.reload();
   ```

4. **Validar estado:**
   - [ ] API retorna dados corretos (`?temporada=2025` retorna 2025)
   - [ ] Frontend renderiza edições corretas
   - [ ] Sem erros no console do navegador

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Padrão existente mapeado (`routes/ligas.js:252-255`)
- [x] Impactos multi-tenant validados
- [x] Testes planejados (6 cenários)
- [x] Rollback documentado

### Durante Implementação
- [ ] Executar cada mudança em ordem sequencial
- [ ] Validar sintaxe após cada arquivo modificado
- [ ] Testar endpoint isoladamente antes de integrar frontend
- [ ] Verificar logs do backend (sem erros)
- [ ] Testar com dados reais de 2025 e 2026

### Após Implementação
- [ ] Rodar todos os casos de teste (CT-001 a CT-006)
- [ ] Validar histórico de participação (card de desempenho)
- [ ] Verificar cache IndexedDB (dados frescos)
- [ ] Confirmar isolamento multi-tenant (nenhuma liga afetada)
- [ ] Documentar em CHANGELOG.md

---

## Ordem de Execução (Crítico)

### FASE 1: Backend (Bug Fix - P0)

**Ordem obrigatória:**

1. **`config/seasons.js`** (já existe - validar CURRENT_SEASON)
   - Confirmar: `export const CURRENT_SEASON = 2026;`

2. **`public/js/config/seasons-client.js`** (criar novo)
   - Criar arquivo completo (33 linhas)
   - Validar import no navegador: `import { CURRENT_SEASON } from '/js/config/seasons-client.js'`

3. **`routes/mataMataCacheRoutes.js`**
   - Linha 1: Adicionar import `CURRENT_SEASON`
   - Linhas 14-26: Adicionar filtro de temporada
   - Validar: `curl "/api/mata-mata/cache/:ligaId/edicoes?temporada=2026"`

4. **`controllers/mataMataCacheController.js`**
   - Linha 1: Adicionar import `CURRENT_SEASON`
   - Linhas 33-40: Filtro em `lerCacheMataMata`
   - Linhas 81-86: Filtro em `obterConfrontosMataMata`
   - Validar: `curl "/api/mata-mata/cache/:ligaId/1?temporada=2026"`

5. **`public/participante/js/modules/participante-mata-mata.js`**
   - Linha 1: Atualizar versão para v7.1 + import `CURRENT_SEASON`
   - Linha 204: Adicionar `?temporada` em `carregarEdicoesDisponiveis`
   - Linha 277: Adicionar `?temporada` em `carregarTodasFases`
   - Linha 484: Adicionar `?temporada` em `carregarFase`
   - Validar: Abrir app participante → DevTools Network → verificar query params

### FASE 2: Config (Feature - P1)

6. **`config/rules/mata_mata.json`**
   - Linha 86: Adicionar 6ª e 7ª edição
   - Validar: Admin → Wizard Mata-Mata → Dropdown "Quantas edições?" mostra até 10

---

### Testes Pós-Implementação

**Sequência de validação:**

```bash
# 1. Backend - Temporada 2026
curl "http://localhost:3000/api/mata-mata/cache/684cb1c8af923da7c7df51de/edicoes?temporada=2026"

# 2. Backend - Temporada 2025 (histórico)
curl "http://localhost:3000/api/mata-mata/cache/684cb1c8af923da7c7df51de/edicoes?temporada=2025"

# 3. Backend - Sem parâmetro (deve usar CURRENT_SEASON)
curl "http://localhost:3000/api/mata-mata/cache/684cb1c8af923da7c7df51de/edicoes"

# 4. Frontend - Abrir app participante
# - DevTools → Network → verificar: /edicoes?temporada=2026
# - DevTools → Console → verificar: [MATA-MATA] ✅ X edições encontradas

# 5. Validar MongoDB
mongo
use super_cartola_manager
db.matamatacaches.distinct("temporada", { liga_id: "684cb1c8af923da7c7df51de" })
# Deve retornar: [ 2025, 2026 ]
```

---

## Próximo Passo

**Comando para Fase 3:**

```bash
# LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-mata-mata-filtro-temporada-2026.md
```

**Checklist antes de executar:**
- [ ] PRD revisado e aprovado
- [ ] SPEC revisado e aprovado
- [ ] Backup do MongoDB realizado (opcional, dados não são modificados)
- [ ] Branch Git criado: `git checkout -b fix/mata-mata-filtro-temporada`

---

## Notas de Implementação

### Padrão Existente (Referência)

**Arquivo:** `routes/ligas.js:252-264`

```javascript
router.get("/:id/ranking", async (req, res) => {
  const { id: ligaId } = req.params;
  const { temporada } = req.query; // ✅ PADRÃO
  const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON; // ✅ PADRÃO

  try {
    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({ ligaId, temporada: temporadaFiltro }).lean(); // ✅ PADRÃO
    // ...
  }
});
```

**Reproduzir exatamente este padrão em:**
- `routes/mataMataCacheRoutes.js:14`
- `controllers/mataMataCacheController.js:33`
- `controllers/mataMataCacheController.js:81`

---

### Compatibilidade Retroativa

**Garantias:**
- ✅ Rotas SEM `?temporada` continuam funcionando (usam `CURRENT_SEASON`)
- ✅ Admin usando rota `/api/ligas/:id/mata-mata` NÃO é afetado (já tem filtro)
- ✅ Cache IndexedDB antigo será substituído por dados frescos na próxima visita
- ✅ MongoDB Schema JÁ possui campo `temporada` (default: `CURRENT_SEASON`)

**Não quebra:**
- Cache existente (será filtrado corretamente)
- Queries antigas (fallback para 2026)
- Multi-tenant (liga_id sempre presente)

---

## Métricas de Sucesso

**Indicadores de que o bug foi corrigido:**

1. **API retorna apenas temporada correta:**
   ```bash
   curl "/api/mata-mata/cache/:ligaId/edicoes?temporada=2026" | jq '.edicoes[].edicao'
   # Retorna apenas IDs de edições de 2026
   ```

2. **Frontend exibe apenas dados corretos:**
   - Participante vê edições 1 e 2 (2026), NÃO vê edições 1-5 (2025)
   - Card de desempenho mostra apenas histórico de 2026

3. **Logs confirmam filtro:**
   ```
   [MATA-CACHE] 📋 Listando edições disponíveis para liga ..., temporada 2026
   [MATA-MATA] ✅ 2 edições encontradas
   ```

4. **MongoDB query otimizada:**
   ```javascript
   db.matamatacaches.find({ liga_id: "...", temporada: 2026 }).explain("executionStats")
   // totalDocsExamined === nReturned (usa índice)
   ```

---

**Gerado por:** Spec Protocol v1.0
**Validado por:** S.D.A Completo (Solicitar → Dependências → Analisar)
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO (/code)
