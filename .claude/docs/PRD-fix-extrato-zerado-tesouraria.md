# PRD - Fix Extrato Zerado ao Registrar Acerto via Tesouraria

**Data:** 2026-01-17
**Autor:** Claude (Pesquisa Protocol)
**Status:** Implementado

---

## Resumo Executivo

Bug crítico identificado e corrigido onde registrar um acerto financeiro via Tesouraria **zerava completamente o extrato** do participante, apagando todo o histórico de rodadas (bônus/ônus, Pontos Corridos, Mata-Mata, Top10).

O caso foi detectado no participante **JB Oliveira** (ID: 164131) da liga Super Cartola 2025, cujo extrato foi zerado em 17/jan/2026 às 23:30.

---

## Contexto e Análise

### Problema Reportado
- Participante JB Oliveira tinha dívida de ~R$ 401
- Quitou a dívida via acerto financeiro
- Sistema zerou o extrato (histórico de rodadas desapareceu)
- Ao registrar novo acerto, sistema calculou troco incorreto

### Causa Raiz
**Arquivo:** `routes/tesouraria-routes.js` (linhas 1105-1113 e 1230-1237)

O código da versão v2.4 introduziu um `ExtratoFinanceiroCache.deleteOne()` que apagava o cache do extrato ao registrar acertos:

```javascript
// BUG (v2.4):
await ExtratoFinanceiroCache.deleteOne({
    liga_id: String(ligaId),
    time_id: Number(timeId),
    temporada: Number(temporada),
});
```

Este comportamento **contradizia** a lógica correta já implementada em `acertos-financeiros-routes.js` (v1.4.0), que preserva o cache:

```javascript
// ✅ v1.4.0: NÃO DELETAR CACHE DO EXTRATO
// Acertos são armazenados em coleção separada (AcertoFinanceiro)
// São integrados no momento da consulta em getExtratoFinanceiro()
```

### Impacto
- Perda de histórico de rodadas (36 rodadas do JB Oliveira)
- Cálculo incorreto de saldo (sistema viu dívida como R$ 55 em vez de R$ 478)
- Geração de troco incorreto (R$ 346)
- Acertos duplicados criados erroneamente

---

## Arquivos Afetados

### Backend (Corrigido)
- `routes/tesouraria-routes.js` - Removido `deleteOne()` nas rotas POST e DELETE de acertos

### Scripts (Criados)
- `scripts/fix-extrato-jb-oliveira-sc-2025.js` - Reconstrução simples do extrato
- `scripts/fix-completo-jb-oliveira-sc-2025.js` - Correção completa (extrato + acertos + limbo)

---

## Solução Implementada

### 1. Correção do Bug (tesouraria-routes.js v2.24.0)

**POST /api/tesouraria/acerto:**
```javascript
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
console.log(`[TESOURARIA] ✅ Acerto registrado para time ${timeId} (cache preservado)`)
```

**DELETE /api/tesouraria/:id:**
```javascript
// ✅ v2.5 FIX CRITICO: NÃO DELETAR CACHE DO EXTRATO
// Acertos são armazenados em coleção separada e integrados na consulta
// Ref: acertos-financeiros-routes.js v1.4.0
console.log(`[TESOURARIA] ✅ Acerto removido para time ${acerto.timeId} (cache preservado)`)
```

### 2. Reconstrução do Extrato (JB Oliveira)

Script `fix-completo-jb-oliveira-sc-2025.js` executou:

1. **Reconstrução do extrato** a partir de:
   - `rodadasnapshots` (posições semanais)
   - `pontoscorridoscaches` (Pontos Corridos)
   - `matamatacaches` (Mata-Mata)
   - `top10caches` (Mitos/Micos)

2. **Desativação de acertos incorretos:**
   - 14/jan: -R$ 5 (quitação automática baseada em saldo errado)
   - 17/jan: +R$ 401 (pagamento duplicado)
   - 17/jan: -R$ 346 (troco incorreto)

3. **Ajuste no limbo (campo manual):**
   - +R$ 77 para zerar diferença

### 3. Resultado Final

| Componente | Antes | Depois |
|------------|-------|--------|
| Rodadas no extrato | 0 | 36 |
| Saldo Temporada | R$ 0 | R$ -478 |
| Acerto mantido | R$ 401 | R$ 401 |
| Limbo | R$ 0 | R$ 77 |
| **Saldo Final** | **Incorreto** | **R$ 0 (QUITADO)** |

---

## Testes Realizados

### Dry-Run
```bash
node scripts/fix-completo-jb-oliveira-sc-2025.js --dry-run
```
- Confirmou saldo correto de -R$ 478
- Identificou 3 acertos a remover
- Calculou limbo de R$ 77

### Execução
```bash
node scripts/fix-completo-jb-oliveira-sc-2025.js --execute
```
- Extrato reconstruído: 1 documento modificado
- Acertos desativados: 3
- Limbo atualizado: 1

---

## Prevenção Futura

### Regra Estabelecida
**NUNCA deletar `ExtratoFinanceiroCache` ao registrar/remover acertos financeiros.**

Acertos são armazenados em coleção separada (`AcertoFinanceiro`) e são integrados dinamicamente no momento da consulta. O cache contém dados históricos imutáveis (rodadas consolidadas) que não devem ser perdidos.

### Código de Referência
Ver `routes/acertos-financeiros-routes.js` v1.4.0 para a implementação correta.

---

## Comandos Úteis

```bash
# Reconstruir extrato de participante (dry-run)
node scripts/fix-extrato-jb-oliveira-sc-2025.js --dry-run

# Aplicar correção completa
node scripts/fix-completo-jb-oliveira-sc-2025.js --execute

# Adaptar para outro participante: mudar TIME_ID no script
```

---

**Gerado por:** Pesquisa Protocol v1.0
**Correção aplicada em:** 2026-01-17
