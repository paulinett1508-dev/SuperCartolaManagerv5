
// PARTICIPANTE RODADAS - Módulo de Rodadas

console.log('[PARTICIPANTE-RODADAS] Carregando módulo...');

window.inicializarRodadasParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-RODADAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/rodadas/${timeId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar rodadas');
        }

        const dados = await response.json();
        renderizarRodadas(dados);

    } catch (error) {
        console.error('[PARTICIPANTE-RODADAS] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarRodadas(rodadas) {
    const container = document.getElementById('rodadasContainer');
    
    if (!rodadas || rodadas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhuma rodada disputada</p>';
        return;
    }

    const html = rodadas.map(rodada => `
        <div class="rodada-card">
            <div class="rodada-titulo">
                <span class="rodada-numero">Rodada ${rodada.numero}</span>
                <span class="rodada-pontos">${(rodada.pontos || 0).toFixed(2)} pts</span>
            </div>
            <div class="rodada-detalhes">
                <p><strong>Capitão:</strong> ${rodada.capitao || 'N/D'}</p>
                <p><strong>Patrimônio:</strong> C$ ${(rodada.patrimonio || 0).toFixed(2)}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('rodadasContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Rodadas</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-RODADAS] ✅ Módulo carregado');
