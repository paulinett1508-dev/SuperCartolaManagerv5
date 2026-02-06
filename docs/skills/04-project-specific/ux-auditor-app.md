# SKILL: UX Auditor App (Auditor de Experiencia do App Participante)

## Visao Geral

Auditoria completa e sistematica de **UI/UX, CSS, HTML, Design e Experiencia** do app do participante (PWA Mobile). Varre todas as telas, fragmentos, estilos, componentes e fluxos de navegacao do app participante para garantir consistencia visual, acessibilidade, performance e conformidade com o Design System.

**Escopo:** EXCLUSIVO para o app participante (`/public/participante/`). Para auditar admin, usar `auditor-module` ou `code-inspector`.

**Diferenca das outras skills:**
- `frontend-crafter` → **CRIA** telas/componentes
- `auditor-module` → Audita **1 modulo** (multidimensional: seguranca, financeiro, UI, etc.)
- `ux-auditor-app` → Audita **TODA a experiencia** do app participante (UI/UX/Design holistica)

---

## Quando Usar

1. **Revisao geral** do app participante antes de release
2. **Inconsistencias visuais** reportadas por usuarios
3. **Apos refatoracao** de CSS ou HTML de multiplas telas
4. **Onboarding de novo dev** para entender o estado atual do frontend
5. **Auditoria periodica** (recomendado: mensal)

---

## Arquitetura do App Participante

```
public/participante/
├── index.html              # Entry point (PWA shell)
├── manifest.json           # PWA config
├── service-worker.js       # Offline support
├── DESIGN_SYSTEM.md        # Referencia visual
│
├── css/                    # 13 arquivos CSS
│   ├── _app-tokens.css     # DESIGN TOKENS (fonte da verdade)
│   ├── participante.css    # Estilos globais
│   ├── bottom-sheet-nav.css
│   ├── splash-screen.css
│   ├── pull-refresh.css
│   ├── quick-access-bar.css
│   ├── avisos.css
│   ├── boas-vindas.css
│   ├── campinho.css
│   ├── copa-sc.css
│   ├── matchday.css
│   └── top10-destaque.css
│
├── fronts/                 # 18 fragmentos HTML (SPA)
│   ├── home.html
│   ├── ranking.html
│   ├── rodadas.html
│   ├── extrato.html
│   ├── top10.html
│   ├── melhor-mes.html
│   ├── pontos-corridos.html
│   ├── mata-mata.html
│   ├── campinho.html
│   ├── capitao.html
│   ├── artilheiro.html
│   ├── luva-ouro.html
│   ├── dicas.html
│   ├── live-results.html
│   ├── copa-times-sc.html
│   ├── configuracoes.html
│   ├── historico.html
│   └── boas-vindas.html
│
├── js/                     # Core + 26 modulos JS
│   ├── participante-navigation.js
│   ├── participante-cache.js
│   ├── participante-auth.js
│   └── modules/            # 1 JS por tela
│
└── modules/                # Legacy (ranking)
```

---

## Protocolo de Auditoria (7 Dimensoes)

### DIMENSAO 1: Design Tokens & Variaveis CSS

**Arquivo fonte da verdade:** `css/_app-tokens.css`

**Checklist:**
- [ ] Todas as cores usam variaveis `var(--app-*)` (NUNCA hardcoded `#FF4500`, `#1a1a1a`)
- [ ] Aliases legados (`--laranja`, `--bg-card`) apontam para tokens corretos
- [ ] Aliases `--participante-*` mapeados para `--app-*`
- [ ] Font families usam tokens: `--app-font-base`, `--app-font-brand`, `--app-font-mono`
- [ ] Espacamentos usam `--app-space-*` (nao valores px avulsos)
- [ ] Border radius usam `--app-radius-*`
- [ ] Sombras usam `--app-shadow-*`
- [ ] Z-index respeita camadas: content(1) < header(100) < nav(200) < overlay(500) < modal(600) < toast(700) < bottom-nav(1000)

**Red Flags:**
| Problema | Severidade | Como Detectar |
|----------|-----------|---------------|
| Cor hardcoded em CSS/HTML | ALTO | `grep -rn "#[0-9a-fA-F]{3,6}" --include="*.css" --include="*.html"` excluindo `_app-tokens.css` |
| `font-family` inline sem token | ALTO | `grep -rn "font-family:" --include="*.css"` fora do tokens |
| `px` sem token em spacing | MEDIO | Inspecionar padding/margin sem `var(--app-space-*)` |
| `z-index` arbitrario | ALTO | `grep -rn "z-index:" --include="*.css"` comparar com tokens |

---

### DIMENSAO 2: Tipografia (3 Fontes Obrigatorias)

**Regra:** O app usa 3 fontes com papeis distintos:

| Fonte | Token | Uso | Classe CSS |
|-------|-------|-----|------------|
| **Inter** | `--app-font-base` | Corpo de texto, paragrafos | (padrao, sem classe extra) |
| **Russo One** | `--app-font-brand` | Titulos, stats, badges, CTAs, nomes de destaque | `.font-brand`, `.app-brand-title`, `.app-brand-stat` |
| **JetBrains Mono** | `--app-font-mono` | Valores numericos (pontos, dinheiro, posicoes) | `.app-value-mono`, `.font-mono` |

**Checklist:**
- [ ] Google Fonts carregadas no `index.html` (Inter, Russo One, JetBrains Mono)
- [ ] Body usa Inter como fonte base
- [ ] Todos titulos de secao/modulo usam Russo One (`.font-brand` ou `.app-brand-title`)
- [ ] Valores numericos (pontos, R$, posicoes) usam JetBrains Mono
- [ ] Russo One NAO usa font-weight diferente de 400 (so tem 1 peso)
- [ ] `letter-spacing` usado para ajustar Russo One (nao font-weight)
- [ ] Forcadores `!important` em `_app-tokens.css` cobrem todos os seletores reais dos fragmentos
- [ ] Nenhum fragmento HTML usa `style="font-family:..."` inline

**Red Flags:**
| Problema | Severidade |
|----------|-----------|
| Titulo sem Russo One | ALTO |
| Valor numerico sem JetBrains Mono | MEDIO |
| Fonte nao carregada (FOUT/FOIT) | ALTO |
| Uso de Lexend (legado, substituido por Inter) | MEDIO |

---

### DIMENSAO 3: Dark Theme & Cores

**Principio:** OLED-first. Background principal `#0a0a0a`, surfaces `#1a1a1a`.

**Checklist:**
- [ ] Background principal: `var(--app-bg)` (#0a0a0a)
- [ ] Cards/containers: `var(--app-surface)` (#1a1a1a)
- [ ] Texto primario: `var(--app-text-primary)` (#ffffff)
- [ ] Texto secundario: `var(--app-text-secondary)` (rgba 85%)
- [ ] Texto muted: `var(--app-text-muted)` (rgba 60%)
- [ ] Cor primaria (laranja): `var(--app-primary)` (#FF5500)
- [ ] Sucesso/positivo: `var(--app-success)` ou `var(--app-success-light)` (verde)
- [ ] Erro/negativo: `var(--app-danger)` (vermelho)
- [ ] Alerta: `var(--app-warning)` (amarelo)
- [ ] Ranking: ouro `var(--app-gold)`, prata `var(--app-silver)`, bronze `var(--app-bronze)`
- [ ] Nenhum background branco ou cinza claro em nenhuma tela
- [ ] Bordas usam `var(--app-border-subtle)` ou `var(--app-border-default)`
- [ ] Contraste texto vs background >= 4.5:1 (WCAG AA)

**Cores por Modulo (quando aplicavel):**
| Modulo | Cor Primaria | Variavel |
|--------|-------------|----------|
| Artilheiro | Verde #22c55e | `--module-artilheiro-primary` |
| Capitao | Roxo #8b5cf6 | `--module-capitao-primary` |
| Luva de Ouro | Dourado #ffd700 | `--module-luva-primary` |

---

### DIMENSAO 4: Responsividade & Mobile-First

**Principio:** App participante eh 100% mobile-first. Desktop eh bonus.

**Viewports de teste:**
- 360x640 (Android pequeno)
- 375x812 (iPhone X/11/12)
- 390x844 (iPhone 13/14)
- 414x896 (iPhone XR/11)
- 768x1024 (Tablet - bonus)

**Checklist:**
- [ ] Nenhum overflow horizontal em 360px
- [ ] Touch targets minimo 44px (`--app-touch-target`)
- [ ] Bottom nav nao sobrepoe conteudo (padding-bottom compensado)
- [ ] FAB (Floating Action Button) nao sobrepoe bottom nav
- [ ] Tabelas usam `overflow-x-auto` ou layout alternativo mobile
- [ ] Imagens/escudos usam `max-width: 100%`
- [ ] Textos nao truncam sem `text-overflow: ellipsis` quando necessario
- [ ] Safe areas respeitadas: `env(safe-area-inset-bottom)` e `env(safe-area-inset-top)`
- [ ] Font sizes ajustam via media queries (breakpoints em `_app-tokens.css`)
- [ ] Grid de atalhos funciona em 4 colunas sem quebra

---

### DIMENSAO 5: Estados Visuais (UX Completo)

Toda tela/componente DEVE ter 5 estados visuais:

| Estado | Descricao | Implementacao Esperada |
|--------|-----------|----------------------|
| **Loading** | Dados carregando | Spinner `.app-spinner` ou skeleton |
| **Sucesso** | Dados renderizados | Tela normal com dados |
| **Vazio** | Sem dados | Mensagem amigavel + icone + CTA |
| **Erro** | Falha na API | Mensagem de erro + botao "Tentar novamente" |
| **Offline** | Sem internet | Dados do cache + indicador offline |

**Checklist por Fragmento (fronts/*.html):**
- [ ] `home.html` - 5 estados implementados
- [ ] `ranking.html` - 5 estados implementados
- [ ] `rodadas.html` - 5 estados implementados
- [ ] `extrato.html` - 5 estados implementados
- [ ] `top10.html` - 5 estados implementados
- [ ] `melhor-mes.html` - 5 estados implementados
- [ ] `pontos-corridos.html` - 5 estados implementados
- [ ] `mata-mata.html` - 5 estados implementados
- [ ] `campinho.html` - 5 estados implementados
- [ ] `capitao.html` - 5 estados implementados
- [ ] `artilheiro.html` - 5 estados implementados
- [ ] `luva-ouro.html` - 5 estados implementados
- [ ] `dicas.html` - 5 estados implementados
- [ ] `live-results.html` - 5 estados implementados
- [ ] `copa-times-sc.html` - 5 estados implementados
- [ ] `configuracoes.html` - 5 estados implementados
- [ ] `historico.html` - 5 estados implementados
- [ ] `boas-vindas.html` - 5 estados implementados

---

### DIMENSAO 6: Navegacao & Fluxos SPA

**Checklist:**
- [ ] Bottom nav com 4 itens fixos (Inicio, Ranking, Menu, Financeiro)
- [ ] Item ativo destacado com `var(--app-primary)` (laranja)
- [ ] Navegacao via `participante-navigation.js` (nao links `<a>` diretos)
- [ ] `window.history.pushState` funciona (botao voltar do browser)
- [ ] `popstate` listener intercepta voltar
- [ ] Transicoes entre telas suaves (fade ou slide)
- [ ] Scroll reseta ao topo ao trocar de tela
- [ ] Deep links (`#ranking`, `#extrato`) funcionam ao abrir app
- [ ] Pull-to-refresh implementado (`pull-refresh.js`)
- [ ] Splash screen exibida na primeira visita
- [ ] Glass overlay exibido em reloads

**Fluxo Critico - Pre-Temporada:**
- [ ] Estado de pre-temporada detectado e comunicado visualmente
- [ ] Telas financeiras funcionam em pre-temporada
- [ ] Modulos desativados mostram mensagem (nao tela vazia)

---

### DIMENSAO 7: PWA, Performance & Acessibilidade

**PWA:**
- [ ] `manifest.json` com `name`, `short_name`, `icons`, `theme_color`, `background_color`
- [ ] `theme_color` consistente com `--app-bg` (#0a0a0a)
- [ ] Service Worker registrado e funcional
- [ ] App instalavel (Add to Home Screen)
- [ ] Icones em multiplas resolucoes (192px, 512px)

**Performance:**
- [ ] CSS carrega antes do JS (ordem no `<head>`)
- [ ] `_app-tokens.css` eh o PRIMEIRO CSS carregado
- [ ] Nenhum `@import` em CSS (usar `<link>` no HTML)
- [ ] Animacoes usam `transform`/`opacity` (nao `top`/`left`/`width`)
- [ ] `will-change` em elementos animados frequentes
- [ ] `prefers-reduced-motion` respeitado (definido em tokens)
- [ ] Imagens com `loading="lazy"` onde aplicavel
- [ ] Escudos com `onerror="this.src='/escudos/default.png'"` (fallback)

**Acessibilidade (A11y):**
- [ ] Botoes com `aria-label` quando so tem icone
- [ ] Contraste minimo 4.5:1 (WCAG AA)
- [ ] Focus visible em elementos interativos
- [ ] Navegacao por teclado funcional (tab order)
- [ ] `alt` em imagens significativas
- [ ] `role` em elementos semanticos customizados

**Icones:**
- [ ] Usando Material Icons (`material-icons` ou `material-symbols-outlined`)
- [ ] NUNCA emojis como icones (usar Material Icons)
- [ ] NUNCA Font Awesome (migrado para Material Icons)
- [ ] Tamanho base consistente (20-24px)

---

## Modos de Execucao

### Auditoria Completa (todas as 7 dimensoes)
```
auditar UX do app participante
```
Executa TODAS as 7 dimensoes. Gera relatorio completo.

### Auditoria por Dimensao
```
auditar tokens do app participante
auditar tipografia do app
auditar dark mode do participante
auditar responsividade do app
auditar estados visuais do app
auditar navegacao do app
auditar PWA e acessibilidade do app
```

### Auditoria por Tela Especifica
```
auditar UX da tela de ranking do participante
auditar design do extrato no app
```
Audita TODAS as 7 dimensoes, mas APENAS na tela especificada.

### Comparacao de Telas
```
comparar UX do ranking com extrato no app
```
Compara consistencia visual entre duas telas.

---

## Workflow de Auditoria

### Passo 1: Carregar Referencia
```
Ler: css/_app-tokens.css (fonte da verdade)
Ler: DESIGN_SYSTEM.md (referencia visual)
```

### Passo 2: Varrer Fragmentos HTML
```
Para cada fronts/*.html:
  - Verificar estrutura HTML
  - Buscar classes CSS usadas
  - Detectar estilos inline
  - Verificar iconografia
```

### Passo 3: Varrer Arquivos CSS
```
Para cada css/*.css:
  - Buscar cores hardcoded
  - Verificar uso de tokens
  - Analisar media queries
  - Verificar z-index
```

### Passo 4: Varrer Modulos JS (UI)
```
Para cada js/modules/*.js:
  - Buscar innerHTML com estilos inline
  - Verificar estados (loading, error, empty)
  - Verificar manipulacao de classes CSS
```

### Passo 5: Gerar Relatorio

---

## Formato do Relatorio

```markdown
# AUDITORIA UX: App Participante
**Data:** DD/MM/AAAA
**Modo:** Completa | Dimensao X | Tela Y

---

## Resumo Executivo

| Dimensao | Score | Status |
|----------|-------|--------|
| 1. Design Tokens | X/Y | Aprovado/Warnings/Critico |
| 2. Tipografia | X/Y | Aprovado/Warnings/Critico |
| 3. Dark Theme | X/Y | Aprovado/Warnings/Critico |
| 4. Responsividade | X/Y | Aprovado/Warnings/Critico |
| 5. Estados Visuais | X/Y | Aprovado/Warnings/Critico |
| 6. Navegacao SPA | X/Y | Aprovado/Warnings/Critico |
| 7. PWA/A11y | X/Y | Aprovado/Warnings/Critico |

**Score Geral:** XX/100
**Telas Auditadas:** N de 18

---

## Issues Encontrados

### CRITICOS (bloquear release)
1. [Dimensao] Arquivo:linha - Descricao - Correcao sugerida

### ALTOS (corrigir antes de producao)
1. [Dimensao] Arquivo:linha - Descricao - Correcao sugerida

### MEDIOS (corrigir no sprint)
1. [Dimensao] Arquivo:linha - Descricao - Correcao sugerida

### BAIXOS (backlog)
1. [Dimensao] Arquivo:linha - Descricao - Correcao sugerida

---

## Telas Detalhadas

### home.html
| Dimensao | Status | Observacao |
|----------|--------|------------|
| Tokens | OK/NOK | ... |
| Tipografia | OK/NOK | ... |
| ... | ... | ... |

(repetir para cada tela auditada)

---

## Acoes Recomendadas (Priorizadas)
1. ...
2. ...

---

**Auditoria realizada por:** [IA]
**Proxima auditoria recomendada:** DD/MM/AAAA
```

---

## Severidades

| Nivel | Criterio | Exemplos |
|-------|----------|----------|
| CRITICO | Quebra visual, app inutilizavel | Overflow, texto invisivel, nav quebrada |
| ALTO | Inconsistencia grave, UX prejudicada | Cor hardcoded, fonte errada, sem loading state |
| MEDIO | Inconsistencia menor, nao impede uso | Spacing irregular, z-index fora do padrao |
| BAIXO | Nice to have, polimento | A11y menor, animacao faltante |

---

## Score de Conformidade

```
Score = (Checks Passed / Total Checks) * 100
```

| Faixa | Classificacao |
|-------|---------------|
| 90-100% | Excelente - Pronto para release |
| 70-89% | Bom - Corrigir warnings antes de release |
| 50-69% | Regular - Precisa melhorias significativas |
| < 50% | Critico - NAO fazer release |

---

## Comandos de Busca Uteis

```bash
# Cores hardcoded em CSS (excluindo tokens)
grep -rn --include="*.css" "#[0-9a-fA-F]\{3,6\}" public/participante/css/ | grep -v "_app-tokens.css"

# Cores hardcoded em HTML
grep -rn --include="*.html" "style=.*#[0-9a-fA-F]" public/participante/fronts/

# Font-family fora dos tokens
grep -rn --include="*.css" "font-family:" public/participante/css/ | grep -v "_app-tokens.css"

# z-index fora dos tokens
grep -rn --include="*.css" "z-index:" public/participante/css/ | grep -v "_app-tokens.css"

# innerHTML com style inline em JS
grep -rn "innerHTML.*style=" public/participante/js/

# Emojis em HTML (nao deveria ter como icones)
grep -rn --include="*.html" "[^\x00-\x7F]" public/participante/fronts/

# Font Awesome residual
grep -rn "fa-\|font-awesome\|fontawesome" public/participante/

# Estados de loading nos modulos JS
grep -rn "loading\|spinner\|skeleton" public/participante/js/modules/

# Estados de erro nos modulos JS
grep -rn "error\|erro\|falha\|showError" public/participante/js/modules/

# Estados vazios nos modulos JS
grep -rn "empty\|vazio\|nenhum\|sem dados" public/participante/js/modules/
```

---

## Combinacoes com Outras Skills

| Cenario | Sequencia |
|---------|-----------|
| Auditoria + correcao | `ux-auditor-app` → `frontend-crafter` |
| Auditoria pos-refatoracao | `Refactor-Monolith` → `ux-auditor-app` |
| Auditoria pre-release | `ux-auditor-app` → `cache-auditor` → `code-inspector` |
| Auditoria de modulo especifico (completa) | `auditor-module` (backend) + `ux-auditor-app --tela X` (frontend) |

---

**Ultima atualizacao:** 06/02/2026
**Versao:** 1.0.0
**Autor:** Sistema Super Cartola Manager
