# PRD - Anomalias UI/Temporadas (Sidebar, Módulos, Telas)

**Data:** 24/01/2026
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O usuário reportou três problemas inter-relacionados:
1. **Erro 404** em `/api/mercado/status` - URL incorreta no frontend
2. **Telas se sobrepondo** - Possível conflito de CSS/JS na navegação entre módulos
3. **Anomalias entre sidebar, módulos e temporadas** - Múltiplas fontes de carregamento de ligas

---

## Contexto e Análise

### 1. Erro 404 em `/api/mercado/status`

**Causa Raiz Identificada:**
- Frontend chama: `/api/mercado/status`
- Backend expõe: `/api/cartola/mercado/status` (prefixo `cartola`)

**Arquivos Afetados:**
```
FRONTEND (chamam URL errada):
- public/js/detalhe-liga-orquestrador.js:25
- public/participante/js/modules/participante-home.js:336

BACKEND (define rota correta):
- routes/cartola-proxy.js:76 (GET /mercado/status)
- index.js:358 (app.use("/api/cartola", cartolaProxyRoutes))
```

**Impacto:**
- `detectarTemporadaHistorica()` falha silenciosamente
- `window.temporadaAtual` e `window.isTemporadaHistorica` não são definidos
- Badge de temporada histórica não aparece
- Modo read-only não é aplicado

---

### 2. Telas se Sobrepondo

**Possíveis Causas:**
1. **Conflito CSS:** Múltiplos arquivos definem estilos para `#main-screen` e `#secondary-screen`
   - `public/detalhe-liga.css:423-460`
   - `public/css/modules/fluxo-financeiro.css:3069-3086`

2. **Conflito de `voltarParaCards`:**
   - `cards-condicionais.js:213` define `window.voltarParaCards`
   - `detalhe-liga-orquestrador.js:891` sobrescreve com sua própria versão
   - Ordem de carregamento não determinística

3. **Transform/Z-Index:**
   - CSS força `transform: none !important` em múltiplos lugares
   - Isso pode conflitar com animações de transição

**Arquivos de CSS Críticos:**
```
public/detalhe-liga.css - Navegação entre telas
public/css/modules/fluxo-financeiro.css - Fix sticky header
public/css/modules/dashboard-redesign.css - Sidebar colapsável
```

---

### 3. Anomalias Sidebar/Temporadas

**Múltiplas Fontes de Carregamento de Ligas:**

| Arquivo | Função | Onde Carrega |
|---------|--------|--------------|
| `layout.html:252` | `carregarLigasLayout()` | Sidebar (grupos temporada) |
| `sidebar-menu.js:30` | `carregarLigasSidebar()` | Sidebar (lista simples) |
| `detalhe-liga-orquestrador.js:707` | `carregarLigasSidebar()` | Sidebar (duplicado) |

**Problema:** Três funções diferentes tentam renderizar ligas na sidebar:
- `layout.html` usa grupos por temporada (v3.0)
- `sidebar-menu.js` usa lista flat sem temporadas
- `orquestrador` duplica lógica de `sidebar-menu.js`

**Conflito de Timing:**
```javascript
// layout.html
new NavigationSystem(); // Chama carregarLigasLayout()

// detalhe-liga-orquestrador.js
setTimeout(() => this.carregarLigasSidebar(), 100); // Sobrescreve?
```

---

## Dependências Mapeadas

```
detalhe-liga.html
├── detalhe-liga.css (estilos de navegação)
├── detalhe-liga-orquestrador.js
│   ├── detectarTemporadaHistorica() → /api/mercado/status (404!)
│   ├── loadLayout() → layout.html
│   ├── carregarLigasSidebar() → conflita com layout.html
│   └── voltarParaCards() → conflita com cards-condicionais.js
├── layout.html
│   ├── carregarLigasLayout() → renderiza grupos temporada
│   └── NavigationSystem → inicializa accordions
├── sidebar-menu.js
│   └── carregarLigasSidebar() → lista flat (legado?)
└── cards-condicionais.js
    └── voltarParaCards() → função global
```

---

## Solução Proposta

### FIX 1: Corrigir URL da API Mercado/Status

**Opção A (Recomendada):** Atualizar frontend para usar URL correta
```javascript
// detalhe-liga-orquestrador.js:25
const response = await fetch('/api/cartola/mercado/status');
```

**Opção B:** Criar alias no backend (mais trabalho, menos impacto)

---

### FIX 2: Unificar Carregamento de Ligas na Sidebar

**Problema:** Três funções tentam renderizar a mesma `#ligasList`

**Solução:**
1. Remover `carregarLigasSidebar()` do orquestrador
2. Manter apenas `carregarLigasLayout()` do `layout.html`
3. Atualizar `sidebar-menu.js` para não conflitar

---

### FIX 3: Resolver Conflito de `voltarParaCards`

**Problema:** Duas definições globais

**Solução:**
1. Manter apenas uma fonte da verdade (orquestrador)
2. Remover definição duplicada em `cards-condicionais.js`
3. Ou usar namespace: `window.orquestrador.voltarParaCards()`

---

### FIX 4: CSS - Resolver Z-Index e Transforms

**Verificar:**
- Remover duplicações de `transform: none !important`
- Garantir z-index consistente entre modais e overlays
- Revisar animações de transição entre telas

---

## Arquivos a Modificar

| Arquivo | Mudança | Prioridade |
|---------|---------|------------|
| `public/js/detalhe-liga-orquestrador.js` | Corrigir URL API mercado | ALTA |
| `public/js/detalhe-liga-orquestrador.js` | Remover `carregarLigasSidebar()` | MÉDIA |
| `public/js/cards-condicionais.js` | Remover `voltarParaCards` duplicado | MÉDIA |
| `public/participante/js/modules/participante-home.js` | Corrigir URL API | ALTA |
| CSS (múltiplos) | Auditar z-index e transforms | BAIXA |

---

## Riscos e Considerações

### Impactos Previstos
- **Positivo:** Badge de temporada histórica volta a funcionar
- **Positivo:** Sidebar não renderiza duas vezes
- **Atenção:** Mudança na URL pode afetar outros módulos
- **Risco:** Remover função global pode quebrar módulos que dependem dela

### Multi-Tenant
- [x] Validado: Liga_id é preservado no contexto

---

## Testes Necessários

### Cenários de Teste

1. **API Mercado:**
   - Acessar `detalhe-liga.html?id=xxx&temporada=2025`
   - Console não deve mostrar 404
   - Badge "Temporada 2025" deve aparecer

2. **Sidebar:**
   - Navegar entre ligas
   - Grupos de temporada devem expandir/colapsar
   - Não deve haver "piscar" de conteúdo

3. **Navegação entre Telas:**
   - Clicar em card (Ranking, Rodadas, etc.)
   - Tela secundária deve aparecer
   - Clicar "Voltar" deve mostrar cards
   - Não deve haver sobreposição

4. **Conflito CSS:**
   - Testar sticky header no Fluxo Financeiro
   - Verificar se modais abrem corretamente
   - Testar em mobile (viewport pequeno)

---

## Próximos Passos

1. ✅ PRD gerado
2. Validar com usuário
3. Executar `/spec` com este PRD
4. Implementar correções em ordem de prioridade

---

**Gerado por:** Pesquisa Protocol v1.0
