# PRD - Correção do Saldo no Extrato de Renovação 2025→2026

**Data:** 2026-01-17
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** ALTA (Afeta vida financeira de participantes)

---

## Resumo Executivo

Durante o processo de renovação de temporada 2025→2026, foi identificada uma inconsistência crítica: **os acertos financeiros (pagamentos) registrados em 2026 NÃO estão sendo somados ao saldo exibido no extrato**. Isso causa confusão para o admin e participantes, pois o saldo mostrado não reflete a realidade.

Além disso, foram identificados padrões inconsistentes no tratamento de diferentes cenários de renovação (credor que pagou, credor que não pagou, devedor quitado, etc.).

---

## Contexto e Análise

### Casos Relatados vs Dados Reais no MongoDB

| Participante | Cenário | Relatado | Dados MongoDB | Status |
|-------------|---------|----------|---------------|--------|
| **Antonio Luis** | Devedor quitou 2025, renovou 2026 | Saldo -120 (inscrição -180 + acerto 60) | Extrato: -180, Acerto: 60 existe | **BUG: Acerto não soma** |
| **Cássio Marques** | Credor, pagou inscrição com crédito | Saldo +163.38 | Inscrição OK, **SEM CACHE extrato** | **BUG: Cache não criado** |
| **China Guardiola** | Credor, pagou inscrição com crédito | Saldo +241.54 | Cache: 241.54 ✅ | OK (fix manual) |
| **Diego Barbosa** | Devedor quitou 2025, pagou inscrição | Saldo -40 (inscrição + acerto 140) | Inscrição: 0, **SEM ACERTO** | Verificar acerto |
| **Diogo Monte** | Credor, usou crédito completo | Saldo +174 | Cache: 174 ✅ | OK |
| **Eudes Pereira** | Credor < taxa, saldo negativo | Saldo -68.46 | Cache: -68.46 ✅ | OK |
| **Felipe Barbosa** | Devedor não quitou 2025 | Saldo -180 | Cache: -180 | Verificar legado |
| **Lucio de Souza** | Novato | Saldo -180 | Cache: -180 ✅ | OK |
| **Paulinett Miranda** | Owner, isento | Saldo 0 | Cache: 0 ✅ | OK |

### Problemas Identificados

#### PROBLEMA 1: Acertos NÃO Somados no Extrato (CRÍTICO)

**Evidência:**
```javascript
// Collection: acertofinanceiros (2026)
{
  "timeId": "645089",  // Antonio Luis
  "tipo": "pagamento",
  "valor": 60,
  "descricao": "Entrada da inscrição 2026",
  "temporada": 2026
}

// Collection: extratofinanceirocaches (2026)
{
  "time_id": 645089,
  "saldo_consolidado": -180,  // DEVERIA SER -120!
  "historico_transacoes": [
    { "tipo": "INSCRICAO_TEMPORADA", "valor": -180 }
  ]
}
```

**Causa Raiz:**
O `extratoFinanceiroCacheController.js` calcula o saldo final como:
```javascript
saldo = rodadas + campos_manuais + acertos + lancamentos_iniciais
```

Porém, o saldo_consolidado no cache NÃO inclui os acertos automaticamente quando é criado pela renovação. O acerto é registrado separadamente e só é somado na LEITURA do extrato, não na ESCRITA do cache.

**Impacto:** O saldo exibido na tabela do Fluxo Financeiro mostra -180 quando deveria mostrar -120.

---

#### PROBLEMA 2: Cache NÃO Criado para Quem Pagou Inscrição

**Evidência:**
- Cássio Marques tem inscrição com `pagou_inscricao: true` e `saldo_inicial_temporada: 163.38`
- Porém NÃO tem documento em `extratofinanceirocaches` para 2026

**Causa Raiz:**
A função `criarTransacoesIniciais()` em `inscricoesController.js` linha 104-183:
```javascript
// Só cria transação se NÃO pagou inscrição
if (valores.taxa > 0 && valores.pagouInscricao === false && gerarDebitoInscricao) {
    // ... cria documento no extrato
}
```

Quando `pagouInscricao === true`, NENHUM documento é criado no extrato. Isso está tecnicamente correto (não há débito), mas causa problema quando há **saldo transferido**.

**Impacto:** Participantes que pagaram inscrição com crédito não têm extrato 2026, então o frontend não consegue mostrar o saldo remanescente.

---

#### PROBLEMA 3: Inconsistência na Lógica de Transferência de Crédito

**Cenário Correto (China Guardiola):**
```javascript
// Inscricao
{
  "temporada_anterior.saldo_final": 421.54,
  "pagou_inscricao": true,
  "saldo_transferido": 241.54,  // 421.54 - 180 = 241.54
  "saldo_inicial_temporada": 241.54
}

// Extrato
{
  "saldo_consolidado": 241.54,
  "historico_transacoes": [
    { "tipo": "SALDO_TEMPORADA_ANTERIOR", "valor": 241.54 }
  ]
}
```

**Cenário Inconsistente (Cássio Marques):**
```javascript
// Inscricao
{
  "temporada_anterior.saldo_final": 343.38,
  "pagou_inscricao": true,
  "saldo_transferido": 343.38,  // INCORRETO - deveria ser 163.38
  "saldo_inicial_temporada": 163.38  // CORRETO
}

// Extrato: NÃO EXISTE!
```

**Causa Raiz:**
A lógica em `processarRenovacao()` linha 380-393 tem ambiguidade:
```javascript
if (pagouInscricao) {
    // Pagou COM crédito - desconta a taxa e transfere o restante
    creditoUsado = creditoTotal;  // Todo crédito foi "usado"
    saldoTransferido = Math.max(0, creditoTotal - taxa);  // Restante após pagar
}
```

O campo `saldo_transferido` armazena o valor original (343.38) quando deveria armazenar o restante (163.38).

---

### Módulos Identificados

**Backend:**
- `controllers/inscricoesController.js` - Lógica de renovação (linhas 104-495)
- `controllers/extratoFinanceiroCacheController.js` - Cálculo de saldo (linha 57-112)
- `models/InscricaoTemporada.js` - Schema de inscrição
- `models/ExtratoFinanceiroCache.js` - Schema do cache

**Frontend:**
- `public/js/fluxo-financeiro/fluxo-financeiro-core.js` - Exibe tabela
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - Renderiza saldos
- `public/participante/js/modules/participante-extrato.js` - Extrato do participante

### Dependências Mapeadas

```
inscricoesController.processarRenovacao()
    ├── criarTransacoesIniciais() → extratofinanceirocaches
    ├── InscricaoTemporada.upsert() → inscricoestemporada
    └── adicionarParticipanteNaLiga() → Liga.participantes

extratoFinanceiroCacheController.lerCacheExtratoFinanceiro()
    ├── buscarAcertosFinanceiros() → acertofinanceiros
    ├── ExtratoFinanceiroCache.findOne() → extratofinanceirocaches
    └── FluxoFinanceiroCampos.findOne() → fluxofinanceirocampos
```

---

## Solução Proposta

### Abordagem 1: Fix Pontual (Recomendado para Curto Prazo)

Criar script de correção para atualizar os caches 2026 com os acertos já registrados e criar caches faltantes.

**Arquivos a Criar:**
1. `scripts/fix-extrato-2026-acertos.js` - Corrige saldos incluindo acertos

**Arquivos a Modificar:**
1. `controllers/inscricoesController.js` - Criar cache mesmo quando `pagouInscricao === true` se houver saldo transferido

---

### Abordagem 2: Refatoração da Lógica (Médio Prazo)

Unificar a lógica de cálculo de saldo para que o cache SEMPRE inclua todos os componentes:

1. Modificar `criarTransacoesIniciais()` para:
   - SEMPRE criar documento de extrato (mesmo sem débito)
   - Incluir transação SALDO_TEMPORADA_ANTERIOR quando houver crédito transferido

2. Modificar leitura do extrato para:
   - Somar acertos dinamicamente (já faz, mas verificar consistência)

---

## Regras de Negócio (Confirmadas)

### Cálculo do Saldo Final 2026

```
SALDO_2026 = LANCAMENTOS_INICIAIS + ACERTOS_2026

Onde:
- LANCAMENTOS_INICIAIS pode ser:
  - INSCRICAO_TEMPORADA: -taxa (negativo, débito)
  - SALDO_TEMPORADA_ANTERIOR: ±valor (positivo=crédito, negativo=dívida)

- ACERTOS_2026:
  - pagamento: +valor (participante pagou → quita dívida)
  - recebimento: -valor (admin pagou → usa crédito)
```

### Cenários de Renovação

| Cenário | pagouInscricao | Transações Criadas | Saldo Inicial |
|---------|----------------|-------------------|---------------|
| Credor pagou com crédito | true | SALDO_TEMPORADA_ANTERIOR (restante) | credito - taxa |
| Credor não pagou | false | INSCRICAO + SALDO_ANTERIOR | credito - taxa |
| Quitado pagou | true | (nenhuma) | 0 |
| Quitado não pagou | false | INSCRICAO | -taxa |
| Devedor carregou | false | INSCRICAO + SALDO_ANTERIOR (negativo) | -taxa - divida |
| Novato | false | INSCRICAO | -taxa |

---

## Riscos e Considerações

### Impactos Previstos
- **Positivo:** Saldos corretos para todos os participantes
- **Atenção:** Necessário rodar script para corrigir dados existentes
- **Risco:** Se não corrigir, participantes verão saldos errados

### Multi-Tenant
- [x] Validado: todas as queries usam `liga_id` como filtro

---

## Testes Necessários

### Cenários de Teste
1. **Antonio Luis:** Verificar se saldo = -180 + 60 = -120
2. **Cássio Marques:** Verificar se cache é criado com saldo = 163.38
3. **Novato sem acerto:** Verificar se saldo = -180
4. **Credor que pagou tudo:** Verificar se saldo = restante após taxa

---

## Dados para Script de Correção

### Participantes que Precisam de Correção

```javascript
// Antonio Luis - Acerto não refletido
{ time_id: 645089, saldo_atual: -180, acerto: 60, saldo_correto: -120 }

// Cássio Marques - Sem cache
{ time_id: 39786, saldo_inscricao: 163.38, cache_existe: false }
```

### Query para Verificar Inconsistências

```javascript
// Encontrar participantes com acertos 2026 não refletidos
db.acertofinanceiros.aggregate([
  { $match: { temporada: 2026, ativo: true } },
  { $group: {
    _id: "$timeId",
    totalAcertos: { $sum: { $cond: [{ $eq: ["$tipo", "pagamento"] }, "$valor", { $multiply: ["$valor", -1] }] } }
  }}
])
```

---

## Próximos Passos

1. **Validar PRD** com o admin
2. **Gerar Spec:** Executar `/spec PRD-correcao-saldo-extrato-renovacao-2026.md`
3. **Implementar:** Executar `/code` com Spec gerado
4. **Testar:** Verificar saldos de todos os renovados

---

**Gerado por:** Pesquisa Protocol v1.0
