# Tarefas Pendentes - Super Cartola Manager

## Status Atual

**Nenhuma tarefa pendente de alta prioridade.**

---

## Concluído - Sessão 2025-12-18

### Banner de Boas-Vindas com Resumo 2025 (100% Completo)
- [x] Adicionar banner no `boas-vindas.html` mostrando resumo de 2025
- [x] Exibir posição final, badges conquistados
- [x] Mostrar saldo financeiro de 2025
- [x] Indicador de temporada atual no header da saudação

**Arquivos modificados:**
- `public/participante/js/modules/participante-boas-vindas.js` (v9.0)

### Seletor de Temporada Global (100% Completo)
- [x] Criar componente de seletor de ano (2025/2026)
- [x] Persistir preferência no localStorage
- [x] Indicador visual de modo histórico
- [x] Integrar no header secundário do App

**Arquivos criados/modificados:**
- `public/participante/js/participante-config.js` (novo)
- `public/participante/js/participante-season-selector.js` (novo)
- `public/participante/index.html` (header atualizado)

### Hall da Fama / Histórico do Participante (100% Completo)
- [x] Criar rota backend `/api/participante/historico/:timeId`
- [x] Criar tela `public/participante/fronts/historico.html`
- [x] Criar módulo `public/participante/js/modules/participante-historico.js`
- [x] Adicionar "Hall da Fama" no menu de navegação do App
- [x] Exibir badges conquistados (campeão, vice, top10 mito/mico)
- [x] Exibir saldo financeiro de temporadas anteriores
- [x] Criar seletor de temporada (2025, 2026...)

**Arquivos criados/modificados:**
- `routes/participante-historico-routes.js` (nova rota)
- `public/participante/fronts/historico.html` (nova tela)
- `public/participante/js/modules/participante-historico.js` (novo módulo)
- `public/participante/js/participante-navigation.js` (menu atualizado)
- `index.js` (registro da rota)

---

## Concluído - Sessão 2025-12-17

### Sistema de Design Tokens (100% Completo)
- [x] Criar `public/css/_admin-tokens.css` com variáveis CSS centralizadas
- [x] Criar `public/participante/css/_app-tokens.css` para o App
- [x] Criar documentação `docs/TOKENS-GUIA.md`
- [x] Integrar tokens em `public/layout.html`
- [x] Integrar tokens em `public/participante/index.html`
- [x] Migrar `public/css/base.css` para usar tokens
- [x] Migrar `public/participante/css/participante.css` para usar tokens
- [x] Remover `@keyframes spin` duplicados dos módulos CSS do Admin (13 arquivos)

### Migração de 16 Páginas Admin (100% Completo)
- [x] `admin-consolidacao.html`
- [x] `admin.html`
- [x] `convite.html`
- [x] `criar-liga.html`
- [x] `editar-liga.html`
- [x] `ferramentas.html`
- [x] `ferramentas-rodadas.html`
- [x] `fluxo-financeiro.html`
- [x] `gerir-senhas-participantes.html`
- [x] `gestao-renovacoes.html`
- [x] `index.html`
- [x] `migrar-localstorage-mongodb.html`
- [x] `painel.html`
- [x] `participante-dashboard.html`
- [x] `participante-login.html`
- [x] `preencher-liga.html`

### Gestão de Ligas - Padronização CSS
- [x] Criar `public/css/modules/gerenciar.css` (CSS consolidado)
- [x] Migrar `public/gerenciar.html` para usar tokens (removeu 359 linhas inline)
- [x] Migrar `public/gerenciar-modulos.html` para usar tokens (removeu 394 linhas inline)
- [x] Migrar `public/detalhe-liga.html` para usar tokens
- [x] Atualizar `public/detalhe-liga.css` para mapear variáveis para tokens globais
- [x] Padronizar dimensões de cards (grid 220px, padding var(--space-4), border-radius var(--radius-card))

### Hub de Gestão - Refatoração Layout
- [x] Limpar Sidebar - manter apenas navegação global
- [x] Remover seções de estatísticas (Mitos/Micos) do detalhe-liga.html
- [x] Adicionar "Administração da Liga" com ferramentas admin

### Ferramenta Gemini Audit
- [x] Corrigir `gemini_audit.py` (modelo atualizado para gemini-2.5-flash)
- [x] Adicionar retry com exponential backoff para rate limits

---

## Commits Recentes
1. `e798499` - refactor(css): Standardize Gestão de Ligas with design tokens
2. `894ffbd` - docs: Update project documentation and add Gemini audit tool
3. `bc5ce51` - refactor(css): Add design tokens system for Admin and App

---

## Arquivos de Referência
| Arquivo | Descrição |
|---------|-----------|
| `public/css/_admin-tokens.css` | Tokens do Admin (cores, espaçamento, sombras) |
| `public/participante/css/_app-tokens.css` | Tokens do App Mobile |
| `docs/TOKENS-GUIA.md` | Guia de migração |
| `public/css/modules/gerenciar.css` | CSS consolidado para gerenciamento |

---

## Comandos Úteis

```bash
# Verificar que todas as páginas usam tokens
for f in public/*.html; do if grep -q "_admin-tokens" "$f" 2>/dev/null; then echo "✓ $(basename $f)"; else echo "✗ $(basename $f)"; fi; done

# Rodar servidor
npm run dev

# Status git
git status
```
