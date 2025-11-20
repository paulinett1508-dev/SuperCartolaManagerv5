
// PARTICIPANTE RANKING - Módulo de Ranking Geral

console.log('[PARTICIPANTE-RANKING] Carregando módulo...');

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
                    <th>Média</th>
                    <th>Rodadas</th>
                </tr>
            </thead>
            <tbody>
                ${dados.map((time) => `
                    <tr class="${time.timeId === parseInt(meuTimeId) ? 'meu-time' : ''}">
                        <td><span class="posicao-badge">${time.posicao}º</span></td>
                        <td>${time.nome_time || 'N/D'}</td>
                        <td>${time.nome_cartola || 'N/D'}</td>
                        <td class="pontos-destaque">${(time.pontos_totais || 0).toFixed(2)}</td>
                        <td>${time.media || '0.00'}</td>
                        <td>${time.rodadas_jogadas || 0}</td>
                    </tr>
                `).join('')}
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
