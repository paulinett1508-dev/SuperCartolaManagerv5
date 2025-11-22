// PARTICIPANTE LUVA DE OURO - Módulo Luva de Ouro

console.log('[PARTICIPANTE-LUVA-OURO] Carregando módulo...');

window.inicializarLuvaOuroParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-LUVA-OURO] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/luva-de-ouro`);

        if (!response.ok) {
            throw new Error('Erro ao buscar goleiros');
        }

        const dados = await response.json();
        renderizarLuvaOuro(dados, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-LUVA-OURO] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarLuvaOuro(dados, meuTimeId) {
    const container = document.getElementById('luvaOuroContainer');

    if (!dados || dados.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum goleiro registrado</p>';
        return;
    }

    const html = `
        <div class="luva-ouro-grid">
            ${dados.map((goleiro, index) => {
                const posicao = index + 1;
                const meuGoleiro = goleiro.time_id === meuTimeId;

                return `
                    <div class="goleiro-card ${posicao <= 3 ? `podium-${posicao}` : ''} ${meuGoleiro ? 'meu-goleiro' : ''}">
                        <div class="goleiro-posicao">${posicao}º</div>
                        <div class="goleiro-nome">${goleiro.atleta_nome || 'N/D'}</div>
                        <div class="goleiro-time">${goleiro.time_nome || 'N/D'}</div>
                        <div class="goleiro-stats">
                            <div class="stat">
                                <span class="stat-label">Defesas</span>
                                <span class="stat-value">${goleiro.defesas || 0}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">SG</span>
                                <span class="stat-value">${goleiro.saldo_gols || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('luvaOuroContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Luva de Ouro</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-LUVA-OURO] ✅ Módulo carregado');