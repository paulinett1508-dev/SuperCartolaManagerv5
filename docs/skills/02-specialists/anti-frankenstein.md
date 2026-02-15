---
name: anti-frankenstein
description: >
  Guardiao de governanca frontend. Checkpoint obrigatorio ANTES de criar ou modificar
  CSS, HTML, inline styles, componentes visuais ou qualquer codigo de apresentacao.
  Previne duplicacao, hardcoded colors, keyframes orfaos, inline styles e criacao
  desgovernada de arquivos. Keywords: blindar frontend, anti-frankenstein, validar CSS,
  checar antes de criar, governanca CSS, prevenir duplicacao, revisar criacao.
allowed-tools: Read, Glob, Grep, Bash, TodoWrite
---

# Anti-Frankenstein: Guardiao de Frontend

## Proposito

Impedir que codigo frontend "crie vida propria" - CSS que nasce sem consultar o que ja existe, HTML com inline styles, keyframes duplicados, cores hardcoded, componentes reinventados.

**Quando ativar:**
- ANTES de criar qualquer arquivo CSS novo
- ANTES de adicionar classes/seletores CSS
- ANTES de criar componentes HTML com estilos
- ANTES de definir @keyframes em qualquer modulo
- ANTES de usar cor, fonte, sombra, radius em CSS
- Quando detectar `style=` em HTML admin

**Relacao com outras skills:**
- `frontend-crafter` CRIA interfaces → `anti-frankenstein` VALIDA antes
- `code-inspector` AUDITA codigo existente → `anti-frankenstein` PREVINE problemas
- `auditor-module` VERIFICA conformidade pos-facto → `anti-frankenstein` age pre-facto

---

## Protocolo de 5 Checkpoints

### CHECKPOINT 1: JA EXISTE?

**Objetivo:** Nunca criar o que ja esta no codebase.

```bash
# 1. Consultar o manifesto centralizado
Read config/css-registry.json

# 2. Buscar CSS existente para o conceito
Grep "conceito-ou-classe" public/css/ --recursive
Grep "conceito-ou-classe" public/participante/css/ --recursive

# 3. Buscar HTML com componente similar
Grep "componente-similar" public/*.html public/fronts/*.html --recursive
```

**Decisao:**
- ENCONTROU classe/componente similar? → **REUSAR**, nao criar novo
- ENCONTROU arquivo CSS para o contexto? → **EDITAR**, nao criar novo
- NAO encontrou nada? → Prosseguir para Checkpoint 2

---

### CHECKPOINT 2: ONDE DEVE VIVER?

**Objetivo:** Todo CSS tem um lugar certo. Nunca "avulso".

| Pergunta | Resposta | Destino |
|----------|----------|---------|
| E para o admin desktop? | Sim | `public/css/modules/{nome}.css` |
| E para o app participante? | Sim | `public/participante/css/{nome}.css` |
| E para o admin mobile? | Sim | `public/admin-mobile/css/{nome}.css` |
| E um token/variavel nova? | Sim | `_admin-tokens.css` ou `_app-tokens.css` |
| E um componente do SPA admin? | Sim | Escopar com `.modulo-page .classe` |
| E uma pagina standalone? | Sim | Pode ter CSS proprio, mas COM tokens |

**Hierarquia de carregamento (ordem OBRIGATORIA):**
1. Tokens (`_admin-tokens.css` / `_app-tokens.css`)
2. Base/Shell (`admin-shell.css` / `style.css`)
3. Modulo page-specific

---

### CHECKPOINT 3: USA TOKENS?

**Objetivo:** Zero cores hardcoded. Zero fontes hardcoded. Zero valores magicos.

**Verificacao obrigatoria para cada propriedade CSS:**

```
COR (color, background, border-color, fill, stroke):
→ Existe var(--token) em _admin-tokens.css?
  SIM → usar var(--token)
  NAO → CRIAR o token primeiro, depois usar

FONTE (font-family):
→ OBRIGATORIO: var(--font-family-base), var(--font-family-brand), var(--font-family-mono)
  NUNCA: 'Inter', sans-serif (hardcoded)

RAIO (border-radius):
→ OBRIGATORIO: var(--radius-sm/md/lg/xl/2xl/full)
  NUNCA: 8px, 12px, 50% (hardcoded)

SOMBRA (box-shadow):
→ OBRIGATORIO: var(--shadow-sm/md/lg/xl)
  NUNCA: 0 4px 16px rgba(0,0,0,0.3) (hardcoded)

TRANSICAO (transition):
→ OBRIGATORIO: var(--transition-fast/normal/slow)

ESPACAMENTO (padding, margin, gap):
→ PREFERIDO: var(--space-1 a --space-12)
  ACEITAVEL: rem/px direto (espacamento e mais flexivel)
```

**Tokens disponiveis (referencia rapida):**

| Categoria | Exemplos de tokens |
|-----------|-------------------|
| Cores primarias | `--color-primary`, `--color-primary-dark`, `--color-primary-muted` |
| Superficies | `--surface-bg`, `--surface-card`, `--surface-card-elevated` |
| Overlays | `--surface-overlay`, `--surface-overlay-subtle/light/medium` |
| White overlays | `--surface-white-10/20/80` |
| Status | `--color-success/danger/warning/info` + variantes `-dark/-muted/-text` |
| Hover BG | `--color-primary-hover-bg`, `--color-danger-hover-bg(-strong)` |
| Neutro | `--color-neutral-bg`, `--color-neutral-bg-strong` |
| Ranking | `--color-gold/silver/bronze` + `-muted` |
| Texto | `--text-primary/secondary/muted/disabled/inverse` |
| Modulos | `--module-artilheiro/capitao/luva/saude-*` |
| Gradientes | `--gradient-primary`, `--gradient-dark`, `--gradient-card` |
| Bordas | `--border-subtle`, `--border-default`, `--border-strong` |
| Info | `--color-info`, `--color-info-dark`, `--color-info-border` |

---

### CHECKPOINT 4: SEGUE CONVENCOES?

**Objetivo:** Padrao unico, sem "estilo pessoal".

**Checklist obrigatorio:**

```markdown
- [ ] Nome do arquivo em kebab-case (admin-tesouraria.css, nao AdminTesouraria.css)
- [ ] Header com comentario JSDoc:
      /**
       * NOME - CSS Module
       * Descricao
       * Dependencia: _admin-tokens.css
       */
- [ ] Seletores escopados se modulo SPA (.modulo-page .classe)
- [ ] Sem !important (exceto override Bootstrap/terceiros)
- [ ] Sem @keyframes local se tokens define (spin, pulse, fadeIn, slideUp, pulse-live)
- [ ] Sem tag selectors genericos (h1{}, p{}, a{}) - sempre escopar
- [ ] Sem style="" em HTML (extrair para classe CSS)
- [ ] Sem onmouseover/onmouseout em HTML (usar :hover em CSS)
- [ ] Media queries usando breakpoints padrao (480, 768, 1024, 1400, 1600px)
- [ ] Variaveis locais (:root) referenciam tokens globais:
      --modulo-accent: var(--module-NOME-primary);  /* CORRETO */
      --modulo-accent: #8b5cf6;                     /* PROIBIDO */
```

---

### CHECKPOINT 5: E NECESSARIO?

**Objetivo:** Minimalismo. Codigo que nao existe nao tem bug.

**Criterios de criacao:**

| Acao | Criterio | Exemplo |
|------|----------|---------|
| Novo arquivo CSS | Modulo novo OU pagina standalone OU componente 50+ linhas | `admin-tesouraria.css` para modulo novo |
| Nova classe CSS | Reutilizada 2+ vezes OU 3+ propriedades | `.admin-tools-bar` com 6 propriedades |
| Nova variavel CSS | Valor usado 3+ vezes no mesmo arquivo | `--modulo-accent: var(--module-capitao-primary)` |
| Novo token global | Valor usado em 2+ arquivos diferentes | `--surface-white-10` usado em consolidacao + outros |

**NAO criar se:**
- Ajuste pontual → editar CSS existente
- Menos de 3 propriedades → usar classes utilitarias/tokens
- Unico uso → inline aceitavel APENAS em JS dinamico
- "Organizacao pessoal" → consistencia > preferencia

---

## Pos-Checkpoint: Registro Obrigatorio

Apos criar qualquer CSS novo, OBRIGATORIO:

1. **Atualizar `config/css-registry.json`** com nova entrada
2. **Adicionar header JSDoc** no arquivo CSS
3. **Documentar em qual HTML** o CSS e carregado

```json
// Adicionar ao css-registry.json
{
  "path": "public/css/modules/novo-modulo.css",
  "loadedBy": ["pagina.html"],
  "description": "Descricao do modulo"
}
```

---

## Exemplos de Violacoes Comuns

### Violacao 1: "Criar CSS rapido"
```css
/* ERRADO - arquivo novo sem necessidade */
/* novo-estilo.css */
.meu-botao { background: #FF5500; border-radius: 8px; }
```
**Correcao:** Usar token `var(--color-primary)` + `var(--radius-md)` no CSS existente do modulo.

### Violacao 2: "Inline style porque e rapido"
```html
<!-- ERRADO -->
<div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 1rem;">
```
**Correcao:** Criar classe `.admin-tools-bar` no CSS do modulo, usando tokens.

### Violacao 3: "Meu proprio spin"
```css
/* ERRADO - redefinindo keyframe que tokens ja tem */
@keyframes spin { to { transform: rotate(360deg); } }
```
**Correcao:** Remover. Tokens ja define `spin`. Usar `animation: spin 1s linear infinite;`.

### Violacao 4: "Cor parecida mas nao igual"
```css
/* ERRADO - cor nao esta nos tokens */
background: rgba(107, 114, 128, 0.15);
```
**Correcao:** Verificar tokens → existe `--color-neutral-bg`. Usar `var(--color-neutral-bg)`.

### Violacao 5: "Classe generica sem escopo"
```css
/* ERRADO - .card vaza para todo o SPA */
.card { background: var(--surface-card); }
```
**Correcao:** Escopar: `.meu-modulo .card { ... }` ou `.meu-modulo-card { ... }`

---

## Integracao com Workflow

```
Solicitacao de frontend
    |
    v
[anti-frankenstein] ← CHECKPOINT OBRIGATORIO
    |
    ├─ 5 checks passaram?
    |   └─ SIM → Prosseguir com frontend-crafter ou code
    |
    └─ Algum check falhou?
        └─ PARAR. Corrigir antes de prosseguir.
            - Check 1 falhou → Reusar existente
            - Check 2 falhou → Mover para lugar certo
            - Check 3 falhou → Criar token primeiro
            - Check 4 falhou → Ajustar convencoes
            - Check 5 falhou → Nao criar, editar existente
```

---

## Arquivos de Referencia

| Arquivo | Proposito |
|---------|-----------|
| `config/css-registry.json` | Manifesto de TODOS os CSS (fonte da verdade) |
| `public/css/_admin-tokens.css` | Tokens admin (cores, fontes, animacoes) |
| `public/participante/css/_app-tokens.css` | Tokens app mobile |
| `docs/rules/audit-frontend.md` | Checklist detalhado com red flags |
| `docs/rules/audit-ui.md` | Auditoria UI pos-implementacao |
| `docs/guides/TOKENS-GUIA.md` | Guia completo de tokens |
| `CLAUDE.md` | Regras absolutas do projeto |

---

**Versao:** 1.0.0
**Criado:** 2026-02-15
**Mantra:** "Se nao consultou o registro, nao pode criar."
