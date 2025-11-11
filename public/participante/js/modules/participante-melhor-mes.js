
// PARTICIPANTE MELHOR MÊS - Módulo Melhor Mês

console.log('[PARTICIPANTE-MELHOR-MES] Carregando módulo...');

window.inicializarMelhorMesParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-MELHOR-MES] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/melhor-mes/${timeId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do melhor mês');
        }

        const dados = await response.json();
        renderizarMelhorMes(dados);

    } catch (error) {
        console.error('[PARTICIPANTE-MELHOR-MES] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarMelhorMes(meses) {
    const container = document.getElementById('mesesGrid');
    
    if (!meses || meses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
        return;
    }

    const melhorMes = meses.reduce((max, mes) => mes.pontos > max.pontos ? mes : max, meses[0]);

    const html = meses.map(mes => `
        <div class="mes-card ${mes.mes === melhorMes.mes ? 'meu-melhor' : ''}">
            <div class="mes-nome">${mes.nome}</div>
            <div class="mes-pontos">${(mes.pontos || 0).toFixed(2)} pts</div>
            <div class="mes-rodadas">Rodadas ${mes.rodadas_inicio} - ${mes.rodadas_fim}</div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('mesesGrid');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Dados</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-MELHOR-MES] ✅ Módulo carregado');
