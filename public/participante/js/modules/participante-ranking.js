// Assuming Rodada Atual is available globally or in scope, e.g.:
// const rodadaAtual = 36; // or some other value based on the current game state

// Assuming participanteCache object is available globally or in scope, e.g.:
// const participanteCache = {
//     buscar: async (type, key) => { /* ... */ },
//     salvar: async (type, key, data, ttl) => { /* ... */ }
// };

console.log('[PARTICIPANTE-RANKING] Carregando módulo...');

window.inicializarRankingParticipante = async function(ligaId, timeId) {
    console.log('[PARTICIPANTE-RANKING] 🚀 Inicializando módulo...');

    if (!ligaId) { // Simplified check as ligaId is directly passed
        console.error('[PARTICIPANTE-RANKING] ❌ Liga ID inválido');
        return;
    }

    try {
        // Buscar ranking geral (com cache inteligente)
        const cacheKey = `ranking_geral_${ligaId}`;
        let ranking = await participanteCache.buscar('ranking', cacheKey);

        if (!ranking) {
            console.log('[PARTICIPANTE-RANKING] 🌐 Buscando ranking da API...');
            const response = await fetch(`/api/ligas/${ligaId}/ranking`);
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            ranking = await response.json();

            // Definir TTL baseado na rodada atual
            let ttl;
            if (typeof rodadaAtual !== 'undefined' && rodadaAtual <= 35) {
                ttl = Infinity; // Cache permanente para rodadas passadas (1-35)
                console.log('[PARTICIPANTE-RANKING] 💾 Salvando cache permanente.');
            } else {
                ttl = 5 * 60 * 1000; // Cache de 5 minutos para rodada atual/futura
                console.log(`[PARTICIPANTE-RANKING] 💾 Salvando cache temporário (5min) para rodada ${rodadaAtual || '?'}.`);
            }
            await participanteCache.salvar('ranking', cacheKey, ranking, ttl);
        } else {
            console.log('[PARTICIPANTE-RANKING] ⚡ Usando ranking do cache.');
        }

        const tbody = document.querySelector('#rankingTable tbody');

        if (!tbody) {
            console.error('[PARTICIPANTE-RANKING] Tabela não encontrada');
            return;
        }

        // Definir premiações
        const premiacoes = {
            1: { valor: 'R$ 1.000,00', label: '🥇 CAMPEÃO' },
            2: { valor: 'R$ 700,00', label: '🥈 2º LUGAR' },
            3: { valor: 'R$ 400,00', label: '🥉 3º LUGAR' }
        };

        tbody.innerHTML = ranking.map((time, index) => {
            const posicao = index + 1;
            const isTop3 = posicao <= 3;
            const isMeuTime = String(time.time_id) === String(timeId);
            const premiacao = premiacoes[posicao];

            // Formatação de pontos com casas decimais e milhar
            const pontosFormatados = parseFloat(time.pontos_total || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            return `
                <tr class="${isMeuTime ? 'meu-time' : ''} ${isTop3 ? 'top-3' : ''}"
                    data-posicao="${posicao}">
                    <td>
                        ${isTop3 ? `
                            <div class="posicao-destaque posicao-${posicao}"
                                 onclick="mostrarPremiacao(${posicao}, '${premiacao.label}', '${premiacao.valor}')"
                                 style="cursor: pointer; position: relative;">
                                <span class="posicao-numero">${posicao}º</span>
                                ${posicao === 1 ? '👑' : posicao === 2 ? '🥈' : '🥉'}
                            </div>
                        ` : `
                            <span class="posicao-normal">${posicao}º</span>
                        `}
                    </td>
                    <td class="time-info">
                        <img src="${time.url_escudo_png || `/escudos/${time.clube_id || 'placeholder'}.png`}"
                             alt="${time.nome_time}"
                             class="escudo-time"
                             onerror="this.src='/escudos/placeholder.png'">
                        <div>
                            <div class="nome-time">${time.nome_time || 'Time'}</div>
                            <div class="nome-cartola">${time.nome_cartola || 'Cartoleiro'}</div>
                        </div>
                    </td>
                    <td class="time-clube">
                        ${time.clube_id ? `
                            <img src="/escudos/${time.clube_id}.png"
                                 alt="Clube"
                                 class="escudo-clube"
                                 onerror="this.src='/escudos/placeholder.png'">
                        ` : 'N/D'}
                    </td>
                    <td class="pontos">${pontosFormatados}</td>
                </tr>
            `;
        }).join('');

        console.log('[PARTICIPANTE-RANKING] ✅ Ranking carregado');

    } catch (error) {
        console.error('[PARTICIPANTE-RANKING] Erro ao carregar ranking:', error);
        const tbody = document.querySelector('#rankingTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #ef4444;">
                        ❌ Erro ao carregar ranking
                    </td>
                </tr>
            `;
        }
    }
};

// Função para mostrar premiação com todas as 3 colocações
window.mostrarPremiacao = function(posicao, label, valor) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    border: 2px solid ${posicao === 1 ? '#ffd700' : posicao === 2 ? '#c0c0c0' : '#cd7f32'};
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);">
            <h2 style="color: #fff; margin-bottom: 20px; font-size: 20px;">🏆 Premiações da Liga</h2>

            <!-- 1º LUGAR -->
            <div style="background: ${posicao === 1 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.05)'};
                        border: 2px solid ${posicao === 1 ? '#ffd700' : 'rgba(255, 215, 0, 0.3)'};
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;">
                <div style="font-size: 36px; margin-bottom: 8px;">👑</div>
                <h3 style="color: #ffd700; margin-bottom: 8px; font-size: 18px;">CAMPEÃO</h3>
                <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0;">R$ 1.000,00</p>
            </div>

            <!-- 2º LUGAR -->
            <div style="background: ${posicao === 2 ? 'rgba(192, 192, 192, 0.15)' : 'rgba(192, 192, 192, 0.05)'};
                        border: 2px solid ${posicao === 2 ? '#c0c0c0' : 'rgba(192, 192, 192, 0.3)'};
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;">
                <div style="font-size: 36px; margin-bottom: 8px;">🥈</div>
                <h3 style="color: #c0c0c0; margin-bottom: 8px; font-size: 18px;">2º LUGAR</h3>
                <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0;">R$ 700,00</p>
            </div>

            <!-- 3º LUGAR -->
            <div style="background: ${posicao === 3 ? 'rgba(205, 127, 50, 0.15)' : 'rgba(205, 127, 50, 0.05)'};
                        border: 2px solid ${posicao === 3 ? '#cd7f32' : 'rgba(205, 127, 50, 0.3)'};
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 20px;">
                <div style="font-size: 36px; margin-bottom: 8px;">🥉</div>
                <h3 style="color: #cd7f32; margin-bottom: 8px; font-size: 18px;">3º LUGAR</h3>
                <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0;">R$ 400,00</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-bottom: 20px;">
                💰 Total em prêmios: <strong style="color: #22c55e;">R$ 2.100,00</strong>
            </p>

            <button onclick="this.closest('div[style*=\"fixed\"]').remove()"
                    style="background: #ff4500;
                           color: white;
                           border: none;
                           padding: 12px 30px;
                           border-radius: 8px;
                           cursor: pointer;
                           font-size: 14px;
                           font-weight: bold;">
                Fechar
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

console.log('[PARTICIPANTE-RANKING] ✅ Módulo carregado');