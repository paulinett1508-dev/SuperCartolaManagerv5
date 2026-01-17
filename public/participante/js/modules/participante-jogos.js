// PARTICIPANTE-JOGOS.JS - v3.0 (JOGOS DO DIA COMPLETO)
// ✅ v3.0: Suporte a jogos ao vivo, agendados e encerrados
//          - Mostra placar para jogos ao vivo E encerrados
//          - Badge de status individual por jogo
//          - Ordenação: Ao vivo > Agendados > Encerrados
// ✅ v2.1: FIX - Container do placar com min-w e shrink-0
// Exibe jogos do dia na tela inicial (API-Football + Globo fallback)

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
                <h3 class="text-sm font-bold text-white">${titulo}</h3>
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
 * Renderiza um card de jogo individual
 */
function renderizarCardJogo(jogo) {
    const aoVivo = isJogoAoVivo(jogo);
    const encerrado = isJogoEncerrado(jogo);
    const agendado = isJogoAgendado(jogo);

    // Se tem logo (API-Football), renderizar com escudos
    if (jogo.logoMandante && jogo.logoVisitante) {
        return `
        <div class="flex items-center py-2 px-3 bg-gray-700/50 rounded-lg ${aoVivo ? 'ring-1 ring-green-500/30' : ''}">
            <!-- Time Mandante (lado esquerdo) -->
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <img src="${jogo.logoMandante}" alt="${jogo.mandante}" class="w-6 h-6 object-contain shrink-0" onerror="this.style.display='none'">
                <span class="text-white font-medium text-xs truncate">${jogo.mandante}</span>
            </div>
            <!-- Placar/Status Central (largura fixa, não encolhe) -->
            <div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1">
                ${aoVivo ? `
                    <!-- Ao Vivo: placar + tempo -->
                    <span class="text-white font-bold text-base leading-tight">${jogo.placar}</span>
                    <span class="text-[9px] text-green-400 animate-pulse">${jogo.tempo || jogo.status}</span>
                ` : encerrado ? `
                    <!-- Encerrado: placar + badge -->
                    <span class="text-white/80 font-bold text-base leading-tight">${jogo.placar}</span>
                    <span class="text-[9px] text-gray-400">Encerrado</span>
                ` : `
                    <!-- Agendado: vs + horário -->
                    <span class="text-primary font-bold text-xs">vs</span>
                    <span class="text-white/60 text-[10px]">${jogo.horario}</span>
                `}
            </div>
            <!-- Time Visitante (lado direito) -->
            <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span class="text-white font-medium text-xs truncate text-right">${jogo.visitante}</span>
                <img src="${jogo.logoVisitante}" alt="${jogo.visitante}" class="w-6 h-6 object-contain shrink-0" onerror="this.style.display='none'">
            </div>
        </div>
        ${jogo.liga ? `<div class="text-[9px] text-white/30 text-center mt-0.5">${jogo.liga}</div>` : ''}
        `;
    }

    // Fallback para dados do Globo (sem logo)
    return `
    <div class="flex items-center py-2 px-3 bg-gray-700/50 rounded-lg">
        <!-- Time Mandante -->
        <div class="flex-1 min-w-0">
            <span class="text-white font-medium text-xs truncate block">${jogo.mandante}</span>
        </div>
        <!-- Placar/Horário Central (largura fixa) -->
        <div class="flex flex-col items-center justify-center min-w-[60px] shrink-0 px-1">
            ${encerrado ? `
                <span class="text-white/80 font-bold text-sm">${jogo.placar || '-'}</span>
                <span class="text-[9px] text-gray-400">Encerrado</span>
            ` : `
                <span class="text-primary font-bold text-xs">vs</span>
                <span class="text-white/60 text-[10px]">${jogo.horario}</span>
            `}
        </div>
        <!-- Time Visitante -->
        <div class="flex-1 min-w-0">
            <span class="text-white font-medium text-xs truncate block text-right">${jogo.visitante}</span>
        </div>
        <!-- Status Badge -->
        <div class="ml-2 shrink-0">
            <span class="text-[10px] px-1.5 py-0.5 rounded ${getStatusBadgeClass(jogo)}">
                ${getStatusBadgeText(jogo)}
            </span>
        </div>
    </div>
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
