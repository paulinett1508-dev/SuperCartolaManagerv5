# Tarefas Pendentes
#
# (Sem tarefas pendentes no momento)
#
---

## ✅ CONCLUÍDO (2026-01-19)

### Modal Premiações 2026

**Arquivos:**
- `public/participante/index.html` - Modal com accordion
- `public/participante/js/modules/participante-boas-vindas.js` v10.12 - Botão na tela Início

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Modal com 8 seções accordion | ✅ |
| Campeões de Turno | ✅ Copo Térmico + Camisa |
| Disputas Individuais | ✅ Artilheiro, Luva, Capitão (R$ 50 cada) |
| Pontos Corridos | ✅ 1° R$ 150, 2° R$ 130, 3° R$ 110 |
| Outras Disputas | ✅ Resta Um, Tiro Certo, Mata-Mata |
| Bolões | ✅ Copa do Mundo + Libertadores |
| Bônus/Ônus Especiais | ✅ Micos/Mitos, Nunca Mico, etc |
| Ranking Geral (G10) | ✅ 1° R$ 1000 até 10° R$ 50 |
| Ranking de Rodada | ✅ Bônus G10 + Ônus Z10 |
| Botão na tela Início | ✅ |

**Acesso:** `window.abrirPremiacoes2026()`

---

### Seção de Jogos Separada - v5.3

**Arquivo:** `public/participante/js/modules/participante-jogos.js`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Exibir apenas jogos do dia | ✅ (já existia) |
| Separar em "Em Andamento" e "Encerrados" | ✅ Implementado |
| Aplicar no app do participante (frontend) | ✅ |
| Validar integração com backend | ✅ Funciona com jogos-ao-vivo-routes.js |

**Mudanças técnicas:**
- Nova função `renderizarSecaoJogos()` para renderizar cada seção
- `renderizarJogosAoVivo()` agora separa jogos em duas categorias:
  - "Em Andamento": jogos ao vivo + agendados
  - "Encerrados": jogos finalizados (FT, AET, PEN)
- Visual diferenciado: borda laranja para Em Andamento, cinza para Encerrados

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-18)

### ✅ SPEC v5.0 Implementada

**Melhorias Badges Jogos v5.0** - CONCLUÍDO
- **PRD:** `.claude/docs/PRD-badges-jogos-melhorias-v5.md`
- **SPEC:** `.claude/docs/SPEC-badges-jogos-melhorias-v5.md`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Nomes de campeonatos | ✅ "Paulista - A1" → "Paulistão", "Carioca - 1" → "Cariocão" |
| Modal com tabs | ✅ Eventos \| Estatísticas \| Escalações |
| Tab Estatísticas | ✅ Barras comparativas (posse, chutes, escanteios, faltas) |
| Tab Escalações | ✅ Formação tática + 11 titulares de cada time |

**Arquivos modificados:**
1. `routes/jogos-ao-vivo-routes.js` v3.2 - LIGAS_PRINCIPAIS expandido + formatarNomeLiga() com nomes populares + extrairResumoStats()
2. `public/participante/js/modules/participante-jogos.js` v5.0 - Modal com tabs + renderizarEstatisticas() + renderizarEscalacoes() + trocarTabModal()

---

### ✅ SPEC v4.1 Implementada (Anterior)

**Badges de Jogos API-Football v4.1** - CONCLUÍDO
- **SPEC:** `.claude/docs/SPEC-badges-jogos-api-football-v3.md`
- **Commit:** `e234a3d feat(jogos-ao-vivo): implementar v4.1 com eventos e auto-refresh`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Eventos em tempo real | ✅ Gols, cartões, substituições |
| Auto-refresh | ✅ Atualiza placar a cada 60s quando ao vivo |
| Badge visual v4.1 | ✅ Tempo pulsante, placar halftime, estádio |
| Modal de detalhes | ✅ Toque expande timeline de eventos |

---

## Status Anterior (2026-01-17)

**✅ Skills Robustecidos v2.0 - Instalados**
**✅ Auditoria Baseline Executada**

**Localização:**
- `.claude/skills/` - 5 skills completos (code-inspector, db-guardian, frontend-crafter, league-architect, system-scribe)
- `scripts/` - 5 scripts de auditoria automatizados
- `audit_baseline_20260117.log` - Resultado da primeira auditoria

---

## 📊 Resultado Auditoria SPARC (2026-01-17)

**Score Total: 9/25 (CRÍTICO)**

| Dimensão | Score | Status |
|----------|-------|--------|
| 🛡️ Security | 1/5 | 🔴 |
| ⚡ Performance | 3/5 | 🟡 |
| 🏗️ Architecture | 1/5 | 🔴 |
| 🔄 Reliability | 3/5 | 🟡 |
| 🧹 Code Quality | 1/5 | 🔴 |

### ✅ P1 - Issues Críticos (RESOLVIDOS)

**Multi-Tenant (61 queries → 0 reais):**
- ✅ Análise detalhada: 61 falsos positivos
- ✅ Script melhorado com verificação multiline
- ✅ Queries usam `ligaId` (camelCase), `liga.times`, ou `time_id`

**Correção Aplicada - golsController.js v2.0:**
- ✅ `listarGols`: Adicionado filtro `ligaId` obrigatório
- ✅ `extrairGolsDaRodada`: Adicionado `ligaId` obrigatório + campos corretos
- ✅ `public/js/gols.js`: Atualizado para passar `ligaId`

**Secrets Hardcoded (34):**
- ✅ Falso positivo: todos em `.config/` e `node_modules`

### 🟡 P2 - Issues Médios (Pendentes)

**Performance:**
- 135 queries sem `.lean()`
- 567 console.logs (remover em produção)
- 2 bundles >100KB (fluxo-financeiro-ui: 286K)

**Models - Status dos Índices liga_id:**
- ✅ ModuleConfig, AjusteFinanceiro, LigaRules, ExtratoFinanceiroCache (têm índices)
- ⚠️ CartolaOficialDump (`meta.liga_id` não indexado - Data Lake)

### Próximas Ações Recomendadas

1. ~~**P1 Multi-Tenant**~~ ✅ Resolvido
2. ~~**P1 Auth gols.js**~~ ✅ Corrigido com ligaId obrigatório
3. ~~**P2 Índices:**~~ ✅ Análise: 4/5 models JÁ têm índices (ModuleConfig, AjusteFinanceiro, LigaRules, ExtratoFinanceiroCache)
4. **P2 Performance:** Adicionar `.lean()` em 136 queries de leitura (backlog)

---

## Histórico de Correções Recentes

### ✅ Auditoria P1/P2 Direta (2026-01-17)

**Análise P1 - Multi-Tenant:**
- `rodadaController.js` ✅ SEGURO - todas queries filtram por `ligaId`
- `artilheiroCampeaoController.js` ✅ SEGURO - validação de liga obrigatória

**Análise P1 - Auth:**
- `routes/gols.js` ✅ ACEITÁVEL - exige `ligaId` obrigatório
- `routes/configuracao-routes.js` 🔴 CORRIGIDO - `/limpar-cache` sem auth

**FIX Aplicado:**
- `routes/configuracao-routes.js:146` - Adicionado `verificarAdmin` middleware

**Análise P2 - Índices:**
- ModuleConfig ✅ `{liga_id, temporada, modulo}` único
- AjusteFinanceiro ✅ `{liga_id, time_id, temporada, ativo}`
- LigaRules ✅ `{liga_id, temporada}` único
- ExtratoFinanceiroCache ✅ `{liga_id, time_id, temporada}` único
- CartolaOficialDump ⚠️ `meta.liga_id` não indexado (Data Lake, raramente filtrado)

**Análise P2 - Performance:**
- 136 queries sem `.lean()` (backlog - implementar logger antes)
- 567 console.logs (requer logger configurável - backlog)

### ✅ Fix Multi-Tenant golsController.js (2026-01-17)

**Arquivos:** `controllers/golsController.js` v2.0, `public/js/gols.js` v2.0

**Problema:** Queries sem filtro `ligaId` permitiam vazamento de dados entre ligas

**Correções:**
- `listarGols`: Agora exige `ligaId` obrigatório no query string
- `extrairGolsDaRodada`: Agora exige `ligaId` no body + campos alinhados ao model
- Frontend atualizado para passar `ligaId`

**Script audit_multitenant.sh melhorado:**
- Verificação multiline (5 linhas de contexto)
- Reconhece padrões válidos: `ligaId`, `liga_id`, `liga.times`, `time_id`, `timeId`
- Ignora rotas admin/tesouraria/proxy intencionais

### ✅ Skills & Scripts de Auditoria (2026-01-17)

**Implementado:**
- Framework SPARC (Security/Performance/Architecture/Reliability/Code Quality)
- Scripts: audit_full, audit_security, audit_multitenant, detect_dead_code, check_dependencies
- Patterns específicos: Multi-tenant, Cache-First, Regras financeiras completas
- Documentação: Wiki Viva methodology, Gemini Audit integration

**Aliases criados:**
```bash
audit           # Auditoria completa
audit-security  # Análise de segurança
audit-tenant    # Validação multi-tenant
```

### ✅ Jogos do Dia v2.0 (2026-01-17)

**Arquivos:** `routes/jogos-ao-vivo-routes.js` v2.0, `public/participante/js/modules/participante-jogos.js` v3.0

**Mudanças:** Endpoint `?date={hoje}`, cache inteligente (2min/10min), jogos encerrados visíveis

### ✅ Fix China Guardiola - Crédito 2026 (2026-01-17)

**Corrigido:** `controllers/inscricoesController.js` v1.4 - Transferência de crédito em renovações com `pagouInscricao=true`

### ✅ PWA Install Prompt (Implementado)

**Arquivo:** `public/participante/js/install-prompt.js` v1.1

---

## Referência Rápida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

### Status API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```

---

## Próxima Ação Recomendada

### Imediato (P1 - CRÍTICO)
1. ~~**Executar baseline de auditoria**~~ ✅ Concluído
2. **Revisar queries multi-tenant** - `rodadaController.js`, `artilheiroCampeaoController.js`
3. **Verificar auth** em `routes/gols.js` e `routes/configuracao-routes.js`

### Curto Prazo (P2)
1. Adicionar `.lean()` em 135 queries para performance
2. Criar índices `liga_id` nos 5 models identificados
3. Remover console.logs de produção (567 encontrados)

### Quando Brasileirão 2026 Iniciar
1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Executar `bash scripts/audit_multitenant.sh` para validar queries 2026

---