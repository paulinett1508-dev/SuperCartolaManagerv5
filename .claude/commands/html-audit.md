# Auditor de Frontend (QA) - Super Cartola

Voce atua como **Engenheiro de QA (Quality Assurance)** especializado nos padroes do projeto Super Cartola.
Sua funcao e garantir que o codigo obedeca rigorosamente as regras definidas no sistema de Design Tokens.

**Escopo:** Esta auditoria e valida para AMBOS os cenarios:
- **Admin** (`public/admin/`, `public/js/admin/`) - Desktop-first
- **App Participante** (`public/participante/`) - Mobile-first (PWA)

Argumentos: "$ARGUMENTS"

---

## 🔍 Protocolo de Auditoria

### 1. Carregar Contexto (Fontes de Verdade)

Antes de auditar, leia os arquivos de referencia conforme o escopo:

**App Participante (Mobile):**
1. **Skill:** `.claude/skills/frontend-crafter/SKILL.md`
2. **Tokens:** `public/participante/css/_app-tokens.css`

**Admin (Desktop):**
1. **Skill:** `.claude/skills/frontend-crafter/SKILL.md`
2. **Tokens:** `public/css/_admin-tokens.css`

**Padroes Fundamentais:**
- **Fonte Brand (Titulos):** `'Russo One', sans-serif` via `var(--app-font-brand)`
- **Fonte Body:** `'Inter', sans-serif` via `var(--app-font-base)`
- **Cor Primaria:** `#FF5500` via `var(--app-primary)` ou `var(--laranja)`
- **Background Cards:** `#1a1a1a` via `var(--app-surface)` ou `var(--bg-card)`

---

### 2. Analise Forense HTML

Leia o(s) arquivo(s) especificado(s) nos argumentos e verifique:

#### 🎨 Visual & UI

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| Cores hardcoded (`#FF5500`, `#1a1a1a`, `gold`, `white`) | CRITICO | Usar `var(--app-*)` ou `var(--modulo-*)` |
| Emojis no lugar de icones | CRITICO | Usar `<span class="material-icons">nome</span>` |
| Estilos inline (`style="..."`) extensos | MEDIO | Mover para `<style>` ou classe CSS |

#### 🔤 Tipografia (Russo One)

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| Titulos H1/H2 sem `font-family: var(--*-font-brand)` | CRITICO | Adicionar `font-family: var(--app-font-brand)` |
| Titulos usando `font-weight: bold/700` com Russo One | MEDIO | Russo One so tem peso 400, remover font-weight |
| Stats/pontuacoes sem fonte brand | MEDIO | Usar classe `.app-brand-stat` ou variavel |
| Falta de `letter-spacing` em titulos brand | BAIXO | Adicionar `letter-spacing: 0.3px` a `0.5px` |

**Classes disponiveis para fonte brand:**
- `.font-brand` - Classe base
- `.app-brand-title` - Titulos
- `.app-brand-stat` - Numeros/estatisticas
- `.app-brand-btn` - Botoes CTA
- `.app-brand-label` - Labels uppercase

#### 🏗️ Arquitetura HTML

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| Fragmentos com `<html>`, `<head>`, `<body>` | CRITICO | Manter apenas conteudo da view |
| Flag `_navegando = true` (navegacao manual) | CRITICO | Usar Debounce (SPA v3.0) |
| `fetch()` direto sem IndexedDB | MEDIO | Implementar Cache-First |

#### ♿ Acessibilidade

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| `<img>` sem `alt` | MEDIO | Adicionar `alt="descricao"` |
| Botao icone sem `aria-label` | MEDIO | Adicionar `aria-label="acao"` |
| Touch target < 44px | BAIXO | Usar `min-height: var(--app-touch-target)` |

---

### 3. Analise Forense CSS

Varra blocos `<style>` embutidos e arquivos CSS vinculados:

#### 🎨 Cores e Tokens

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| Cor fixa sem fallback (`#FF5500`) | CRITICO | `var(--app-primary)` ou com fallback |
| Cor fixa em variavel local sem token | MEDIO | `--modulo-cor: var(--app-token, #fallback)` |
| `rgba()` hardcoded repetido | BAIXO | Criar variavel `--modulo-cor-alpha` |

**Tokens de cor disponiveis:**
```css
--app-primary, --app-primary-dark, --app-primary-light
--app-success, --app-danger, --app-warning, --app-info
--app-gold, --app-silver, --app-bronze
--app-text-primary, --app-text-secondary, --app-text-muted, --app-text-disabled
--app-surface, --app-surface-elevated, --app-bg
```

#### 📐 Espacamento e Layout

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| `padding: 16px` hardcoded | BAIXO | `padding: var(--app-space-5)` |
| `border-radius: 12px` hardcoded | BAIXO | `border-radius: var(--app-radius-lg)` |
| `z-index: 999` magico | MEDIO | `z-index: var(--app-z-modal)` |

**Tokens de espacamento:**
```css
--app-space-1 (4px), --app-space-2 (8px), --app-space-3 (10px)
--app-space-4 (12px), --app-space-5 (16px), --app-space-6 (20px)
--app-radius-sm (6px), --app-radius-md (8px), --app-radius-lg (12px)
```

#### ⚡ Animacoes e Transicoes

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| `transition: 0.3s` hardcoded | BAIXO | `transition: var(--app-transition-normal)` |
| `@keyframes spin` duplicado | MEDIO | Usar `animation: app-spin` global |
| Animacao sem `prefers-reduced-motion` | BAIXO | Adicionar media query |

**Animacoes globais disponiveis:**
```css
app-spin, app-fade-in, app-fade-in-up, app-pulse, app-press
```

#### 🏷️ Nomenclatura de Variaveis

| Padrao | Exemplo | Uso |
|--------|---------|-----|
| `--app-*` | `--app-primary` | Tokens globais (fonte de verdade) |
| `--modulo-*` | `--luva-gold` | Variaveis locais do modulo |
| `--participante-*` | `--participante-card` | Alias de compatibilidade |

**Regra:** Variaveis locais DEVEM referenciar tokens globais:
```css
/* CORRETO */
--luva-gold: var(--app-gold, #ffd700);

/* INCORRETO */
--luva-gold: #ffd700;
```

#### 🚫 Anti-patterns CSS

| Violacao | Gravidade | Correcao |
|----------|-----------|----------|
| `!important` excessivo (>3 por arquivo) | MEDIO | Aumentar especificidade naturalmente |
| Seletores muito profundos (>4 niveis) | BAIXO | Simplificar hierarquia |
| Duplicacao de `@keyframes` | MEDIO | Usar animacoes globais de `_app-tokens.css` |

---

## 📝 Formato do Relatorio

Para cada arquivo analisado, gere:

### Relatorio de Qualidade: `[Caminho do Arquivo]`

**Conformidade com Design System:** [0% a 100%]

| Gravidade | Categoria | Violacao | Linha | Correcao |
|-----------|-----------|----------|-------|----------|
| CRITICO | Tipografia | Titulo H2 sem Russo One | 45 | Adicionar `font-family: var(--mm-font-brand)` |
| CRITICO | Cor | `border-color: gold` hardcoded | 79 | Trocar por `var(--luva-gold)` |
| MEDIO | CSS Token | `#1a1a1a` sem fallback | 132 | Usar `var(--hall-surface)` |
| BAIXO | Espacamento | `padding: 16px` hardcoded | 98 | Considerar `var(--app-space-5)` |

**Resumo por Categoria:**
- Tipografia: X violacoes
- Cores: X violacoes
- Tokens CSS: X violacoes
- Arquitetura: X violacoes
- Acessibilidade: X violacoes

**Acao Recomendada:**
[Descreva as edicoes necessarias para corrigir, priorizando CRITICOS]

---

## 🔧 Checklist Rapido

Antes de aprovar um arquivo, confirme:

- [ ] Titulos usam `font-family: var(--*-font-brand)` (Russo One)
- [ ] Peso de fonte Russo One e 400 (nao bold)
- [ ] Cores referenciam tokens `--app-*` com fallbacks
- [ ] Variaveis locais `--modulo-*` mapeiam para tokens globais
- [ ] Icones sao Material Icons (nao emojis)
- [ ] Fragmentos nao tem `<html>/<body>`
- [ ] Imagens tem `alt`, botoes-icone tem `aria-label`
- [ ] Animacoes usam `@keyframes` globais quando possivel
- [ ] Nenhum `z-index` magico (usar `--app-z-*`)

---

## 📊 Metricas de Qualidade

| Faixa | Status | Acao |
|-------|--------|------|
| 95-100% | Excelente | Aprovar |
| 85-94% | Bom | Revisar itens MEDIO |
| 70-84% | Regular | Corrigir itens CRITICO |
| <70% | Critico | Refatoracao necessaria |

---
