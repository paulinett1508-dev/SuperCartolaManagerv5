# PRD: Fix ReferenceError renderizarConteudoCompleto

## Resumo Executivo

**Bug Crítico:** `ReferenceError: renderizarConteudoCompleto is not defined`

**Impacto:** App do participante quebra ao acessar módulo Financeiro/Extrato

**Causa Raiz:** Incompatibilidade de escopo em ES6 Module - função definida no `window` mas chamada como nome "nu" dentro do módulo.

---

## Análise Técnica

### Arquivo Afetado
`public/participante/js/modules/participante-extrato-ui.js`

### Problema de Escopo ES6

Em ES6 Modules, o escopo é **isolado**. Quando uma função é definida como:
```javascript
window.minhaFuncao = function() {...}
```

E chamada como:
```javascript
minhaFuncao(); // ❌ ReferenceError - não existe no escopo do módulo
```

O JavaScript busca `minhaFuncao` no escopo do módulo PRIMEIRO, não encontra, e lança erro.

### Linhas do Bug

| Linha | Código | Status |
|-------|--------|--------|
| 303 | `renderizarConteudoCompleto(container, extrato)` | ❌ Chamada sem `window.` |
| 539 | `window.renderizarConteudoCompleto = function...` | Definição correta |
| 1217 | `renderizarConteudoCompleto(container, window.extratoAtual)` | ❌ Chamada sem `window.` |

### Comparação com Função que Funciona

```javascript
// Linha 321 - FUNCIONA (escopo do módulo)
function renderizarConteudoRenovadoPreTemporada(container, extrato) {...}

// Linha 301 - FUNCIONA (chama no mesmo escopo)
renderizarConteudoRenovadoPreTemporada(container, extrato);
```

---

## Solução Proposta

### Opção A: Prefixar chamadas com `window.` (Mínimo Impacto)

```javascript
// Linha 303
window.renderizarConteudoCompleto(container, extrato);

// Linha 1217
window.renderizarConteudoCompleto(container, window.extratoAtual);
```

**Prós:** Mudança cirúrgica, 2 linhas
**Contras:** Inconsistente com outras funções do módulo

### Opção B: Definir função no escopo do módulo (Recomendada)

```javascript
// Linha 539 - mudar de:
window.renderizarConteudoCompleto = function renderizarConteudoCompleto(container, extrato) {

// Para:
function renderizarConteudoCompleto(container, extrato) {
```

E adicionar export se necessário para acesso externo.

**Prós:** Consistente com padrão do arquivo, escopo correto
**Contras:** Verificar se função é chamada de fora do módulo

### Opção C: Híbrida (Mais Segura)

```javascript
// Definir no escopo do módulo E expor no window
function renderizarConteudoCompleto(container, extrato) {...}
window.renderizarConteudoCompleto = renderizarConteudoCompleto;
```

**Prós:** Funciona em ambos os contextos
**Contras:** Código duplicado

---

## Decisão: Opção A

Justificativa:
1. Mudança mínima (2 linhas)
2. Mantém compatibilidade com chamadas externas (linha 1217 está dentro de `window.refreshAcertosBottomSheet`)
3. Resolve o bug imediatamente
4. Padrão já usado para outras funções no arquivo (`window.renderizarGraficoPreTemporada`)

---

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `participante-extrato-ui.js` | 303 | Prefixar com `window.` |
| `participante-extrato-ui.js` | 1217 | Prefixar com `window.` |

---

## Verificação Pós-Fix

### Teste Manual
1. Acessar app participante como membro da liga "Os Fuleros"
2. Clicar em "Financeiro" no Quick Bar
3. Console NÃO deve mostrar `ReferenceError`
4. Tela de extrato deve renderizar corretamente

### Cenários de Teste
- [ ] Participante renovado em pré-temporada (usa `renderizarConteudoRenovadoPreTemporada`)
- [ ] Participante NÃO renovado em pré-temporada (usa `renderizarConteudoCompleto`) ← BUG AQUI
- [ ] Visualização de histórico 2025 (usa `renderizarConteudoCompleto`)
- [ ] Refresh de acertos via Bottom Sheet (usa `renderizarConteudoCompleto`)

---

## Impactos

### Diretos
- Módulo Extrato/Financeiro do app participante

### Indiretos
- Nenhum - mudança isolada de prefixo

### Riscos
- Baixo - apenas adiciona prefixo `window.` a chamadas existentes

---

## Dependências Mapeadas (S.D.A)

### Quem chama `participante-extrato-ui.js`?
- `participante-extrato.js` - importa e chama `renderizarExtratoParticipante`
- `participante-navigation.js` - carrega módulo dinamicamente

### Quem chama `renderizarConteudoCompleto`?
- Linha 303: dentro de `renderizarExtratoParticipante` (export)
- Linha 1217: dentro de `window.refreshAcertosBottomSheet`

---

## Timeline

- **PRD:** ✅ Completo
- **SPEC:** Próxima fase
- **CODE:** Após aprovação SPEC

---

**Autor:** Workflow Master
**Data:** 2026-01-27
**Versão:** 1.0
