# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## STATUS ATUAL: Bug Critico Identificado - PC nao integra no Extrato

**Data:** 07/02/2026
**Ultima acao:** Auditoria completa do extrato financeiro Paulinett Miranda (2025 + 2026)

---

## BUG CRITICO PARA PROXIMA SESSAO

### Pontos Corridos NAO propaga valores para o Extrato Financeiro

**Severidade:** ALTA - Afeta TODOS os participantes de TODAS as ligas
**Descoberto em:** Auditoria do extrato Paulinett Miranda (time_id: 13935277)

**Evidencia concreta (Liga Super Cartola 2026):**

| Dado | Valor |
|------|-------|
| PC Rodada 1 (R2 Brasileirao) | Paulinett (49.3) vs Raimundo Pinheiro (85.3) = DERROTA = **-R$5** |
| Extrato R2 campo `pontosCorridos` | **0** (deveria ser -5) |
| Saldo no cache | -27 (apenas B/O) |
| Saldo correto | **-32** (B/O + PC) |

**Causa provavel:**
O `fluxoFinanceiroController.js` ou `extratoFinanceiroCacheController.js` consolida o extrato
usando apenas o ranking da rodada (bonusOnus), mas NAO integra o valor financeiro do PC
calculado pelo modulo `pontosCorridosCacheController`. O confronto PC existe na collection
`pontoscorridoscaches` com `financeiro: -5`, porem esse valor nao e propagado para o
campo `pontosCorridos` do `historico_transacoes` no `extratofinanceirocaches`.

**Arquivos a investigar:**
1. `controllers/fluxoFinanceiroController.js` - funcao `getExtratoFinanceiro()` (como monta o extrato)
2. `controllers/extratoFinanceiroCacheController.js` - funcao `salvarExtratoCache()` (como salva o cache)
3. `public/participante/js/modules/participante-extrato.js` - como o frontend calcula e envia ao backend
4. Integracoes entre PC cache e extrato cache

**Config PC 2026 (SuperCartola):**
```
rodada_inicial: 2 (R2 do Brasileirao = R1 do PC)
formato: round_robin
V=+5, E=+3, D=-5
tolerancia_empate: 0.3
goleada >= 50pts: bonus R$2 + 1pt
```

**Para corrigir:**
1. Identificar ONDE o extrato busca (ou deveria buscar) o valor PC de cada rodada
2. Garantir que ao consolidar/salvar o extrato, o campo `pontosCorridos` seja populado
3. Recalcular os extratos de TODOS os participantes das 2 rodadas ja consolidadas
4. Verificar se MM e Top10 tem o mesmo problema (provavelmente sim quando iniciarem)

**Comando sugerido:** `/workflow corrigir integracao PC/MM/Top10 no extrato financeiro 2026`

---

### Pendencia anterior: APIs 404 em Liga Nova (Os Fuleros)

**Problema:** Ao acessar liga recem-criada, APIs retornam 404:
```
GET /api/ranking-turno/6977a62071dee12036bb163e?turno=geral&temporada=2026 -> 404
GET /api/ranking-cache/6977a62071dee12036bb163e?temporada=2026 -> 404
```

**Para investigar:**
1. Verificar rotas em `routes/ranking*.js`
2. Verificar se liga nova precisa de inicializacao de cache
3. Confirmar se e comportamento esperado em pre-temporada

---

## CONTEXTO DA AUDITORIA REALIZADA

### Extrato Paulinett 2025 (HISTORICO - Hall da Fama apenas)

Dados de 2025 ficam como referencia historica. Bugs identificados mas NAO precisam de correcao:

| Bug | Descricao |
|-----|-----------|
| `temporada: null` | Cache criado com versao 3.4.0, campo temporada ausente |
| Top10 zerado | 2 MICOs existem mas T10=0 em todas rodadas (versao antiga) |
| PC divergente | Extrato PC=-25 vs Cache PC=-9 (delta incorreto) |
| 9 rodadas sem posicao | Snapshots tem posicao mas extrato perdeu dados |
| Fix script com tabela errada | `fix-extrato-paulinett-sc-2025.js` usa B/O incorretos |

### Extrato Paulinett 2026 (ATIVO)

| Componente | Valor | Status |
|------------|-------|--------|
| R1 B/O (Pos 34/35) | -14 | OK |
| R2 B/O (Pos 33/35) | -13 | OK |
| R2 PC | 0 (deveria -5) | **BUG** |
| R2 MM | 0 | OK (R2 e classificatoria) |
| Campos manuais | 0 | OK |
| Acertos | 0 | OK |
| Lancamentos iniciais | 0 | OK (owner isento) |
| **Saldo cache** | **-27** | **INCORRETO (deveria -32)** |

### Parametrizacao 2026 SuperCartola

| Modulo | Rodada Inicio | Config |
|--------|--------------|--------|
| Ranking (BANCO) | R1 | 35 times, credito 1-12, neutro 13-23, debito 24-35 |
| Pontos Corridos | R2 | V=+5, E=+3, D=-5 |
| Mata-Mata | R3 (classif R2) | 32 times, 7 edicoes, V=+10, D=-10 |
| Top10 | Acumulado | Mito +30..+12, Mico -30..-12 |
| Melhor Mes | R1 | 7 edicoes (R1-4, R5-8, R9-13, R14-18, R19-25, R26-33, R34-38), campeao R$80 |
| Artilheiro | Acumulado | 1o=R$30, 2o=R$20, 3o=R$10 |
| Luva de Ouro | Acumulado | 1o=R$30, 2o=R$20, 3o=R$10 |
| Capitao de Luxo | Acumulado | 1o=R$25, 2o=R$15, 3o=R$10 |

### Calendario MM 2026 (6 edicoes default)

| Edicao | Classificatoria | Primeira | Oitavas | Quartas | Semis | Final |
|--------|----------------|----------|---------|---------|-------|-------|
| 1 | R2 | R3 | R4 | R5 | R6 | R7 |
| 2 | R9 | R10 | R11 | R12 | R13 | R14 |
| 3 | R15 | R16 | R17 | R18 | R19 | R20 |
| 4 | R21 | R22 | R23 | R24 | R25 | R26 |
| 5 | R26 | R27 | R28 | R29 | R30 | R31 |
| 6 | R32 | R33 | R34 | R35 | R36 | R37 |

Nota: Wizard configurou 7 edicoes mas calendario default tem 6. A 7a precisa ser criada.

---

## CONTEXTO DO SISTEMA

### Classificacao de Modulos

| Tipo | Modulos | Default |
|------|---------|---------|
| **Base** | extrato, ranking, rodadas, historico | `true` (sempre) |
| **Opcionais** | top10, melhorMes, pontosCorridos, mataMata, artilheiro, luvaOuro, campinho, dicas | `false` (admin configura) |

### Servidor
- Rodando na porta 3000
- NODE_ENV=development
- CURRENT_SEASON=2026
- Temporada status: ativa (2 rodadas consolidadas, rodada atual 3)

---

**PROXIMA SESSAO:** Corrigir integracao PC -> Extrato (e validar MM/Top10 quando iniciarem).
