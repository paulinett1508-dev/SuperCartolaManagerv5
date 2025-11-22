
// PARTICIPANTE RANKING - Módulo de Ranking Geral com Premiações

console.log('[PARTICIPANTE-RANKING] Carregando módulo...');

window.mostrarPremiacaoRanking = function(posicao) {
    const premiacoes = {
        1: { emoji: '🥇', titulo: 'CAMPEÃO', premio: 'R$ 1.000,00', cor: 'gold' },
        2: { emoji: '🥈', titulo: '2º LUGAR', premio: 'R$ 700,00', cor: 'silver' },
        3: { emoji: '🥉', titulo: '3º LUGAR', premio: 'R$ 400,00', cor: '#cd7f32' }
    };
    
    if (!premiacoes[posicao]) return;
    
    const p = premiacoes[posicao];
    
    // Criar modal se não existir
    let modal = document.getElementById('premiacaoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'premiacaoModal';
        modal.className = 'modal-premiacao';
        document.body.appendChild(modal);
    }
    
    // Renderizar todas as 3 premiações
    const todasPremiacoes = Object.keys(premiacoes).map(pos => {
        const item = premiacoes[pos];
        const isAtual = parseInt(pos) === parseInt(posicao);
        return `
            <div class="premiacao-item ${isAtual ? 'destaque' : ''}">
                <div class="premiacao-emoji" style="color: ${item.cor}">${item.emoji}</div>
                <div class="premiacao-info">
                    <div class="premiacao-titulo">${item.titulo}</div>
                    <div class="premiacao-valor">${item.premio}</div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="window.fecharPremiacaoModal()"></div>
        <div class="modal-content-premiacao">
            <button class="btn-fechar-modal" onclick="window.fecharPremiacaoModal()">×</button>
            <h3 style="text-align: center; margin-bottom: 20px; color: var(--participante-primary);">
                🏆 Premiações do Ranking
            </h3>
            <div class="premiacoes-grid">
                ${todasPremiacoes}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
};

window.fecharPremiacaoModal = function() {
    const modal = document.getElementById('premiacaoModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
};

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
                </tr>
            </thead>
            <tbody>
                ${dados.map((time, index) => {
                    const posicao = index + 1;
                    const isPodium = posicao <= 3;
                    const premiacaoClick = isPodium ? `onclick="window.mostrarPremiacaoRanking(${posicao})"` : '';
                    const cursorStyle = isPodium ? 'style="cursor: pointer;"' : '';
                    const meuTime = parseInt(time.time_id) === parseInt(meuTimeId);
                    const classe = meuTime ? 'meu-time' : (isPodium ? `podium-${posicao}` : '');
                    
                    // Usar nome do time (API retorna time.nome)
                    const nomeTime = time.nome || time.nome_time || 'N/D';
                    
                    // Converter para número e formatar com vírgula e casas decimais
                    const pontos = Number(time.pontos_totais ?? 0);
                    const pontosFormatados = pontos.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    
                    return `
                        <tr class="${classe}">
                            <td><span class="posicao-badge" ${cursorStyle} ${premiacaoClick}>${posicao}º</span></td>
                            <td>${nomeTime}</td>
                            <td>${time.nome_cartola || 'N/D'}</td>
                            <td class="pontos-destaque">${pontosFormatados}</td>
                        </tr>
                    `;
                }).join('')}
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
