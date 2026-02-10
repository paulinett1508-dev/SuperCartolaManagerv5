# Guia Rapido: Stitch Adapter Skill v2.0

> PLANO A de criacao de UI. MCP-First + Avaliador de Qualidade.

---

## Estrategia

```
PLANO A (Automatico): Google Stitch MCP → Gera HTML → Avalia → Adapta → Production-Ready
PLANO B (Manual):     HTML colado pelo usuario → Avalia → Adapta → Production-Ready
PLANO C (Fallback):   Figma MCP → Exporta React → Transforma Vanilla → Adapta
```

---

## O que a skill faz?

1. **Gera** UI automaticamente via MCP Stitch (se configurado)
2. **Avalia** qualidade do HTML com score 0-100 em 8 dimensoes
3. **Separa** HTML, CSS e JavaScript em arquivos distintos
4. **Converte** cores/espacamentos/fontes para variaveis CSS do projeto
5. **Adapta** JS para ES6 Module com try/catch
6. **Converte** icones FontAwesome para Material Icons
7. **Sugere** onde colocar cada arquivo (admin vs app, pagina vs fragmento)
8. **Gera** relatorio completo com instrucoes de integracao

---

## Como usar

### Metodo 1: Geracao Automatica (MCP Stitch - Plano A)

Quando o MCP Stitch esta configurado:

```
Crie no Stitch um card de ranking do modulo artilheiro para o app mobile
```

A skill:
1. Monta prompt otimizado com design system do projeto
2. MCP Stitch gera HTML
3. Avaliador analisa qualidade (score 0-100)
4. Adapta automaticamente
5. Gera arquivos + relatorio

### Metodo 2: HTML Colado (Plano B)

```
Recebi este codigo do Google Stitch, adapte para o projeto:

[COLAR CODIGO HTML AQUI]

Tipo: App Participante
Nome: ranking-card
```

### Metodo 3: Apenas Avaliar (sem adaptar)

```
Avalie a qualidade deste HTML do Stitch:

[COLAR CODIGO HTML AQUI]
```

---

## Avaliador de Qualidade (Score 0-100)

| Dimensao | Peso | O que avalia |
|----------|------|--------------|
| Stack Compliance | 20 pts | Sem React/Vue/Angular |
| Dark Mode | 15 pts | Backgrounds escuros |
| Design Tokens | 15 pts | Uso de variaveis CSS |
| Tipografia | 10 pts | Russo One/Inter/JetBrains |
| Responsividade | 10 pts | Viewport, media queries |
| Acessibilidade | 10 pts | aria-labels, semantica |
| JavaScript | 10 pts | ES6+, try/catch |
| Performance | 10 pts | Lazy loading, GPU |

| Score | Nivel | Acao |
|-------|-------|------|
| 85-100 | EXCELENTE | Minimas mudancas |
| 70-84 | BOM | Ajustes moderados |
| 50-69 | ACEITAVEL | Muitos ajustes |
| 30-49 | PRECISA MELHORAR | Alertas criticos |
| 0-29 | CRITICO | Reescrita necessaria |

---

## Conversoes Automaticas

### Cores (Admin → `var(--*)` | App → `var(--app-*)`)

| Stitch | Admin | App |
|--------|-------|-----|
| `#FF5500` | `var(--color-primary)` | `var(--app-primary)` |
| `#1a1a1a` | `var(--surface-card)` | `var(--app-surface)` |
| `#121212` | `var(--surface-bg)` | `var(--app-bg)` |
| `#22c55e` | `var(--color-success-light)` | `var(--app-success-light)` |
| `#8b5cf6` | `var(--module-capitao-primary)` | `var(--app-purple)` |
| `#ffd700` | `var(--color-gold)` | `var(--app-gold)` |
| `#ef4444` | `var(--color-danger)` | `var(--app-danger)` |

### Espacamento (padding, margin, gap)

| Stitch | Admin | App |
|--------|-------|-----|
| `4px` | `var(--space-1)` | `var(--app-space-1)` |
| `8px` | `var(--space-2)` | `var(--app-space-2)` |
| `16px` | `var(--space-4)` | `var(--app-space-5)` |
| `24px` | `var(--space-6)` | `var(--app-space-8)` |

### Icones (FontAwesome → Material Icons)

| FontAwesome | Material Icons |
|-------------|----------------|
| `fa-trophy` | `emoji_events` |
| `fa-futbol` | `sports_soccer` |
| `fa-star` | `star` |
| `fa-user` | `person` |
| `fa-chart-line` | `trending_up` |

### Tailwind (Layout mantido, Tema convertido)

| Manter | Converter |
|--------|-----------|
| `flex`, `grid`, `items-center` | `bg-gray-900` → `.bg-surface` |
| `p-4`, `gap-2`, `w-full` | `bg-gray-800` → `.bg-card` |
| `sm:`, `md:`, `lg:` | `text-gray-400` → `.text-muted` |

---

## Configurar MCP Stitch

### 1. Setup

```bash
npx stitch-mcp-auto-setup
```

### 2. Configurar .mcp.json

Ja adicionado ao projeto:

```json
"stitch": {
    "command": "npx",
    "args": ["-y", "stitch-mcp-auto"],
    "env": {
        "GOOGLE_CLOUD_PROJECT": "SEU_PROJECT_ID"
    }
}
```

### 3. Verificar

```bash
claude mcp list | grep stitch
```

### Requisitos

- Node.js v18+
- Google Cloud CLI (`gcloud`)
- Conta Google com projeto GCP
- Stitch API habilitada no GCP

---

## Arquivos de Saida

### Admin
```
public/admin-[nome].html
public/css/admin-[nome].css
public/js/admin-[nome].js
```

### App Participante
```
public/participante/fronts/[nome].html
public/participante/modules/[nome]/[nome].css
public/participante/modules/[nome]/[nome].js
```

---

## Links Uteis

- **Skill Completa:** `docs/skills/03-utilities/stitch-adapter.md`
- **Prompt Stitch:** `.claude/STITCH-DESIGN-PROMPT.md`
- **Tokens Admin:** `public/css/_admin-tokens.css`
- **Tokens App:** `public/participante/css/_app-tokens.css`
- **MCP Config:** `.mcp.json`
- **Frontend Crafter:** `docs/skills/02-specialists/frontend-crafter.md`

---

**Versao:** 2.0 | **Atualizado:** 2026-02-10
