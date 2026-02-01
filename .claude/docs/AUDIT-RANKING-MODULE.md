# AUDITORIA DO MÓDULO RANKING (Admin + Participante)

**Data:** 2026-02-01
**Auditor:** Claude Opus 4.5
**Escopo:** Ranking Geral (acumulado) + Ranking por Turno + Ranking da Rodada (BANCO)
**Branch:** `claude/audit-ranking-module-s1vtC`

---

## RESUMO EXECUTIVO

O módulo Ranking é composto por ~30 arquivos distribuídos em controllers, services, models, routes, frontend admin, frontend participante, configs e scripts utilitários. A auditoria identificou **27 achados** classificados por severidade.

| Severidade | Quantidade |
|------------|-----------|
| CRÍTICO    | 4         |
| ALTO       | 7         |
| MÉDIO      | 9         |
| BAIXO      | 7         |

---

## ACHADOS CRÍTICOS

### C1. Função `getRankingRodada` exportada mas SEM rota registrada (Código Morto / Dependência Solta)

**Arquivo:** `controllers/rankingGeralCacheController.js:206-221`
**Problema:** A função `getRankingRodada` é exportada mas não está registrada em nenhum arquivo de rotas. Ela usa `obterDadosRodada` do `smartDataFetcher.js` (sistema de snapshots), mas nunca é chamada por nenhuma rota HTTP.
**Impacto:** Código morto que importa dependências desnecessárias (`smartDataFetcher.js`), poluindo o controller e criando confusão sobre o que está ativo.
**Ação:** Remover a função `getRankingRodada` e o import de `obterDadosRodada` do controller, ou registrar uma rota se ela for necessária.

### C2. Rotas de escrita (DELETE/POST) SEM autenticação de admin

**Arquivos:**
- `routes/ranking-geral-cache-routes.js` → `DELETE /:ligaId` (invalidar cache)
- `routes/ranking-turno-routes.js` → `POST /:ligaId/consolidar` (reconsolidar) e `DELETE /:ligaId/cache` (limpar cache)

**Problema:** Nenhuma dessas rotas tem middleware `verificarAdmin()`. Qualquer usuário autenticado (ou não, dependendo do `protegerRotas`) pode:
- Invalidar o cache de ranking de qualquer liga
- Forçar reconsolidação de turnos
- Limpar cache de turnos

**Impacto:** Risco de abuso: um participante pode invalidar caches repetidamente causando carga no banco, ou reconsolidar dados indevidamente.
**Ação:** Adicionar `verificarAdmin` como middleware nas rotas POST e DELETE.

### C3. Inconsistência no fallback de temporada entre controllers

**Arquivos:**
- `controllers/rankingGeralCacheController.js:14` → `parseInt(temporadaParam) || CURRENT_SEASON`
- `controllers/rankingTurnoController.js:19` → `temporada ? parseInt(temporada, 10) : new Date().getFullYear()`

**Problema:** O controller de ranking geral usa `CURRENT_SEASON` (2026) como fallback, enquanto o controller de turno usa `new Date().getFullYear()`. Se CURRENT_SEASON for atualizado manualmente para 2027 antes da virada do ano, os dois controllers apontariam para temporadas diferentes.
**Impacto:** Possível inconsistência de dados entre as duas views de ranking.
**Ação:** Padronizar ambos para usar `CURRENT_SEASON` do `config/seasons.js`.

### C4. `reconsolidarTodosOsTurnos` NÃO filtra por temporada

**Arquivo:** `services/rankingTurnoService.js:268-294`
**Problema:** A função `reconsolidarTodosOsTurnos` busca a última rodada sem filtrar por temporada:
```javascript
const ultimaRodada = await Rodada.findOne({ ligaId: ligaObjectId })
    .sort({ rodada: -1 })
```
Se existirem rodadas de 2025 com rodada 38 e a temporada 2026 estiver na rodada 5, o sistema vai usar rodadaAtual=38 da temporada antiga, consolidando erroneamente turnos como completos.
**Impacto:** Dados de temporadas misturados, ranking incorreto.
**Ação:** Adicionar filtro `temporada` na query. A função precisa receber o parâmetro `temporada` (atualmente não recebe).

---

## ACHADOS ALTOS

### A1. Desempate NÃO implementado no backend

**Arquivos:**
- `config/rules/ranking_geral.json:32-36` define critérios de desempate: `maior_pontuacao_rodada_mais_recente`, `maior_numero_rodadas_jogadas`, `nome_cartola_alfabetico`
- `controllers/rankingGeralCacheController.js:132-133` faz apenas `$sort: { pontos_totais: -1 }`

**Problema:** A pipeline de agregação ordena apenas por `pontos_totais`. Os critérios de desempate documentados nas regras não são implementados.
**Impacto:** Participantes empatados ficam em ordem arbitrária (ordem de inserção no MongoDB).

### A2. Desempate do Ranking da Rodada ignora critério documentado

**Arquivo:** `config/rules/ranking_rodada.json:105-109` define desempate por `posicao_ranking_geral`.
**Problema:** Não há nenhum código implementado que aplique este critério. O ranking da rodada é implicitamente parte do sistema BANCO/financeiro, mas a resolução de empates não é feita em lugar algum do código encontrado.

### A3. `campos_exibicao` definidos mas NÃO consumidos

**Arquivos:**
- `config/definitions/ranking_geral_def.json:37-45` → define `variacao`, `media_pontos`
- `config/definitions/ranking_rodada_def.json:68-75` → define `zona`, `valor_financeiro`

**Problema:** Nenhum código frontend ou backend lê esses JSONs de definição para decidir o que exibir. As colunas são hardcoded no HTML/JS.
**Impacto:** Os parâmetros configuráveis (`exibir_variacao_posicao`, `exibir_media_pontos`, `destacar_lider`) são documentação morta — nunca lidos.

### A4. `parametros_configuraveis` nunca consumidos

**Arquivos:** `config/definitions/ranking_geral_def.json` e `ranking_rodada_def.json`
**Problema:** Parâmetros como `exibir_variacao_posicao: true` e `exibir_media_pontos: true` estão definidos, mas:
- Variação de posição: O admin `ranking.js:1329` tem `obterLabelPosicao()` que mostra apenas troféu no 1º — sem setas de variação
- Média de pontos: Nunca calculada nem exibida em nenhum frontend
- `destacar_mito_mico`: O ranking da rodada não tem frontend próprio visível nesta auditoria

### A5. Hardcode de liga IDs nos JSONs de regras

**Arquivo:** `config/rules/ranking_geral.json:11` e `config/rules/ranking_rodada.json:29-30`
```json
"ligas_habilitadas": ["684cb1c8af923da7c7df51de", "684d821cf1a7ae16d1f89572"]
```
**Problema:** IDs de liga hardcoded nos JSONs de configuração. Se novas ligas forem criadas, estas configs não se aplicam automaticamente.
**Impacto:** Viola o princípio "Zero hardcode" documentado no CLAUDE.md para o sistema SaaS.

### A6. Temporada hardcoded nos JSONs de regras

**Arquivo:** `config/rules/ranking_geral.json:13` → `"temporada": 2025`
**Problema:** A temporada está fixa em 2025, apesar de `CURRENT_SEASON` ser 2026.
**Impacto:** Se algum código consumir este JSON (atualmente nenhum faz), usaria temporada errada.

### A7. Template HTML do admin (`ranking-geral.html`) conflita com JS gerado

**Arquivo:** `public/fronts/ranking-geral.html`
**Problema:** O template define sua própria estrutura de tabs com classe `.turno-tab`, mas o `ranking.js` gera HTML completo que sobrescreve todo o `#ranking-geral` com sua própria estrutura usando classe `.ranking-turno-tab`. O template HTML é renderizado brevemente e depois completamente substituído.
**Impacto:**
- Flash of unstyled content (FOUC) — o template aparece por milissegundos antes de ser substituído
- Botão "Reconsolidar" (`#btnConsolidar`) definido no template nunca funciona — é destruído quando `ranking.js` sobrescreve o innerHTML
- CSS em `ranking-geral.html` para `.turno-tab` nunca é usado pelo JS (JS usa `.ranking-turno-tab`)

---

## ACHADOS MÉDIOS

### M1. Redundância de dados de status de inativos

**Arquivo:** `public/js/ranking.js:293-307`
**Problema:** O admin ranking.js faz uma chamada extra `POST /api/times/batch/status` para obter status de inatividade, mesmo que o `rankingTurnoService.js` já retorne `ativo` e `rodada_desistencia` dentro de cada item do ranking. Os dados do backend são ignorados e sobrescritos.
**Impacto:** Request desnecessário; fonte de verdade duplicada (Liga.participantes vs collection times); possível inconsistência se os dados divergirem.

### M2. `truncarPontos` inconsistente entre admin e participante

**Arquivos:**
- `public/js/ranking.js:31` → retorna `"105.45"` (ponto decimal)
- `public/participante/modules/ranking/ranking.js:230` → retorna `"105,45"` (vírgula)

**Problema:** O admin usa ponto decimal, o participante usa vírgula. Não é necessariamente um bug (localização), mas é uma inconsistência visual entre as views.

### M3. CSS duplicado e conflitante em 3 camadas

**Arquivos:**
- `public/css/modules/ranking-geral.css` → estiliza via arquivo externo
- `public/fronts/ranking-geral.html` → `<style>` inline no template
- `public/js/ranking.js:807-1157` → `<style>` inline no JS gerado

**Problema:** 3 fontes de CSS para o mesmo módulo, com estilos conflitantes e `!important` em cascata. O CSS do arquivo externo estiliza `#ranking-geral`, o template HTML tem estilos para `.turno-tab`, e o JS gera seus próprios estilos completos.
**Impacto:** Difícil manutenção; estilos se sobrepõem; o CSS do arquivo e do template são efetivamente inúteis já que o JS sobrescreve tudo.

### M4. Estado global poluído no admin

**Arquivo:** `public/js/ranking.js:348-350`
```javascript
window.rankingData = participantesFinais;
window.rankingGeral = participantesFinais;
window.ultimoRanking = participantesFinais;
```
**Problema:** 3 variáveis globais com o mesmo dado. Não há evidência de que `ultimoRanking` ou `rankingGeral` sejam consumidas por outro módulo.

### M5. `obterConfigLiga` definida mas nunca chamada

**Arquivo:** `public/js/ranking.js:1316-1327`
**Problema:** A função `obterConfigLiga(ligaId)` faz fetch para `/api/ligas/${ligaId}/configuracoes` mas nunca é chamada em nenhum lugar do código.
**Impacto:** Código morto.

### M6. Parciais só funcionam para turno "geral"

**Arquivo:** `services/rankingTurnoService.js:72`
```javascript
if (!snapshot && turno === "geral") {
```
**Problema:** Se o turno for "1" ou "2" e não houver dados consolidados, o serviço retorna `null` sem tentar buscar parciais. A tela do participante e admin não terá nenhum dado para exibir no 1º ou 2º turno se a rodada estiver em andamento.
**Impacto:** UX incompleta — parciais não aparecem nas views de turno específico.

### M7. View participante NÃO tem tabs de turno

**Arquivo:** `public/participante/fronts/ranking.html` e `public/participante/modules/ranking/ranking.js`
**Problema:** O frontend participante sempre carrega `turno = 'geral'` (hardcoded na `initRanking`). Não há tabs para alternar entre 1º turno, 2º turno e geral como existe no admin.
**Impacto:** Funcionalidade de turno inacessível para participantes.

### M8. Ranking participante não exibe indicador de parciais (AO VIVO)

**Arquivo:** `public/participante/modules/ranking/ranking.js:79-85`
**Problema:** O frontend participante ignora os campos `data.parcial` e `data.status === "parcial"`. Não há indicador visual de que os dados são parciais/ao vivo.
**Impacto:** Participante pode pensar que o ranking mostrado é final quando na verdade é parcial.

### M9. Botão "Reconsolidar" no template sem funcionalidade

**Arquivo:** `public/fronts/ranking-geral.html:31-36`
**Problema:** O botão `#btnConsolidar` existe no template HTML mas:
1. Não tem onclick handler
2. É destruído quando `ranking.js` sobrescreve o innerHTML
3. Nenhum código associa um listener a ele

---

## ACHADOS BAIXOS

### B1. Console.log excessivo em produção

**Arquivos:** Todos os controllers, services e frontend JS
**Problema:** Centenas de `console.log` com emojis (✅, ❌, 📊, etc.) em todo o módulo. Em produção, isto gera ruído desnecessário nos logs.

### B2. `posicao_grupo` calculado mas nunca exibido

**Arquivo:** `services/rankingTurnoService.js:216-223`
**Problema:** O campo `posicao_grupo` (posição dentro do grupo ativos/inativos) é calculado e salvo no banco, mas nenhum frontend o exibe.

### B3. Campo `escudo` inconsistente entre sources

**Problema:**
- `Rodada.escudo` → URL do escudo do time Cartola
- `parciaisRankingService.js:184` → usa `escalacao?.time?.url_escudo_png`
- Frontend usa `/escudos/${clube_id}.png` → escudo do clube do coração

O campo `escudo` retornado pelo backend nunca é usado no frontend admin; o frontend sempre usa `clube_id` para montar o path do escudo.

### B4. Tipo de `timeId` inconsistente

**Problema:**
- `RankingGeralCache.ranking.timeId` → `Number`
- `RankingTurno.ranking.timeId` → `Number`
- `Rodada.timeId` → `Number`
- Frontend admin: `String(p.timeId) === String(timeId)` — converte para String para comparar

A comparação sempre converte para String como defesa, mas indica que em algum ponto da cadeia o tipo pode ser inconsistente.

### B5. Modelo `RankingTurno` tem campos redundantes `ativo` e `inativo`

**Arquivo:** `models/RankingTurno.js:54-55`
```javascript
ativo: { type: Boolean, default: true },
inativo: { type: Boolean, default: false },
```
**Problema:** `inativo` é sempre o oposto de `ativo`. Um dos campos é redundante.

### B6. `calcularPontuacaoTime` não processa reserva de luxo

**Arquivo:** `services/parciaisRankingService.js:72-98`
**Problema:** A função apenas verifica `capitao_id` para dobrar pontos, mas não trata a lógica do "reserva de luxo" (jogador que substitui titular que não entrou em campo). O cálculo parcial pode divergir do oficial da API Cartola.

### B7. PDF export usa query selector para classe que não existe no mobile

**Arquivo:** `public/participante/modules/ranking/ranking.js:345`
```javascript
const target = document.querySelector('.ranking-participante-pro');
```
**Problema:** Funciona porque o template tem essa classe, mas o PDF captura todo o container incluindo o header e botão share. O botão share é escondido via `visibility: hidden` mas ainda ocupa espaço no PDF.

---

## DEPENDÊNCIAS DO MÓDULO

### Backend
| Arquivo | Depende de |
|---------|-----------|
| `rankingGeralCacheController.js` | `RankingGeralCache`, `Rodada`, `mongoose`, `smartDataFetcher` (morto), `CURRENT_SEASON` |
| `rankingTurnoController.js` | `rankingTurnoService` |
| `rankingTurnoService.js` | `RankingTurno`, `Rodada`, `Liga`, `mongoose`, `parciaisRankingService` |
| `parciaisRankingService.js` | `axios`, `Liga`, `mongoose` (API Cartola externa) |

### Frontend Admin
| Arquivo | Depende de |
|---------|-----------|
| `ranking.js` | `/api/ranking-turno/:ligaId`, `/api/times/batch/status`, `window.temporadaAtual`, `window.orquestrador`, Material Icons CDN |

### Frontend Participante
| Arquivo | Depende de |
|---------|-----------|
| `participante-ranking.js` | `ranking.js` (dynamic import) |
| `ranking.js` | `/api/ranking-turno/:ligaId`, `window.participanteAuth`, `window.temporadaAtual`, html2canvas CDN, jsPDF CDN |

### Dependências Externas
- **Google Fonts CDN** (Material Icons) — carregada programaticamente
- **API Cartola** (`api.cartola.globo.com`) — para parciais em tempo real
- **html2canvas CDN** / **jsPDF CDN** — para export PDF (participante)

---

## MAPA DE ARQUIVOS AUDITADOS

```
controllers/
├── rankingGeralCacheController.js    ← Ranking acumulado + getRankingRodada (MORTO)
└── rankingTurnoController.js         ← Ranking por turno (1/2/geral)

services/
├── rankingTurnoService.js            ← Lógica de consolidação + parciais
└── parciaisRankingService.js         ← API Cartola para dados ao vivo

models/
├── RankingGeralCache.js              ← Cache do ranking acumulado
├── RankingTurno.js                   ← Snapshots de ranking por turno
└── Rodada.js                         ← Dados fonte (pontos por rodada)

routes/
├── ranking-geral-cache-routes.js     ← GET/DELETE /api/ranking-cache/:ligaId
└── ranking-turno-routes.js           ← GET/POST/DELETE /api/ranking-turno/:ligaId

public/js/
└── ranking.js                        ← Frontend admin (v2.6)

public/fronts/
└── ranking-geral.html                ← Template admin (parcialmente morto)

public/css/modules/
└── ranking-geral.css                 ← CSS admin (parcialmente sobrescrito)

public/participante/modules/ranking/
└── ranking.js                        ← Frontend participante (v4.0)

public/participante/js/modules/
└── participante-ranking.js           ← Inicializador participante

public/participante/fronts/
└── ranking.html                      ← Template participante mobile

config/definitions/
├── ranking_geral_def.json            ← Definição do módulo (NÃO consumida)
└── ranking_rodada_def.json           ← Definição do módulo (NÃO consumida)

config/rules/
├── ranking_geral.json                ← Regras (parcialmente consumidas)
└── ranking_rodada.json               ← Regras financeiras (consumidas pelo BANCO)
```

---

## RECOMENDAÇÕES PRIORITÁRIAS

1. **Segurança (C2):** Adicionar `verificarAdmin` nas rotas de escrita (POST consolidar, DELETE cache)
2. **Dados (C4):** Corrigir `reconsolidarTodosOsTurnos` para filtrar por temporada
3. **Cleanup (C1):** Remover `getRankingRodada` e import morto de `smartDataFetcher`
4. **Padronização (C3):** Unificar fallback de temporada para `CURRENT_SEASON` em ambos controllers
5. **Frontend (A7/M3):** Unificar CSS em um único local; remover template HTML que é sobrescrito
6. **Dados (M1):** Usar dados de inatividade que já vêm do backend em vez de fetch extra
7. **UX (M7/M8):** Adicionar tabs de turno e indicador de parciais no frontend participante
