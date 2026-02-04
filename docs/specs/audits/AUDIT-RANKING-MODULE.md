# AUDITORIA COMPLETA — MÓDULOS DE RANKING

**Data:** 2026-02-01 (v2 — separação correta dos módulos)
**Auditor:** Claude Opus 4.5
**Branch:** `claude/audit-ranking-module-s1vtC`

> **NOTA:** Este documento audita **dois módulos distintos** que possuem uma ligação crítica:
> - **Módulo 1 — RANKING DE RODADAS** (card "Rodadas" no admin) — a **fonte de dados**
> - **Módulo 2 — RANKING GERAL / CLASSIFICAÇÃO** (card "Classificação" no admin) — o **consumidor**
>
> O Ranking Geral é alimentado pelos dados produzidos pelo Ranking de Rodadas.

---
---

# PARTE 1 — MÓDULO RANKING DE RODADAS

**Card admin:** "Rodadas" (`data-module="rodadas"`)
**Carregamento:** Lazy (sob demanda)
**Impacto financeiro:** SIM (sistema BANCO com zonas G/Z, MITO/MICO)

## 1.1 MAPA DE ARQUIVOS

```
BACKEND
├── routes/rodadas-routes.js              ← GET/POST /api/rodadas/:ligaId/rodadas
├── routes/rodadasCacheRoutes.js          ← POST /api/rodadas-cache/:ligaId/recalcular + stats
├── routes/rodadasCorrecaoRoutes.js       ← GET verificar + POST corrigir corrompidos
├── routes/calendario-rodadas-routes.js   ← Calendário de jogos por rodada
├── controllers/rodadasCacheController.js ← Recalcular posições + valor financeiro (286 linhas)
└── controllers/rodadasCorrecaoController.js ← Reparar rodadas corrompidas (382 linhas)

FRONTEND ADMIN
├── public/fronts/rodadas.html            ← Template admin (v2.2)
└── public/js/rodadas/
    ├── rodadas-orquestrador.js           ← Orquestração do fluxo (638 linhas)
    ├── rodadas-core.js                   ← Lógica de negócio (fetch, processamento)
    ├── rodadas-ui.js                     ← Renderização de UI (941 linhas)
    ├── rodadas-cache.js                  ← Camada de cache
    └── rodadas-config.js                 ← Configs de BANCO, faixas G/Z, endpoints (v5.0)

FRONTEND PARTICIPANTE
├── public/participante/fronts/rodadas.html           ← Template mobile (v6.0, 990 linhas)
└── public/participante/js/modules/participante-rodadas.js ← Módulo mobile (v6.0, 1166 linhas)

CONFIG
├── config/definitions/ranking_rodada_def.json  ← Definição do módulo
└── config/rules/ranking_rodada.json            ← Regras financeiras (zonas G/Z)
```

## 1.2 ACHADOS

### CRÍTICOS

#### RR-C1. Rotas de escrita SEM autenticação de admin
**Arquivos:** `routes/rodadasCacheRoutes.js`, `routes/rodadasCorrecaoRoutes.js`
**Problema:** Nenhum middleware `verificarAdmin()` nas rotas:
- `POST /api/rodadas-cache/:ligaId/recalcular` — recalcula posições e valores financeiros
- `POST /api/rodadas-correcao/:ligaId/corrigir` — deleta e recria registros do banco
- `POST /api/rodadas/:ligaId/rodadas` — popula rodadas da API Cartola

Qualquer usuário autenticado pode executar operações que alteram dados financeiros.
**Impacto:** Vulnerabilidade de autorização — participante pode recalcular valores BANCO ou corrigir rodadas.
**Severidade:** CRÍTICO (segurança + integridade financeira)

#### RR-C2. `abrirModalRecalcMini()` — função chamada no HTML mas INEXISTENTE no JS
**Arquivo:** `public/fronts/rodadas.html:18`
```html
<button onclick="abrirModalRecalcMini()">
```
**Problema:** O botão "Recalcular" no template admin chama `abrirModalRecalcMini()`, mas essa função não existe em nenhum arquivo JS do projeto. Clicar no botão gera `ReferenceError: abrirModalRecalcMini is not defined`.
**Impacto:** Feature administrativa completamente quebrada — admin não consegue recalcular posições pelo frontend.
**Severidade:** CRÍTICO (funcionalidade core quebrada)

#### RR-C3. Desempate NÃO implementado no Ranking da Rodada
**Arquivo:** `config/rules/ranking_rodada.json:105-109` documenta desempate por `posicao_ranking_geral`.
**Arquivo:** `controllers/rodadasCacheController.js:150-155` ordena apenas por `pontos DESC`.
**Problema:** Em caso de empate de pontos numa rodada, a posição (e consequentemente o valor financeiro BANCO) é determinada pela ordem arbitrária do MongoDB, não pelo critério documentado.
**Impacto:** Valores financeiros incorretos quando há empate — afeta diretamente o extrato.
**Severidade:** CRÍTICO (impacto financeiro direto)

---

### ALTOS

#### RR-A1. `rodadas-config.js` mantém IDs de liga hardcoded e fallbacks estáticos
**Arquivo:** `public/js/rodadas/rodadas-config.js:97-100`
```javascript
export const LIGAS_CONFIG = {
  SUPERCARTOLA: "684cb1c8af923da7c7df51de",
  CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};
```
**Problema:** Apesar de ter sistema dinâmico (v5.0 busca do servidor), os fallbacks síncronos em `getBancoPorRodada()`, `getFaixasPorRodada()`, `getTotalTimesPorRodada()` continuam usando IDs hardcoded e valores fixos para apenas 2 ligas.
**Impacto:** Novas ligas não terão fallback correto. Viola princípio "Zero hardcode".

#### RR-A2. `POSICAO_CONFIG` hardcoded para SuperCartola e Sobral apenas
**Arquivo:** `public/js/rodadas/rodadas-config.js:285-341`
**Problema:** Labels de posição (MITO, G2-G11, Z1-Z11, MICO) estão hardcoded para configurações específicas de 2 ligas. Uma nova liga com tamanho diferente não teria labels corretos.
**Impacto:** Sistema BANCO visualmente incorreto para novas ligas.

#### RR-A3. `getConfigRankingRodada` DUPLICADA entre controllers
**Arquivos:**
- `controllers/rodadasCacheController.js:26-53`
- `controllers/rodadasCorrecaoController.js:30-59`
**Problema:** Função idêntica duplicada em dois controllers. Mudança em um não reflete no outro.
**Impacto:** Risco de divergência na lógica de obtenção de configurações financeiras.

#### RR-A4. Endpoints múltiplos para mesmos dados sem versioning
**Arquivo:** `public/js/rodadas/rodadas-config.js:261-265`
```javascript
getEndpoints: (ligaId, rodadaNum) => [
  `/api/rodadas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
  `/api/ligas/${ligaId}/rodadas?rodada=${rodadaNum}`,
  `/api/ligas/${ligaId}/ranking/${rodadaNum}`,
],
```
**Problema:** 3 endpoints diferentes são tentados em cascata para obter a mesma informação. Não está claro qual é o canônico e quais são legados.
**Impacto:** Dificuldade de manutenção; endpoints fantasma podem retornar dados em formato diferente.

#### RR-A5. `window.voltarParaCards` é definido apenas no contexto participante
**Arquivo:** `public/fronts/rodadas.html:95` → chama `window.voltarParaCards`
**Arquivo definido:** `public/participante/js/modules/participante-rodadas.js:1065`
**Problema:** No contexto admin, `window.voltarParaCards` pode não existir. O botão "Fechar" do relatório MITOS/MICOS faz fallback com `||` para ocultar o div, mas indica acoplamento entre código admin e participante.

---

### MÉDIOS

#### RR-M1. `STATUS_MERCADO_DEFAULT.temporada` usa `new Date().getFullYear()` em vez de `CURRENT_SEASON`
**Arquivo:** `public/js/rodadas/rodadas-config.js:278`
**Problema:** Inconsistência com o backend que usa `CURRENT_SEASON`. No frontend é avaliado em tempo de carregamento do módulo, ficando fixo.

#### RR-M2. Controller de correção deleta registros antes de recriar — sem transação
**Arquivo:** `controllers/rodadasCorrecaoController.js:200-250`
**Problema:** A correção faz `deleteMany` dos corrompidos e depois tenta buscar da API Cartola e salvar. Se a API Cartola estiver offline entre o delete e o save, os dados são perdidos sem recovery.
**Impacto:** Perda de dados se API Cartola falhar durante correção.

#### RR-M3. Cache IndexedDB do participante sem invalidação por temporada
**Arquivo:** `public/participante/js/modules/participante-rodadas.js` (cache-first)
**Problema:** O módulo carrega cache do IndexedDB na Phase 1 sem verificar se a temporada mudou. Dados de 2025 podem ser exibidos até o background fetch completar.

#### RR-M4. Relatório MITOS/MICOS sem paginação — busca todas as 38 rodadas de uma vez
**Arquivo:** `public/js/rodadas/rodadas-orquestrador.js:426-507`
**Problema:** Faz fetch de todas as rodadas (1-38) em paralelo para gerar o relatório. Com 32 participantes × 38 rodadas = 1216 registros processados no frontend.
**Impacto:** Possível lentidão em devices mobile ou conexões lentas.

#### RR-M5. Participante pode "curiosar" escalação de qualquer time via `abrirCampinhoModal`
**Arquivo:** `public/participante/js/modules/participante-rodadas.js:853-1013`
**Problema:** O modal "Campinho" faz fetch direto da API Cartola (`/api/cartola/time/id/${timeId}/${rodada}`) sem validar se o participante tem permissão de ver o time alheio. Não é crítico (dados da API são públicos), mas permite inferir estratégias de outros participantes.

#### RR-M6. Calendário de rodadas sem validação de temporada no frontend
**Arquivo:** `routes/calendario-rodadas-routes.js`
**Problema:** As rotas POST/PUT para salvar calendário não verificam se a temporada é a atual. Um admin poderia acidentalmente alterar calendários de temporadas passadas.

---

### BAIXOS

#### RR-B1. `VERSAO_SISTEMA_FINANCEIRO` definida mas nunca comparada
**Arquivo:** `public/js/rodadas/rodadas-config.js:9` → `"5.0.0"`
**Problema:** A versão é exportada mas nunca é usada para invalidar cache ou comparar compatibilidade.

#### RR-B2. Timeouts hardcoded em `TIMEOUTS_CONFIG`
**Arquivo:** `public/js/rodadas/rodadas-config.js:343-348`
**Problema:** Timeouts fixos (500ms render, 3s image, 8s API). Em redes lentas, 8s pode não ser suficiente.

#### RR-B3. `console.log` em cada operação do módulo
**Arquivos:** Todos os 5 JS do admin + controller + participante
**Problema:** Dezenas de logs com emojis em cada operação. Poluição de console em produção.

---

## 1.3 RESUMO RANKING DE RODADAS

| Severidade | Qtd | IDs |
|------------|-----|-----|
| CRÍTICO | 3 | RR-C1, RR-C2, RR-C3 |
| ALTO | 5 | RR-A1 a RR-A5 |
| MÉDIO | 6 | RR-M1 a RR-M6 |
| BAIXO | 3 | RR-B1 a RR-B3 |
| **TOTAL** | **17** | |

---
---

# PARTE 2 — MÓDULO RANKING GERAL (CLASSIFICAÇÃO)

**Card admin:** "Classificação" (`data-module="ranking-geral"`)
**Carregamento:** Eager (sempre carregado com a página)
**Impacto financeiro:** NÃO (apenas exibição)
**Fonte de dados:** Collection `Rodada` (produzida pelo módulo Ranking de Rodadas)

## 2.1 MAPA DE ARQUIVOS

```
BACKEND
├── routes/ranking-geral-cache-routes.js      ← GET/DELETE /api/ranking-cache/:ligaId
├── routes/ranking-turno-routes.js            ← GET/POST/DELETE /api/ranking-turno/:ligaId
├── controllers/rankingGeralCacheController.js ← Ranking acumulado (pipeline MongoDB)
├── controllers/rankingTurnoController.js     ← Ranking por turno (1/2/geral)
├── services/rankingTurnoService.js           ← Consolidação + parciais
├── services/parciaisRankingService.js        ← API Cartola para dados ao vivo
├── models/RankingGeralCache.js               ← Cache do ranking acumulado
└── models/RankingTurno.js                    ← Snapshots de ranking por turno

FRONTEND ADMIN
├── public/fronts/ranking-geral.html          ← Template admin (parcialmente morto)
├── public/js/ranking.js                      ← Frontend admin (v2.6, 1373 linhas)
└── public/css/modules/ranking-geral.css      ← CSS externo (parcialmente sobrescrito)

FRONTEND PARTICIPANTE
├── public/participante/fronts/ranking.html              ← Template mobile (v4.0)
├── public/participante/modules/ranking/ranking.js       ← Módulo mobile (v4.0, 431 linhas)
└── public/participante/js/modules/participante-ranking.js ← Inicializador

CONFIG
├── config/definitions/ranking_geral_def.json   ← Definição do módulo (NÃO consumida)
└── config/rules/ranking_geral.json             ← Regras de cálculo (parcialmente consumidas)
```

## 2.2 ACHADOS

### CRÍTICOS

#### RG-C1. `reconsolidarTodosOsTurnos` NÃO filtra por temporada
**Arquivo:** `services/rankingTurnoService.js:279`
```javascript
const ultimaRodada = await Rodada.findOne({ ligaId: ligaObjectId })
    .sort({ rodada: -1 })
```
**Problema:** A query busca a última rodada **de qualquer temporada**. Se existirem rodadas de 2025 com `rodada: 38` e a temporada 2026 estiver na `rodada: 5`, o sistema usa `rodadaAtual=38`, marcando todos os turnos como "consolidado" erroneamente.
**Impacto:** Ranking incorreto; turnos marcados como finalizados prematuramente; dados cruzados entre temporadas.
**Severidade:** CRÍTICO

#### RG-C2. Rotas de escrita SEM autenticação de admin
**Arquivos:**
- `routes/ranking-geral-cache-routes.js` → `DELETE /:ligaId`
- `routes/ranking-turno-routes.js` → `POST /:ligaId/consolidar` + `DELETE /:ligaId/cache`

**Problema:** Sem middleware `verificarAdmin()`. Qualquer usuário autenticado pode invalidar cache ou forçar reconsolidação de qualquer liga.
**Severidade:** CRÍTICO (segurança)

#### RG-C3. Inconsistência no fallback de temporada entre controllers
**Arquivos:**
- `controllers/rankingGeralCacheController.js:14` → `parseInt(temporadaParam) || CURRENT_SEASON` (2026)
- `controllers/rankingTurnoController.js:19` → `new Date().getFullYear()` (dinâmico)
- `services/rankingTurnoService.js:19` → `new Date().getFullYear()` (dinâmico)
- `services/rankingTurnoService.js:136` → `new Date().getFullYear()` (dinâmico)

**Problema:** 3 fontes diferentes de fallback de temporada. Se `CURRENT_SEASON` for ajustado para 2027 antes do ano virar, o `rankingGeralCacheController` aponta para 2027 enquanto os demais ficam em 2026.
**Severidade:** CRÍTICO (integridade de dados)

#### RG-C4. Função `getRankingRodada` exportada sem rota — código morto com import desnecessário
**Arquivo:** `controllers/rankingGeralCacheController.js:5, 206-221`
**Problema:** Importa `obterDadosRodada` de `smartDataFetcher.js` e exporta `getRankingRodada`, mas nenhuma rota registra essa função. O import de `smartDataFetcher` puxa dependências extras desnecessárias no startup.
**Severidade:** CRÍTICO (dependência solta, confusão no codebase)

---

### ALTOS

#### RG-A1. Desempate NÃO implementado no backend
**Arquivo:** `config/rules/ranking_geral.json:32-36` documenta 3 critérios de desempate.
**Arquivo:** `controllers/rankingGeralCacheController.js:132` faz apenas `$sort: { pontos_totais: -1 }`.
**Problema:** Participantes empatados ficam em ordem arbitrária do MongoDB.
**Impacto:** Posições incorretas em caso de empate.

#### RG-A2. Template HTML do admin conflita com JS gerado
**Arquivo:** `public/fronts/ranking-geral.html` define tabs com `.turno-tab`.
**Arquivo:** `public/js/ranking.js:1159-1225` sobrescreve o `innerHTML` completamente com `.ranking-turno-tab`.
**Problema:**
- FOUC — template aparece por milissegundos antes de ser substituído
- Botão "Reconsolidar" (`#btnConsolidar`) no template é destruído — sem onclick handler
- CSS do template para `.turno-tab` é inutilizado
**Impacto:** Feature morta no template; manutenção confusa.

#### RG-A3. `parametros_configuraveis` e `campos_exibicao` nunca consumidos
**Arquivos:** `config/definitions/ranking_geral_def.json`
**Problema:** Parâmetros como `exibir_variacao_posicao`, `exibir_media_pontos`, `destacar_lider` existem nos JSONs mas nenhum código os lê. São documentação morta.
**Impacto:** Falsa impressão de configurabilidade.

#### RG-A4. Hardcode de liga IDs e temporada 2025 nos JSONs de regras
**Arquivos:** `config/rules/ranking_geral.json:11,13`
```json
"ligas_habilitadas": ["684cb1c8af923da7c7df51de", "684d821cf1a7ae16d1f89572"],
"temporada": 2025
```
**Problema:** IDs hardcoded + temporada defasada. Viola "Zero hardcode".

---

### MÉDIOS

#### RG-M1. Fetch extra desnecessário para status de inativos
**Arquivo:** `public/js/ranking.js:293-307`
**Problema:** O frontend faz `POST /api/times/batch/status` para obter `ativo` e `rodada_desistencia`, mas o `rankingTurnoService.js` já retorna esses campos no array de ranking. Os dados do backend são ignorados e sobrescritos pelo resultado do fetch.
**Impacto:** Request desnecessário; fonte de verdade duplicada (`Liga.participantes` vs collection `times`).

#### RG-M2. `truncarPontos` inconsistente entre admin e participante
**Arquivos:**
- `public/js/ranking.js:31` → retorna `"105.45"` (ponto decimal)
- `public/participante/modules/ranking/ranking.js:230` → retorna `"105,45"` (vírgula brasileira)
**Problema:** Despadronização visual entre as views.

#### RG-M3. CSS em 3 camadas conflitantes
**Arquivos:**
- `public/css/modules/ranking-geral.css` — arquivo externo
- `public/fronts/ranking-geral.html` — `<style>` inline
- `public/js/ranking.js:806-1157` — `<style>` gerado pelo JS
**Problema:** JS sobrescreve innerHTML incluindo seu próprio `<style>`. Os outros 2 são efetivamente inúteis.

#### RG-M4. 3 variáveis globais redundantes
**Arquivo:** `public/js/ranking.js:348-350`
```javascript
window.rankingData = participantesFinais;
window.rankingGeral = participantesFinais;
window.ultimoRanking = participantesFinais;
```
**Problema:** Mesmo dado em 3 nomes. Sem evidência de consumo externo.

#### RG-M5. `obterConfigLiga` definida mas nunca chamada
**Arquivo:** `public/js/ranking.js:1316-1327` — código morto.

#### RG-M6. Parciais só funcionam para turno "geral"
**Arquivo:** `services/rankingTurnoService.js:72`
```javascript
if (!snapshot && turno === "geral") {
```
**Problema:** Turnos "1" e "2" sem dados retornam `null` — sem tentativa de parciais.

#### RG-M7. View participante SEM tabs de turno
**Arquivo:** `public/participante/modules/ranking/ranking.js:34` → hardcoded `'geral'`.
**Problema:** Participante não acessa visão de 1º/2º turno.

#### RG-M8. View participante SEM indicador de parciais (AO VIVO)
**Arquivo:** `public/participante/modules/ranking/ranking.js:79-85`
**Problema:** Ignora `data.parcial` e `data.status === "parcial"`. Participante pode interpretar dados parciais como finais.

#### RG-M9. Admin frontend re-ordena ranking localmente
**Arquivo:** `public/js/ranking.js:340-341`
```javascript
ativos.sort((a, b) => b.pontos - a.pontos);
```
**Problema:** O backend já retorna o ranking ordenado com posições atribuídas. O frontend reordena e recalcula posições (index+1). Se o backend implementar desempate futuro, o frontend vai sobrescrever a ordem correta.

---

### BAIXOS

#### RG-B1. `posicao_grupo` calculado no backend mas nunca exibido
**Arquivo:** `services/rankingTurnoService.js:216-223`

#### RG-B2. Campo `escudo` salvo no banco mas ignorado pelo frontend
Frontend usa `clube_id` → `/escudos/${clube_id}.png`. Campo `escudo` (URL do time Cartola) é armazenado mas nunca renderizado.

#### RG-B3. `RankingTurno` model tem campos redundantes `ativo`/`inativo`
**Arquivo:** `models/RankingTurno.js:54-55` — `inativo` é sempre `!ativo`.

#### RG-B4. `calcularPontuacaoTime` não processa reserva de luxo
**Arquivo:** `services/parciaisRankingService.js:72-98`
Apenas capitão é tratado. Substituição de titular ausente por reserva não é calculada. Parciais podem divergir do oficial.

#### RG-B5. PDF export inclui espaço do botão share escondido
**Arquivo:** `public/participante/modules/ranking/ranking.js:345-352`
`visibility: hidden` oculta visualmente mas mantém espaço no PDF.

#### RG-B6. `obterParticipanteLogado` duplicada com lógica diferente entre admin e participante
**Arquivos:**
- `public/js/ranking.js:587-600` → busca em 4 fontes (window vars + sessionStorage + localStorage)
- `public/participante/modules/ranking/ranking.js:211-224` → busca em `window.participanteAuth` primeiro, depois fallbacks
**Problema:** Dois padrões diferentes para obter o mesmo dado.

#### RG-B7. Console.log excessivo
Todos os arquivos do módulo. Dezenas de logs com emojis em cada operação.

---

## 2.3 RESUMO RANKING GERAL (CLASSIFICAÇÃO)

| Severidade | Qtd | IDs |
|------------|-----|-----|
| CRÍTICO | 4 | RG-C1 a RG-C4 |
| ALTO | 4 | RG-A1 a RG-A4 |
| MÉDIO | 9 | RG-M1 a RG-M9 |
| BAIXO | 7 | RG-B1 a RG-B7 |
| **TOTAL** | **24** | |

---
---

# PARTE 3 — LIGAÇÃO ENTRE OS MÓDULOS

## 3.1 Fluxo de Dados: Rodadas → Classificação

```
[API Cartola FC]
    ↓ busca pontuações por rodada
[Collection: Rodada]  ← dados individuais por time/rodada/temporada
    ↓ fonte de verdade compartilhada
    ├── [Módulo Rodadas] lê e exibe por rodada individual + calcula zona G/Z + valor BANCO
    └── [Módulo Classificação] agrega (SUM) pontos de todas as rodadas → ranking acumulado
```

## 3.2 Achados na Ligação

### LIG-1. CRÍTICO: Collection `Rodada` é a única ponte — sem contrato formal

**Problema:** Ambos os módulos dependem da collection `Rodada` mas não há schema validation nem documentação formal do contrato de dados. Campos usados:
- **Rodadas:** `ligaId`, `timeId`, `rodada`, `pontos`, `temporada`, `posicao`, `valorFinanceiro`, `nome_time`, `nome_cartola`, `clube_id`
- **Classificação:** `ligaId`, `timeId`, `rodada`, `pontos`, `temporada`, `nome_time`, `nome_cartola`, `clube_id`, `escudo`

Se o módulo Rodadas alterar o nome de um campo ou o formato de dados, o módulo Classificação quebrará silenciosamente.

### LIG-2. ALTO: Módulo Classificação reordena dados que deveriam ser autoritativos

**Problema:** O `rankingTurnoService.js` consolida dados da `Rodada`, calcula posições, e salva no `RankingTurno`. Mas o frontend admin (`ranking.js:340`) reordena os dados localmente. Se os dados de posição do backend divergirem da reordenação do frontend, o participante verá posição diferente do admin.

### LIG-3. MÉDIO: Temporada não é passada na reconsolidação (Rodadas → Classificação)

**Arquivo:** `controllers/rankingTurnoController.js:92`
```javascript
const resultados = await reconsolidarTodosOsTurnos(ligaId);
```
**Problema:** A rota de reconsolidação não passa a temporada para a função. A função usa `new Date().getFullYear()` internamente para `consolidarRankingTurno`, mas busca a última rodada sem filtro de temporada (RG-C1).

### LIG-4. MÉDIO: Inativos determinados por fontes diferentes

- **Módulo Rodadas** (`rodadasCacheController.js`) → usa `liga.participantes[].rodada_desistencia` para excluir de contagens
- **Módulo Classificação** (`rankingTurnoService.js`) → usa `liga.participantes[].ativo` e `rodada_desistencia` para separar no ranking
- **Frontend Admin Classificação** (`ranking.js`) → ignora os dados do backend e faz fetch extra de `/api/times/batch/status` (collection `times`)

Três fontes diferentes para determinar quem é inativo: `Liga.participantes`, `times`, e dados inline do ranking. Podem divergir.

---

# RESUMO CONSOLIDADO

| Módulo | Críticos | Altos | Médios | Baixos | Total |
|--------|----------|-------|--------|--------|-------|
| Ranking de Rodadas | 3 | 5 | 6 | 3 | **17** |
| Ranking Geral (Classificação) | 4 | 4 | 9 | 7 | **24** |
| Ligação entre módulos | 1 | 1 | 2 | 0 | **4** |
| **TOTAL GERAL** | **8** | **10** | **17** | **10** | **45** |

## PRIORIDADES DE CORREÇÃO

### P0 — Imediato (Segurança + Integridade)
1. **RR-C1 + RG-C2:** Adicionar `verificarAdmin` em TODAS as rotas POST/DELETE de ambos os módulos
2. **RR-C3:** Implementar desempate no ranking da rodada (afeta valores financeiros)
3. **RG-C1 + LIG-3:** Corrigir `reconsolidarTodosOsTurnos` para filtrar por temporada
4. **RG-C3:** Padronizar fallback de temporada para `CURRENT_SEASON`

### P1 — Curto prazo (Funcionalidade Quebrada)
5. **RR-C2:** Implementar `abrirModalRecalcMini()` ou corrigir o onclick do botão
6. **RG-C4:** Remover `getRankingRodada` e import de `smartDataFetcher`
7. **RG-A2:** Unificar template HTML com JS — eliminar template morto

### P2 — Médio prazo (Qualidade + UX)
8. **RG-M1:** Usar dados de inatividade do backend em vez de fetch extra
9. **RG-M7 + RG-M8:** Tabs de turno + indicador AO VIVO no participante
10. **LIG-4:** Unificar fonte de verdade para status de inativos
11. **RR-A3:** Extrair `getConfigRankingRodada` para um service compartilhado
