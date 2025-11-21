
// PARTICIPANTE TOP 10 - Módulo TOP 10

console.log('[PARTICIPANTE-TOP10] Carregando módulo...');

window.inicializarTop10Participante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-TOP10] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/top10`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar TOP 10');
        }

        const dados = await response.json();
        
        // CORREÇÃO: Validar e extrair array de times
        let times = [];
        if (Array.isArray(dados)) {
            times = dados;
        } else if (dados && Array.isArray(dados.times)) {
            times = dados.times;
        } else if (dados && typeof dados === 'object') {
            console.warn('[PARTICIPANTE-TOP10] Resposta inesperada:', dados);
            times = Object.values(dados).filter(item => item && typeof item === 'object');
        }
        
        console.log(`[PARTICIPANTE-TOP10] Times processados: ${times.length}`);
        renderizarTop10(times, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-TOP10] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarTop10(times, meuTimeId) {
    const container = document.getElementById('top10Grid');
    
    // CORREÇÃO: Validação mais robusta
    if (!container) {
        console.error('[PARTICIPANTE-TOP10] Container não encontrado');
        return;
    }
    
    if (!Array.isArray(times) || times.length === 0) {
        console.warn('[PARTICIPANTE-TOP10] Dados inválidos ou vazios:', times);
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
        return;
    }

    const top10 = times.slice(0, 10);

    const html = top10.map((time, index) => {
        const posicao = index + 1;
        const podiumClass = posicao <= 3 ? `podium-${posicao}` : '';
        const meuTime = time.time_id === meuTimeId ? 'meu-time' : '';
        
        return `
            <div class="top10-card ${podiumClass} ${meuTime}">
                <div class="top10-posicao">${posicao}º</div>
                <div class="top10-nome">${time.nome || 'N/D'}</div>
                <div class="top10-pontos">${(time.pontos || 0).toFixed(2)} pts</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('top10Grid');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar TOP 10</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-TOP10] ✅ Módulo carregado');
