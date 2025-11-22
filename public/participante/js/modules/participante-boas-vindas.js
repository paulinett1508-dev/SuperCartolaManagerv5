
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
            timeData: timeData,
            meuTimeId: timeId
        });

        // Processar dados - ranking retorna array de times ordenados
        console.log('[BOAS-VINDAS] 🔍 Primeiro time do ranking (exemplo):', ranking[0]);
        const meuTime = ranking.find(t => String(t.time_id) === String(timeId));
        console.log('[BOAS-VINDAS] 🎯 Meu time encontrado:', meuTime);
        
        const posicao = meuTime ? meuTime.posicao : '-';
        const totalParticipantes = ranking.length;

        // Pontuação total - somar pontos de todas as rodadas do participante
        const minhasRodadasParaPontos = rodadas.filter(r => String(r.timeId) === String(timeId) || String(r.time_id) === String(timeId));
        const pontosTotal = minhasRodadasParaPontos.reduce((total, rodada) => {
            return total + (parseFloat(rodada.pontos) || 0);
        }, 0);
        
        console.log('[BOAS-VINDAS] 📊 Cálculo de pontos:', {
            totalRodadas: minhasRodadasParaPontos.length,
            pontosTotal: pontosTotal
        });

        // Buscar saldo financeiro do campo editável
        let saldoFinanceiro = 0;
        try {
            const resCampos = await fetch(`/api/fluxo-financeiro/${ligaId}/times/${timeId}`);
            if (resCampos.ok) {
                const camposData = await resCampos.json();
                console.log('[BOAS-VINDAS] 💰 Campos financeiros recebidos:', camposData);
                
                // Somar os 4 campos editáveis
                if (camposData.campos && Array.isArray(camposData.campos)) {
                    console.log('[BOAS-VINDAS] 💰 Campos disponíveis:', camposData.campos);
                    saldoFinanceiro = camposData.campos.reduce((total, campo) => {
                        const valor = parseFloat(campo.valor) || 0;
                        console.log(`[BOAS-VINDAS] 💰 Campo "${campo.nome}": R$ ${valor}`);
                        return total + valor;
                    }, 0);
                    console.log('[BOAS-VINDAS] 💰 Saldo total calculado:', saldoFinanceiro);
                } else {
                    console.log('[BOAS-VINDAS] ⚠️ Nenhum campo financeiro encontrado');
                }
            } else {
                console.log('[BOAS-VINDAS] ⚠️ Erro na resposta da API de campos financeiros:', resCampos.status);
            }
        } catch (error) {
            console.error('[BOAS-VINDAS] ❌ Erro ao buscar campos financeiros:', error);
        }

        // Última rodada do usuário - CORRIGIDO: verificar estrutura correta
        console.log('[BOAS-VINDAS] 🔍 Buscando minhas rodadas. Total de rodadas:', rodadas.length);
        console.log('[BOAS-VINDAS] 🔍 Primeira rodada (exemplo):', rodadas[0]);
        
        const minhasRodadas = rodadas.filter(r => String(r.timeId) === String(timeId) || String(r.time_id) === String(timeId));
        console.log('[BOAS-VINDAS] 🔍 Minhas rodadas encontradas:', minhasRodadas.length);
        
        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        console.log('[BOAS-VINDAS] Dados processados:', {
            posicao,
            totalParticipantes,
            pontosTotal,
            saldoFinanceiro,
            ultimaRodada: ultimaRodada ? `Rodada ${ultimaRodada.rodada} - ${ultimaRodada.pontos} pts` : 'Nenhuma',
            meuTimeDados: meuTime
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

    // Mini Card "Posição no Ranking"
    const posElement = document.getElementById('posicaoRanking');
    if (posElement) {
        const posTexto = posicao === '-' ? '--º' : `${posicao}º`;
        posElement.textContent = posTexto;
        console.log('[BOAS-VINDAS] ✅ Posição atualizada:', posElement.textContent, '(de', totalParticipantes, 'times)');
    }

    // Mini Card "Pontuação Total"
    const pontosElement = document.getElementById('pontosTotal');
    if (pontosElement) {
        const pontosFormatados = pontosTotal > 0 
            ? pontosTotal.toFixed(1)
            : '--';
        pontosElement.textContent = pontosFormatados;
        console.log('[BOAS-VINDAS] Pontos atualizados:', pontosElement.textContent);
    }

    // Mini Card "Saldo Financeiro"
    const saldoElement = document.getElementById('saldoFinanceiro');
    const statusElement = document.getElementById('statusFinanceiro');
    if (saldoElement) {
        // Formatação compacta: R$ 1.2K ou R$ 150
        const saldoAbs = Math.abs(saldoFinanceiro);
        let saldoFormatado;
        
        if (saldoAbs >= 1000) {
            saldoFormatado = 'R$ ' + (saldoFinanceiro / 1000).toFixed(1) + 'K';
        } else if (saldoAbs > 0) {
            saldoFormatado = 'R$ ' + saldoFinanceiro.toFixed(0);
        } else {
            saldoFormatado = 'R$ 0';
        }

        saldoElement.textContent = saldoFormatado;
        saldoElement.style.color = saldoFinanceiro >= 0 ? '#22c55e' : '#ef4444';
        console.log('[BOAS-VINDAS] Saldo atualizado:', saldoElement.textContent, 'Cor:', saldoElement.style.color);
    }
    if (statusElement) {
        statusElement.textContent = saldoFinanceiro >= 0 ? 'A receber' : 'A pagar';
        console.log('[BOAS-VINDAS] Status financeiro:', statusElement.textContent);
    }

    // Mini Card "Última Rodada"
    if (ultimaRodada) {
        const numElement = document.getElementById('numeroUltimaRodada');
        const pontosUltimaElement = document.getElementById('pontosUltimaRodada');

        if (numElement) {
            numElement.textContent = ultimaRodada.rodada;
            console.log('[BOAS-VINDAS] Número da última rodada:', numElement.textContent);
        }
        if (pontosUltimaElement) {
            const pontosRodada = ultimaRodada.pontos
                ? ultimaRodada.pontos.toFixed(1)
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
        console.log('[BOAS-VINDAS] 🏟️ Buscando informações do clube:', clubeId);
        
        // Buscar informações do clube via proxy do backend (evita CORS)
        const response = await fetch(`/api/cartola/clubes`);
        if (!response.ok) {
            throw new Error('Erro ao buscar clubes');
        }

        const clubes = await response.json();
        const clube = Object.values(clubes).find(c => c.id === parseInt(clubeId));

        if (!clube) {
            timeCoracaoCard.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                    <p>⚽ Informações do clube não disponíveis</p>
                </div>
            `;
            return;
        }

        renderizarTimeCoracao(clube, timeCoracaoCard);

    } catch (error) {
        console.error('[BOAS-VINDAS] Erro ao buscar time do coração:', error);
        timeCoracaoCard.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">
                <p>⚽ Erro ao carregar informações</p>
            </div>
        `;
    }
}

function renderizarTimeCoracao(clube, timeCoracaoCard) {
    timeCoracaoCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/escudos/${clube.id}.png"
                 alt="${clube.nome}"
                 style="width: 48px; height: 48px; border-radius: 50%;"
                 onerror="this.src='/escudos/placeholder.png'">
            <div style="flex: 1;">
                <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">
                    ${clube.nome}
                </h3>
                <p style="color: #999; font-size: 11px; margin: 0;">
                    ${clube.abreviacao || clube.nome_fantasia || 'N/D'}
                </p>
            </div>
        </div>
    `;
    console.log('[BOAS-VINDAS] ✅ Time do coração carregado:', clube.nome);
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');
