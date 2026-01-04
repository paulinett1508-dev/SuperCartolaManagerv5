# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Pendencias Ativas

*Nenhuma pendencia ativa no momento.*

---

## Tarefas Concluidas (2026-01-04)

### Restaurar Colunas Financeiras na Lista de Participantes

**Status:** CONCLUIDO

**Problema Identificado:**
A API `/api/tesouraria/liga/:ligaId` nao retornava os dados de breakdown (Timeline, P.Corridos, Mata-Mata, Top10, Ajustes) porque:

1. O schema do Model `ExtratoFinanceiroCache` define `liga_id` como ObjectId
2. Mas os documentos no banco foram salvos com `liga_id` como String
3. O Mongoose tentava fazer cast e a query falhava silenciosamente

**Solucao Aplicada (v2.8):**
- Alterado `routes/tesouraria-routes.js` para usar acesso DIRETO a collection MongoDB
- Bypass do schema Mongoose com `mongoose.connection.db.collection('extratofinanceirocaches')`
- Query com `$or` para cobrir ambos os tipos (String e ObjectId)
- Removido filtro de temporada nos campos manuais (docs antigos nao tem)

**Resultado:**
- Todos os 32 participantes agora tem dados de breakdown
- Colunas Timeline, P.Corridos, Mata-Mata, Top10, Ajustes funcionando
- modulosAtivos retornados corretamente para renderizacao condicional

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Participante Multi-Liga (teste)
- **Paulinett Miranda:** timeId `13935277`

---
*Atualizado em: 2026-01-04*
