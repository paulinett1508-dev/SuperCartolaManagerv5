
claude# SPEC - Badge Jogos do Dia - Layout Compacto

**Data:** 2026-01-18
**Baseado em:** PRD-badge-jogos-layout-compacto.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Ajustar classes TailwindCSS no arquivo `participante-jogos.js` para reduzir tamanhos de fontes, paddings, espacamentos e aumentar margem inferior do container de jogos. Todas as mudancas sao puramente visuais (CSS) e nao afetam logica de negocio.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. `public/participante/js/modules/participante-jogos.js` - Mudanca Primaria

**Path:** `public/participante/js/modules/participante-jogos.js`
**Tipo:** Modificacao
**Impacto:** Baixo (apenas visual)
**Dependentes:** Nenhum (classes TailwindCSS inline)

---

#### Mudancas Cirurgicas:

---

##### MUDANCA 1: Container Principal (linha 126)

**Linha 126: MODIFICAR**
```javascript
// ANTES:
    <div class="jogos-ao-vivo mx-4 mb-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 border border-primary/30 shadow-lg">

// DEPOIS:
    <div class="jogos-ao-vivo mx-4 mb-8 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-3 border border-primary/30 shadow-lg">
```
**Motivo:**
- `mb-4` -> `mb-8`: Afasta container do fim da tela (16px -> 32px)
- `p-4` -> `p-3`: Reduz padding interno (16px -> 12px)

---

##### MUDANCA 2: Header - Margem e Gap (linhas 127-128)

**Linha 127: MODIFICAR**
```javascript
// ANTES:
        <div class="flex items-center justify-between mb-3">

// DEPOIS:
        <div class="flex items-center justify-between mb-2">
```
**Motivo:** `mb-3` -> `mb-2`: Reduz margem do header (12px -> 8px)

**Linha 128: MODIFICAR**
```javascript
// ANTES:
            <div class="flex items-center gap-2">

// DEPOIS:
            <div class="flex items-center gap-1.5">
```
**Motivo:** `gap-2` -> `gap-1.5`: Reduz gap entre icone e titulo (8px -> 6px)

---

##### MUDANCA 3: Header - Icone e Titulo (linhas 129-130)

**Linha 129: MODIFICAR**
```javascript
// ANTES:
                <span class="material-icons text-primary">${tituloIcone}</span>

// DEPOIS:
                <span class="material-icons text-primary text-base">${tituloIcone}</span>
```
**Motivo:** Adicionar `text-base`: Limita icone a 16px

**Linha 130: MODIFICAR**
```javascript
// ANTES:
                <h3 class="text-sm font-brand text-white tracking-wide">${titulo}</h3>

// DEPOIS:
                <h3 class="text-xs font-brand text-white tracking-wide">${titulo}</h3>
```
**Motivo:** `text-sm` -> `text-xs`: Reduz titulo (14px -> 12px)

---

##### MUDANCA 4: Header - Tag Contador (linha 132)

**Linha 132: MODIFICAR**
```javascript
// ANTES:
            <span class="text-xs px-2 py-0.5 rounded ${tagClass}">${tagTexto}</span>

// DEPOIS:
            <span class="text-[10px] px-1.5 py-0.5 rounded ${tagClass}">${tagTexto}</span>
```
**Motivo:**
- `text-xs` -> `text-[10px]`: Reduz fonte (12px -> 10px)
- `px-2` -> `px-1.5`: Reduz padding horizontal (8px -> 6px)

---

##### MUDANCA 5: Lista de Jogos - Espacamento (linha 134)

**Linha 134: MODIFICAR**
```javascript
// ANTES:
        <div class="space-y-2">

// DEPOIS:
        <div class="space-y-1.5">
```
**Motivo:** `space-y-2` -> `space-y-1.5`: Reduz gap entre cards (8px -> 6px)

---

##### MUDANCA 6: Footer do Container (linhas 138-139)

**Linha 138: MODIFICAR**
```javascript
// ANTES:
        <div class="mt-3 text-center">

// DEPOIS:
        <div class="mt-2 text-center">
```
**Motivo:** `mt-3` -> `mt-2`: Reduz margem superior (12px -> 8px)

**Linha 139: MODIFICAR**
```javascript
// ANTES:
            <span class="text-xs text-white/40">

// DEPOIS:
            <span class="text-[10px] text-white/30">
```
**Motivo:**
- `text-xs` -> `text-[10px]`: Reduz fonte (12px -> 10px)
- `text-white/40` -> `text-white/30`: Mais discreto

---

##### MUDANCA 7: Card de Jogo - Padding (linha 166)

**Linha 166: MODIFICAR**
```javascript
// ANTES:
        <div class="jogo-card flex flex-col py-2 px-3 rounded-lg ${containerClass} cursor-pointer"

// DEPOIS:
        <div class="jogo-card flex flex-col py-1.5 px-2.5 rounded-lg ${containerClass} cursor-pointer"
```
**Motivo:** `py-2 px-3` -> `py-1.5 px-2.5`: Reduz padding do card (8x12 -> 6x10)

---

##### MUDANCA 8: Header do Jogo - Liga (linhas 170-171)

**Linha 170: MODIFICAR**
```javascript
// ANTES:
            <div class="flex items-center justify-between mb-2">

// DEPOIS:
            <div class="flex items-center justify-between mb-1.5">
```
**Motivo:** `mb-2` -> `mb-1.5`: Reduz margem (8px -> 6px)

**Linha 171: MODIFICAR**
```javascript
// ANTES:
                <span class="text-[10px] font-brand text-white/50 truncate max-w-[60%] tracking-wide" title="ID:${jogo.ligaId} | API:${jogo.ligaOriginal}">${jogo.liga}</span>

// DEPOIS:
                <span class="text-[9px] font-brand text-white/50 truncate max-w-[60%] tracking-wide" title="ID:${jogo.ligaId} | API:${jogo.ligaOriginal}">${jogo.liga}</span>
```
**Motivo:** `text-[10px]` -> `text-[9px]`: Reduz fonte da liga (10px -> 9px)

---

##### MUDANCA 9: Escudo Mandante (linha 180)

**Linha 180: MODIFICAR**
```javascript
// ANTES:
                         class="w-7 h-7 object-contain shrink-0"

// DEPOIS:
                         class="w-6 h-6 object-contain shrink-0"
```
**Motivo:** `w-7 h-7` -> `w-6 h-6`: Reduz escudo (28px -> 24px)

---

##### MUDANCA 10: Nome Time Mandante (linha 182)

**Linha 182: MODIFICAR**
```javascript
// ANTES:
                    <span class="text-white font-medium text-xs truncate">${jogo.mandante}</span>

// DEPOIS:
                    <span class="text-white font-medium text-[11px] truncate">${jogo.mandante}</span>
```
**Motivo:** `text-xs` -> `text-[11px]`: Reduz fonte do nome (12px -> 11px)

---

##### MUDANCA 11: Container do Placar (linha 186)

**Linha 186: MODIFICAR**
```javascript
// ANTES:
                <div class="flex flex-col items-center justify-center min-w-[70px] shrink-0 px-2">

// DEPOIS:
                <div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1.5">
```
**Motivo:**
- `min-w-[70px]` -> `min-w-[60px]`: Reduz largura minima
- `px-2` -> `px-1.5`: Reduz padding horizontal

---

##### MUDANCA 12: Nome Time Visitante (linha 192)

**Linha 192: MODIFICAR**
```javascript
// ANTES:
                    <span class="text-white font-medium text-xs truncate text-right">${jogo.visitante}</span>

// DEPOIS:
                    <span class="text-white font-medium text-[11px] truncate text-right">${jogo.visitante}</span>
```
**Motivo:** `text-xs` -> `text-[11px]`: Reduz fonte do nome (12px -> 11px)

---

##### MUDANCA 13: Escudo Visitante (linha 194)

**Linha 194: MODIFICAR**
```javascript
// ANTES:
                         class="w-7 h-7 object-contain shrink-0"

// DEPOIS:
                         class="w-6 h-6 object-contain shrink-0"
```
**Motivo:** `w-7 h-7` -> `w-6 h-6`: Reduz escudo (28px -> 24px)

---

##### MUDANCA 14: Footer do Jogo - Estadio (linhas 201-202)

**Linha 201: MODIFICAR**
```javascript
// ANTES:
                <div class="mt-2 text-center">

// DEPOIS:
                <div class="mt-1.5 text-center">
```
**Motivo:** `mt-2` -> `mt-1.5`: Reduz margem (8px -> 6px)

**Linha 202: MODIFICAR**
```javascript
// ANTES:
                    <span class="text-[9px] text-white/30">${jogo.estadio}${jogo.cidade ? `, ${jogo.cidade}` : ''}</span>

// DEPOIS:
                    <span class="text-[8px] text-white/25">${jogo.estadio}${jogo.cidade ? `, ${jogo.cidade}` : ''}</span>
```
**Motivo:**
- `text-[9px]` -> `text-[8px]`: Reduz fonte (9px -> 8px)
- `text-white/30` -> `text-white/25`: Mais discreto

---

##### MUDANCA 15: Badge Status - Ao Vivo (linha 247)

**Linha 247: MODIFICAR**
```javascript
// ANTES:
            <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">

// DEPOIS:
            <span class="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
```
**Motivo:**
- `gap-1` -> `gap-0.5`: Reduz gap interno
- `text-[10px]` -> `text-[9px]`: Reduz fonte
- `px-2` -> `px-1.5`: Reduz padding

---

##### MUDANCA 16: Badge Status - Encerrado (linha 256)

**Linha 256: MODIFICAR**
```javascript
// ANTES:
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">

// DEPOIS:
            <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
```
**Motivo:**
- `text-[10px]` -> `text-[9px]`: Reduz fonte
- `px-2` -> `px-1.5`: Reduz padding

---

##### MUDANCA 17: Badge Status - Agendado (linha 264)

**Linha 264: MODIFICAR**
```javascript
// ANTES:
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">

// DEPOIS:
        <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
```
**Motivo:**
- `text-[10px]` -> `text-[9px]`: Reduz fonte
- `px-2` -> `px-1.5`: Reduz padding

---

##### MUDANCA 18: Placar Agendado - VS (linha 276)

**Linha 276: MODIFICAR**
```javascript
// ANTES:
            <span class="text-primary font-brand text-lg">vs</span>

// DEPOIS:
            <span class="text-primary font-brand text-base">vs</span>
```
**Motivo:** `text-lg` -> `text-base`: Reduz VS (18px -> 16px)

---

##### MUDANCA 19: Placar Agendado - Horario (linha 277)

**Linha 277: MODIFICAR**
```javascript
// ANTES:
            <span class="text-white/50 text-[10px]">${jogo.horario}</span>

// DEPOIS:
            <span class="text-white/50 text-[9px]">${jogo.horario}</span>
```
**Motivo:** `text-[10px]` -> `text-[9px]`: Reduz fonte (10px -> 9px)

---

##### MUDANCA 20: Placar Ao Vivo/Encerrado - Tamanho (linha 283)

**Linha 283: MODIFICAR**
```javascript
// ANTES:
    const sizeClass = aoVivo ? 'text-xl' : 'text-lg';

// DEPOIS:
    const sizeClass = aoVivo ? 'text-lg' : 'text-base';
```
**Motivo:**
- Ao vivo: `text-xl` -> `text-lg` (20px -> 18px)
- Encerrado: `text-lg` -> `text-base` (18px -> 16px)

---

## Mapa de Dependencias

```
public/participante/js/modules/participante-jogos.js (MODIFICAR)
    |
    |-> public/participante/js/modules/participante-boas-vindas.js
    |   (APENAS CONSOME - Nao precisa modificar)
    |   Importa: obterJogosAoVivo(), renderizarJogosAoVivo()
    |
    |-> routes/jogos-ao-vivo-routes.js
        (APENAS BACKEND - Nao precisa modificar)
        Fornece dados via /api/jogos-ao-vivo
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Nao aplicavel - Mudancas puramente visuais (CSS)

### Autenticacao
- [x] Nao aplicavel - Mudancas puramente visuais (CSS)

---

## Casos de Teste

### Teste 1: Visual Geral
**Setup:** App participante com jogos do dia disponiveis
**Acao:**
1. Acessar tela inicial do participante
2. Observar badge de jogos
**Resultado Esperado:**
- Badge deve aparecer visivelmente menor
- Mais espaco entre o badge e o final da tela (mb-8)

### Teste 2: Legibilidade
**Setup:** Jogos com nomes longos de times
**Acao:** Verificar truncamento de nomes
**Resultado Esperado:**
- Nomes devem truncar com reticencias
- Placar deve ser legivel
- Escudos proporcionais aos nomes

### Teste 3: Status Diferentes
**Setup:** Jogos em diferentes status (ao vivo, agendado, encerrado)
**Acao:** Verificar badges de status
**Resultado Esperado:**
- Badges menores mas ainda legiveis
- Animacao de pulse no "ao vivo" funcionando
- Cores corretas por status

### Teste 4: Modal de Detalhes
**Setup:** Jogo disponivel
**Acao:** Clicar em um jogo para abrir modal
**Resultado Esperado:** Modal deve abrir normalmente (nao afetado pelas mudancas)

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git checkout public/participante/js/modules/participante-jogos.js`
2. Nao ha alteracoes de banco de dados
3. Nao ha alteracoes de cache

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados (1 arquivo)
- [x] Mudancas cirurgicas definidas linha por linha (20 mudancas)
- [x] Impactos mapeados (apenas visual)
- [x] Testes planejados (4 cenarios)
- [x] Rollback documentado

---

## Ordem de Execucao (Critico)

1. **Arquivo unico:**
   - `public/participante/js/modules/participante-jogos.js`

2. **Sequencia de edicoes:**
   - Editar funcao `renderizarJogosAoVivo` (container + header + lista + footer)
   - Editar funcao `renderizarCardJogo` (card + escudos + nomes + placar)
   - Editar funcao `renderizarBadgeStatus` (badges de status)
   - Editar funcao `renderizarPlacar` (VS + horario + tamanhos)

3. **Testes:**
   - Testar visualmente na tela inicial do participante
   - Testar diferentes status de jogos
   - Testar responsividade em mobile

---

## Resumo das Reducoes

| Elemento | Antes | Depois | Reducao |
|----------|-------|--------|---------|
| Container padding | 16px | 12px | -25% |
| Container mb | 16px | 32px | +100% (afastar) |
| Titulo | 14px | 12px | -14% |
| Tag | 12px | 10px | -17% |
| Nome liga | 10px | 9px | -10% |
| Nome time | 12px | 11px | -8% |
| Escudos | 28px | 24px | -14% |
| Placar ao vivo | 20px | 18px | -10% |
| Placar normal | 18px | 16px | -11% |
| Card padding | 8x12px | 6x10px | -25% |
| Gap entre cards | 8px | 6px | -25% |
| Badges status | 10px | 9px | -10% |

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-badge-jogos-layout-compacto.md
```

---

**Gerado por:** Spec Protocol v1.0
