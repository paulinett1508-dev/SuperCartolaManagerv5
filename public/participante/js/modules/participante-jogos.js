// PARTICIPANTE-JOGOS.JS - v2.1 (FIX LAYOUT PLACAR)
// ✅ v2.1: FIX - Container do placar agora tem min-w e shrink-0
//          - Evita que o placar "suma" quando nomes dos times são longos
//          - Redesign do card seguindo padrões frontend-crafter
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
        <div class="flex items-center py-2 px-3 bg-gray-700/50 rounded-lg">
            <!-- Time Mandante (lado esquerdo) -->
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <img src="${jogo.logoMandante}" alt="${jogo.mandante}" class="w-6 h-6 object-contain shrink-0" onerror="this.style.display='none'">
                <span class="text-white font-medium text-xs truncate">${jogo.mandante}</span>
            </div>
            <!-- Placar Central (largura fixa, não encolhe) -->
            <div class="flex flex-col items-center justify-center min-w-[56px] shrink-0 px-1">
                ${aoVivo && jogo.placar ? `
                    <span class="text-white font-bold text-base leading-tight">${jogo.placar}</span>
                    <span class="text-[9px] text-green-400 animate-pulse">${jogo.tempo || ''}</span>
                ` : `
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
        <div class="flex flex-col items-center justify-center min-w-[56px] shrink-0 px-1">
            <span class="text-primary font-bold text-xs">vs</span>
            <span class="text-white/60 text-[10px]">${jogo.horario}</span>
        </div>
        <!-- Time Visitante -->
        <div class="flex-1 min-w-0">
            <span class="text-white font-medium text-xs truncate block text-right">${jogo.visitante}</span>
        </div>
        <!-- Status Badge -->
        <div class="ml-2 shrink-0">
            <span class="text-[10px] px-1.5 py-0.5 rounded ${
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
