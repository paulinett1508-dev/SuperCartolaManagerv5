# Tarefas Pendentes - Super Cartola Manager

## Status Atual

**Nenhuma tarefa pendente de alta prioridade.**

---

## Concluído - Sessão 2025-12-18 (Tarde)

### Correção Crítica: Cálculo de Acertos Financeiros (100% Completo)
- [x] Identificar fórmula invertida (`totalRecebido - totalPago` → `totalPago - totalRecebido`)
- [x] Corrigir em `routes/tesouraria-routes.js` (2 ocorrências)
- [x] Corrigir em `routes/acertos-financeiros-routes.js` (4 ocorrências)
- [x] Corrigir tipo de temporada (string → number) em todas as rotas
- [x] Corrigir campo da API (`saldoAcertos` → `saldo` alias)
- [x] Corrigir `controllers/extratoFinanceiroCacheController.js` para incluir acertos no saldo
- [x] Corrigir dados no MongoDB DEV e PROD (temporada string→number, tipo errado)
- [x] Atualizar skill `league-architect` com regra de acertos

**Commits:**
- `81116c8` - fix(financeiro): Corrigir cálculo de saldo com acertos financeiros
- `66886bc` - feat(frontend): Integrar acertos financeiros no extrato do participante

**Arquivos modificados:**
- `controllers/extratoFinanceiroCacheController.js` (v5.1 → v5.2)
- `routes/acertos-financeiros-routes.js` (v1.3 → v1.4)
- `routes/tesouraria-routes.js` (v1.0 → v1.1)
- `public/js/fluxo-financeiro/*.js` (integração frontend)
- `public/participante/js/modules/participante-extrato.js`
- `scripts/fix-acertos-tipo.js` (novo)
- `scripts/invalidar-cache-time.js` (novo)

---

## Concluído - Sessão 2025-12-18 (Manhã)

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

### Correção de Saldos Financeiros (100% Completo)
- [x] Investigar por que saldos estavam zerados
- [x] Identificar que banco DEV estava vazio
- [x] Criar script `atualizar-saldos-registry.js` para sincronizar do PROD
- [x] Popular `users_registry.json` com saldos reais (32 participantes)
- [x] Resultado: 18 credores, 14 devedores, 1 zerado

**Arquivos criados/modificados:**
- `scripts/atualizar-saldos-registry.js` (novo)
- `data/users_registry.json` (atualizado com saldos reais)
- `data/history/2025/final_standings.json` (novo)
- `data/history/2025/migration_report.json` (novo)

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
1. `65abd96` - fix(data): Populate users_registry with real financial saldos from PROD
2. `d3ff4ff` - feat(app): Add Hall da Fama, season banner and season selector
3. `18c6902` - docs: Update CLAUDE.md with system-scribe skill and ideias-backlog

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
