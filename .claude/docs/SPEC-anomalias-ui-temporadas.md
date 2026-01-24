# SPEC - Anomalias UI/Temporadas (Correcao API + Sidebar)

**Data:** 24/01/2026
**Baseado em:** PRD-anomalias-ui-temporadas.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Corrigir 3 problemas inter-relacionados:
1. **FIX-1 (ALTA):** URL incorreta `/api/mercado/status` em 2 arquivos do frontend (deve ser `/api/cartola/mercado/status`)
2. **FIX-2 (MEDIA):** Remover `carregarLigasSidebar()` duplicado no orquestrador - `layout.html` ja tem `carregarLigasLayout()` que e a fonte unica
3. **FIX-3 (MEDIA):** Remover `voltarParaCards()` duplicado - orquestrador define via `setupGlobalFunctions()`, cards-condicionais sobrescreve

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. detalhe-liga-orquestrador.js - FIX-1 e FIX-2

**Path:** `public/js/detalhe-liga-orquestrador.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** Todas as paginas que usam detalhe-liga.html

#### Mudancas Cirurgicas:

**Linha 25: MODIFICAR URL da API**
```javascript
// ANTES:
const response = await fetch('/api/mercado/status');

// DEPOIS:
const response = await fetch('/api/cartola/mercado/status');
```
**Motivo:** Rota backend esta em `/api/cartola/mercado/status` (routes/cartola-proxy.js:76 + index.js:358). URL sem prefixo `cartola` retorna 404.

---

**Linhas 679 e 707-756: REMOVER carregarLigasSidebar()**

O metodo `carregarLigasSidebar()` (linhas 707-756) deve ser REMOVIDO, pois `layout.html` ja possui `carregarLigasLayout()` que:
- Agrupa ligas por temporada (v3.0)
- Suporta multi-temporada com badges "Historico"
- E a fonte unica de verdade para renderizacao da sidebar

**Linha 679: REMOVER chamada**
```javascript
// ANTES:
setTimeout(() => this.carregarLigasSidebar(), 100);

// DEPOIS:
// Ligas ja sao carregadas pelo layout.html via NavigationSystem
```

**Linhas 707-756: REMOVER metodo inteiro**
```javascript
// REMOVER COMPLETAMENTE:
async carregarLigasSidebar() {
    const ligasList = document.getElementById("ligasList");
    // ... todas as 49 linhas do metodo
}
```
**Motivo:** Conflito com `carregarLigasLayout()` do layout.html. O orquestrador chamava `carregarLigasSidebar()` 100ms apos carregar o layout, sobrescrevendo a lista de ligas agrupadas por temporada.

---

### 2. participante-home.js - FIX-1

**Path:** `public/participante/js/modules/participante-home.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** Tela Home do App Participante

#### Mudancas Cirurgicas:

**Linha 336: MODIFICAR URL da API**
```javascript
// ANTES:
const response = await fetch('/api/mercado/status');

// DEPOIS:
const response = await fetch('/api/cartola/mercado/status');
```
**Motivo:** Mesma correcao do orquestrador. A funcao `buscarStatusMercado()` precisa da URL correta.

---

### 3. cards-condicionais.js - FIX-3

**Path:** `public/js/cards-condicionais.js`
**Tipo:** Modificacao
**Impacto:** Medio
**Dependentes:** Navegacao de modulos em detalhe-liga.html

#### Mudancas Cirurgicas:

**Linhas 213-256: REFATORAR voltarParaCards()**

O problema: `cards-condicionais.js` define `window.voltarParaCards` na linha 255, e depois `detalhe-liga-orquestrador.js` sobrescreve na linha 891 via `setupGlobalFunctions()`. A ordem de execucao nao e deterministica.

**Solucao:** Delegar para o orquestrador se ele existir.

```javascript
// ANTES (linhas 213-256):
function voltarParaCards() {
    console.log("[CARDS-CONDICIONAIS] Executando voltarParaCards universal...");
    // ... 43 linhas de implementacao
}

// DEPOIS:
function voltarParaCards() {
    // Delegar para orquestrador se disponivel (fonte unica)
    if (window.orquestrador?.voltarParaCards) {
        return window.orquestrador.voltarParaCards();
    }

    // Fallback basico (caso orquestrador nao carregue)
    console.log("[CARDS-CONDICIONAIS] voltarParaCards fallback...");

    const mainScreen = document.getElementById("main-screen");
    const secondaryScreen = document.getElementById("secondary-screen");

    if (secondaryScreen) {
        secondaryScreen.classList.remove("active");
        secondaryScreen.style.display = "none";
    }

    if (mainScreen) {
        mainScreen.style.display = "block";
    }
}
```
**Motivo:** Evitar conflito de definicoes. Orquestrador e a autoridade, cards-condicionais serve como fallback.

---

## Mapa de Dependencias

```
detalhe-liga.html
    |
    +-> detalhe-liga-orquestrador.js
    |       |-> detectarTemporadaHistorica()
    |       |       --> /api/cartola/mercado/status (FIX-1)
    |       |
    |       |-> loadLayout() --> layout.html
    |       |       --> carregarLigasLayout() (FONTE UNICA)
    |       |       --> NavigationSystem
    |       |
    |       |-> carregarLigasSidebar() [REMOVER - FIX-2]
    |       |
    |       +-> setupGlobalFunctions()
    |               --> window.voltarParaCards (AUTORIDADE)
    |
    +-> cards-condicionais.js
            |-> voltarParaCards() [DELEGAR - FIX-3]
            +-> window.voltarParaCards (FALLBACK)

participante/index.html
    |
    +-> participante-home.js
            --> buscarStatusMercado()
                    --> /api/cartola/mercado/status (FIX-1)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Nenhuma query de banco afetada
- [x] Apenas correcao de URLs e remocao de duplicatas

### Autenticacao
- [x] APIs de mercado sao publicas (nao requerem auth)
- [x] Sem mudanca em rotas protegidas

---

## Casos de Teste

### Teste 1: API Mercado (FIX-1)
**Setup:** Acessar `detalhe-liga.html?id=xxx&temporada=2025`
**Acao:** Observar console do navegador
**Resultado Esperado:**
- Nao deve haver erro 404 para `/api/mercado/status`
- Badge "Temporada 2025" deve aparecer (se for historico)
- Console: `[ORQUESTRADOR] Modo historico: Temporada 2025`

### Teste 2: Sidebar Unificada (FIX-2)
**Setup:** Acessar `detalhe-liga.html?id=xxx`
**Acao:** Observar sidebar de ligas
**Resultado Esperado:**
- Ligas agrupadas por temporada (2026, 2025, etc.)
- Badges "Historico" aparecem corretamente
- Nao deve haver "flash" de conteudo (renderiza uma vez so)

### Teste 3: Navegacao Voltar (FIX-3)
**Setup:** Acessar `detalhe-liga.html`, clicar em qualquer card (ex: Ranking)
**Acao:** Clicar em "Voltar aos Modulos" no header
**Resultado Esperado:**
- Tela secundaria desaparece
- Tela principal com cards reaparece
- Console: `[ORQUESTRADOR] voltarParaCards executado` (nao cards-condicionais)

### Teste 4: App Participante (FIX-1)
**Setup:** Acessar app participante (participante/index.html)
**Acao:** Carregar Home
**Resultado Esperado:**
- FAB do Mercado mostra status correto (Aberto/Fechado)
- Timer de fechamento funciona
- Nao deve haver erro 404 no console

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
```bash
git revert [hash-do-commit]
```

**Arquivos Afetados:**
- `public/js/detalhe-liga-orquestrador.js`
- `public/participante/js/modules/participante-home.js`
- `public/js/cards-condicionais.js`

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

---

## Ordem de Execucao (Critico)

1. **FIX-1a:** `detalhe-liga-orquestrador.js` linha 25 (URL API)
2. **FIX-1b:** `participante-home.js` linha 336 (URL API)
3. **FIX-2:** `detalhe-liga-orquestrador.js` remover linhas 679 e 707-756 (sidebar duplicada)
4. **FIX-3:** `cards-condicionais.js` refatorar linhas 213-256 (voltar delegado)

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-anomalias-ui-temporadas.md
```

---

**Gerado por:** Spec Protocol v1.0 (High Senior Edition)
