
// PARTICIPANTE MELHOR MÊS - Módulo Melhor Mês

console.log('[PARTICIPANTE-MELHOR-MES] Carregando módulo...');

let melhorMesGlobal = null;

window.inicializarMelhorMesParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-MELHOR-MES] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar dados do usuário e geral
        const [resUsuario, resGeral] = await Promise.all([
            fetch(`/api/ligas/${ligaId}/melhor-mes/${timeId}`),
            fetch(`/api/ligas/${ligaId}/melhor-mes`)
        ]);
        
        if (!resUsuario.ok) throw new Error('Erro ao buscar dados do usuário');

        const dadosUsuario = await resUsuario.json();
        const dadosGeral = resGeral.ok ? await resGeral.json() : { meses: [] };

        melhorMesGlobal = { usuario: dadosUsuario, geral: dadosGeral, timeId };
        renderizarMelhorMes(dadosUsuario, dadosGeral, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-MELHOR-MES] Erro:', error);
        mostrarErro(error.message);
    }
};

// Modal para mostrar detalhes geral
window.mostrarDetalhesGeral = function() {
    if (!melhorMesGlobal || !melhorMesGlobal.geral) return;
    
    const { geral, timeId } = melhorMesGlobal;
    const meses = geral.meses || [];
    
    if (meses.length === 0) {
        alert('Sem dados gerais disponíveis');
        return;
    }
    
    let html = 'DETALHES POR MÊS (Geral da Liga):\n\n';
    meses.forEach(mes => {
        const campeao = mes.campeao ? (mes.campeao.time_id === timeId ? ' ⭐ VOCÊ FOI CAMPEÃO!' : '') : '';
        html += `${mes.nome}: ${(mes.pontos || 0).toFixed(2)} pts${campeao}\n`;
    });
    
    alert(html);
};

function renderizarMelhorMes(mesesUsuario, mesesGeral, timeId) {
    const container = document.getElementById('mesesGrid');
    
    if (!mesesUsuario || mesesUsuario.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
        return;
    }

    const melhorMesUsuario = mesesUsuario.reduce((max, mes) => mes.pontos > max.pontos ? mes : max, mesesUsuario[0]);
    const mesesGeralArray = (mesesGeral && mesesGeral.meses) || [];

    const html = mesesUsuario.map(mes => {
        const isMelhor = mes.mes === melhorMesUsuario.mes;
        const mesGeralInfo = mesesGeralArray.find(m => m.mes === mes.mes);
        const foiCampeao = mesGeralInfo && mesGeralInfo.campeao && mesGeralInfo.campeao.time_id === timeId;
        
        return `
            <div class="mes-card ${isMelhor ? 'meu-melhor' : ''} ${foiCampeao ? 'campeao-mes' : ''}" 
                 onclick="window.mostrarDetalhesGeral()">
                <div class="mes-nome">${mes.nome} ${foiCampeao ? '🏆' : ''}</div>
                <div class="mes-pontos">${(mes.pontos || 0).toFixed(2)} pts</div>
                <div class="mes-rodadas">Rodadas ${mes.rodadas_inicio} - ${mes.rodadas_fim}</div>
            </div>
        `;
    }).join('');

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
