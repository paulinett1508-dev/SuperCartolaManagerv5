# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-16)

### ⚠️ Bug Potencial - TOP10 sem filtro de temporada

**Arquivo:** `controllers/fluxoFinanceiroController.js` linha 213

**Problema:** Query do TOP10 nao filtra por temporada:
```javascript
// ATUAL (potencial bug)
const cache = await Top10Cache.findOne({ liga_id: String(ligaId) })

// CORRETO (deveria ter filtro)
const cache = await Top10Cache.findOne({
    liga_id: String(ligaId),
    temporada: temporada
})
```

**Impacto:** Se existir mais de um cache TOP10 para a mesma liga (ex: 2024 e 2025), pode retornar o cache errado.

**Status:** NAO AFETA SUPERCARTOLA 2025 (so existe um cache). Corrigir para prevenir problemas futuros.

**Prioridade:** BAIXA (preventivo)

---

## Historico de Correcoes Recentes

### ✅ Mega-Auditoria Financeira 2025 (2026-01-16)

**Escopo:** 26 participantes da Liga SUPERCARTOLA (excluindo 7 protegidos que ja renovaram 2026).

**Resultado:**
- 13 devedores: R$ 3.062,79 a receber
- 13 credores: R$ 6.887,84 a pagar

**Modulos Verificados:** Ranking Rodadas, Pontos Corridos, Mata-Mata, TOP10, Melhor do Mes, Campos Manuais.

**Conclusao:** Nenhuma correcao de saldo necessaria. Valores corretos.

**Relatorio:** `docs/auditorias/MEGA-AUDITORIA-2025-2026-01-16.md`

**Commit:** `01d35ad`

---

### ✅ Hall da Fama - Saldo Multi-Liga (2026-01-16)

**Problema:** Paulinett Miranda mostrava R$296 ao inves de -R$193.

**Causa:** API somava dados de TODAS as ligas ao inves de separar por liga.

**Correcao:**
- Backend v3.0: Mapas indexados por `liga_id`
- Frontend v12.12: Fallback JSON quando `cached: false`

**Commits:** `2f04570`, `7e5438a`

---

### ✅ Extrato 2026 - Pre-Temporada (2026-01-15)

**Problemas:** Tabela ROD/POS aparecia, dados fantasmas eram criados.

**Correcao:**
- `fluxo-financeiro-core.js` v6.7: Flag `isPreTemporada`, retorna `rodadas: []`
- `fluxo-financeiro-ui.js` v6.7: Condicional `!extrato.preTemporada`

**Status:** Verificado em 2026-01-16 - codigo correto.

---

### ✅ TOP10 - Liga Sobral (2026-01-15)

**Problema:** Sistema marcava MITO/MICO por "ser 1o da rodada" ao inves do ranking global.

**Correcao:** Script `fix-top10-extratos-sobral.js` executado.

**Resultado:** 74 correcoes em 6 extratos.

---

### ✅ Jogos ao Vivo - API-Football (2026-01-15)

**Feature:** Implementado `/api/jogos-ao-vivo` com API-Football.

**Fallback:** Scraper Globo Esporte para agenda.

---

### ✅ Liga Vazia + Cadastro Participantes (2026-01-15)

**Feature:** Criar liga sem participantes + ferramenta de cadastro independente.

**Commits:** `7fd9a81`, `2e6174b`

---

### ✅ Auditoria Debt Tecnico (2026-01-16)

**Analise:** 7 itens verificados do Claude Sonnet.

| Item | Status |
|------|--------|
| ID types inconsistentes | Documentado no CLAUDE.md |
| Flags hardcoded | Documentado no CLAUDE.md |
| Calculos duplicados | BY DESIGN |
| Nomenclatura PT/EN | BY DESIGN |
| Cache nao invalidado | BY DESIGN (acertos sao real-time) |
| Formula saldo | Ja estava correto |
| Mongoose deprecated | Corrigido em 2 scripts |

**Commit:** `75af296`

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Status da API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```
**Nota:** Pre-temporada ate API retornar `temporada: 2026`.

---

## Proxima Acao Recomendada

Quando Brasileirao 2026 iniciar (API retornar `temporada: 2026`):

1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Verificar se caches 2026 estao sendo criados corretamente

---
