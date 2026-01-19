// PARTICIPANTE-JOGOS.JS - v5.5 (BOTÃO FECHAR MODAL)
// ✅ v5.5: Botão "Fechar" visível no footer do modal de detalhes
// ✅ v5.4: Separação correta em 3 seções
//          - "Ao Vivo": apenas jogos realmente ao vivo (1H, 2H, HT, etc.)
//          - "Hoje": jogos agendados que ainda não começaram
//          - "Encerrados": jogos finalizados
// ✅ v5.3: Separação em seções "Em Andamento" e "Encerrados"
//          - Jogos ao vivo + agendados em "Em Andamento"
//          - Jogos finalizados em "Encerrados"
// ✅ v5.2: Layout compacto - reducao de fontes, paddings, escudos (~15-25%)
// ✅ v5.1: Font-brand (Russo One) aplicado corretamente:
//          - Nome da liga no header do card
//          - Placar (ao vivo e encerrado)
//          - VS em jogos agendados
// ✅ v5.0: Modal com tabs (Eventos | Estatisticas | Escalacoes)
//          - Barras comparativas de posse, chutes, escanteios
//          - Lista de titulares com formacao tatica
//          - Nomes de campeonatos melhorados (backend v3.2)
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
 * Renderiza card de jogos do dia - v5.3 (Seções separadas)
 * @param {Array} jogos - Lista de jogos
 * @param {string} fonte - Fonte dos dados (api-football, globo)
 * @param {boolean} aoVivo - Se ha jogos ao vivo
 */
export function renderizarJogosAoVivo(jogos, fonte = 'api-football', aoVivo = false) {
    if (!jogos || !jogos.length) return '';

    // ✅ v5.4: Separar jogos em 3 categorias distintas
    const jogosAoVivo = jogos.filter(j => isJogoAoVivo(j));
    const jogosAgendados = jogos.filter(j => isJogoAgendado(j));
    const jogosEncerrados = jogos.filter(j => isJogoEncerrado(j));

    // Log para debug
    console.log('[JOGOS-DEBUG] Total:', jogos.length, '| Ao vivo:', jogosAoVivo.length, '| Agendados:', jogosAgendados.length, '| Encerrados:', jogosEncerrados.length);

    // Calcular estatisticas
    const stats = {
        aoVivo: jogosAoVivo.length,
        agendados: jogosAgendados.length,
        encerrados: jogosEncerrados.length
    };

    // Fonte dos dados para footer
    const fonteTexto = fonte === 'api-football' ? 'API-Football'
        : fonte === 'soccerdata' ? 'SoccerData'
        : 'Globo Esporte';

    return `
    <div class="jogos-ao-vivo mx-4 mb-8 space-y-4">
        ${renderizarSecaoJogos(jogosAoVivo, 'Ao Vivo', stats, 'aoVivo')}
        ${renderizarSecaoJogos(jogosAgendados, 'Hoje', stats, 'agendados')}
        ${renderizarSecaoJogos(jogosEncerrados, 'Encerrados', stats, 'encerrados')}
        <div class="text-center">
            <span class="text-[10px] text-white/30">Dados: ${fonteTexto}</span>
        </div>
    </div>
    `;
}

/**
 * Renderiza uma seção de jogos - v5.4
 * @param {Array} jogos - Lista de jogos da seção
 * @param {string} titulo - Título da seção
 * @param {Object} stats - Estatísticas gerais
 * @param {string} tipo - Tipo da seção: 'aoVivo', 'agendados', 'encerrados'
 */
function renderizarSecaoJogos(jogos, titulo, stats, tipo) {
    if (!jogos || !jogos.length) return '';

    // Configurações visuais baseadas no tipo de seção
    let tituloIcone, tagClass, tagTexto, borderClass, iconColor;

    switch (tipo) {
        case 'aoVivo':
            tituloIcone = 'sports_soccer';
            tagClass = 'bg-green-500/20 text-green-400 animate-pulse';
            tagTexto = `${jogos.length} ao vivo`;
            borderClass = 'border-green-500/40';
            iconColor = 'text-green-400';
            break;
        case 'agendados':
            tituloIcone = 'schedule';
            tagClass = 'bg-yellow-400/20 text-yellow-400';
            tagTexto = `${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'}`;
            borderClass = 'border-yellow-500/30';
            iconColor = 'text-yellow-400';
            break;
        case 'encerrados':
        default:
            tituloIcone = 'verified';
            tagClass = 'bg-gray-500/20 text-gray-400';
            tagTexto = `${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'}`;
            borderClass = 'border-gray-700/30';
            iconColor = 'text-gray-400';
            break;
    }

    return `
    <div class="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-3 border ${borderClass} shadow-lg">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
                <span class="material-icons ${iconColor} text-base">${tituloIcone}</span>
                <h3 class="text-xs font-brand text-white tracking-wide">${titulo}</h3>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded ${tagClass}">${tagTexto}</span>
        </div>
        <div class="space-y-1.5">
            ${jogos.map(jogo => renderizarCardJogo(jogo)).join('')}
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
        <div class="jogo-card flex flex-col py-1.5 px-2.5 rounded-lg ${containerClass} cursor-pointer"
             data-fixture-id="${jogo.id}"
             onclick="window.expandirJogo && window.expandirJogo(${jogo.id})">
            <!-- Header: Liga + Status -->
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[9px] font-brand text-white/50 truncate max-w-[60%] tracking-wide" title="ID:${jogo.ligaId} | API:${jogo.ligaOriginal}">${jogo.liga}</span>
                ${renderizarBadgeStatus(jogo, aoVivo, encerrado)}
            </div>

            <!-- Linha principal: Times e Placar -->
            <div class="flex items-center">
                <!-- Time Mandante -->
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <img src="${jogo.logoMandante}" alt="${jogo.mandante}"
                         class="w-6 h-6 object-contain shrink-0"
                         onerror="this.style.display='none'">
                    <span class="text-white font-medium text-[11px] truncate">${jogo.mandante}</span>
                </div>

                <!-- Placar Central -->
                <div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1.5">
                    ${renderizarPlacar(jogo, aoVivo, encerrado, agendado)}
                </div>

                <!-- Time Visitante -->
                <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span class="text-white font-medium text-[11px] truncate text-right">${jogo.visitante}</span>
                    <img src="${jogo.logoVisitante}" alt="${jogo.visitante}"
                         class="w-6 h-6 object-contain shrink-0"
                         onerror="this.style.display='none'">
                </div>
            </div>

            <!-- Footer: Estadio (se encerrado ou ao vivo) -->
            ${jogo.estadio && (aoVivo || encerrado) ? `
                <div class="mt-1.5 text-center">
                    <span class="text-[8px] text-white/25">${jogo.estadio}${jogo.cidade ? `, ${jogo.cidade}` : ''}</span>
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
            <span class="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                ${statusTexto}
            </span>
        `;
    }

    if (encerrado) {
        return `
            <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                Encerrado
            </span>
        `;
    }

    // Agendado
    return `
        <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
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
            <span class="text-primary font-brand text-base">vs</span>
            <span class="text-white/50 text-[9px]">${jogo.horario}</span>
        `;
    }

    // Ao vivo ou encerrado: mostrar placar com Russo One
    const placarClass = aoVivo ? 'text-white' : 'text-white/70';
    const sizeClass = aoVivo ? 'text-lg' : 'text-base';

    return `
        <span class="${placarClass} ${sizeClass} font-brand leading-tight tabular-nums">
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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onclick="window.fecharModalJogo && window.fecharModalJogo()">
        <div class="w-full max-w-sm bg-gray-900 rounded-xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
             onclick="event.stopPropagation()">

            <!-- Header Fixo -->
            <div class="sticky top-0 bg-gray-900 border-b border-gray-700/50 px-3 py-2 z-10">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-white/60 tracking-wide truncate flex-1">${jogo.liga}</span>
                    <button onclick="window.fecharModalJogo()"
                            class="p-1 rounded-full hover:bg-gray-700 transition-colors ml-2">
                        <span class="material-icons text-white/40 text-lg">close</span>
                    </button>
                </div>
            </div>

            <!-- Placar Compacto -->
            <div class="px-3 py-3 text-center bg-gradient-to-b from-gray-800/30 to-transparent">
                <div class="flex items-center justify-center gap-3">
                    <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <img src="${jogo.logoMandante}" class="w-10 h-10 object-contain" alt="" onerror="this.style.display='none'">
                        <span class="text-[10px] font-medium text-white/80 truncate max-w-[70px]">${jogo.mandante}</span>
                    </div>
                    <div class="text-2xl font-brand text-white tabular-nums px-2">
                        ${jogo.golsMandante ?? 0} - ${jogo.golsVisitante ?? 0}
                    </div>
                    <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <img src="${jogo.logoVisitante}" class="w-10 h-10 object-contain" alt="" onerror="this.style.display='none'">
                        <span class="text-[10px] font-medium text-white/80 truncate max-w-[70px]">${jogo.visitante}</span>
                    </div>
                </div>
                ${jogo.placarHT ? `<p class="text-[10px] text-white/30 mt-1">(HT: ${jogo.placarHT})</p>` : ''}
            </div>

            <!-- Sistema de Tabs -->
            <div class="border-b border-gray-700/50">
                <div class="flex">
                    <button id="${tabPrefix}-tab-eventos"
                            class="flex-1 py-2 text-[11px] font-medium text-white border-b-2 border-primary transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'eventos')">
                        <span class="material-icons text-sm align-middle mr-0.5">sports_soccer</span>
                        Eventos
                    </button>
                    ${temEstatisticas ? `
                    <button id="${tabPrefix}-tab-stats"
                            class="flex-1 py-2 text-[11px] font-medium text-white/50 border-b-2 border-transparent hover:text-white/80 transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'stats')">
                        <span class="material-icons text-sm align-middle mr-0.5">bar_chart</span>
                        Stats
                    </button>
                    ` : ''}
                    ${temEscalacoes ? `
                    <button id="${tabPrefix}-tab-escalacoes"
                            class="flex-1 py-2 text-[11px] font-medium text-white/50 border-b-2 border-transparent hover:text-white/80 transition-colors"
                            onclick="window.trocarTabModal('${tabPrefix}', 'escalacoes')">
                        <span class="material-icons text-sm align-middle mr-0.5">groups</span>
                        Times
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Conteudo das Tabs (scrollable) -->
            <div class="flex-1 overflow-y-auto">
                <!-- Tab Eventos -->
                <div id="${tabPrefix}-content-eventos" class="p-3">
                    ${gols.length > 0 ? `
                        <h4 class="text-[10px] text-white/40 uppercase tracking-wide mb-1.5">Gols</h4>
                        <div class="space-y-1.5 mb-3">
                            ${gols.map(e => renderizarEvento(e, jogo)).join('')}
                        </div>
                    ` : ''}

                    ${cartoes.length > 0 ? `
                        <h4 class="text-[10px] text-white/40 uppercase tracking-wide mb-1.5">Cartões</h4>
                        <div class="space-y-1.5 mb-3">
                            ${cartoes.map(e => renderizarEvento(e, jogo)).join('')}
                        </div>
                    ` : ''}

                    ${eventos.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-8 text-white/30">
                            <span class="material-icons text-2xl mb-1">sports</span>
                            <p class="text-xs">Nenhum evento</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Tab Estatisticas -->
                ${temEstatisticas ? `
                <div id="${tabPrefix}-content-stats" class="p-3 hidden">
                    ${renderizarEstatisticas(resumoStats, jogo)}
                </div>
                ` : ''}

                <!-- Tab Escalacoes -->
                ${temEscalacoes ? `
                <div id="${tabPrefix}-content-escalacoes" class="p-3 hidden">
                    ${renderizarEscalacoes(escalacoes, jogo)}
                </div>
                ` : ''}
            </div>

            <!-- Footer com Estadio/Arbitro -->
            ${fixture?.estadio || fixture?.arbitro ? `
                <div class="border-t border-gray-700/50 px-3 py-2 bg-gray-800/30">
                    <div class="flex items-center justify-center gap-3 text-[10px] text-white/30">
                        ${fixture.estadio ? `
                            <span class="flex items-center gap-0.5">
                                <span class="material-icons text-xs">stadium</span>
                                ${fixture.estadio}
                            </span>
                        ` : ''}
                        ${fixture.arbitro ? `
                            <span class="flex items-center gap-0.5">
                                <span class="material-icons text-xs">sports</span>
                                ${fixture.arbitro}
                            </span>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Botão Fechar (v5.4) -->
            <div class="border-t border-gray-700/50 p-3 bg-gray-900">
                <button onclick="window.fecharModalJogo()"
                        class="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <span class="material-icons text-lg">close</span>
                    Fechar
                </button>
            </div>
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
    <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40 ${isMandante ? '' : 'flex-row-reverse'}">
        <span class="text-[10px] text-white/40 w-6 text-center">${evento.tempo}'${evento.tempoExtra ? `+${evento.tempoExtra}` : ''}</span>
        <span class="material-icons ${iconeConfig.cor} text-sm">${iconeConfig.icon}</span>
        <div class="flex-1 ${isMandante ? '' : 'text-right'}">
            <span class="text-xs text-white/90">${evento.jogador || 'Desconhecido'}</span>
            ${evento.assistencia ? `<span class="text-[10px] text-white/30 ml-0.5">(${evento.assistencia})</span>` : ''}
        </div>
    </div>
    `;
}

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

if (window.Log) Log.info('PARTICIPANTE-JOGOS', 'Modulo v5.3 carregado (seções separadas)');

// ✅ DEBUG: Confirmar que versão 5.3 está ativa no console
console.log('[JOGOS-DEBUG] ✅ Versão 5.3 carregada. Seções Em Andamento/Encerrados ativas.');
console.log('[JOGOS-DEBUG] expandirJogo disponível:', typeof window.expandirJogo);
