# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

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

1. [ ] Criar conta free na API-Football (dashboard.api-football.com)
2. [ ] Obter API key e adicionar em `.env` como `API_FOOTBALL_KEY`
3. [ ] Testar endpoints para Carioca/Paulista 2026 (ja em andamento)
4. [ ] Criar `/api/jogos-ao-vivo` usando API-Football
5. [ ] Manter scraper Globo como fallback (agenda)
6. [ ] UI: Card de jogos na tela inicial do participante
7. [ ] Cache inteligente: so consulta API quando tem jogo (economiza requests)

---

## Historico Arquivado

> Conteudo anterior movido para manter arquivo limpo.
> Ver commits anteriores para historico completo.
