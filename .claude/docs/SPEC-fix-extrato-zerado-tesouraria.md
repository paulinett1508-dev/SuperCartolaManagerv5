# SPEC - Fix Extrato Zerado ao Registrar Acerto via Tesouraria

**Data:** 2026-01-17
**Baseado em:** PRD-fix-extrato-zerado-tesouraria.md
**Status:** Implementado (Documentacao Retroativa)

---

## Resumo da Implementacao

Bug critico onde `ExtratoFinanceiroCache.deleteOne()` era chamado apos registrar/remover acertos financeiros via Tesouraria, **zerando todo o historico de rodadas** do participante (bonus/onus, Pontos Corridos, Mata-Mata, Top10). A correcao removeu o `deleteOne()` e adicionou comentarios explicativos seguindo o padrao ja implementado em `acertos-financeiros-routes.js` v1.4.0.

---

## Arquivos Modificados (Ordem de Execucao)

### 1. routes/tesouraria-routes.js - Correcao do Bug

**Path:** `routes/tesouraria-routes.js`
**Tipo:** Modificacao
**Impacto:** CRITICO
**Versao:** v2.4.0 → v2.24.0

#### Mudancas Cirurgicas:

**Linha 7-11: ATUALIZAR Header de Versao**
```javascript
// ANTES (v2.4.0):
// * @version 2.4.0
// * ✅ v2.4.0: FIX - Invalidar cache COM temporada para evitar inconsistências

// DEPOIS (v2.24.0):
 * @version 2.24.0
 * ✅ v2.24.0: FIX CRÍTICO - NÃO deletar cache do extrato ao registrar acertos
 *   - Bug v2.4 deletava cache, zerando histórico (rodadas, PC, MM, Top10)
 *   - Acertos são armazenados em coleção separada e integrados na consulta
 *   - Ref: acertos-financeiros-routes.js v1.4.0
```
**Motivo:** Documentar a correcao no header do arquivo.

---

**Linha 1105-1118 (POST /api/tesouraria/acerto): REMOVER deleteOne + ADICIONAR Comentario**
```javascript
// ANTES (BUG v2.4):
// Invalidar cache para forçar recálculo
await ExtratoFinanceiroCache.deleteOne({
    liga_id: String(ligaId),
    time_id: Number(timeId),
    temporada: Number(temporada),
});

// DEPOIS (FIX v2.24):
// =========================================================================
// ✅ v2.5 FIX CRITICO: NÃO DELETAR CACHE DO EXTRATO
//
// BUG ANTERIOR (v2.4): deleteOne() zerava todos os dados históricos
// (rodadas, Timeline, P.Corridos, MataMata, Top10, etc.)
//
// Acertos são armazenados em coleção SEPARADA (AcertoFinanceiro) e
// são integrados no momento da consulta em getExtratoFinanceiro().
// O cache deve ser PRESERVADO - apenas o saldo final muda.
//
// Ref: acertos-financeiros-routes.js v1.4.0 (mesma lógica)
// =========================================================================
console.log(`[TESOURARIA] ✅ Acerto registrado para time ${timeId} (cache preservado)`)
```
**Motivo:** Acertos financeiros sao armazenados em colecao separada (`AcertoFinanceiro`) e integrados dinamicamente na consulta do extrato. Deletar o cache apagava dados historicos imutaveis (rodadas consolidadas).

---

**Linha 1230-1237 (DELETE /api/tesouraria/acerto/:id): REMOVER deleteOne + ADICIONAR Comentario**
```javascript
// ANTES (BUG v2.4):
// Invalidar cache após remoção
await ExtratoFinanceiroCache.deleteOne({
    liga_id: String(acerto.ligaId),
    time_id: Number(acerto.timeId),
    temporada: Number(acerto.temporada),
});

// DEPOIS (FIX v2.24):
// ✅ v2.5 FIX CRITICO: NÃO DELETAR CACHE DO EXTRATO
// Acertos são armazenados em coleção separada e integrados na consulta
// Ref: acertos-financeiros-routes.js v1.4.0
console.log(`[TESOURARIA] ✅ Acerto removido para time ${acerto.timeId} (cache preservado)`)
```
**Motivo:** Mesma logica do POST - acertos sao separados do cache de rodadas.

---

## Mapa de Dependencias

```
routes/tesouraria-routes.js (MODIFICADO)
    |
    |-> models/AcertoFinanceiro.js [Sem mudanca - armazena acertos]
    |-> models/ExtratoFinanceiroCache.js [Sem mudanca - armazena historico]
    |
    |-> routes/acertos-financeiros-routes.js [REFERENCIA - v1.4.0 ja correto]
    |
    |-> controllers/extratoFinanceiroCacheController.js [Sem mudanca]
    |       |-> deleteOne() na linha 1437 e LEGITIMO (endpoint admin explícito)
    |
    |-> controllers/fluxoFinanceiroController.js [Sem mudanca]
            |-> deleteOne() na linha 474 e LEGITIMO (recalculo forcado)
```

---

## Scripts de Recuperacao (Criados)

### 1. scripts/fix-extrato-jb-oliveira-sc-2025.js
**Funcao:** Reconstrucao simples do extrato a partir de snapshots
**Uso:** `node scripts/fix-extrato-jb-oliveira-sc-2025.js --dry-run`

### 2. scripts/fix-completo-jb-oliveira-sc-2025.js
**Funcao:** Correcao completa (extrato + acertos incorretos + limbo)
**Uso:** `node scripts/fix-completo-jb-oliveira-sc-2025.js --execute`

**Logica de Reconstrucao:**
1. Buscar `rodadasnapshots` para posicoes semanais
2. Calcular bonus/onus com tabela oficial (32 times)
3. Buscar `pontoscorridoscaches` para PC
4. Buscar `matamatacaches` para MM
5. Buscar `top10caches` para Mitos/Micos
6. Reconstruir `ExtratoFinanceiroCache.historico_transacoes`
7. Desativar acertos incorretos (14/jan e 17/jan)
8. Ajustar limbo para zerar saldo

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas queries incluem `liga_id`
- [x] Verificado isolamento entre ligas
- [x] Bug nao afetava multi-tenant (apenas perdia dados do proprio participante)

### Autenticacao
- [x] Rotas POST/DELETE protegidas com `verificarAdmin`
- [x] Nenhuma mudanca em middlewares

---

## Casos de Teste

### Teste 1: Registrar Acerto via Tesouraria
**Setup:** Participante com historico de 36 rodadas no extrato
**Acao:** POST /api/tesouraria/acerto com pagamento de R$ 100
**Resultado Esperado:**
- Acerto salvo em `AcertoFinanceiro`
- `ExtratoFinanceiroCache.historico_transacoes` preservado (36 rodadas)
- Console: "[TESOURARIA] ✅ Acerto registrado para time X (cache preservado)"

### Teste 2: Remover Acerto via Tesouraria
**Setup:** Participante com acerto existente e historico de rodadas
**Acao:** DELETE /api/tesouraria/acerto/:id
**Resultado Esperado:**
- Acerto marcado como `ativo: false`
- Historico de rodadas preservado
- Console: "[TESOURARIA] ✅ Acerto removido para time X (cache preservado)"

### Teste 3: Verificar Saldo Apos Acerto
**Setup:** Participante com saldo_temporada = -478
**Acao:** Registrar pagamento de R$ 478
**Resultado Esperado:**
- saldoFinal = 0 (quitado)
- Historico de rodadas intacto
- Se temporada < CURRENT_SEASON: auto-quitacao ativada

---

## Rollback Plan

### Em Caso de Regressao
**Passos de Reversao:**
1. Identificar commit anterior: `git log --oneline -5`
2. Reverter: `git revert [hash]`
3. Se dados foram perdidos, usar scripts de reconstrucao

### Reconstrucao Manual
```bash
# Adaptar scripts existentes para outro participante:
# 1. Copiar script
cp scripts/fix-completo-jb-oliveira-sc-2025.js scripts/fix-completo-[nome].js

# 2. Editar TIME_ID e LIGA_ID no novo script

# 3. Executar
node scripts/fix-completo-[nome].js --dry-run
node scripts/fix-completo-[nome].js --execute
```

---

## Checklist de Validacao

### Arquivos Solicitados
- [x] `routes/tesouraria-routes.js` - Arquivo original completo lido
- [x] `routes/acertos-financeiros-routes.js` - Referencia lida
- [x] `scripts/fix-completo-jb-oliveira-sc-2025.js` - Script verificado

### Dependencias Mapeadas
- [x] Outros usos de deleteOne verificados (todos legitimos)
- [x] Controllers que usam ExtratoFinanceiroCache analisados
- [x] Nenhum outro arquivo com o mesmo bug

### Mudancas Documentadas
- [x] Linhas especificas identificadas (1105-1118, 1230-1237)
- [x] Codigo antes/depois claramente definido
- [x] Motivo de cada mudanca explicado

### Seguranca
- [x] Multi-tenant validado
- [x] Autenticacao verificada
- [x] Rollback plan documentado

---

## Regra Estabelecida (Prevencao Futura)

> **NUNCA deletar `ExtratoFinanceiroCache` ao registrar/remover acertos financeiros.**
>
> Acertos sao armazenados em colecao separada (`AcertoFinanceiro`) e sao integrados
> dinamicamente no momento da consulta em `getExtratoFinanceiro()`.
>
> O cache contem dados historicos imutaveis (rodadas consolidadas) que NAO devem ser perdidos.
>
> **Codigo de Referencia:** `routes/acertos-financeiros-routes.js` v1.4.0

---

## Status Final

| Item | Status |
|------|--------|
| Bug corrigido em tesouraria-routes.js | ✅ v2.24.0 |
| Referencia acertos-financeiros-routes.js | ✅ v1.4.0 (ja correto) |
| Scripts de recuperacao | ✅ Criados e testados |
| Dados JB Oliveira | ✅ Reconstruidos |
| Documentacao | ✅ Este SPEC |

---

**Gerado por:** Spec Protocol v1.0
**Correcao aplicada em:** 2026-01-17
**Proxima Acao:** Nenhuma (bug ja corrigido e dados recuperados)
