
// PARTICIPANTE RANKING - Módulo de Ranking Geral com Premiações

console.log('[PARTICIPANTE-RANKING] Carregando módulo...');

window.mostrarPremiacaoRanking = function(posicao) {
    const premiacoes = {
        1: { titulo: '🥇 CAMPEÃO', premio: 'R$ 1.000,00' },
        2: { titulo: '🥈 2º LUGAR', premio: 'R$ 700,00' },
        3: { titulo: '🥉 3º LUGAR', premio: 'R$ 400,00' }
    };
    
    if (!premiacoes[posicao]) return;
    
    const { titulo, premio } = premiacoes[posicao];
    alert(`${titulo}\n${premio}`);
};

window.inicializarRankingParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-RANKING] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/ranking`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar ranking');
        }

        const dados = await response.json();
        renderizarRanking(dados, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-RANKING] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarRanking(dados, meuTimeId) {
    const container = document.getElementById('rankingTabela');
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum ranking disponível</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Pos.</th>
                    <th>Time</th>
                    <th>Cartoleiro</th>
                    <th>Pontos</th>
                    <th>Vitórias</th>
                </tr>
            </thead>
            <tbody>
                ${dados.map((time, index) => {
                    const posicao = index + 1;
                    const isPodium = posicao <= 3;
                    const premiacaoClick = isPodium ? `onclick="window.mostrarPremiacaoRanking(${posicao})"` : '';
                    const cursorStyle = isPodium ? 'style="cursor: pointer;"' : '';
                    const meuTime = parseInt(time.time_id) === parseInt(meuTimeId);
                    const classe = meuTime ? 'meu-time' : (isPodium ? `podium-${posicao}` : '');
                    
                    return `
                        <tr class="${classe}">
                            <td><span class="posicao-badge" ${cursorStyle} ${premiacaoClick}>${posicao}º</span></td>
                            <td>${time.nome || 'N/D'}</td>
                            <td>${time.nome_cartola || 'N/D'}</td>
                            <td class="pontos-destaque">${(time.pontos_totais || 0).toFixed(2)}</td>
                            <td>${time.vitorias || 0}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('rankingTabela');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Ranking</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-RANKING] ✅ Módulo carregado');
