// PARTICIPANTE BOAS-VINDAS - Versão Original Simples

console.log('[BOAS-VINDAS] 🚀 Carregando módulo...');

// Exportar como módulo ES6 E como global
export async function inicializarBoasVindas(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);
    await inicializarBoasVindasInterno(ligaId, timeId);
}

// Expor globalmente também
window.inicializarBoasVindas = async function(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);
    await inicializarBoasVindasInterno(ligaId, timeId);
}

async function inicializarBoasVindasInterno(ligaId, timeId) {
    try {
        const [resRanking, resRodadas, resTime] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/times/${timeId}`)
        ]);

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const timeData = resTime.ok ? await resTime.json() : null;

        const meuTimeIdNum = Number(timeId);
        const meuTime = ranking.find(t => Number(t.timeId) === meuTimeIdNum);
        const posicao = meuTime ? meuTime.posicao : '-';
        const totalParticipantes = ranking.length;

        const minhasRodadas = rodadas.filter(r => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum);
        const pontosTotal = minhasRodadas.reduce((total, rodada) => {
            return total + (parseFloat(rodada.pontos) || 0);
        }, 0);

        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        renderizarBoasVindas({
            posicao,
            totalParticipantes,
            pontosTotal,
            ultimaRodada,
            meuTime,
            timeData,
            timeId,
            minhasRodadas
        });

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro:', error);
        renderizarBoasVindas({
            posicao: '-',
            totalParticipantes: '-',
            pontosTotal: 0,
            ultimaRodada: null,
            meuTime: null,
            timeData: null,
            timeId: timeId,
            minhasRodadas: []
        });
    }
}

function renderizarBoasVindas({ posicao, totalParticipantes, pontosTotal, ultimaRodada, meuTime, timeData, timeId, minhasRodadas }) {
    const container = document.getElementById('boas-vindas-container');
    if (!container) return;

    const nomeTime = meuTime?.nome_time || timeData?.nome_time || 'Seu Time';
    const nomeCartola = meuTime?.nome_cartola || timeData?.nome_cartola || 'Cartoleiro';

    const posTexto = posicao === '-' ? '--' : `${posicao}º`;
    const pontosFormatados = pontosTotal > 0 ? pontosTotal.toFixed(1) : '--';
    const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : '--';
    const pontosUltimaRodada = ultimaRodada ? ultimaRodada.pontos.toFixed(1) : '--';
    const mediapontos = minhasRodadas.length > 0 ? (pontosTotal / minhasRodadas.length).toFixed(1) : '--';

    container.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
            <div class="max-w-6xl mx-auto">

                <!-- Header -->
                <div class="mb-8 text-center">
                    <h1 class="text-4xl font-bold text-white mb-2">${nomeTime}</h1>
                    <p class="text-xl text-gray-400">${nomeCartola}</p>
                </div>

                <!-- Welcome Message -->
                <div class="text-center mb-8">
                    <h2 class="text-3xl font-bold text-white mb-2">
                        Bem-vindo ao Dashboard!
                    </h2>
                    <p class="text-gray-400">Acompanhe seu desempenho em tempo real</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                    <!-- Card Posição -->
                    <div class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/20">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-3xl">🏆</span>
                            <p class="text-yellow-400 text-sm font-semibold uppercase">Posição</p>
                        </div>
                        <p class="text-4xl font-bold text-white mb-2">${posTexto}</p>
                        <p class="text-gray-400 text-sm">de ${totalParticipantes} times</p>
                    </div>

                    <!-- Card Pontos -->
                    <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-3xl">📈</span>
                            <p class="text-blue-400 text-sm font-semibold uppercase">Pontos Total</p>
                        </div>
                        <p class="text-4xl font-bold text-white mb-2">${pontosFormatados}</p>
                        <p class="text-gray-400 text-sm">acumulados</p>
                    </div>

                    <!-- Card Média -->
                    <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-3xl">📊</span>
                            <p class="text-green-400 text-sm font-semibold uppercase">Média</p>
                        </div>
                        <p class="text-4xl font-bold text-white mb-2">${mediapontos}</p>
                        <p class="text-gray-400 text-sm">por rodada</p>
                    </div>

                    <!-- Card Última Rodada -->
                    <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-3xl">⚡</span>
                            <p class="text-purple-400 text-sm font-semibold uppercase">Última Rodada</p>
                        </div>
                        <p class="text-4xl font-bold text-white mb-2">${rodadaAtual}</p>
                        <p class="text-gray-400 text-sm">${pontosUltimaRodada} pontos</p>
                    </div>

                </div>

                <!-- Resumo -->
                <div class="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30">
                    <h3 class="text-xl font-bold text-white mb-4">📊 Resumo</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center p-4 bg-gray-800/30 rounded-xl">
                            <span class="text-gray-300">Rodadas Jogadas</span>
                            <span class="text-white font-bold text-lg">${minhasRodadas.length || 0}</span>
                        </div>
                        <div class="flex justify-between items-center p-4 bg-gray-800/30 rounded-xl">
                            <span class="text-gray-300">Média de Pontos</span>
                            <span class="text-white font-bold text-lg">${mediapontos}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');