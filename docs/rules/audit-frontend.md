# AUDIT RULE: Frontend Anti-Frankenstein

## Objetivo
Prevenir a criacao de codigo frontend "Frankenstein" - CSS/HTML que nasce sem governanca, duplica o que ja existe, ignora tokens, viola convencoes e cria divida tecnica.

**Tipo:** PREVENTIVA (roda ANTES de criar/modificar, nao depois)

---

## Regras Absolutas (Zero Tolerancia)

### R1. NUNCA criar arquivo CSS sem consultar o registry
```
ANTES: "Vou criar um novo .css para isso"
CORRETO: Consultar config/css-registry.json → ja existe CSS para isso?
```

**Checklist:**
- [ ] Verificou css-registry.json para arquivo existente
- [ ] Se existe: edita o existente (nao cria novo)
- [ ] Se nao existe: justifica por que precisa de novo arquivo
- [ ] Atualizou css-registry.json apos criar

### R2. NUNCA usar cor hardcoded
```css
/* PROIBIDO */
color: #ef4444;
background: rgba(255, 85, 0, 0.1);
border: 1px solid #333;

/* OBRIGATORIO */
color: var(--color-danger);
background: var(--color-primary-muted);
border: var(--border-subtle);
```

**Tokens disponiveis:** `_admin-tokens.css` (admin) | `_app-tokens.css` (app)

**Se o token nao existe:** Primeiro criar o token no arquivo de tokens, depois usar `var()`.

### R3. NUNCA definir @keyframes local se ja existe nos tokens
```
Keyframes centralizados em _admin-tokens.css:
- spin, admin-spin
- pulse, admin-pulse
- fadeIn, admin-fade-in
- slideUp, admin-fade-in-up
- pulse-live

Se o modulo carrega tokens (via admin-shell.css ou link direto):
→ NAO redefinir esses keyframes
→ Referenciar pelo nome generico: animation: spin 1s linear infinite;
```

### R4. NUNCA usar inline styles em HTML
```html
<!-- PROIBIDO -->
<div style="color: white; background: #1a1a2e; padding: 1rem;">

<!-- OBRIGATORIO -->
<div class="admin-tools-bar">
```

**Unica excecao:** `style` em elementos criados dinamicamente via JS quando a classe seria single-use.

### R5. NUNCA duplicar seletores CSS entre arquivos
```
ANTES de criar .btn-primary, .card, .alert, .badge, .empty-state:
→ grep -r "\.btn-primary" public/css/
→ Se ja existe: REUSAR, nao redefinir

Se precisa de variante: usar modificador (.btn-primary--large) no mesmo arquivo.
```

### R6. NUNCA criar CSS sem escopo (namespace)
```css
/* PERIGOSO - vaza para todo o SPA */
.header { ... }
.card { ... }
.btn { ... }

/* SEGURO - escopado ao modulo */
.orch-page .orch-header { ... }
.tesouraria-module .card { ... }
.artilheiro-container .btn { ... }
```

**Regra de escopo:**
- Paginas standalone (*.html proprio): pode usar seletores globais
- Modulos SPA (carregados via JS): OBRIGATORIO prefixo `.modulo-` ou `.page-`

---

## Checklist Pre-Criacao (5 Checkpoints)

### CHECK 1: Ja Existe?
```bash
# Buscar CSS existente para o conceito
grep -rn "nome-do-conceito" public/css/ public/participante/css/
# Buscar classe similar
grep -rn "\.classe-similar" public/css/ public/participante/css/
# Consultar registry
cat config/css-registry.json | grep "conceito"
```
**Se encontrou:** Editar o existente. NAO criar novo.

### CHECK 2: Onde Vive?
| Contexto | Diretorio | Token File |
|----------|-----------|------------|
| Admin desktop | `public/css/modules/` | `_admin-tokens.css` |
| App participante | `public/participante/css/` | `_app-tokens.css` |
| Admin mobile | `public/admin-mobile/css/` | `dark-mode.css` |

### CHECK 3: Usa Tokens?
```
Para TODA cor, sombra, radius, espacamento, fonte, transicao:
→ Existe var(--token) no arquivo de tokens?
  SIM → usar var(--token)
  NAO → criar token primeiro, depois usar
```

**Tokens obrigatorios por tipo:**
| Tipo | Tokens | Exemplo |
|------|--------|---------|
| Cor de fundo | `--surface-*` | `var(--surface-card)` |
| Cor de texto | `--text-*` | `var(--text-primary)` |
| Cor de status | `--color-success/danger/warning/info` | `var(--color-danger)` |
| Cor de modulo | `--module-{nome}-*` | `var(--module-artilheiro-primary)` |
| Border radius | `--radius-*` | `var(--radius-md)` |
| Sombra | `--shadow-*` | `var(--shadow-sm)` |
| Transicao | `--transition-*` | `var(--transition-fast)` |
| Fonte | `--font-family-*` | `var(--font-family-brand)` |
| Espacamento | `--space-*` | `var(--space-4)` |

### CHECK 4: Segue Convencoes?
- [ ] Nome do arquivo em kebab-case
- [ ] Header com comentario JSDoc (nome, dependencia, proposito)
- [ ] Seletores escopados se modulo SPA
- [ ] Sem `!important` (exceto override de terceiros)
- [ ] Sem `@keyframes` local se tokens disponivel
- [ ] Sem tag selectors genericos (`h1 {}`, `p {}`, `a {}`) - escopar
- [ ] Media queries usando breakpoints dos tokens

### CHECK 5: E Necessario?
```
Justificativas VALIDAS para novo arquivo CSS:
- Novo modulo do sistema (artilheiro, mata-mata, etc.)
- Nova pagina HTML standalone
- Componente reutilizavel com 50+ linhas de CSS

Justificativas INVALIDAS:
- "Preciso de uns ajustes" → editar arquivo existente
- "Quero separar" → so se o arquivo atual tem 500+ linhas
- "E mais organizado" → consistencia > organizacao pessoal
```

---

## Red Flags (Deteccao Automatica)

| Padrao | Severidade | Significado |
|--------|-----------|-------------|
| `style="` em HTML admin | CRITICO | Inline style proibido |
| `#[0-9a-f]{3,8}` em CSS | CRITICO | Cor hardcoded |
| `rgb(` / `rgba(` sem `var()` | CRITICO | Cor hardcoded |
| `@keyframes spin` em modulo | ALTO | Duplicacao de keyframe |
| `@keyframes fadeIn` em modulo | ALTO | Duplicacao de keyframe |
| `.btn {` sem escopo | MEDIO | Seletor global vazando |
| `!important` | MEDIO | Override forcado |
| `font-family:` sem `var()` | MEDIO | Fonte hardcoded |
| Arquivo CSS novo sem entry no registry | ALTO | Fora do manifesto |

---

## Template para Novo Arquivo CSS

```css
/**
 * [NOME DO MODULO] - CSS Module
 * [Descricao breve]
 *
 * Dependencia: _admin-tokens.css (ou _app-tokens.css)
 * Carregado por: [pagina.html]
 */

/* ========================================
   Variaveis Locais (se necessario)
   ======================================== */
:root {
    --modulo-accent: var(--module-NOME-primary);
    --modulo-accent-dark: var(--module-NOME-dark);
}

/* ========================================
   Layout Principal
   ======================================== */
.modulo-container {
    background: var(--surface-bg);
    /* ... */
}
```

---

## Fluxo de Decisao

```
Preciso de CSS?
    │
    ├─ E ajuste em algo existente?
    │   └─ SIM → Editar arquivo existente. FIM.
    │
    ├─ Ja existe CSS para esse conceito?
    │   └─ SIM → Editar o existente. FIM.
    │
    ├─ E componente reutilizavel (50+ linhas)?
    │   ├─ SIM → Criar em modules/ ou participante/css/
    │   └─ NAO → Adicionar ao CSS mais proximo. FIM.
    │
    └─ Criar novo arquivo:
        1. Usar template acima
        2. Seguir naming convention
        3. Escopar seletores
        4. Usar APENAS tokens
        5. Atualizar css-registry.json
        6. Registrar em SKILL-KEYWORD-MAP se for skill
```

---

## Referencias
- `config/css-registry.json` → Manifesto de arquivos CSS
- `public/css/_admin-tokens.css` → Tokens admin
- `public/participante/css/_app-tokens.css` → Tokens app
- `docs/rules/audit-ui.md` → Checklist de auditoria UI (pos-implementacao)
- `docs/guides/TOKENS-GUIA.md` → Guia completo de uso de tokens
- `CLAUDE.md` → Regras do projeto

---

**Versao:** 1.0.0
**Criado:** 2026-02-15
