
// PARTICIPANTE BOAS-VINDAS - Módulo de Inicialização com Dados Reais

console.log('[BOAS-VINDAS] Carregando módulo...');

window.inicializarBoasVindas = async function(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar dados em paralelo
        const [resRanking, resRodadas, resExtrato] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/participante/extrato/${timeId}/${ligaId}`)
        ]);

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const extrato = resExtrato.ok ? await resExtrato.json() : { total: 0 };

        // Processar dados
        const posicao = ranking.findIndex(t => parseInt(t.time_id) === parseInt(timeId)) + 1 || '-';
        const meuTime = ranking.find(t => parseInt(t.time_id) === parseInt(timeId));
        
        // Última rodada do usuário
        const minhasRodadas = rodadas.filter(r => String(r.timeId) === String(timeId));
        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];
        
        // Melhor rodada
        const melhorRodada = minhasRodadas.reduce((max, r) => {
            const pontosMax = (max.pontos || 0);
            const pontos = (r.pontos || 0);
            return pontos > pontosMax ? r : max;
        }, minhasRodadas[0] || {});
        
        // Média de pontos
        const mediaRodadas = minhasRodadas.length > 0 
            ? minhasRodadas.reduce((sum, r) => sum + (r.pontos || 0), 0) / minhasRodadas.length 
            : 0;

        preencherBoasVindas(
            posicao,
            extrato.total || 0,
            melhorRodada.pontos || 0,
            mediaRodadas,
            ultimaRodada,
            minhasRodadas,
            meuTime
        );

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro:', error);
        // Usar dados padrão
        preencherBoasVindas('-', 0, 0, 0, null, [], null);
    }
};

function preencherBoasVindas(posicao, saldo, melhorPontos, media, ultimaRodada, todasRodadas, meuTime) {
    // Atualizar posição
    const posElement = document.getElementById('posicaoAtual');
    if (posElement) {
        posElement.textContent = posicao === '-' ? '-' : `${posicao}º lugar`;
    }

    // Atualizar saldo
    const saldoElement = document.getElementById('saldoExtrato');
    if (saldoElement) {
        const saldoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(saldo);
        saldoElement.textContent = saldoFormatado;
    }

    // Melhor rodada
    const melhorElement = document.getElementById('melhorRodada');
    if (melhorElement) {
        melhorElement.textContent = melhorPontos.toFixed(2);
    }

    // Média
    const mediaElement = document.getElementById('mediaPontos');
    if (mediaElement) {
        mediaElement.textContent = media.toFixed(2);
    }

    // Última rodada
    if (ultimaRodada) {
        const numElement = document.getElementById('ultimaRodadaNum');
        if (numElement) numElement.textContent = ultimaRodada.rodada;

        const pontosElement = document.getElementById('pontosUltimaRodada');
        if (pontosElement) pontosElement.textContent = `${ultimaRodada.pontos?.toFixed(2) || '-'} pts`;

        const posicaoElement = document.getElementById('posicaoUltimaRodada');
        if (posicaoElement) {
            posicaoElement.textContent = ultimaRodada.posicaoFinanceira ? `${ultimaRodada.posicaoFinanceira}º` : '-';
        }

        const variacaoElement = document.getElementById('variacaoPosicao');
        if (variacaoElement) variacaoElement.textContent = '→';
    }

    // Buscar informações do time do coração
    if (meuTime && meuTime.clube_id) {
        buscarInfoTimeCoracao(meuTime.clube_id);
    } else {
        const timeCoracaoElement = document.getElementById('timeCoracaoInfo');
        if (timeCoracaoElement && meuTime) {
            timeCoracaoElement.innerHTML = `
                <strong>${meuTime.nome || 'Seu Time'}</strong>
                <p>Time selecionado no Cartola FC</p>
            `;
        }
    }
}

async function buscarInfoTimeCoracao(clubeId) {
    const timeCoracaoCard = document.getElementById('timeCoracaoCard');
    
    try {
        // Buscar informações do clube
        const response = await fetch(`/api/clubes`);
        if (!response.ok) throw new Error('Erro ao buscar clubes');
        
        const clubes = await response.json();
        const clube = clubes.find(c => c.id === clubeId);
        
        if (!clube) {
            timeCoracaoCard.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px;">
                    <p>Informações do time não disponíveis</p>
                </div>
            `;
            return;
        }

        // Buscar informações públicas do time (placares recentes, etc)
        timeCoracaoCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px; padding: 20px;">
                <img src="/escudos/${clubeId}.png" 
                     alt="${clube.nome}"
                     style="width: 80px; height: 80px; border-radius: 50%;"
                     onerror="this.src='/escudos/placeholder.png'">
                <div style="flex: 1;">
                    <h3 style="color: #fff; margin-bottom: 10px; font-size: 20px;">
                        ${clube.nome}
                    </h3>
                    <p style="color: #999; font-size: 14px; margin-bottom: 5px;">
                        <strong>Abreviação:</strong> ${clube.abreviacao || 'N/D'}
                    </p>
                    <p style="color: #999; font-size: 14px;">
                        <strong>ID:</strong> ${clube.id}
                    </p>
                    <p style="color: #22c55e; font-size: 12px; margin-top: 10px;">
                        ✓ Time selecionado no Cartola FC
                    </p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time do coração:', error);
        timeCoracaoCard.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px;">
                <p>❌ Erro ao carregar informações do time</p>
            </div>
        `;
    }
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');
