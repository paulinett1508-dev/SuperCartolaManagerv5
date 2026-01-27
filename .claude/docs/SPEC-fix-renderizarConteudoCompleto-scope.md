# SPEC - Fix ReferenceError renderizarConteudoCompleto

**Data:** 2026-01-27
**Baseado em:** PRD-fix-renderizarConteudoCompleto-scope.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Corrigir `ReferenceError: renderizarConteudoCompleto is not defined` adicionando prefixo `window.` nas duas chamadas da funcao (linhas 303 e 1217). A funcao ja esta definida no `window` (linha 539) mas as chamadas usam nome "nu", causando erro de escopo em ES6 Modules.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. participante-extrato-ui.js - Correcao de Escopo

**Path:** `public/participante/js/modules/participante-extrato-ui.js`
**Tipo:** Modificacao
**Impacto:** Alto (funcionalidade quebrada)
**Dependentes:** Nenhum externo (chamadas sao internas)

#### Mudancas Cirurgicas:

**Linha 303: MODIFICAR chamada em renderizarExtratoParticipante**
```javascript
// ANTES:
        renderizarConteudoCompleto(container, extrato);

// DEPOIS:
        window.renderizarConteudoCompleto(container, extrato);
```
**Motivo:** Funcao definida em `window.renderizarConteudoCompleto` (linha 539) nao e visivel como nome nu em ES6 Module scope. Prefixar com `window.` resolve o escopo.

**Linha 1217: MODIFICAR chamada em window.refreshAcertosBottomSheet**
```javascript
// ANTES:
            renderizarConteudoCompleto(container, window.extratoAtual);

// DEPOIS:
            window.renderizarConteudoCompleto(container, window.extratoAtual);
```
**Motivo:** Mesmo problema de escopo. Embora esteja dentro de `window.refreshAcertosBottomSheet`, o corpo da funcao ainda executa no escopo do modulo ES6.

---

## Mapa de Dependencias

```
participante-extrato-ui.js (MODIFICAR)
    |
    |-- INTERNO: renderizarExtratoParticipante() [linha 303]
    |            Chamado por: participante-extrato.js via import dinamico
    |
    |-- INTERNO: window.refreshAcertosBottomSheet() [linha 1217]
    |            Chamado por: onclick em botao HTML (linha 1037)
    |
    +-- window.renderizarConteudoCompleto [linha 539]
         Definicao original - NAO MODIFICAR
```

### Arquivos que importam o modulo (NAO precisam mudanca):
- `participante-extrato.js` - Importa dinamicamente (linhas 417, 724, 1245)
- `participante-navigation.js` - Carrega modulo via navegacao SPA

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Nao afetado - mudanca e apenas de escopo JS, nao de queries
- [x] Nenhuma query MongoDB envolvida

### Autenticacao
- [x] Nao afetado - funcoes internas de renderizacao
- [x] Dados ja validados antes de chegar neste modulo

---

## Casos de Teste

### Teste 1: Participante NAO renovado em pre-temporada
**Setup:** Acessar app como participante que NAO renovou para 2026
**Acao:**
1. Logar no app participante
2. Clicar em "Financeiro" no Quick Bar
3. Observar console do navegador
**Resultado Esperado:**
- Console NAO mostra `ReferenceError`
- Tela de extrato renderiza corretamente com dados de 2025

### Teste 2: Visualizacao de historico 2025
**Setup:** Acessar app como participante renovado
**Acao:**
1. Logar no app participante
2. Clicar em "Financeiro"
3. Selecionar temporada 2025 no seletor
**Resultado Esperado:**
- Tela renderiza dados de 2025
- `renderizarConteudoCompleto` e chamada (nao a versao pre-temporada)

### Teste 3: Refresh de acertos via Bottom Sheet
**Setup:** Estar na tela de extrato com bottom sheet aberto
**Acao:**
1. Abrir bottom sheet de acertos
2. Clicar no botao de refresh (icone sync)
**Resultado Esperado:**
- Dados atualizam sem erro no console
- Bottom sheet reabre automaticamente

### Teste 4: Participante renovado em pre-temporada (regressao)
**Setup:** Acessar app como participante que JA renovou para 2026
**Acao:**
1. Logar no app participante
2. Clicar em "Financeiro"
**Resultado Esperado:**
- Usa `renderizarConteudoRenovadoPreTemporada` (layout especifico)
- Funcionalidade existente NAO quebra

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Cache do navegador pode manter versao antiga - orientar usuarios a fazer hard refresh (Ctrl+Shift+R)

**Nao requer:**
- Restauracao de banco de dados
- Limpeza de cache servidor

---

## Checklist de Validacao

### Antes de Implementar
- [x] Arquivo original lido completamente (partes relevantes)
- [x] Todas as 3 ocorrencias da funcao mapeadas
- [x] Confirmado que NAO ha chamadas externas
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados (minimo)
- [x] Testes planejados
- [x] Rollback documentado

### Apos Implementar
- [ ] Testar cenario 1: Participante NAO renovado
- [ ] Testar cenario 2: Historico 2025
- [ ] Testar cenario 3: Refresh bottom sheet
- [ ] Testar cenario 4: Participante renovado (regressao)

---

## Ordem de Execucao (Critico)

1. **Unico arquivo a modificar:**
   - `public/participante/js/modules/participante-extrato-ui.js`
   - Linha 303: adicionar `window.`
   - Linha 1217: adicionar `window.`

2. **Testes:**
   - Abrir app participante
   - Testar os 4 cenarios documentados
   - Verificar console sem erros

---

## Resumo das Mudancas

| Linha | Antes | Depois |
|-------|-------|--------|
| 303 | `renderizarConteudoCompleto(container, extrato);` | `window.renderizarConteudoCompleto(container, extrato);` |
| 1217 | `renderizarConteudoCompleto(container, window.extratoAtual);` | `window.renderizarConteudoCompleto(container, window.extratoAtual);` |

**Total:** 2 linhas modificadas (adicao de 7 caracteres em cada)

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-fix-renderizarConteudoCompleto-scope.md
```

---

**Gerado por:** Spec Protocol v1.0
**Validado por:** S.D.A Completo
