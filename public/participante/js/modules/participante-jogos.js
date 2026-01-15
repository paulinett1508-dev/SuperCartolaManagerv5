// PARTICIPANTE-JOGOS.JS - v1.1
// Exibe jogos do dia na tela inicial (premium only)

/**
 * Busca jogos do dia para o participante
 * @param {number} timeId - ID do time do participante
 * @returns {Promise<{jogos: Array, premium: boolean}>}
 */
export async function obterJogosDoDia(timeId) {
    try {
        const res = await fetch(`/api/jogos-hoje?timeId=${timeId}`);
        const data = await res.json();
        if (data.jogos && data.jogos.length > 0) {
            return {
                jogos: data.jogos,
                premium: data.premium || false,
                fonte: data.fonte || 'api'
            };
        }
        // Fallback: tentar rota Globo Esporte
        const resGlobo = await fetch('/api/jogos-hoje-globo');
        const dataGlobo = await resGlobo.json();
        return {
            jogos: dataGlobo.jogos || [],
            premium: false,
            fonte: 'globo'
        };
    } catch (err) {
        console.error('[JOGOS] Erro ao buscar jogos:', err);
        return { jogos: [], premium: false };
    }
}

/**
 * Renderiza card de jogos do dia
 * @param {Array} jogos - Lista de jogos
 * @param {boolean} isMock - Se são dados mock
 */
export function renderizarJogosDoDia(jogos, isMock = false) {
    if (!jogos || !jogos.length) return '';

    return `
    <div class="jogos-do-dia mx-4 mb-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 border border-primary/30 shadow-lg">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <span class="material-icons text-primary">sports_soccer</span>
                <h3 class="text-sm font-bold text-white">Jogos do Dia</h3>
            </div>
            ${isMock ? '<span class="text-xs text-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 rounded">Preview</span>' : ''}
        </div>
        <div class="space-y-2">
            ${jogos.map(jogo => `
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
            `).join('')}
        </div>
        <div class="mt-3 text-center">
            <span class="text-xs text-white/40">Brasileirão Série A 2026</span>
        </div>
    </div>
    `;
}
