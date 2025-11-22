console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Módulo carregando...');

// Função principal de inicialização
async function inicializarArtilheiroParticipante(ligaId, timeId) {
    console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Inicializando módulo Artilheiro Campeão...');
    console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Liga:', ligaId, 'Time:', timeId);

    try {
        // Mostrar loading
        mostrarLoading();

        // Carregar dados do artilheiro
        const dados = await carregarDadosArtilheiro(ligaId, timeId);

        // Renderizar interface
        renderizarArtilheiro(dados);

        console.log('✅ [PARTICIPANTE-ARTILHEIRO] Módulo inicializado com sucesso');

    } catch (error) {
        console.error('❌ [PARTICIPANTE-ARTILHEIRO] Erro ao inicializar:', error);
        mostrarErro(error.message);
    }
}

// Export para compatibilidade
export async function init() {
    console.log('🏆 [PARTICIPANTE-ARTILHEIRO] init() chamado via export');

    if (!window.participanteAuth) {
        console.error('❌ [PARTICIPANTE-ARTILHEIRO] participanteAuth não disponível');
        throw new Error('Sistema de autenticação não carregado');
    }

    const participanteData = participanteAuth.getDados();
    console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Dados do participante:', participanteData);

    if (!participanteData || !participanteData.ligaId || !participanteData.timeId) {
        console.error('❌ [PARTICIPANTE-ARTILHEIRO] Dados inválidos:', participanteData);
        throw new Error('Dados do participante não disponíveis');
    }

    const { ligaId, timeId } = participanteData;
    await inicializarArtilheiroParticipante(ligaId, timeId);
}

// Expor função globalmente
if (typeof window !== 'undefined') {
    window.inicializarArtilheiroParticipante = inicializarArtilheiroParticipante;
    console.log('✅ [PARTICIPANTE-ARTILHEIRO] Função global inicializarArtilheiroParticipante registrada');
}

function obterContainer() {
    // Tentar múltiplos IDs possíveis
    const possiveisIds = ['artilheiro-content', 'artilheiroContainer', 'moduleContainer'];

    for (const id of possiveisIds) {
        const container = document.getElementById(id);
        if (container) {
            console.log(`🏆 [PARTICIPANTE-ARTILHEIRO] Container encontrado: ${id}`);
            return container;
        }
    }

    console.error('❌ [PARTICIPANTE-ARTILHEIRO] Nenhum container encontrado. IDs tentados:', possiveisIds);
    return null;
}

function mostrarLoading() {
    const container = obterContainer();
    if (!container) {
        console.warn('[PARTICIPANTE-ARTILHEIRO] Container não encontrado para loading');
        return;
    }

    container.innerHTML = `
        <div class="loading-participante" style="text-align: center; padding: 40px;">
            <div class="spinner-participante" style="border: 4px solid #f3f3f3; border-top: 4px solid var(--participante-primary, #ff4500); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="margin-top: 20px; color: #999;">Carregando dados do Artilheiro Campeão...</p>
        </div>
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
}

function mostrarErro(mensagem) {
    const container = obterContainer();
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #fff3cd; border-radius: 8px; color: #856404;">
            <h4>❌ Erro ao Carregar Dados</h4>
            <p>${mensagem}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--participante-primary, #ff4500); color: white; border: none; border-radius: 8px; cursor: pointer;">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
}

async function carregarDadosArtilheiro(ligaId, timeId) {
    console.log(`🏆 [PARTICIPANTE-ARTILHEIRO] Carregando dados da liga ${ligaId}...`);

    try {
        const response = await fetch(`/api/artilheiro-campeao/${ligaId}/ranking`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }

        const dados = await response.json();
        console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Dados recebidos:', dados);

        // Encontrar posição do participante
        const minhaPosicao = dados.ranking.findIndex(p => p.timeId == timeId);

        return {
            ranking: dados.ranking,
            minhaPosicao: minhaPosicao >= 0 ? minhaPosicao + 1 : null,
            meusDados: minhaPosicao >= 0 ? dados.ranking[minhaPosicao] : null,
            estatisticas: dados.estatisticas
        };

    } catch (error) {
        console.error('❌ [PARTICIPANTE-ARTILHEIRO] Erro ao carregar dados:', error);
        throw error;
    }
}

function renderizarArtilheiro(dados) {
    const container = obterContainer();
    if (!container) {
        console.error('❌ [PARTICIPANTE-ARTILHEIRO] Container não encontrado para renderização');
        return;
    }

    console.log('🏆 [PARTICIPANTE-ARTILHEIRO] Renderizando dados:', dados);

    const html = `
        <div class="artilheiro-participante">
            ${renderizarMinhaClassificacao(dados)}
            ${renderizarTop5(dados)}
            ${renderizarRankingCompleto(dados)}
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ [PARTICIPANTE-ARTILHEIRO] Interface renderizada');
}

function renderizarMinhaClassificacao(dados) {
    if (!dados.meusDados) {
        return `
            <div class="alert alert-info">
                <p>Você ainda não possui dados no ranking do Artilheiro Campeão.</p>
            </div>
        `;
    }

    const { meusDados, minhaPosicao } = dados;

    return `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">🏆 Minha Classificação</h5>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-md-3">
                        <h3 class="text-primary">${minhaPosicao}º</h3>
                        <small class="text-muted">Posição</small>
                    </div>
                    <div class="col-md-3">
                        <h3 class="text-success">${meusDados.golsPro || 0}</h3>
                        <small class="text-muted">Gols Pró</small>
                    </div>
                    <div class="col-md-3">
                        <h3 class="text-danger">${meusDados.golsContra || 0}</h3>
                        <small class="text-muted">Gols Contra</small>
                    </div>
                    <div class="col-md-3">
                        <h3 class="${(meusDados.saldoGols || 0) >= 0 ? 'text-success' : 'text-danger'}">
                            ${(meusDados.saldoGols || 0) >= 0 ? '+' : ''}${meusDados.saldoGols || 0}
                        </h3>
                        <small class="text-muted">Saldo</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarTop5(dados) {
    const top5 = dados.ranking.slice(0, 5);

    return `
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">👑 Top 5 Artilheiros</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="text-center">Pos</th>
                                <th>Cartoleiro</th>
                                <th class="text-center">GP</th>
                                <th class="text-center">GC</th>
                                <th class="text-center">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top5.map((p, idx) => `
                                <tr class="${p.timeId == window.participanteData?.timeId ? 'table-primary' : ''}">
                                    <td class="text-center">
                                        ${idx === 0 ? '🏆' : `${idx + 1}º`}
                                    </td>
                                    <td>${p.nomeCartoleiro || 'N/D'}</td>
                                    <td class="text-center text-success fw-bold">${p.golsPro || 0}</td>
                                    <td class="text-center text-danger fw-bold">${p.golsContra || 0}</td>
                                    <td class="text-center ${(p.saldoGols || 0) >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                                        ${(p.saldoGols || 0) >= 0 ? '+' : ''}${p.saldoGols || 0}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderizarRankingCompleto(dados) {
    return `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">📊 Classificação Completa</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="text-center">Pos</th>
                                <th>Cartoleiro</th>
                                <th>Time</th>
                                <th class="text-center">GP</th>
                                <th class="text-center">GC</th>
                                <th class="text-center">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dados.ranking.map((p, idx) => `
                                <tr class="${p.timeId == window.participanteData?.timeId ? 'table-primary fw-bold' : ''}">
                                    <td class="text-center">${idx + 1}º</td>
                                    <td>${p.nomeCartoleiro || 'N/D'}</td>
                                    <td>${p.nomeTime || 'N/D'}</td>
                                    <td class="text-center text-success">${p.golsPro || 0}</td>
                                    <td class="text-center text-danger">${p.golsContra || 0}</td>
                                    <td class="text-center ${(p.saldoGols || 0) >= 0 ? 'text-success' : 'text-danger'}">
                                        ${(p.saldoGols || 0) >= 0 ? '+' : ''}${p.saldoGols || 0}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

console.log('✅ [PARTICIPANTE-ARTILHEIRO] Módulo carregado');