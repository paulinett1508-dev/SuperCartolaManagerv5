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
    let variacaoTexto = '--'; // Adicionado para consistência com a variável usada no HTML
    let variacaoClass = ''; // Adicionado para consistência com a variável usada no HTML
    let tendenciaClass = ''; // Adicionado para consistência com a variável usada no HTML
    let tendenciaIcon = ''; // Adicionado para consistência com a variável usada no HTML
    let tendenciaTexto = ''; // Adicionado para consistência com a variável usada no HTML

    if (minhasRodadas.length >= 2) {
        const rodadasOrdenadas = minhasRodadas.sort((a, b) => b.rodada - a.rodada);
        const ultima = parseFloat(rodadasOrdenadas[0].pontos) || 0;
        const penultima = parseFloat(rodadasOrdenadas[1].pontos) || 0;
        const diff = ultima - penultima;
        variacao = diff.toFixed(1);
        variacaoTexto = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
        variacaoClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';

        if (diff > 0) {
            tendencia = 'up';
            tendenciaIcon = 'trending_up';
            tendenciaTexto = 'Alta';
            tendenciaClass = 'positive';
        } else if (diff < 0) {
            tendencia = 'down';
            tendenciaIcon = 'trending_down';
            tendenciaTexto = 'Baixa';
            tendenciaClass = 'negative';
        } else {
            tendencia = 'stable';
            tendenciaIcon = 'trending_flat';
            tendenciaTexto = 'Estável';
            tendenciaClass = 'stable';
        }
    } else {
         tendenciaIcon = 'trending_flat';
         tendenciaTexto = 'N/D';
         tendenciaClass = 'stable';
    }

    const posicaoAnterior = '--'; // Mantendo como '--' pois não há dados para isso

    let statsHTML = ''; // Inicializando statsHTML

    // Cards principais
    statsHTML += `
        <div class="stats-grid-modern">
            <!-- Card Posição -->
            <div class="stat-card-modern stat-position">
                <div class="stat-icon-modern">
                    <span class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'; font-size: 32px; font-weight: 400;">military_tech</span>
                </div>
                <div class="stat-label-modern">POSIÇÃO</div>
                <div class="stat-value-modern">${posTexto}</div>
            </div>

            <!-- Card Pontos -->
            <div class="stat-card-modern stat-points">
                <div class="stat-icon-modern">
                    <span class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'; font-size: 32px; font-weight: 400;">bar_chart</span>
                </div>
                <div class="stat-label-modern">PONTOS</div>
                <div class="stat-value-modern">${pontosFormatados}</div>
            </div>

            <!-- Card Saldo -->
            <div class="stat-card-modern stat-balance">
                <div class="stat-icon-modern">
                    <span class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'; font-size: 32px; font-weight: 400;">attach_money</span>
                </div>
                <div class="stat-label-modern">SALDO</div>
                <div class="stat-value-modern">${saldoComSinal}</div>
            </div>

            <!-- Card Última Rodada -->
            <div class="stat-card-modern stat-r35">
                <div class="stat-icon-modern">
                    <span class="material-symbols-outlined" style="font-family: 'Material Symbols Outlined'; font-size: 32px; font-weight: 400;">bolt</span>
                </div>
                <div class="stat-label-modern">R${rodadaAtual}</div>
                <div class="stat-value-modern">${pontosUltimaRodada}</div>
            </div>
        </div>
    `;

    // Card de Desempenho
    statsHTML += `
        <div class="performance-card-modern">
            <div class="performance-header-modern">
                <span class="material-symbols-outlined performance-icon-modern" style="font-family: 'Material Symbols Outlined'; font-size: 24px; font-weight: 400;">insights</span>
                <h3 class="performance-title-modern">Seu Desempenho</h3>
            </div>
            <div class="performance-stats-modern">
                <div class="performance-item-modern">
                    <span class="performance-label-modern">Posição anterior:</span>
                    <span class="performance-value-modern">${posicaoAnterior}</span>
                </div>
                <div class="performance-item-modern">
                    <span class="performance-label-modern">Variação:</span>
                    <span class="performance-value-modern ${variacaoClass}">${variacaoTexto}</span>
                </div>
                <div class="performance-item-modern">
                    <span class="performance-label-modern">Tendência:</span>
                    <span class="performance-value-modern">
                        <span class="material-symbols-outlined ${tendenciaClass}" style="font-family: 'Material Symbols Outlined'; font-size: 18px; font-weight: 400;">${tendenciaIcon}</span> ${tendenciaTexto}
                    </span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div style="background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%); min-height: 100vh; padding: 20px 16px 120px; position: relative; overflow-x: hidden;">
            
            <!-- Efeito de glow sutil no topo -->
            <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 150px; background: radial-gradient(ellipse at center, rgba(255, 69, 0, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;"></div>
            
            <!-- Container com z-index -->
            <div style="position: relative; z-index: 1;">
                <!-- Seção de Boas-vindas PREMIUM -->
                <section style="text-align: center; margin-bottom: 32px; animation: fadeInDown 0.6s ease-out;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; padding: 12px 24px; background: linear-gradient(135deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 107, 53, 0.05) 100%); border-radius: 50px; border: 1px solid rgba(255, 69, 0, 0.2); backdrop-filter: blur(10px);">
                        <span style="font-size: 28px; animation: bounce 2s infinite;">⚽</span>
                        <h2 style="font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #fff 0%, #FF6B35 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; letter-spacing: -0.5px;">Bem-vindo ao Painel</h2>
                    </div>
                    <p style="font-size: 14px; color: #999; margin: 0; font-weight: 500;">Acompanhe seu desempenho em tempo real</p>
                </section>

                ${statsHTML}
            </div>
        </div>
        
        <style>
            @keyframes fadeInDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        </style>
    `;
}

console.log('[BOAS-VINDAS] ✅ Módulo carregado');