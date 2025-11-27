
// PARTICIPANTE BOAS-VINDAS - Módulo Moderno com Design Profissional

console.log('[BOAS-VINDAS] 🚀 Carregando módulo moderno...');

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
            timeId,
            minhasRodadas
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
            timeId: timeId,
            minhasRodadas: []
        });
    }
};

async function renderizarBoasVindas({ posicao, totalParticipantes, pontosTotal, saldoFinanceiro, ultimaRodada, meuTime, timeData, timeId, minhasRodadas }) {
    const container = document.getElementById('boas-vindas-container');
    if (!container) return;

    // Aguardar carregamento de fontes
    await aguardarFontes();

    const nomeTime = meuTime?.nome_time || timeData?.nome_time || 'Seu Time';
    const nomeCartola = meuTime?.nome_cartola || timeData?.nome_cartola || 'Cartoleiro';
    const clubeId = timeData?.clube_id || meuTime?.clube_id || null;
    
    const posTexto = posicao === '-' ? '--' : `${posicao}º`;
    const pontosFormatados = pontosTotal > 0 ? pontosTotal.toFixed(1) : '--';
    const saldoFormatado = formatarSaldo(saldoFinanceiro);
    const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : '--';
    const pontosUltimaRodada = ultimaRodada ? ultimaRodada.pontos.toFixed(1) : '--';
    const mediapontos = minhasRodadas.length > 0 ? (pontosTotal / minhasRodadas.length).toFixed(1) : '--';

    container.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6 lg:p-8">
            <div class="max-w-7xl mx-auto">
                
                <!-- Header Profissional com Avatar -->
                <div class="mb-8 bg-gradient-to-r from-primary/10 via-primary-dark/5 to-accent/10 backdrop-blur-xl rounded-3xl p-8 border border-primary/20 shadow-2xl">
                    <div class="flex items-center gap-6">
                        <div class="relative">
                            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent p-1 shadow-2xl">
                                <div class="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                                    <span class="text-4xl font-bold text-white">${getInitials(nomeCartola)}</span>
                                </div>
                            </div>
                            ${clubeId ? `
                                <img src="/escudos/${clubeId}.png" 
                                     onerror="this.src='/escudos/default.png'"
                                     class="absolute -bottom-2 -right-2 w-12 h-12 rounded-full border-4 border-gray-900 shadow-xl">
                            ` : ''}
                        </div>
                        <div class="flex-1">
                            <h1 class="text-3xl md:text-4xl font-black text-white mb-2">${nomeTime}</h1>
                            <p class="text-lg text-gray-400 font-medium">${nomeCartola}</p>
                        </div>
                        <div class="hidden md:flex items-center gap-3 px-5 py-3 bg-green-500/20 rounded-2xl border border-green-500/40 shadow-lg">
                            <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                            <span class="text-green-400 font-bold">Online</span>
                        </div>
                    </div>
                </div>

                <!-- Welcome Message com Material Icon -->
                <div class="text-center mb-10 animate-fade-in">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-5 shadow-2xl shadow-primary/30">
                        <span style="font-size: 48px;">📊</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-black text-white mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Bem-vindo ao Dashboard!
                    </h2>
                    <p class="text-gray-400 text-xl font-medium">Acompanhe seu desempenho em tempo real</p>
                </div>

                <!-- Stats Grid PROFISSIONAL -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    
                    <!-- Card Posição - PROFISSIONAL -->
                    <div class="group relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-xl rounded-3xl p-8 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                        <div class="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl group-hover:bg-yellow-500/10 transition-all duration-500"></div>
                        <div class="relative">
                            <div class="flex items-center justify-between mb-6">
                                <div class="p-4 bg-yellow-500/10 rounded-2xl shadow-lg">
                                    <span class="text-yellow-400" style="font-size: 32px;">🏆</span>
                                </div>
                                <span class="text-yellow-500/20" style="font-size: 48px;">⭐</span>
                            </div>
                            <p class="text-yellow-400/60 text-sm font-bold uppercase tracking-wider mb-2">Posição</p>
                            <p class="text-5xl font-black text-white mb-2">${posTexto}</p>
                            <p class="text-gray-400 text-sm font-medium">de ${totalParticipantes} times</p>
                        </div>
                    </div>

                    <!-- Card Pontos - PROFISSIONAL -->
                    <div class="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                        <div class="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
                        <div class="relative">
                            <div class="flex items-center justify-between mb-6">
                                <div class="p-4 bg-blue-500/10 rounded-2xl shadow-lg">
                                    <span class="text-blue-400" style="font-size: 32px;">📈</span>
                                </div>
                                <span class="text-blue-500/20" style="font-size: 48px;">💡</span>
                            </div>
                            <p class="text-blue-400/60 text-sm font-bold uppercase tracking-wider mb-2">Pontos Total</p>
                            <p class="text-5xl font-black text-white mb-2">${pontosFormatados}</p>
                            <p class="text-gray-400 text-sm font-medium">acumulados</p>
                        </div>
                    </div>

                    <!-- Card Saldo - PROFISSIONAL -->
                    <div class="group relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl rounded-3xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
                        <div class="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-500"></div>
                        <div class="relative">
                            <div class="flex items-center justify-between mb-6">
                                <div class="p-4 bg-green-500/10 rounded-2xl shadow-lg">
                                    <span class="text-green-400" style="font-size: 32px;">💰</span>
                                </div>
                                <span class="text-green-500/20" style="font-size: 48px;">🏦</span>
                            </div>
                            <p class="text-green-400/60 text-sm font-bold uppercase tracking-wider mb-2">Saldo</p>
                            <p class="text-5xl font-black ${saldoFinanceiro >= 0 ? 'text-green-400' : 'text-red-400'} mb-2">${saldoFormatado}</p>
                            <p class="text-gray-400 text-sm font-medium">${saldoFinanceiro >= 0 ? 'a receber' : 'a pagar'}</p>
                        </div>
                    </div>

                    <!-- Card Última Rodada - PROFISSIONAL -->
                    <div class="group relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                        <div class="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all duration-500"></div>
                        <div class="relative">
                            <div class="flex items-center justify-between mb-6">
                                <div class="p-4 bg-purple-500/10 rounded-2xl shadow-lg">
                                    <span class="text-purple-400" style="font-size: 32px;">⚡</span>
                                </div>
                                <span class="text-purple-500/20" style="font-size: 48px;">⚽</span>
                            </div>
                            <p class="text-purple-400/60 text-sm font-bold uppercase tracking-wider mb-2">Última Rodada</p>
                            <p class="text-5xl font-black text-white mb-2">${rodadaAtual}</p>
                            <p class="text-gray-400 text-sm font-medium">${pontosUltimaRodada} pontos</p>
                        </div>
                    </div>

                </div>

                <!-- Cards Secundários PROFISSIONAIS -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- Performance Card -->
                    <div class="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/30 shadow-2xl">
                        <div class="flex items-center gap-4 mb-8">
                            <div class="p-3 bg-primary/10 rounded-xl">
                                <span class="text-primary" style="font-size: 28px;">📊</span>
                            </div>
                            <h3 class="text-2xl font-black text-white">Desempenho</h3>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center p-5 bg-gray-800/30 rounded-2xl border border-gray-700/20 hover:border-primary/20 transition-all">
                                <div class="flex items-center gap-3">
                                    <span class="text-primary/60" style="font-size: 20px;">🧮</span>
                                    <span class="text-gray-300 font-medium">Média de Pontos</span>
                                </div>
                                <span class="text-white font-black text-xl">${mediapontos}</span>
                            </div>
                            <div class="flex justify-between items-center p-5 bg-gray-800/30 rounded-2xl border border-gray-700/20 hover:border-primary/20 transition-all">
                                <div class="flex items-center gap-3">
                                    <span class="text-primary/60" style="font-size: 20px;">📅</span>
                                    <span class="text-gray-300 font-medium">Rodadas Jogadas</span>
                                </div>
                                <span class="text-white font-black text-xl">${minhasRodadas.length || 0}</span>
                            </div>
                            <div class="flex justify-between items-center p-5 bg-gray-800/30 rounded-2xl border border-gray-700/20 hover:border-primary/20 transition-all">
                                <div class="flex items-center gap-3">
                                    <span class="text-primary/60" style="font-size: 20px;">📈</span>
                                    <span class="text-gray-300 font-medium">Tendência</span>
                                </div>
                                <span class="text-green-400" style="font-size: 28px;">📈</span>
                            </div>
                        </div>
                    </div>

                    <!-- Time do Coração Card -->
                    <div class="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/30 shadow-2xl">
                        <div class="flex items-center gap-4 mb-8">
                            <div class="p-3 bg-red-500/10 rounded-xl">
                                <span class="text-red-500" style="font-size: 28px;">❤️</span>
                            </div>
                            <h3 class="text-2xl font-black text-white">Time do Coração</h3>
                        </div>
                        <div id="timeCoracaoCard" class="flex items-center justify-center min-h-[160px]">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                        </div>
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
                <div class="text-center text-gray-500 py-8">
                    <span class="mb-4" style="font-size: 64px;">⚽</span>
                    <p class="text-lg font-medium">Nenhum time definido</p>
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
            timeCoracaoCard.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <span class="mb-4" style="font-size: 64px;">⚠️</span>
                    <p class="text-lg font-medium">Clube não encontrado</p>
                </div>
            `;
            return;
        }

        timeCoracaoCard.innerHTML = `
            <div class="flex items-center gap-6 p-6 bg-gray-800/30 rounded-2xl border border-gray-700/20">
                <img src="/escudos/${clube.id}.png"
                     alt="${clube.nome}"
                     class="w-20 h-20 rounded-full shadow-2xl border-4 border-gray-700/50"
                     onerror="this.src='/escudos/placeholder.png'">
                <div class="flex-1">
                    <h4 class="text-2xl font-black text-white mb-2">${clube.nome}</h4>
                    <p class="text-gray-400 font-medium">${clube.abreviacao || clube.nome_fantasia || 'N/D'}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time:', error);
        timeCoracaoCard.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <span class="mb-4" style="font-size: 64px;">❌</span>
                <p class="text-lg font-medium">Erro ao carregar</p>
            </div>
        `;
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

// Aguardar carregamento de fontes do Material Icons
async function aguardarFontes() {
    try {
        await document.fonts.ready;
        console.log('[BOAS-VINDAS] ✅ Fontes carregadas');
    } catch (error) {
        console.warn('[BOAS-VINDAS] ⚠️ Erro ao carregar fontes, usando fallback');
    }
}

console.log('[BOAS-VINDAS] ✅ Módulo moderno carregado com design profissional');
