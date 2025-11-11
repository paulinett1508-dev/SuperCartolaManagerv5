
// PARTICIPANTE MATA-MATA - Módulo Mata-Mata

console.log('[PARTICIPANTE-MATA-MATA] Carregando módulo...');

window.inicializarMataMataParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-MATA-MATA] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar mata-mata');
        }

        const dados = await response.json();
        renderizarMataMata(dados, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarMataMata(dados, meuTimeId) {
    const container = document.getElementById('mataMataContainer');
    
    if (!dados || !dados.fases || dados.fases.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhuma fase configurada</p>';
        return;
    }

    const html = dados.fases.map(fase => `
        <div class="fase-card">
            <div class="fase-titulo">
                <h3>${fase.nome}</h3>
            </div>
            <div class="confrontos-grid">
                ${fase.confrontos.map(confronto => {
                    const meuConfrontoMandante = confronto.mandante_id === meuTimeId;
                    const meuConfrontoVisitante = confronto.visitante_id === meuTimeId;
                    const meuConfronto = meuConfrontoMandante || meuConfrontoVisitante;
                    
                    return `
                        <div class="confronto-card ${meuConfronto ? 'meu-confronto' : ''}">
                            <div class="time-confronto">
                                <span class="time-nome">${confronto.mandante_nome || 'N/D'}</span>
                                <span class="time-placar">${confronto.placar_mandante || 0}</span>
                            </div>
                            <div class="vs">VS</div>
                            <div class="time-confronto">
                                <span class="time-placar">${confronto.placar_visitante || 0}</span>
                                <span class="time-nome">${confronto.visitante_nome || 'N/D'}</span>
                            </div>
                            ${confronto.vencedor_id ? `
                                <div class="vencedor">
                                    ✅ ${confronto.vencedor_nome}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('mataMataContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Mata-Mata</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-MATA-MATA] ✅ Módulo carregado');
