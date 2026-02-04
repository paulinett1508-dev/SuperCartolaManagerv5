# PRD - Preparar Sistema para Rodada 2 do Cartola FC 2026

**Data:** 2026-02-04
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O sistema Super Cartola Manager está **plenamente operante na temporada 2026**. A rodada 1 já foi populada, consolidada e as disputas (Pontos Corridos, Rankings, Top10) estão acontecendo. A rodada 2 começa HOJE (04/02) com mercado fechando às 18:59. Este PRD documenta o estado atual e identifica se há algo a preparar para a rodada 2.

---

## Estado Atual do Sistema (VERIFICADO)

### Configuração de Temporada
| Item | Status | Valor |
|------|--------|-------|
| `CURRENT_SEASON` | ✅ OK | 2026 |
| `seasonGuard` | ✅ Ativo | `SEASON_FINISHED = false` |
| `SEASON_CONFIG.dataInicio` | ✅ OK | 2026-01-28 |

### Dados da Rodada 1 (Populados e Consolidados)

**Liga Super Cartola 2025** (`684cb1c8af923da7c7df51de`) - 32 times:
- ✅ Rodadas populadas (collection `rodadas`)
- ✅ Ranking Geral calculado (collection `rankinggeralcaches`) - Vitim 1o com 116.73 pts
- ✅ Pontos Corridos com 5 rodadas de confrontos (collection `pontoscorridoscaches`) - AltosShow líder com 13 pts
- ✅ Confrontos individuais com tipos `vitoria` e `goleada`

**Liga Cartoleiros do Sobral** (`684d821cf1a7ae16d1f89572`) - 6 times:
- A verificar (dados existem mas query por string de ligaId não retorna - tipo ObjectId)

### Módulos Ativos

**Super Cartola:**
- ✅ Extrato, Ranking, Rodadas, Top10, Melhor Mês, Pontos Corridos, Mata-Mata

**Cartoleiros do Sobral:**
- ✅ Extrato, Ranking, Rodadas, Top10, Artilheiro, Luva de Ouro

---

## Rodada 2 - Informações

### Calendário
- **Fechamento do mercado:** Quarta 04/02 às 18:59
- **Jogos válidos:** 9 (Athletico x Corinthians adiado - NÃO escalar)
- **Quarta 04/02:** Flamengo x Internacional (19h), Bragantino x Atlético-MG (19h), Santos x São Paulo (20h), Remo x Mirassol (20h), Palmeiras x Vitória (21:30), Grêmio x Botafogo (21:30)
- **Quinta 05/02:** Bahia x Fluminense (19h), Vasco x Chapecoense (20h), Cruzeiro x Coritiba (21:30)

### Fluxo Operacional (já funciona automaticamente)
1. Mercado fecha às 18:59 → `status_mercado = 2`
2. Parciais começam automaticamente (polling 5min via `parciais-scheduler.js`)
3. Jogos acontecem (04-05/02)
4. API Cartola consolida pontos
5. **Admin popula rodada 2:** `POST /api/rodadas/{ligaId}/rodadas` com `{ "rodada": 2 }`
6. **Admin consolida:** `POST /api/consolidacao/ligas/{ligaId}/rodadas/2/consolidar`
7. Caches atualizados automaticamente (rankings, top10, pontos corridos, etc.)

---

## Análise: Há Algo a Preparar?

### Sistema de Parciais (Ao Vivo)
O `parciais-scheduler.js` detecta automaticamente quando o mercado fecha e inicia o polling de atualizações a cada 5 minutos. Não requer ação manual.

### Sistema de Jogos ao Vivo
O endpoint `/api/jogos-ao-vivo` busca jogos do dia via SoccerDataAPI com fallbacks. Funciona automaticamente.

### População e Consolidação
Processo manual via painel admin, mesma rotina da rodada 1.

---

## Conclusão

**Não há preparação técnica ou de código necessária.** O sistema está operante e a rodada 2 segue o mesmo fluxo operacional da rodada 1. O admin precisa apenas:

1. Aguardar os jogos terminarem (05/02 noite)
2. Popular rodada 2 pelo painel admin
3. Consolidar rodada 2

---

**Gerado por:** Pesquisa Protocol v1.0
