
// PARTICIPANTE BOAS-VINDAS - Módulo Moderno com Tailwind

console.log('[BOAS-VINDAS] 🚀 Carregando módulo moderno...');

window.inicializarBoasVindas = async function(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const [resRanking, resRodadas, resFluxo, resTime] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/fluxo-financeiro/${ligaId}`),
            fetch(`/api/times/${timeId}`)
        ]);

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const fluxoData = resFluxo.ok ? await resFluxo.json() : [];
        const timeData = resTime.ok ? await resTime.json() : null;

        const meuTimeIdNum = Number(timeId);
        const meuTime = ranking.find(t => Number(t.timeId) === meuTimeIdNum);
        const posicao = meuTime ? meuTime.posicao : '-';
        const totalParticipantes = ranking.length;

        const minhasRodadasParaPontos = rodadas.filter(r => String(r.timeId) === String(timeId) || String(r.time_id) === String(timeId));
        const pontosTotal = minhasRodadasParaPontos.reduce((total, rodada) => {
            return total + (parseFloat(rodada.pontos) || 0);
        }, 0);

        let saldoFinanceiro = 0;
        try {
            const resCampos = await fetch(`/api/fluxo-financeiro/${ligaId}/times/${timeId}`);
            if (resCampos.ok) {
                const camposData = await resCampos.json();
                if (camposData.campos && Array.isArray(camposData.campos)) {
                    saldoFinanceiro = camposData.campos.reduce((total, campo) => {
                        return total + (parseFloat(campo.valor) || 0);
                    }, 0);
                }
            }
        } catch (error) {
            console.error('[BOAS-VINDAS] Erro ao buscar saldo:', error);
        }

        const minhasRodadas = rodadas.filter(r => Number(r.timeId) === meuTimeIdNum);
        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        renderizarBoasVindas({
            posicao,
            totalParticipantes,
            pontosTotal,
            saldoFinanceiro,
            ultimaRodada,
            meuTime,
            timeData,
            timeId
        });

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro:', error);
        renderizarBoasVindas({
            posicao: '-',
            totalParticipantes: '-',
            pontosTotal: 0,
            saldoFinanceiro: 0,
            ultimaRodada: null,
            meuTime: null,
            timeData: null,
            timeId: timeId
        });
    }
};

function renderizarBoasVindas({ posicao, totalParticipantes, pontosTotal, saldoFinanceiro, ultimaRodada, meuTime, timeData, timeId }) {
    const container = document.getElementById('boas-vindas-container');
    if (!container) return;

    const nomeTime = meuTime?.nome_time || timeData?.nome_time || 'Seu Time';
    const nomeCartola = meuTime?.nome_cartola || timeData?.nome_cartola || 'Cartoleiro';
    const clubeId = timeData?.clube_id || meuTime?.clube_id || null;
    
    const posTexto = posicao === '-' ? '--' : `${posicao}º`;
    const pontosFormatados = pontosTotal > 0 ? pontosTotal.toFixed(1) : '--';
    const saldoFormatado = formatarSaldo(saldoFinanceiro);
    const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : '--';
    const pontosUltimaRodada = ultimaRodada ? ultimaRodada.pontos.toFixed(1) : '--';

    container.innerHTML = `
        <div class="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            
            <!-- Header com Avatar -->
            <div class="mb-8 bg-gradient-to-r from-primary/20 via-primary-dark/20 to-accent/20 backdrop-blur-xl rounded-3xl p-6 border border-primary/30 shadow-2xl">
                <div class="flex items-center gap-6">
                    <div class="relative">
                        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent p-1">
                            <div class="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-3xl font-bold text-white">
                                ${getInitials(nomeCartola)}
                            </div>
                        </div>
                        ${clubeId ? `
                            <img src="/escudos/${clubeId}.png" 
                                 onerror="this.src='/escudos/default.png'"
                                 class="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-gray-900 shadow-lg">
                        ` : ''}
                    </div>
                    <div class="flex-1">
                        <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">${nomeTime}</h1>
                        <p class="text-gray-400">${nomeCartola}</p>
                    </div>
                    <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/50">
                        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span class="text-green-400 text-sm font-medium">Online</span>
                    </div>
                </div>
            </div>

            <!-- Welcome Message -->
            <div class="text-center mb-8 animate-fade-in">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 shadow-lg">
                    <span class="material-icons-outlined text-white text-4xl">sports_soccer</span>
                </div>
                <h2 class="text-3xl md:text-4xl font-bold text-white mb-2">Bem-vindo ao Dashboard!</h2>
                <p class="text-gray-400 text-lg">Acompanhe seu desempenho em tempo real</p>
            </div>

            <!-- Stats Grid Moderno -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                
                <!-- Card Posição -->
                <div class="group relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl group-hover:bg-yellow-500/10 transition-all"></div>
                    <div class="relative">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-3 bg-yellow-500/20 rounded-xl">
                                <span class="material-icons-outlined text-yellow-400 text-2xl">emoji_events</span>
                            </div>
                            <span class="text-yellow-400/80 text-sm font-medium">Posição</span>
                        </div>
                        <p class="text-4xl font-bold text-white mb-1">${posTexto}</p>
                        <p class="text-gray-400 text-sm">de ${totalParticipantes} times</p>
                    </div>
                </div>

                <!-- Card Pontos -->
                <div class="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
                    <div class="relative">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-3 bg-blue-500/20 rounded-xl">
                                <span class="material-icons-outlined text-blue-400 text-2xl">bar_chart</span>
                            </div>
                            <span class="text-blue-400/80 text-sm font-medium">Pontos</span>
                        </div>
                        <p class="text-4xl font-bold text-white mb-1">${pontosFormatados}</p>
                        <p class="text-gray-400 text-sm">total acumulado</p>
                    </div>
                </div>

                <!-- Card Saldo -->
                <div class="group relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 hover:border-green-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all"></div>
                    <div class="relative">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-3 bg-green-500/20 rounded-xl">
                                <span class="material-icons-outlined text-green-400 text-2xl">account_balance_wallet</span>
                            </div>
                            <span class="text-green-400/80 text-sm font-medium">Saldo</span>
                        </div>
                        <p class="text-4xl font-bold ${saldoFinanceiro >= 0 ? 'text-green-400' : 'text-red-400'} mb-1">${saldoFormatado}</p>
                        <p class="text-gray-400 text-sm">${saldoFinanceiro >= 0 ? 'a receber' : 'a pagar'}</p>
                    </div>
                </div>

                <!-- Card Rodada -->
                <div class="group relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all"></div>
                    <div class="relative">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-3 bg-orange-500/20 rounded-xl">
                                <span class="material-icons-outlined text-orange-400 text-2xl">bolt</span>
                            </div>
                            <span class="text-orange-400/80 text-sm font-medium">Última Rodada</span>
                        </div>
                        <p class="text-4xl font-bold text-white mb-1">${rodadaAtual}</p>
                        <p class="text-gray-400 text-sm">${pontosUltimaRodada} pontos</p>
                    </div>
                </div>

            </div>

            <!-- Cards Adicionais -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <!-- Performance Card -->
                <div class="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                    <div class="flex items-center gap-3 mb-6">
                        <span class="material-icons-outlined text-primary text-2xl">show_chart</span>
                        <h3 class="text-xl font-bold text-white">Desempenho</h3>
                    </div>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                            <span class="text-gray-400">Média de Pontos</span>
                            <span class="text-white font-bold">${ultimaRodada ? (pontosTotal / minhasRodadas.length).toFixed(1) : '--'}</span>
                        </div>
                        <div class="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                            <span class="text-gray-400">Rodadas Jogadas</span>
                            <span class="text-white font-bold">${minhasRodadas.length || 0}</span>
                        </div>
                        <div class="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                            <span class="text-gray-400">Tendência</span>
                            <span class="material-icons-outlined text-green-400">trending_up</span>
                        </div>
                    </div>
                </div>

                <!-- Time do Coração -->
                <div class="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                    <div class="flex items-center gap-3 mb-6">
                        <span class="material-icons-outlined text-primary text-2xl">favorite</span>
                        <h3 class="text-xl font-bold text-white">Time do Coração</h3>
                    </div>
                    <div id="timeCoracaoCard" class="flex items-center justify-center min-h-[120px]">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>

            </div>

        </div>
    `;

    // Buscar time do coração
    if (clubeId) {
        buscarInfoTimeCoracao(clubeId);
    } else {
        const timeCoracaoCard = document.getElementById('timeCoracaoCard');
        if (timeCoracaoCard) {
            timeCoracaoCard.innerHTML = `
                <div class="text-center text-gray-500">
                    <span class="material-icons-outlined text-4xl mb-2">sports_soccer</span>
                    <p>Nenhum time definido</p>
                </div>
            `;
        }
    }
}

async function buscarInfoTimeCoracao(clubeId) {
    const timeCoracaoCard = document.getElementById('timeCoracaoCard');
    if (!timeCoracaoCard) return;

    try {
        const response = await fetch(`/api/cartola/clubes`);
        if (!response.ok) throw new Error('Erro ao buscar clubes');

        const clubes = await response.json();
        const clube = Object.values(clubes).find(c => c.id === parseInt(clubeId));

        if (!clube) {
            timeCoracaoCard.innerHTML = `<div class="text-center text-gray-500"><p>Clube não encontrado</p></div>`;
            return;
        }

        timeCoracaoCard.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="/escudos/${clube.id}.png"
                     alt="${clube.nome}"
                     class="w-16 h-16 rounded-full shadow-lg"
                     onerror="this.src='/escudos/placeholder.png'">
                <div class="flex-1">
                    <h4 class="text-lg font-bold text-white mb-1">${clube.nome}</h4>
                    <p class="text-sm text-gray-400">${clube.abreviacao || clube.nome_fantasia || 'N/D'}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time:', error);
        timeCoracaoCard.innerHTML = `<div class="text-center text-red-500"><p>Erro ao carregar</p></div>`;
    }
}

function formatarSaldo(valor) {
    const abs = Math.abs(valor);
    if (abs >= 1000) {
        return 'R$ ' + (valor / 1000).toFixed(1) + 'K';
    } else if (abs > 0) {
        return 'R$ ' + valor.toFixed(0);
    }
    return 'R$ 0';
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

console.log('[BOAS-VINDAS] ✅ Módulo moderno carregado');
