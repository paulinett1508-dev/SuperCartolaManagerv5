# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Escudos Disponiveis
- 262 (Flamengo), 263 (Botafogo), 264 (Corinthians), 266 (Fluminense)
- 267 (Vasco), 275 (Palmeiras), 276 (Sao Paulo), 277 (Santos)
- 283 (Cruzeiro), 292 (Sport), 344 (RB Bragantino)
- default.png para clubes sem escudo

### Dados no MongoDB (2026)
| Participante | time_id | Saldo 2026 | Status |
|--------------|---------|------------|--------|
| Lucio | -1767569480236 | -R$180 | Deve |
| Felipe Barbosa | 8098497 | -R$180 | Deve |
| Antonio Luis | 645089 | -R$180 | Deve |
| Paulinett Miranda | 13935277 | R$0 | Pago |
| Diogo Monte | 25371297 | +R$174 | Pago (credito) |

---

## Tarefas Pendentes

_Nenhuma tarefa pendente no momento._

---

## Historico da Sessao 2026-01-14

### Auditoria e Correcao Caches 2025
**Status:** CONCLUIDO

**Problema identificado:**
- Caches de extrato financeiro 2025 estavam incompletos
- Top10 (MITO/MICO) nao estava sendo calculado
- 23 de 28 caches tinham valores errados
- Impacto financeiro: R$6.436 nao contabilizados

**Solucoes aplicadas:**

1. **Reconstrucao cache fucim (45004009):**
   - Cache tinha apenas 1 rodada, reconstruido com 38
   - Top10 calculado: 4 MITOs (+R$120), 1 MICO (-R$30)
   - Acerto corrigido: R$234 → R$261 para zerar saldo
   - Status: QUITADO

2. **Correcao de todos os 32 caches:**
   - Script: `scripts/corrigir-caches-2025.js`
   - Recalculado bonusOnus + Top10 para todos
   - Re-auditoria: 32/32 caches OK

3. **Auto-quitacao implementada:**
   - Arquivo: `routes/tesouraria-routes.js` v2.20
   - Quando acerto zera saldo de temporada anterior, marca quitado automaticamente

4. **Quitacao em lote (saldo < R$50):**
   - 8 participantes quitados automaticamente
   - Credores perdoados: R$90,59
   - Devedores perdoados: R$66,82

**Balanco Final 2025:**
| Metrica | Valor |
|---------|-------|
| Credores | 15 participantes (R$6.469,20) |
| Devedores | 8 participantes (R$1.937,92) |
| Quitados | 9 participantes |
| **Saldo Liga** | **-R$4.531,28** (admin deve) |

**Scripts criados:**
- `scripts/corrigir-caches-2025.js` - Recalcula todos os caches com Top10

### Auditoria Liga Sobral
**Status:** CONCLUIDO

**Problema:** 6 caches com Top10 incorreto

**Solucao:**
- Scripts: `scripts/auditar-caches-sobral.js`, `scripts/corrigir-caches-sobral.js`
- 6 caches corrigidos

**Balanco Sobral 2025:**
| Metrica | Valor |
|---------|-------|
| Credores | 2 (R$500) |
| Devedores | 4 (R$240) |
| Saldo Liga | -R$260 (admin deve) |

**Observacoes:**
- Liga Sobral nao tem bonusOnus (valores do banco = 0)
- Apenas Top10: MITO=+R$10, MICO=-R$10

---

## Historico da Sessao 2026-01-13

### Extrato 2026 - Cache Fix
**Status:** CORRIGIDO

**Problema:** Extrato 2026 mostrava dados de 2025 devido a cache persistente no IndexedDB.

**Solucao aplicada:**
- Incrementada versao do IndexedDB de 2 para 3 em `participante-cache.js`
- Quando usuarios acessarem o app, o banco sera recriado automaticamente
- Commit: `fix(cache): incrementa IndexedDB v3 para limpar cache de 2025`

### Fluxo Financeiro 2026 - Validado
**Status:** VALIDADO VIA API

**Testes realizados:**
- [x] Diogo Monte: saldo +R$174 (A RECEBER)
- [x] Paulinett Miranda: saldo R$0 (QUITADO)
- [x] Felipe Barbosa: saldo -R$180 (DEVE)
- [x] Logica de status: DEVE/QUITADO/A RECEBER (sem "ABATIDO")

### Jogos do Dia (Premium) - Validado
**Status:** VALIDADO VIA API

**Testes realizados:**
- [x] API retorna 3 jogos mock para premium (time_id 13935277)
- [x] API retorna jogos: [] para nao-premium
- [x] Badge "Preview" quando fonte = "mock"
- [x] Frontend integrado em participante-boas-vindas.js

---

## Historico da Sessao 2026-01-11

### Jogos do Dia (Premium) - IMPLEMENTADO

**Feature:** Exibir jogos do Brasileirao na tela inicial do app do participante.

**Arquivos modificados:**
- `routes/jogos-hoje-routes.js` v1.1 - API com mock para pre-temporada
- `public/participante/js/modules/participante-jogos.js` v1.1 - Modulo de jogos
- `public/participante/js/modules/participante-boas-vindas.js` v10.7 - Integracao

**Como funciona:**
- API consulta football-data.org para jogos do Brasileirao
- Em pre-temporada (sem jogos reais), retorna mock para premium
- Premium = time_id 13935277 (Paulinett Miranda)
- Card exibe: mandante vs visitante, horario, status (Em breve/Ao vivo/Encerrado)
- Badge "Preview" aparece quando usa dados mock

**API:**
```
GET /api/jogos-hoje?timeId=13935277
Response: { jogos: [...], premium: true, fonte: "mock"|"api", data: "2026-01-11" }
```

---

## Historico Arquivado

### 2026-01-11 - Seletor de Temporada UX
- **Status:** CONCLUIDO
- **Resumo:** Removido reload que saia da tela, implementada recarga dinamica
