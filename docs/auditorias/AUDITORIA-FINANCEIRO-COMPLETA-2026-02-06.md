# AUDITORIA FINANCEIRA COMPLETA - TEMPORADA 2026

**Data:** 2026-02-06
**Escopo:** Sistema financeiro end-to-end (backend admin → frontend participante)
**Versão do Sistema:** saldo-calculator v2.0.0 | fluxoFinanceiro v8.7.0 | extratoCache v6.8 | tesouraria v3.0

---

## 1. ARQUITETURA FINANCEIRA - VISÃO GERAL

### Fonte Única de Verdade
O módulo `utils/saldo-calculator.js` (v2.0.0) é a **fonte única de verdade** para cálculo de saldo. Todos os módulos (Tesouraria, Extrato Cache, Acertos, Inscrições) devem usar suas funções.

### Fórmula Master

```
SALDO FINAL = SALDO TEMPORADA + SALDO ACERTOS

Onde:
  SALDO TEMPORADA = saldo_consolidado(rodadas) + campos_manuais + ajustes + inscrição
  SALDO ACERTOS   = totalPago - totalRecebido
```

### Fórmula por Rodada (o que o usuário pediu)

```
Saldo Rodada N = Saldo Rodada (N-1)
               + Créditos da Rodada N (bônus ranking, vitória PC, vitória MM)
               - Débitos da Rodada N (ônus ranking, derrota PC, derrota MM)
```

**Implementação real:** `saldoAcumulado[N] = saldoAcumulado[N-1] + saldo[N]`

Onde `saldo[N] = bonusOnus + pontosCorridos + mataMata + top10`

---

## 2. COLLECTIONS FINANCEIRAS

| Collection | Modelo | Propósito |
|-----------|--------|-----------|
| `extratofinanceirocaches` | ExtratoFinanceiroCache | Cache consolidada do extrato (rodada a rodada) |
| `acertofinanceiros` | AcertoFinanceiro | Pagamentos/recebimentos reais (PIX, transferência) |
| `fluxofinanceirocampos` | FluxoFinanceiroCampos | 4 campos editáveis manuais (LEGADO ≤2025) |
| `ajustesfinanceiros` | AjusteFinanceiro | Ajustes dinâmicos ilimitados (2026+) |
| `inscricoestemporada` | InscricaoTemporada | Registro de inscrição/renovação + transferência de saldos |
| `ligarules` | LigaRules | Configuração financeira por liga/temporada |

---

## 3. MÓDULOS FINANCEIROS - REGRAS DETALHADAS

### 3.1 BANCO DA RODADA (Ranking por Pontuação)

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | A cada rodada finalizada |
| **Tipo** | Bônus (positivo) ou Ônus (negativo) |
| **Cálculo** | Posição no ranking da rodada → valor configurado |
| **Exemplo** | 1º lugar: +R$10, último: -R$10 |
| **Fluxo** | Per-round, imediato na consolidação |
| **Transaction Type** | `BONUS` / `ONUS` / `BANCO_RODADA` |

**No extrato:** Aparece na coluna `B/O` de cada rodada.

---

### 3.2 PONTOS CORRIDOS

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | A cada rodada (confronto direto) |
| **Tipo** | Bônus/Ônus simultâneo |
| **Valores padrão** | Vitória: +R$5 | Empate: +R$3 | Derrota: -R$5 |
| **Goleada** | ≥50pts diferença: ±R$2 extra |
| **Tolerância empate** | 0.3 pontos |
| **Início** | Rodada 7 (configurável) |
| **Turnos** | 1 (ida) ou 2 (ida+volta) |
| **Transaction Type** | `PONTOS_CORRIDOS` |

**No extrato:** Coluna `PC` de cada rodada.

---

### 3.3 MATA-MATA

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | A cada confronto do bracket (per-round) |
| **Tipo** | Bônus/Ônus por resultado |
| **Valores padrão** | Vitória: +R$10 | Derrota: -R$10 |
| **Edições** | 6 por temporada (rodadas 3-37) |
| **Formato** | 8/16/32 times (eliminatória simples) |
| **Progressivo** | Opcional: semi/final com valores maiores |
| **Transaction Type** | `MATA_MATA` |

**No extrato:** Coluna `MM` da rodada correspondente.

---

### 3.4 TOP 10 MITOS/MICOS

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | FIM DA TEMPORADA (ranking histórico consolidado) |
| **Tipo** | Bônus (Mito) + Ônus (Mico) |
| **Mitos** | 10 melhores pontuações: 1º R$30, 2º R$28... 10º R$12 |
| **Micos** | 10 piores pontuações: 1º -R$30, 2º -R$28... 10º -R$12 |
| **Decremento** | R$2 por posição (configurável) |
| **Transaction Type** | `MITO` / `MICO` |

**No extrato:** Coluna `Top10` na rodada onde ocorreu a pontuação. NÃO calculado por rodada - histórico consolidado.

---

### 3.5 MELHOR DO MÊS

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | FIM DA TEMPORADA (por edição mensal) |
| **Tipo** | Bônus apenas |
| **Edições** | 7 por temporada (blocos de rodadas) |
| **Prêmio edição** | R$20 por edição vencida |
| **Bônus campeão geral** | R$50 para quem venceu mais edições |
| **Transaction Type** | `MELHOR_MES` |

**No extrato:** Não aparece per-rodada. Consolidado no saldo final.

---

### 3.6 ARTILHEIRO CAMPEÃO

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | FIM DA TEMPORADA |
| **Tipo** | Bônus apenas (top 3) |
| **Prêmios** | 1º R$30 | 2º R$20 | 3º R$10 |
| **Cálculo** | Saldo de gols (G - GC) dos scouts Cartola |
| **Transaction Type** | `ARTILHEIRO` |

**No extrato:** Não aparece per-rodada. Consolidado no saldo final.

---

### 3.7 CAPITÃO DE LUXO

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | FIM DA TEMPORADA |
| **Tipo** | Bônus apenas (top 3) |
| **Prêmios** | 1º R$25 | 2º R$15 | 3º R$10 |
| **Cálculo** | Soma dos pontos do capitão (já dobrados pela API) |
| **Transaction Type** | `CAPITAO_LUXO` |

**No extrato:** Não aparece per-rodada. Consolidado no saldo final.

---

### 3.8 LUVA DE OURO

| Aspecto | Detalhe |
|---------|---------|
| **Quando aplica** | FIM DA TEMPORADA |
| **Tipo** | Bônus apenas (top 3) |
| **Prêmios** | 1º R$30 | 2º R$20 | 3º R$10 |
| **Cálculo** | Soma dos pontos dos goleiros escalados |
| **Transaction Type** | `LUVA_OURO` |

**No extrato:** Não aparece per-rodada. Consolidado no saldo final.

---

## 4. TIMING DOS MÓDULOS - QUANDO O DINHEIRO ENTRA/SAI

```
DURANTE A TEMPORADA (per-round):
┌─────────────────────────────────────────────────────────┐
│  Rodada N finaliza                                       │
│  ├── Banco: bônus/ônus por posição no ranking           │
│  ├── Pontos Corridos: vitória/empate/derrota            │
│  └── Mata-Mata: vitória/derrota do confronto            │
│                                                          │
│  → saldo[N] = banco + PC + MM                           │
│  → saldoAcumulado[N] = saldoAcumulado[N-1] + saldo[N]  │
└─────────────────────────────────────────────────────────┘

FIM DA TEMPORADA (consolidado):
┌─────────────────────────────────────────────────────────┐
│  ├── Top 10 Mitos/Micos: ranking histórico              │
│  ├── Melhor do Mês: prêmio por edição + geral           │
│  ├── Artilheiro: top 3 gols                             │
│  ├── Capitão de Luxo: top 3 capitães                    │
│  └── Luva de Ouro: top 3 goleiros                       │
│                                                          │
│  → Lançados como transações especiais no historico       │
└─────────────────────────────────────────────────────────┘

A QUALQUER MOMENTO (operações admin):
┌─────────────────────────────────────────────────────────┐
│  ├── Ajustes: créditos/débitos manuais dinâmicos        │
│  ├── Acertos: pagamentos/recebimentos reais (PIX etc)   │
│  ├── Campos manuais: 4 campos editáveis (legado ≤2025)  │
│  └── Inscrição: taxa + saldo transferido + dívida       │
└─────────────────────────────────────────────────────────┘
```

---

## 5. FLUXO COMPLETO DO SALDO

### 5.1 Cálculo Backend (saldo-calculator.js)

```javascript
// PASSO 1: Buscar cache consolidado
cache = ExtratoFinanceiroCache.findOne({ liga_id, time_id, temporada })

// PASSO 2: Recalcular a partir das transações
rodadas = transformarTransacoesEmRodadas(cache.historico_transacoes)
campos = FluxoFinanceiroCampos.findOne({ temporada })
resumo = calcularResumoDeRodadas(rodadas, campos)
saldoConsolidado = resumo.saldo  // banco + PC + MM + top10 + campos

// PASSO 3: Somar ajustes dinâmicos (2026+)
ajustes = AjusteFinanceiro.calcularTotal()
saldoConsolidado += ajustes.total

// PASSO 4: Processar inscrição (2026+)
if (temporada >= 2026 && inscrição não está no cache) {
    if (!pagouInscricao) saldoConsolidado -= taxaInscricao
    saldoConsolidado += saldoTransferido
    saldoConsolidado -= dividaAnterior
}

// PASSO 5: Calcular acertos
acertos = AcertoFinanceiro.calcularSaldoAcertos()
// saldoAcertos = totalPago - totalRecebido

// PASSO 6: Saldo Final
saldoFinal = saldoConsolidado + saldoAcertos
```

### 5.2 Frontend (reflexo puro)

O frontend `fluxo-financeiro-core.js` calcula localmente:
```javascript
saldoTemporada = bonus + onus + pontosCorridos + mataMata + top10 + campo1..4
saldoFinal = saldoTemporada + saldo_acertos
```

E exibe o extrato rodada a rodada com `saldoAcumulado` progressivo.

**Regra importante:** O frontend NUNCA faz cálculos de negócio próprios. Ele recebe dados do backend e apenas formata/exibe. A exceção é o cálculo local do extrato para performance, que replica a fórmula do backend.

---

## 6. PROTEÇÕES E IDEMPOTÊNCIA

| Mecanismo | Onde | Como |
|-----------|------|------|
| Flag `quitacao.quitado` | ExtratoFinanceiroCache | Impede quitação dupla |
| Janela 60s anti-duplicata | Acertos e Ajustes | Rejeita transação idêntica em <60s |
| `cache_permanente` | ExtratoFinanceiroCache | Temporadas finalizadas não recalculam |
| `inscricaoJaNoCache` check | saldo-calculator.js | Evita deduzir taxa de inscrição 2x |
| Recálculo de `saldoAcumulado` no save | salvarExtratoCache() | Backend corrige dados corrompidos |
| Soft delete | Todos os modelos financeiros | Nunca hard-delete, sempre `ativo: false` |
| Filtro por temporada | Todas as queries | Impede mistura 2025/2026 |

---

## 7. SEMÂNTICA DE ACERTOS (PAGAMENTOS)

| Tipo | Significado | Efeito no Saldo |
|------|-------------|-----------------|
| `pagamento` | Participante PAGOU à liga | **+saldo** (quita dívida) |
| `recebimento` | Participante RECEBEU da liga | **-saldo** (usa crédito) |

**Fórmula:** `saldoAcertos = totalPago - totalRecebido`

**Exemplo 1 - Devedor pagando:**
- saldoTemporada = -R$100 (deve R$100)
- Participante PAGA R$100
- saldoAcertos = 100 - 0 = +100
- saldoFinal = -100 + 100 = **R$0** (quitado)

**Exemplo 2 - Credor recebendo:**
- saldoTemporada = +R$100 (tem crédito R$100)
- Participante RECEBE R$100
- saldoAcertos = 0 - 100 = -100
- saldoFinal = +100 + (-100) = **R$0** (recebeu)

---

## 8. TRANSIÇÃO DE TEMPORADA

### Fluxo de Renovação
```
1. Admin configura LigaRules (taxa, prazo, regras)
2. Sistema inicializa InscricaoTemporada para cada participante
3. Admin processa decisão unificada (quitar temporada anterior + renovar)
4. Tipos de quitação: zerado | integral | customizado
5. Transações iniciais criadas no cache:
   - INSCRICAO_TEMPORADA (taxa como débito, se não pagou)
   - SALDO_TEMPORADA_ANTERIOR (legado transferido)
6. Nova temporada começa com saldo inicial calculado
```

### Cálculo do Saldo Inicial
```
saldoInicial =
  - taxaInscricao (se não pagou upfront)
  + saldoTransferido (crédito da temporada anterior)
  - dividaAnterior (dívida carregada)
```

---

## 9. PROBLEMAS ENCONTRADOS

### 9.1 BUG - N+1 Query no /resumo (PERFORMANCE)

**Arquivo:** `routes/tesouraria-routes.js` (endpoint `/api/tesouraria/resumo`)
**Problema:** Loop com `calcularSaldoParticipante()` individual para cada participante de cada liga.
**Impacto:** Para N participantes × M ligas = N×M queries ao banco.
**Solução:** Usar padrão bulk como no endpoint `/participantes` (que já resolve isso).

**Severidade:** Media (performance, não afeta cálculo)

---

### 9.2 BUG - Breakdown de Inscrição ausente em endpoints bulk

**Arquivo:** `routes/tesouraria-routes.js` (endpoints `/participantes` e `/liga/:ligaId`)
**Problema:** O breakdown retornado inclui `banco, PC, MM, top10, campos, acertos` mas NÃO inclui `taxaInscricao, saldoAnteriorTransferido, dividaAnterior`. Já o endpoint `/participante/:ligaId/:timeId` (individual) retorna esses campos.
**Impacto:** Inconsistência na resposta entre endpoints bulk vs individual.
**Solução:** Adicionar campos de inscrição ao breakdown dos endpoints bulk.

**Severidade:** Baixa (dados existem, apenas não são expostos em bulk)

---

### 9.3 OBSERVAÇÃO - totalPerdas armazena valores negativos

**Arquivo:** `controllers/extratoFinanceiroCacheController.js:379-382`
**Comportamento:** `totalPerdas` acumula valores negativos (ex: -100) em vez de absolutos (100).
**Impacto:** O frontend precisa interpretar corretamente que perdas são negativas. Funciona, mas semanticamente confuso.
**Recomendação:** Documentar a convenção OU usar `Math.abs()` para clareza.

**Severidade:** Info (funcional, apenas semântica)

---

### 9.4 OBSERVAÇÃO - Detecção de pagamento de inscrição por texto

**Arquivo:** `routes/tesouraria-routes.js` (POST `/api/tesouraria/acerto`)
**Problema:** Além do flag `ehPagamentoInscricao`, há detecção por texto na descrição (`includes("inscrição")`). Um acerto com descrição "Ajuste de inscrição anterior" poderia triggar falso-positivo.
**Recomendação:** Usar apenas o flag explícito `ehPagamentoInscricao` do body.

**Severidade:** Baixa (flag tem prioridade, texto é fallback)

---

### 9.5 OBSERVAÇÃO - Auto-Quitação apenas para temporadas passadas

**Arquivo:** `routes/tesouraria-routes.js:1145`
**Comportamento:** Auto-quitação (quando saldo chega a zero) só funciona para `temporada < CURRENT_SEASON`. Temporada corrente exige quitação manual.
**Justificativa possível:** Temporada corrente ainda pode ter movimentações, então auto-quitar seria prematuro.

**Severidade:** Info (comportamento intencional, mas vale documentar)

---

### 9.6 OBSERVAÇÃO - Tipos de ID inconsistentes entre collections

| Collection | Campo | Tipo |
|-----------|-------|------|
| ExtratoFinanceiroCache | `time_id` | Number |
| AcertoFinanceiro | `timeId` | String |
| FluxoFinanceiroCampos | `timeId` | String |
| AjusteFinanceiro | `time_id` | Number |
| InscricaoTemporada | `time_id` | Number |

**Impacto:** Mongoose faz coerção automática, mas pode causar queries ineficientes ou bugs sutis em comparações `===`.
**Mitigação atual:** `saldo-calculator.js` converte explicitamente: `String(ligaId)`, `Number(timeId)`.

**Severidade:** Baixa (mitigado, mas tech debt)

---

## 10. VALIDAÇÃO DA FÓRMULA PRINCIPAL

### O que o usuário pediu:
```
saldo Rodada anterior
+ créditos da rodada (todos os módulos)
- débitos da rodada (todos os módulos)
= saldo rodada vigente
```

### Como está implementado:

**Per-rodada** (`transformarTransacoesEmRodadas`, linha 520):
```javascript
r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10
```

**Acumulado** (`salvarExtratoCache`, linhas 1063-1074):
```javascript
let saldoAcumulado = 0;
rodadasArray.forEach(r => {
    saldoAcumulado += r.saldo;        // Soma progressiva
    r.saldoAcumulado = saldoAcumulado; // Grava no registro
});
```

**Validação:**
```
saldoAcumulado[1] = saldo[1]
saldoAcumulado[2] = saldoAcumulado[1] + saldo[2]
saldoAcumulado[N] = saldoAcumulado[N-1] + saldo[N]
```

**RESULTADO:** A fórmula `saldo_anterior + créditos - débitos = saldo_vigente` está **CORRETAMENTE IMPLEMENTADA** no nível de rodadas.

O campo `saldo[N]` já é o resultado líquido (créditos - débitos) de todos os módulos per-round. O `saldoAcumulado` é a soma progressiva que dá o saldo "corrente" a cada rodada.

### Proteção dupla:
O backend **recalcula** o saldoAcumulado antes de salvar (`salvarExtratoCache`, linha 1056), mesmo que o frontend envie dados incorretos. Isso garante integridade.

---

## 11. FLUXO ADMIN → PARTICIPANTE

```
┌──────────────────────────────────────────────────────────────┐
│                         ADMIN (Backend)                       │
│                                                              │
│  1. Consolidação de rodada                                   │
│     → Calcula banco + PC + MM por participante               │
│     → Salva em ExtratoFinanceiroCache.historico_transacoes    │
│                                                              │
│  2. Consolidação de temporada (fim)                          │
│     → Calcula Top10 + Melhor Mês + Artilheiro + Capitão     │
│     → Luva de Ouro                                           │
│     → Adiciona como transações especiais                     │
│                                                              │
│  3. Ajustes manuais (admin)                                  │
│     → Cria AjusteFinanceiro (crédito/débito)                 │
│     → Campos editáveis (legado 2025)                         │
│                                                              │
│  4. Acertos financeiros (pagamentos reais)                   │
│     → Registra pagamento/recebimento                         │
│     → Auto-troco se valor > dívida                           │
│                                                              │
│  5. Tesouraria (dashboard consolidado)                       │
│     → Usa saldo-calculator.js como fonte de verdade          │
│     → Breakdown por módulo para cada participante            │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ API REST
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    PARTICIPANTE (Frontend)                     │
│                                                              │
│  1. Busca extrato via API                                    │
│     GET /api/extrato-cache/:ligaId/times/:timeId/cache       │
│     GET /api/fluxo-financeiro/:ligaId/extrato/:timeId        │
│                                                              │
│  2. fluxo-financeiro-core.js replica fórmula localmente:     │
│     saldoTemporada = bonus + onus + PC + MM + top10 + campos │
│     saldoFinal = saldoTemporada + saldoAcertos              │
│                                                              │
│  3. Exibe tabela rodada a rodada com saldoAcumulado          │
│     Colunas: Rod | Pos | B/O | PC | MM | Top10 | Saldo      │
│                                                              │
│  4. Cards de resumo:                                         │
│     Bônus | Ônus | Pts Corridos | Mata-Mata | Top 10        │
│                                                              │
│  5. Saldo final com color coding:                            │
│     Verde: positivo | Vermelho: negativo | Cinza: zero       │
│                                                              │
│  ⚠️ Frontend é REFLEXO PURO do backend.                      │
│     Nenhuma regra de negócio exclusiva do frontend.           │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. CONCLUSÃO

### O que está CORRETO:
- A fórmula `saldo_anterior + créditos - débitos = saldo_vigente` está implementada corretamente
- O `saldo-calculator.js` centraliza a lógica como fonte de verdade
- Idempotência está protegida em todos os pontos críticos
- Segregação temporal (por temporada) está consistente
- Frontend é reflexo puro dos cálculos do backend
- Proteção dupla: backend recalcula antes de salvar
- Soft delete em todas as operações financeiras
- Auditoria completa (quem criou/atualizou/quando)

### O que pode melhorar:
1. **Performance:** Endpoint `/resumo` com N+1 queries (bug #9.1)
2. **Consistência API:** Breakdown de inscrição ausente em endpoints bulk (bug #9.2)
3. **Padronização:** Tipos de ID (Number vs String) entre collections (obs #9.6)
4. **Documentação:** Convenção de sinais em `totalPerdas` (obs #9.3)

### Risco financeiro: **BAIXO**
O sistema calcula corretamente. Os problemas encontrados são de performance e consistência de API, não de cálculo incorreto de valores.
