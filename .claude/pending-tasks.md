# Tarefas Pendentes - Super Cartola Manager

> Atualizado: 2026-02-10 02:30
> Auditado: Todos os itens anteriores foram verificados no código e MongoDB. Apenas tarefas realmente pendentes permanecem.

---

## RESUMO SESSAO 2026-02-10

### Commits desta sessao (6 commits, todos no main)
| Commit | Descricao |
|--------|-----------|
| `cbcbfc3` | feat(admin): card Premium no dashboard de Analisar Participantes |
| `5ee7c41` | feat(extrato): redesign Inter-inspired para Admin e App (v2.0) - **PRECISA AUDITORIA** |
| `8e6b92c` | fix(admin): fallback seguro para SuperModal no toggle premium |
| `5d71369` | fix(admin): SPA re-init robusto para Analisar Participantes |
| `aba8909` | feat(admin): toggle Premium na coluna Acoes de Analisar Participantes |
| `bafc937` | fix(admin): remove modais duplicados e corrige re-init SPA em Analisar Participantes |

### Implementacoes desta sessao
- **Premium bypass completo:** participante premium (flag no DB, nao hardcoded) bypassa modulos em manutencao (navegacao, quick bar, bottom nav, home mini cards)
- **Analisar Participantes corrigido:** modais duplicados removidos, SPA re-init robusto, toggle premium na tabela, card Premium no dashboard (contagem deduplicada por time_id)
- **Paulinett Miranda** (timeId 13935277) = unico premium ativo (aparece em 2 ligas: Super Cartola + Os Fuleros, contagem global = 1)
- **Servidor rodando** no Replit via workflow (matar processo antigo com `lsof -ti:3000 | xargs kill -9` antes de reiniciar)

---

## 🔴 AUDITORIA COMPLETA - Sistema Financeiro / Redesign Extrato v2.0

### [AUDIT-001] Auditoria End-to-End do Redesign Extrato Inter-Inspired + Sistema Financeiro

**Prioridade:** 🔴 CRÍTICA
**Status:** PENDENTE - Executar na proxima sessao
**Commit alvo:** `5ee7c41` (feat(extrato): redesign Inter-inspired para Admin e App v2.0)
**Metodologia:** PRD → SPEC → CODE (workflow completo)

#### Contexto

O commit `5ee7c41` introduziu +2.334 linhas em 7 arquivos, incluindo redesign completo do módulo Extrato com visual inspirado no Inter (banco digital). Esta auditoria deve verificar se tudo foi realmente implementado, integrado e funcional no sistema.

#### Arquivos a Auditar (7 arquivos do commit)

| Arquivo | Tipo | Linhas | O que verificar |
|---------|------|--------|-----------------|
| `public/css/modules/extrato-v2.css` | NOVO | 1.095 | CSS carrega? Conflita com v1? Dark mode ok? |
| `public/js/fluxo-financeiro/extrato-render-v2.js` | NOVO | 673 | Renderiza corretamente? Chamado pelo sistema? |
| `.claude/docs/REDESIGN-EXTRATO-v2.md` | NOVO | 430 | Spec alinhada com implementacao real? |
| `public/detalhe-liga.html` | MOD | +1 | Link do CSS v2 incluido? Carrega no DOM? |
| `public/js/fluxo-financeiro.js` | MOD | +9 | Import/init do v2 presente? Fallback v1 ok? |
| `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` | MOD | +27/-1 | Integracao com render v2? Sem regressao? |
| `public/participante/css/extrato-bank.css` | MOD | +100 | Tweaks Inter no App participante? Aplica? |

#### FASE 1 - PRD (Pesquisa e Diagnostico) - PARCIALMENTE AUDITADO

**Skill:** pesquisa + fact-checker

**Achados da auditoria parcial (sessao 2026-02-10):**

**WIRING (integração entre arquivos):**
- [x] CSS v2 carregado no HTML: `detalhe-liga.html:37` → `<link rel="stylesheet" href="css/modules/extrato-v2.css" />`
- [x] JS v2 importado: `fluxo-financeiro.js:78` → `await import("./fluxo-financeiro/extrato-render-v2.js?v8.10")`
- [x] Funcoes exportadas para window: `renderExtratoV2`, `toggleExtratoValorVisibility`, `renderExtratoChartV2`, `setupExtratoChartFiltersV2`, `setupExtratoTimelineFiltersV2`
- [x] Fallback v1 presente: `fluxo-financeiro-ui.js:238-256` → checa `window.renderExtratoV2` antes de usar, senao cai no legado
- [x] Integração UI: `fluxo-financeiro-ui.js:233` → `renderizarExtratoTemporada()` usa v2 se disponivel
- [x] Setup interatividade: chart, chart filters e timeline filters configurados com `setTimeout(100ms)`

**COMPONENTES IMPLEMENTADOS (no extrato-render-v2.js, 673 linhas):**
- [x] `renderHeroCardV2()` - Saldo principal + toggle visibilidade + stats pills
- [x] `renderChartV2()` - SVG chart com gradiente #FF5500 + filtros (Tudo/10R/5R)
- [x] `renderAcertosCardV2()` - Card de acertos financeiros (precisa verificar)
- [x] `renderPerformanceV2()` - Card de performance (precisa verificar)
- [x] `renderTimelineV2()` - Timeline agrupada (precisa verificar se agrupa por mes)
- [x] Layout Grid 2 colunas: sidebar (chart + acertos + performance) + main (timeline)

**CSS v2 (extrato-v2.css, 1.095 linhas):**
- [x] Variaveis CSS definidas em :root (gradientes, bordas, icones, espacamentos)
- [x] Hero Card com status (positive/negative/neutral)
- [ ] Verificar se Dark Mode OLED (#0a0a0a) nao conflita com theme geral (bg-gray-900)
- [ ] Verificar responsividade mobile dos componentes

**PROBLEMAS ENCONTRADOS:**
1. **API retornou objeto vazio `{}`** ao testar `GET /api/extrato-financeiro/cache/13935277?temporada=2026&liga_id=684cb1c8af923da7c7df51de` → Precisa investigar se endpoint requer autenticacao ou se nao ha cache ainda
2. **extrato-bank.css (App participante):** +100 linhas adicionadas mas NAO foi verificado se o App participante usa v2 ou apenas tweaks CSS
3. **Falta verificar:** funções `renderAcertosCardV2`, `renderPerformanceV2`, `renderTimelineV2` (linhas 150-500 do render)
4. **Falta verificar:** se os dados do cache alimentam corretamente `data.resumo`, `data.rodadas`, `data.acertos`, `data.lancamentosIniciais`
5. **Falta verificar:** App participante (`participante-extrato-ui.js`) - usa v2 ou continua com v1?

**PENDENTE:**
- [ ] Ler REDESIGN-EXTRATO-v2.md e extrair todas as features prometidas
- [ ] Comparar spec vs codigo real implementado (gap analysis completo)
- [ ] Testar endpoint com sessao admin autenticada (via browser)
- [ ] Verificar renderAcertosCardV2, renderPerformanceV2, renderTimelineV2
- [ ] Validar no MongoDB se os dados financeiros estao corretos
- [ ] Verificar se nao ha codigo morto / imports quebrados
- [ ] Checar se App participante usa v2 ou so v1
- [ ] Gerar `PRD-AUDIT-EXTRATO-V2.md` com achados completos

#### FASE 2 - SPEC (Especificacao de Correcoes)

**Skill:** spec + code-inspector

- [ ] Mapear cada bug/gap encontrado na Fase 1
- [ ] Classificar: BUG / INCOMPLETO / COSMETICO / FUNCIONAL
- [ ] Para cada item: arquivo, linha, problema, solucao proposta
- [ ] Priorizar: o que bloqueia uso vs o que eh melhoria
- [ ] Verificar Follow The Money (trilha de auditoria financeira intacta)
- [ ] Checar idempotencia das operacoes financeiras
- [ ] Validar calculos: saldo, lancamentos, acertos, ajustes
- [ ] Gerar `SPEC-AUDIT-EXTRATO-V2.md` com plano de correcao

#### FASE 3 - CODE (Implementacao das Correcoes)

**Skill:** code + frontend-crafter

- [ ] Aplicar cada correcao mapeada na SPEC
- [ ] Testar apos cada correcao (nao acumular)
- [ ] Validar visual: Hero Card, Timeline, Stats Pills, Grid 2 colunas
- [ ] Testar no Admin (detalhe-liga.html → extrato do participante)
- [ ] Testar no App participante (modulo extrato)
- [ ] Verificar mobile responsivo
- [ ] Confirmar que todos os numeros financeiros batem com o MongoDB
- [ ] Commit atomico por area de correcao

#### Checklist Critico - Sistema Financeiro

- [ ] Saldo exibido == saldo calculado no cache
- [ ] Lancamentos: creditos e debitos corretos por rodada
- [ ] Acertos financeiros (pagamentos) refletidos corretamente
- [ ] Ajustes (campos extras) computados no saldo
- [ ] Inscricao: `pagouInscricao=true` nao gera debito, `false` gera
- [ ] Legado (saldo transferido) aparece como lancamento inicial
- [ ] Multi-liga: extrato de cada liga eh independente
- [ ] Timeline expansivel mostra detalhes ao clicar
- [ ] Grafico de evolucao do saldo renderiza corretamente
- [ ] Exportar CSV funciona com dados v2

#### Arquivos Relacionados (Contexto do Sistema Financeiro Completo)

```
# Backend
routes/extrato-financeiro.js          # Rotas do extrato
controllers/extratoFinanceiroController.js  # Logica de calculo
models/ExtratoFinanceiroCache.js      # Schema do cache

# Frontend Admin
public/js/fluxo-financeiro.js         # Orchestrator
public/js/fluxo-financeiro/fluxo-financeiro-ui.js  # UI principal (4.400L)
public/js/fluxo-financeiro/extrato-render-v2.js    # NOVO render v2

# Frontend App Participante
public/participante/js/modules/participante-extrato.js    # Dados
public/participante/js/modules/participante-extrato-ui.js  # Render

# CSS
public/css/modules/extrato-v2.css     # NOVO CSS v2
public/participante/css/extrato-bank.css  # CSS app participante
```

---

## 🚨 HOTFIX CRITICO APLICADO (2026-02-04 17:55)

### [HOTFIX-001] Correção de 3 Bugs Críticos no Módulo Extrato ✅ CORRIGIDO

**Prioridade:** 🔴 CRÍTICA (Bloqueava uso do app)
**Status:** Corrigido e servidor reiniciado
**Arquivos modificados:** 3

#### Problemas Identificados

**1. Middleware `tenantFilter` bloqueando participantes (403 Forbidden)**
- **Arquivo:** `middleware/tenant.js`
- **Problema:** Middleware aplicado em TODAS rotas `/api/ligas/*` bloqueava participantes sem sessão admin
- **Impacto:** Participantes não conseguiam carregar dados da liga (erro 403)
- **Solução:** Adicionada whitelist de 12 rotas públicas (v1.1)

**2. Função chamada antes de ser definida (TypeError)**
- **Arquivo:** `public/participante/js/modules/participante-extrato-ui.js`
- **Problema:** `window.renderizarConteudoCompleto` chamada na linha 303, definida na linha 531
- **Impacto:** Tela branca no módulo Extrato após carregar dados
- **Solução:** Função movida para ANTES da função exportada (v10.23)

**3. Chamada para rota deletada (404 Not Found)**
- **Arquivo:** `public/participante/js/modules/participante-extrato.js`
- **Problema:** Código tentava chamar `DELETE /api/extrato-cache/.../limpar` removida na v2.0
- **Impacto:** Erro 404 no console, cache incompleto não era limpo
- **Solução:** Bloco try-catch removido, recálculo já sobrescreve cache (v2.9)

#### Evidências Técnicas

**Console Logs (antes da correção):**
```
GET /api/ligas/684cb1c8af923da7c7df51de 403 (Forbidden)
TypeError: window.renderizarConteudoCompleto is not a function
DELETE /api/extrato-cache/.../limpar 404 (Not Found)
```

#### Testes Necessários

- [ ] Testar acesso ao módulo Extrato como participante
- [ ] Verificar que não há mais erros 403/404 no console
- [ ] Validar renderização completa do extrato
- [ ] Testar em múltiplas ligas (multi-tenant)
- [ ] Hard refresh (Ctrl+Shift+R) para limpar cache frontend

#### Commit Recomendado

```bash
git add middleware/tenant.js \
        public/participante/js/modules/participante-extrato-ui.js \
        public/participante/js/modules/participante-extrato.js

git commit -m "fix(extrato): corrige 3 bugs críticos bloqueando uso do módulo

- feat(tenant): adiciona whitelist de rotas públicas (v1.1)
  - Participantes agora podem acessar /api/ligas/:id sem 403
  - 12 rotas públicas identificadas e permitidas

- fix(extrato-ui): reordena definição de renderizarConteudoCompleto (v10.23)
  - Move função para antes da chamada
  - Elimina TypeError que causava tela branca

- fix(extrato): remove chamada para rota deletada (v2.9)
  - Rota DELETE /limpar foi removida na v2.0 por segurança
  - Recálculo já sobrescreve cache, limpeza prévia desnecessária

Resolves: Módulo Extrato totalmente funcional para participantes"
```

---

## 🔥 PRÓXIMA SESSÃO - EXECUTAR IMEDIATAMENTE

### ~~[IMPL-028] Sistema de Avisos e Notificações~~ ✅ IMPLEMENTADO (2026-02-04)

**Status:** Implementado e commitado
**Branch:** `feat/sistema-avisos-notificacoes`
**Commit:** `fb5e4ff`

**Entregues:**
- ✅ Backend completo (2 controllers, 2 routes)
- ✅ Interface admin (notificador.html + notificador-management.js)
- ✅ Interface participante (cards scroll horizontal)
- ✅ Índices MongoDB otimizados
- ✅ Multi-tenant seguro
- ✅ TTL automático para expiração

**Testes Pendentes:**
- [ ] Testar CRUD admin completo
- [ ] Validar publicação admin → participante
- [ ] Verificar marcação como lido
- [ ] Testar segmentação (global/liga/participante)
- [ ] Validar scroll horizontal mobile

**Próximo Passo:** Testar em produção e ajustar UX conforme feedback

---

## FEATURES - Alta Prioridade

### [FEAT-026] Polling Inteligente para Módulo Rodadas

**Prioridade:** Alta
**Contexto:** Módulo Rodadas faz refresh a cada 30s independente de haver jogos, desperdiçando recursos.

**Objetivo:** Criar gerenciador de polling que:
- Pausa quando não há jogos em andamento
- Reativa ~10min antes do próximo jogo
- Mostra feedback visual do estado (ao vivo / aguardando / pausado)

**Arquivos a criar/modificar:**
- `public/js/rodadas/rodadas-polling-manager.js` (novo)
- `public/js/rodadas.js` (integrar)
- Possível modelo `CalendarioRodada` no MongoDB

---

### [FEAT-027] Enriquecer Listagem de Participantes no Módulo Rodadas

**Prioridade:** Alta
**Objetivo:** Tornar lista de participantes mais informativa:
- Contador de atletas que já jogaram (`X/12`)
- Escudo do time do coração
- Valores financeiros da liga (bônus G10/Z10 baseado em `ModuleConfig`)

**Arquivos a modificar:**
- `controllers/rodadaController.js` - Lógica de atletas jogados
- `public/js/rodadas.js` / `public/participante/js/modules/participante-rodadas.js` - Renderização
- `ModuleConfig` collection - Config de valores por liga

---

## ADMIN MOBILE

### [MOBILE-001] Remover emojis e alinhar visual

**Prioridade:** Baixa
**Descrição:** Remover todos os emojis do admin-mobile e alinhar com padrão visual do app participante (fontes, cores, componentes).
**Arquivos:** `public/admin-mobile/` (todos os HTMLs, JS e CSS)

---

### ~~[MOBILE-003] Dashboard admin-mobile "Nenhuma liga encontrada"~~ CORRIGIDO (2026-02-04)

Causa: `adminMobileController.js` usava `ativo: true` (campo inexistente) ao invés de `ativa: true`, e buscava participantes na collection `times` com `liga_id` ao invés de usar `liga.participantes[]`. Corrigido em `getDashboard`, `getLigas`, `getLigaDetalhes` e `getHealth`.

---

### [MOBILE-004] Implementar Fases 5 e 6 do App Admin

**Prioridade:** Média
**Descrição:** Implementar fases finais do roadmap do app admin mobile. Verificar specs em `.claude/docs/` para escopo detalhado.

---

## UX

### [UX-002] Substituir 4 alert() restantes por SuperModal

**Prioridade:** Baixa
**Descrição:** Sistema já tem `super-modal.js` para substituir dialogs nativos. Restam 4 chamadas `alert()` legadas:

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `public/js/luva-de-ouro/luva-de-ouro-utils.js` | 700 | "Nenhum dado para exportar" |
| `public/js/navigation.js` | 5 | Alert genérico |
| `public/js/modules/module-config-modal.js` | 1245 | Erro |
| `public/js/modules/module-config-modal.js` | 1260 | Sucesso |

---

## DOCUMENTAÇÃO

### [DOC-001] Migrar Skills do Codebase para docs/

**Prioridade:** Média
**Descrição:** Centralizar todas as skills/ferramentas de desenvolvimento na pasta `docs/` para melhor versionamento e visibilidade.

**Ações:**
- [ ] Identificar todas as skills espalhadas pelo codebase
- [ ] Padronizar formato de documentação (seguir padrão `SKILL-ANALISE-BRANCHES.md`)
- [ ] Migrar para `docs/` com nomenclatura consistente (`SKILL-*.md`)
- [ ] Atualizar BACKLOG.md com referências corretas
- [ ] Criar índice em `docs/README.md` ou `docs/SKILLS-INDEX.md`

**Benefícios:**
- Versionamento Git completo
- Visibilidade para toda equipe
- Facilita onboarding de novos desenvolvedores
- Documentação sempre atualizada

**Arquivos afetados:**
- `.claude/skills/` → `docs/SKILL-*.md`
- Scripts em `/scripts/` (adicionar documentação em `docs/`)
- `BACKLOG.md` (atualizar referências)

---

## BACKLOG TECNICO

- **Queries sem `.lean()`:** ~130 restantes (4 controllers já atualizados)
- **Console.logs:** 567 encontrados (criar logger configurável)
- **Refatoração fluxo-financeiro-ui.js:** 4.426 linhas (extrair Ajustes Dinâmicos ~300L, Tabela Expandida ~400L, meta <3.000L)

---

## REFERENCIA RAPIDA

### IDs das Ligas
- **Super Cartola:** `684cb1c8af923da7c7df51de`
- **Cartoleiros do Sobral:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
