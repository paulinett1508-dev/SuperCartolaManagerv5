# AUDITORIA COMPLETA - MÓDULO FINANCEIRO

**Data:** 2026-02-01
**Auditor:** Claude Code (Opus 4.5)
**Escopo:** Controllers, Models, Routes, Frontend, Utils, Config — Tudo relacionado a fluxo financeiro, extratos, acertos, ajustes, quitação e inscrições.

---

## SUMÁRIO EXECUTIVO

O módulo financeiro é extenso (~60+ arquivos) e funcional, mas apresenta **discrepâncias críticas de padronização**, **inconsistências de tipos entre collections**, **riscos de segurança em rotas** e **29+ scripts de fix acumulados** que indicam fragilidade estrutural. Abaixo, cada achado com localização precisa.

---

## 1. DISCREPÂNCIAS CRÍTICAS DE TIPOS DE ID

### 1.1 `liga_id` — Tipo Mixed vs ObjectId vs String

| Collection/Model | Campo | Tipo | Arquivo |
|---|---|---|---|
| `ExtratoFinanceiroCache` | `liga_id` | `Mixed` (String ou ObjectId) | `models/ExtratoFinanceiroCache.js:9` |
| `AjusteFinanceiro` | `liga_id` | `ObjectId` | `models/AjusteFinanceiro.js:23` |
| `InscricaoTemporada` | `liga_id` | `ObjectId` | `models/InscricaoTemporada.js:19` |
| `LigaRules` | `liga_id` | `ObjectId` | `models/LigaRules.js:18` |
| `FluxoFinanceiroCampos` | `ligaId` | `String` | `models/FluxoFinanceiroCampos.js:8` |
| `AcertoFinanceiro` | `ligaId` | `String` | `models/AcertoFinanceiro.js:21` |

**Problema:** Três convenções diferentes (`liga_id` ObjectId, `liga_id` Mixed, `ligaId` String). O `saldo-calculator.js:41` usa `String(ligaId)` para ExtratoFinanceiroCache mas `String(ligaId)` para FluxoFinanceiroCampos e `String(ligaId)` para AcertoFinanceiro. Se `liga_id` é ObjectId em AjusteFinanceiro, a query com `String(ligaId)` **não encontrará documentos** a menos que Mongoose faça coerção.

**Impacto:** Queries podem retornar resultados vazios silenciosamente quando o tipo não bate. O campo `Mixed` no ExtratoFinanceiroCache é um workaround que mascara o problema.

### 1.2 `timeId` vs `time_id` — Nomenclatura Inconsistente

| Collection/Model | Campo | Tipo | Arquivo |
|---|---|---|---|
| `ExtratoFinanceiroCache` | `time_id` | `Number` | `models/ExtratoFinanceiroCache.js:13` |
| `AjusteFinanceiro` | `time_id` | `Number` | `models/AjusteFinanceiro.js:29` |
| `InscricaoTemporada` | `time_id` | `Number` | `models/InscricaoTemporada.js:27` |
| `FluxoFinanceiroCampos` | `timeId` | `String` | `models/FluxoFinanceiroCampos.js:13` |
| `AcertoFinanceiro` | `timeId` | `String` | `models/AcertoFinanceiro.js:26` |

**Problema:** Dois padrões (`time_id: Number` vs `timeId: String`). O CLAUDE.md documenta isso como intencional, mas na prática o `saldo-calculator.js:58` converte para `String(timeId)` ao buscar FluxoFinanceiroCampos, enquanto usa `Number(timeId)` para ExtratoFinanceiroCache. Se um time_id for buscado como String em um model que espera Number, a query falhará silenciosamente.

---

## 2. PROBLEMAS DE SEGURANÇA

### 2.1 Rotas Admin sem `verificarAdmin` Consistente

| Rota | Middleware | Arquivo | Risco |
|---|---|---|---|
| `GET /api/acertos/:ligaId/:timeId` | **Nenhum** | `acertos-financeiros-routes.js:72` | Qualquer usuário logado vê acertos de qualquer time |
| `GET /api/acertos/:ligaId/:timeId/saldo` | **Nenhum** | `acertos-financeiros-routes.js:110` | Qualquer usuário vê saldo de acertos |
| `GET /api/acertos/admin/:ligaId` | **Nenhum** | `acertos-financeiros-routes.js:136` | Rota "admin" SEM middleware admin |
| `GET /api/acertos/admin/:ligaId/resumo` | **Nenhum** | `acertos-financeiros-routes.js:493` | Resumo financeiro total sem proteção |
| `GET /api/fluxo-financeiro/:ligaId` | **Nenhum** | `fluxoFinanceiroRoutes.js:22` | Campos de todos os times da liga expostos |
| `GET /api/extrato-cache/*` | **Nenhum** | `extratoFinanceiroCacheRoutes.js:25-34` | Todo o cache de extratos exposto |
| `DELETE /api/extrato-cache/corrompidos/limpar` | **Nenhum** | `extratoFinanceiroCacheRoutes.js:52` | **CRÍTICO**: Delete sem autenticação |

**Destaque:** A rota `DELETE /api/extrato-cache/corrompidos/limpar` não tem NENHUM middleware de autenticação. Qualquer request pode limpar caches.

### 2.2 Middleware de Auth Duplicado

O arquivo `quitacao-routes.js:22-30` define seu **próprio** `requireAdmin()` inline em vez de usar o `verificarAdmin` importado nos demais arquivos. Verifica `req.session?.admin` enquanto o `verificarAdmin` do middleware provavelmente verifica `req.session?.usuario`. Se a lógica divergir, uma rota pode aceitar requests que a outra rejeita.

### 2.3 Hard Delete Exposto via Query String

```javascript
// acertos-financeiros-routes.js:459
const { hardDelete = false } = req.query;
if (hardDelete === "true") {
    await AcertoFinanceiro.findByIdAndDelete(id);
}
```

O hard delete é controlado por um simples query parameter `?hardDelete=true`. Não há confirmação extra, rate limiting, ou log de auditoria dedicado. Para um sistema financeiro, deletar registros permanentemente deveria requerer confirmação adicional.

---

## 3. INCONSISTÊNCIAS DE NOMENCLATURA

### 3.1 Campo Naming (camelCase vs snake_case)

| Padrão | Models que usam | Exemplos |
|---|---|---|
| **camelCase** | AcertoFinanceiro, FluxoFinanceiroCampos | `ligaId`, `timeId`, `nomeTime`, `dataAcerto` |
| **snake_case** | AjusteFinanceiro, InscricaoTemporada, LigaRules, ExtratoFinanceiroCache | `liga_id`, `time_id`, `criado_por`, `saldo_consolidado` |

**Problema:** O CLAUDE.md instrui "Nomenclatura em Português" mas não define camelCase vs snake_case. Os models mais novos (2026) usam snake_case enquanto os legados usam camelCase, criando confusão.

### 3.2 Timestamps Inconsistentes

| Model | Timestamps Config |
|---|---|
| AcertoFinanceiro | `timestamps: true` (default: createdAt/updatedAt em inglês) |
| AjusteFinanceiro | `timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' }` |
| InscricaoTemporada | `timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' }` |
| FluxoFinanceiroCampos | `timestamps: true` + campo manual `updatedAt` redundante |
| ExtratoFinanceiroCache | `timestamps: true` (inglês) |

Metade usa timestamps em português, metade em inglês. O FluxoFinanceiroCampos tem um campo `updatedAt` manual (linha 42-44) **além** do `timestamps: true` do Mongoose, resultando em duplicidade.

### 3.3 Collection Names — Explícitos vs Implícitos

| Model | Collection Explícita? | Nome Real |
|---|---|---|
| AjusteFinanceiro | Sim: `'ajustesfinanceiros'` | ajustesfinanceiros |
| InscricaoTemporada | Sim: `'inscricoestemporada'` | inscricoestemporada |
| LigaRules | Sim: `'ligarules'` | ligarules |
| AcertoFinanceiro | Não | acertofinanceiros (Mongoose pluraliza) |
| FluxoFinanceiroCampos | Não | fluxofinanceirocampos (Mongoose pluraliza) |
| ExtratoFinanceiroCache | Não | extratofinanceirocaches (Mongoose pluraliza) |

A pluralização automática do Mongoose pode gerar nomes inesperados. Se alguém acessar o MongoDB diretamente, pode se confundir com `acertofinanceiros` vs `ajustesfinanceiros`.

---

## 4. LÓGICA DE NEGÓCIO — RISCOS E INCONSISTÊNCIAS

### 4.1 Virtual `impactoSaldo` Contradiz Documentação

No `AcertoFinanceiro.js:103-107`:
```javascript
// Se participante PAGOU, o saldo dele DIMINUI
return this.tipo === "pagamento" ? -this.valor : this.valor;
```

Mas no método estático `calcularSaldoAcertos` (linha 140-158), a lógica é **inversa**:
```javascript
// Saldo = pago - recebido (PAGAMENTO AUMENTA saldo)
saldoAcertos: totalPago - totalRecebido
```

O virtual diz que pagamento **diminui** saldo, mas o método estático calcula pagamento como **aumento** de saldo. O virtual `impactoSaldo` nunca é usado no código (pesquisei e não há referências), mas se alguém o usar, vai calcular errado.

### 4.2 Fórmula de Saldo Inicial da Inscrição

No `InscricaoTemporada.js:377-379`:
```javascript
calcularSaldoInicial() {
    const taxa = this.pagou_inscricao ? 0 : (this.taxa_inscricao || 0);
    return taxa + (this.divida_anterior || 0) - (this.saldo_transferido || 0);
}
```

Mas no `LigaRules.js:223-260`, o `calcularValorInscricao` faz um cálculo mais sofisticado que considera `aproveitar_saldo_positivo`, limita crédito ao valor da taxa, e verifica se permite devedor renovar. As duas funções calculam a mesma coisa (saldo inicial) mas com lógicas diferentes — o `calcularSaldoInicial` do InscricaoTemporada é simplificado demais e pode divergir do LigaRules.

### 4.3 Campos Manuais — Sistema Legado vs Novo

O `FluxoFinanceiroCampos` (4 campos fixos, camelCase, String IDs) coexiste com `AjusteFinanceiro` (ilimitado, snake_case, ObjectId/Number IDs). O `AjusteFinanceiro.js:7` documenta que "Substituiu os 4 campos fixos a partir de 2026", mas o `saldo-calculator.js:57-65` **ainda busca FluxoFinanceiroCampos** para o cálculo:

```javascript
const camposDoc = await FluxoFinanceiroCampos.findOne({
    ligaId: String(ligaId),
    timeId: String(timeId),
}).lean();
```

O novo model `AjusteFinanceiro` **não aparece** no `saldo-calculator.js`. Isso significa que ajustes financeiros criados pelo novo sistema (2026+) **não são contabilizados** no cálculo centralizado de saldo.

### 4.4 FluxoFinanceiroCampos — Query Sem Temporada

No `saldo-calculator.js:57-60`, a query de FluxoFinanceiroCampos **não filtra por temporada**:
```javascript
const camposDoc = await FluxoFinanceiroCampos.findOne({
    ligaId: String(ligaId),
    timeId: String(timeId),
    // ❌ FALTA: temporada
}).lean();
```

Se um participante tem campos em 2025 e 2026, a query retorna o **primeiro** que encontrar (não necessariamente da temporada correta). O model tem campo `temporada` com índice unique composto, mas a query não usa.

### 4.5 Troco Automático — Race Condition

No `acertos-financeiros-routes.js:249-284`, o troco é calculado **antes** de salvar o pagamento principal (linha 303). Entre o cálculo do saldo e o save, outro request concorrente poderia alterar o saldo, resultando em troco incorreto. Não há lock otimista nem transação MongoDB.

---

## 5. PROBLEMAS ESTRUTURAIS

### 5.1 Excesso de Scripts de Fix (29+)

A existência de 29+ scripts de correção (`fix-saldo-*`, `fix-extrato-*`, `fix-leilson-*`, `fix-mauricio-*`, etc.) indica que:
1. Os cálculos não são determinísticos ou idempotentes
2. Não há reconciliação automática
3. Problemas são resolvidos caso-a-caso em vez de corrigir a raiz

Scripts com nomes de participantes específicos (`fix-leilson-saldo-2026.js`, `fix-mauricio-wendel-inscricao.js`, `fix-extrato-paulinett-sc-2025.js`) indicam que bugs afetaram indivíduos e foram patchados manualmente.

### 5.2 ExtratoFinanceiroCache — `liga_id` Mixed é Dívida Técnica

O campo `liga_id: Mixed` (linha 9) com comentário "Aceitar String ou ObjectId para compatibilidade" é um workaround que impede validação pelo Mongoose e permite dados inconsistentes. Qualquer novo documento pode ser String ou ObjectId, criando queries que precisam tratar ambos os casos.

### 5.3 `config/rules/extrato.json` — Hardcoded e Desatualizado

O arquivo `config/rules/extrato.json:12` tem `"temporada": 2026` hardcoded. A propriedade `campos_editaveis` define 4 campos fixos (campo1-4), mas o sistema novo usa `AjusteFinanceiro` com campos ilimitados. Este arquivo de configuração não reflete a arquitetura atual.

### 5.4 Duplicidade de HTML — `fluxo-financeiro.html`

Existem **duas versões** do mesmo arquivo:
- `/public/fluxo-financeiro.html`
- `/public/fronts/fluxo-financeiro.html`

Manter duas versões é fonte garantida de divergência futura.

---

## 6. FALTA DE IDEMPOTÊNCIA

O CLAUDE.md instrui: "Financial functions MUST be idempotent (prevent double-charging)". Verificação:

### 6.1 POST de Acertos — Sem Idempotência

O `POST /api/acertos/:ligaId/:timeId` (acertos-financeiros-routes.js:192) cria um novo documento **a cada chamada**, sem verificação de duplicidade. Se o frontend retry por timeout de rede, o mesmo acerto pode ser registrado múltiplas vezes. Não há `idempotencyKey` ou verificação de acerto duplicado.

### 6.2 POST de Ajustes — Sem Idempotência

Similarmente, `POST /api/ajustes/:ligaId/:timeId` (ajustesController.js) cria ajustes sem verificação de duplicidade.

### 6.3 Quitação — Sem Verificação de Estado

O `POST /api/quitacao/:ligaId/:timeId/quitar-temporada` deveria verificar se a temporada já foi quitada antes de processar. Há uma rota GET para verificar status, mas o POST pode não checar internamente.

---

## 7. PROBLEMAS DE PERFORMANCE

### 7.1 `calcularSaldoTotalParticipante` com Recálculo em Cada Request

No `acertos-financeiros-routes.js:50`, cada POST de acerto chama `calcularSaldoParticipante` com `recalcular: true`, que:
1. Busca cache do ExtratoFinanceiroCache
2. Processa todas as transações históricas
3. Busca FluxoFinanceiroCampos
4. Calcula resumo completo
5. Busca AcertoFinanceiro para saldo de acertos

São **3-4 queries ao MongoDB + processamento** apenas para calcular se há troco. Para ligas grandes, isso pode ser lento.

### 7.2 Agregação sem Índice Otimizado

No `acertos-financeiros-routes.js:498-540`, a agregação de resumo admin faz `$match` por `ligaId` (String) e `temporada` (Number) seguido de `$group` por `$timeId`. O índice composto do model é `{ ligaId: 1, timeId: 1, temporada: 1 }`, que serve para queries por time específico mas não é ideal para aggregations que agrupam por time (seria melhor `{ ligaId: 1, temporada: 1, timeId: 1 }`).

---

## 8. SUMÁRIO DE DISCREPÂNCIAS

| # | Severidade | Categoria | Descrição |
|---|---|---|---|
| 1 | **CRÍTICA** | Segurança | `DELETE /api/extrato-cache/corrompidos/limpar` sem autenticação |
| 2 | **CRÍTICA** | Lógica | AjusteFinanceiro (2026+) não contabilizado no saldo-calculator |
| 3 | **ALTA** | Segurança | 4 rotas "admin" sem middleware `verificarAdmin` |
| 4 | **ALTA** | Padronização | 3 tipos diferentes para `liga_id` (Mixed/ObjectId/String) |
| 5 | **ALTA** | Padronização | 2 padrões de `timeId` (Number vs String) |
| 6 | **ALTA** | Lógica | FluxoFinanceiroCampos buscado sem filtro de temporada |
| 7 | **ALTA** | Idempotência | POST de acertos/ajustes sem proteção contra duplicidade |
| 8 | **MÉDIA** | Segurança | Hard delete via query string sem confirmação extra |
| 9 | **MÉDIA** | Segurança | Middleware auth duplicado (requireAdmin inline vs verificarAdmin) |
| 10 | **MÉDIA** | Padronização | camelCase vs snake_case misturados entre models |
| 11 | **MÉDIA** | Padronização | Timestamps em inglês vs português |
| 12 | **MÉDIA** | Lógica | Virtual impactoSaldo contradiz calcularSaldoAcertos |
| 13 | **MÉDIA** | Lógica | calcularSaldoInicial simplificado demais vs LigaRules |
| 14 | **MÉDIA** | Lógica | Race condition no cálculo de troco automático |
| 15 | **MÉDIA** | Estrutural | 29+ scripts de fix indicam fragilidade |
| 16 | **BAIXA** | Estrutural | config/rules/extrato.json desatualizado |
| 17 | **BAIXA** | Estrutural | HTML duplicado (fluxo-financeiro) |
| 18 | **BAIXA** | Padronização | Collection names explícitos vs implícitos |

---

## 9. RECOMENDAÇÕES PRIORITÁRIAS

### Imediatas (Segurança)
1. Adicionar `verificarAdmin` nas rotas `DELETE /api/extrato-cache/corrompidos/limpar`
2. Adicionar middleware nas rotas GET admin (`/api/acertos/admin/:ligaId`, `/api/acertos/admin/:ligaId/resumo`)
3. Unificar middleware de auth — remover `requireAdmin` inline do `quitacao-routes.js`
4. Remover ou proteger hard delete de acertos

### Curto Prazo (Lógica)
5. Integrar `AjusteFinanceiro` no `saldo-calculator.js` — é a falha mais impactante
6. Adicionar filtro de `temporada` na query de FluxoFinanceiroCampos no saldo-calculator
7. Adicionar idempotência key nos POSTs de acertos e ajustes
8. Remover virtual `impactoSaldo` do AcertoFinanceiro (não usado e contraditório)

### Médio Prazo (Padronização)
9. Definir padrão único: snake_case para campos de banco, camelCase para variáveis JS
10. Migrar `liga_id` de Mixed para ObjectId no ExtratoFinanceiroCache (com script de migração)
11. Padronizar `timeId`/`time_id` para um único padrão em todos os models
12. Definir timestamps em português para todos os models financeiros
13. Explicitar collection names em todos os models

### Longo Prazo (Arquitetural)
14. Criar script de reconciliação automática que valide saldos periodicamente
15. Eliminar FluxoFinanceiroCampos gradualmente em favor de AjusteFinanceiro
16. Implementar transações MongoDB para operações críticas (troco, quitação)
17. Limpar scripts de fix já aplicados (mover para `scripts/applied-fixes/` ou deletar)

---

*Relatório gerado automaticamente. Todos os achados baseados em leitura direta do código-fonte.*
