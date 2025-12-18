# Tarefas Pendentes - Super Cartola Manager

## Status Atual

**3 tarefas de alta prioridade para próxima sessão.**

---

## ALTA PRIORIDADE - Próxima Sessão

### 1. Hall da Fama / Histórico do Participante
**Problema:** O `users_registry.json` (Cartório Vitalício) contém dados de 2025 mas NÃO é consumido por nenhuma tela do App. Quando a temporada 2026 começar, o participante verá telas vazias.

**Tarefas:**
- [ ] Criar rota backend `/api/participante/:timeId/historico` que lê `users_registry.json`
- [ ] Criar tela `public/participante/fronts/historico.html` (Hall da Fama pessoal)
- [ ] Criar módulo `public/participante/js/modules/participante-historico.js`
- [ ] Adicionar card "Meu Histórico" no menu de navegação do App
- [ ] Exibir badges conquistados (campeão, vice, top10 mito/mico)
- [ ] Exibir saldo financeiro de temporadas anteriores
- [ ] Criar seletor de temporada (2025, 2026...)

**Referências:**
- Dados salvos em: `data/users_registry.json`
- Script que popula: `scripts/turn_key_2026.js` (Step 2: atualizarBadges)
- Estrutura do usuário: `{id, historico[], situacao_financeira, conquistas}`

### 2. Banner de Boas-Vindas com Resumo 2025
**Problema:** Participante não sabe visualmente que está numa nova temporada.

**Tarefas:**
- [ ] Adicionar banner no `boas-vindas.html` mostrando resumo de 2025
- [ ] Exibir posição final, badges conquistados
- [ ] Mostrar saldo financeiro pendente (se houver)
- [ ] Indicar claramente "Temporada 2026 - Nova Jornada"

### 3. Seletor de Temporada Global
**Problema:** Não existe UI para alternar entre temporadas.

**Tarefas:**
- [ ] Criar componente de seletor de ano (2025/2026)
- [ ] Persistir preferência no localStorage
- [ ] Quando em 2025, mostrar dados do `users_registry.json` (histórico)
- [ ] Quando em 2026, mostrar dados ao vivo do MongoDB

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
