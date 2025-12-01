// =====================================================================
// PARTICIPANTE-MELHOR-MES.JS - v2.0 (APENAS CONSUMO)
// =====================================================================
// ✅ Consome dados prontos do backend
// ✅ Zero import de orquestradores do admin
// ✅ Leve e rápido
// =====================================================================

console.log('[MELHOR-MES-PARTICIPANTE] 🔄 Módulo v2.0 (consumo)');

let ligaIdAtual = null;
let timeIdAtual = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
window.inicializarMelhorMesParticipante = async function({ participante, ligaId, timeId }) {
    console.log('[MELHOR-MES-PARTICIPANTE] Inicializando...', { ligaId, timeId });

    if (!ligaId) {
        mostrarErro('Dados da liga não encontrados');
        return;
    }

    ligaIdAtual = ligaId;
    timeIdAtual = timeId;

    await carregarMelhorMes(ligaId, timeId);
};

// =====================================================================
// CARREGAR DADOS DO BACKEND
// =====================================================================
async function carregarMelhorMes(ligaId, timeId) {
    const container = document.getElementById('melhorMesContainer') || 
                     document.getElementById('moduleContainer');

    if (!container) {
        console.error('[MELHOR-MES-PARTICIPANTE] ❌ Container não encontrado');
        return;
    }

    // Loading state
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 69, 0, 0.2); border-top-color: #ff4500; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="margin-top: 16px; color: #999; font-size: 14px;">Carregando rankings mensais...</p>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
        // ✅ BUSCAR DO BACKEND
        const response = await fetch(`/api/ligas/${ligaId}/melhor-mes`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }

        const dados = await response.json();
        console.log('[MELHOR-MES-PARTICIPANTE] ✅ Dados recebidos:', dados);

        if (!dados.edicoes || dados.edicoes.length === 0) {
            mostrarVazio(container);
            return;
        }

        // Renderizar
        renderizarMelhorMes(container, dados.edicoes, timeId);

    } catch (error) {
        console.error('[MELHOR-MES-PARTICIPANTE] ❌ Erro:', error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR MELHOR MÊS
// =====================================================================
function renderizarMelhorMes(container, edicoes, meuTimeId) {
    const meuTimeIdNum = Number(meuTimeId);

    // Encontrar minhas conquistas
    const minhasConquistas = edicoes.filter(e => 
        e.campeao && Number(e.campeao.timeId) === meuTimeIdNum
    );

    const html = `
        <div class="melhor-mes-container">
            <!-- Header -->
            <div class="mm-header">
                <h2>🏆 Melhor do Mês</h2>
                <span class="mm-subtitle">${edicoes.length} edições</span>
            </div>

            <!-- Minhas conquistas (se houver) -->
            ${minhasConquistas.length > 0 ? `
                <div class="mm-conquistas">
                    <div class="conquistas-header">
                        <span class="conquistas-icon">🎖️</span>
                        <span>Você foi campeão ${minhasConquistas.length}x!</span>
                    </div>
                    <div class="conquistas-meses">
                        ${minhasConquistas.map(e => `<span class="mes-chip">${e.nome}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Lista de edições -->
            <div class="mm-edicoes">
                ${edicoes.map(edicao => renderizarEdicao(edicao, meuTimeIdNum)).join('')}
            </div>
        </div>

        <style>
        .melhor-mes-container {
            padding: 0;
        }

        .mm-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 69, 0, 0.05) 100%);
            border-bottom: 2px solid rgba(255, 69, 0, 0.2);
        }

        .mm-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: #fff;
        }

        .mm-subtitle {
            font-size: 12px;
            color: #999;
            background: rgba(0,0,0,0.3);
            padding: 4px 10px;
            border-radius: 12px;
        }

        /* Minhas conquistas */
        .mm-conquistas {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 12px;
            padding: 16px;
            margin: 12px;
        }

        .conquistas-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            color: #22c55e;
            font-size: 14px;
            margin-bottom: 10px;
        }

        .conquistas-icon {
            font-size: 20px;
        }

        .conquistas-meses {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .mes-chip {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Edições */
        .mm-edicoes {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
        }

        .edicao-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            overflow: hidden;
        }

        .edicao-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            background: rgba(0,0,0,0.2);
            cursor: pointer;
        }

        .edicao-header:active {
            background: rgba(0,0,0,0.3);
        }

        .edicao-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .edicao-icon {
            font-size: 24px;
        }

        .edicao-nome {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
        }

        .edicao-status {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .edicao-status.concluido {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .edicao-status.em_andamento {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }

        .edicao-campeao {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
            border-top: 1px solid rgba(255, 215, 0, 0.2);
        }

        .campeao-icon {
            font-size: 28px;
        }

        .campeao-info {
            flex: 1;
        }

        .campeao-label {
            font-size: 10px;
            color: #ffd700;
            text-transform: uppercase;
            font-weight: 600;
        }

        .campeao-nome {
            font-size: 14px;
            font-weight: 700;
            color: #fff;
        }

        .campeao-pontos {
            font-size: 16px;
            font-weight: 800;
            color: #ffd700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Meu time é campeão */
        .edicao-card.meu-titulo .edicao-campeao {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%);
            border-top-color: rgba(34, 197, 94, 0.3);
        }

        .edicao-card.meu-titulo .campeao-label {
            color: #22c55e;
        }

        .edicao-card.meu-titulo .campeao-pontos {
            color: #22c55e;
        }

        /* Ranking expandido */
        .edicao-ranking {
            display: none;
            padding: 0 12px 12px;
        }

        .edicao-ranking.expanded {
            display: block;
        }

        .ranking-mini-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }

        .ranking-mini-table th {
            padding: 8px 6px;
            text-align: left;
            color: var(--participante-primary, #ff4500);
            font-size: 9px;
            text-transform: uppercase;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .ranking-mini-table td {
            padding: 8px 6px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            color: #ccc;
        }

        .ranking-mini-table tr.meu-time {
            background: rgba(16, 185, 129, 0.1);
        }

        .ranking-mini-table tr.meu-time td {
            color: #10b981;
            font-weight: 600;
        }

        .expand-icon {
            transition: transform 0.3s ease;
            color: #666;
        }

        .edicao-card.expanded .expand-icon {
            transform: rotate(180deg);
        }

        /* Responsivo */
        @media (min-width: 768px) {
            .mm-edicoes {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }
        }
        </style>
    `;

    container.innerHTML = html;

    // Adicionar eventos de expansão
    document.querySelectorAll('.edicao-header').forEach(header => {
        header.addEventListener('click', function() {
            const card = this.closest('.edicao-card');
            const ranking = card.querySelector('.edicao-ranking');

            card.classList.toggle('expanded');
            ranking.classList.toggle('expanded');
        });
    });

    console.log('[MELHOR-MES-PARTICIPANTE] ✅ Rankings renderizados');
}

// =====================================================================
// RENDERIZAR EDIÇÃO INDIVIDUAL
// =====================================================================
function renderizarEdicao(edicao, meuTimeIdNum) {
    const campeao = edicao.campeao;
    const souCampeao = campeao && Number(campeao.timeId) === meuTimeIdNum;

    const mesesIcons = {
        'Abril': '🌸',
        'Maio': '🌺',
        'Junho': '🎉',
        'Julho': '❄️',
        'Agosto': '🌻',
        'Setembro': '🍂',
        'Outubro': '🎃',
        'Novembro': '🍁'
    };

    const pontosFormatados = campeao ? campeao.pontos_total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) : '0,00';

    return `
        <div class="edicao-card ${souCampeao ? 'meu-titulo' : ''}">
            <div class="edicao-header">
                <div class="edicao-info">
                    <span class="edicao-icon">${mesesIcons[edicao.nome] || '📅'}</span>
                    <span class="edicao-nome">${edicao.nome}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="edicao-status ${edicao.status}">${edicao.status === 'concluido' ? '✓ Concluído' : '⏳ Em andamento'}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>

            ${campeao ? `
                <div class="edicao-campeao">
                    <span class="campeao-icon">${souCampeao ? '🎖️' : '👑'}</span>
                    <div class="campeao-info">
                        <div class="campeao-label">${souCampeao ? 'VOCÊ É O CAMPEÃO!' : 'Campeão'}</div>
                        <div class="campeao-nome">${campeao.nome_time}</div>
                    </div>
                    <div class="campeao-pontos">${pontosFormatados}</div>
                </div>
            ` : `
                <div class="edicao-campeao" style="background: rgba(255,255,255,0.02);">
                    <span class="campeao-icon">⏳</span>
                    <div class="campeao-info">
                        <div class="campeao-label" style="color: #666;">Aguardando</div>
                        <div class="campeao-nome" style="color: #999;">Em disputa...</div>
                    </div>
                </div>
            `}

            <!-- Ranking expandível -->
            <div class="edicao-ranking">
                ${edicao.ranking && edicao.ranking.length > 0 ? `
                    <table class="ranking-mini-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Time</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${edicao.ranking.slice(0, 10).map(time => {
                                const isMeuTime = Number(time.timeId) === meuTimeIdNum;
                                const pts = time.pontos_total.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                                return `
                                    <tr class="${isMeuTime ? 'meu-time' : ''}">
                                        <td>${time.posicao}º</td>
                                        <td>${time.nome_time}</td>
                                        <td>${pts}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    ${edicao.ranking.length > 10 ? `
                        <div style="text-align: center; padding: 8px; color: #666; font-size: 11px;">
                            +${edicao.ranking.length - 10} participantes
                        </div>
                    ` : ''}
                ` : `
                    <div style="text-align: center; padding: 20px; color: #666;">
                        Sem dados disponíveis
                    </div>
                `}
            </div>
        </div>
    `;
}

// =====================================================================
// HELPERS
// =====================================================================
function mostrarVazio(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📅</div>
            <h3 style="color: #ccc; margin-bottom: 8px;">Sem dados ainda</h3>
            <p style="color: #666; font-size: 13px;">Os rankings mensais serão gerados após as primeiras rodadas.</p>
        </div>
    `;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('melhorMesContainer') || 
                     document.getElementById('moduleContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3>Erro ao Carregar</h3>
                <p style="margin: 12px 0;">${mensagem}</p>
                <button onclick="window.inicializarMelhorMesParticipante({ligaId: '${ligaIdAtual}', timeId: '${timeIdAtual}'})" 
                        style="margin-top: 16px; padding: 12px 24px; background: #ff4500; 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Export ES6
export { window.inicializarMelhorMesParticipante as inicializarMelhorMesParticipante };

console.log('[MELHOR-MES-PARTICIPANTE] ✅ Módulo v2.0 carregado');