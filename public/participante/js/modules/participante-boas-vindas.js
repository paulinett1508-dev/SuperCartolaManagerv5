
// PARTICIPANTE BOAS-VINDAS - Versão Mobile Original

console.log('[BOAS-VINDAS] 🚀 Carregando módulo...');

export async function inicializarBoasVindas(ligaIdParam, timeIdParam) {
    // ✅ GARANTIR que ligaId e timeId sejam strings válidas
    const ligaId = typeof ligaIdParam === 'string' ? ligaIdParam : String(ligaIdParam || '');
    const timeId = typeof timeIdParam === 'string' ? timeIdParam : String(timeIdParam || '');
    
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);
    
    if (!ligaId || ligaId === '[object Object]') {
        console.error('[BOAS-VINDAS] ❌ Liga ID inválido:', ligaIdParam);
        return;
    }
    
    if (!timeId || timeId === 'undefined') {
        console.error('[BOAS-VINDAS] ❌ Time ID inválido:', timeIdParam);
        return;
    }
    
    await inicializarBoasVindasInterno(ligaId, timeId);
}

window.inicializarBoasVindas = async function(ligaIdParam, timeIdParam) {
    // ✅ GARANTIR que ligaId e timeId sejam strings válidas
    const ligaId = typeof ligaIdParam === 'string' ? ligaIdParam : String(ligaIdParam || '');
    const timeId = typeof timeIdParam === 'string' ? timeIdParam : String(timeIdParam || '');
    
    console.log(`[BOAS-VINDAS] Inicializando para time ${timeId} na liga ${ligaId}`);
    
    if (!ligaId || ligaId === '[object Object]') {
        console.error('[BOAS-VINDAS] ❌ Liga ID inválido:', ligaIdParam);
        return;
    }
    
    if (!timeId || timeId === 'undefined') {
        console.error('[BOAS-VINDAS] ❌ Time ID inválido:', timeIdParam);
        return;
    }
    
    await inicializarBoasVindasInterno(ligaId, timeId);
}

async function inicializarBoasVindasInterno(ligaId, timeId) {
    try {
        const [resRanking, resRodadas, resTime, resExtrato] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/ranking`),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
            fetch(`/api/times/${timeId}`),
            fetch(`/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`)
        ]);

        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const timeData = resTime.ok ? await resTime.json() : null;
        const extratoData = resExtrato.ok ? await resExtrato.json() : null;

        const meuTimeIdNum = Number(timeId);
        const meuTime = ranking.find(t => Number(t.timeId) === meuTimeIdNum);
        const posicao = meuTime ? meuTime.posicao : '--';
        const totalParticipantes = ranking.length;

        const minhasRodadas = rodadas.filter(r => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum);
        const pontosTotal = minhasRodadas.reduce((total, rodada) => {
            return total + (parseFloat(rodada.pontos) || 0);
        }, 0);

        const ultimaRodada = minhasRodadas.sort((a, b) => b.rodada - a.rodada)[0];

        const saldoFinanceiro = extratoData?.saldo_atual || extratoData?.resumo?.saldo_final || 0;

        renderizarBoasVindas({
            posicao,
            totalParticipantes,
            pontosTotal,
            ultimaRodada,
            meuTime,
            timeData,
            timeId,
            minhasRodadas,
            saldoFinanceiro
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
            minhasRodadas: [],
            saldoFinanceiro: 0
        });
    }
}

function renderizarBoasVindas({ posicao, totalParticipantes, pontosTotal, ultimaRodada, meuTime, timeData, timeId, minhasRodadas, saldoFinanceiro }) {
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
    
    // Formatar saldo financeiro
    const saldoFormatado = Math.abs(saldoFinanceiro).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const saldoComSinal = saldoFinanceiro >= 0 ? `+R$ ${saldoFormatado}` : `-R$ ${saldoFormatado}`;
    const corSaldo = saldoFinanceiro > 0 ? '#22C55E' : saldoFinanceiro < 0 ? '#EF4444' : '#6B7280';
    const bgSaldo = saldoFinanceiro > 0 ? 'rgba(34, 197, 94, 0.08)' : saldoFinanceiro < 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(107, 114, 128, 0.08)';
    const borderSaldo = saldoFinanceiro > 0 ? 'rgba(34, 197, 94, 0.3)' : saldoFinanceiro < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(107, 114, 128, 0.3)';
    
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
        <div style="background: #1a1a1a; min-height: 100vh; padding: 16px; padding-bottom: 120px;">
            <!-- Seção de Boas-vindas PROFISSIONAL -->
            <section style="text-align: center; margin-bottom: 32px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                    <span class="material-icons" style="font-size: 28px; color: #FF6B35;">sports_soccer</span>
                    <h2 style="font-size: 24px; font-weight: 700; color: white; margin: 0;">Bem-vindo(a) ao Painel</h2>
                </div>
                <p style="font-size: 14px; color: #999; margin: 0;">Acompanhe seu desempenho em tempo real</p>
            </section>

            <!-- Stats Grid 2x2 PROFISSIONAL -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <!-- Posição -->
                <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px);">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(251, 191, 36, 0.15); border-radius: 8px; margin-bottom: 12px; color: #FBBF24;">
                        <span class="material-icons">emoji_events</span>
                    </div>
                    <p style="font-size: 12px; color: #999; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 600;">Posição</p>
                    <p style="font-size: 28px; font-weight: 700; color: white; margin: 0;">${posTexto}</p>
                </div>

                <!-- Pontos -->
                <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px);">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(59, 130, 246, 0.15); border-radius: 8px; margin-bottom: 12px; color: #3B82F6;">
                        <span class="material-icons">bar_chart</span>
                    </div>
                    <p style="font-size: 12px; color: #999; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 600;">Pontos</p>
                    <p style="font-size: 28px; font-weight: 700; color: white; margin: 0;">${pontosFormatados}</p>
                </div>

                <!-- Saldo -->
                <div style="background: ${bgSaldo}; border: 1px solid ${borderSaldo}; border-radius: 12px; padding: 16px; backdrop-filter: blur(10px);">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: ${bgSaldo}; border-radius: 8px; margin-bottom: 12px; color: ${corSaldo};">
                        <span class="material-icons">account_balance_wallet</span>
                    </div>
                    <p style="font-size: 12px; color: #999; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 600;">Saldo</p>
                    <p style="font-size: 28px; font-weight: 700; color: ${corSaldo}; margin: 0;">${saldoComSinal}</p>
                </div>

                <!-- Última Rodada -->
                <div style="background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px);">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(249, 115, 22, 0.15); border-radius: 8px; margin-bottom: 12px; color: #F97316;">
                        <span class="material-icons">bolt</span>
                    </div>
                    <p style="font-size: 12px; color: #999; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 600;">R${rodadaAtual}</p>
                    <p style="font-size: 28px; font-weight: 700; color: white; margin: 0;">${pontosUltimaRodada}</p>
                </div>
            </div>

            <!-- Seu Desempenho ELEGANTE -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 107, 53, 0.2); border-radius: 12px; padding: 20px; backdrop-filter: blur(10px);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <span class="material-icons" style="color: #FF6B35;">insights</span>
                    <h3 style="font-size: 18px; font-weight: 700; color: white; margin: 0;">Seu Desempenho</h3>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="font-size: 14px; color: #999;">Posição anterior:</span>
                        <span style="font-weight: 600; color: white;">${posicaoAnterior}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="font-size: 14px; color: #999;">Variação:</span>
                        <span style="font-weight: 600; color: white;">${variacao}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 14px; color: #999;">Tendência:</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${tendencia === 'up' ? '<span class="material-icons" style="color: #22C55E; font-size: 20px;">trending_up</span>' : 
                              tendencia === 'down' ? '<span class="material-icons" style="color: #EF4444; font-size: 20px;">trending_down</span>' : 
                              '<span class="material-icons" style="color: #6B7280; font-size: 20px;">trending_flat</span>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');
