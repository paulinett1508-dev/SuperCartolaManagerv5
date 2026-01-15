// PARTICIPANTE-JOGOS.JS - v2.0
// Exibe jogos ao vivo e agenda do dia na tela inicial
// Usa API-Football para jogos ao vivo e Globo scraper como fallback

/**
 * Busca jogos ao vivo ou agenda do dia
 * @returns {Promise<{jogos: Array, fonte: string, aoVivo: boolean}>}
 */
export async function obterJogosAoVivo() {
    try {
        const res = await fetch('/api/jogos-ao-vivo');
        const data = await res.json();

        return {
            jogos: data.jogos || [],
            fonte: data.fonte || 'api-football',
            aoVivo: data.aoVivo || false,
            mensagem: data.mensagem || null
        };
    } catch (err) {
        console.error('[JOGOS] Erro ao buscar jogos ao vivo:', err);
        return { jogos: [], fonte: 'erro', aoVivo: false };
    }
}

/**
 * Alias para compatibilidade com codigo antigo
 */
export async function obterJogosDoDia(timeId) {
    return obterJogosAoVivo();
}

/**
 * Renderiza card de jogos ao vivo
 * @param {Array} jogos - Lista de jogos
 * @param {string} fonte - Fonte dos dados (api-football, globo)
 * @param {boolean} aoVivo - Se ha jogos ao vivo
 */
export function renderizarJogosAoVivo(jogos, fonte = 'api-football', aoVivo = false) {
    if (!jogos || !jogos.length) return '';

    const tituloIcone = aoVivo ? 'sports_soccer' : 'event';
    const titulo = aoVivo ? 'Jogos Ao Vivo' : 'Jogos do Dia';
    const tagClass = aoVivo
        ? 'bg-green-500/20 text-green-400 animate-pulse'
        : 'bg-yellow-400/10 text-yellow-400/70';
    const tagTexto = aoVivo ? 'AO VIVO' : 'Agenda';

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
            ${jogos.map(jogo => renderizarCardJogo(jogo, aoVivo)).join('')}
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
function renderizarCardJogo(jogo, aoVivo) {
    // Se tem logo (API-Football), renderizar com escudos
    if (jogo.logoMandante && jogo.logoVisitante) {
        return `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded-lg">
            <div class="flex items-center gap-2 flex-1">
                <img src="${jogo.logoMandante}" alt="${jogo.mandante}" class="w-6 h-6 object-contain" onerror="this.style.display='none'">
                <span class="text-white font-medium text-sm truncate max-w-[70px]">${jogo.mandante}</span>
            </div>
            <div class="flex flex-col items-center px-2">
                ${aoVivo && jogo.placar ? `
                    <span class="text-white font-bold text-lg">${jogo.placar}</span>
                    <span class="text-[10px] text-green-400 animate-pulse">${jogo.tempo || ''}</span>
                ` : `
                    <span class="text-primary font-bold text-xs">vs</span>
                    <span class="text-white/70 text-[10px]">${jogo.horario}</span>
                `}
            </div>
            <div class="flex items-center gap-2 flex-1 justify-end">
                <span class="text-white font-medium text-sm truncate max-w-[70px] text-right">${jogo.visitante}</span>
                <img src="${jogo.logoVisitante}" alt="${jogo.visitante}" class="w-6 h-6 object-contain" onerror="this.style.display='none'">
            </div>
        </div>
        ${jogo.liga ? `<div class="text-[10px] text-white/30 text-center -mt-1">${jogo.liga}</div>` : ''}
        `;
    }

    // Fallback para dados do Globo (sem logo)
    return `
    <div class="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded-lg">
        <div class="flex items-center gap-2 flex-1">
            <span class="text-white font-medium text-sm truncate max-w-[80px]">${jogo.mandante}</span>
            <span class="text-primary font-bold text-xs">vs</span>
            <span class="text-white font-medium text-sm truncate max-w-[80px]">${jogo.visitante}</span>
        </div>
        <div class="flex items-center gap-2 ml-2">
            <span class="text-white/70 text-xs">${jogo.horario}</span>
            <span class="text-xs px-2 py-0.5 rounded ${
                jogo.status === 'Ao vivo' ? 'bg-green-500/20 text-green-400 animate-pulse' :
                jogo.status === 'Encerrado' ? 'bg-gray-500/20 text-gray-400' :
                'bg-yellow-500/20 text-yellow-400'
            }">
                ${jogo.status}
            </span>
        </div>
    </div>
    `;
}

/**
 * Alias para compatibilidade
 */
export function renderizarJogosDoDia(jogos, isMock = false) {
    return renderizarJogosAoVivo(jogos, isMock ? 'mock' : 'globo', false);
}
