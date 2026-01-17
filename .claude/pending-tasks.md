# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-17)

**Nenhuma tarefa pendente.**

---

## Historico de Correcoes Recentes

### ✅ Jogos do Dia v2.0 - Completo (2026-01-17)

**Arquivos:**
- `routes/jogos-ao-vivo-routes.js` v2.0
- `public/participante/js/modules/participante-jogos.js` v3.0

**Mudancas:**
- Endpoint mudou de `?live=all` para `?date={hoje}` (mostra TODOS os jogos)
- Cache inteligente: 2min com jogos ao vivo, 10min sem
- Frontend exibe jogos encerrados com placar final
- Ordenacao: Ao vivo > Agendados > Encerrados

**Nota:** Mostrar jogos encerrados NAO consome requests adicionais.

---

### ✅ Fix China Guardiola - Credito 2026 (2026-01-17)

**Problema:** Renovacao com `pagouInscricao=true` nao transferia credito restante.

**Caso:** China Guardiola tinha R$421,54 credito, pagou R$180 taxa, deveria ter R$241,54 restante mas tinha R$0.

**Correcao:**
- `controllers/inscricoesController.js` v1.4: Logica para transferir `credito - taxa` quando `pagouInscricao=true`
- Script `fix-china-guardiola-2026.js`: Corrigiu dados no MongoDB
- Script `fix-renovacoes-credito-2026.js`: Verificou outros participantes (nenhum afetado)

---

### ✅ PWA Install Prompt (Ja implementado)

**Arquivo:** `public/participante/js/install-prompt.js` v1.1

**Features:** Banner de instalacao, suporte iOS/Android, cooldown 24h, modo debug.

**Teste:** `?debug=install` ou `?debug=install-ios`

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Status da API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```
**Nota:** Pre-temporada ate API retornar `temporada: 2026`.

---

## Proxima Acao Recomendada

Quando Brasileirao 2026 iniciar (API retornar `temporada: 2026`):

1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Verificar se caches 2026 estao sendo criados corretamente

---
