
// PARTICIPANTE ARTILHEIRO - Módulo Artilheiro/Campeão

console.log('[PARTICIPANTE-ARTILHEIRO] Carregando módulo...');

window.inicializarArtilheiroParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-ARTILHEIRO] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/artilheiro-campeao`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar artilheiros');
        }

        const dados = await response.json();
        renderizarArtilheiro(dados, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-ARTILHEIRO] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarArtilheiro(dados, meuTimeId) {
    const container = document.getElementById('artilheiroContainer');
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum artilheiro registrado</p>';
        return;
    }

    const html = `
        <div class="artilheiro-grid">
            ${dados.map((artilheiro, index) => {
                const posicao = index + 1;
                const meuArtilheiro = artilheiro.time_id === meuTimeId;
                
                return `
                    <div class="artilheiro-card ${posicao <= 3 ? `podium-${posicao}` : ''} ${meuArtilheiro ? 'meu-artilheiro' : ''}">
                        <div class="artilheiro-posicao">${posicao}º</div>
                        <div class="artilheiro-nome">${artilheiro.atleta_nome || 'N/D'}</div>
                        <div class="artilheiro-time">${artilheiro.time_nome || 'N/D'}</div>
                        <div class="artilheiro-gols">⚽ ${artilheiro.gols || 0} gols</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('artilheiroContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Artilheiros</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-ARTILHEIRO] ✅ Módulo carregado');
