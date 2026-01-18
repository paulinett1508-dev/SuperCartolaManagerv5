# SPEC - Melhorias Badges Jogos API-Football v5.0

**Data:** 2026-01-18
**Baseado em:** PRD-badges-jogos-melhorias-v5.md
**Status:** Especificacao Tecnica
**Continuacao de:** SPEC-badges-jogos-api-football-v3.md (v4.0 implementada)

---

## Resumo da Implementacao

Implementar duas melhorias no sistema de jogos ao vivo (ja em v4.1):
1. **Correcao de nomes de campeonatos**: Expandir mapeamento `LIGAS_PRINCIPAIS` com IDs de competicoes nacionais e melhorar `formatarNomeLiga()` para tratar padroes como "Paulista - A1" → "Paulistao"
2. **Modal enriquecido com tabs**: Adicionar abas de Estatisticas (posse, chutes) e Escalacoes (formacao, titulares) ao modal de detalhes existente

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. routes/jogos-ao-vivo-routes.js - Mudancas Backend

**Path:** `/home/runner/workspace/routes/jogos-ao-vivo-routes.js`
**Tipo:** Modificacao
**Impacto:** Medio
**Dependentes:** participante-jogos.js (consome dados)
**Versao Atual:** v3.1

#### Mudanca 1: Expandir LIGAS_PRINCIPAIS

**Linhas 14-21: SUBSTITUIR bloco inteiro**

```javascript
// ANTES (linhas 14-21):
// IDs de ligas principais (mapeamento fixo)
// Para estaduais, usamos formatarNomeLiga() que limpa o nome original da API
const LIGAS_PRINCIPAIS = {
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  618: 'Copinha'
};

// DEPOIS:
// IDs de ligas principais (mapeamento fixo por ID da API-Football)
// IDs confirmados via dashboard api-sports.io para Brasil
const LIGAS_PRINCIPAIS = {
  // Nacionais
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  75: 'Série C',
  76: 'Série D',
  618: 'Copinha',

  // Supercopa
  77: 'Supercopa',

  // Regionais
  475: 'Copa do Nordeste'

  // Nota: Estaduais (Paulistao, Carioca, etc) sao tratados via formatarNomeLiga()
  // porque IDs podem variar entre temporadas
};
```

**Motivo:** Expandir cobertura para Series C/D e Supercopa. Estaduais sao tratados por nome na funcao `formatarNomeLiga()`.

---

#### Mudanca 2: Melhorar formatarNomeLiga()

**Linhas 23-50: SUBSTITUIR funcao inteira**

```javascript
// ANTES (linhas 23-50):
/**
 * Formata nome da liga da API para exibição
 * Ex: "Paulista - A1" → "Paulista A1"
 * Ex: "Mineiro - 1" → "Mineiro"
 * Ex: "São Paulo Youth Cup" → "Copinha"
 */
function formatarNomeLiga(nome) {
  if (!nome) return 'Liga Brasileira';

  // Mapeamentos especiais de nome
  const mapeamentos = {
    'São Paulo Youth Cup': 'Copinha',
    'Brazil Serie A': 'Brasileirão A',
    'Brazil Serie B': 'Brasileirão B',
    'Brazil Cup': 'Copa do Brasil'
  };

  if (mapeamentos[nome]) return mapeamentos[nome];

  // Limpar sufixos comuns
  return nome
    .replace(/ - 1$/, '')       // "Mineiro - 1" → "Mineiro"
    .replace(/ - 2$/, ' B')     // "Mineiro - 2" → "Mineiro B"
    .replace(/ - A1$/, ' A1')   // "Paulista - A1" → "Paulista A1"
    .replace(/ - A2$/, ' A2')
    .replace(/ - B$/, ' B')
    .replace(/^Brazil /, '');   // "Brazil X" → "X"
}

// DEPOIS:
/**
 * Formata nome da liga da API para exibicao amigavel
 * Trata padroes da API-Football como "Paulista - A1", "Carioca - 1"
 *
 * @param {string} nome - Nome original da API
 * @returns {string} Nome formatado para exibicao
 */
function formatarNomeLiga(nome) {
  if (!nome) return 'Liga Brasileira';

  // Mapeamentos especiais de nome (prioridade maxima)
  const mapeamentos = {
    // Copas e nomes em ingles
    'São Paulo Youth Cup': 'Copinha',
    'Copa Sao Paulo de Futebol Junior': 'Copinha',
    'Brazil Serie A': 'Brasileirão A',
    'Brazil Serie B': 'Brasileirão B',
    'Brazil Serie C': 'Série C',
    'Brazil Serie D': 'Série D',
    'Brazil Cup': 'Copa do Brasil',
    'Copa do Nordeste': 'Copa do Nordeste',
    'Supercopa do Brasil': 'Supercopa'
  };

  // Verificar mapeamento exato primeiro
  if (mapeamentos[nome]) return mapeamentos[nome];

  // Transformacoes em cadeia para padroes da API
  let resultado = nome
    // Remover prefixos
    .replace(/^Brazil(ian)?\s+/i, '')
    .replace(/^Campeonato\s+/i, '')

    // Tratar divisoes - remover sufixos de primeira divisao
    .replace(/\s+-\s+1$/, '')           // "Mineiro - 1" → "Mineiro"
    .replace(/\s+-\s+A1$/i, '')         // "Paulista - A1" → "Paulista"
    .replace(/\s+-\s+2$/, ' B')         // "Mineiro - 2" → "Mineiro B"
    .replace(/\s+-\s+A2$/i, ' A2')      // "Paulista - A2" → "Paulista A2"
    .replace(/\s+-\s+B$/i, ' B')

    .trim();

  // Aplicar nomes populares apos limpeza
  const nomesPopulares = {
    'Paulista': 'Paulistão',
    'Carioca': 'Cariocão',
    'Gaucho': 'Gauchão',
    'Gaúcho': 'Gauchão',
    'Mineiro': 'Mineirão',
    'Baiano': 'Baianão',
    'Pernambucano': 'Pernambucano',
    'Cearense': 'Cearense',
    'Paranaense': 'Paranaense',
    'Catarinense': 'Catarinense',
    'Goiano': 'Goianão',
    'Sergipano': 'Sergipano',
    'Paraibano': 'Paraibano',
    'Potiguar': 'Potiguar',
    'Alagoano': 'Alagoano',
    'Maranhense': 'Maranhense',
    'Piauiense': 'Piauiense',
    'Amazonense': 'Amazonense',
    'Paraense': 'Paraense',
    'Capixaba': 'Capixaba',
    'Brasiliense': 'Brasiliense'
  };

  return nomesPopulares[resultado] || resultado || 'Liga Brasileira';
}
```

**Motivo:** Cobertura completa de estaduais brasileiros com nomes populares. A API-Football retorna "Paulista - A1", agora sera exibido como "Paulistão".

---

#### Mudanca 3: Adicionar funcao extrairResumoStats()

**Linha 268: ADICIONAR apos a funcao mapearTipoEvento()**

```javascript
// ADICIONAR apos linha 268 (depois da funcao mapearTipoEvento):

/**
 * Extrai resumo das estatisticas principais para exibicao no modal
 * @param {Array} statistics - Array de estatisticas da API
 * @returns {Object|null} Objeto com stats organizadas por time ou null
 */
function extrairResumoStats(statistics) {
  if (!statistics || statistics.length < 2) return null;

  const homeStats = statistics[0]?.statistics || [];
  const awayStats = statistics[1]?.statistics || [];

  /**
   * Busca valor de uma estatistica especifica
   */
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
      impedimentos: getStat(homeStats, 'Offsides'),
      defesas: getStat(homeStats, 'Goalkeeper Saves')
    },
    visitante: {
      posse: getStat(awayStats, 'Ball Possession'),
      chutesTotal: getStat(awayStats, 'Total Shots'),
      chutesGol: getStat(awayStats, 'Shots on Goal'),
      escanteios: getStat(awayStats, 'Corner Kicks'),
      faltas: getStat(awayStats, 'Fouls'),
      impedimentos: getStat(awayStats, 'Offsides'),
      defesas: getStat(awayStats, 'Goalkeeper Saves')
    }
  };
}
```

**Motivo:** Facilitar consumo de estatisticas no frontend. O modal precisa de dados estruturados para renderizar barras comparativas.

---

#### Mudanca 4: Expandir retorno de buscarEventosJogo()

**Linhas 240-250: MODIFICAR return**

```javascript
// ANTES (linhas 240-250):
    return {
      eventos,
      escalacoes,
      estatisticas,
      fixture: {
        id: fixture.fixture.id,
        arbitro: fixture.fixture.referee,
        estadio: fixture.fixture.venue?.name,
        cidade: fixture.fixture.venue?.city
      }
    };

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

**Motivo:** Adicionar `resumoStats` (estatisticas processadas) e `liga` (informacoes da competicao) para enriquecer o modal.

---

#### Mudanca 5: Atualizar comentario de versao

**Linhas 1-6: MODIFICAR**

```javascript
// ANTES:
// routes/jogos-ao-vivo-routes.js
// v3.1 - Jogos do Dia Completo + Eventos (API-Football)
// ✅ v3.1: Correção do mapeamento de ligas brasileiras (IDs corretos)

// DEPOIS:
// routes/jogos-ao-vivo-routes.js
// v3.2 - Jogos do Dia Completo + Eventos + Stats (API-Football)
// ✅ v3.2: Nomes populares de estaduais (Paulistão, Cariocão, etc)
//          + resumoStats para modal com tabs
// ✅ v3.1: Correção do mapeamento de ligas brasileiras (IDs corretos)
```

---

### 2. public/participante/js/modules/participante-jogos.js - Mudancas Frontend

**Path:** `/home/runner/workspace/public/participante/js/modules/participante-jogos.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** participante-boas-vindas.js (importa modulo)
**Versao Atual:** v4.1

#### Mudanca 1: Atualizar versao do modulo

**Linhas 1-9: MODIFICAR comentario de versao**

```javascript
// ANTES (linhas 1-9):
// PARTICIPANTE-JOGOS.JS - v4.1 (JOGOS AO VIVO + EVENTOS)
// ✅ v4.1: Russo One (font-brand) nos titulos e placar
// ✅ v4.0: Eventos em tempo real (gols, cartoes), auto-refresh, modal de detalhes
// ...

// DEPOIS:
// PARTICIPANTE-JOGOS.JS - v5.0 (MODAL COM TABS + STATS)
// ✅ v5.0: Modal com tabs (Eventos | Estatisticas | Escalacoes)
//          - Barras comparativas de posse, chutes, escanteios
//          - Lista de titulares com formacao tatica
//          - Nomes de campeonatos melhorados (backend v3.2)
// ✅ v4.1: Russo One (font-brand) nos titulos e placar
// ✅ v4.0: Eventos em tempo real (gols, cartoes), auto-refresh, modal de detalhes
// ...
```

---

#### Mudanca 2: Reescrever renderizarModalJogo() com sistema de tabs

**Linhas 372-448: SUBSTITUIR funcao inteira**

```javascript
// ANTES (linhas 372-448):
/**
 * Renderiza modal de detalhes do jogo
 */
export function renderizarModalJogo(jogo, detalhes) {
    const { eventos, escalacoes, estatisticas } = detalhes;

    // Separar eventos por tipo
    const gols = eventos.filter(e => e.tipo.startsWith('gol'));
    const cartoes = eventos.filter(e => e.tipo.startsWith('cartao'));

    return `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
    // ... resto do modal antigo
    `;
}

// DEPOIS:
/**
 * Renderiza modal de detalhes do jogo com sistema de tabs
 * Tabs: Eventos | Estatisticas | Escalacoes
 * @param {Object} jogo - Dados do jogo
 * @param {Object} detalhes - Detalhes retornados pelo backend (eventos, escalacoes, resumoStats)
 */
export function renderizarModalJogo(jogo, detalhes) {
    const { eventos, escalacoes, resumoStats, fixture } = detalhes;

    // Separar eventos por tipo
    const gols = eventos.filter(e => e.tipo.startsWith('gol'));
    const cartoes = eventos.filter(e => e.tipo.startsWith('cartao'));

    // Verificar dados disponiveis para tabs
    const temEstatisticas = resumoStats && resumoStats.mandante?.posse;
    const temEscalacoes = escalacoes && escalacoes.length === 2 && escalacoes[0]?.titulares?.length > 0;

    // IDs unicos para tabs
    const tabPrefix = `modal-jogo-${jogo.id}`;

    return `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
         onclick="window.fecharModalJogo && window.fecharModalJogo()">
        <div class="w-full max-w-lg bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col"
             onclick="event.stopPropagation()">

            <!-- Header Fixo -->
            <div class="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 z-10">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-brand text-white tracking-wide">${jogo.liga}</span>
                    <button onclick="window.fecharModalJogo()"
                            class="p-1 rounded-full hover:bg-gray-700 transition-colors">
                        <span class="material-icons text-white/60">close</span>
                    </button>
                </div>
            </div>

            <!-- Placar Grande -->
            <div class="p-4 text-center bg-gradient-to-b from-gray-800/50 to-transparent">
                <div class="flex items-center justify-center gap-4">
                    <div class="flex flex-col items-center gap-1 flex-1">
                        <img src="${jogo.logoMandante}" class="w-14 h-14 object-contain" alt="" onerror="this.style.display='none'">
                        <span class="text-xs font-medium text-white truncate max-w-[100px]">${jogo.mandante}</span>
                    </div>
                    <div class="text-4xl font-brand text-white tabular-nums px-4">
                        ${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}
                    </div>
                    <div class="flex flex-col items-center gap-1 flex-1">
                        <img src="${jogo.logoVisitante}" class="w-14 h-14 object-contain" alt="" onerror="this.style.display='none'">
                        <span class="text-xs font-medium text-white truncate max-w-[100px]">${jogo.visitante}</span>
                    </div>
                </div>
                ${jogo.placarHT ? `<p class="text-xs text-white/40 mt-1">Intervalo: ${jogo.placarHT}</p>` : ''}
            </div>

            <!-- Sistema de Tabs -->
            <div class="border-b border-gray-700">
                <div class="flex">
                    <button id="${tabPrefix}-tab-eventos"
                            class="flex-1 py-3 text-sm font-medium text-white border-b-2 border-primary transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'eventos')">
                        <span class="material-icons text-base align-middle mr-1">sports_soccer</span>
                        Eventos
                    </button>
                    ${temEstatisticas ? `
                    <button id="${tabPrefix}-tab-stats"
                            class="flex-1 py-3 text-sm font-medium text-white/50 border-b-2 border-transparent hover:text-white/80 transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'stats')">
                        <span class="material-icons text-base align-middle mr-1">bar_chart</span>
                        Estatísticas
                    </button>
                    ` : ''}
                    ${temEscalacoes ? `
                    <button id="${tabPrefix}-tab-escalacoes"
                            class="flex-1 py-3 text-sm font-medium text-white/50 border-b-2 border-transparent hover:text-white/80 transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'escalacoes')">
                        <span class="material-icons text-base align-middle mr-1">groups</span>
                        Escalações
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Conteudo das Tabs (scrollable) -->
            <div class="flex-1 overflow-y-auto">
                <!-- Tab Eventos -->
                <div id="${tabPrefix}-content-eventos" class="p-4">
                    ${gols.length > 0 ? `
                        <h4 class="text-xs font-brand text-white/50 uppercase tracking-wide mb-2">Gols</h4>
                        <div class="space-y-2 mb-4">
                            ${gols.map(e => renderizarEvento(e, jogo)).join('')}
                        </div>
                    ` : ''}

                    ${cartoes.length > 0 ? `
                        <h4 class="text-xs font-brand text-white/50 uppercase tracking-wide mb-2">Cartões</h4>
                        <div class="space-y-2 mb-4">
                            ${cartoes.map(e => renderizarEvento(e, jogo)).join('')}
                        </div>
                    ` : ''}

                    ${eventos.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-12 text-white/40">
                            <span class="material-icons text-4xl mb-2">sports</span>
                            <p class="text-sm">Nenhum evento registrado</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Tab Estatisticas -->
                ${temEstatisticas ? `
                <div id="${tabPrefix}-content-stats" class="p-4 hidden">
                    ${renderizarEstatisticas(resumoStats, jogo)}
                </div>
                ` : ''}

                <!-- Tab Escalacoes -->
                ${temEscalacoes ? `
                <div id="${tabPrefix}-content-escalacoes" class="p-4 hidden">
                    ${renderizarEscalacoes(escalacoes, jogo)}
                </div>
                ` : ''}
            </div>

            <!-- Footer com Estadio/Arbitro -->
            ${fixture?.estadio || fixture?.arbitro ? `
                <div class="border-t border-gray-700 p-3 bg-gray-800/50">
                    <div class="flex items-center justify-center gap-4 text-xs text-white/40">
                        ${fixture.estadio ? `
                            <span class="flex items-center gap-1">
                                <span class="material-icons text-sm">stadium</span>
                                ${fixture.estadio}${fixture.cidade ? `, ${fixture.cidade}` : ''}
                            </span>
                        ` : ''}
                        ${fixture.arbitro ? `
                            <span class="flex items-center gap-1">
                                <span class="material-icons text-sm">sports</span>
                                ${fixture.arbitro}
                            </span>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}
```

---

#### Mudanca 3: Adicionar funcao renderizarEstatisticas()

**Linha 467: ADICIONAR apos renderizarEvento()**

```javascript
// ADICIONAR apos linha 467 (depois da funcao renderizarEvento):

/**
 * Renderiza tab de estatisticas com barras comparativas
 * @param {Object} resumoStats - Stats do mandante e visitante
 * @param {Object} jogo - Dados do jogo para nomes dos times
 */
function renderizarEstatisticas(resumoStats, jogo) {
    if (!resumoStats) return '<p class="text-center text-white/40 py-8">Estatísticas não disponíveis</p>';

    const { mandante, visitante } = resumoStats;

    /**
     * Renderiza barra comparativa
     */
    const renderBarra = (label, valorM, valorV, icon) => {
        // Extrair valor numerico (ex: "65%" -> 65)
        const numM = parseFloat(String(valorM).replace('%', '')) || 0;
        const numV = parseFloat(String(valorV).replace('%', '')) || 0;
        const total = numM + numV || 1;
        const percM = (numM / total) * 100;
        const percV = (numV / total) * 100;

        return `
        <div class="mb-4">
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-white">${valorM ?? '-'}</span>
                <span class="text-xs text-white/50 flex items-center gap-1">
                    <span class="material-icons text-sm text-primary">${icon}</span>
                    ${label}
                </span>
                <span class="text-sm font-medium text-white">${valorV ?? '-'}</span>
            </div>
            <div class="flex h-2 rounded-full overflow-hidden bg-gray-700">
                <div class="bg-primary transition-all" style="width: ${percM}%"></div>
                <div class="bg-gray-500 transition-all" style="width: ${percV}%"></div>
            </div>
        </div>
        `;
    };

    return `
        <div class="space-y-1">
            <!-- Header com escudos -->
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
                <div class="flex items-center gap-2">
                    <img src="${jogo.logoMandante}" class="w-6 h-6 object-contain" alt="">
                    <span class="text-xs text-white/70 truncate max-w-[80px]">${jogo.mandante}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-white/70 truncate max-w-[80px]">${jogo.visitante}</span>
                    <img src="${jogo.logoVisitante}" class="w-6 h-6 object-contain" alt="">
                </div>
            </div>

            ${renderBarra('Posse de Bola', mandante.posse, visitante.posse, 'sports_soccer')}
            ${renderBarra('Chutes Totais', mandante.chutesTotal, visitante.chutesTotal, 'gps_fixed')}
            ${renderBarra('Chutes no Gol', mandante.chutesGol, visitante.chutesGol, 'adjust')}
            ${renderBarra('Escanteios', mandante.escanteios, visitante.escanteios, 'flag')}
            ${renderBarra('Faltas', mandante.faltas, visitante.faltas, 'front_hand')}
            ${mandante.defesas !== null ? renderBarra('Defesas', mandante.defesas, visitante.defesas, 'sports_handball') : ''}
            ${mandante.impedimentos !== null ? renderBarra('Impedimentos', mandante.impedimentos, visitante.impedimentos, 'block') : ''}
        </div>
    `;
}
```

---

#### Mudanca 4: Adicionar funcao renderizarEscalacoes()

**Apos renderizarEstatisticas(): ADICIONAR**

```javascript
// ADICIONAR apos renderizarEstatisticas():

/**
 * Renderiza tab de escalacoes com titulares e formacao
 * @param {Array} escalacoes - Array com 2 objetos (mandante e visitante)
 * @param {Object} jogo - Dados do jogo
 */
function renderizarEscalacoes(escalacoes, jogo) {
    if (!escalacoes || escalacoes.length < 2) {
        return '<p class="text-center text-white/40 py-8">Escalações não disponíveis</p>';
    }

    const [mandante, visitante] = escalacoes;

    /**
     * Renderiza lista de jogadores
     */
    const renderTimeJogadores = (time, logo, nomeTime) => {
        return `
        <div class="flex-1 min-w-0">
            <!-- Header do time -->
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                <img src="${logo}" class="w-6 h-6 object-contain" alt="" onerror="this.style.display='none'">
                <div class="flex-1 min-w-0">
                    <span class="text-xs font-medium text-white truncate block">${nomeTime}</span>
                    ${time.formacao ? `<span class="text-[10px] text-primary">${time.formacao}</span>` : ''}
                </div>
            </div>

            <!-- Tecnico -->
            ${time.tecnico ? `
                <div class="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-gray-800/50">
                    <span class="material-icons text-xs text-white/30">person</span>
                    <span class="text-[10px] text-white/50">${time.tecnico}</span>
                </div>
            ` : ''}

            <!-- Titulares -->
            <div class="space-y-1">
                ${(time.titulares || []).slice(0, 11).map((jogador, idx) => `
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded ${idx % 2 === 0 ? 'bg-gray-800/30' : ''}">
                        <span class="text-[10px] text-white/30 w-5 text-center">${jogador.numero || '-'}</span>
                        <span class="text-xs text-white truncate flex-1">${jogador.nome}</span>
                        <span class="text-[9px] text-white/30 uppercase">${jogador.posicao || ''}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    };

    return `
    <div class="flex gap-4">
        ${renderTimeJogadores(mandante, jogo.logoMandante, jogo.mandante)}
        ${renderTimeJogadores(visitante, jogo.logoVisitante, jogo.visitante)}
    </div>
    `;
}
```

---

#### Mudanca 5: Adicionar funcao global trocarTabModal()

**Apos renderizarEscalacoes() e ANTES de window.expandirJogo (linha 469): ADICIONAR**

```javascript
// ADICIONAR apos renderizarEscalacoes() e antes de window.expandirJogo:

/**
 * Funcao global para trocar tabs do modal
 * @param {string} prefix - Prefixo do modal (ex: "modal-jogo-123456")
 * @param {string} tab - Nome da tab (eventos, stats, escalacoes)
 */
window.trocarTabModal = function(prefix, tab) {
    const tabs = ['eventos', 'stats', 'escalacoes'];

    tabs.forEach(t => {
        const tabBtn = document.getElementById(`${prefix}-tab-${t}`);
        const content = document.getElementById(`${prefix}-content-${t}`);

        if (tabBtn && content) {
            if (t === tab) {
                // Ativar tab
                tabBtn.classList.add('text-white', 'border-primary');
                tabBtn.classList.remove('text-white/50', 'border-transparent');
                content.classList.remove('hidden');
            } else {
                // Desativar tab
                tabBtn.classList.remove('text-white', 'border-primary');
                tabBtn.classList.add('text-white/50', 'border-transparent');
                content.classList.add('hidden');
            }
        }
    });
};
```

---

#### Mudanca 6: Atualizar versao no log final

**Linha 517: MODIFICAR**

```javascript
// ANTES (linha 517):
if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v4.0 carregado (eventos + auto-refresh)');

// DEPOIS:
if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v5.0 carregado (modal com tabs + stats)');
```

---

## Mapa de Dependencias

```
routes/jogos-ao-vivo-routes.js (MODIFICAR)
    |
    └──> participante-jogos.js [consome /api/jogos-ao-vivo e /:id/eventos]
              |
              └──> participante-boas-vindas.js [importa modulo - NAO PRECISA ALTERAR]
                        |
                        └──> carregarEExibirJogos() [chama renderizarJogosAoVivo()]
```

**Nenhuma mudanca necessaria em:**
- `participante-boas-vindas.js` (apenas importa e usa funcoes publicas)
- Nenhuma rota nova necessaria (usa /:id/eventos existente)
- Nenhum CSS adicional necessario (usa Tailwind existente)

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] **NAO APLICAVEL** - Feature global para todos os participantes
- [x] Nenhuma query com `liga_id` afetada
- [x] Dados da API-Football sao publicos (jogos do Brasil)

### Autenticacao
- [x] Rotas ja existentes, sem mudanca de protecao
- [x] `/api/jogos-ao-vivo` e `/:id/eventos` nao requerem auth (dados publicos)

---

## Casos de Teste

### Teste 1: Nome do Paulistao
**Setup:** Jogo do Campeonato Paulista ao vivo
**Acao:**
1. Acessar tela inicial do participante
2. Verificar card de jogos do dia
**Resultado Esperado:** Liga deve exibir "Paulistão" (nao "Paulista - A1")

### Teste 2: Modal com 3 tabs
**Setup:** Jogo ao vivo do Brasileirao com stats disponiveis
**Acao:**
1. Clicar em card de jogo ao vivo
2. Verificar modal aberto
**Resultado Esperado:**
- Modal abre com 3 tabs: Eventos | Estatisticas | Escalacoes
- Tab Eventos ativa por padrao

### Teste 3: Tab Estatisticas
**Setup:** Mesmo jogo do Teste 2
**Acao:**
1. Clicar na tab "Estatísticas"
**Resultado Esperado:**
- Barras comparativas de posse de bola, chutes, escanteios
- Valores corretos para cada time

### Teste 4: Tab Escalacoes
**Setup:** Mesmo jogo do Teste 2
**Acao:**
1. Clicar na tab "Escalações"
**Resultado Esperado:**
- Lista de 11 titulares para cada time
- Numero da camisa e posicao
- Formacao tatica (ex: "4-3-3")
- Nome do tecnico

### Teste 5: Jogo sem stats
**Setup:** Jogo de divisao menor (ex: Serie D) sem estatisticas
**Acao:**
1. Clicar no card do jogo
**Resultado Esperado:**
- Modal abre com apenas tab "Eventos"
- Tabs "Estatisticas" e "Escalacoes" NAO aparecem

### Teste 6: Jogo do Carioca
**Setup:** Jogo do Campeonato Carioca
**Acao:**
1. Verificar nome da liga no card
**Resultado Esperado:** Exibir "Cariocão" (nao "Carioca - 1")

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Deploy automatico via push
3. Cache do frontend invalidado automaticamente (versao muda)

**Arquivos Afetados:**
- `routes/jogos-ao-vivo-routes.js`
- `public/participante/js/modules/participante-jogos.js`

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos originais lidos completos
- [x] Dependencias mapeadas (participante-boas-vindas.js)
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Funcoes novas identificadas (extrairResumoStats, renderizarEstatisticas, renderizarEscalacoes, trocarTabModal)
- [x] Impactos mapeados (nenhuma quebra de API)
- [x] Testes planejados (6 cenarios)
- [x] Rollback documentado

### Pos-Implementacao
- [ ] Testar com jogo ao vivo do Brasileirao
- [ ] Testar com estadual (Paulistao/Carioca)
- [ ] Verificar mobile (tabs devem funcionar em telas pequenas)
- [ ] Verificar auto-refresh continua funcionando

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - `routes/jogos-ao-vivo-routes.js` - expandir LIGAS_PRINCIPAIS
   - `routes/jogos-ao-vivo-routes.js` - melhorar formatarNomeLiga()
   - `routes/jogos-ao-vivo-routes.js` - adicionar extrairResumoStats()
   - `routes/jogos-ao-vivo-routes.js` - expandir retorno de buscarEventosJogo()

2. **Frontend depois:**
   - `participante-jogos.js` - atualizar versao do modulo
   - `participante-jogos.js` - reescrever renderizarModalJogo()
   - `participante-jogos.js` - adicionar renderizarEstatisticas()
   - `participante-jogos.js` - adicionar renderizarEscalacoes()
   - `participante-jogos.js` - adicionar trocarTabModal()
   - `participante-jogos.js` - atualizar versao no log

3. **Testes:**
   - Teste manual em ambiente de desenvolvimento
   - Verificar jogos ao vivo (se houver)
   - Verificar fallback para jogos sem stats

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-badges-jogos-melhorias-v5.md
```

---

**Gerado por:** Spec Protocol v1.0
**Versao SPEC:** 5.0 (mudancas cirurgicas completas)
