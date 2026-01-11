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

---

## CONCLUIDO: Seletor de Temporada - UX Corrigida

**Prioridade:** ALTA
**Data Conclusao:** 2026-01-11
**Status:** RESOLVIDO

### Problema Original
O seletor de temporada (2025/2026) no Fluxo Financeiro fazia `location.reload()` que:
- Saia da tela atual e voltava para os cards principais
- Usuario precisava navegar de novo ate Fluxo Financeiro

### Solucao Implementada (v8.0)
**Arquivo:** `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - funcao `mudarTemporada()`

Alteracoes:
1. Removido `location.reload()` da funcao `mudarTemporada()`
2. Implementado recarga dinamica via `fluxoFinanceiroOrquestrador.recarregar()`
3. Adicionado loading visual durante a troca ("Carregando dados de XXXX...")
4. Mantido fallback para reload apenas se orquestrador nao estiver disponivel
5. Error handling com try/catch para robustez

Fluxo:
1. Usuario seleciona temporada no dropdown
2. `window.temporadaAtual` e atualizado
3. localStorage salva preferencia
4. Cache e limpo via `fluxoFinanceiroCache.limparCache()`
5. Dados recarregados via orquestrador (SEM sair da tela)
6. Tabela atualizada com dados da nova temporada

