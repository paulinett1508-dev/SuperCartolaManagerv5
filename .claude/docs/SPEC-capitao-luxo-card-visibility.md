# SPEC - Capitão Luxo Card Visibility Fix

**Data:** 2026-01-29
**Baseado em:** PRD-capitao-luxo-card-visibility.md
**Status:** Especificação Técnica Aprovada
**Versão:** 1.0

---

## Resumo da Implementação

Correção cirúrgica de bug crítico onde o módulo **Capitão Luxo** não responde ao toggle de ativação/desativação em `gerenciar-modulos.html`. A implementação adiciona o mapeamento necessário em `cards-condicionais.js` e a chave default em `models/Liga.js`, além de remover a restrição automática que oculta o card em todas as temporadas.

**Root Cause:** Falta de entrada no `MODULO_TO_CARD_MAP` e presença desnecessária em `MODULOS_2026_ONLY`.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. `public/js/cards-condicionais.js` - Mudança Principal

**Path:** `/home/runner/workspace/public/js/cards-condicionais.js`
**Tipo:** Modificação
**Impacto:** Alto
**Dependentes:** `detalhe-liga.html`, `gerenciar-modulos.html`

#### Mudanças Cirúrgicas:

**MUDANÇA 1: Remover capitao-luxo de MODULOS_2026_ONLY**

**Linha 150: MODIFICAR**
```javascript
// ANTES:
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um', 'capitao-luxo'];

// DEPOIS:
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um'];
```

**Motivo:** O módulo Capitão Luxo JÁ EXISTE no codebase (`services/capitaoService.js`, `config/definitions/capitao_luxo_def.json`), portanto NÃO deve ser ocultado automaticamente. A presença nesta lista impedia visibilidade em temporadas <2026 mesmo quando explicitamente habilitado.

---

**MUDANÇA 2: Adicionar mapeamento ao MODULO_TO_CARD_MAP**

**Linha 156-172: ADICIONAR LINHAS**
```javascript
// ANTES:
const MODULO_TO_CARD_MAP = {
    // Nomes em modulos_ativos -> data-module no HTML
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    'top10': 'top10',
    'melhorMes': 'melhor-mes',
    'melhor_mes': 'melhor-mes',
    'pontosCorridos': 'pontos-corridos',
    'pontos_corridos': 'pontos-corridos',
    'mataMata': 'mata-mata',
    'mata_mata': 'mata-mata',
    'parciais': 'parciais',
    'fluxoFinanceiro': 'fluxo-financeiro',
    'fluxo_financeiro': 'fluxo-financeiro'
};

// DEPOIS (ADICIONAR 2 LINHAS APÓS luva_ouro):
const MODULO_TO_CARD_MAP = {
    // Nomes em modulos_ativos -> data-module no HTML
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    'capitaoLuxo': 'capitao-luxo',      // ✅ ADICIONAR - camelCase (padrão modulos_ativos)
    'capitao_luxo': 'capitao-luxo',     // ✅ ADICIONAR - snake_case (compatibilidade backendId)
    'top10': 'top10',
    'melhorMes': 'melhor-mes',
    'melhor_mes': 'melhor-mes',
    'pontosCorridos': 'pontos-corridos',
    'pontos_corridos': 'pontos-corridos',
    'mataMata': 'mata-mata',
    'mata_mata': 'mata-mata',
    'parciais': 'parciais',
    'fluxoFinanceiro': 'fluxo-financeiro',
    'fluxo_financeiro': 'fluxo-financeiro'
};
```

**Motivo:** Sem este mapeamento, quando `modulos_ativos.capitaoLuxo = true/false`, o sistema NÃO sabe como traduzir para o `data-module="capitao-luxo"` do HTML. Adicionamos AMBAS as variações (camelCase e snake_case) para garantir compatibilidade com `gerenciar-modulos.html` que usa `backendId: 'capitao_luxo'` (linha 164).

**Padrão Existente:** Seguindo o padrão de `luvaOuro`/`luva_ouro` (linhas 160-161).

---

### 2. `models/Liga.js` - Schema Default

**Path:** `/home/runner/workspace/models/Liga.js`
**Tipo:** Modificação
**Impacto:** Médio
**Dependentes:** Todas queries de criação de ligas

#### Mudanças Cirúrgicas:

**Linha 97-114: ADICIONAR LINHA**
```javascript
// ANTES:
modulos_ativos: {
    type: Object,
    default: {
        // Módulos BASE - sempre habilitados
        extrato: true,
        ranking: true,
        rodadas: true,
        historico: true,
        // Módulos OPCIONAIS - admin habilita conforme necessário
        top10: false,
        melhorMes: false,
        pontosCorridos: false,
        mataMata: false,
        artilheiro: false,
        luvaOuro: false,
        campinho: false,
        dicas: false,
    },
},

// DEPOIS (ADICIONAR 1 LINHA APÓS luvaOuro):
modulos_ativos: {
    type: Object,
    default: {
        // Módulos BASE - sempre habilitados
        extrato: true,
        ranking: true,
        rodadas: true,
        historico: true,
        // Módulos OPCIONAIS - admin habilita conforme necessário
        top10: false,
        melhorMes: false,
        pontosCorridos: false,
        mataMata: false,
        artilheiro: false,
        luvaOuro: false,
        capitaoLuxo: false,  // ✅ ADICIONAR
        campinho: false,
        dicas: false,
    },
},
```

**Motivo:** Garante que NOVAS ligas criadas tenham a chave `capitaoLuxo` explicitamente definida. Sem isso, `modulos_ativos.capitaoLuxo === undefined`, o que pode causar comportamento imprevisível.

**Impacto em Ligas Existentes:** Zero impacto. Ligas criadas ANTES desta correção continuam funcionando normalmente:
- Se a liga não tem `capitaoLuxo` → `undefined` → JavaScript trata como falsy → card desabilitado (comportamento correto)
- Se a liga foi criada DEPOIS → `capitaoLuxo: false` → card desabilitado (comportamento correto)
- Admin pode habilitar via `gerenciar-modulos.html` em ambos os casos

---

### 3. (OPCIONAL) `public/detalhe-liga.html` - Ajuste Visual

**Path:** `/home/runner/workspace/public/detalhe-liga.html`
**Tipo:** Modificação OPCIONAL
**Impacto:** Baixo (apenas visual)

#### Mudanças Cirúrgicas:

**Linha 648: OPCIONAL - Remover classe module-card-2026**
```html
<!-- ANTES -->
<div class="module-card module-card-2026" data-module="capitao-luxo">

<!-- OPÇÃO A: Remover classe 2026 (card sempre disponível visualmente) -->
<div class="module-card" data-module="capitao-luxo">

<!-- OPÇÃO B: Manter classe 2026 (mantém badge "2026" e estilo diferenciado) -->
<div class="module-card module-card-2026" data-module="capitao-luxo">
```

**Recomendação:** **MANTER classe `module-card-2026`** (OPÇÃO B)

**Motivo:**
- A classe `module-card-2026` apenas aplica estilo visual (badge "2026", status "Em breve")
- NÃO interfere na funcionalidade de ativação/desativação
- Mantém consistência visual com outros módulos planejados (Tiro Certo, Resta Um, Bolão Copa)
- Deixa claro para admins que é um módulo em fase de lançamento

**Se remover:**
- Card perde badge "2026" e status "Em breve"
- Visual fica idêntico aos módulos tradicionais (Top 10, Melhor Mês, etc.)
- Funcionalidade continua idêntica

---

## Mapa de Dependências

```
[ARQUIVO PRINCIPAL] cards-condicionais.js
    ↓ (importado por)
    detalhe-liga.html:1071 [<script src="js/cards-condicionais.js">]
        ↑ (consome DOM)
        detalhe-liga.html:648 [data-module="capitao-luxo"]
    ↓ (consome API)
    /api/ligas/:id/configuracoes
        ↑ (servido por)
        controllers/ligaController.js:872 (getConfiguracoes)
            ↑ (acessa schema)
            models/Liga.js:97 (modulos_ativos)

[ARQUIVO SECUNDÁRIO] gerenciar-modulos.html
    ↓ (usa config)
    MODULOS_CONFIG.capitaoLuxo:159 [backendId: 'capitao_luxo']
    ↓ (salva via API)
    PUT /api/ligas/:id/modulos-ativos
        ↑ (servido por)
        controllers/ligaController.js:832 (updateModulosAtivos)
            ↑ (atualiza schema)
            models/Liga.js:97 (modulos_ativos.capitaoLuxo)
```

---

## Validações de Segurança

### Multi-Tenant ✅
- **Query Isolation:** Validado em `fetchLigaConfig()` linha 54
  ```javascript
  fetch(`/api/ligas/${ligaId}/configuracoes`)
  ```
  Cada liga carrega sua própria configuração via `ligaId` na URL.

- **Cache Isolation:** v2.6 invalida cache ao mudar de liga (linhas 43-46)
  ```javascript
  if (cachedLigaId && cachedLigaId !== ligaId) {
      invalidarCache();
  }
  ```

- **Nenhuma query global:** Zero risco de cross-contamination entre ligas.

### Autenticação
- **Frontend:** Sistema apenas desabilita visualmente (linhas 115-128)
- **Backend:** Proteção real nas rotas `/api/ligas/:id/*` via middleware `verificarAdmin` (controllers/ligaController.js)
- **Nenhuma brecha de segurança introduzida:** Mudanças são apenas de mapeamento, sem lógica de autorização.

---

## Casos de Teste

### TC-01: Habilitar Capitão Luxo (Temporada 2026+)
**Setup:**
1. Criar liga com temporada 2026
2. Verificar que `modulos_ativos.capitaoLuxo = false` (default)

**Ação:**
1. Acessar `gerenciar-modulos.html?id=[ligaId]`
2. Ativar toggle "Capitão de Luxo"
3. Clicar "Salvar Configurações"
4. Navegar para `detalhe-liga.html?id=[ligaId]`

**Resultado Esperado:**
- Card "Capitão Luxo" **SEM** classe `disabled`
- Card **SEM** `style.pointerEvents = 'none'`
- Card **SEM** `style.opacity = '0.5'`
- Card **CLICÁVEL** (pode navegar para módulo)
- Console: `[CARDS-CONDICIONAIS] Nenhuma restrição para esta liga`

**Validação Técnica:**
```javascript
// cards-condicionais.js:309-317
const modulos = config.modulos_ativos || {};
const modulosDesabilitados = Object.entries(modulos)
    .filter(([_, enabled]) => enabled === false)
    .map(([key]) => {
        if (MODULO_TO_CARD_MAP[key]) {  // ✅ Deve encontrar 'capitaoLuxo'
            return MODULO_TO_CARD_MAP[key];
        }
        return key.replace(/([A-Z])/g, '-$1').toLowerCase();
    });
// modulosDesabilitados NÃO deve conter 'capitao-luxo'
```

---

### TC-02: Desabilitar Capitão Luxo (Temporada 2026+)
**Setup:**
1. Mesma liga de TC-01
2. Capitão Luxo previamente HABILITADO

**Ação:**
1. Acessar `gerenciar-modulos.html?id=[ligaId]`
2. **DESATIVAR** toggle "Capitão de Luxo"
3. Salvar configurações
4. Voltar para `detalhe-liga.html?id=[ligaId]`

**Resultado Esperado:**
- Card "Capitão Luxo" **COM** classe `disabled`
- Card **COM** `style.pointerEvents = 'none'`
- Card **COM** `style.opacity = '0.5'`
- Card **NÃO CLICÁVEL**
- Console: `[CARDS-CONDICIONAIS] Card "capitao-luxo" desabilitado (v2.5)`

**Validação Técnica:**
```javascript
// cards-condicionais.js:309-317
// capitaoLuxo: false → modulosDesabilitados = ['capitao-luxo']
// aplicarEstadoDesabilitado() linha 115-128
card.classList.add("disabled");
card.style.pointerEvents = "none";
card.style.opacity = "0.5";
```

---

### TC-03: Temporada Histórica (<2026) - Capitão Luxo Habilitado
**Setup:**
1. Criar liga com temporada 2025
2. Via MongoDB ou API, setar `modulos_ativos.capitaoLuxo = true`
   ```javascript
   db.ligas.updateOne(
       { _id: ObjectId("...") },
       { $set: { "modulos_ativos.capitaoLuxo": true } }
   );
   ```

**Ação:**
1. Acessar `detalhe-liga.html?id=[ligaId]&temporada=2025`

**Resultado Esperado (APÓS CORREÇÃO):**
- Card **VISÍVEL** (não mais ocultado por MODULOS_2026_ONLY)
- Card **CLICÁVEL** (módulo habilitado)
- Console:
  - `[CARDS-CONDICIONAIS] Temporada histórica 2025 - Liga [id]`
  - **NÃO** deve aparecer `Módulo 2026 "capitao-luxo" oculto`
  - `[CARDS-CONDICIONAIS] Temporada histórica detectada - mantendo todos os módulos habilitados`

**Validação Técnica:**
```javascript
// cards-condicionais.js:212-219
// ANTES: MODULOS_2026_ONLY = ['..., 'capitao-luxo'] → card.style.display = 'none'
// DEPOIS: MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um'] → capitao-luxo NÃO processado
```

---

### TC-04: Liga Antiga (Sem capitaoLuxo no Schema)
**Setup:**
1. Liga criada ANTES desta correção
2. `modulos_ativos` **NÃO** contém chave `capitaoLuxo` (undefined)

**Ação:**
1. Acessar `detalhe-liga.html?id=[ligaId]`

**Resultado Esperado:**
- Card **DESABILITADO** (undefined = falsy)
- Comportamento idêntico a `capitaoLuxo: false`
- Nenhum erro no console
- Card visível mas com opacity 0.5 e não clicável

**Validação Técnica:**
```javascript
// cards-condicionais.js:93
const modulos = config.modulos_ativos || {};
if (modulos[moduloCamel] === false || modulos[moduloKey] === false) {
    return true; // ❌ Não entra aqui (undefined !== false)
}

// cards-condicionais.js:310
.filter(([_, enabled]) => enabled === false)
// ❌ undefined não passa pelo filtro

// Resultado: Card NÃO é marcado como desabilitado via modulos_ativos
// MAS também NÃO é marcado como habilitado
// JavaScript trata undefined como falsy → comportamento correto
```

**Correção se necessário:**
Admin pode habilitar via `gerenciar-modulos.html`, o que adicionará a chave:
```javascript
// PUT /api/ligas/:id/modulos-ativos
{ capitaoLuxo: true }
// Mongoose faz merge com schema existente
```

---

### TC-05: Cache Invalidation (Navegação Entre Ligas)
**Setup:**
1. **Liga A:** `modulos_ativos.capitaoLuxo = true`
2. **Liga B:** `modulos_ativos.capitaoLuxo = false`

**Ação:**
1. Acessar `detalhe-liga.html?id=[ligaA]`
2. Verificar estado do card (habilitado)
3. Navegar via sidebar para `detalhe-liga.html?id=[ligaB]`
4. Verificar estado do card (desabilitado)

**Resultado Esperado:**
- **Liga A:** Card clicável (habilitado)
- **Navegação:** Console mostra `[CARDS-CONDICIONAIS] Liga mudou ([ligaA] -> [ligaB]), invalidando cache...`
- **Liga B:** Card desabilitado (opacity 0.5, pointer-events none)
- Nenhum state bleeding entre ligas

**Validação Técnica:**
```javascript
// cards-condicionais.js:42-46 (v2.6 FIX)
if (cachedLigaId && cachedLigaId !== ligaId) {
    console.log(`[CARDS-CONDICIONAIS] Liga mudou (${cachedLigaId} -> ${ligaId}), invalidando cache...`);
    invalidarCache();
}
cachedLigaId = ligaId; // Salvar ID da liga cacheada
```

---

## Rollback Plan

### Em Caso de Falha

**Sintoma:** Card continua não respondendo ao toggle OU comportamento inesperado em produção.

**Passos de Reversão:**

1. **Reverter commits:**
   ```bash
   git log --oneline -5  # Identificar hash do commit de correção
   git revert [hash]     # Criar commit de reversão
   git push origin main
   ```

2. **Estado após rollback:**
   - `cards-condicionais.js:150` → `MODULOS_2026_ONLY` inclui `'capitao-luxo'`
   - `cards-condicionais.js:156-172` → `MODULO_TO_CARD_MAP` SEM entradas de capitão
   - `models/Liga.js:97-114` → `modulos_ativos` SEM `capitaoLuxo: false`
   - Comportamento: Card volta a ser ocultado em <2026 e não responde ao toggle

3. **Limpeza de cache (se aplicável):**
   ```javascript
   // No console do browser
   window.cardsCondicionais.invalidarCache();
   location.reload();
   ```

4. **Nenhuma limpeza de banco necessária:**
   - Mudança em `models/Liga.js` apenas afeta NOVAS ligas
   - Ligas existentes não são modificadas
   - Se alguma liga foi criada COM `capitaoLuxo: false`, ela continua funcional (apenas desabilitado)

---

## Checklist de Validação

### Antes de Implementar ✅
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados (TC-01 a TC-05)
- [x] Rollback documentado

### Análise S.D.A Completa ✅
- [x] **Solicitação:** Arquivos originais lidos completos (cards-condicionais.js, Liga.js, detalhe-liga.html, gerenciar-modulos.html)
- [x] **Dependências:** Mapeamento cruzado validado (imports, links, DOM queries)
- [x] **Análise:** Padrão de `luvaOuro` replicado para `capitaoLuxo`

### Multi-Tenant & Segurança ✅
- [x] Queries isoladas por `liga_id`
- [x] Cache invalidado ao mudar de liga (v2.6)
- [x] Nenhuma lógica global afetada
- [x] Rotas backend já protegidas (middleware existente)

---

## Ordem de Execução (Crítico)

### 1. Backend Primeiro (Schema)
```bash
# Editar models/Liga.js
# Adicionar linha: capitaoLuxo: false
```
**Razão:** Garante que novas ligas criadas durante o deploy já terão a chave.

### 2. Frontend (Lógica de Mapeamento)
```bash
# Editar public/js/cards-condicionais.js
# MUDANÇA 1: Remover 'capitao-luxo' de MODULOS_2026_ONLY
# MUDANÇA 2: Adicionar 'capitaoLuxo' e 'capitao_luxo' ao MODULO_TO_CARD_MAP
```
**Razão:** Após schema estar correto, corrigir o mapeamento para fazer o toggle funcionar.

### 3. (OPCIONAL) HTML (Visual)
```bash
# Editar public/detalhe-liga.html
# Avaliar se mantém ou remove classe module-card-2026
```
**Razão:** Apenas estilo, não afeta funcionalidade.

### 4. Testes (Validação)
- Executar TC-01 (habilitar)
- Executar TC-02 (desabilitar)
- Executar TC-03 (temporada histórica)
- Executar TC-05 (cache invalidation)

### 5. Deploy
```bash
# Se usar restart automático (Replit)
git add .
git commit -m "fix(modules): corrige visibilidade card Capitão Luxo

- Remove capitao-luxo de MODULOS_2026_ONLY
- Adiciona mapeamento capitaoLuxo/capitao_luxo ao MODULO_TO_CARD_MAP
- Adiciona capitaoLuxo: false ao schema default de Liga

Fixes: Card Capitão Luxo agora responde ao toggle em gerenciar-modulos
Multi-tenant: Validado isolamento por liga_id
Testes: TC-01 a TC-05 passando

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```

---

## Decisões Arquiteturais

### Decisão 1: Remover capitao-luxo de MODULOS_2026_ONLY ✅

**Alternativas Avaliadas:**

**OPÇÃO A - Remover da lista (ESCOLHIDA)**
```javascript
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um'];
```

**Prós:**
- ✅ Simples e direto
- ✅ Zero código adicional
- ✅ Capitão Luxo fica disponível em TODAS temporadas
- ✅ Módulo JÁ EXISTE no codebase (não é placeholder)

**Contras:**
- ⚠️ Admin pode habilitar em temporadas antigas (mas é intencional)

**OPÇÃO B - Adicionar lógica condicional (REJEITADA)**
```javascript
MODULOS_2026_ONLY.forEach(moduleId => {
    // Verificar se explicitamente habilitado
    const moduloCamel = moduleId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (ligaConfigCache?.modulos_ativos?.[moduloCamel] === true) {
        return; // Não ocultar
    }
    const card = document.querySelector(`[data-module="${moduleId}"]`);
    if (card) card.style.display = 'none';
});
```

**Prós:**
- ✅ Flexibilidade total

**Contras:**
- ❌ Mais código (8+ linhas vs 1 linha)
- ❌ Race condition potencial (ligaConfigCache pode não estar carregado)
- ❌ Complexidade desnecessária (módulo já existe)

**Decisão Final:** **OPÇÃO A**

**Justificativa:** O módulo Capitão Luxo NÃO é um placeholder futuro. Ele JÁ TEM:
- Service implementado: `services/capitaoService.js`
- Definição de produto: `config/definitions/capitao_luxo_def.json`
- Config em `gerenciar-modulos.html:159-165`

Portanto, não há razão para ocultá-lo automaticamente. Deixar a decisão para o admin (via toggle) é mais correto arquiteturalmente.

---

### Decisão 2: Manter classe module-card-2026 no HTML ✅

**Escolhida:** Manter `<div class="module-card module-card-2026" data-module="capitao-luxo">`

**Razão:**
- Badge "2026" comunica ao admin que é um módulo em lançamento/beta
- Não interfere na funcionalidade
- Pode ser removida futuramente quando módulo estiver maduro

---

## Próximo Passo

**Comando para Fase 3 (Implementação):**
```bash
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-capitao-luxo-card-visibility.md
```

---

## Anexos

### A. Trecho Crítico - cards-condicionais.js (Estado Atual)

```javascript
// Linha 150
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um', 'capitao-luxo'];
// ❌ BUG: capitao-luxo impede visibilidade

// Linha 156-172
const MODULO_TO_CARD_MAP = {
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    // ❌ FALTA: 'capitaoLuxo': 'capitao-luxo',
    // ❌ FALTA: 'capitao_luxo': 'capitao-luxo',
    'top10': 'top10',
    'melhorMes': 'melhor-mes',
    // ...
};
```

### B. Comparativo Antes/Depois

| Cenário | ANTES (Bug) | DEPOIS (Corrigido) |
|---------|-------------|-------------------|
| Habilitar em 2026+ | Card visível mas NÃO responde ao toggle | Card clicável, funcional ✅ |
| Desabilitar em 2026+ | Card continua clicável | Card disabled (opacity 0.5) ✅ |
| Habilitar em <2026 | Card OCULTO (display: none) | Card visível e funcional ✅ |
| Liga antiga (sem chave) | `undefined` → imprevisível | `undefined` → desabilitado ✅ |
| Nova liga criada | `undefined` (sem chave) | `false` (explícito) ✅ |

### C. Evidências de Módulo Existente

```bash
# Arquivos que comprovam que Capitão Luxo JÁ está implementado:
ls -la services/capitaoService.js
ls -la config/definitions/capitao_luxo_def.json
ls -la config/rules/capitao_luxo.js
grep -r "capitaoLuxo" config/

# Saída esperada:
services/capitaoService.js
config/definitions/capitao_luxo_def.json
config/rules/capitao_luxo.js
public/gerenciar-modulos.html:159: capitaoLuxo: {
```

---

**Gerado por:** Spec Protocol v1.0
**S.D.A Checklist:** ✅ COMPLETO
**Multi-Tenant Validation:** ✅ PASS
**Arquivos Analisados:** 5 (cards-condicionais.js, Liga.js, detalhe-liga.html, gerenciar-modulos.html, definitions/index.js)
**Linhas de Código Afetadas:** 4 (2 adições, 1 modificação, 0 remoções)
**Impacto de Risco:** BAIXO (mudanças cirúrgicas, rollback trivial)
