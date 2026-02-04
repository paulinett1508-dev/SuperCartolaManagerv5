# SPEC - Badges de Jogos API-Football v3

**Data:** 2026-01-18
**Baseado em:** Conversa sobre API-Football + live_experience_2026.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Evoluir o sistema atual de "Jogos do Dia" (que JA usa API-Football) para incluir:
1. **Eventos em tempo real** (gols, cartoes, substituicoes)
2. **Auto-refresh** quando ha jogos ao vivo (polling a cada 60s)
3. **Badge visual aprimorada** com tempo pulsante, eventos inline e placar halftime
4. **Tela de detalhe** ao tocar no jogo (expandir eventos)

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. routes/jogos-ao-vivo-routes.js - Backend Principal

**Path:** `routes/jogos-ao-vivo-routes.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** participante-jogos.js, participante-boas-vindas.js

#### Mudancas Cirurgicas:

**Linha 85-103: MODIFICAR mapeamento de jogos**
```javascript
// ANTES:
const jogos = jogosBrasil.map(jogo => ({
  id: jogo.fixture.id,
  mandante: jogo.teams.home.name,
  visitante: jogo.teams.away.name,
  logoMandante: jogo.teams.home.logo,
  logoVisitante: jogo.teams.away.logo,
  placar: `${jogo.goals.home ?? 0} x ${jogo.goals.away ?? 0}`,
  tempo: jogo.fixture.status.elapsed ? `${jogo.fixture.status.elapsed}'` : '',
  status: mapearStatus(jogo.fixture.status.short),
  statusRaw: jogo.fixture.status.short,
  liga: LIGAS_BRASIL[jogo.league.id] || jogo.league.name,
  ligaLogo: jogo.league.logo,
  horario: new Date(jogo.fixture.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }),
  timestamp: new Date(jogo.fixture.date).getTime()
}));

// DEPOIS:
const jogos = jogosBrasil.map(jogo => ({
  id: jogo.fixture.id,
  mandante: jogo.teams.home.name,
  visitante: jogo.teams.away.name,
  logoMandante: jogo.teams.home.logo,
  logoVisitante: jogo.teams.away.logo,
  // Placar separado para formatacao flexivel
  golsMandante: jogo.goals.home ?? 0,
  golsVisitante: jogo.goals.away ?? 0,
  placar: `${jogo.goals.home ?? 0} x ${jogo.goals.away ?? 0}`,
  // Placar do primeiro tempo
  placarHT: jogo.score?.halftime?.home !== null
    ? `(${jogo.score.halftime.home}-${jogo.score.halftime.away})`
    : null,
  tempo: jogo.fixture.status.elapsed ? `${jogo.fixture.status.elapsed}'` : '',
  tempoExtra: jogo.fixture.status.extra || null,
  status: mapearStatus(jogo.fixture.status.short),
  statusRaw: jogo.fixture.status.short,
  liga: LIGAS_BRASIL[jogo.league.id] || jogo.league.name,
  ligaLogo: jogo.league.logo,
  // Estadio
  estadio: jogo.fixture.venue?.name || null,
  cidade: jogo.fixture.venue?.city || null,
  // Horario
  horario: new Date(jogo.fixture.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }),
  timestamp: new Date(jogo.fixture.date).getTime()
}));
```
**Motivo:** Adicionar campos de placar halftime, estadio e tempo extra para UI mais rica

**Linha 123-127: ADICIONAR nova rota para eventos**
```javascript
// ADICIONAR APOS linha 127 (apos return { jogos, temAoVivo })

/**
 * Busca eventos de um jogo especifico (gols, cartoes, substituicoes)
 * Endpoint: GET /api/jogos-ao-vivo/:fixtureId/eventos
 */
async function buscarEventosJogo(fixtureId) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return { eventos: [] };

  try {
    const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });

    const data = await response.json();
    const fixture = data.response?.[0];
    if (!fixture) return { eventos: [] };

    // Mapear eventos
    const eventos = (fixture.events || []).map(e => ({
      tempo: e.time.elapsed,
      tempoExtra: e.time.extra || null,
      tipo: mapearTipoEvento(e.type, e.detail),
      tipoRaw: e.type,
      detalhe: e.detail,
      time: e.team.name,
      timeId: e.team.id,
      timeLogo: e.team.logo,
      jogador: e.player?.name || null,
      jogadorId: e.player?.id || null,
      assistencia: e.assist?.name || null
    }));

    // Extrair lineups se disponiveis
    const escalacoes = fixture.lineups?.map(l => ({
      timeId: l.team.id,
      time: l.team.name,
      formacao: l.formation,
      tecnico: l.coach?.name || null,
      titulares: l.startXI?.map(p => ({
        nome: p.player.name,
        numero: p.player.number,
        posicao: p.player.pos
      })) || []
    })) || [];

    // Estatisticas
    const estatisticas = fixture.statistics?.map(s => ({
      timeId: s.team.id,
      time: s.team.name,
      stats: s.statistics?.reduce((acc, stat) => {
        acc[stat.type] = stat.value;
        return acc;
      }, {}) || {}
    })) || [];

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
  } catch (err) {
    console.error('[JOGOS-EVENTOS] Erro:', err.message);
    return { eventos: [] };
  }
}

/**
 * Mapeia tipo de evento para icone/texto
 */
function mapearTipoEvento(type, detail) {
  const mapa = {
    'Goal': detail === 'Penalty' ? 'gol_penalti' : detail === 'Own Goal' ? 'gol_contra' : 'gol',
    'Card': detail === 'Yellow Card' ? 'cartao_amarelo' : detail === 'Red Card' ? 'cartao_vermelho' : 'cartao_segundo_amarelo',
    'subst': 'substituicao',
    'Var': 'var'
  };
  return mapa[type] || type.toLowerCase();
}
```
**Motivo:** Nova funcao para buscar eventos detalhados de um jogo especifico

**Linha 302-303 (ANTES do export): ADICIONAR nova rota**
```javascript
// ADICIONAR ANTES de: export default router;

// GET /api/jogos-ao-vivo/:fixtureId/eventos - Eventos de um jogo especifico
router.get('/:fixtureId/eventos', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    if (!fixtureId || isNaN(fixtureId)) {
      return res.status(400).json({ error: 'fixtureId invalido' });
    }

    const result = await buscarEventosJogo(fixtureId);
    res.json(result);
  } catch (err) {
    console.error('[JOGOS-EVENTOS] Erro na rota:', err);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});
```
**Motivo:** Endpoint para frontend buscar eventos de jogo especifico

---

### 2. public/participante/js/modules/participante-jogos.js - Frontend Badges

**Path:** `public/participante/js/modules/participante-jogos.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** participante-boas-vindas.js

#### Mudancas Cirurgicas:

**Linha 1-12: ADICIONAR constantes de icones**
```javascript
// ADICIONAR NO TOPO (apos comentario de versao)

// Icones Material para eventos
const EVENTO_ICONES = {
  gol: { icon: 'sports_soccer', cor: 'text-green-400' },
  gol_penalti: { icon: 'sports_soccer', cor: 'text-green-400', badge: 'P' },
  gol_contra: { icon: 'sports_soccer', cor: 'text-red-400', badge: 'GC' },
  cartao_amarelo: { icon: 'style', cor: 'text-yellow-400' },
  cartao_vermelho: { icon: 'style', cor: 'text-red-500' },
  cartao_segundo_amarelo: { icon: 'style', cor: 'text-red-500', badge: '2A' },
  substituicao: { icon: 'swap_horiz', cor: 'text-blue-400' },
  var: { icon: 'videocam', cor: 'text-purple-400' }
};

// Intervalo de auto-refresh (ms)
const AUTO_REFRESH_INTERVAL = 60000; // 60 segundos
let refreshTimer = null;
```
**Motivo:** Constantes para icones de eventos e configuracao de auto-refresh

**Linha 122-161: SUBSTITUIR funcao renderizarCardJogo**
```javascript
// SUBSTITUIR FUNCAO COMPLETA renderizarCardJogo

/**
 * Renderiza um card de jogo individual - v4.0
 * Suporta: escudos, placar, tempo pulsante, eventos inline, halftime
 */
function renderizarCardJogo(jogo) {
    const aoVivo = isJogoAoVivo(jogo);
    const encerrado = isJogoEncerrado(jogo);
    const agendado = isJogoAgendado(jogo);

    // Classes do container baseado no status
    const containerClass = aoVivo
        ? 'ring-1 ring-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent'
        : encerrado
            ? 'bg-gray-700/30 opacity-80'
            : 'bg-gray-700/50';

    // Se tem logo (API-Football), renderizar com escudos
    if (jogo.logoMandante && jogo.logoVisitante) {
        return `
        <div class="jogo-card flex flex-col py-2 px-3 rounded-lg ${containerClass} cursor-pointer"
             data-fixture-id="${jogo.id}"
             onclick="window.expandirJogo && window.expandirJogo(${jogo.id})">
            <!-- Header: Liga + Status -->
            <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] text-white/40 truncate max-w-[60%]">${jogo.liga}</span>
                ${renderizarBadgeStatus(jogo, aoVivo, encerrado)}
            </div>

            <!-- Linha principal: Times e Placar -->
            <div class="flex items-center">
                <!-- Time Mandante -->
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <img src="${jogo.logoMandante}" alt="${jogo.mandante}"
                         class="w-7 h-7 object-contain shrink-0"
                         onerror="this.style.display='none'">
                    <span class="text-white font-medium text-xs truncate">${jogo.mandante}</span>
                </div>

                <!-- Placar Central -->
                <div class="flex flex-col items-center justify-center min-w-[70px] shrink-0 px-2">
                    ${renderizarPlacar(jogo, aoVivo, encerrado, agendado)}
                </div>

                <!-- Time Visitante -->
                <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span class="text-white font-medium text-xs truncate text-right">${jogo.visitante}</span>
                    <img src="${jogo.logoVisitante}" alt="${jogo.visitante}"
                         class="w-7 h-7 object-contain shrink-0"
                         onerror="this.style.display='none'">
                </div>
            </div>

            <!-- Footer: Estadio (se encerrado ou ao vivo) -->
            ${jogo.estadio && (aoVivo || encerrado) ? `
                <div class="mt-2 text-center">
                    <span class="text-[9px] text-white/30">${jogo.estadio}${jogo.cidade ? `, ${jogo.cidade}` : ''}</span>
                </div>
            ` : ''}
        </div>
        `;
    }

    // Fallback para dados do Globo (sem logo) - manter comportamento anterior
    return `
    <div class="flex items-center py-2 px-3 bg-gray-700/50 rounded-lg">
        <div class="flex-1 min-w-0">
            <span class="text-white font-medium text-xs truncate block">${jogo.mandante}</span>
        </div>
        <div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1">
            ${encerrado ? `
                <span class="text-white/80 font-bold text-sm">${jogo.placar || '-'}</span>
                <span class="text-[9px] text-gray-400">Encerrado</span>
            ` : `
                <span class="text-primary font-bold text-xs">vs</span>
                <span class="text-white/60 text-[10px]">${jogo.horario}</span>
            `}
        </div>
        <div class="flex-1 min-w-0">
            <span class="text-white font-medium text-xs truncate block text-right">${jogo.visitante}</span>
        </div>
    </div>
    `;
}

/**
 * Renderiza badge de status (AO VIVO, Intervalo, Encerrado)
 */
function renderizarBadgeStatus(jogo, aoVivo, encerrado) {
    if (aoVivo) {
        // Ao vivo: badge pulsante com tempo
        const tempoDisplay = jogo.tempoExtra
            ? `${jogo.tempo}+${jogo.tempoExtra}'`
            : jogo.tempo || 'AO VIVO';

        const statusTexto = jogo.statusRaw === 'HT' ? 'Intervalo'
            : jogo.statusRaw === 'ET' ? 'Prorrog.'
            : jogo.statusRaw === 'P' ? 'Penaltis'
            : tempoDisplay;

        return `
            <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                ${statusTexto}
            </span>
        `;
    }

    if (encerrado) {
        return `
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                Encerrado
            </span>
        `;
    }

    // Agendado
    return `
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            ${jogo.horario}
        </span>
    `;
}

/**
 * Renderiza area do placar
 */
function renderizarPlacar(jogo, aoVivo, encerrado, agendado) {
    if (agendado) {
        return `
            <span class="text-primary font-bold text-lg">vs</span>
            <span class="text-white/50 text-[10px]">${jogo.horario}</span>
        `;
    }

    // Ao vivo ou encerrado: mostrar placar
    const placarClass = aoVivo ? 'text-white' : 'text-white/70';
    const fontClass = aoVivo ? 'text-xl font-bold' : 'text-lg font-semibold';

    return `
        <span class="${placarClass} ${fontClass} leading-tight tabular-nums">
            ${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}
        </span>
        ${jogo.placarHT ? `
            <span class="text-[9px] text-white/40">${jogo.placarHT}</span>
        ` : ''}
    `;
}
```
**Motivo:** Refatorar renderizacao para suportar novos campos e layout melhorado

**ADICIONAR NO FINAL DO ARQUIVO (antes de ultima linha)**
```javascript
// =====================================================================
// AUTO-REFRESH PARA JOGOS AO VIVO - v4.0
// =====================================================================

/**
 * Inicia auto-refresh quando ha jogos ao vivo
 */
export function iniciarAutoRefresh(callback) {
    pararAutoRefresh(); // Limpar timer anterior

    if (typeof callback !== 'function') {
        console.warn('[JOGOS] Callback de refresh invalido');
        return;
    }

    refreshTimer = setInterval(async () => {
        if (window.Log) Log.debug('JOGOS', '🔄 Auto-refresh executando...');

        try {
            const result = await obterJogosAoVivo();

            // So atualizar se tem jogos ao vivo
            if (result.aoVivo) {
                callback(result);
            } else {
                // Se nao tem mais jogos ao vivo, parar refresh
                pararAutoRefresh();
                if (window.Log) Log.info('JOGOS', '⏹️ Auto-refresh parado (sem jogos ao vivo)');
            }
        } catch (err) {
            if (window.Log) Log.error('JOGOS', 'Erro no auto-refresh:', err);
        }
    }, AUTO_REFRESH_INTERVAL);

    if (window.Log) Log.info('JOGOS', `⏱️ Auto-refresh iniciado (${AUTO_REFRESH_INTERVAL/1000}s)`);
}

/**
 * Para o auto-refresh
 */
export function pararAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

/**
 * Busca eventos de um jogo especifico
 */
export async function obterEventosJogo(fixtureId) {
    try {
        const res = await fetch(`/api/jogos-ao-vivo/${fixtureId}/eventos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('[JOGOS] Erro ao buscar eventos:', err);
        return { eventos: [], escalacoes: [], estatisticas: [] };
    }
}

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
         onclick="window.fecharModalJogo && window.fecharModalJogo()">
        <div class="w-full max-w-lg bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-hidden"
             onclick="event.stopPropagation()">

            <!-- Header -->
            <div class="sticky top-0 bg-gray-900 border-b border-gray-700 p-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-white">${jogo.liga}</span>
                    <button onclick="window.fecharModalJogo()"
                            class="p-1 rounded-full hover:bg-gray-700">
                        <span class="material-icons text-white/60">close</span>
                    </button>
                </div>
            </div>

            <!-- Placar Grande -->
            <div class="p-6 text-center">
                <div class="flex items-center justify-center gap-6">
                    <div class="flex flex-col items-center gap-2">
                        <img src="${jogo.logoMandante}" class="w-16 h-16 object-contain" alt="">
                        <span class="text-sm text-white font-medium">${jogo.mandante}</span>
                    </div>
                    <div class="text-4xl font-bold text-white tabular-nums">
                        ${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <img src="${jogo.logoVisitante}" class="w-16 h-16 object-contain" alt="">
                        <span class="text-sm text-white font-medium">${jogo.visitante}</span>
                    </div>
                </div>
                ${jogo.placarHT ? `<p class="text-sm text-white/40 mt-2">Intervalo: ${jogo.placarHT}</p>` : ''}
            </div>

            <!-- Eventos -->
            <div class="px-4 pb-6 overflow-y-auto max-h-[40vh]">
                ${gols.length > 0 ? `
                    <h4 class="text-xs font-bold text-white/50 uppercase mb-2">Gols</h4>
                    <div class="space-y-2 mb-4">
                        ${gols.map(e => renderizarEvento(e, jogo)).join('')}
                    </div>
                ` : ''}

                ${cartoes.length > 0 ? `
                    <h4 class="text-xs font-bold text-white/50 uppercase mb-2">Cartoes</h4>
                    <div class="space-y-2 mb-4">
                        ${cartoes.map(e => renderizarEvento(e, jogo)).join('')}
                    </div>
                ` : ''}

                ${eventos.length === 0 ? `
                    <p class="text-center text-white/40 py-8">Nenhum evento registrado</p>
                ` : ''}
            </div>

            <!-- Estadio -->
            ${jogo.estadio ? `
                <div class="border-t border-gray-700 p-4 text-center">
                    <span class="material-icons text-white/30 text-sm align-middle">stadium</span>
                    <span class="text-xs text-white/40 ml-1">${jogo.estadio}${jogo.cidade ? `, ${jogo.cidade}` : ''}</span>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}

/**
 * Renderiza um evento individual
 */
function renderizarEvento(evento, jogo) {
    const iconeConfig = EVENTO_ICONES[evento.tipo] || { icon: 'info', cor: 'text-gray-400' };
    const isMandante = evento.time === jogo.mandante;

    return `
    <div class="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 ${isMandante ? '' : 'flex-row-reverse'}">
        <span class="text-xs text-white/50 w-8 text-center">${evento.tempo}'${evento.tempoExtra ? `+${evento.tempoExtra}` : ''}</span>
        <span class="material-icons ${iconeConfig.cor} text-lg">${iconeConfig.icon}</span>
        <div class="flex-1 ${isMandante ? '' : 'text-right'}">
            <span class="text-sm text-white">${evento.jogador || 'Desconhecido'}</span>
            ${evento.assistencia ? `<span class="text-xs text-white/40 ml-1">(${evento.assistencia})</span>` : ''}
        </div>
    </div>
    `;
}

// Expor funcoes globais para onclick
window.expandirJogo = async function(fixtureId) {
    const container = document.getElementById('modal-jogo-container');
    if (!container) {
        // Criar container se nao existe
        const div = document.createElement('div');
        div.id = 'modal-jogo-container';
        document.body.appendChild(div);
    }

    // Buscar jogo do cache
    const jogos = window._jogosCache || [];
    const jogo = jogos.find(j => j.id === fixtureId);
    if (!jogo) return;

    // Mostrar loading
    document.getElementById('modal-jogo-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    `;

    // Buscar detalhes
    const detalhes = await obterEventosJogo(fixtureId);

    // Renderizar modal
    document.getElementById('modal-jogo-container').innerHTML = renderizarModalJogo(jogo, detalhes);
};

window.fecharModalJogo = function() {
    const container = document.getElementById('modal-jogo-container');
    if (container) container.innerHTML = '';
};

if (window.Log) Log.info('PARTICIPANTE-JOGOS', '✅ Modulo v4.0 carregado (eventos + auto-refresh)');
```
**Motivo:** Adicionar funcionalidades de auto-refresh, busca de eventos e modal de detalhes

---

### 3. public/participante/js/modules/participante-boas-vindas.js - Integracao

**Path:** `public/participante/js/modules/participante-boas-vindas.js`
**Tipo:** Modificacao
**Impacto:** Medio
**Dependentes:** Nenhum

#### Mudancas Cirurgicas:

**Linha 856-882: MODIFICAR funcao carregarEExibirJogos**
```javascript
// SUBSTITUIR FUNCAO carregarEExibirJogos COMPLETA

async function carregarEExibirJogos() {
    try {
        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "⚽ Carregando jogos ao vivo...");

        const mod = await import('./participante-jogos.js');
        const result = await mod.obterJogosAoVivo();

        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "⚽ Resultado jogos:", {
            quantidade: result.jogos?.length || 0,
            fonte: result.fonte,
            aoVivo: result.aoVivo
        });

        // Armazenar jogos em cache global para modal
        window._jogosCache = result.jogos || [];

        if (result.jogos && result.jogos.length > 0) {
            const html = mod.renderizarJogosAoVivo(result.jogos, result.fonte, result.aoVivo);
            const el = document.getElementById('jogos-do-dia-placeholder');
            if (el) {
                el.innerHTML = html;
                if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "✅ Card de jogos renderizado!");
            }

            // v4.0: Iniciar auto-refresh se tem jogos ao vivo
            if (result.aoVivo) {
                mod.iniciarAutoRefresh((novoResult) => {
                    window._jogosCache = novoResult.jogos || [];
                    const novoHtml = mod.renderizarJogosAoVivo(novoResult.jogos, novoResult.fonte, novoResult.aoVivo);
                    const container = document.getElementById('jogos-do-dia-placeholder');
                    if (container) {
                        container.innerHTML = novoHtml;
                        if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "🔄 Jogos atualizados via auto-refresh");
                    }
                });
            }
        } else {
            if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "📭 Sem jogos para exibir no momento");
        }
    } catch (err) {
        if (window.Log) Log.error("PARTICIPANTE-BOAS-VINDAS", "❌ Erro ao carregar jogos:", err);
    }
}

// Parar auto-refresh quando sair da tela
window.addEventListener('participante-nav-change', () => {
    import('./participante-jogos.js').then(mod => {
        mod.pararAutoRefresh();
    }).catch(() => {});
});
```
**Motivo:** Integrar auto-refresh e cache global para modal de detalhes

---

## Mapa de Dependencias

```
routes/jogos-ao-vivo-routes.js (Backend)
    |-> Nova funcao: buscarEventosJogo()
    |-> Nova funcao: mapearTipoEvento()
    |-> Nova rota: GET /:fixtureId/eventos
    |
public/participante/js/modules/participante-jogos.js (Frontend)
    |-> Novas constantes: EVENTO_ICONES, AUTO_REFRESH_INTERVAL
    |-> Funcao modificada: renderizarCardJogo() [v4.0]
    |-> Novas funcoes: renderizarBadgeStatus(), renderizarPlacar()
    |-> Novas funcoes: iniciarAutoRefresh(), pararAutoRefresh()
    |-> Novas funcoes: obterEventosJogo(), renderizarModalJogo()
    |-> Globais: window.expandirJogo(), window.fecharModalJogo()
    |
public/participante/js/modules/participante-boas-vindas.js
    |-> Funcao modificada: carregarEExibirJogos() [v4.0]
    |-> Novo: Cache global window._jogosCache
    |-> Novo: Listener para parar auto-refresh ao navegar
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Endpoint de eventos NAO requer ligaId (dados publicos da API-Football)
- [x] Sem exposicao de dados sensiveis (apenas placar/eventos publicos)

### Rate Limiting
- [x] API-Football tem limite de 100 req/dia (plano free)
- [x] Cache de 2-10min ja implementado evita excesso
- [x] Auto-refresh so ativo quando ha jogos ao vivo

---

## Casos de Teste

### Teste 1: Badge com jogo ao vivo
**Setup:** Dia com jogos do Brasileirao em andamento
**Acao:** Acessar tela inicial do app
**Resultado Esperado:**
- Badge verde pulsante "32'"
- Placar atualizado
- Card com borda verde

### Teste 2: Auto-refresh funcionando
**Setup:** Jogo ao vivo em andamento
**Acao:** Aguardar 60 segundos na tela inicial
**Resultado Esperado:**
- Placar atualiza automaticamente
- Log mostra "Auto-refresh executando"

### Teste 3: Modal de detalhes
**Setup:** Tela inicial com jogos
**Acao:** Tocar em um card de jogo
**Resultado Esperado:**
- Modal abre com loading
- Mostra placar grande + escudos
- Lista gols com tempo/jogador
- Lista cartoes com tempo/jogador

### Teste 4: Sem jogos brasileiros
**Setup:** Dia sem jogos do Brasileirao/Copa
**Acao:** Acessar tela inicial
**Resultado Esperado:**
- Card de jogos NAO aparece
- Ou mostra "Sem jogos brasileiros hoje"

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Limpar cache: `node scripts/limpar-cache.js jogos`
3. Reiniciar servidor

### Fallback Automatico
- Se API-Football falhar, sistema ja tem fallback para Globo Esporte
- Se eventos nao carregarem, modal mostra "Nenhum evento registrado"

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Campos API-Football Utilizados
- [x] fixture.id, fixture.status.elapsed, fixture.status.extra
- [x] fixture.venue.name, fixture.venue.city
- [x] teams.home/away.name, teams.home/away.logo
- [x] goals.home, goals.away
- [x] score.halftime.home, score.halftime.away
- [x] events[].time.elapsed, events[].type, events[].player.name
- [x] events[].assist.name, events[].team.name

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - routes/jogos-ao-vivo-routes.js (novas funcoes + rota)

2. **Frontend depois:**
   - participante-jogos.js (renderizacao + auto-refresh + modal)
   - participante-boas-vindas.js (integracao)

3. **Testes:**
   - Manual: Verificar badge ao vivo
   - Manual: Verificar auto-refresh
   - Manual: Verificar modal de eventos

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-badges-jogos-api-football-v3.md
```

---

## Consumo de API Estimado

| Cenario | Requests/dia |
|---------|--------------|
| 1 usuario, sem jogos | ~10 |
| 1 usuario, 5 jogos ao vivo | ~50 |
| 30 usuarios, matchday | ~300 |
| **Limite plano Free** | **100** |

**Recomendacao:** Para uso em producao com muitos usuarios, considerar:
- Upgrade para plano Pro (7.500 req/dia = $15/mes)
- Ou implementar cache compartilhado (Redis) para todos usuarios

---

**Gerado por:** Spec Protocol v1.0
**High Senior Edition**
