
// PARTICIPANTE MATA-MATA - Módulo Mata-Mata

console.log('[PARTICIPANTE-MATA-MATA] Carregando módulo...');

window.inicializarMataMataParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-MATA-MATA] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar mata-mata');
        }

        const dadosBase = await response.json();
        
        if (!dadosBase.edicoes || dadosBase.edicoes.length === 0) {
            mostrarMensagem('Nenhuma edição do Mata-Mata iniciada ainda');
            return;
        }

        renderizarSeletorEdicoes(dadosBase.edicoes, ligaId, timeId, dadosBase.rodada_atual);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarSeletorEdicoes(edicoes, ligaId, meuTimeId, rodadaAtual) {
    const container = document.getElementById('mataMataContainer');
    
    const html = `
        <div class="edicao-selector-participante">
            <label for="edicao-select-participante">Edição:</label>
            <select id="edicao-select-participante">
                <option value="" selected>Selecione uma edição</option>
                ${edicoes.map(e => `
                    <option value="${e.id}">${e.nome} (Rodadas ${e.rodadaInicial}-${e.rodadaFinal})</option>
                `).join('')}
            </select>
        </div>
        <div id="fase-nav-participante" style="display:none;">
            <div class="fase-nav-participante">
                <button class="fase-btn-participante active" data-fase="primeira">1ª FASE</button>
                <button class="fase-btn-participante" data-fase="oitavas">OITAVAS</button>
                <button class="fase-btn-participante" data-fase="quartas">QUARTAS</button>
                <button class="fase-btn-participante" data-fase="semis">SEMIS</button>
                <button class="fase-btn-participante" data-fase="final">FINAL</button>
            </div>
        </div>
        <div id="conteudo-mata-mata-participante">
            <p style="text-align: center; color: #999; padding: 40px;">
                Selecione uma edição para visualizar os confrontos
            </p>
        </div>
    `;

    container.innerHTML = html;

    const select = document.getElementById('edicao-select-participante');
    select.addEventListener('change', async (e) => {
        const edicaoId = parseInt(e.target.value);
        if (!edicaoId) return;

        const edicao = edicoes.find(ed => ed.id === edicaoId);
        document.getElementById('fase-nav-participante').style.display = 'block';

        await carregarFase('primeira', edicao, ligaId, meuTimeId, rodadaAtual);
    });
}

async function carregarFase(fase, edicao, ligaId, meuTimeId, rodadaAtual) {
    console.log(`[PARTICIPANTE-MATA-MATA] Carregando fase: ${fase}`);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata/${edicao.id}/${fase}`);
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar ${fase}`);
        }

        const confrontos = await response.json();
        renderizarConfrontosParticipante(confrontos, fase, meuTimeId);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro:', error);
        document.getElementById('conteudo-mata-mata-participante').innerHTML = `
            <p style="text-align: center; color: #ef4444; padding: 40px;">
                Erro ao carregar ${fase}: ${error.message}
            </p>
        `;
    }
}

function renderizarConfrontosParticipante(confrontos, fase, meuTimeId) {
    const container = document.getElementById('conteudo-mata-mata-participante');
    
    if (!confrontos || confrontos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhum confronto disponível</p>';
        return;
    }

    const html = `
        <div class="mata-mata-header-participante">
            <h3>${fase.toUpperCase()}</h3>
        </div>
        <div class="confrontos-grid">
            ${confrontos.map(confronto => {
                const meuTime = confronto.time1_id === meuTimeId || confronto.time2_id === meuTimeId;
                const classe = meuTime ? 'meu-confronto' : '';
                
                return `
                    <div class="confronto-card ${classe}">
                        <div style="text-align: center; margin-bottom: 10px;">
                            <span style="font-size: 12px; color: #999;">Rodada ${confronto.rodada}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <div style="flex: 1; text-align: center;">
                                <div style="font-weight: 600; font-size: 14px;">${confronto.time1_nome || 'N/D'}</div>
                                <div style="font-size: 12px; color: #999;">${confronto.time1_cartoleiro || 'N/D'}</div>
                                ${confronto.time1_pontos !== null ? `<div style="font-size: 18px; font-weight: 700; color: var(--participante-primary); margin-top: 5px;">${confronto.time1_pontos.toFixed(2)}</div>` : '<div style="color: #666;">-</div>'}
                            </div>
                            <div style="text-align: center; flex: 0 0 40px;">
                                <div style="font-size: 12px; font-weight: 700; color: var(--participante-primary);">VS</div>
                            </div>
                            <div style="flex: 1; text-align: center;">
                                <div style="font-weight: 600; font-size: 14px;">${confronto.time2_nome || 'N/D'}</div>
                                <div style="font-size: 12px; color: #999;">${confronto.time2_cartoleiro || 'N/D'}</div>
                                ${confronto.time2_pontos !== null ? `<div style="font-size: 18px; font-weight: 700; color: var(--participante-primary); margin-top: 5px;">${confronto.time2_pontos.toFixed(2)}</div>` : '<div style="color: #666;">-</div>'}
                            </div>
                        </div>
                        ${confronto.vencedor_id ? `<div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 69, 0, 0.2); color: #10b981; font-size: 12px; font-weight: 600;">✓ ${confronto.vencedor_id === confronto.time1_id ? confronto.time1_nome : confronto.time2_nome} venceu</div>` : '<div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 69, 0, 0.2); color: #666; font-size: 12px;">⏳ Pendente</div>'}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function mostrarMensagem(msg) {
    const container = document.getElementById('mataMataContainer');
    container.innerHTML = `<p style="text-align: center; color: #999; padding: 40px;">${msg}</p>`;
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
