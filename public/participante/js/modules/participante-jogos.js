// PARTICIPANTE-JOGOS.JS - v4.1 (JOGOS AO VIVO + EVENTOS)
// ✅ v4.1: Russo One (font-brand) nos titulos e placar
// ✅ v4.0: Eventos em tempo real (gols, cartoes), auto-refresh, modal de detalhes
// ✅ v3.0: Suporte a jogos ao vivo, agendados e encerrados
//          - Mostra placar para jogos ao vivo E encerrados
//          - Badge de status individual por jogo
//          - Ordenação: Ao vivo > Agendados > Encerrados
// ✅ v2.1: FIX - Container do placar com min-w e shrink-0
// Exibe jogos do dia na tela inicial (API-Football + Globo fallback)

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

// Status que indicam jogo ao vivo
const STATUS_AO_VIVO = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
const STATUS_ENCERRADO = ['FT', 'AET', 'PEN'];
const STATUS_AGENDADO = ['NS', 'TBD'];

/**
 * Busca jogos do dia
 * @returns {Promise<{jogos: Array, fonte: string, aoVivo: boolean, estatisticas: Object}>}
 */
export async function obterJogosAoVivo() {
    try {
        const res = await fetch('/api/jogos-ao-vivo');
        const data = await res.json();

        return {
            jogos: data.jogos || [],
            fonte: data.fonte || 'api-football',
            aoVivo: data.aoVivo || false,
            estatisticas: data.estatisticas || {},
            mensagem: data.mensagem || null
        };
    } catch (err) {
        console.error('[JOGOS] Erro ao buscar jogos:', err);
        return { jogos: [], fonte: 'erro', aoVivo: false, estatisticas: {} };
    }
}

/**
 * Alias para compatibilidade com codigo antigo
 */
export async function obterJogosDoDia(timeId) {
    return obterJogosAoVivo();
}

/**
 * Verifica se jogo está ao vivo
 */
function isJogoAoVivo(jogo) {
    return STATUS_AO_VIVO.includes(jogo.statusRaw);
}

/**
 * Verifica se jogo está encerrado
 */
function isJogoEncerrado(jogo) {
    return STATUS_ENCERRADO.includes(jogo.statusRaw);
}

/**
 * Verifica se jogo está agendado
 */
function isJogoAgendado(jogo) {
    return STATUS_AGENDADO.includes(jogo.statusRaw);
}

/**
 * Renderiza card de jogos do dia
 * @param {Array} jogos - Lista de jogos
 * @param {string} fonte - Fonte dos dados (api-football, globo)
 * @param {boolean} aoVivo - Se ha jogos ao vivo
 */
export function renderizarJogosAoVivo(jogos, fonte = 'api-football', aoVivo = false) {
    if (!jogos || !jogos.length) return '';

    // Calcular estatisticas
    const stats = {
        aoVivo: jogos.filter(isJogoAoVivo).length,
        agendados: jogos.filter(isJogoAgendado).length,
        encerrados: jogos.filter(isJogoEncerrado).length
    };

    // Titulo dinamico
    let titulo = 'Jogos do Dia';
    let tituloIcone = 'event';
    let tagClass = 'bg-gray-500/20 text-gray-400';
    let tagTexto = `${jogos.length} jogos`;

    if (stats.aoVivo > 0) {
        titulo = 'Jogos Ao Vivo';
        tituloIcone = 'sports_soccer';
        tagClass = 'bg-green-500/20 text-green-400 animate-pulse';
        tagTexto = `${stats.aoVivo} ao vivo`;
    } else if (stats.agendados > 0 && stats.encerrados === 0) {
        tagClass = 'bg-yellow-400/10 text-yellow-400/70';
        tagTexto = `${stats.agendados} agendados`;
    } else if (stats.encerrados > 0 && stats.agendados === 0) {
        tagClass = 'bg-gray-500/20 text-gray-400';
        tagTexto = `${stats.encerrados} encerrados`;
    }

    return `
    <div class="jogos-ao-vivo mx-4 mb-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 border border-primary/30 shadow-lg">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <span class="material-icons text-primary">${tituloIcone}</span>
                <h3 class="text-sm font-brand text-white tracking-wide">${titulo}</h3>
            </div>
            <span class="text-xs px-2 py-0.5 rounded ${tagClass}">${tagTexto}</span>
        </div>
        <div class="space-y-2">
            ${jogos.map(jogo => renderizarCardJogo(jogo)).join('')}
        </div>
        <div class="mt-3 text-center">
            <span class="text-xs text-white/40">
                ${fonte === 'api-football' ? 'Dados: API-Football' : 'Dados: Globo Esporte'}
            </span>
        </div>
    </div>
    `;
}

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
                <span class="text-[9px] text-white/40 truncate max-w-[60%]" title="ID:${jogo.ligaId} | API:${jogo.ligaOriginal}">${jogo.liga}</span>
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

/**
 * Retorna classe CSS do badge de status
 */
function getStatusBadgeClass(jogo) {
    if (isJogoAoVivo(jogo)) return 'bg-green-500/20 text-green-400 animate-pulse';
    if (isJogoEncerrado(jogo)) return 'bg-gray-500/20 text-gray-400';
    return 'bg-yellow-500/20 text-yellow-400';
}

/**
 * Retorna texto do badge de status
 */
function getStatusBadgeText(jogo) {
    if (isJogoAoVivo(jogo)) return jogo.tempo || 'Ao vivo';
    if (isJogoEncerrado(jogo)) return 'FIM';
    return jogo.horario || 'Agendado';
}

/**
 * Alias para compatibilidade
 */
export function renderizarJogosDoDia(jogos, isMock = false) {
    return renderizarJogosAoVivo(jogos, isMock ? 'mock' : 'globo', false);
}

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
        if (window.Log) Log.debug('JOGOS', 'Auto-refresh executando...');

        try {
            const result = await obterJogosAoVivo();

            // So atualizar se tem jogos ao vivo
            if (result.aoVivo) {
                callback(result);
            } else {
                // Se nao tem mais jogos ao vivo, parar refresh
                pararAutoRefresh();
                if (window.Log) Log.info('JOGOS', 'Auto-refresh parado (sem jogos ao vivo)');
            }
        } catch (err) {
            if (window.Log) Log.error('JOGOS', 'Erro no auto-refresh:', err);
        }
    }, AUTO_REFRESH_INTERVAL);

    if (window.Log) Log.info('JOGOS', `Auto-refresh iniciado (${AUTO_REFRESH_INTERVAL/1000}s)`);
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
                    <span class="text-sm font-brand text-white tracking-wide">${jogo.liga}</span>
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
                        <span class="text-xs font-brand text-white tracking-wide">${jogo.mandante}</span>
                    </div>
                    <div class="text-4xl font-brand text-white tabular-nums">
                        ${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <img src="${jogo.logoVisitante}" class="w-16 h-16 object-contain" alt="">
                        <span class="text-xs font-brand text-white tracking-wide">${jogo.visitante}</span>
                    </div>
                </div>
                ${jogo.placarHT ? `<p class="text-sm text-white/40 mt-2">Intervalo: ${jogo.placarHT}</p>` : ''}
            </div>

            <!-- Eventos -->
            <div class="px-4 pb-6 overflow-y-auto max-h-[40vh]">
                ${gols.length > 0 ? `
                    <h4 class="text-xs font-brand text-white/50 uppercase tracking-wide mb-2">Gols</h4>
                    <div class="space-y-2 mb-4">
                        ${gols.map(e => renderizarEvento(e, jogo)).join('')}
                    </div>
                ` : ''}

                ${cartoes.length > 0 ? `
                    <h4 class="text-xs font-brand text-white/50 uppercase tracking-wide mb-2">Cartoes</h4>
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
    console.log('[JOGOS] expandirJogo chamado:', fixtureId);

    let container = document.getElementById('modal-jogo-container');
    if (!container) {
        // Criar container se nao existe
        const div = document.createElement('div');
        div.id = 'modal-jogo-container';
        document.body.appendChild(div);
        container = div;
    }

    // Buscar jogo do cache
    const jogos = window._jogosCache || [];
    console.log('[JOGOS] Cache tem', jogos.length, 'jogos');

    // Comparar como numero (API retorna number)
    const jogo = jogos.find(j => j.id === Number(fixtureId));
    if (!jogo) {
        console.warn('[JOGOS] Jogo nao encontrado no cache:', fixtureId);
        console.log('[JOGOS] IDs disponiveis:', jogos.map(j => j.id));
        return;
    }

    console.log('[JOGOS] Jogo encontrado:', jogo.mandante, 'x', jogo.visitante);

    // Mostrar loading
    container.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    `;

    // Buscar detalhes
    const detalhes = await obterEventosJogo(fixtureId);
    console.log('[JOGOS] Detalhes recebidos:', detalhes.eventos?.length, 'eventos');

    // Renderizar modal
    container.innerHTML = renderizarModalJogo(jogo, detalhes);
    console.log('[JOGOS] Modal renderizado');
};

window.fecharModalJogo = function() {
    const container = document.getElementById('modal-jogo-container');
    if (container) container.innerHTML = '';
};

if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v4.0 carregado (eventos + auto-refresh)');
