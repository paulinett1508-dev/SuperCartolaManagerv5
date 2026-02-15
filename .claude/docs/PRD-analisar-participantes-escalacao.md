# PRD - Analisar Participantes: Modal Escalacao (Data Lake)

## Resumo Executivo

O modal "Data Lake" da pagina admin `analisar-participantes.html` precisa exibir automaticamente a escalacao do time na rodada consolidada, sem exigir que o admin clique em "Atualizar". Alem disso, o visual deve ser equivalente ao do app do participante (`participante-campinho.js`), com agrupamento por posicao, badges de Capitao/Luxo, card de desempenho, e seletor de rodadas funcional.

## Problema Identificado

### Diagnostico Raiz (Root Cause)

**O codigo ja foi parcialmente implementado** na sessao anterior. As funcoes helper (agruparPorPosicao, renderizarLinhaJogador, etc.) e o novo layout visual **ja estao no commit HEAD**. O diff pendente (~54 linhas) adiciona a logica de auto-deteccao de rodada consolidada.

**Porem, o usuario reportou "nada feito"**. Possiveis causas:

1. **Cache do browser**: O `analisar-participantes.js` nao tem cache-busting (sem `?v=xxx` no `<script src>`). O browser pode estar servindo a versao antiga cacheada. **ESTA EH A CAUSA MAIS PROVAVEL.**

2. **Data Lake vazio**: O fluxo `abrirModalDump` busca `/api/data-lake/raw/{timeId}?historico=true&limit=50`. Se o Data Lake (`cartola_oficial_dumps`) nao tem nenhum `time_rodada` para aquele time, `rodadas_disponiveis` sera `[]`. A nova logica tenta auto-sync via `POST /api/data-lake/sincronizar/{timeId}`, mas este endpoint **requer `verificarAdmin`** - pode falhar se a sessao admin estiver expirada ou incompleta.

3. **Falta de fallback**: O modal admin so tem 2 fontes de dados (Data Lake + auto-sync), enquanto o participante-campinho tem 3 fallbacks (Data Lake + Cartola Proxy + Collection rodadas). Se o Data Lake esta vazio e o auto-sync falha, o admin ve "estado vazio".

## Arquivos Envolvidos

### Frontend
| Arquivo | Funcao | Status |
|---------|--------|--------|
| `public/js/analisar-participantes.js` | Logica JS do modal Data Lake | Helpers e layout OK no HEAD, auto-detect pendente commit |
| `public/analisar-participantes.html` | CSS do modal + estrutura HTML | CSS completo no HEAD |

### Backend (NAO precisa alterar)
| Arquivo | Funcao |
|---------|--------|
| `controllers/dataLakeController.js` | Controller do Data Lake - funciona corretamente |
| `models/CartolaOficialDump.js` | Model do Data Lake (Mongoose) |
| `routes/data-lake-routes.js` | Rotas REST do Data Lake |
| `routes/cartola-proxy.js` | Rota `/mercado/status` (L76) e `/time/id/:timeId/:rodada` (L194) |

### Referencia
| Arquivo | Funcao |
|---------|--------|
| `public/participante/js/modules/participante-campinho.js` | Implementacao de referencia com fallback chain funcional |

## Fluxo de Dados Atual

```
Admin clica "Analisar" no participante
    |
    v
abrirModalDump(timeId, nomeCartola, nomeTime)
    |
    +--> GET /api/data-lake/raw/{timeId}?historico=true&limit=50
    +--> GET /api/cartola/mercado/status (paralelo)
    |
    v
DECISAO (4 branches):
  1. rodadaConsolidada IN rodadasDisp? --> carregarRodadaDump(rodada)
  2. rodadasDisp.length > 0? --> carregarRodadaDump(max)
  3. rodadaConsolidada > 0? --> sincronizarRodadaDump() [AUTO-SYNC]
  4. else --> estado vazio
```

### Falha no branch 3 (AUTO-SYNC)

```
sincronizarRodadaDump()
  --> POST /api/data-lake/sincronizar/{timeId} { rodada: 3 }
  --> verificarAdmin(req) --> PODE FALHAR (session problem)
  --> seasonGuard --> OK
  --> API Globo --> PODE FALHAR (timeout, game_over)
```

### Fluxo do Participante (Referencia - Funciona sempre)

```
participante-campinho.js:
  1. Data Lake: GET /api/data-lake/raw/{timeId}?rodada={rodada}
  2. FALLBACK: GET /api/cartola/time/{timeId}/{rodada}/escalacao (SEM admin auth)
  3. FALLBACK 2: GET /api/rodadas/{ligaId}/rodadas?inicio={rodada}&fim={rodada}
```

## Solucao Proposta

### 1. Cache-Busting (Prioridade maxima)

Adicionar versao no script tag para forcar browser a carregar JS novo:
```html
<script src="/js/analisar-participantes.js?v=2.1"></script>
```

### 2. Fallback Chain no abrirModalDump

Adicionar fallback direto via Cartola proxy (sem depender de admin auth ou Data Lake):

```
Novo fluxo:
  1. Detectar rodadaConsolidada via /api/cartola/mercado/status
  2. Tentar Data Lake: GET /api/data-lake/raw/{timeId}?rodada={consolidada}
  3. Se falha --> Tentar Cartola Proxy: GET /api/cartola/time/id/{timeId}/{consolidada}
  4. Se falha --> Tentar auto-sync (POST sincronizar, requer admin)
  5. Renderizar com dados de qualquer fonte que funcionar
```

### 3. Adapter para dados do Cartola Proxy

`renderizarDumpGlobo` precisa aceitar tanto formato Data Lake (`dump_atual.raw_json`) quanto formato direto da API Cartola (o JSON eh o proprio raw). Criar adapter simples.

### 4. Botao Refresh (manter como esta)

Refresh continua fazendo `POST /api/data-lake/sincronizar/{timeId}` para re-coletar da Globo e regravar no Mongo.

## Criterios de Aceitacao

1. Ao clicar "Analisar", modal abre e mostra escalacao automaticamente (sem clicks extras)
2. Layout visual com agrupamento por posicao (GOL, LAT, ZAG, MEI, ATA, TEC)
3. Badges de Capitao (C) e Luxo (L) com multiplicador 1.5x
4. Card de desempenho (pontos, patrimonio, variacao)
5. Seletor de rodadas no topo (38 rodadas, marca disponiveis)
6. Botao Refresh re-coleta da API Globo e regrava no Mongo
7. Se Data Lake nao tem dados, fallback transparente via proxy Cartola
8. JS servido sem cache stale (cache-busting)

## Riscos

1. **API Globo indisponivel**: Com 3 fallbacks, chance de mostrar estado vazio eh minima
2. **Season Guard**: Se temporada encerrada, sync bloqueado. Mas proxy direto funciona
3. **Performance**: Chamadas adicionais so acontecem em fallback, nao no caso ideal

## Dependencias (todas existem)

- `GET /api/cartola/mercado/status` (cartola-proxy.js L76)
- `GET /api/cartola/time/id/:timeId/:rodada` (cartola-proxy.js L194)
- `GET /api/data-lake/raw/:id` (data-lake-routes.js L88)
- `POST /api/data-lake/sincronizar/:id` (data-lake-routes.js L53)
