# PRD - Diagnóstico e Correção Badges Jogos v6.0

**Data:** 2026-01-18
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

Diagnóstico completo do sistema de badges/cards de jogos ao vivo para identificar por que as melhorias implementadas não estão funcionando visualmente para o usuário.

### Requisitos Originais
1. **Corrigir nomes de campeonatos**: Exibir "Paulistão" em vez de "Paulista - A1"
2. **Aplicar fonte Russo One (font-brand)**: Nos títulos dos jogos e placar
3. **Modal com tabs**: Eventos | Estatísticas | Escalações

---

## Diagnóstico Completo

### Backend (v3.3) - STATUS: FUNCIONANDO

**Teste de API realizado:**
```bash
curl -s "/api/jogos-ao-vivo" | grep -o '"liga":"[^"]*"'
```

**Resultado:**
- "Carioca - 1" → "Cariocão" ✅
- "Mineiro - 1" → "Mineirão" ✅
- "Goiano - 1" → "Goianão" ✅
- "Gaúcho" → "Gauchão" ✅
- "Baiano" → "Baianão" ✅
- Copa do Nordeste, Copinha, Paranaense ✅

**Conclusão Backend:** O `formatarNomeLiga()` está funcionando corretamente.

**Arquivos verificados:**
- `routes/jogos-ao-vivo-routes.js:39-100` - `formatarNomeLiga()` com mapeamentos corretos
- `routes/jogos-ao-vivo-routes.js:331-365` - `extrairResumoStats()` implementado
- `routes/jogos-ao-vivo-routes.js:290-306` - Retorna `resumoStats`, `escalacoes`, `liga`

---

### Frontend (v5.1) - STATUS: CÓDIGO CORRETO, MAS...

**Verificação do uso de font-brand:**

| Linha | Elemento | Classe Aplicada |
|-------|----------|-----------------|
| 130 | Título "Jogos do Dia" | `font-brand` ✅ |
| 170 | Nome da liga (header card) | `font-brand` ✅ |
| 275 | "vs" (jogos agendados) | `font-brand` ✅ |
| 285 | Placar (ao vivo/encerrado) | `font-brand` ✅ |
| 409 | Nome da liga (modal) | `font-brand` ✅ |
| 424 | Placar grande (modal) | `font-brand` ✅ |

**Modal com tabs:**
- `renderizarModalJogo()` linhas 386-526 - Implementado com tabs
- `renderizarEstatisticas()` linhas 552-608 - Barras comparativas
- `renderizarEscalacoes()` linhas 616-665 - Lista de titulares
- `trocarTabModal()` linhas 673-694 - Troca de tabs funcional

**Conclusão Frontend:** O código está correto.

---

## Problema Identificado

### Possíveis Causas

1. **Cache do Navegador (MAIS PROVÁVEL)**
   - O navegador pode estar servindo arquivos JS/CSS antigos
   - Service Worker do PWA pode estar cacheando versão antiga

2. **Tailwind não reconhece `font-brand`**
   - O Tailwind está configurado com `fontFamily: { brand: [...] }` (linha 46 index.html)
   - Mas a classe é gerada como `font-brand` pelo Tailwind
   - O CSS custom também define `.font-brand`
   - Pode haver conflito de especificidade

3. **Modal não sendo ativado**
   - O click handler `window.expandirJogo()` pode não estar registrado
   - O cache `window._jogosCache` pode estar vazio

4. **CSS não carregando**
   - O arquivo `_app-tokens.css` pode não estar sendo carregado
   - A variável `--app-font-brand` pode não estar definida

---

## Verificações Necessárias

### 1. Console do Navegador
Abrir DevTools (F12) e verificar:
- Erros de JavaScript no console
- Se `window.expandirJogo` existe (digitar no console)
- Se `window._jogosCache` tem jogos

### 2. Estilos Computados
Inspecionar elemento do placar:
- Verificar `font-family` computado
- Deve mostrar "Russo One" ou "sans-serif"

### 3. Network Tab
Verificar se os arquivos estão sendo carregados:
- `participante-jogos.js` (versão 5.1)
- `_app-tokens.css`
- Fonte Russo One do Google Fonts

### 4. Forçar Cache Bust
```javascript
// No console do navegador
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
    });
}
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

## Solução Proposta

### Fase 1: Diagnóstico no Navegador
1. Acessar app do participante
2. Abrir DevTools (F12) > Console
3. Verificar erros
4. Executar: `console.log(window._jogosCache, window.expandirJogo)`

### Fase 2: Forçar Atualização
1. Limpar Service Workers
2. Hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)
3. Verificar versão do arquivo (deve mostrar v5.1 no console)

### Fase 3: Correções de CSS (se necessário)
Se o `font-brand` não estiver funcionando:

**Opção A: Usar `!important`**
```css
/* Em _app-tokens.css */
.font-brand {
    font-family: var(--app-font-brand) !important;
}
```

**Opção B: Usar inline style no JS**
```javascript
// Em participante-jogos.js
<span style="font-family: 'Russo One', sans-serif" class="...">
```

**Opção C: Usar variável CSS diretamente**
```javascript
<span style="font-family: var(--app-font-brand)">
```

### Fase 4: Debug do Modal
Se o modal não abrir ao clicar:

```javascript
// Em participante-jogos.js, após renderizar os cards:
console.log('[JOGOS] Cards renderizados. expandirJogo disponível:', typeof window.expandirJogo);
console.log('[JOGOS] Cache tem', window._jogosCache?.length || 0, 'jogos');
```

---

## Arquivos Envolvidos

### Backend (NENHUMA MUDANÇA NECESSÁRIA)
- `routes/jogos-ao-vivo-routes.js` v3.3 - Funcionando

### Frontend (VERIFICAR/AJUSTAR)
| Arquivo | Mudança | Prioridade |
|---------|---------|------------|
| `public/participante/js/modules/participante-jogos.js` | Adicionar logs de debug | Alta |
| `public/participante/css/_app-tokens.css` | Verificar `.font-brand` | Média |
| `public/participante/index.html` | Verificar carregamento de CSS/fonts | Baixa |

---

## Testes Necessários

### Cenário 1: Cache Limpo
1. Limpar cache do navegador
2. Acessar app
3. Verificar se nomes de campeonatos aparecem corretos
4. Verificar se placar usa fonte Russo One

### Cenário 2: Modal de Detalhes
1. Clicar em um jogo ao vivo
2. Verificar se modal abre
3. Verificar se tabs aparecem (Eventos, Estatísticas, Escalações)
4. Clicar em cada tab e verificar conteúdo

### Cenário 3: Fonte Brand
1. Inspecionar elemento do placar
2. Verificar `font-family` computado
3. Deve ser "Russo One" ou "Russo One, sans-serif"

---

## Próximos Passos

1. **Usuário deve forçar cache bust** e reportar se funcionou
2. Se não funcionar, **adicionar logs de debug** no JS
3. Se CSS não aplicar, **usar inline style** como fallback
4. **Documentar solução final** para evitar regressões

---

## Hipótese Principal

O código está correto, mas o **cache do navegador/PWA** está servindo versões antigas. A solução mais provável é:

1. Forçar limpeza do Service Worker
2. Hard refresh
3. Verificar versão no console (deve mostrar "v5.1")

Se após isso ainda não funcionar, o problema é de CSS e requer ajuste de especificidade.

---

**Gerado por:** Pesquisa Protocol v1.0
