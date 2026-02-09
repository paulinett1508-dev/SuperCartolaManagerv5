# Skill: newsession

Handover para nova sessão - carrega contexto do trabalho em andamento e instrui próximos passos.

---

## STATUS ATUAL: 🔴 AUDITORIA FINANCEIRA MEGA-PLANO | MCP Mongo fixado, aguardando restart

**Data:** 08/02/2026
**Última ação:** Plano de auditoria financeira APROVADO + Fix do .mcp.json (MCP Mongo)
**Plano completo:** `.claude/plans/lucky-plotting-teacup.md`

---

## 🎯 MISSÃO DESTA SESSÃO

**Auditoria completa do módulo financeiro** - Extrato individual, Tesouraria, Fluxo Financeiro e scripts de auditoria estão dessincronizados. Saldos de participantes divergem entre views.

---

## 🐛 5 BUGS ENCONTRADOS (com localização exata)

### BUG 1: AjusteFinanceiro AUSENTE das rotas bulk da Tesouraria (CRÍTICO)
- **Arquivo:** `routes/tesouraria-routes.js`
- **Linhas:** 132-139 (`/participantes`), 464-496 (`/liga/:ligaId`), 1312-1319 (`/resumo`)
- **Problema:** 3 de 4 endpoints NÃO consultam collection `ajustesfinanceiros`
- Apenas `/participante/:ligaId/:timeId` (L775-802) usa `calcularSaldoParticipante()` corretamente
- **Impacto:** Saldo ERRADO na tabela da tesouraria para qualquer participante com ajustes dinâmicos (2026+)
- **Fix:** Adicionar `AjusteFinanceiro.find(...)` ao `Promise.all` dos 3 endpoints

### BUG 2: Potencial double-counting de inscrição/legado
- **Arquivo:** `routes/tesouraria-routes.js` (L219-244 e L570-600)
- **Problema:** Quando `apenasTransacoesEspeciais=true`:
  1. Usa `saldo_consolidado` direto (que pode incluir inscrição/legado)
  2. Depois chama `aplicarAjusteInscricaoBulk` que soma inscrição/legado NOVAMENTE
- **Fix:** Não usar `saldo_consolidado` direto; somar transações especiais manualmente

### BUG 3: audit-financeiro.cjs totalmente quebrado
- **Arquivo:** `scripts/audit-financeiro.cjs`
- **Campos errados:** L206-208 consulta `timeId`/`ligaId` em ExtratoFinanceiroCache (deveria ser `time_id`/`liga_id`)
- **Fórmula invertida:** L153 `saldoAcertos = totalRecebido - totalPago` (deveria ser `totalPago - totalRecebido`)
- **Sem filtro temporada:** L168 busca sem temporada, mistura 2025/2026
- **Ignora:** AjusteFinanceiro e InscricaoTemporada

### BUG 4: Query strategies divergentes entre endpoints
- `/api/tesouraria/participantes` busca `temporada: N` (exata)
- `/api/tesouraria/liga/:ligaId` busca `temporada: {$in: [N, N-1]}` e depois filtra com sort/prioridade
- **Podem produzir mapas com dados de temporadas diferentes**

### BUG 5: /resumo conta credores como quitados
- **Arquivo:** `routes/tesouraria-routes.js` (L1401-1410)
- **Lógica bugada:**
```js
if (saldoFinal < -0.01) { qtdDevedores++ }
else { qtdQuitados++; if (saldoFinal > 0.01) { qtdCredores++ } }
// ↑ credores contados em qtdQuitados E qtdCredores simultaneamente
```

---

## ✅ O QUE JÁ FOI FEITO

### 1. Fix MCP Mongo (.mcp.json)
- Corrigido `cwd` de `/home/user/SuperCartolaManagerv5` para `/home/runner/workspace`
- Adicionado `MONGO_URI` e `NODE_ENV=production` no bloco `env`
- **Status:** Editado, aguardando restart do Claude Code para fazer efeito

### 2. Plano Aprovado
- Plano completo em `.claude/plans/lucky-plotting-teacup.md`
- Escopo: Temporadas 2025 + 2026
- Abordagem: Fix inline (manter performance bulk)
- 7 fases de execução definidas

---

## 📋 TASK LIST (não iniciadas exceto #1)

```
#1. [in_progress] Fix MCP Mongo authentication → .mcp.json editado, aguardando restart
#2. [pending] Criar script auditoria-financeira-completa.js
#3. [pending] Fix BUG 1 - AjusteFinanceiro ausente do bulk tesouraria
#4. [pending] Fix BUG 2 - Double-counting inscrição/legado
#5. [pending] Fix BUGs 4 e 5 - Query temporada e contagem resumo
#6. [pending] Reescrever audit-financeiro.cjs
```

---

## 🚀 PRÓXIMOS PASSOS (ao retomar)

### PASSO 1: Verificar MCP Mongo
```
Testar: mcp__mongo__list_collections
Se funcionar → prosseguir
Se falhar → debug da .mcp.json
```

### PASSO 2: Consultar banco para entender estado real
```
- Quantos participantes com AjusteFinanceiro ativo em 2026?
- Quantos com pagou_inscricao=false?
- Quantos caches com apenasTransacoesEspeciais?
- Divergência real entre saldo_consolidado e sum(historico_transacoes.saldo)?
```

### PASSO 3: Criar script auditoria-financeira-completa.js (Task #2)
Script que compara os 3 caminhos de cálculo para cada participante

### PASSO 4: Aplicar fixes (Tasks #3-#6)
Na ordem: BUG 1 → BUG 2 → BUGs 4+5 → BUG 3

### PASSO 5: Rodar auditoria novamente e confirmar zero divergências

---

## 📁 ARQUIVOS CRÍTICOS

| Arquivo | Papel | Status |
|---------|-------|--------|
| `utils/saldo-calculator.js` | FONTE DA VERDADE | Correto (v2.0) |
| `routes/tesouraria-routes.js` | 4 endpoints financeiros | BUGs 1,2,4,5 |
| `controllers/fluxoFinanceiroController.js` | Cálculo real-time | Referência |
| `controllers/extratoFinanceiroCacheController.js` | Cache + funções compartilhadas | Referência |
| `models/AjusteFinanceiro.js` | Ajustes dinâmicos 2026+ | Referência |
| `models/InscricaoTemporada.js` | Inscrição/renovação | Referência |
| `scripts/audit-financeiro.cjs` | Script auditoria individual | BUG 3 |
| `scripts/reconciliar-saldos-financeiros.js` | Reconciliação bulk | Limitado |
| `.mcp.json` | Config MCP Mongo | FIXADO ✅ |

---

## 🏗️ ARQUITETURA FINANCEIRA (Resumo)

```
6 Collections:
  extratofinanceirocaches  → Cache consolidado (rodadas + saldo)
  fluxofinanceirocampos    → 4 campos manuais fixos (< 2026)
  ajustesfinanceiros       → Ajustes dinâmicos ilimitados (>= 2026)
  acertofinanceiros        → Pagamentos e recebimentos reais
  inscricoestemporada      → Inscrição, legado, dívida anterior
  ligarules                → Regras configuráveis por liga/temporada

Fórmula Master (saldo-calculator.js):
  SALDO = (cache.rodadas + campos + ajustes - inscricao + legado - divida) + (totalPago - totalRecebido)

4 Caminhos de Cálculo:
  1. calcularSaldoParticipante() → fonte da verdade (N+1 queries)
  2. /participantes inline       → bulk otimizado (FALTA ajustes)
  3. /liga/:ligaId inline        → bulk otimizado (FALTA ajustes + query N-1)
  4. /resumo inline              → bulk otimizado (FALTA ajustes + contagem bugada)

Inconsistência de tipos:
  time_id: Number (cache, inscricao, ajustes) vs String (campos, acertos)
  liga_id: Mixed/ObjectId (cache, inscricao, rules) vs String (campos, acertos)
```

---

## 🔧 DADOS DE REFERÊNCIA

**Liga principal:** Super Cartola 2026
- Liga ID: `684cb1c8af923da7c7df51de`
- Inscrição: R$ 180,00
- CURRENT_SEASON: 2026

**Participante de teste:** Antônio Luis (FloriMengo FC)
- Time ID: `645089`
- pagouInscricao: `false`

---

**RETOMAR:** Verificar MCP Mongo → Consultar banco → Criar auditoria → Aplicar fixes 🎯
