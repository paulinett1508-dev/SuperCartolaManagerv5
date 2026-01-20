# PRD - Remover Botao Limpar Cache (Botao da Morte)

**Data:** 2026-01-20
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** P0 - CRITICO

---

## Resumo Executivo

O botao "Limpar Cache" no modal de extrato individual de participantes e um **risco critico de perda de dados**. Quando acionado, ele apaga permanentemente o cache do MongoDB **sem filtrar por temporada**, resultando em perda de dados historicos irrecuperaveis.

**Caso real:** O participante Leilson (ID 3300583) teve seu cache de 2025 apagado quando o admin clicou neste botao. Como 2025 e uma temporada encerrada, os dados sao irrecuperaveis automaticamente.

---

## Contexto e Analise

### Fluxo Atual do Botao

```
[Modal Extrato]
    → Botao "Limpar Cache" (onclick)
    → window.limparCacheExtratoModal()
    → window.recalcularCacheParticipante(timeId)
    → DELETE /api/extrato-cache/{ligaId}/times/{timeId}/limpar
    → limparCacheTime()
    → ExtratoFinanceiroCache.deleteOne({ liga_id, time_id })
    → ❌ APAGA DOCUMENTO COMPLETO (todas temporadas!)
```

### Arquivos Envolvidos

**Frontend:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
  - Linha 126-127: Botao no modal HTML
  - Linha 174-178: `window.limparCacheExtratoModal()`
  - Linha 4167-4232: `window.recalcularCacheParticipante()`

**Backend:**
- `controllers/extratoFinanceiroCacheController.js`
  - Linha 1442-1458: `limparCacheTime()` - **NAO FILTRA POR TEMPORADA**

**Rotas:**
- `routes/extratoFinanceiroCacheRoutes.js`
  - Linha 69: `DELETE /:ligaId/times/:timeId/limpar`
  - Linha 73: `DELETE /:ligaId/times/:timeId/cache`

### Bug Critico no Backend

```javascript
// extratoFinanceiroCacheController.js:1442-1458
export const limparCacheTime = async (req, res) => {
    const { ligaId, timeId } = req.params;
    // ❌ BUG 1: Nao recebe temporada como parametro
    // ❌ BUG 2: Nao valida se temporada e historica
    // ❌ BUG 3: Apaga TODAS temporadas do time
    const resultado = await ExtratoFinanceiroCache.deleteOne({
        liga_id: toLigaId(ligaId),
        time_id: Number(timeId),
        // ❌ FALTA: temporada: temporadaNum
    });
}
```

### Protecao Frontend (Insuficiente)

O frontend TEM uma protecao, mas:
1. Pode ser bypassada chamando a API diretamente
2. O backend NAO valida - e a ultima linha de defesa

```javascript
// fluxo-financeiro-ui.js:4178-4184
if (temporadaAtual < TEMPORADA_CARTOLA) {
    alert(`Temporada ${temporadaAtual} esta encerrada...`);
    return;
}
```

---

## Solucao Proposta

### Abordagem: REMOVER O BOTAO COMPLETAMENTE

O botao "Limpar Cache" e **desnecessario e perigoso**:

1. **Desnecessario:** O cache e invalidado automaticamente quando:
   - Nova rodada e consolidada
   - Campos manuais sao alterados
   - Acertos financeiros sao registrados

2. **Perigoso:** Permite apagar dados permanentes sem backup

3. **Confuso:** Admins nao entendem a diferenca entre "Atualizar" e "Limpar Cache"

### Arquivos a Modificar

1. **`public/js/fluxo-financeiro/fluxo-financeiro-ui.js`**
   - REMOVER: Botao HTML (linhas 126-128)
   - REMOVER: `window.limparCacheExtratoModal()` (linhas 174-178)
   - REMOVER: `window.recalcularCacheParticipante()` (linhas 4167-4232)
   - REMOVER: `window.limparCacheLiga()` (linhas 4237-4287)

2. **`controllers/extratoFinanceiroCacheController.js`**
   - REMOVER: `limparCacheTime()` (linhas 1442-1458)
   - REMOVER: `limparCacheLiga()` (linhas 1425-1440)
   - REMOVER: `limparTodosCaches()` (linhas 1483-1497)
   - MANTER: `limparCachesCorrompidos()` - util para manutencao

3. **`routes/extratoFinanceiroCacheRoutes.js`**
   - REMOVER: `DELETE /:ligaId/limpar` (linha 61)
   - REMOVER: `DELETE /:ligaId/times/:timeId/limpar` (linha 69)
   - REMOVER: `DELETE /:ligaId/times/:timeId/cache` (linha 73)
   - REMOVER: `DELETE /todos/limpar` (linha 57)
   - MANTER: `DELETE /corrompidos/limpar` - util para manutencao

### CSS a Limpar

4. **`public/css/modules/fluxo-financeiro.css`**
   - REMOVER: Estilos `.btn-recalc-cache` (se existirem e nao forem usados em outro lugar)

---

## Riscos e Consideracoes

### Impactos Positivos
- Elimina risco de perda de dados por clique acidental
- Simplifica UI (menos botoes = menos confusao)
- Segue principio "fail-safe" (nao dar opcao perigosa)

### Impactos a Avaliar
- Admins que usavam o botao para "forcar" recalculo
  - **Mitigacao:** Botao "Atualizar" ja faz isso de forma segura
- Scripts/automacoes que chamam a API
  - **Mitigacao:** Manter endpoint para caches corrompidos

### Multi-Tenant
- [x] Nao afeta isolamento - botao ja era por time/liga

---

## Testes Necessarios

### Cenarios de Teste

1. **Verificar que botao foi removido:**
   - Abrir modal de extrato individual
   - Confirmar que botao "Limpar Cache" nao aparece

2. **Verificar que rotas foram removidas:**
   - `DELETE /api/extrato-cache/{ligaId}/limpar` → 404
   - `DELETE /api/extrato-cache/{ligaId}/times/{timeId}/limpar` → 404

3. **Verificar que botao "Atualizar" continua funcionando:**
   - Clicar em "Atualizar" no modal
   - Confirmar que dados sao atualizados sem perda

4. **Verificar que limpeza de corrompidos continua:**
   - `DELETE /api/extrato-cache/corrompidos/limpar` → 200

---

## Proximos Passos

1. Validar PRD com usuario
2. Gerar SPEC: Executar `/spec` com este PRD
3. Implementar: Executar `/code` com SPEC gerado
4. **IMPORTANTE:** Primeiro recuperar dados do Leilson 2025 antes de remover botao

---

## Tarefa Adicional: Recuperar Dados Leilson 2025

Antes de remover o botao, precisamos:
1. Buscar dados de posicao do Leilson em `rankingRodadaCaches` ou `rodadasnapshots` de 2025
2. Reconstruir o `extratofinanceirocaches` com as 38 rodadas
3. Validar saldo final = divida original (R$ 203,46) + campos manuais

---

**Gerado por:** Pesquisa Protocol v1.0
