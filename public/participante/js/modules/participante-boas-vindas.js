
// MÓDULO: BOAS-VINDAS PARTICIPANTE
console.log('[BOAS-VINDAS-PARTICIPANTE] 🔄 Carregando módulo...');

export async function inicializarBoasVindasParticipante({ participante, ligaId, timeId }) {
    console.log('[BOAS-VINDAS-PARTICIPANTE] Inicializando:', { participante, ligaId, timeId });

    if (!ligaId || !timeId) {
        console.error('[BOAS-VINDAS-PARTICIPANTE] ❌ Parâmetros inválidos');
        mostrarErro('Dados inválidos para carregar resumo');
        return;
    }

    try {
        // Buscar dados do mercado (rodada atual)
        const statusMercado = await fetch('/api/cartola/mercado/status');
        const { rodada_atual, mercado_aberto } = await statusMercado.json();
        const ultimaRodadaCompleta = mercado_aberto ? Math.max(1, rodada_atual - 1) : rodada_atual;

        console.log(`[BOAS-VINDAS-PARTICIPANTE] 📊 Rodada: ${ultimaRodadaCompleta} | Mercado: ${mercado_aberto ? 'ABERTO' : 'FECHADO'}`);

        // Buscar dados em paralelo
        const [dadosTime, ranking, extratoCache] = await Promise.all([
            fetch(`/api/times/${timeId}`).then(r => r.json()),
            fetch(`/api/ligas/${ligaId}/ranking`).then(r => r.json()),
            fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaCompleta}`).then(r => r.json())
        ]);

        // Processar dados
        const minhaClassificacao = ranking.findIndex(t => String(t.time_id) === String(timeId)) + 1;
        const totalParticipantes = ranking.length;
        const meusPontos = ranking.find(t => String(t.time_id) === String(timeId))?.pontos_total || 0;

        // Extrair saldo do cache do extrato
        let saldo = 0;
        if (extratoCache?.cached && extratoCache?.data?.resumo) {
            saldo = extratoCache.data.resumo.saldo || 0;
        }

        // Renderizar interface
        renderizarBoasVindas({
            nomeTime: dadosTime.nome || participante?.nome_time || 'Meu Time',
            nomeCartola: dadosTime.nome_cartola || participante?.nome_cartola || 'Cartoleiro',
            clubeId: dadosTime.clube_id,
            posicao: minhaClassificacao,
            totalTimes: totalParticipantes,
            pontos: meusPontos,
            saldo: saldo,
            rodadaAtual: ultimaRodadaCompleta
        });

        console.log('[BOAS-VINDAS-PARTICIPANTE] ✅ Módulo inicializado');

    } catch (error) {
        console.error('[BOAS-VINDAS-PARTICIPANTE] ❌ Erro:', error);
        mostrarErro(error.message);
    }
}

function renderizarBoasVindas(dados) {
    const container = document.getElementById('boas-vindas-container');
    if (!container) {
        console.error('[BOAS-VINDAS-PARTICIPANTE] Container não encontrado');
        return;
    }

    // Determinar status do saldo
    let statusClass = 'neutro';
    let statusIcon = '💰';
    let statusTexto = 'NEUTRO';
    
    if (dados.saldo > 0) {
        statusClass = 'positivo';
        statusIcon = '💰';
        statusTexto = 'A RECEBER';
    } else if (dados.saldo < 0) {
        statusClass = 'negativo';
        statusIcon = '💸';
        statusTexto = 'A PAGAR';
    }

    // Determinar zona de classificação
    let zonaClass = '';
    let zonaTexto = '';
    const percentualPosicao = (dados.posicao / dados.totalTimes) * 100;

    if (dados.posicao === 1) {
        zonaClass = 'zona-lider';
        zonaTexto = '👑 LÍDER';
    } else if (dados.posicao <= 3) {
        zonaClass = 'zona-podio';
        zonaTexto = '🏆 PÓDIO';
    } else if (percentualPosicao <= 30) {
        zonaClass = 'zona-classificacao';
        zonaTexto = '💰 ZONA DE GANHO';
    } else if (percentualPosicao <= 70) {
        zonaClass = 'zona-neutra';
        zonaTexto = '😐 ZONA NEUTRA';
    } else {
        zonaClass = 'zona-rebaixamento';
        zonaTexto = '💸 ZONA DE PERDA';
    }

    container.innerHTML = `
        <div class="container mx-auto p-6 max-w-4xl">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-white mb-2">Bem-vindo de volta!</h1>
                <p class="text-gray-400">${dados.nomeCartola}</p>
            </div>

            <!-- Card Principal: Saldo -->
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border-2 ${statusClass === 'positivo' ? 'border-green-500' : statusClass === 'negativo' ? 'border-red-500' : 'border-gray-600'}">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${statusIcon}</span>
                        <div>
                            <p class="text-sm text-gray-400 uppercase tracking-wider font-bold">${statusTexto}</p>
                            <p class="text-xs text-gray-500">Até a rodada ${dados.rodadaAtual}</p>
                        </div>
                    </div>
                </div>
                
                <div class="text-5xl font-black ${statusClass === 'positivo' ? 'text-green-400' : statusClass === 'negativo' ? 'text-red-400' : 'text-gray-400'} mb-2">
                    ${dados.saldo >= 0 ? '+' : ''}R$ ${Math.abs(dados.saldo).toFixed(2).replace('.', ',')}
                </div>
                
                <div class="text-sm text-gray-500">
                    ${dados.saldo > 0 ? '🎉 Você está ganhando!' : dados.saldo < 0 ? '⚠️ Você está devendo' : '➖ Saldo zerado'}
                </div>
            </div>

            <!-- Grid de Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <!-- Card: Classificação -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 ${zonaClass}">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-2xl">📊</span>
                        <div>
                            <p class="text-sm text-gray-400 uppercase tracking-wider font-bold">Classificação</p>
                            <p class="text-xs text-gray-500">${zonaTexto}</p>
                        </div>
                    </div>
                    <div class="text-4xl font-black text-primary mb-1">
                        ${dados.posicao}º
                    </div>
                    <div class="text-sm text-gray-500">
                        de ${dados.totalTimes} times
                    </div>
                </div>

                <!-- Card: Pontuação -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-2xl">⭐</span>
                        <div>
                            <p class="text-sm text-gray-400 uppercase tracking-wider font-bold">Pontos Totais</p>
                            <p class="text-xs text-gray-500">Acumulado</p>
                        </div>
                    </div>
                    <div class="text-4xl font-black text-blue-400 mb-1">
                        ${dados.pontos.toFixed(2).replace('.', ',')}
                    </div>
                    <div class="text-sm text-gray-500">
                        pontos na liga
                    </div>
                </div>
            </div>

            <!-- Informações do Time -->
            <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div class="flex items-center gap-4">
                    ${dados.clubeId ? `
                        <img src="/escudos/${dados.clubeId}.png" 
                             alt="Escudo" 
                             class="w-16 h-16 rounded-lg"
                             onerror="this.src='/escudos/placeholder.png'">
                    ` : `
                        <div class="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                            ⚽
                        </div>
                    `}
                    <div class="flex-1">
                        <h2 class="text-2xl font-bold text-white mb-1">${dados.nomeTime}</h2>
                        <p class="text-gray-400">${dados.nomeCartola}</p>
                    </div>
                </div>
            </div>

            <!-- Dica -->
            <div class="mt-6 bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                <div class="flex items-start gap-3">
                    <span class="text-2xl">💡</span>
                    <div>
                        <p class="text-sm text-blue-300 font-semibold mb-1">Dica</p>
                        <p class="text-xs text-blue-200">
                            Use o menu inferior para navegar entre os módulos e acompanhar seu desempenho em tempo real.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('boas-vindas-container');
    if (container) {
        container.innerHTML = `
            <div class="container mx-auto p-6 max-w-4xl">
                <div class="bg-red-900/30 border border-red-500 rounded-xl p-6 text-center">
                    <div class="text-5xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold text-red-400 mb-2">Erro ao Carregar</h3>
                    <p class="text-gray-300 mb-4">${mensagem}</p>
                    <button onclick="window.location.reload()" 
                            class="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold">
                        🔄 Recarregar Página
                    </button>
                </div>
            </div>
        `;
    }
}

// Expor globalmente
window.inicializarBoasVindasParticipante = inicializarBoasVindasParticipante;

console.log('[BOAS-VINDAS-PARTICIPANTE] ✅ Módulo carregado');
