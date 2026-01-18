# PRD - Melhorias Badges Jogos API-Football v5.0

**Data:** 2026-01-18
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

Aprimorar o sistema de badges/cards de jogos ao vivo (ja implementado em v4.0) com:

1. **Correcao de nomes de campeonatos**: Expandir mapeamento `LIGAS_PRINCIPAIS` e melhorar funcao `formatarNomeLiga()` para exibir nomes corretos como "Paulistao" em vez de "Paulista - A1"

2. **Modal enriquecido com tabs**: Adicionar abas de Estatisticas (posse, chutes, escanteios) e Escalacoes (formacao, titulares) ao modal de detalhes

---

## Contexto e Analise

### Modulos Identificados

**Backend:**
- `routes/jogos-ao-vivo-routes.js` v3.1 - Rotas principais, mapeamento de ligas
  - Linha 16-21: `LIGAS_PRINCIPAIS` com apenas 4 IDs
  - Linha 29-50: `formatarNomeLiga()` com transformacoes basicas
  - Linha 187-255: `buscarEventosJogo()` ja retorna escalacoes/estatisticas

**Frontend:**
- `public/participante/js/modules/participante-jogos.js` v4.0
  - Linha 374-447: `renderizarModalJogo()` basico (so gols/cartoes)
  - Linha 452-466: `renderizarEvento()` individual

### Dependencias Mapeadas

- `participante-boas-vindas.js` importa `participante-jogos.js`
- Ambos ja funcionam em v4.0 com modal basico
- Backend ja retorna `escalacoes` e `estatisticas` na rota `/eventos`

### Padroes Existentes

- Similar a: Modal de detalhes atual (linha 374-447)
- Pode reutilizar: Estrutura de tabs do admin (se existir)

---

## Solucao Proposta

### Abordagem Escolhida

1. **Backend (minimo)**: Expandir `LIGAS_PRINCIPAIS` e melhorar `formatarNomeLiga()`
2. **Backend (novo)**: Adicionar funcao `extrairResumoStats()` para facilitar consumo no frontend
3. **Frontend (refatorar)**: Reescrever `renderizarModalJogo()` com sistema de tabs

### Arquivos a Modificar

| Arquivo | Mudanca | Linhas Afetadas |
|---------|---------|-----------------|
| `routes/jogos-ao-vivo-routes.js` | Expandir mapeamento ligas + resumoStats | 16-50, 240-250 |
| `public/participante/js/modules/participante-jogos.js` | Novo modal com tabs | 374-520 (novo) |

### Regras de Negocio

1. **Mapeamento de ligas**: Priorizar ID > nome formatado > nome original
2. **Tabs**: Exibir "Estatisticas" apenas se houver dados de posse
3. **Tabs**: Exibir "Escalacoes" apenas se houver 2 lineups
4. **Fallback**: Se nenhum dado extra, manter comportamento atual

---

## Especificacao Tecnica

### 1. Expandir LIGAS_PRINCIPAIS (Backend)

**Arquivo:** `routes/jogos-ao-vivo-routes.js`
**Localizacao:** Linha 16-21

```javascript
// ANTES:
const LIGAS_PRINCIPAIS = {
  71: 'Brasileirao A',
  72: 'Brasileirao B',
  73: 'Copa do Brasil',
  618: 'Copinha'
};

// DEPOIS:
const LIGAS_PRINCIPAIS = {
  // Nacionais
  71: 'Brasileirao A',
  72: 'Brasileirao B',
  73: 'Copa do Brasil',
  75: 'Serie C',
  76: 'Serie D',
  618: 'Copinha',

  // Estaduais - Principais (IDs aproximados, validar via API)
  475: 'Paulistao',
  476: 'Carioca',
  477: 'Mineiro',
  478: 'Gaucho',
  480: 'Paranaense',
  481: 'Catarinense',

  // Estaduais - Nordeste
  479: 'Baiano',
  602: 'Pernambucano',
  604: 'Cearense',

  // Regionais
  611: 'Copa do Nordeste'
};
```

**Nota:** IDs baseados em padroes da API-Football. Executar validacao real antes de implementar.

### 2. Melhorar formatarNomeLiga (Backend)

**Arquivo:** `routes/jogos-ao-vivo-routes.js`
**Localizacao:** Linha 29-50

```javascript
// DEPOIS:
function formatarNomeLiga(nome) {
  if (!nome) return 'Liga Brasileira';

  const mapeamentos = {
    'Sao Paulo Youth Cup': 'Copinha',
    'Copa Sao Paulo de Futebol Junior': 'Copinha',
    'Brazil Serie A': 'Brasileirao A',
    'Brazil Serie B': 'Brasileirao B',
    'Brazil Cup': 'Copa do Brasil',
    'Copa do Nordeste': 'Copa do Nordeste',
    'Supercopa do Brasil': 'Supercopa'
  };

  if (mapeamentos[nome]) return mapeamentos[nome];

  return nome
    .replace(/^Brazil(ian)?\s+/i, '')
    .replace(/\s+-\s+1$/, '')
    .replace(/\s+-\s+A1$/i, '')
    .replace(/\s+-\s+2$/, ' B')
    .replace(/\s+-\s+A2$/i, ' A2')
    .replace(/^Paulista$/i, 'Paulistao')
    .replace(/^Campeonato\s+/i, '')
    .trim() || 'Liga Brasileira';
}
```

### 3. Nova funcao extrairResumoStats (Backend)

**Arquivo:** `routes/jogos-ao-vivo-routes.js`
**Localizacao:** Apos linha 267 (depois de mapearTipoEvento)

```javascript
/**
 * Extrai resumo das estatisticas principais
 */
function extrairResumoStats(statistics) {
  if (!statistics || statistics.length < 2) return null;

  const homeStats = statistics[0]?.statistics || [];
  const awayStats = statistics[1]?.statistics || [];

  const getStat = (stats, type) => {
    const stat = stats.find(s => s.type === type);
    return stat?.value ?? null;
  };

  return {
    mandante: {
      posse: getStat(homeStats, 'Ball Possession'),
      chutesTotal: getStat(homeStats, 'Total Shots'),
      chutesGol: getStat(homeStats, 'Shots on Goal'),
      escanteios: getStat(homeStats, 'Corner Kicks'),
      faltas: getStat(homeStats, 'Fouls'),
      defesas: getStat(homeStats, 'Goalkeeper Saves')
    },
    visitante: {
      posse: getStat(awayStats, 'Ball Possession'),
      chutesTotal: getStat(awayStats, 'Total Shots'),
      chutesGol: getStat(awayStats, 'Shots on Goal'),
      escanteios: getStat(awayStats, 'Corner Kicks'),
      faltas: getStat(awayStats, 'Fouls'),
      defesas: getStat(awayStats, 'Goalkeeper Saves')
    }
  };
}
```

### 4. Expandir resposta de /eventos (Backend)

**Arquivo:** `routes/jogos-ao-vivo-routes.js`
**Localizacao:** Linha 240-250 (return da funcao buscarEventosJogo)

```javascript
// DEPOIS:
return {
  eventos,
  escalacoes,
  estatisticas,
  resumoStats: extrairResumoStats(fixture.statistics),
  fixture: {
    id: fixture.fixture.id,
    arbitro: fixture.fixture.referee,
    estadio: fixture.fixture.venue?.name,
    cidade: fixture.fixture.venue?.city
  },
  liga: {
    nome: getNomeLiga(fixture.league?.id, fixture.league?.name),
    logo: fixture.league?.logo,
    rodada: fixture.league?.round
  }
};
```

### 5. Novo Modal com Tabs (Frontend)

**Arquivo:** `public/participante/js/modules/participante-jogos.js`
**Localizacao:** Substituir funcao `renderizarModalJogo` (linha 374-447)

Ver SPEC anterior para codigo completo do modal com:
- Tabs: Eventos | Estatisticas | Escalacoes
- Barra comparativa de stats
- Lista de titulares por time
- Footer com estadio e arbitro

---

## Riscos e Consideracoes

### Impactos Previstos

- **Positivo:** Nomes de campeonatos corretos melhoram UX
- **Positivo:** Modal com tabs fornece informacao rica
- **Atencao:** IDs de ligas podem mudar entre temporadas
- **Risco:** Dados de escalacoes podem nao existir para jogos menores

### Multi-Tenant

- [x] Nao aplicavel - Feature global para todos os participantes

### Consumo de API

- Requisicao de `/eventos` ja existe, apenas retorna mais dados
- Sem aumento de consumo de API

---

## Testes Necessarios

### Cenarios de Teste

1. **Jogo do Brasileirao** (ID 71): Deve mostrar "Brasileirao A"
2. **Jogo do Paulistao** (nome original "Paulista - A1"): Deve mostrar "Paulistao"
3. **Clicar em jogo ao vivo**: Modal deve abrir com 3 tabs
4. **Tab Estatisticas**: Deve mostrar barras de posse/chutes
5. **Tab Escalacoes**: Deve listar 11 titulares de cada time
6. **Jogo sem stats**: Tab Estatisticas nao deve aparecer

---

## Proximos Passos

1. **Validar IDs de ligas** via dashboard API-Football ou requisicao real
2. Gerar SPEC cirurgica com mudancas linha por linha
3. Executar `/code` com a SPEC

---

## Acao Necessaria: Validar IDs

Antes de implementar, executar:

```bash
curl -X GET "https://v3.football.api-sports.io/leagues?country=Brazil&season=2025" \
  -H "x-apisports-key: ${API_FOOTBALL_KEY}" | jq '.response[] | {id: .league.id, name: .league.name}'
```

Ou acessar: https://dashboard.api-football.com > IDs > Leagues > Brazil

**IDs a confirmar:**
- Paulistao: 475?
- Carioca: 476?
- Mineiro: 477?
- Gaucho: 478?

---

**Gerado por:** Pesquisa Protocol v1.0
