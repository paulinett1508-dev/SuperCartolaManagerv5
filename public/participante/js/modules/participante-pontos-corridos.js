
// PARTICIPANTE PONTOS CORRIDOS - Módulo Pontos Corridos

console.log('[PARTICIPANTE-PONTOS-CORRIDOS] Carregando módulo...');

window.inicializarPontosCorridosParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-PONTOS-CORRIDOS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/pontos-corridos`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar pontos corridos');
        }

        const dados = await response.json();
        renderizarPontosCorridos(dados, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-PONTOS-CORRIDOS] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarPontosCorridos(dados, meuTimeId) {
    const container = document.getElementById('pontosCorridosContainer');
    
    if (!dados || !dados.classificacao || dados.classificacao.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
        return;
    }

    const html = `
        <div class="pontos-corridos-header">
            <h3>Classificação - ${dados.nome || 'Pontos Corridos'}</h3>
            ${dados.rodada_atual ? `<p>Atualizado até Rodada ${dados.rodada_atual}</p>` : ''}
        </div>
        <table class="pontos-corridos-tabela">
            <thead>
                <tr>
                    <th>Pos.</th>
                    <th>Time</th>
                    <th>PG</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>GP</th>
                    <th>GC</th>
                    <th>SG</th>
                </tr>
            </thead>
            <tbody>
                ${dados.classificacao.map((time, index) => `
                    <tr class="${time.time_id === meuTimeId ? 'meu-time' : ''}">
                        <td><span class="posicao-badge">${index + 1}º</span></td>
                        <td>${time.nome || 'N/D'}</td>
                        <td class="pontos-destaque">${time.pontos || 0}</td>
                        <td>${time.jogos || 0}</td>
                        <td>${time.vitorias || 0}</td>
                        <td>${time.empates || 0}</td>
                        <td>${time.derrotas || 0}</td>
                        <td>${time.gols_pro || 0}</td>
                        <td>${time.gols_contra || 0}</td>
                        <td>${time.saldo_gols || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('pontosCorridosContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Pontos Corridos</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-PONTOS-CORRIDOS] ✅ Módulo carregado');
