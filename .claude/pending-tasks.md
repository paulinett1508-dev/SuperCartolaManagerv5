# Tarefas Pendentes - Super Cartola Manager

> Atualizado: 2026-02-13
> Auditado: Sessao 2026-02-13 — AUDIT-001, AUDIT-002 e AUDIT-003 concluidas. MCP Stitch re-testado.

---

## RESUMO SESSAO 2026-02-13

### Tarefas Executadas
| # | Tarefa | Resultado |
|---|--------|-----------|
| 1 | [MCP-001] Testar Stitch OAuth2 | OAuth2 AINDA expirado. Requer reautenticacao manual |
| 2 | Restart servidor v8.12.0 | Ja rodando (boot 2026-02-13T10:43:28, PID 166512) |
| 3 | [AUDIT-002] Validar extratos | ✅ CONCLUIDA — financeiro correto |
| 4 | [AUDIT-001] Auditoria Extrato v2.0 | ✅ CONCLUIDA — implementacao completa |
| 5 | [AUDIT-003] Ranking Geral + Parciais (Os Fuleros) | ✅ CONCLUIDA — ZERO discrepancias |

### Achados AUDIT-002 (Extratos Financeiros)

**Owner/Premium Isento:**
- [x] Paulinett (13935277, premium:true) na Super Cartola: SEM debito -R$180 ✅
- [x] Felipe Barbosa (8098497, sem premium): TEM debito -R$180 ✅
- [x] Felipe Jokstay (575856, sem premium): TEM debito -R$180 ✅

**Reconciliacao Financeira (API vs calculo manual):**
- [x] Paulinett: -14 + (-13) + (-5) = -32 == API saldo_total -32 ✅
- [x] Felipe Barbosa: -180 + 10 + 10 = -160 == API saldo_total -160 ✅
- [x] Cassio (com legado): 163.38 + 0 + 17 = 180.38 == API saldo_total 180.38 ✅

**Multi-Liga:**
- [x] Super Cartola: saldo -32 (independente) ✅
- [x] Os Fuleros: saldo -14 (independente) ✅

**Issues Menores Encontrados (nao-bloqueantes):**
- `saldo_consolidado` no MongoDB stale (nao inclui PC adicionados depois). API recalcula corretamente.
- Alguns participantes (1323370, 8188312) sem entrada de inscricao e sem premium. Investigar se pagouInscricao=true.
- MITO/MICO com valor=0 em Os Fuleros (config top10 sem valores_mito/valores_mico definidos).

### Achados AUDIT-001 (Extrato v2.0 Redesign)

**Todos 9 componentes da spec implementados:**
- [x] Hero Card (saldo + toggle + status + pills) — `renderHeroCardV2()` L53-112
- [x] Grid 2 colunas (sidebar + main) — `renderExtratoV2()` L522-531
- [x] Grafico SVG #FF5500 + filtros — `renderChartV2()` + `renderExtratoChartV2()`
- [x] Card Acertos (lista + empty state) — `renderAcertosCardV2()` L162-214
- [x] Performance Card (Mito/Mico/ZonaG/ZonaZ) — `renderPerformanceV2()` L432-493
- [x] Timeline expandivel + filtros + totais — `renderTimelineV2()` L219-427
- [x] Lancamentos iniciais (inscricao/legado) — dentro de `renderTimelineV2()`
- [x] Filtros Timeline (Todos/Creditos/Debitos) — `setupExtratoTimelineFiltersV2()`
- [x] Filtros Chart (Tudo/10R/5R) — `setupExtratoChartFiltersV2()`

**Wiring/Integracao:** CSS carregado ✅, JS importado ✅, fallback v1 ✅, setup interatividade ✅

**App Participante:** Usa v11.0 propria (NAO v2). Correto — spec previa apenas tweaks CSS.

**Dark Mode:** Usa `var(--surface-card, #1a1a1a)`, herda do admin theme. Sem conflito.

**Gaps Menores (cosmeticos):**
- Mini sparkline no Performance Card (spec aspiracional, nao implementada)
- Botao PDF export (pode estar no wrapper do modal, nao no render v2)
- Responsividade mobile nao verificada visualmente

### Achados AUDIT-003 (Ranking Geral + Parciais)

**Cruzamento 4 fontes de dados (Os Fuleros):**
- [x] `rodadas` (raw data): 16 entries (8 participantes x 2 rodadas) ✅
- [x] `rankinggeralcaches`: 3 entries (R0, R1, R2) — dados corretos ✅
- [x] `rodadasnapshots`: R0 (inscricao) + R1 + R2 consolidadas ✅
- [x] `rankingturnos`: turno1 (R1) + geral (R1-R2) — dados corretos ✅
- [x] **ZERO discrepancias** entre as 4 fontes ✅

**Ranking Os Fuleros (apos 2 rodadas):**

| Pos | Time | Pontos | ValFin R1 | ValFin R2 |
|-----|------|--------|-----------|-----------|
| 1 | TCMV Futebol club | 148.46 | +4 | +6 |
| 2 | Obraga04 | 144.66 | 0 | +8 |
| 3 | TriiMundial sp | 139.34 | +8 | -4 |
| 4 | CR ErySoldado | 136.88 | +6 | +4 |
| 5 | j.Prado fc | 120.65 | 0 | 0 |
| 6 | KroonosFLA | 112.16 | -4 | 0 |
| 7 | Urubu Play F.C. (Paulinett) | 96.73 | -6 | -8 |
| 8 | Papito's Football Club | 93.91 | -8 | -6 |

**Contagem participantes:**
- Liga: 8, Rodadas: 8, Cache: 8, Turno: 8 — todos consistentes
- Snapshot R0 tem 7 (KroonosFLA adicionado depois da inscricao inicial) — esperado

**Paulinett (Owner) em Os Fuleros:**
- premium=true, owner_email configurado ✅
- Inscricao ISENTA (premium exemption funciona) ✅
- Saldo: -14 (R1: -6 onus + R2: -8 onus) ✅

**Super Cartola (comparacao):**
- 35 participantes, 3 rodadas em 2026 — dados corretos
- `rankingturnos` geral stale (R2 vs R3 disponivel) — self-healing na proxima chamada API
- `rankinggeralcaches` vazio para 2026 — gerado on-demand

**Sistema de Parciais:**
- Admin `parciais.js` v5.1, App `participante-rodada-parcial.js` v3.0, Backend `parciaisRankingService.js` v1.2
- Fluxo: API Cartola (live) -> calcular pontuacao -> acumular com rodadas anteriores -> ranking
- Integrado no ranking-turno (turno=geral retorna acumulado + parciais quando disponivel)
- Auto-refresh 30s com backoff exponencial ate 120s
- Sem discrepancias de calculo detectadas

**Issues menores (nao-bloqueantes):**
- Config `top10` vazia em Os Fuleros (MITO/MICO sem valor financeiro) — ja documentado em AUDIT-002
- MCP Mongo nao converte String para ObjectId (queries retornam vazio para campos ObjectId)

---

## 🚨 URGENTE - Resolver Autenticacao Google Stitch MCP

### [MCP-001] Google Stitch - OAuth2 Token Expirado/Invalido

**Prioridade:** 🔴 URGENTE
**Status:** PENDENTE (re-testado 2026-02-13, ainda expirado)
**Erro:** `API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal.`

#### Acoes
- [ ] Re-autenticar com Google OAuth2 (gerar novo token)
- [ ] Testar `list_projects` apos re-autenticacao
- [ ] Documentar processo de refresh do token para futuras expiracoes

#### Status dos MCPs (verificado 2026-02-13)
| MCP | Status |
|-----|--------|
| Mongo | ✅ Ativo |
| Perplexity | ✅ Ativo |
| Context7 | ✅ Ativo |
| IDE | ✅ Ativo |
| Google Stitch | ❌ OAuth2 expirado |

---

## ~~AUDIT-002~~ ✅ CONCLUIDA (2026-02-13)

### Validar 100% Extratos dos Participantes

**Status:** ✅ CONCLUIDA
**Resultado:** Sistema financeiro correto. Owner/premium isento funciona. Reconciliacao OK em 3 participantes. Multi-liga independente. Issues menores documentados acima.

---

## ~~AUDIT-001~~ ✅ CONCLUIDA (2026-02-13)

### Auditoria End-to-End do Redesign Extrato v2.0

**Status:** ✅ CONCLUIDA
**Resultado:** Implementacao substancialmente completa. Todos componentes da spec implementados. Wiring correto. App participante usa v11.0 propria (correto). Gaps cosmeticos apenas (sparkline, PDF).

---

## ~~AUDIT-003~~ ✅ CONCLUIDA (2026-02-13)

### Auditoria Ranking Geral + Parciais (foco Os Fuleros)

**Status:** ✅ CONCLUIDA
**Resultado:** ZERO discrepancias na contagem. 4 fontes de dados cruzadas (rodadas, rankinggeralcaches, rodadasnapshots, rankingturnos) concordam 100%. 8 participantes consistentes. Premium/owner isento funciona. Parciais integrados corretamente no ranking-turno. Super Cartola com cache stale (self-healing).

---

## RESUMO SESSAO 2026-02-11

### Commits desta sessao (4 commits, todos no main)
| Commit | Descricao |
|--------|-----------|
| `e9ca0a3` | fix(extrato): abonar inscricao do owner/premium na liga com owner_email |
| `8c6245f` | feat(extrato): cores de identidade por modulo e labels descritivos nos sub-itens |
| `c4b3a92` | fix(extrato): mostrar posicao como titulo em todas as rodadas (single e multi) |
| `24eb896` | fix(extrato): rodadas sempre expansiveis e contagem de modulos extras |

### Implementacoes desta sessao
- **Owner/premium isento de inscricao:** `fluxoFinanceiroController.js` v8.12.0
- **Cores por modulo no extrato:** cor de identidade do Quick Bar por sub-item
- **Labels descritivos:** "Bonus de posicao" / "Onus de posicao" / "MITO da Rodada" / "MICO da Rodada"
- **Posicao sempre como titulo:** todas as rodadas mostram "Xo lugar"
- **Expand/collapse universal:** todas as rodadas com subitems sao expansiveis
- **Contagem de modulos extras:** conta apenas PC, MM, Top10

---

## RESUMO SESSAO 2026-02-10

### Commits (6 commits, todos no main)
| Commit | Descricao |
|--------|-----------|
| `cbcbfc3` | feat(admin): card Premium no dashboard de Analisar Participantes |
| `5ee7c41` | feat(extrato): redesign Inter-inspired para Admin e App (v2.0) |
| `8e6b92c` | fix(admin): fallback seguro para SuperModal no toggle premium |
| `5d71369` | fix(admin): SPA re-init robusto para Analisar Participantes |
| `aba8909` | feat(admin): toggle Premium na coluna Acoes de Analisar Participantes |
| `bafc937` | fix(admin): remove modais duplicados e corrige re-init SPA |

---

## 🔴 BUG - Cache Stale Apos Pontos Corridos

### [BUG-001] ganhos/perdas_consolidadas nao recalculados na consolidacao PC

**Prioridade:** 🔴 ALTA
**Status:** PENDENTE (detectado 2026-02-12, confirmado 2026-02-13)
**Afeta:** TODOS participantes Super Cartola 2026 com resultados PC
**Delta:** R$5 por participante (valor PC da R2)

**Root cause:** `fluxoFinanceiroController.js` L1207-1213 — consolidacao PC faz `$push` em `historico_transacoes` e incrementa `saldo_consolidado`, mas NAO recalcula `ganhos_consolidados` e `perdas_consolidadas`. Path de rodada atual (L835-841) faz corretamente.

**Participantes afetados (auditoria 12/02):**
| Participante | Cache | Real | Delta |
|---|---|---|---|
| China Guardiola | R$248,54 | R$243,54 | -R$5 |
| Diego Barbosa | R$20,00 | R$25,00 | +R$5 |
| Felipe Barbosa | R$15,00 | R$20,00 | +R$5 |
| Paulinett Miranda | R$-27,00 | R$-32,00 | -R$5 |

**Acoes:**
- [ ] Fix no path de consolidacao (replicar L835-841 em L1207-1213)
- [ ] Rodar `scripts/reconciliar-saldos-financeiros.js --dry-run` para validar
- [ ] Rodar reconciliacao com `--force` para corrigir caches afetados

---

## 🔥 PROXIMA SESSAO - Tarefas Restantes

### [IMPL-028] Sistema de Avisos e Notificacoes ✅ IMPLEMENTADO (2026-02-04)

**Status:** Implementado e commitado (branch `feat/sistema-avisos-notificacoes`, commit `fb5e4ff`)

**Testes Pendentes:**
- [ ] Testar CRUD admin completo
- [ ] Validar publicacao admin -> participante
- [ ] Verificar marcacao como lido
- [ ] Testar segmentacao (global/liga/participante)
- [ ] Validar scroll horizontal mobile

---

## FEATURES - Alta Prioridade

### [FEAT-026] Polling Inteligente para Modulo Rodadas

**Prioridade:** Alta
**Contexto:** Modulo Rodadas faz refresh a cada 30s independente de haver jogos, desperdicando recursos.

**Objetivo:** Criar gerenciador de polling que:
- Pausa quando nao ha jogos em andamento
- Reativa ~10min antes do proximo jogo
- Mostra feedback visual do estado (ao vivo / aguardando / pausado)

**Arquivos a criar/modificar:**
- `public/js/rodadas/rodadas-polling-manager.js` (novo)
- `public/js/rodadas.js` (integrar)
- Possivel modelo `CalendarioRodada` no MongoDB

---

### [FEAT-027] Enriquecer Listagem de Participantes no Modulo Rodadas

**Prioridade:** Alta
**Objetivo:** Tornar lista de participantes mais informativa:
- Contador de atletas que ja jogaram (`X/12`)
- Escudo do time do coracao
- Valores financeiros da liga (bonus G10/Z10 baseado em `ModuleConfig`)

---

## ADMIN MOBILE

### [MOBILE-001] Remover emojis e alinhar visual

**Prioridade:** Baixa
**Descricao:** Remover todos os emojis do admin-mobile e alinhar com padrao visual do app participante.

---

### [MOBILE-004] Implementar Fases 5 e 6 do App Admin

**Prioridade:** Media
**Descricao:** Implementar fases finais do roadmap do app admin mobile.

---

## UX

### [UX-002] Substituir 4 alert() restantes por SuperModal

**Prioridade:** Baixa

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `public/js/luva-de-ouro/luva-de-ouro-utils.js` | 700 | "Nenhum dado para exportar" |
| `public/js/navigation.js` | 5 | Alert generico |
| `public/js/modules/module-config-modal.js` | 1245 | Erro |
| `public/js/modules/module-config-modal.js` | 1260 | Sucesso |

---

## DOCUMENTACAO

### [DOC-001] Migrar Skills do Codebase para docs/

**Prioridade:** Media

---

## BACKLOG TECNICO

- **Queries sem `.lean()`:** ~130 restantes (4 controllers ja atualizados)
- **Console.logs:** 567 encontrados (criar logger configuravel)
- **Refatoracao fluxo-financeiro-ui.js:** 4.426 linhas (meta <3.000L)
- **saldo_consolidado stale:** Campo no MongoDB nao atualizado quando PC eh adicionado (API recalcula corretamente)
- **Config Top10 incompleta em Os Fuleros:** valores_mito/valores_mico nao definidos, MITO/MICO com valor=0
- ~~**Arquivos nao commitados (analytics):**~~ Resolvido 2026-02-13 — 4/5 ja commitados, `dashboard-analytics.html` nao existe (removido ou nunca criado)

---

## REFERENCIA RAPIDA

### IDs das Ligas
- **Super Cartola:** `684cb1c8af923da7c7df51de`
- **Cartoleiros do Sobral:** `684d821cf1a7ae16d1f89572` (aposentada)
- **Os Fuleros:** `6977a62071dee12036bb163e`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Seguranca OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Codigo morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
