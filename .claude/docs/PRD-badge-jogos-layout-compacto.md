# PRD - Badge Jogos do Dia - Layout Compacto

**Data:** 2026-01-18
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

Ajustar o layout do badge/card de "Jogos do Dia" (API-Football) na tela de boas-vindas do app participante para:

1. **Tamanho menor** - Reduzir padding, espaçamentos e tamanho de elementos
2. **Mais afastado do fim da tela** - Aumentar margem inferior do container
3. **Fonte menor** - Reduzir tamanho das fontes para acomodar melhor as informações

---

## Contexto e Analise

### Modulos Identificados

**Frontend:**
- `public/participante/js/modules/participante-jogos.js` - Renderiza o card de jogos (v5.1)
- `public/participante/js/modules/participante-boas-vindas.js` - Insere o card no placeholder

### Estrutura Atual do Badge

```
┌──────────────────────────────────────────────┐
│ ⚽ Jogos do Dia           [4 jogos]         │  <- Header
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Cariocão                    [19:00]      │ │  <- Liga + Status
│ │ [🔴] Flamengo    2 - 1    Vasco [🔵]    │ │  <- Times + Placar
│ │                   (HT: 1-0)              │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ ...próximo jogo...                       │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│         Dados: API-Football                  │  <- Footer
└──────────────────────────────────────────────┘
```

### Tamanhos Atuais (participante-jogos.js)

| Elemento | Classe Atual | Tamanho |
|----------|--------------|---------|
| Container | `mx-4 mb-4 p-4` | margin: 16px, padding: 16px |
| Titulo | `text-sm` | 14px |
| Tag contador | `text-xs` | 12px |
| Nome liga | `text-[10px]` | 10px |
| Nome time | `text-xs` | 12px |
| Escudos | `w-7 h-7` | 28x28px |
| Placar agendado | `text-lg` | 18px |
| Placar ao vivo | `text-xl` | 20px |
| Horario | `text-[10px]` | 10px |
| Footer | `text-xs` | 12px |
| Card jogo | `py-2 px-3` | padding: 8px 12px |
| Espacamento jogos | `space-y-2` | gap: 8px |

---

## Solucao Proposta

### Mudancas Cirurgicas

#### 1. Container Principal (linha ~125-126)

**De:**
```javascript
<div class="jogos-ao-vivo mx-4 mb-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 border border-primary/30 shadow-lg">
```

**Para:**
```javascript
<div class="jogos-ao-vivo mx-4 mb-8 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-3 border border-primary/30 shadow-lg">
```

**Mudancas:**
- `mb-4` → `mb-8` (afasta do fim da tela: 16px → 32px)
- `p-4` → `p-3` (padding interno: 16px → 12px)

#### 2. Header do Card (linhas ~127-133)

**De:**
```javascript
<div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
        <span class="material-icons text-primary">${tituloIcone}</span>
        <h3 class="text-sm font-brand text-white tracking-wide">${titulo}</h3>
    </div>
    <span class="text-xs px-2 py-0.5 rounded ${tagClass}">${tagTexto}</span>
</div>
```

**Para:**
```javascript
<div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-1.5">
        <span class="material-icons text-primary text-base">${tituloIcone}</span>
        <h3 class="text-xs font-brand text-white tracking-wide">${titulo}</h3>
    </div>
    <span class="text-[10px] px-1.5 py-0.5 rounded ${tagClass}">${tagTexto}</span>
</div>
```

**Mudancas:**
- `mb-3` → `mb-2` (margem: 12px → 8px)
- `gap-2` → `gap-1.5` (gap: 8px → 6px)
- Icone: adicionar `text-base` (16px)
- Titulo: `text-sm` → `text-xs` (14px → 12px)
- Tag: `text-xs` → `text-[10px]`, `px-2` → `px-1.5`

#### 3. Lista de Jogos (linha ~134)

**De:**
```javascript
<div class="space-y-2">
```

**Para:**
```javascript
<div class="space-y-1.5">
```

**Mudanca:** gap entre cards: 8px → 6px

#### 4. Footer (linhas ~138-142)

**De:**
```javascript
<div class="mt-3 text-center">
    <span class="text-xs text-white/40">
```

**Para:**
```javascript
<div class="mt-2 text-center">
    <span class="text-[10px] text-white/30">
```

**Mudancas:**
- `mt-3` → `mt-2` (margem: 12px → 8px)
- `text-xs` → `text-[10px]` (12px → 10px)
- `text-white/40` → `text-white/30` (mais discreto)

#### 5. Card de Jogo Individual (linhas ~165-206)

**De:**
```javascript
<div class="jogo-card flex flex-col py-2 px-3 rounded-lg ${containerClass} cursor-pointer"
```

**Para:**
```javascript
<div class="jogo-card flex flex-col py-1.5 px-2.5 rounded-lg ${containerClass} cursor-pointer"
```

**Mudancas:** `py-2 px-3` → `py-1.5 px-2.5` (padding: 8px 12px → 6px 10px)

#### 6. Header do Jogo - Liga (linha ~170-172)

**De:**
```javascript
<div class="flex items-center justify-between mb-2">
    <span class="text-[10px] font-brand text-white/50 truncate max-w-[60%] tracking-wide"
```

**Para:**
```javascript
<div class="flex items-center justify-between mb-1.5">
    <span class="text-[9px] font-brand text-white/50 truncate max-w-[60%] tracking-wide"
```

**Mudancas:**
- `mb-2` → `mb-1.5` (8px → 6px)
- `text-[10px]` → `text-[9px]` (10px → 9px)

#### 7. Escudos dos Times (linhas ~180, 195)

**De:**
```javascript
class="w-7 h-7 object-contain shrink-0"
```

**Para:**
```javascript
class="w-6 h-6 object-contain shrink-0"
```

**Mudanca:** 28x28px → 24x24px

#### 8. Nomes dos Times (linhas ~182, 192)

**De:**
```javascript
<span class="text-white font-medium text-xs truncate">
```

**Para:**
```javascript
<span class="text-white font-medium text-[11px] truncate">
```

**Mudanca:** `text-xs` (12px) → `text-[11px]` (11px)

#### 9. Container do Placar (linha ~186)

**De:**
```javascript
<div class="flex flex-col items-center justify-center min-w-[70px] shrink-0 px-2">
```

**Para:**
```javascript
<div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1.5">
```

**Mudancas:**
- `min-w-[70px]` → `min-w-[60px]`
- `px-2` → `px-1.5`

#### 10. Placar (funcao renderizarPlacar, linhas ~273-293)

**De:**
```javascript
// Agendado
<span class="text-primary font-brand text-lg">vs</span>
<span class="text-white/50 text-[10px]">${jogo.horario}</span>

// Ao vivo/encerrado
const sizeClass = aoVivo ? 'text-xl' : 'text-lg';
```

**Para:**
```javascript
// Agendado
<span class="text-primary font-brand text-base">vs</span>
<span class="text-white/50 text-[9px]">${jogo.horario}</span>

// Ao vivo/encerrado
const sizeClass = aoVivo ? 'text-lg' : 'text-base';
```

**Mudancas:**
- VS: `text-lg` → `text-base` (18px → 16px)
- Horario: `text-[10px]` → `text-[9px]`
- Placar ao vivo: `text-xl` → `text-lg` (20px → 18px)
- Placar encerrado: `text-lg` → `text-base` (18px → 16px)

#### 11. Badge de Status (funcao renderizarBadgeStatus, linhas ~234-267)

**De:**
```javascript
<span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
```

**Para:**
```javascript
<span class="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full
```

**Mudancas:**
- `gap-1` → `gap-0.5`
- `text-[10px]` → `text-[9px]`
- `px-2` → `px-1.5`

#### 12. Footer do Jogo - Estadio (linhas ~200-204)

**De:**
```javascript
<div class="mt-2 text-center">
    <span class="text-[9px] text-white/30">
```

**Para:**
```javascript
<div class="mt-1.5 text-center">
    <span class="text-[8px] text-white/25">
```

**Mudancas:**
- `mt-2` → `mt-1.5`
- `text-[9px]` → `text-[8px]`
- `text-white/30` → `text-white/25`

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

---

## Arquivos a Modificar

| Arquivo | Linhas | Mudanca |
|---------|--------|---------|
| `public/participante/js/modules/participante-jogos.js` | ~125-144 | Container e header |
| `public/participante/js/modules/participante-jogos.js` | ~165-206 | Card de jogo |
| `public/participante/js/modules/participante-jogos.js` | ~234-267 | Badge status |
| `public/participante/js/modules/participante-jogos.js` | ~273-293 | Placar |

---

## Testes Necessarios

### Cenario 1: Visual Geral
1. Acessar app participante
2. Verificar se badge de jogos aparece menor e mais compacto
3. Verificar se tem mais espaco ate o final da tela

### Cenario 2: Legibilidade
1. Verificar se nomes dos times sao legiveis
2. Verificar se placar e facilmente identificavel
3. Verificar se badges de status sao visiveis

### Cenario 3: Responsividade
1. Testar em diferentes tamanhos de tela
2. Verificar truncamento de nomes longos
3. Verificar alinhamento dos elementos

---

## Proximos Passos

1. Validar PRD com usuario
2. Gerar Spec: Executar `/spec PRD-badge-jogos-layout-compacto.md`
3. Implementar: Executar `/code SPEC-badge-jogos-layout-compacto.md`

---

**Gerado por:** Pesquisa Protocol v1.0
