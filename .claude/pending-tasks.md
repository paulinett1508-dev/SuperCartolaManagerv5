# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## BUG CRITICO - HALL DA FAMA SALDO INCORRETO (Sessao 2026-01-16)

### Problema
O card **SALDO FINAL** no Hall da Fama mostra valor incorreto para participantes de **multiplas ligas**.

**Caso concreto:** Paulinett Miranda (ID: 13935277)
- Deveria mostrar: **-R$ 193** (SUPERCARTOLA)
- Mostra: **R$ 296** (valor incorreto)
- Modal de detalhes: abre **todo zerado**

### Causa Raiz Identificada
O sistema **mistura dados de diferentes ligas**:
```
Cache SOBRAL (67) + Acertos SUPERCARTOLA (229) = 296
```

### Dados do Participante

| Liga | Saldo JSON | Cache 2025 | Acertos |
|------|------------|------------|---------|
| SUPERCARTOLA | -193 | **NAO EXISTE** | +229 |
| SOBRAL | +190 | 67 | 0 |

### IDs das Ligas
- SUPERCARTOLA: `684cb1c8af923da7c7df51de`
- SOBRAL: `684d821cf1a7ae16d1f89572`

### Correcao Aplicada (Parcial)
**Arquivo:** `public/participante/js/modules/participante-historico.js`
**Versao:** v12.9 → v12.10

**Bug corrigido:** Escopo da variavel `ligaData` em `renderizarDadosTempoReal()`:
- `ligaData` era declarada dentro do try interno mas usada fora
- Causava fallback incorreto para `CURRENT_SEASON = 2026`
- Criada variavel `ligaAno` no escopo correto

**Nota:** Essa correcao resolve casos onde `renderizarDadosTempoReal` e chamada, mas NAO resolve o caso de Paulinett Miranda que tem historico no JSON.

### Informacoes do Usuario (Testes)
1. Liga selecionada no header: **Super Cartola**
2. Liga exibida no Hall da Fama: **SuperCartola**
3. Teste de troca de liga: **nao realizado**

### Tarefas Pendentes
- [ ] Adicionar logs de debug em `renderizarTodasLigas()` para rastrear qual `ligaId` e usado
- [ ] Verificar se `ligaIdSelecionada` esta correta quando modulo inicia
- [ ] Testar trocar a liga no header e observar se valor muda
- [ ] Identificar ONDE exatamente ocorre a mistura de dados entre ligas
- [ ] Considerar criar cache SUPERCARTOLA 2025 para Paulinett Miranda

### Comandos Uteis
```bash
# Testar API SUPERCARTOLA (retorna 404 + acertos)
curl -s "http://localhost:5000/api/extrato-cache/684cb1c8af923da7c7df51de/times/13935277/cache?temporada=2025"

# Testar API SOBRAL (retorna saldo 147)
curl -s "http://localhost:5000/api/extrato-cache/684d821cf1a7ae16d1f89572/times/13935277/cache?temporada=2025"

# Buscar caches do participante
node -e "require('mongoose').connect(process.env.MONGO_URI).then(m => m.connection.db.collection('extratofinanceirocaches').find({time_id: 13935277}).toArray().then(r => { console.log(r); process.exit(); }))"
```

### Hipotese para Investigar
Quando `ligaIdSelecionada = SUPERCARTOLA`:
1. `buscarExtrato(SUPERCARTOLA, 2025)` retorna null (404)
2. Fallback deveria usar JSON: `tempRecente.financeiro.saldo_final = -193`
3. Mas algo esta usando cache da SOBRAL (67) + acertos da SUPERCARTOLA (229)

Possivel bug: O modulo pode estar iterando por TODAS as ligas mesmo quando uma esta selecionada, ou ha vazamento de dados entre iteracoes do loop.

---

## PROBLEMAS CRITICOS - EXTRATO 2026 (Sessao 2026-01-15)

### Contexto Geral
A sessao de 2026-01-15 tentou corrigir anomalias no extrato 2026 mas revelou **confusao conceitual grave** sobre a arquitetura do sistema. Varios fixes foram aplicados mas criaram novos problemas ou nao resolveram os originais.

### Conceitos que Precisam Clarificacao

| Conceito | O que EU entendi | Duvida/Problema |
|----------|------------------|-----------------|
| **Pre-temporada** | Temporada 2026 nao comecou (API Cartola ainda em 2025) | Quando exatamente termina? Quando API retorna `temporada: 2026`? |
| **Rodada fantasma** | Dados de "rodada 1" criados incorretamente para 2026 | Por que o sistema insiste em calcular rodadas que nao existem? |
| **Campos editaveis** | 4 campos manuais (campo1-4) para ajustes | Sao de 2025? Devem existir em 2026? Qual a relacao com "Ajustes"? |
| **Acertos** | Pagamentos/recebimentos que quitam divida | Unica funcionalidade que deve existir em 2026 pre-temporada? |
| **Quitacao** | Fechar extrato de temporada anterior | Relacao com legado? Com renovacao? |
| **Legado** | Saldo transferido de uma temporada para outra | Como e calculado? Onde e armazenado? |
| **Inscricao** | Taxa de R$180 para participar de 2026 | Onde aparece? Como debito? Como e quitada? |

### Problemas Identificados (Nao Resolvidos)

#### 1. Tabela ROD/POS ainda aparece em 2026
- **Sintoma:** Usuario reporta que "Detalhamento por Rodada continua vindo dados nas colunas ROD e POS"
- **Fix aplicado:** Condicional `!extrato.preTemporada` na UI
- **Problema:** O fix pode nao estar funcionando - verificar se `preTemporada` flag esta sendo setado corretamente

#### 2. Fluxo de calculo recria dados fantasmas
- **Sintoma:** Mesmo apos limpar cache no MongoDB, dados voltam
- **Causa identificada:** Frontend recalcula usando dados de 2025 da API Cartola
- **Fix aplicado:** `isPreTemporada` check em `fluxo-financeiro-core.js`
- **Problema:** Precisa validar se o fix realmente funciona em producao

#### 3. Conceito de "Ajustes" vs "Campos Editaveis" vs "Acertos"
- **Confusao:** Usuario quer manter "Ajustes" para valores de limbo/extraordinarios
- **Pergunta:** Ajustes = campos editaveis (campo1-4)? Ou e outra coisa?
- **Acao necessaria:** Clarificar com usuario a nomenclatura e proposito de cada um

#### 4. Carregamento excessivo de dependencias
- **Sintoma:** 37+ requests HTTP para carregar extrato 2026 vazio
- **Causa:** Lazy loading carrega dados de 2025 desnecessariamente
- **Fix aplicado:** Early return antes de `carregarDadosCompletos()`
- **Problema:** Nao validado se realmente reduziu requests

### Commits Feitos (Sessao 2026-01-15)

```
0349fa5 fix(ui): remover tabela de rodadas ROD/POS do extrato 2026 pre-temporada
75cd491 fix(fluxo): protecao contra rodada fantasma em pre-temporada 2026
2dc2221 fix(scripts): adicionar script para corrigir extrato 2026 com rodada fantasma
```

### Arquivos Modificados

| Arquivo | Versao | Mudanca |
|---------|--------|---------|
| `fluxo-financeiro-core.js` | v6.7 | Detectar pre-temporada, early return |
| `fluxo-financeiro-ui.js` | v6.7 | Ocultar tabela ROD/POS, mostrar banner |
| `extratoFinanceiroCacheController.js` | v6.3 | Bloquear save de rodadas fantasmas |

### Script de Correcao Criado

```bash
# Limpa caches 2026 com rodadas > 0 (anomalia)
node scripts/fix-extrato-2026-rodada-fantasma.js --dry-run
node scripts/fix-extrato-2026-rodada-fantasma.js --force
```

---

## ✅ RESOLVIDO - BUG MODULO TOP10 (Corrigido 2026-01-15)

### Problema Identificado (CORRIGIDO)

O sistema **confundia dois modulos diferentes**:

| Modulo | Regra CORRETA | O que o sistema faz ERRADO |
|--------|---------------|---------------------------|
| **Ranking Rodada** | 1o lugar = bonus, ultimo = onus | ✓ Correto (campo `bonusOnus`) |
| **TOP10** | 10 maiores/menores pontuacoes da TEMPORADA | ✗ Marca TODOS que foram 1o/ultimo |

### Regra Correta do TOP10

- **TOP 10 MITOS:** As 10 MAIORES pontuacoes absolutas de toda a temporada (38 rodadas)
- **TOP 10 MICOS:** As 10 MENORES pontuacoes absolutas de toda a temporada
- **Mesmo participante pode aparecer varias vezes** se teve multiplas pontuacoes no ranking

### O que o Sistema Faz Errado

O sistema atual marca como MITO/MICO baseado em **ser 1o/ultimo da rodada**, nao baseado no **ranking global TOP10**.

Exemplo: Daniel Barbosa foi 1o lugar em **18 rodadas**, mas apenas **7 dessas** estao no TOP10 MITOS global. As outras 11 rodadas estao recebendo bonus indevidamente.

### Auditoria - Liga Cartoleiros do Sobral (2025)

**TOP 10 MITOS GLOBAL (correto):**
```
1o  Paulinett    R21  189.15 pts
2o  Daniel       R8   126.54 pts
3o  Daniel       R35  122.24 pts
4o  Daniel       R4   119.90 pts
5o  Daniel       R28  115.64 pts
6o  Paulinett    R29  115.51 pts
7o  Daniel       R34  110.57 pts
8o  Carlos H.    R7   109.65 pts
9o  Paulinett    R13  109.47 pts
10o Paulinett    R36  108.43 pts
```

**TOP 10 MICOS GLOBAL (correto):**
```
1o  Hivisson     R34   6.47 pts
2o  Paulinett    R38   7.10 pts
3o  Hivisson     R16  11.55 pts
4o  Jr.Brasilino R30  17.52 pts
5o  Hivisson     R12  22.00 pts
6o  Matheus      R32  24.19 pts
7o  Matheus      R33  24.19 pts
8o  Jr.Brasilino R31  24.90 pts
9o  Jr.Brasilino R24  25.64 pts
10o Carlos H.    R10  26.75 pts
```

### Discrepancias Encontradas

**Rodadas recebendo bonus TOP10 INDEVIDAMENTE:**

| Participante | Rodadas INCORRETAS | Impacto |
|--------------|---------------------|---------|
| Daniel Barbosa | R2,R3,R5,R9,R12,R18,R23,R24,R30,R31,R32,R33,R38 | +R$130 |
| Paulinett | R6,R16,R20,R22,R25,R27 | +R$60 |
| Carlos Henrique | R1,R15,R26 | +R$30 |
| Matheus Coutinho | R10,R11,R17,R37 | +R$40 |
| Junior Brasilino | R19 | +R$10 |
| Hivisson | R14 | +R$10 |

**Rodadas pagando onus TOP10 INDEVIDAMENTE:**

| Participante | Rodadas INCORRETAS | Impacto |
|--------------|---------------------|---------|
| Junior Brasilino | R1,R2,R4,R8,R13,R15,R21,R28,R35 | -R$90 |
| Matheus Coutinho | R3,R6,R19,R20,R23,R25,R27 | -R$70 |
| Carlos Henrique | R11,R14,R29,R36,R37 | -R$50 |
| Hivisson | R9,R17,R18,R22 | -R$40 |
| Paulinett | R5,R7,R26 | -R$30 |

### Proposta de Correcao

**Opcao 1: Recalcular valores TOP10 nos extratos**
- Criar script que:
  1. Le o `top10caches` da liga (ranking global)
  2. Para cada extrato, verifica se a rodada esta no TOP10 global
  3. Se NAO esta: zera o valor `top10`, `isMito`, `isMico`
  4. Se ESTA: aplica o valor correto baseado na posicao global (1o=R$50, 2o=R$40, etc)

**Opcao 2: Corrigir a logica no fluxo de calculo**
- Modificar `fluxo-financeiro-core.js` para:
  1. Buscar o ranking global TOP10 da temporada
  2. Aplicar valores TOP10 APENAS para rodadas que estao no ranking global
  3. Nao confundir com "ser 1o da rodada" (isso e bonusOnus, nao TOP10)

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `fluxo-financeiro-core.js` | Logica de calculo TOP10 |
| `extratoFinanceiroCacheController.js` | Nao marcar MITO/MICO por posicao |
| Script de correcao | Recalcular caches existentes |

### Script de Correcao (CRIADO E EXECUTADO)

```bash
# Corrigir valores TOP10 nos extratos da Liga Sobral
node scripts/fix-top10-extratos-sobral.js --dry-run
node scripts/fix-top10-extratos-sobral.js --force
```

### ✅ CORREÇÃO APLICADA (2026-01-15)

**Execução:** Script `fix-top10-extratos-sobral.js` executado com sucesso.

**Resultado:**
| Participante | Impacto | Saldo Final |
|--------------|---------|-------------|
| Daniel Barbosa | -R$146 | R$183 |
| Junior Brasilino | +R$98 | -R$158 |
| Paulinett Miranda | -R$51 | R$67 |
| Matheus Coutinho | +R$41 | -R$63 |
| Hivisson | +R$36 | -R$134 |
| Carlos Henrique | +R$22 | -R$69 |

**Total:** 74 correções em 6 extratos.

**Arquivos criados:**
- `scripts/fix-top10-extratos-sobral.js` - Script de correção (reutilizável)

**Nota:** O bug original estava no fluxo de cálculo que marcava MITO/MICO baseado em "ser 1º/último da rodada" ao invés de verificar o TOP10 GLOBAL da temporada. A correção foi aplicada diretamente nos extratos da Liga Sobral. A lógica do frontend (`fluxo-financeiro-core.js`) ainda precisa ser corrigida para evitar recriação do bug em novos cálculos.

---

## PROXIMOS PASSOS RECOMENDADOS

### 1. Sessao de Clarificacao Conceitual
Antes de mais codigo, definir claramente:
- O que deve aparecer no extrato 2026 durante pre-temporada?
- Qual a diferenca entre Ajustes, Campos Editaveis e Acertos?
- Como funciona o fluxo: Inscricao -> Debito -> Pagamento -> Quitacao?

### 2. Validacao em Producao
- Testar se os fixes aplicados funcionam no ambiente real
- Verificar console do navegador para erros
- Confirmar que tabela ROD/POS sumiu

### 3. Refatoracao do Fluxo Financeiro
O modulo `fluxo-financeiro` esta muito complexo com muitas condicoes:
- Temporada historica (2025)
- Temporada atual (2026 quando comecar)
- Pre-temporada (2026 antes de comecar)
- Participante ativo vs inativo
- Cache valido vs invalido
- Mercado aberto vs fechado

Considerar simplificar ou documentar melhor cada cenario.

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Participantes 2026 Renovados
| Participante | time_id | Saldo | Status |
|--------------|---------|-------|--------|
| Diogo Monte | 25371297 | +R$174 | A RECEBER |
| Paulinett Miranda | 13935277 | R$0 | QUITADO |
| Felipe Barbosa | 8098497 | -R$180 | DEVE |
| Antonio Luis | 645089 | -R$180 | DEVE |
| Lucio | -1767569480236 | -R$180 | DEVE |

### Status da API Cartola (2026-01-15)
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```
**Nota:** API ainda retorna `temporada: 2025` mesmo em janeiro/2026. Pre-temporada.

---

## FEATURE: JOGOS DO DIA - SCRAPER GLOBO ESPORTE

### Implementacao Atual

#### Arquitetura
```
[index.js] ──> [scripts/save-jogos-globo.js] ──> [scripts/scraper-jogos-globo.js]
     │                     │
     │                     └──> Salva em: data/jogos-globo.json
     │
     └──> [routes/jogos-hoje-globo.js] ──> GET /api/jogos-hoje-globo
                                                │
                                                └──> Le de: data/jogos-globo.json
```

#### Arquivos Envolvidos

| Arquivo | Funcao |
|---------|--------|
| `scripts/scraper-jogos-globo.js` | Faz scraping de `https://ge.globo.com/futebol/agenda/` usando Cheerio |
| `scripts/save-jogos-globo.js` | Executa scraper e salva JSON em `data/jogos-globo.json` |
| `routes/jogos-hoje-globo.js` | Rota API que serve o JSON salvo |
| `index.js` (linhas 1-23) | Configura execucao automatica |

#### Execucao Automatica (index.js)

```javascript
// CRON: Todo dia as 6h da manha
cron.schedule("0 6 * * *", () => {
  exec("node scripts/save-jogos-globo.js", ...);
});

// INIT: Executa ao iniciar o servidor
exec("node scripts/save-jogos-globo.js", ...);
```

**Comportamento:**
1. Servidor inicia → executa scraper → salva JSON
2. Todo dia 6h → executa scraper → atualiza JSON
3. API `/api/jogos-hoje-globo` → le JSON do disco

#### Dados Extraidos (Estrutura)

```json
{
  "jogos": [
    {
      "campeonato": "Brasileirão Série A",
      "horario": "16:00",
      "times": "Flamengo x Palmeiras",
      "local": "Maracanã"
    }
  ],
  "fonte": "globo"
}
```

#### Limitacoes Atuais
- **Sem placares em tempo real** - So pega agenda (horarios)
- **Executa 1x ao iniciar** - Se servidor reinicia muito, pode sobrecarregar
- **Sem fallback** - Se Globo mudar HTML, scraper quebra
- **Depende de estrutura CSS** - Seletores: `.jogos-dia .jogo__informacoes`

---

### IDEIA: Placares ao Vivo (Google ou Alternativas)

#### Objetivo
Exibir no app do participante:
- Jogos do dia com **placares em andamento**
- Jogos **encerrados** com resultado final
- Atualizacao em tempo real (ou quase)

#### Opcao 1: Scraping do Google (NAO RECOMENDADO)

**Vantagens:**
- Google agrega dados de todas as ligas
- Interface rica com placares ao vivo

**Desvantagens:**
- **Viola ToS do Google** - Risco de bloqueio
- Requer rotacao de proxies e User-Agents
- HTML muda frequentemente (manutencao alta)
- Rate limiting agressivo
- Pode resultar em ban do IP do servidor

**Veredicto:** Evitar para producao. Risco legal e tecnico.

#### Opcao 2: APIs Oficiais de Futebol (RECOMENDADO)

| API | Plano Gratuito | Cobertura | Tempo Real |
|-----|----------------|-----------|------------|
| **football-data.org** | 10 req/min | Brasileirao, Champions, etc | Sim (delay 1min) |
| **API-Football** | 100 req/dia | 800+ ligas | Sim |
| **SportMonks** | Trial 14 dias | Completo | Sim |
| **Sofascore API** | Nao-oficial | Muito completo | Sim |

**Recomendacao:** `football-data.org` - Ja usado no projeto (`routes/jogos-hoje-routes.js`)

#### Opcao 3: Scraping de Fontes Alternativas (POSSIVEL)

| Fonte | Legalidade | Dificuldade | Dados |
|-------|------------|-------------|-------|
| **ge.globo.com** | OK (ja usado) | Media | Agenda + alguns placares |
| **FlashScore** | Cinza | Alta (JS pesado) | Tempo real |
| **ESPN Brasil** | Cinza | Media | Placares |
| **Sofascore** | Cinza | Alta | Muito completo |

**Nota:** "Cinza" = ToS nao proibe explicitamente, mas nao incentiva

#### Proposta de Implementacao

**Fase 1: Melhorar scraper Globo atual**
- Extrair placares quando disponiveis (jogos em andamento)
- Adicionar campo `status`: "agendado", "ao_vivo", "encerrado"
- CRON mais frequente durante jogos (a cada 5min)

**Fase 2: Integrar API oficial**
- Usar `football-data.org` para placares em tempo real
- Manter Globo como fallback/complemento
- Cache inteligente: atualiza so quando tem jogo

**Fase 3: UI no App do Participante**
- Card "Jogos de Hoje" na tela inicial
- Badge ao vivo com animacao
- Placar atualizado automaticamente

#### Estrutura de Dados Proposta (v2)

```json
{
  "jogos": [
    {
      "id": "bra-2026-01-15-fla-pal",
      "campeonato": "Brasileirão Série A",
      "rodada": 1,
      "dataHora": "2026-01-15T19:00:00-03:00",
      "mandante": {
        "nome": "Flamengo",
        "escudo": "/escudos/262.png",
        "gols": 2
      },
      "visitante": {
        "nome": "Palmeiras",
        "escudo": "/escudos/275.png",
        "gols": 1
      },
      "status": "ao_vivo",
      "minuto": "67'",
      "local": "Maracanã",
      "fonte": "football-data.org"
    }
  ],
  "atualizadoEm": "2026-01-15T19:45:00Z"
}
```

#### DECISAO: Usar API-Football (api-sports.io)

**Motivo:** Unica opcao com dados REAIS no plano gratuito que cobre estaduais.

| Caracteristica | API-Football | football-data.org |
|----------------|--------------|-------------------|
| Plano Free | 100 req/dia | 10 req/min |
| Dados | REAIS | REAIS |
| Carioca/Paulista | SIM | NAO |
| Brasileirao | SIM | SIM |
| Atualizacao | 15 segundos | ~1 minuto |

**Conta:** Criar em https://dashboard.api-football.com (gratis, sem cartao)

#### Proximos Passos

1. [x] Criar conta free na API-Football (dashboard.api-football.com) ✅ 2026-01-15
2. [x] Obter API key e adicionar em `.env` como `API_FOOTBALL_KEY` ✅ 2026-01-15
3. [x] Testar endpoints para Carioca/Paulista 2026 ✅ 2026-01-15
4. [x] Criar `/api/jogos-ao-vivo` usando API-Football ✅ 2026-01-15
5. [x] Manter scraper Globo como fallback (agenda) ✅ 2026-01-15
6. [x] UI: Card de jogos na tela inicial do participante ✅ 2026-01-15
7. [x] Cache inteligente: so consulta API quando tem jogo (economiza requests) ✅ 2026-01-15

#### ✅ FEATURE IMPLEMENTADA (2026-01-15)

**Arquivos criados/modificados:**

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `routes/jogos-ao-vivo-routes.js` | CRIADO | Rota API-Football + fallback Globo |
| `public/participante/js/modules/participante-jogos.js` | v2.0 | Modulo frontend atualizado |
| `public/participante/js/modules/participante-boas-vindas.js` | v10.9 | Integracao jogos ao vivo |
| `index.js` | MODIFICADO | Registro da nova rota |

**Endpoints:**
- `GET /api/jogos-ao-vivo` - Retorna jogos ao vivo (Brasil) ou agenda do Globo
- `GET /api/jogos-ao-vivo/status` - Status da conexao com API-Football

**Comportamento:**
1. Busca jogos ao vivo na API-Football (filtro: ligas brasileiras)
2. Se ha jogos ao vivo: exibe com placares em tempo real + escudos
3. Se nao ha jogos ao vivo: fallback para agenda do Globo Esporte
4. Cache de 5 minutos para economizar requests (limite: 100/dia)

**Ligas suportadas:**
- Brasileirao Serie A (71)
- Brasileirao Serie B (72)
- Copa do Brasil (73)
- Campeonato Carioca (475)
- Campeonato Paulista (76)
- Copa Verde (629)
- Copa do Nordeste (630)

**Conta API-Football:**
- Titular: Miranda
- Plano: Free (100 req/dia)
- Validade: 2027

---

---

## FEATURE: LIGA VAZIA + CADASTRO PARTICIPANTES (2026-01-15)

### Contexto
Usuario solicitou:
1. Criar liga sem participantes (em branco)
2. Nova ferramenta para cadastro de participantes independente de liga
3. Participante pode ser vinculado a multiplas ligas

### Decisoes do Usuario
- **Participante sem liga**: Pool global + temporada (ambos)
- **Vinculacao**: Ambas opcoes (no cadastro OU depois)
- **Localizacao**: Hub de Ferramentas

### Plano Completo
Ver: `/home/runner/.claude/plans/streamed-hugging-wren.md`

### Tarefas Concluidas (2026-01-15)

#### PARTE 1: Liga Vazia
- [x] Modificar `public/preencher-liga.html` - remover validacao linha 883-886
- [x] Modificar `public/js/criar-liga.js` - remover validacao linhas 269-271
- [x] Testar criacao de liga sem times

#### PARTE 2: Cadastro de Participantes (Nova Ferramenta)

**Arquivos Criados:**
- [x] `public/cadastro-participantes.html` - Pagina principal
- [x] `public/js/cadastro/cadastro-participantes.js` - Logica

**Arquivos Modificados:**
- [x] `public/ferramentas.html` - Adicionar card da ferramenta
- [x] `public/layout.html` - Mapear pagina no accordion/titles

**Funcionalidades Implementadas:**
1. Buscar participante por nome/ID (API Cartola)
2. Cadastrar com seletor de temporada
3. Vincular a multiplas ligas (checkbox)
4. Lista de participantes cadastrados
5. Filtros: Sem Liga / Todos / Por Liga
6. Modal "Vincular a Liga" para acao posterior

### Commits Relacionados
- `7fd9a81` - feat(fluxo-financeiro): implementar modal de novo participante independente
- `2e6174b` - feat: liga vazia + cadastro participantes independente

---

## Historico Arquivado

> Conteudo anterior movido para manter arquivo limpo.
> Ver commits anteriores para historico completo.
