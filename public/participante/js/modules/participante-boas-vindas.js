// PARTICIPANTE BOAS-VINDAS - Módulo de Inicialização com Dados Reais

console.log('[BOAS-VINDAS] Carregando módulo...');

window.inicializarBoasVindas = async function(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar dados em paralelo
        const [resRanking, resRodadas, resFluxo] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/fluxo-financeiro/${ligaId}`)
        ]);

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const fluxoData = resFluxo.ok ? await resFluxo.json() : null;

        // Processar dados
        const posicao = ranking.findIndex(t => parseInt(t.time_id) === parseInt(timeId)) + 1 || '-';
        const totalParticipantes = ranking.length;
        const meuTime = ranking.find(t => parseInt(t.time_id) === parseInt(timeId));

        // Pontuação total do ranking
        const pontosTotal = meuTime ? meuTime.pontos_total : 0;

        // Saldo financeiro do fluxo
        const meuFluxo = fluxoData?.find(f => String(f.timeId) === String(timeId));
        const saldoFinanceiro = meuFluxo?.saldoAtual || 0;

        // Última rodada do usuário
        const minhasRodadas = rodadas.filter(r => String(r.timeId) === String(timeId));
        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        preencherBoasVindas({
            posicao,
            totalParticipantes,
            pontosTotal,
            saldoFinanceiro,
            ultimaRodada,
            meuTime
        });

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro:', error);
        preencherBoasVindas({
            posicao: '-',
            totalParticipantes: '-',
            pontosTotal: 0,
            saldoFinanceiro: 0,
            ultimaRodada: null,
            meuTime: null
        });
    }
};

function preencherBoasVindas({ posicao, totalParticipantes, pontosTotal, saldoFinanceiro, ultimaRodada, meuTime }) {
    // 4.1 - Card "Ranking Geral"
    const posElement = document.getElementById('posicaoRanking');
    const totalElement = document.getElementById('totalParticipantes');
    if (posElement) {
        posElement.textContent = posicao === '-' ? '--º' : `${posicao}º`;
    }
    if (totalElement) {
        totalElement.textContent = totalParticipantes || '--';
    }

    // Card "Pontuação Total"
    const pontosElement = document.getElementById('pontosTotal');
    if (pontosElement) {
        pontosElement.textContent = pontosTotal ? pontosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
    }

    // Card "Saldo Financeiro"
    const saldoElement = document.getElementById('saldoFinanceiro');
    const statusElement = document.getElementById('statusFinanceiro');
    if (saldoElement) {
        const saldoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Math.abs(saldoFinanceiro));

        saldoElement.textContent = saldoFormatado;
        saldoElement.style.color = saldoFinanceiro >= 0 ? '#22c55e' : '#ef4444';
    }
    if (statusElement) {
        statusElement.textContent = saldoFinanceiro >= 0 ? 'A receber' : 'A pagar';
    }

    // Card "Última Rodada"
    if (ultimaRodada) {
        const numElement = document.getElementById('numeroUltimaRodada');
        const pontosUltimaElement = document.getElementById('pontosUltimaRodada');

        if (numElement) numElement.textContent = ultimaRodada.rodada;
        if (pontosUltimaElement) {
            pontosUltimaElement.textContent = ultimaRodada.pontos
                ? ultimaRodada.pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '--';
        }
    }

    // Buscar informações do time do coração
    if (meuTime && meuTime.clube_id) {
        buscarInfoTimeCoracao(meuTime.clube_id);
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
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/escudos/${clubeId}.png"
                     alt="${clube.nome}"
                     style="width: 48px; height: 48px; border-radius: 50%;"
                     onerror="this.src='/escudos/placeholder.png'">
                <div style="flex: 1;">
                    <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">
                        ${clube.nome}
                    </h3>
                    <p style="color: #999; font-size: 11px; margin: 0;">
                        ${clube.abreviacao || 'N/D'}
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