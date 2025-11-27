
// PARTICIPANTE BOAS-VINDAS - Versão Mobile Original

console.log('[BOAS-VINDAS] 🚀 Carregando módulo...');

export async function inicializarBoasVindas(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);
    await inicializarBoasVindasInterno(ligaId, timeId);
}

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
        const posicao = meuTime ? meuTime.posicao : '--';
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
            posicao: '--',
            totalParticipantes: '--',
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
    const fotoTime = meuTime?.foto_time || timeData?.foto_time || '';
    
    const posTexto = posicao === '--' ? '--' : `${posicao}º`;
    const pontosFormatados = pontosTotal > 0 ? pontosTotal.toFixed(1) : '--';
    const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : '--';
    const pontosUltimaRodada = ultimaRodada ? ultimaRodada.pontos.toFixed(1) : '--';
    const mediapontos = minhasRodadas.length > 0 ? (pontosTotal / minhasRodadas.length).toFixed(1) : '--';
    
    // Cálculo de variação e tendência
    let variacao = '--';
    let tendencia = 'stable';
    if (minhasRodadas.length >= 2) {
        const rodadasOrdenadas = minhasRodadas.sort((a, b) => b.rodada - a.rodada);
        const ultima = parseFloat(rodadasOrdenadas[0].pontos) || 0;
        const penultima = parseFloat(rodadasOrdenadas[1].pontos) || 0;
        const diff = ultima - penultima;
        variacao = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
        tendencia = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
    }
    
    const posicaoAnterior = '--';

    container.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <!-- Header -->
            <div class="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 p-4 sticky top-0 z-10">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-red-500/50 bg-gray-800">
                            ${fotoTime ? `<img src="${fotoTime}" alt="${nomeTime}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-2xl">⚽</div>`}
                        </div>
                        <div>
                            <h1 class="text-white font-bold text-lg">${nomeTime}</h1>
                            <p class="text-gray-400 text-sm">${nomeCartola}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span class="text-green-500 text-sm font-medium">Online</span>
                    </div>
                </div>
            </div>

            <div class="p-4 pb-24">
                <!-- Welcome Message -->
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                        <span>⚽</span>
                        Bem-vindo(a) ao Painel
                    </h2>
                    <p class="text-gray-400 text-sm">Acompanhe seu desempenho em tempo real</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <!-- Posição -->
                    <div class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-xl rounded-2xl p-4 border border-yellow-500/20">
                        <div class="text-3xl mb-2">🏆</div>
                        <div class="text-3xl font-bold text-white mb-1">${posTexto}</div>
                        <div class="text-yellow-400 text-xs font-semibold uppercase">POSIÇÃO</div>
                    </div>

                    <!-- Pontos -->
                    <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/20">
                        <div class="text-3xl mb-2">📊</div>
                        <div class="text-3xl font-bold text-white mb-1">${pontosFormatados}</div>
                        <div class="text-blue-400 text-xs font-semibold uppercase">PONTOS</div>
                    </div>

                    <!-- Saldo -->
                    <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20">
                        <div class="text-3xl mb-2">💰</div>
                        <div class="text-3xl font-bold text-white mb-1">R$ 0</div>
                        <div class="text-green-400 text-xs font-semibold uppercase">SALDO</div>
                    </div>

                    <!-- Rodada -->
                    <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
                        <div class="text-3xl mb-2">⚡</div>
                        <div class="text-3xl font-bold text-white mb-1">${pontosUltimaRodada}</div>
                        <div class="text-purple-400 text-xs font-semibold uppercase">R-${rodadaAtual}</div>
                    </div>
                </div>

                <!-- Seu Desempenho -->
                <div class="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/30">
                    <h3 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span>📈</span>
                        Seu Desempenho
                    </h3>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-400">Posição anterior:</span>
                            <span class="text-white font-semibold">${posicaoAnterior}</span>
                        </div>
                        
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-400">Variação:</span>
                            <span class="text-white font-semibold">${variacao}</span>
                        </div>
                        
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-400">Tendência:</span>
                            <div class="flex items-center gap-1">
                                ${tendencia === 'up' ? '<span class="text-green-500">📈</span>' : 
                                  tendencia === 'down' ? '<span class="text-red-500">📉</span>' : 
                                  '<span class="text-gray-400">➡️</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');
