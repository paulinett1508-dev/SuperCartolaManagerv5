# PRD - Capitão Luxo Card Visibility Bug

**Data:** 2026-01-29
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft - BUG CRÍTICO IDENTIFICADO

---

## Resumo Executivo

O card **Capitão Luxo** em `detalhe-liga.html` NÃO está respondendo à ativação/desativação feita em `gerenciar-modulos.html`. O módulo pode ser habilitado no gerenciador mas o card continua inacessível.

**Root Cause:** Falta de mapeamento do módulo `capitaoLuxo` no sistema de visibilidade condicional de cards (`cards-condicionais.js`).

---

## Contexto e Análise

### Fluxo do Sistema de Módulos

1. **Backend (`Liga.modulos_ativos`):**
   - Armazena estado on/off dos módulos
   - Chaves em **camelCase**: `capitaoLuxo`, `luvaOuro`, `artilheiro`, etc.

2. **API GET `/api/ligas/:id/configuracoes`:**
   - Retorna `modulos_ativos` diretamente do banco
   - Frontend consome via `cards-condicionais.js`

3. **Frontend (`cards-condicionais.js`):**
   - Busca config da liga
   - Mapeia chaves de `modulos_ativos` → `data-module` do HTML
   - Aplica estado visual (disabled/enabled)

4. **HTML (`detalhe-liga.html`):**
   - Card usa `data-module="capitao-luxo"` (kebab-case)

### Arquivos Identificados

**Backend:**
- `models/Liga.js:97-115` - Schema `modulos_ativos` (NÃO inclui capitaoLuxo no default)
- `controllers/ligaController.js:872-920` - Endpoint `/configuracoes`
- `routes/ligas.js` - Rotas de módulos ativos

**Frontend:**
- `public/js/cards-condicionais.js:150-172` - **BUG AQUI**: Mapeamento incompleto
- `public/gerenciar-modulos.html:159-165` - Config correta (backendId: 'capitao_luxo')
- `public/detalhe-liga.html:648-658` - Card HTML (data-module="capitao-luxo")

### Root Cause Detalhado

#### 1. Capitão Luxo na lista MODULOS_2026_ONLY
```javascript
// cards-condicionais.js:150
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um', 'capitao-luxo'];
```

**Problema:** Em temporadas históricas (<2026), o card é SEMPRE ocultado (linha 213-219).
**Consequência:** Mesmo habilitado, fica invisível em 2025.

#### 2. AUSÊNCIA no MODULO_TO_CARD_MAP
```javascript
// cards-condicionais.js:156-172
const MODULO_TO_CARD_MAP = {
    'artilheiro': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    // ... FALTA capitaoLuxo → capitao-luxo
};
```

**Problema:** Quando `modulos_ativos.capitaoLuxo = true`, o sistema NÃO sabe mapear para `data-module="capitao-luxo"`.

**Consequência:** Em temporada 2026+, quando não há restrição automática (linha 275-278), o card continua visível MAS não responde ao toggle porque:
- `aplicarConfiguracaoCards()` retorna early (linha 277)
- Nenhum processamento de desabilitação ocorre
- Card fica com estado padrão (visível mas não clicável)

#### 3. AUSÊNCIA no Schema Default de Liga
```javascript
// models/Liga.js:97-114
modulos_ativos: {
    type: Object,
    default: {
        // ...
        luvaOuro: false,
        campinho: false,
        dicas: false,
        // FALTA: capitaoLuxo: false
    }
}
```

**Problema:** Novas ligas criadas NÃO têm a chave `capitaoLuxo`.
**Consequência:** `modulos_ativos.capitaoLuxo === undefined` → comportamento imprevisível.

### Dependências Mapeadas

**cards-condicionais.js importado por:**
- `detalhe-liga.html:1071` - `<script src="js/cards-condicionais.js"></script>`

**cards-condicionais.js depende de:**
- API `/api/ligas/:id/configuracoes` (controller: `ligaController.js:872`)
- DOM `[data-module="capitao-luxo"]` (detalhe-liga.html:648)

**gerenciar-modulos.html depende de:**
- API `/api/ligas/:id/modulos-ativos` (controller: `ligaController.js:808, 832`)
- `MODULOS_CONFIG.capitaoLuxo` (gerenciar-modulos.html:159)

### Padrões Existentes

**Módulos funcionando corretamente:**
- **Luva de Ouro:**
  - Schema: `luvaOuro: false` (Liga.js:111)
  - Map: `'luvaOuro': 'luva-de-ouro'` (cards-condicionais.js:160)
  - HTML: `data-module="luva-de-ouro"` (detalhe-liga.html:569)
  - Backend: `backendId: 'luva_ouro'` (gerenciar-modulos.html:157)

- **Artilheiro:**
  - Schema: `artilheiro: false` (Liga.js:110)
  - Map: `'artilheiro': 'artilheiro-campeao'` (cards-condicionais.js:158)
  - HTML: `data-module="artilheiro-campeao"` (detalhe-liga.html:581)
  - Backend: `backendId: 'artilheiro'` (gerenciar-modulos.html:149)

---

## Solução Proposta

### Abordagem 1: Correção Cirúrgica (RECOMENDADO)

**Objetivo:** Adicionar suporte completo ao módulo Capitão Luxo sem quebrar lógica existente.

**Mudanças:**

1. **Adicionar mapeamento em `cards-condicionais.js`**
2. **Adicionar chave default em `models/Liga.js`**
3. **Remover de MODULOS_2026_ONLY** (ou adicionar lógica condicional)

### Arquivos a Modificar

#### 1. `public/js/cards-condicionais.js`
**Linha 156-172:** Adicionar ao `MODULO_TO_CARD_MAP`:
```javascript
const MODULO_TO_CARD_MAP = {
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    'capitaoLuxo': 'capitao-luxo',  // ✅ ADICIONAR
    'capitao_luxo': 'capitao-luxo',  // ✅ ADICIONAR (snake_case fallback)
    'top10': 'top10',
    // ...
};
```

**Linha 150:** Adicionar lógica condicional em `MODULOS_2026_ONLY`:
```javascript
// OPÇÃO A: Remover completamente de MODULOS_2026_ONLY
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um']; // Remove capitao-luxo

// OPÇÃO B: Manter mas adicionar exceção no processamento (linha 213-219)
// Se módulo estiver EXPLICITAMENTE habilitado em modulos_ativos, não ocultar
```

#### 2. `models/Liga.js`
**Linha 97-114:** Adicionar ao schema default:
```javascript
modulos_ativos: {
    type: Object,
    default: {
        // Módulos BASE
        extrato: true,
        ranking: true,
        rodadas: true,
        historico: true,
        // Módulos OPCIONAIS
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

#### 3. (OPCIONAL) `public/detalhe-liga.html`
**Se necessário**, remover classe `module-card-2026` do card Capitão Luxo:
```html
<!-- ANTES -->
<div class="module-card module-card-2026" data-module="capitao-luxo">

<!-- DEPOIS (se quiser sempre visível) -->
<div class="module-card" data-module="capitao-luxo">
```

**IMPACTO:** Se manter `module-card-2026`, o card terá visual diferenciado mas continuará funcional.

---

## Regras de Negócio

### RN-01: Visibilidade de Módulos 2026
- Módulos marcados como "2026" SÃO ocultados em temporadas históricas (<2026)
- EXCEÇÃO: Se explicitamente habilitado em `modulos_ativos`, deve ficar visível

### RN-02: Ativação/Desativação
- Admin pode ativar/desativar qualquer módulo OPCIONAL via `gerenciar-modulos.html`
- Mudanças devem refletir IMEDIATAMENTE na visualização de cards
- Módulos BASE (extrato, ranking, rodadas) NÃO podem ser desativados

### RN-03: Multi-Tenant
- Cada liga TEM configuração independente de `modulos_ativos`
- NÃO usar cache global (validar isolamento liga_id)

---

## Riscos e Considerações

### Impactos Previstos

**Positivo:**
- ✅ Capitão Luxo passa a responder ao toggle
- ✅ Consistência com outros módulos (Luva de Ouro, Artilheiro)
- ✅ Zero impacto em ligas existentes (default: false)

**Atenção:**
- ⚠️ Ligas criadas ANTES da correção não terão `capitaoLuxo` no objeto → `undefined`
- ⚠️ Comportamento com `undefined`: JavaScript trata como falsy → card desabilitado (ok)
- ⚠️ Se remover de `MODULOS_2026_ONLY`, card fica visível em temporadas <2026 (decidir se ok)

**Risco:**
- ❌ Se OPÇÃO B (exceção condicional) mal implementada, pode criar race condition
- ❌ Cache de `cards-condicionais.js` pode causar confusão (TTL: 5min)

### Multi-Tenant
- ✅ Validado: `fetchLigaConfig(ligaId)` isola por liga_id
- ✅ Cache invalidado ao mudar de liga (v2.6)

---

## Testes Necessários

### Cenários de Teste

#### TC-01: Ativar Capitão Luxo (Temporada 2026)
1. Criar liga com temporada 2026
2. Acessar `gerenciar-modulos.html?id=[ligaId]`
3. Ativar toggle de "Capitão de Luxo"
4. Salvar configurações
5. Voltar para `detalhe-liga.html?id=[ligaId]`
6. **Esperado:** Card "Capitão Luxo" clicável e sem estado disabled

#### TC-02: Desativar Capitão Luxo (Temporada 2026)
1. Repetir TC-01 mas DESATIVAR o toggle
2. **Esperado:** Card "Capitão Luxo" com opacity 0.5 e pointer-events: none

#### TC-03: Temporada Histórica (<2026) - Capitão Luxo Habilitado
1. Criar liga com temporada 2025
2. Via MongoDB, setar `modulos_ativos.capitaoLuxo = true`
3. Acessar `detalhe-liga.html?id=[ligaId]&temporada=2025`
4. **Esperado (OPÇÃO A):** Card visível e funcional
5. **Esperado (OPÇÃO B):** Card oculto (MODULOS_2026_ONLY ainda ativo)

#### TC-04: Liga Sem capitaoLuxo no Schema
1. Liga criada antes da correção (sem chave `capitaoLuxo`)
2. Acessar `detalhe-liga.html?id=[ligaId]`
3. **Esperado:** Card desabilitado (undefined = false)

#### TC-05: Navegação Entre Ligas (Cache Invalidation)
1. Liga A: Capitão Luxo habilitado
2. Liga B: Capitão Luxo desabilitado
3. Navegar A → B via sidebar
4. **Esperado:** Cache invalidado (v2.6), estado correto em cada liga

---

## Decisões Arquiteturais

### Decisão 1: MODULOS_2026_ONLY - Remover ou Excetuar?

**OPÇÃO A - Remover capitao-luxo da lista (SIMPLES)**
```javascript
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um'];
```
**Prós:** Capitão Luxo fica disponível em TODAS temporadas
**Contras:** Se o módulo realmente não existia em <2026, pode confundir admins

**OPÇÃO B - Adicionar lógica condicional (COMPLEXO)**
```javascript
// Em ocultarModulosInexistentesEmHistorico() linha 213-219
MODULOS_2026_ONLY.forEach(moduleId => {
    // ✅ Verificar se explicitamente habilitado antes de ocultar
    if (ligaConfigCache?.modulos_ativos?.[moduloCamel] === true) {
        return; // Não ocultar se admin habilitou
    }
    const card = document.querySelector(`[data-module="${moduleId}"]`);
    if (card) card.style.display = 'none';
});
```
**Prós:** Flexibilidade total
**Contras:** Mais código, possível race condition

**RECOMENDAÇÃO:** **OPÇÃO A** - Remover da lista. Capitão Luxo já existe no codebase (`participante-capitao.js`), logo pode ser habilitado.

---

## Próximos Passos

1. **Validar PRD com stakeholder/user**
2. **Decidir OPÇÃO A vs OPÇÃO B** (MODULOS_2026_ONLY)
3. **Gerar Spec:** Executar `/spec .claude/docs/PRD-capitao-luxo-card-visibility.md`
4. **Implementar:** Executar `/code` com Spec gerado
5. **Testar:** Executar TC-01 a TC-05
6. **Migração (opcional):** Script para adicionar `capitaoLuxo: false` em ligas antigas

---

## Anexos

### Trecho Crítico - cards-condicionais.js:150-172
```javascript
const MODULOS_2026_ONLY = ['tiro-certo', 'bolao-copa', 'resta-um', 'capitao-luxo'];
// ❌ BUG: capitao-luxo aqui impede visibilidade em <2026

const MODULO_TO_CARD_MAP = {
    'artilheiro': 'artilheiro-campeao',
    'artilheiroCampeao': 'artilheiro-campeao',
    'luvaOuro': 'luva-de-ouro',
    'luva_ouro': 'luva-de-ouro',
    // ❌ FALTA: 'capitaoLuxo': 'capitao-luxo',
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

### Comportamento Esperado vs Atual

| Ação | Comportamento Atual | Comportamento Esperado |
|------|---------------------|------------------------|
| Ativar em 2026 | Card visível mas não responde | Card clicável, navegável |
| Desativar em 2026 | Card continua clicável | Card disabled (opacity 0.5) |
| Ativar em 2025 | Card oculto (MODULOS_2026_ONLY) | Card visível E funcional |
| Liga antiga | `undefined` → imprevisível | `false` → disabled |

---

**Gerado por:** Pesquisa Protocol v1.0
**Verificação Multi-Tenant:** ✅ PASS
**Arquivos Validados:** 5 (Liga.js, ligaController.js, cards-condicionais.js, detalhe-liga.html, gerenciar-modulos.html)
