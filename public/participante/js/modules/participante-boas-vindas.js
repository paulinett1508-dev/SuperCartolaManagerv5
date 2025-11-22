
// PARTICIPANTE BOAS-VINDAS - Módulo de Inicialização com Dados Reais

console.log('[BOAS-VINDAS] Carregando módulo...');

window.inicializarBoasVindas = async function(ligaId, timeId) {
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar dados em paralelo
        const [resRanking, resRodadas, resFluxo, resTime] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/fluxo-financeiro/${ligaId}`),
            fetch(`/api/times/${timeId}`)
        ]);

        console.log('[BOAS-VINDAS] Status das requisições:', {
            ranking: resRanking.ok,
            rodadas: resRodadas.ok,
            fluxo: resFluxo.ok,
            time: resTime.ok
        });

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const fluxoData = resFluxo.ok ? await resFluxo.json() : [];
        const timeData = resTime.ok ? await resTime.json() : null;

        console.log('[BOAS-VINDAS] Dados recebidos:', {
            rankingLength: ranking.length,
            rodadasLength: rodadas.length,
            fluxoLength: fluxoData.length,
            timeData: timeData
        });

        // Processar dados
        const posicao = ranking.findIndex(t => parseInt(t.time_id) === parseInt(timeId)) + 1 || '-';
        const totalParticipantes = ranking.length;
        const meuTime = ranking.find(t => parseInt(t.time_id) === parseInt(timeId));

        // Pontuação total do ranking
        const pontosTotal = meuTime ? parseFloat(meuTime.pontos_total) || 0 : 0;

        // Buscar saldo financeiro do campo editável
        let saldoFinanceiro = 0;
        try {
            const resCampos = await fetch(`/api/fluxo-financeiro/${ligaId}/times/${timeId}`);
            if (resCampos.ok) {
                const camposData = await resCampos.json();
                console.log('[BOAS-VINDAS] Campos financeiros:', camposData);
                
                // Somar os 4 campos editáveis
                if (camposData.campos && Array.isArray(camposData.campos)) {
                    saldoFinanceiro = camposData.campos.reduce((total, campo) => {
                        return total + (parseFloat(campo.valor) || 0);
                    }, 0);
                }
            }
        } catch (error) {
            console.error('[BOAS-VINDAS] Erro ao buscar campos financeiros:', error);
        }

        // Última rodada do usuário
        const minhasRodadas = rodadas.filter(r => String(r.timeId) === String(timeId));
        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        console.log('[BOAS-VINDAS] Dados processados:', {
            posicao,
            totalParticipantes,
            pontosTotal,
            saldoFinanceiro,
            ultimaRodada: ultimaRodada ? `Rodada ${ultimaRodada.rodada}` : 'Nenhuma'
        });

        preencherBoasVindas({
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
        preencherBoasVindas({
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

function preencherBoasVindas({ posicao, totalParticipantes, pontosTotal, saldoFinanceiro, ultimaRodada, meuTime, timeData, timeId }) {
    console.log('[BOAS-VINDAS] Preenchendo interface com:', {
        posicao,
        totalParticipantes,
        pontosTotal,
        saldoFinanceiro,
        ultimaRodada
    });

    // Card "Ranking Geral"
    const posElement = document.getElementById('posicaoRanking');
    const totalElement = document.getElementById('totalParticipantes');
    if (posElement) {
        posElement.textContent = posicao === '-' ? '--º' : `${posicao}º`;
        console.log('[BOAS-VINDAS] Posição atualizada:', posElement.textContent);
    }
    if (totalElement) {
        totalElement.textContent = totalParticipantes > 0 ? `de ${totalParticipantes} participantes` : 'de -- participantes';
        console.log('[BOAS-VINDAS] Total de participantes atualizado:', totalElement.textContent);
    }

    // Card "Pontuação Total"
    const pontosElement = document.getElementById('pontosTotal');
    if (pontosElement) {
        const pontosFormatados = pontosTotal > 0 
            ? pontosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '--';
        pontosElement.textContent = pontosFormatados;
        console.log('[BOAS-VINDAS] Pontos atualizados:', pontosElement.textContent);
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
        console.log('[BOAS-VINDAS] Saldo atualizado:', saldoElement.textContent, 'Cor:', saldoElement.style.color);
    }
    if (statusElement) {
        statusElement.textContent = saldoFinanceiro >= 0 ? 'A receber' : 'A pagar';
        console.log('[BOAS-VINDAS] Status financeiro:', statusElement.textContent);
    }

    // Card "Última Rodada"
    if (ultimaRodada) {
        const numElement = document.getElementById('numeroUltimaRodada');
        const pontosUltimaElement = document.getElementById('pontosUltimaRodada');

        if (numElement) {
            numElement.textContent = ultimaRodada.rodada;
            console.log('[BOAS-VINDAS] Número da última rodada:', numElement.textContent);
        }
        if (pontosUltimaElement) {
            const pontosRodada = ultimaRodada.pontos
                ? ultimaRodada.pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '--';
            pontosUltimaElement.textContent = pontosRodada;
            console.log('[BOAS-VINDAS] Pontos da última rodada:', pontosUltimaElement.textContent);
        }
    } else {
        console.log('[BOAS-VINDAS] Nenhuma rodada encontrada para este time');
    }

    // Buscar informações do time do coração
    // timeData vem da API /api/times/:id que retorna clube_id
    const clubeId = timeData?.clube_id || timeData?.clube || meuTime?.clube_id;
    console.log('[BOAS-VINDAS] 🏟️ Clube ID encontrado:', clubeId, 'Fonte:', timeData);
    
    if (clubeId) {
        buscarInfoTimeCoracao(clubeId);
    } else {
        console.log('[BOAS-VINDAS] Clube ID não encontrado, mostrando mensagem padrão');
        const timeCoracaoCard = document.getElementById('timeCoracaoCard');
        if (timeCoracaoCard) {
            timeCoracaoCard.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                    <p>⚽ Nenhum time do coração definido</p>
                </div>
            `;
        }
    }
}

async function buscarTimeDoCoracao(timeId) {
    const timeCoracaoCard = document.getElementById('timeCoracaoCard');
    if (!timeCoracaoCard) return;

    try {
        const response = await fetch(`/api/times/${timeId}`);
        if (!response.ok) throw new Error('Time não encontrado');

        const timeData = await response.json();
        const clubeId = timeData.clube;

        if (clubeId) {
            buscarInfoTimeCoracao(clubeId);
        } else {
            timeCoracaoCard.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                    <p>⚽ Nenhum time do coração definido</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time do cartola:', error);
        timeCoracaoCard.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                <p>⚽ Informações não disponíveis</p>
            </div>
        `;
    }
}

async function buscarInfoTimeCoracao(clubeId) {
    const timeCoracaoCard = document.getElementById('timeCoracaoCard');
    if (!timeCoracaoCard) {
        console.log('[BOAS-VINDAS] Elemento timeCoracaoCard não encontrado');
        return;
    }

    try {
        // Buscar informações do clube
        const response = await fetch(`/api/clubes`);
        if (!response.ok) throw new Error('Erro ao buscar clubes');

        const clubes = await response.json();
        const clube = clubes.find(c => c.id === clubeId);

        if (!clube) {
            timeCoracaoCard.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                    <p>⚽ Informações do clube não disponíveis</p>
                </div>
            `;
            return;
        }

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

        console.log('[BOAS-VINDAS] Time do coração carregado:', clube.nome);

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time do coração:', error);
        timeCoracaoCard.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                <p>⚽ Erro ao carregar informações</p>
            </div>
        `;
    }
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');
