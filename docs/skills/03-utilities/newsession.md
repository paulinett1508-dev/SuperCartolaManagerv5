# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## STATUS ATUAL: AUDITORIA FINANCEIRA CONCLUIDA

**Data:** 09/02/2026
**Ultima acao:** Todos os bugs financeiros fixados + auditoria confirmou ZERO divergencias
**Plano original:** `.claude/plans/lucky-plotting-teacup.md`

---

## RESULTADO DA AUDITORIA

```
Temporada 2026: 43 participantes auditados | 0 divergencias
Temporada 2025: 49 participantes auditados | 0 divergencias
```

---

## BUGS CORRIGIDOS (historico)

### BUG 1: AjusteFinanceiro AUSENTE das rotas bulk da Tesouraria (CRITICO)
- **Status:** FIXADO v3.2
- **Fix:** `AjusteFinanceiro.find(...)` adicionado ao `Promise.all` dos 3 endpoints bulk
- **Endpoints:** `/participantes`, `/liga/:ligaId`, `/resumo`

### BUG 2: Double-counting de inscricao/legado
- **Status:** FIXADO v3.3
- **Problema:** Quando `apenasTransacoesEspeciais=true`, `saldo_consolidado` ja incluia inscricao/legado e `aplicarAjusteInscricaoBulk` os reaplicava
- **Fix:** Para 2026+, iniciar `saldoConsolidado=0` e somar apenas transacoes nao tratadas por `aplicarAjusteInscricaoBulk`
- **Endpoints:** `/participantes` (L234-247), `/liga/:ligaId` (L635-646), `/resumo` (L1459-1470)

### BUG 2b: Condicao antiga em /liga/:ligaId
- **Status:** FIXADO v3.3
- **Problema:** Usava `t.rodada === 0 || t.tipo` (truthy para TUDO em cache v4.0.0)
- **Fix:** Trocado por `TIPOS_ESPECIAIS.includes(t.tipo)` (mesma condicao do /participantes e /resumo)

### BUG 3: audit-financeiro.cjs totalmente quebrado
- **Status:** FIXADO v3.2
- **Fix:** Script deprecado, substituido por `scripts/auditoria-financeira-completa.js`

### BUG 4: Query strategies divergentes entre endpoints
- **Status:** BY DESIGN
- `/participantes` busca `temporada: N` (exata)
- `/liga/:ligaId` busca `temporada: {$in: [N, N-1]}` com sort/prioridade
- Intencional para transicao de temporada; mecanismo de prioridade garante dados corretos

### BUG 5: /resumo conta credores como quitados
- **Status:** FIXADO v3.2
- **Fix:** Logica if/else if/else correta separando devedores, credores e quitados

---

## TASK LIST (TODAS CONCLUIDAS)

```
#1. [completed] Fix MCP Mongo authentication
#2. [completed] Criar script auditoria-financeira-completa.js
#3. [completed] Fix BUG 1 - AjusteFinanceiro ausente do bulk tesouraria (v3.2)
#4. [completed] Fix BUG 2 - Double-counting inscricao/legado (v3.3)
#5. [completed] Fix BUGs 4 e 5 - Query temporada e contagem resumo (v3.2)
#6. [completed] Reescrever audit-financeiro.cjs → auditoria-financeira-completa.js
#7. [completed] Auditoria final: ZERO divergencias em 2025 e 2026
```

---

## ARQUIVOS CRITICOS

| Arquivo | Papel | Status |
|---------|-------|--------|
| `utils/saldo-calculator.js` | FONTE DA VERDADE | Correto (v2.0) |
| `routes/tesouraria-routes.js` | 4 endpoints financeiros | FIXADO v3.3 |
| `controllers/fluxoFinanceiroController.js` | Calculo real-time | Referencia |
| `controllers/extratoFinanceiroCacheController.js` | Cache + funcoes compartilhadas | Referencia |
| `models/AjusteFinanceiro.js` | Ajustes dinamicos 2026+ | Referencia |
| `models/InscricaoTemporada.js` | Inscricao/renovacao | Referencia |
| `scripts/auditoria-financeira-completa.js` | Script auditoria completa | Correto v1.1 |
| `scripts/audit-financeiro.cjs` | DEPRECADO | Substituido |
| `.mcp.json` | Config MCP Mongo | FIXADO |

---

## ARQUITETURA FINANCEIRA (Resumo)

```
6 Collections:
  extratofinanceirocaches  -> Cache consolidado (rodadas + saldo)
  fluxofinanceirocampos    -> 4 campos manuais fixos (< 2026)
  ajustesfinanceiros       -> Ajustes dinamicos ilimitados (>= 2026)
  acertofinanceiros        -> Pagamentos e recebimentos reais
  inscricoestemporada      -> Inscricao, legado, divida anterior
  ligarules                -> Regras configuraveis por liga/temporada

Formula Master (saldo-calculator.js):
  SALDO = (cache.rodadas + campos + ajustes - inscricao + legado - divida) + (totalPago - totalRecebido)

4 Caminhos de Calculo (TODOS SINCRONIZADOS):
  1. calcularSaldoParticipante() -> fonte da verdade (N+1 queries)
  2. /participantes inline       -> bulk otimizado (v3.3 sincronizado)
  3. /liga/:ligaId inline        -> bulk otimizado (v3.3 sincronizado)
  4. /resumo inline              -> bulk otimizado (v3.3 sincronizado)
```

---

## DADOS DE REFERENCIA

**Liga principal:** Super Cartola 2026
- Liga ID: `684cb1c8af923da7c7df51de`
- Inscricao: R$ 180,00
- CURRENT_SEASON: 2026

**Como rodar auditoria:**
```bash
node scripts/auditoria-financeira-completa.js --dry-run
node scripts/auditoria-financeira-completa.js --dry-run --liga=684cb1c8af923da7c7df51de
node scripts/auditoria-financeira-completa.js --dry-run --temporada=2025
```

---

**STATUS: AUDITORIA FINANCEIRA COMPLETA - Todos os caminhos de calculo sincronizados**
