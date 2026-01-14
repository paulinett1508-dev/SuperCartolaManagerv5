# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## AUDITORIA MÓDULOS FRONTEND 2025 - EM ANDAMENTO

### Status Geral
| Módulo | Auditado | Corrigido | Testado | Commit |
|--------|----------|-----------|---------|--------|
| Ranking por Rodada | ✅ | ✅ | ✅ | - |
| Melhor do Mês | ✅ | ✅ | ✅ | `46eb593` |
| Mata-Mata | ✅ | ✅ | ✅ | `9130e8c` |
| Pontos Corridos | ✅ | ✅ | ⏳ | `5a58bfc` |
| Top 10 | ✅ | ✅ | ✅ | - |
| Ranking Geral | ✅ | ✅ | ✅ | - |
| Fluxo Financeiro | ✅ | ✅ | ✅ | sessões anteriores |

### Padrão de Correção Aplicado

**Problema comum:** Quando `rodada_atual === 1` e `status_mercado === 1` (mercado aberto), todos os módulos calculavam `ultimaRodadaCompleta = 0`, fazendo parecer que não havia dados.

**Solução aplicada (v1.2+):**
```javascript
// Detecção dinâmica de temporada
const rodadaAtual = status.rodada_atual || 1;
const mercadoAberto = status.status_mercado === 1;
const RODADA_FINAL = status.rodada_final || 38;

if (rodadaAtual === 1 && mercadoAberto) {
  // Nova temporada não começou - usar dados da temporada anterior
  ultimaRodadaCompleta = RODADA_FINAL; // 38
  temporadaAnterior = true;
}
```

### Correções Específicas por Módulo

#### Melhor do Mês (v1.2)
- Arquivo: `public/js/melhor-mes/melhor-mes-core.js`
- Antes: `ultimaRodadaCompleta = rodadaAtual - 1` → resultava em 0
- Depois: Usa 38 rodadas quando temporada anterior

#### Mata-Mata (v1.3)
- Arquivo: `public/js/mata-mata/mata-mata-orquestrador.js`
- Antes: `edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao` → nenhuma ativa
- Depois: Todas as 5 edições ativas quando temporada anterior

#### Pontos Corridos (v3.0) - MODO SOMENTE LEITURA
- Arquivo: `public/js/pontos-corridos/pontos-corridos-orquestrador.js`
- **MUDANÇA ESTRUTURAL:** Não recalcula mais, só lê do cache
- Antes: `buscarTimesLiga()` + `gerarConfrontos()` → trazia times 2026
- Depois: Carrega diretamente de `/api/pontos-corridos/:ligaId`
- 32 times fixos, 31 rodadas consolidadas

### Próximas Etapas (Sessão Futura)

1. **Testar Pontos Corridos v3.0 no browser**
   - Verificar se carrega as 31 rodadas do cache
   - Verificar se classificação mostra 32 times corretos
   - Verificar navegação entre rodadas

2. **Verificar consistência entre módulos**
   - Dados do Mata-Mata batem com cache?
   - Dados do Pontos Corridos batem com cache?
   - Melhor do Mês mostra os 12 meses?

3. **Validar isolamento de temporada**
   - Nenhum módulo deve misturar dados 2025/2026
   - Quando 2026 começar, módulos devem detectar automaticamente

4. **Documentar comportamento esperado**
   - O que cada módulo deve mostrar na pré-temporada
   - Como será a transição para 2026

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

### Dados no MongoDB (2026)
| Participante | time_id | Saldo 2026 | Status |
|--------------|---------|------------|--------|
| Lucio | -1767569480236 | -R$180 | Deve |
| Felipe Barbosa | 8098497 | -R$180 | Deve |
| Antonio Luis | 645089 | -R$180 | Deve |
| Paulinett Miranda | 13935277 | R$0 | Pago |
| Diogo Monte | 25371297 | +R$174 | Pago (credito) |

---

## Historico da Sessao 2026-01-14 (Noite)

### Migracao Modulos ao Extrato 2025 - GRAVISSIMO
**Status:** CONCLUIDO

**Problema reportado:** Modulos PC, MM, Top10 zerados em TODAS as rodadas 2025.

**Causa raiz REAL identificada:**
Os caches de `extratofinanceirocaches` foram criados em **formato legado** que:
- Apenas preencheu `bonusOnus` (BANCO)
- Deixou `pontosCorridos`, `mataMata` e `top10` como **ZERO**
- Os dados dos modulos **EXISTIAM** nas collections especificas, mas **NUNCA foram integrados**

**Dados encontrados nos caches de modulos:**
| Modulo | Collection | Dados |
|--------|------------|-------|
| Pontos Corridos | `pontoscorridoscaches` | 31 rodadas, 992 entradas |
| Mata-Mata | `matamatacaches` | 5 edicoes, 310 resultados |
| Top10 | `top10caches` | 22 mitos, 19 micos |

**Script de migracao criado:**
- `scripts/migrar-modulos-extrato-2025.js`
- Le dos caches de modulos e integra ao extrato
- Preserva dados historicos (temporada 2025 e IMUTAVEL)

**Resultado da migracao:**
- 32 extratos atualizados
- Cada extrato recebeu ~30 entradas PC, ~10 MM, ~2 Top10

**Exemplo - Antonio Luis (FloriMengo FC):**
| Modulo | Antes | Depois |
|--------|-------|--------|
| BANCO | -128 | -128 |
| PC | 0 | **-50** |
| MM | 0 | **-10** |
| Top10 | 0 | 0 |
| **TOTAL** | -158 | **-188** |

**TOP 5 CREDORES (apos migracao):**
1. fc.catumbi: R$ 1281
2. AltosShow: R$ 1131
3. WorldTreta FC: R$ 1104
4. Tabaca Neon: R$ 959
5. Quase Nada Palace: R$ 887

**TOP 5 DEVEDORES (apos migracao):**
1. 51 Sportclub: R$ -1314
2. Invictus Patamar S.A.F.: R$ -1209
3. FIASCO VET FC: R$ -879
4. adv.DBarbosa.FC: R$ -764
5. Randim: R$ -660

---

### Auditoria Extrato Financeiro 2025 - Antonio Luis (Anterior)
**Status:** PARCIALMENTE CONCLUIDO (continuado acima)

**Problema reportado:** Extrato 2025 nao carregava, mostrava dados misturados com 2026, PC/MM/Top10 em branco.

**Causa raiz inicial identificada:**
1. Cache frontend usava apenas `timeId` como chave (sem temporada) - misturava dados
2. `trocarTemporadaExtrato()` nao atualizava `window.temporadaAtual`
3. Schema `ExtratoFinanceiroCache.liga_id` era ObjectId mas dados historicos eram String

**Correcoes aplicadas:**
| Arquivo | Mudanca |
|---------|---------|
| `fluxo-financeiro-cache.js` | Chave cache: `${timeId}_${temporada}` |
| `fluxo-financeiro-ui.js` | Sync `window.temporadaAtual` + mostrar 38 rodadas |
| `ExtratoFinanceiroCache.js` | `liga_id: Mixed` (aceita String ou ObjectId) |
| `fluxo-financeiro.css` | CSS para destacar linhas MITO/MICO |

**Commits:**
- `fd9dc30` fix(cache): isolamento de temporada no cache de extratos
- `0f339fa` fix(model): aceitar String ou ObjectId em ExtratoFinanceiroCache.liga_id
- `d77b0da` fix(ui): mostrar todas rodadas no extrato individual
- `417826b` feat(ui): destacar linhas MITO/MICO na tabela de extrato

---

## Tarefas Pendentes

### Sincronizar Participantes 2026 com MongoDB
**Status:** CONCLUIDO (principal) / OPCIONAL (melhorias)

**Contexto:** O fluxo de renovacao ja sincroniza participantes na collection `times` automaticamente via `inscricoesController.js:274-293`.

---

### Arquitetura Atual (Verificada 2026-01-14)

**Collection `times`:**
- Campo `id` e UNIQUE (nao permite duplicatas)
- Campo `temporada` indica temporada ATIVA (nao historico)
- Fluxo de renovacao faz `Time.findOneAndUpdate` com upsert

**Historico por temporada em outras collections:**
- `inscricoestemporada` - Registro de cada inscricao
- `rodadas` - Historico de rodadas
- `extratofinanceirocaches` - Caches financeiros

**Participantes 2026 ja sincronizados:**
| Participante | time_id | Em `times`? |
|--------------|---------|-------------|
| Felipe Barbosa | 8098497 | SIM |
| Antonio Luis | 645089 | SIM |
| Paulinett Miranda | 13935277 | SIM |
| Diogo Monte | 25371297 | SIM |
| Lucio | -1767569480236 | N/A (manual) |

---

### Checklist de Implementacao

1. **Schema `times` com campo `temporada`:** CONCLUIDO
   - `models/Time.js:112-118`
   - `temporada: { type: Number, required: true, default: CURRENT_SEASON }`

2. **Sincronizacao no fluxo de renovacao:** CONCLUIDO
   - `inscricoesController.js:274-293`
   - `Time.findOneAndUpdate` com upsert

3. **Botao Validar + Modal:** CONCLUIDO
   - `validacaoParticipantesController.js`
   - `public/js/participantes.js:1892-2011`

4. **Esconder botao Validar em 2025:** CONCLUIDO (2026-01-14)
   - `public/js/participantes.js:82-93`
   - Funcao `atualizarVisibilidadeBotaoValidar()`
   - Logica: so mostra se `temporadaSelecionada >= temporadaLiga`

5. **Botao "Sincronizar Todos":** OPCIONAL
   - Util para inicio de temporada
   - Baixa prioridade (renovacao ja sincroniza)

6. **Botao Atualizar sincronizar `times`:** OPCIONAL
   - Atualmente so atualiza `InscricaoTemporada`
   - Baixa prioridade (renovacao ja sincroniza)

---

### Regra de Isolamento por Temporada

**Arquitetura escolhida:** `times` como cadastro vivo (nao historico)

```
times (cadastro unico)          vs    inscricoestemporada (historico)
+-- id: 8098497 (unique)              +-- temporada: 2025, time_id: 8098497
+-- temporada: 2026 (atual)           +-- temporada: 2026, time_id: 8098497
+-- nome_time: "Cangalexeu FC"
```

**Vantagens:**
- Simples de consultar participante ativo
- Nao duplica dados basicos entre temporadas
- Historico completo em collections especificas

---

### Validação de IDs Cartola - Temporada 2026
**Status:** CONCLUIDO

**Contexto:** Antes da temporada 2026 começar, precisamos validar se os IDs dos times no Cartola FC ainda são válidos (mesmo dono).

**Implementado:**

1. **Rota API** (FEITO)
   - `GET /api/ligas/:id/validar-participantes/:temporada`
   - `PUT /api/ligas/:id/participantes/:timeId/sincronizar`
   - Controller: `controllers/validacaoParticipantesController.js`

2. **Script CLI** (FEITO)
   ```bash
   node scripts/validar-ids-temporada.js --temporada=2026
   node scripts/validar-ids-temporada.js --temporada=2026 --fix
   ```

3. **Botão na UI** (FEITO)
   - Botão "Validar" no toolbar de Participantes
   - Modal com resultados (válidos/dono diferente/inexistentes)
   - Botão "Atualizar" para sincronizar dados divergentes

**Resultado da Validação 2026:**
```
✅ VÁLIDOS (4/4)
   8098497 - Felipe Barbosa (Cangalexeu FC)
   645089 - Antonio Luis (FloriMengo FC)
   13935277 - Paulinett Miranda (Urubu Play F.C.)
   25371297 - Diogo Monte (Tabaca Neon)
```

**Arquivos criados/modificados:**
- `controllers/validacaoParticipantesController.js` (NOVO)
- `scripts/validar-ids-temporada.js` (NOVO)
- `routes/ligas.js` (rotas adicionadas)
- `public/fronts/participantes.html` (botão Validar)
- `public/js/participantes.js` (lógica + modal)

---

### Compactação UI Participantes
**Status:** CONCLUÍDO

**Problema:** Layout muito espaçado, botões longe do nome.

**Solução aplicada em `public/css/modules/participantes.css`:**
- Gap entre cards: 6px → 4px
- Padding card: 8px 12px → 6px 10px
- Gap interno row: 12px → 8px
- Avatar: 36px → 30px
- Botões: 32px → 28px
- Removido `flex: 1` do info (não empurra mais botões)
- Max-width: 180px no info

---

### Correção Aba 2026
**Status:** CONCLUÍDO

**Mudanças:**
- Mesmo layout de 2025 (sem badge de status)
- Quem saiu (`nao_participa`) não aparece mais
- Botão "Dados do Globo" restaurado

---

## Historico da Sessao 2026-01-14 (Tarde)

### Modal Pesquisar Time na API Globo
**Status:** CONCLUIDO

**Feature implementada:**
- Novo card "Pesquisar Time" em Ferramentas (`public/ferramentas.html`)
- Modal com busca na API publica do Cartola (Globo)
- Fluxo: buscar → selecionar → confirmar → escolher liga → adicionar
- Adiciona participante na temporada vigente (2026)

**Arquivos criados/modificados:**
- `public/js/ferramentas/ferramentas-pesquisar-time.js` (NOVO)
- `public/ferramentas.html` (card + import)
- `routes/cartola-proxy.js` (nova rota `/buscar-time-globo`)

**API utilizada:**
- `GET /api/cartola/buscar-time-globo?q={nome}&limit=10`
- Usa `cartolaApiService.buscarTimePorNome()` para busca real na Globo

**Commits:**
- `e59b3df` fix(ferramentas): corrigir URL da rota buscar-time-globo
- `7dc6ea6` feat(ferramentas): modal para pesquisar time na API Globo
- `6c32d84` feat(participantes): ocultar botao Validar em temporadas passadas

---

## Historico da Sessao 2026-01-14 (Manha)

### Esconder Botao Validar em 2025
**Status:** CONCLUIDO

**Implementado:**
- Funcao `atualizarVisibilidadeBotaoValidar()` em `public/js/participantes.js:82-93`
- Chamada em `inicializarTemporadas()` e `selecionarTemporada()`
- Logica: `temporadaSelecionada >= temporadaLiga` → mostra, senao oculta
- Aba 2025 (passada): botao oculto
- Aba 2026 (atual): botao visivel

**Analise realizada:**
- Schema `times` ja tem campo `temporada` (linha 112-118)
- Fluxo de renovacao ja sincroniza `times` automaticamente (inscricoesController.js:274-293)
- 4/4 participantes 2026 ja estao em `times` com temporada correta

---

### Validacao Completa do Sistema
**Status:** CONCLUIDO

**Tarefas validadas:**

#### 1. Extrato Financeiro 2025
- [x] Top10 (MITO/MICO) calculado corretamente
- [x] Saldo consolidado correto apos correcoes
- [x] 9 participantes quitados
- [x] 14 credores, 9 devedores (nao quitados)

**Exemplo validado:** fucim (45004009) - 4 MITOs (+R$120), 1 MICO (-R$30), QUITADO

#### 2. Extrato Financeiro 2026 (5 Renovados)
| Participante | time_id | Saldo | Status |
|--------------|---------|-------|--------|
| Diogo Monte | 25371297 | +R$174 | A RECEBER |
| Paulinett Miranda | 13935277 | R$0 | QUITADO |
| Felipe Barbosa | 8098497 | -R$180 | DEVE |
| Lucio | -1767569480236 | -R$180 | DEVE |
| Antonio Luis | 645089 | -R$180 | DEVE |

- [x] Extrato 2026 nao mostra dados de 2025
- [x] Taxa de inscricao aparece corretamente (-R$180)
- [x] Credito de 2025 aplicado (Diogo Monte: R$354 - R$180 = R$174)

#### 3. Fluxo de Renovacao e Quitacao
- [x] API de regras funcionando (`/api/liga-rules`)
- [x] Taxa: R$180, Prazo: 25/01/2026
- [x] 5 inscricoes em `inscricoestemporada`
- [x] Auto-quitacao implementada (v2.20 tesouraria-routes.js)
- [x] Participante com credito renovou corretamente
- [x] Participante que pagou tem saldo zerado

### Auditoria e Correcao Caches 2025 (sessao anterior)
**Status:** CONCLUIDO

**Problema identificado:**
- Caches de extrato financeiro 2025 estavam incompletos
- Top10 (MITO/MICO) nao estava sendo calculado
- 23 de 28 caches tinham valores errados
- Impacto financeiro: R$6.436 nao contabilizados

**Solucoes aplicadas:**

1. **Reconstrucao cache fucim (45004009):**
   - Cache tinha apenas 1 rodada, reconstruido com 38
   - Top10 calculado: 4 MITOs (+R$120), 1 MICO (-R$30)
   - Acerto corrigido: R$234 → R$261 para zerar saldo
   - Status: QUITADO

2. **Correcao de todos os 32 caches:**
   - Script: `scripts/corrigir-caches-2025.js`
   - Recalculado bonusOnus + Top10 para todos
   - Re-auditoria: 32/32 caches OK

3. **Auto-quitacao implementada:**
   - Arquivo: `routes/tesouraria-routes.js` v2.20
   - Quando acerto zera saldo de temporada anterior, marca quitado automaticamente

4. **Quitacao em lote (saldo < R$50):**
   - 8 participantes quitados automaticamente
   - Credores perdoados: R$90,59
   - Devedores perdoados: R$66,82

**Balanco Final 2025:**
| Metrica | Valor |
|---------|-------|
| Credores | 15 participantes (R$6.469,20) |
| Devedores | 8 participantes (R$1.937,92) |
| Quitados | 9 participantes |
| **Saldo Liga** | **-R$4.531,28** (admin deve) |

**Scripts criados:**
- `scripts/corrigir-caches-2025.js` - Recalcula todos os caches com Top10

### Auditoria Liga Sobral
**Status:** CONCLUIDO

**Problema:** 6 caches com Top10 incorreto

**Solucao:**
- Scripts: `scripts/auditar-caches-sobral.js`, `scripts/corrigir-caches-sobral.js`
- 6 caches corrigidos

**Balanco Sobral 2025:**
| Metrica | Valor |
|---------|-------|
| Credores | 2 (R$500) |
| Devedores | 4 (R$240) |
| Saldo Liga | -R$260 (admin deve) |

**Observacoes:**
- Liga Sobral nao tem bonusOnus (valores do banco = 0)
- Apenas Top10: MITO=+R$10, MICO=-R$10

---

## Historico da Sessao 2026-01-13

### Extrato 2026 - Cache Fix
**Status:** CORRIGIDO

**Problema:** Extrato 2026 mostrava dados de 2025 devido a cache persistente no IndexedDB.

**Solucao aplicada:**
- Incrementada versao do IndexedDB de 2 para 3 em `participante-cache.js`
- Quando usuarios acessarem o app, o banco sera recriado automaticamente
- Commit: `fix(cache): incrementa IndexedDB v3 para limpar cache de 2025`

### Fluxo Financeiro 2026 - Validado
**Status:** VALIDADO VIA API

**Testes realizados:**
- [x] Diogo Monte: saldo +R$174 (A RECEBER)
- [x] Paulinett Miranda: saldo R$0 (QUITADO)
- [x] Felipe Barbosa: saldo -R$180 (DEVE)
- [x] Logica de status: DEVE/QUITADO/A RECEBER (sem "ABATIDO")

### Jogos do Dia (Premium) - Validado
**Status:** VALIDADO VIA API

**Testes realizados:**
- [x] API retorna 3 jogos mock para premium (time_id 13935277)
- [x] API retorna jogos: [] para nao-premium
- [x] Badge "Preview" quando fonte = "mock"
- [x] Frontend integrado em participante-boas-vindas.js

---

## Historico da Sessao 2026-01-11

### Jogos do Dia (Premium) - IMPLEMENTADO

**Feature:** Exibir jogos do Brasileirao na tela inicial do app do participante.

**Arquivos modificados:**
- `routes/jogos-hoje-routes.js` v1.1 - API com mock para pre-temporada
- `public/participante/js/modules/participante-jogos.js` v1.1 - Modulo de jogos
- `public/participante/js/modules/participante-boas-vindas.js` v10.7 - Integracao

**Como funciona:**
- API consulta football-data.org para jogos do Brasileirao
- Em pre-temporada (sem jogos reais), retorna mock para premium
- Premium = time_id 13935277 (Paulinett Miranda)
- Card exibe: mandante vs visitante, horario, status (Em breve/Ao vivo/Encerrado)
- Badge "Preview" aparece quando usa dados mock

**API:**
```
GET /api/jogos-hoje?timeId=13935277
Response: { jogos: [...], premium: true, fonte: "mock"|"api", data: "2026-01-11" }
```

---

## Historico Arquivado

### 2026-01-11 - Seletor de Temporada UX
- **Status:** CONCLUIDO
- **Resumo:** Removido reload que saia da tela, implementada recarga dinamica
