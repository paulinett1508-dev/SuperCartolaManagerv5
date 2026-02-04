# 📊 AUDITORIA: Pontos Corridos

**Data:** 04/02/2026 18:30
**Módulo:** pontos-corridos (categoria: competition)
**Complexidade:** medium
**Arquivos analisados:** 2 (controller, frontend participante)
**Problema reportado:** ⚠️ Módulo trazendo informações de 2025

---

## 📋 Resumo Executivo

| Categoria | Score | Status | Observações |
|-----------|-------|--------|-------------|
| **Business Logic** | 6/10 | 🔴 **CRÍTICO** | Filtro de temporada inconsistente |
| UI/UX | 8/10 | ⚠️ Warnings | Hardcode "2025" no banner |
| Security | N/A | ➖ Não aplicável | Sem transações financeiras |
| Performance | 8/10 | ✅ OK | Cache implementado |

**Score Geral:** 73/100 (🟡 Precisa melhorias)

**Veredicto:** 🔴 **BLOQUEAR MERGE** - Issue crítico de Business Logic

---

## 🔴 ISSUES CRÍTICOS (Business Logic)

### Issue #1: Temporada Hardcoded no Banner 🔴 CRÍTICO
**Arquivo:** `public/participante/js/modules/participante-pontos-corridos.js`
**Linha:** 478

**Problema:**
```javascript
<p class="text-white/50 text-[10px]">Pontos Corridos 2025</p>
```

**Impacto:** Usuários veem "2025" mesmo estando em 2026, causando confusão.

**Correção:**
```javascript
<p class="text-white/50 text-[10px]">Pontos Corridos ${estadoPC.temporada || new Date().getFullYear()}</p>
```

**Severidade:** 🔴 CRÍTICA (quebra UX e confiança do usuário)

---

### Issue #2: API Endpoint Sem Parâmetro de Temporada 🔴 CRÍTICO
**Arquivo:** `public/participante/js/modules/participante-pontos-corridos.js`
**Linha:** 154

**Problema:**
```javascript
async function carregarDados() {
    const response = await fetch(`/api/pontos-corridos/${estadoPC.ligaId}`);
    if (!response.ok) throw new Error("Falha ao carregar dados");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}
```

**Impacto:**
- Backend não recebe temporada explícita
- Pode retornar dados de 2025 quando usuário quer 2026
- Viola regra **"TODAS queries filtram por temporada"** (audit-business.md:48)

**Correção:**
```javascript
async function carregarDados() {
    const temporada = estadoPC.temporada || new Date().getFullYear();
    const response = await fetch(`/api/pontos-corridos/${estadoPC.ligaId}?temporada=${temporada}`);
    if (!response.ok) throw new Error("Falha ao carregar dados");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}
```

**Severidade:** 🔴 CRÍTICA (mistura dados de temporadas)

---

### Issue #3: Controller Usa Default CURRENT_SEASON Sem Validação 🟠 ALTO
**Arquivo:** `controllers/pontosCorridosCacheController.js`
**Linha:** 346

**Problema:**
```javascript
export const obterConfrontosPontosCorridos = async (
    ligaId,
    rodadaFiltro = null,
    temporada = CURRENT_SEASON, // ⚠️ Default pode estar desatualizado
) => {
```

**Análise:**
- `CURRENT_SEASON` definido em `config/seasons.js`
- Se não foi atualizado para 2026, continua retornando 2025
- Frontend não passa temporada explicitamente → usa default

**Correção:**
1. **Imediata:** Garantir que `config/seasons.js` tem `CURRENT_SEASON = 2026`
2. **Estrutural:** Obrigar temporada como parâmetro obrigatório:
```javascript
export const obterConfrontosPontosCorridos = async (
    ligaId,
    temporada, // ✅ Obrigatório
    rodadaFiltro = null
) => {
    if (!temporada) {
        throw new Error('Temporada é obrigatória');
    }
    // ...
}
```

**Severidade:** 🟠 ALTA (dependência de config global)

---

### Issue #4: Estado `estadoPC.temporada` Nunca Inicializado 🔴 CRÍTICO
**Arquivo:** `public/participante/js/modules/participante-pontos-corridos.js`
**Linha:** 9-20

**Problema:**
```javascript
const estadoPC = {
    ligaId: null,
    timeId: null,
    rodadaAtual: 1,
    rodadaSelecionada: 1,
    totalRodadas: 31,
    dados: [],
    viewMode: "confrontos",
    mercadoRodada: 1,
    mercadoAberto: true,
    ligaEncerrou: false,
    // ❌ FALTA: temporada: null
};
```

**Impacto:**
- Módulo não sabe qual temporada está operando
- Não há detecção de pré-temporada
- Banner e API usam valores default/hardcoded

**Correção:**
```javascript
const estadoPC = {
    ligaId: null,
    timeId: null,
    temporada: null, // ✅ Adicionar
    rodadaAtual: 1,
    rodadaSelecionada: 1,
    totalRodadas: 31,
    dados: [],
    viewMode: "confrontos",
    mercadoRodada: 1,
    mercadoAberto: true,
    ligaEncerrou: false,
};

// ✅ Em inicializarPontosCorridosParticipante (linha 26):
export async function inicializarPontosCorridosParticipante(params = {}) {
    const participante = params.participante || window.participanteData || {};
    estadoPC.ligaId = params.ligaId || participante.ligaId;
    estadoPC.timeId = params.timeId || participante.timeId;
    estadoPC.temporada = params.temporada || participante.temporada || new Date().getFullYear(); // ✅ Novo

    // ...
}
```

**Severidade:** 🔴 CRÍTICA (quebra toda lógica de temporada)

---

## ⚠️ Business Logic: 6/10 checks passed

### ✅ Pontos Fortes
- ✅ Cache implementado (`PontosCorridosCache`)
- ✅ Configuração via `ModuleConfig` (linha 17-48)
- ✅ Filtro de participantes ativos (linha 474, 509)
- ✅ Fallback para defaults (linha 24-46)
- ✅ Enriquecimento de dados (linha 51-114)
- ✅ Tratamento de mercado aberto/fechado (linha 352-375)

### 🔴 Issues Críticos
- 🔴 **Linha 154** (frontend): API chamada SEM temporada
- 🔴 **Linha 478** (frontend): Hardcode "2025" no banner
- 🔴 **Linha 9** (frontend): Estado sem campo `temporada`
- 🟠 **Linha 346** (backend): Temporada default de `CURRENT_SEASON`

### 🟡 Warnings
- 🟡 **Linha 140** (frontend): `buscarStatusMercado()` não salva temporada da API Cartola
- 🟡 **Linha 672** (frontend): Rodada Brasileirão calculada como `rodada + 6` (hardcode)

---

## 🟠 UI/UX: 8/10 checks passed

### ✅ Pontos Fortes
- ✅ Dark mode aplicado (`bg-surface-dark`, `text-white`)
- ✅ Tipografia correta (cards, badges, stats)
- ✅ Material Icons implementados (v5.0+)
- ✅ Responsividade mobile (grid adaptativo)
- ✅ Estados visuais (loading, error, sem dados)
- ✅ Banner campeão com animações (linha 430-509)
- ✅ Card "Seu Desempenho" com posição (linha 213-424)
- ✅ Classificação com separação ativos/inativos (linha 849-884)

### 🟡 Issues
- 🟡 **Linha 478**: Ano hardcoded "2025" → usar variável dinâmica
- 🟡 **Linha 672**: Rodada Brasileirão baseada em `+ 6` magic number

---

## ⚡ Performance: 8/10 checks passed

### ✅ Pontos Fortes
- ✅ Cache IndexedDB implementado (linha 41-71)
- ✅ Cache-first strategy (linha 40-76)
- ✅ Cache MongoDB para rodadas consolidadas (controller)
- ✅ Busca status mercado 1x por inicialização (linha 140)
- ✅ Enriquecimento batch de dados (linha 51-114)
- ✅ Double RAF para garantir DOM pronto (linha 30)

### 🟡 Melhorias
- 🟡 Cache não invalida quando temporada muda (precisa chave `ligaId:temporada`)
- 🟡 Busca de confrontos parciais faz N requests (linha 505-561)

**Sugestão:**
```javascript
// Linha 42: Incluir temporada na chave do cache
const pcCache = await window.OfflineCache.get(
    'pontosCorridos',
    `${estadoPC.ligaId}:${estadoPC.temporada}`, // ✅ Chave composta
    true
);
```

---

## 🔧 Ações Recomendadas

### 🔴 PRIORIDADE CRÍTICA (BLOQUEAR MERGE)
1. **Adicionar campo `temporada` ao estado** (frontend linha 9)
2. **Passar temporada na API** (frontend linha 154)
3. **Remover hardcode "2025"** (frontend linha 478)
4. **Inicializar temporada corretamente** (frontend linha 26)

### 🟠 PRIORIDADE ALTA (antes de prod)
5. **Validar `CURRENT_SEASON` em config/seasons.js** → deve ser 2026
6. **Fazer temporada obrigatória no controller** (backend linha 346)
7. **Adicionar temporada à chave do cache IndexedDB** (frontend linha 42)

### 🟡 PRIORIDADE MÉDIA (próximo sprint)
8. Salvar temporada do mercado em `buscarStatusMercado()` (linha 140)
9. Tornar rodada inicial configurável (remover magic number `+ 6`)
10. Otimizar busca de confrontos parciais (batch requests)

---

## 📊 Plano de Correção Sugerido

### 1️⃣ Frontend: Inicializar temporada corretamente
```javascript
// Arquivo: public/participante/js/modules/participante-pontos-corridos.js

// Estado (linha 9)
const estadoPC = {
    ligaId: null,
    timeId: null,
    temporada: null, // ✅ Adicionar
    rodadaAtual: 1,
    // ...
};

// Inicialização (linha 26)
export async function inicializarPontosCorridosParticipante(params = {}) {
    const participante = params.participante || window.participanteData || {};
    estadoPC.ligaId = params.ligaId || participante.ligaId;
    estadoPC.timeId = params.timeId || participante.timeId;

    // ✅ NOVO: Detectar temporada dinamicamente
    await buscarStatusMercado();
    estadoPC.temporada = params.temporada ||
                         participante.temporada ||
                         estadoPC.mercadoTemporada || // Da API Cartola
                         new Date().getFullYear();

    console.log(`[PONTOS-CORRIDOS] 📅 Temporada ativa: ${estadoPC.temporada}`);
    // ...
}

// Buscar status mercado (linha 140)
async function buscarStatusMercado() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const status = await response.json();
            estadoPC.mercadoRodada = status.rodada_atual || 1;
            estadoPC.mercadoAberto = status.status_mercado === 1;
            estadoPC.mercadoTemporada = status.temporada; // ✅ Salvar temporada
        }
    } catch (e) {
        if (window.Log) Log.warn("[PONTOS-CORRIDOS] ⚠️ Falha ao buscar status do mercado");
    }
}

// Carregar dados (linha 154)
async function carregarDados() {
    const response = await fetch(
        `/api/pontos-corridos/${estadoPC.ligaId}?temporada=${estadoPC.temporada}` // ✅ Passar temporada
    );
    if (!response.ok) throw new Error("Falha ao carregar dados");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

// Banner campeão (linha 478)
<p class="text-white/50 text-[10px]">Pontos Corridos ${estadoPC.temporada}</p>
```

### 2️⃣ Backend: Validar temporada obrigatória
```javascript
// Arquivo: controllers/pontosCorridosCacheController.js

// Linha 342: Temporada obrigatória
export const obterConfrontosPontosCorridos = async (
    ligaId,
    temporada, // ✅ Obrigatório (sem default)
    rodadaFiltro = null
) => {
    try {
        // ✅ Validação
        if (!temporada) {
            throw new Error('Parâmetro temporada é obrigatório');
        }

        // 0. Buscar configuração do módulo COM TEMPORADA
        const config = await buscarConfigPontosCorridos(ligaId, temporada);

        // ...resto do código
    } catch (error) {
        console.error(`[PONTOS-CORRIDOS] ❌ Erro (T${temporada}):`, error);
        return [];
    }
};
```

### 3️⃣ Route: Aceitar query param `temporada`
```javascript
// Arquivo: routes/pontosCorridosCacheRoutes.js (presumido)

router.get('/api/pontos-corridos/:ligaId', async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada } = req.query; // ✅ Query param

        if (!temporada) {
            return res.status(400).json({
                erro: 'Parâmetro temporada é obrigatório'
            });
        }

        const dados = await obterConfrontosPontosCorridos(
            ligaId,
            parseInt(temporada), // ✅ Passar temporada
            null
        );

        res.json(dados);
    } catch (error) {
        console.error('[API-PC] Erro:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});
```

### 4️⃣ Cache: Chave composta com temporada
```javascript
// Arquivo: public/participante/js/modules/participante-pontos-corridos.js

// Linha 42: Cache com chave composta
const pcCache = await window.OfflineCache.get(
    'pontosCorridos',
    `${estadoPC.ligaId}:${estadoPC.temporada}`, // ✅ Liga:Temporada
    true
);

// Linha 107: Salvar com chave composta
await window.OfflineCache.set(
    'pontosCorridos',
    `${estadoPC.ligaId}:${estadoPC.temporada}`, // ✅ Liga:Temporada
    dados
);
```

---

## 🎓 Lições Aprendidas

### ✅ O que o módulo faz bem
1. **Arquitetura de cache sofisticada** (IndexedDB + MongoDB)
2. **UI/UX polida** (Material Icons, animações, estados visuais)
3. **Configuração flexível** via ModuleConfig
4. **Filtro de participantes inativos** bem implementado

### ❌ O que precisa melhorar
1. **Gestão de temporada** → Adicionar ao estado e APIs
2. **Validação de entrada** → Temporada obrigatória
3. **Chaves de cache** → Incluir temporada
4. **Testes de edge cases** → Mudança de ano, pré-temporada

### 📚 Regras de Negócio Violadas
- **audit-business.md:48** → "TODAS queries filtram por temporada" ❌
- **audit-business.md:50** → "Nunca mistura dados de temporadas" ❌
- **audit-business.md:70** → "Detecta pré-temporada corretamente" ❌

---

## 🔗 Arquivos Relacionados

### Arquivos Analisados
- ✅ `controllers/pontosCorridosCacheController.js` (921 linhas)
- ✅ `public/participante/js/modules/participante-pontos-corridos.js` (1022 linhas)
- ✅ `docs/modules-registry.json` (config do módulo)

### Arquivos a Verificar (não analisados)
- ⚠️ `config/seasons.js` → Validar `CURRENT_SEASON === 2026`
- ⚠️ `routes/pontosCorridosCacheRoutes.js` → Adicionar query param temporada
- ⚠️ `models/PontosCorridosCache.js` → Schema suporta temporada?

### Documentação
- `docs/SISTEMA-RENOVACAO-TEMPORADA.md` → Regras de temporada
- `docs/rules/audit-business.md` → Checklist aplicado
- `CLAUDE.md` → Padrões de Business Logic

---

## ✅ Checklist de Validação Pós-Correção

Após implementar as correções, validar:

- [ ] Frontend inicializa `estadoPC.temporada` corretamente
- [ ] API `/api/pontos-corridos/:ligaId?temporada=X` aceita query param
- [ ] Controller valida temporada obrigatória
- [ ] Cache usa chave composta `ligaId:temporada`
- [ ] Banner exibe ano dinâmico (não "2025")
- [ ] Testes manuais:
  - [ ] Abrir módulo em liga 2026 → mostra dados 2026
  - [ ] Abrir módulo em liga 2025 → mostra dados 2025
  - [ ] Limpar cache → recarrega corretamente
  - [ ] Mudança de temporada → invalida cache antigo

---

**Auditoria realizada por:** Claude Code v3.0 (Module Auditor Skill)
**Próxima auditoria:** Após correção dos issues críticos
**Status:** 🔴 **NÃO APROVADO** - Requer correções antes de merge

---

## 📞 Suporte

Para dúvidas sobre esta auditoria:
1. Consultar `docs/rules/audit-business.md` (regras completas)
2. Verificar `CLAUDE.md` seção "Pré-Temporada"
3. Usar skill `/system-scribe pontos-corridos` para documentação

**Gerado automaticamente em:** 04/02/2026 18:30
**Versão do Auditor:** 1.0.0
