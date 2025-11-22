
// PARTICIPANTE PONTOS CORRIDOS - Módulo Pontos Corridos com Toggle

console.log('[PARTICIPANTE-PONTOS-CORRIDOS] Carregando módulo...');

let dadosPontosGlobal = null;

window.inicializarPontosCorridosParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-PONTOS-CORRIDOS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/pontos-corridos`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar pontos corridos');
        }

        const dados = await response.json();
        dadosPontosGlobal = { dados, ligaId, timeId };
        
        renderizarPontosComToggle(dados, timeId, 'classificacao');

    } catch (error) {
        console.error('[PARTICIPANTE-PONTOS-CORRIDOS] Erro:', error);
        mostrarErro(error.message);
    }
};

window.togglePontosCorretos = function(modo) {
    if (!dadosPontosGlobal) return;
    
    const { dados, timeId } = dadosPontosGlobal;
    
    document.querySelectorAll('.pontos-toggle-btn').forEach(btn => {
        btn.classList.remove('ativo');
        if (btn.dataset.modo === modo) btn.classList.add('ativo');
    });
    
    renderizarPontosComToggle(dados, timeId, modo);
};

function renderizarPontosComToggle(dados, timeId, modo) {
    const container = document.getElementById('pontosCorridosContainer');
    
    if (!dados) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Erro ao carregar dados</p>';
        return;
    }
    
    const header = `
        <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
            <button class="pontos-toggle-btn ${modo === 'classificacao' ? 'ativo' : ''}" 
                    data-modo="classificacao" onclick="window.togglePontosCorretos('classificacao')"
                    style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--participante-border); 
                           background: rgba(0,0,0,0.2); color: var(--participante-text); cursor: pointer; 
                           transition: all 0.3s ease;">
                📊 CLASSIFICAÇÃO
            </button>
            <button class="pontos-toggle-btn ${modo === 'confrontos' ? 'ativo' : ''}" 
                    data-modo="confrontos" onclick="window.togglePontosCorretos('confrontos')"
                    style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--participante-border); 
                           background: rgba(0,0,0,0.2); color: var(--participante-text); cursor: pointer; 
                           transition: all 0.3s ease;">
                ⚽ CONFRONTOS
            </button>
        </div>
    `;
    
    let conteudo = '';
    
    if (modo === 'classificacao') {
        conteudo = renderizarClassificacao(dados, timeId);
    } else {
        conteudo = renderizarConfrontos(dados, timeId);
    }
    
    container.innerHTML = header + conteudo;
    
    // Estilo dos botões ativos
    document.querySelectorAll('.pontos-toggle-btn.ativo').forEach(btn => {
        btn.style.background = 'var(--participante-primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--participante-primary)';
    });
}

function renderizarClassificacao(dados, timeId) {
    if (!dados || !dados.classificacao || dados.classificacao.length === 0) {
        return '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
    }

    return `
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
                    <tr class="${time.time_id === timeId ? 'meu-time' : ''}">
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
}

function renderizarConfrontos(dados, timeId) {
    return `
        <div style="padding: 40px; text-align: center; color: #999;">
            <p>📈 Modo Confrontos</p>
            <p style="font-size: 12px; margin-top: 10px;">Últimas rodadas completas com resultados detalhados</p>
        </div>
    `;
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
