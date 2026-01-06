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

## PENDENTE: Seletor de Temporada - UX Quebrada

**Prioridade:** ALTA
**Data:** 2026-01-06

### Problema Reportado
O seletor de temporada (2025/2026) no Fluxo Financeiro tem UX muito ruim:

1. **Navegacao quebrada:** Ao clicar no seletor e escolher um ano, o sistema faz `location.reload()` que:
   - Sai da tela atual
   - Volta para os cards principais
   - Usuario precisa navegar de novo ate Fluxo Financeiro
   - Muito exaustivo e nada funcional

2. **Dados nao atualizam:** Os participantes na tabela nao mudam quando troca o seletor
   - Possivelmente o reload nao esta preservando a temporada selecionada
   - Ou a API nao esta filtrando corretamente

### Arquivos Envolvidos
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - funcao `mudarTemporada()`
- `public/js/fluxo-financeiro/fluxo-financeiro-cache.js` - funcao `limparCache()`
- `public/js/fluxo-financeiro.js` - inicializacao

### Solucao Esperada
- Trocar temporada SEM fazer reload da pagina
- Limpar cache e recarregar apenas os dados do Fluxo Financeiro
- Manter usuario na mesma tela
- Atualizar tabela de participantes com dados da temporada selecionada

### Commits Relacionados
- `ed00153` - fix(fluxo): corrigir bug cacheManager.clear() no seletor de temporada
- `6d06b33` - fix(fluxo): passar temporada em todas as chamadas de API de extrato
- `3a6e16a` - feat(fluxo): seletor de temporada 2025/2026

### Bug Extra Corrigido (banco)
- Felipe Barbosa tinha cache duplicado/corrompido de 2026 com dados de 2025
- Deletado documento `695c6855d35f7c2b6ff3ae1e` (cache corrompido)
- Agora 2025 mostra R$0 (quitado) e 2026 mostra -R$180 (taxa inscricao)

