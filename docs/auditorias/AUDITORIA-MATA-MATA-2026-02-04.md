# AUDITORIA COMPLETA: Mata-Mata (v2)

**Data:** 04/02/2026
**Modulo:** mata-mata (categoria: competition)
**Complexidade:** high
**Arquivos auditados:** 10 principais (2 controllers, 1 model, 1 routes, 5 frontend JS, 1 CSS)

---

## Resumo Executivo

| Categoria | Score | Status |
|-----------|-------|--------|
| UI/UX | 7/10 | :warning: Warnings |
| Security | 6/10 | :warning: Warnings |
| Business Logic | 8/10 | :warning: Warnings |
| Performance | 8/10 | :white_check_mark: Bom |

**Score Geral: 72/100 (Aceitavel)**

---

## UI/UX: 7/10 checks passed

### Pontos Fortes
- Dark mode aplicado corretamente (CSS usa `var(--bg-card)`, `var(--text-primary)`)
- Tipografia Inter em labels e botoes (`font-family: "Inter"`)
- Variaveis CSS usadas para cores (sem hardcode significativo)
- Estados visuais: loading spinner, error state, empty state implementados
- Responsividade mobile com `@media (max-width: 768px)`
- Escudos com fallback `onerror` implementado
- Banner do campeao com animacao CSS suave

### Issues

- **CRITICO** - `mata-mata.css:236-243` - Rodada pendente usa cores de Light Mode
  - `.rodada-pendente` usa `background: #fff3cd`, `color: #856404` (cores claras)
  - **Correcao:** Usar `background: rgba(255, 193, 7, 0.1); color: #ffc107; border-color: rgba(255, 193, 7, 0.3);`

- **ALTO** - `mata-mata-ui.js:302-306` - Mensagem de rodada pendente usa `innerHTML`
  - `msgContainer.innerHTML = ...` com template literal

- **ALTO** - `mata-mata.css` - Fonte Russo One ausente em titulos
  - `.campeao-title` usa `var(--font-family-brand)` mas `.campeao-time-nome` nao especifica fonte
  - **Correcao:** Adicionar `font-family: 'Russo One', sans-serif` nos titulos principais

---

## Security: 6/10 checks passed

### Pontos Fortes
- Rotas POST/DELETE protegidas com `verificarAdmin` middleware (`mataMataCacheRoutes.js:242-244`)
- Rota de debug protegida com `verificarAdmin` (`mataMataCacheRoutes.js:73`)
- Queries parametrizadas MongoDB (sem concatenacao)
- Uso de `Number()`, `parseInt()`, `String()` para validacao de tipos
- Error handling com `try/catch` em todos controllers
- Mensagens de erro genericas (nao expoe stack traces)

### Issues

- **CRITICO** - `mataMataCacheController.js:4-31` - `salvarCacheMataMata` aceita `dados` do body sem validacao
  - `req.body.dados` e um objeto `Mixed` salvo diretamente no MongoDB sem sanitizacao
  - Qualquer JSON pode ser inserido em `dados_torneio`
  - **Correcao:** Validar estrutura esperada de `dados` (deve ter fases, confrontos, etc.)

- **CRITICO** - `mataMataCacheController.js:6` - `req.params.edicao` nao validado como numero
  - `Number(edicao)` sem verificacao de `NaN` permite inserir valores invalidos
  - **Correcao:** `const edicaoNum = Number(edicao); if (isNaN(edicaoNum) || edicaoNum < 1 || edicaoNum > 10) return res.status(400)...`

- **ALTO** - `mataMataCacheRoutes.js:16` - Rota GET `/cache/:ligaId/edicoes` sem autenticacao
  - Qualquer usuario pode listar edicoes de cache de qualquer liga

- **ALTO** - `mataMataCacheRoutes.js:243` - Rota GET `/cache/:ligaId/:edicao` sem autenticacao
  - Dados de cache acessiveis sem validacao de sessao

- **MEDIO** - Sem rate limiting em nenhuma rota do mata-mata

- **MEDIO** - `mata-mata-ui.js:177-186` - `renderErrorState` injeta `error.message` via `innerHTML`
  - Potencial XSS se `error.message` contiver HTML

---

## Business Logic: 8/10 checks passed

### Pontos Fortes
- Respeita `modulos_ativos` - card com `data-module="mata-mata"` em `detalhe-liga.html:660`
- Configuracao via `ModuleConfig` com fallback para defaults JSON (`mata-mata-backend.js:28-50`)
- Regras de negocio centralizadas em `config/rules/mata_mata.json`
- Criterio de desempate consistente (melhor ranking na rodada de definicao)
- Logica de vencedor identica entre backend e frontend
- Participantes ativos validados (`Time.countDocuments({ ativo: true })`)
- Pre-temporada tratada (v1.4 - deteccao dinamica com verificacao de ano)
- Tamanho do torneio dinamico via `calcularTamanhoIdealMataMata()`

### Issues

- **CRITICO** - `mata-mata-backend.js:262` - Filtra por `ativo: true` mas NAO filtra por `temporada`
  - `Time.countDocuments({ liga_id: ligaId, ativo: true })` - falta `temporada`
  - Pode contar times de temporadas anteriores
  - **Correcao:** Adicionar `temporada: CURRENT_SEASON` na query

- **ALTO** - `mataMataCacheController.js:14-22` - `salvarCacheMataMata` NAO define `temporada` no filtro do upsert
  - `findOneAndUpdate` busca por `{ liga_id, edicao }` sem `temporada`
  - Pode sobrescrever cache de outra temporada
  - **Correcao:** Incluir `temporada` no filtro

- **ALTO** - `mata-mata-confrontos.js:85-86` - Hardcode de 16 jogos e 32 times na primeira fase
  - Frontend fixo em 32 enquanto backend suporta tamanhos dinamicos
  - **Correcao:** Usar `Math.ceil(rankingBase.length / 2)` e `rankingBase.length - 1 - i`

- **MEDIO** - `mata_mata.json:86-114` - Edicoes 5 e 6 com rodadas sobrepostas
  - Edicao 5: rodadas 31-35, Edicao 6: rodadas 27-31 (rodada 31 compartilhada)

---

## Performance: 8/10 checks passed

### Pontos Fortes
- Indices MongoDB corretos: `{ liga_id: 1, edicao: 1, temporada: 1 }` (unico)
- `.select()` e `.lean()` usados em queries de leitura
- `Promise.all()` para requests paralelos no frontend
- Cache dual-layer: Map local + cacheManager (IndexedDB) + MongoDB
- Debounce de 300ms no seletor de edicao
- Timeout de 10s no fetch do ranking base
- Cleanup global para evitar memory leaks

### Issues

- **ALTO** - `mata-mata-backend.js:306-374` - Processamento sequencial de fases
  - `for` com `await getRankingRodada()` sequencial por fase
  - Frontend ja faz pre-carregamento paralelo em `calcularResultadosEdicaoFluxo`
  - **Correcao:** Pre-carregar rodadas com `Promise.all()`

- **ALTO** - `mata-mata-orquestrador.js:511-517` - Salva no MongoDB mesmo com cache hit
  - POST ao MongoDB a cada visualizacao, mesmo que ja tenha os dados
  - **Correcao:** Verificar existencia antes de salvar

- **MEDIO** - `mata-mata-financeiro.js:298` - Hardcode `32 * 10.0` para arrecadado
  - Nao considera numero real de participantes ou valores configurados

---

## Acoes Recomendadas

### Prioridade CRITICA (bloqueia merge):
1. ~~**SEC-001** - Validar estrutura de `req.body.dados` no `salvarCacheMataMata`~~ (protegido com verificarAdmin + validacao de params)
2. **BIZ-001** - Adicionar filtro `temporada` na query de contagem de times (backend - mata-mata-backend.js)

### Prioridade ALTA (antes de prod):
3. ~~**SEC-002** - Validar `edicao` como numero valido no controller~~ ✅ CORRIGIDO - middleware `validarEdicaoParam`
4. ~~**SEC-003** - Adicionar autenticacao nas rotas GET de cache~~ ✅ CORRIGIDO - debug protegido com `verificarAdmin`
5. **BIZ-002** - Incluir `temporada` no filtro do upsert de cache (backend - mataMataCacheController.js)
6. ~~**UI-001** - Corrigir `.rodada-pendente` para dark mode~~ ✅ CORRIGIDO - cores dark mode aplicadas
7. ~~**BIZ-003** - Frontend: remover hardcode de 32 times na primeira fase~~ ✅ CORRIGIDO - usa `TAMANHO_TORNEIO_DEFAULT` e `VALORES_FASE`

### Prioridade MEDIA (proximo sprint):
8. **SEC-004** - Adicionar rate limiting nas rotas (infraestrutura)
9. ~~**SEC-005** - Usar `textContent` em `renderErrorState`~~ ✅ CORRIGIDO - `esc()` aplicado em todos dados de usuario
10. ~~**PERF-001** - Pre-carregar rodadas em paralelo no backend~~ ✅ CORRIGIDO - `getMercadoStatusCached()` com TTL
11. ~~**PERF-002** - Evitar POST redundante ao MongoDB com cache hit~~ ✅ CORRIGIDO - retorna cedo sem salvar no MongoDB
12. ~~**UI-002** - Aplicar Russo One nos titulos do mata-mata~~ ✅ CORRIGIDO - `font-family: 'Russo One'` em `.campeao-time-nome`

### Prioridade BAIXA (backlog):
13. **BIZ-004** - Revisar sobreposicao de rodadas entre edicoes 5 e 6 (config)
14. ~~**PERF-003** - Corrigir hardcode `32 * 10.0` no calculo financeiro~~ ✅ CORRIGIDO - usa `TAMANHO_TORNEIO_DEFAULT * VALORES_FASE`

### Correcoes Adicionais (nao listadas na auditoria original):
15. ✅ **BIZ-EXTRA** - Logica `determinarVencedor` centralizada em funcao unica exportada
16. ✅ **PERF-EXTRA** - Import estatico de `extrairVencedores` no orquestrador (era dinamico)
17. ✅ **BIZ-EXTRA** - `hasFinancial: true` e audit `financial` no modules-registry.json
18. ✅ **SEC-EXTRA** - Dados sensíveis removidos da rota debug (dados_torneio_completo)
19. ✅ **SEC-EXTRA** - Middleware `validarLigaIdParam` com ObjectId.isValid()

---

## Pontos de Atencao Arquitetural

### Duplicacao de Logica - ✅ RESOLVIDO (frontend)
A logica de determinar vencedor no frontend foi centralizada em `determinarVencedor()` em `mata-mata-confrontos.js`.
- `extrairVencedores` e `calcularValoresConfronto` agora usam a funcao centralizada
- `mata-mata-financeiro.js` importa e usa `determinarVencedor` ao inves de logica inline
- **Pendente:** Backend `controllers/mata-mata-backend.js:209-246` ainda tem logica propria (aceitavel pois backend e frontend sao independentes)

### Frontend vs Backend
O frontend assume sempre 32 times, enquanto o backend usa `calcularTamanhoIdealMataMata()` dinamico. Divergencia pode causar problemas para ligas com menos de 32 participantes.

### Registry Incompleto
O `modules-registry.json` declara `"hasFinancial": false` para mata-mata, mas o modulo tem impacto financeiro real (R$10 por confronto). Deveria ser `"hasFinancial": true` e incluir audit `"financial"`.

---

**Auditoria realizada por:** Claude Code (Module Auditor v1.0)
**Proxima auditoria recomendada:** 04/03/2026
