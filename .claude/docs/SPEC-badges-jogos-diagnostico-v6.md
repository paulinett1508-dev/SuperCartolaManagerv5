# SPEC - Diagnóstico e Correção Badges Jogos v6.0

**Data:** 2026-01-18
**Baseado em:** PRD-badges-jogos-diagnostico-v6.md
**Status:** Especificação Técnica

---

## Resumo da Implementação

O diagnóstico completo confirmou que **tanto backend (v3.3) quanto frontend (v5.1) estão implementados corretamente**. O problema é exclusivamente de **cache do navegador/PWA** servindo versões antigas dos arquivos JavaScript.

A solução é **forçar o cache bust** adicionando logs de debug e, se necessário, aplicar fallback com inline styles.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. `participante-jogos.js` - Adicionar Logs de Debug

**Path:** `public/participante/js/modules/participante-jogos.js`
**Tipo:** Modificação
**Impacto:** Baixo
**Dependentes:** `participante-boas-vindas.js` (import)

#### Mudanças Cirúrgicas:

**Linha 744: ADICIONAR após o Log existente**
```javascript
// ANTES (linha 744):
if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v5.1 carregado (modal tabs + font-brand)');

// DEPOIS:
if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v5.1 carregado (modal tabs + font-brand)');

// ✅ DEBUG: Confirmar que versão 5.1 está ativa no console
console.log('[JOGOS-DEBUG] ✅ Versão 5.1 carregada. font-brand e modal tabs ativos.');
console.log('[JOGOS-DEBUG] expandirJogo disponível:', typeof window.expandirJogo);
```
**Motivo:** Permitir que o usuário confirme no console do navegador se a versão correta está carregada. Se o log não aparecer ou mostrar versão diferente, confirma problema de cache.

---

**Linha 135: ADICIONAR log dentro da função `renderizarJogosAoVivo` após renderizar**
```javascript
// ANTES (linha 135):
        ${jogos.map(jogo => renderizarCardJogo(jogo)).join('')}

// DEPOIS:
        ${jogos.map(jogo => renderizarCardJogo(jogo)).join('')}
        ${(() => { console.log('[JOGOS-DEBUG] Renderizados', jogos.length, 'jogos. Cache:', window._jogosCache?.length || 0); return ''; })()}
```
**Motivo:** Confirmar que a renderização está ocorrendo e o cache está sendo populado.

---

### 2. `participante-boas-vindas.js` - Adicionar Log de Cache

**Path:** `public/participante/js/modules/participante-boas-vindas.js`
**Tipo:** Modificação
**Impacto:** Baixo
**Dependentes:** Nenhum (entry point)

#### Mudanças Cirúrgicas:

**Linha 870: ADICIONAR log após popular o cache**
```javascript
// ANTES (linha 870):
        window._jogosCache = result.jogos || [];

// DEPOIS:
        window._jogosCache = result.jogos || [];
        console.log('[BOAS-VINDAS-DEBUG] _jogosCache populado com', window._jogosCache.length, 'jogos');
```
**Motivo:** Confirmar que o cache está sendo populado corretamente pelo módulo de boas-vindas.

---

### 3. NENHUMA mudança no Backend

**Path:** `routes/jogos-ao-vivo-routes.js`
**Tipo:** Nenhuma modificação
**Motivo:** Backend v3.3 confirmado funcionando corretamente via teste de API direto.

---

## Solução Alternativa: Inline Styles (Se Cache Persistir)

Se após limpeza de cache o `font-brand` ainda não funcionar, aplicar fallback com inline styles.

### 3a. `participante-jogos.js` - Fallback Inline Style

**Linha 130: MODIFICAR título com inline style**
```javascript
// ANTES:
<h3 class="text-sm font-brand text-white tracking-wide">${titulo}</h3>

// DEPOIS (com fallback):
<h3 class="text-sm font-brand text-white tracking-wide" style="font-family: 'Russo One', sans-serif;">${titulo}</h3>
```

**Linha 170: MODIFICAR nome da liga com inline style**
```javascript
// ANTES:
<span class="text-[10px] font-brand text-white/50 truncate max-w-[60%] tracking-wide" ...>${jogo.liga}</span>

// DEPOIS (com fallback):
<span class="text-[10px] font-brand text-white/50 truncate max-w-[60%] tracking-wide" style="font-family: 'Russo One', sans-serif;" ...>${jogo.liga}</span>
```

**Linha 285: MODIFICAR placar com inline style**
```javascript
// ANTES:
<span class="${placarClass} ${sizeClass} font-brand leading-tight tabular-nums">

// DEPOIS (com fallback):
<span class="${placarClass} ${sizeClass} font-brand leading-tight tabular-nums" style="font-family: 'Russo One', sans-serif;">
```

**Linha 424: MODIFICAR placar do modal com inline style**
```javascript
// ANTES:
<div class="text-4xl font-brand text-white tabular-nums px-4">

// DEPOIS (com fallback):
<div class="text-4xl font-brand text-white tabular-nums px-4" style="font-family: 'Russo One', sans-serif;">
```

**Motivo:** Inline styles têm máxima especificidade CSS e garantem aplicação da fonte mesmo com conflitos.

---

## Mapa de Dependências

```
participante-jogos.js (módulo ES6)
    |-> participante-boas-vindas.js [IMPORTA: renderizarJogosAoVivo, obterJogosAoVivo, iniciarAutoRefresh]
    |-> window._jogosCache [GLOBAL: usado pelo expandirJogo]
    |-> window.expandirJogo [GLOBAL: evento onclick dos cards]
    |-> window.fecharModalJogo [GLOBAL: evento onclick do modal]
    |-> window.trocarTabModal [GLOBAL: evento onclick das tabs]
    |
jogos-ao-vivo-routes.js (backend)
    |-> GET /api/jogos-ao-vivo [CONSOME: participante-jogos.js]
    |-> GET /api/jogos-ao-vivo/:fixtureId/eventos [CONSOME: expandirJogo]
```

---

## Verificações de Segurança

### Multi-Tenant
- [x] N/A - Jogos são públicos (API-Football)
- [x] Sem acesso a dados de participantes específicos

### Autenticação
- [x] N/A - API pública, não requer auth

---

## Casos de Teste

### Teste 1: Verificar Versão no Console
**Setup:** Acessar app do participante
**Ação:** Abrir DevTools (F12) > Console
**Resultado Esperado:** Ver log `[JOGOS-DEBUG] ✅ Versão 5.1 carregada`

### Teste 2: Verificar Cache de Jogos
**Setup:** Na tela inicial com jogos do dia
**Ação:** No console, executar `window._jogosCache`
**Resultado Esperado:** Array com os jogos exibidos

### Teste 3: Verificar expandirJogo
**Setup:** Na tela inicial com jogos do dia
**Ação:** No console, executar `typeof window.expandirJogo`
**Resultado Esperado:** `"function"`

### Teste 4: Clicar em um Jogo
**Setup:** Jogos ao vivo ou encerrados na tela
**Ação:** Clicar em um card de jogo
**Resultado Esperado:** Modal abre com tabs (Eventos | Estatísticas | Escalações)

### Teste 5: Verificar font-brand Computado
**Setup:** Modal de jogo aberto
**Ação:** Inspecionar placar grande (DevTools > Elements > Computed)
**Resultado Esperado:** `font-family: "Russo One", sans-serif`

### Teste 6: Forçar Cache Bust
**Setup:** Navegador com possível cache antigo
**Ação:**
```javascript
// No console:
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
    });
}
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```
**Resultado Esperado:** Página recarrega com versão 5.1

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversão:**
1. Remover logs de debug adicionados
2. Remover inline styles (se foram aplicados)
3. Comando: `git checkout -- public/participante/js/modules/participante-jogos.js`

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Arquivos Analisados
- [x] `participante-jogos.js` - 745 linhas analisadas
- [x] `jogos-ao-vivo-routes.js` - 558 linhas analisadas
- [x] `participante-boas-vindas.js` - Linhas 860-902 analisadas
- [x] `_app-tokens.css` - 620 linhas analisadas
- [x] `index.html` - 1531 linhas analisadas

---

## Ordem de Execução (Crítico)

1. **Fase 1: Diagnóstico (RECOMENDADO PRIMEIRO)**
   - Usuário abre DevTools (F12) > Console
   - Verifica se há erros
   - Executa: `console.log(window._jogosCache, typeof window.expandirJogo)`
   - Se `expandirJogo` é `undefined` → **cache antigo confirmado**

2. **Fase 2: Forçar Cache Bust**
   - Executar script de limpeza no console
   - Hard refresh (Ctrl+Shift+R)
   - Verificar log "v5.1 carregada"

3. **Fase 3: Se cache bust não resolver**
   - Aplicar logs de debug no código
   - Fazer deploy
   - Verificar console novamente

4. **Fase 4: Se font-brand não aplicar**
   - Aplicar inline styles como fallback
   - Testar novamente

---

## Conclusão do Diagnóstico

| Componente | Status | Ação |
|------------|--------|------|
| Backend `formatarNomeLiga()` | ✅ Funcionando | Nenhuma |
| Backend `extrairResumoStats()` | ✅ Funcionando | Nenhuma |
| Frontend `font-brand` classes | ✅ Implementado | Verificar cache |
| Frontend Modal Tabs | ✅ Implementado | Verificar cache |
| CSS `_app-tokens.css` | ✅ `.font-brand` com `!important` | Nenhuma |
| Cache do Navegador | ⚠️ **PROVÁVEL CAUSA** | Forçar bust |

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-badges-jogos-diagnostico-v6.md
```

OU

**Testar manualmente primeiro:**
1. Acessar o app
2. F12 > Console
3. Executar: `if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => { regs.forEach(reg => reg.unregister()); }); } localStorage.clear(); location.reload(true);`
4. Verificar se problema foi resolvido

---

**Gerado por:** Spec Protocol v1.0
**S.D.A Completo:** Sim
**Mudanças Cirúrgicas:** 4-6 linhas (apenas logs + fallback opcional)
